# app.py
import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask_bcrypt import Bcrypt
from pymongo import MongoClient
from dotenv import load_dotenv
import joblib
import re
from flask_socketio import SocketIO
from listeners import DiscordMonitor, TelegramMonitor, GmailMonitor
import certifi
import json
import datetime

# Load env variables (for JWT_SECRET_KEY, MONGO_URI)
load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*")

REPORTS_FILE = "reports.json"

@app.route('/')
def health_check():
    return jsonify({
        "status": "online", 
        "model_loaded": model is not None,
        "active_listeners": list(active_listeners.keys())
    }), 200

# Store active listener instances
# Format: {'discord': instance, 'telegram': instance}
active_listeners = {}

# --- Configuration ---
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET', 'super-secret-key-change-this')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = 315360000 # 10 years in seconds (approx)
# In production, use os.getenv('MONGO_URI')
# For local dev: mongodb://localhost:27017/
mongo_uri = os.getenv('MONGO_URI', 'mongodb://localhost:27017/?serverSelectionTimeoutMS=2000')
# Enforce a 2-second timeout so the prediction API doesn't hang if the DB is offline
client = MongoClient(mongo_uri, tlsCAFile=certifi.where(), tlsAllowInvalidCertificates=True, serverSelectionTimeoutMS=2000)
db = client['phishing_db']
users_collection = db['users']
community_data_collection = db['community_data']
keywords_collection = db['keywords'] # Store phrases like "Nexus Store", "Account #123"
reports_collection = db['reports'] # Store globally detected phishing messages

jwt = JWTManager(app)
bcrypt = Bcrypt(app)

# --- Load Model ---
try:
    model = joblib.load("email_phishing_model.pkl")
    vectorizer = joblib.load("email_vectorizer.pkl")
    print("✅ Model and vectorizer loaded successfully!")
except Exception as e:
    print(f"Error loading model/vectorizer: {e}")
    model = None
    vectorizer = None

# --- Robust Vectorizer Fix ---
if vectorizer:
    try:
        # Check if it needs fixing
        if hasattr(vectorizer, '_tfidf'):
            if not hasattr(vectorizer._tfidf, 'idf_'):
                if hasattr(vectorizer, 'idf_'):
                    vectorizer._tfidf.idf_ = vectorizer.idf_
                elif 'idf_' in vectorizer._tfidf.__dict__:
                    # If it's in dict but hasattr is false (can happen with version mismatch)
                    vectorizer._tfidf.idf_ = vectorizer._tfidf.__dict__['idf_']
            
            # Ensure it thinks it's fitted
            # Newer sklearn uses presence of _fitted_attributes or idf_ 
            # but some internal state might be missing. 
            # Let's try to set any missing but expected attributes.
            if not hasattr(vectorizer, 'vocabulary_') and 'vocabulary_' in vectorizer.__dict__:
                vectorizer.vocabulary_ = vectorizer.__dict__['vocabulary_']
                
        print("🔧 Vectorizer attributes patched for version compatibility")
    except Exception as e:
        print(f"⚠️ Vectorizer patch failed: {e}")

def clean_email_text(text):
    text = str(text).lower()
    text = re.sub(r'http\S+', ' ', text)
    text = re.sub(r'\S+@\S+', ' ', text)
    text = re.sub(r'[^a-z\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

# --- Auth Endpoints ---

@app.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json(force=True)
        username = data.get('username')
        password = data.get('password')

        if not username or not password:
            return jsonify({"error": "Username and password required"}), 400

        if users_collection.find_one({"username": username}):
            return jsonify({"error": "User already exists"}), 400

        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
        users_collection.insert_one({"username": username, "password": hashed_password})
        
        return jsonify({"message": "User created successfully"}), 201
    except Exception as e:
        print(f"Register error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json(force=True)
        username = data.get('username')
        password = data.get('password')

        user = users_collection.find_one({"username": username})
        if user and bcrypt.check_password_hash(user['password'], password):
            access_token = create_access_token(identity=username)
            return jsonify({"access_token": access_token, "username": username}), 200
        
        return jsonify({"error": "Invalid credentials"}), 401
    except Exception as e:
        print(f"Login error: {e}")
        return jsonify({"error": str(e)}), 500

# --- Phishing Detection Endpoint (Protected Optional?) ---
# Helper: Extract meaningful tokens (Signatures)
def extract_tokens(text):
    tokens = set()
    text_lower = text.lower()
    
    # Regex for words with at least one digit (e.g. "user1", "store99")
    alphanumeric = re.findall(r'\b[a-z]*\d+[a-z0-9]*\b', text_lower)
    tokens.update(alphanumeric)
    
    # Regex for Email addresses
    emails = re.findall(r'[\w\.-]+@[\w\.-]+', text_lower)
    tokens.update(emails)
    
    return list(tokens)

def analyze_message(text):
    if not model or not vectorizer:
        return {'prediction': 'Error', 'confidence': 'Model not loaded', 'raw_conf': 0, 'keywords': []}

    # 1. AI Model
    cleaned_text = clean_email_text(text)
    
    # The vectorizer is already patched at load time
    if hasattr(model, 'multi_class') == False:
        model.multi_class = "auto"
    
    X_input = vectorizer.transform([cleaned_text])
    
    prediction = model.predict(X_input)[0]
    probabilities = model.predict_proba(X_input)[0]
    phishing_prob = probabilities[1]

    # Threshold Logic
    if phishing_prob >= 0.80:
        model_result = "Phishing Message"
        model_confidence = phishing_prob
    elif phishing_prob >= 0.50:
        model_result = "Suspicious Message"
        model_confidence = phishing_prob
    else:
        model_result = "Safe Message"
        model_confidence = probabilities[0]

    # 2. Keyword Patterns (Database)
    tokens = extract_tokens(text)
    score = 0
    matched_keywords = []
    
    if tokens:
      try:
        found_tokens = list(keywords_collection.find({"token": {"$in": tokens}}))
        for t_data in found_tokens:
            s = t_data.get('safe', 0)
            p = t_data.get('phish', 0)
            total = s + p
            if total < 2: continue 
            token_strength = (s - p) / total
            score += token_strength
            
            if token_strength < -0.1: 
                matched_keywords.append(t_data['token'])
      except Exception as e:
        print(f"⚠️ DB Lookup Failed: {e}")

    # 3. HEURISTIC FAILSAFE
    suspicious_triggers = [
        "winner", "congratulations", "selected", "reward", "exclusive", 
        "gift", "hurry", "urgent", "verify", "account", "suspended",
        "winning", "claim", "prize", "cash", "lottery"
    ]
    
    heuristic_score = 0
    total_suspicious_count = 0
    text_lower = text.lower()
    for word in suspicious_triggers:
        if word in text_lower:
            heuristic_score += 1
            total_suspicious_count += text_lower.count(word)
            if word not in matched_keywords:
                matched_keywords.append(word)
            
    final_result = model_result
    final_conf_str = f"{model_confidence*100:.2f}%"

    # LOGIC OVERRIDES
    if heuristic_score >= 2:
        final_result = "Phishing Message"
        final_conf_str = f"95.00% (Detected {total_suspicious_count} suspicious keywords)"
    elif score >= 1.0 and model_result == "Phishing Message":
        final_result = "Safe Message"
        final_conf_str = "100.00% (Trusted Signature)"
    elif score <= -1.0 and model_result == "Safe Message":
        final_result = "Phishing Message"
        final_conf_str = "100.00% (Known Phishing Pattern)"

    # 4. Granular Analysis
    suspicious_snippets = []
    lines = [line.strip() for line in text.split('\n') if len(line.strip()) > 3]
    
    if len(lines) <= 1:
        if final_result == "Phishing Message":
            suspicious_snippets.append(text[:300])
    else:
        scored_snippets = []
        # Pre-calculate scores
        line_data = []
        for i, line in enumerate(lines):
            line = line.strip()
            if not line: 
                line_data.append({'text': '', 'score': 0, 'index': i, 'is_metadata': True})
                continue
            
            try:
                line_tokens = extract_tokens(line)
                kw_hits = [k for k in matched_keywords if k in line_tokens] if matched_keywords else []
                trigger_hits = [t for t in suspicious_triggers if t in line.lower()]
                
                # Use model on the specific line
                vec_line = vectorizer.transform([line])
                pred_line = model.predict(vec_line)[0]
                
                # Metadata check - aggressive
                metadata_patterns = [
                    r'\d{1,2}:\d{2}(\s*(?:am|pm))?', 
                    r'\d+\s*?kb', 
                    r'\.(docx|pdf|exe|png|jpg|jpeg|zip|rar)',
                    r'sharing by shareit',
                    r'^\s*docx\s*$'
                ]
                is_metadata = any(re.search(p, line.lower()) for p in metadata_patterns)
                
                # Base Score
                score = (len(kw_hits) * 5) + (len(trigger_hits) * 3) + (10 if pred_line == 1 else 0)
                if len(line) > 20 and score > 0: score += 2
                
                line_data.append({'text': line, 'score': score, 'index': i, 'is_metadata': is_metadata})
            except: 
                line_data.append({'text': line, 'score': 0, 'index': i, 'is_metadata': False})

        # Include neighbors of high scorers
        final_selection_indices = set()
        for i, item in enumerate(line_data):
            if item['score'] >= 5 and not item['is_metadata']:
                final_selection_indices.add(item['index'])
                # Include immediate predecessor (often a header like 'Bonus Monster')
                if i > 0 and not line_data[i-1]['is_metadata'] and len(line_data[i-1]['text']) > 2:
                    final_selection_indices.add(line_data[i-1]['index'])
                # Include immediate successor
                if i < len(line_data) - 1 and not line_data[i+1]['is_metadata'] and len(line_data[i+1]['text']) > 2:
                    final_selection_indices.add(line_data[i+1]['index'])

        # Filter out metadata from the final set just in case
        selection = [line_data[idx] for idx in sorted(list(final_selection_indices))]
        suspicious_snippets = [s['text'] for s in selection if not s['is_metadata']]
        
    # Deduplicate and limit
    suspicious_snippets = list(dict.fromkeys(suspicious_snippets))[:12]

    if not suspicious_snippets and final_result == "Phishing Message":
        suspicious_snippets.append(text[:400] + "...")
        
    return {
        'prediction': final_result,
        'confidence': final_conf_str,
        'raw_conf': model_confidence,
        'keywords': matched_keywords,
        'snippets': suspicious_snippets
    }

def normalize_for_dedupe(text):
    if not text: return ""
    # Lowercase, remove special chars, remove all whitespace
    text = text.lower()
    text = re.sub(r'[^a-zA-Z0-9]', '', text)
    # Truncate to avoid issues with massive messages
    return text[:1000]

def is_boilerplate_content(text):
    if not text: return True
    norm = re.sub(r'[^a-z0-9]', '', text.lower())
    # Known Gmail UI dump patterns
    junk_patterns = [
        "noneselectedskiptocontent",
        "skiptocontentusinggmail",
        "searchtrygemini",
        "starredsnoozedsentdrafts"
    ]
    for pattern in junk_patterns:
        if pattern in norm:
            return True
    # Generic: very long Gmail-like nav dump
    if "inbox" in norm and "starred" in norm and "snoozed" in norm and "drafts" in norm and len(norm) > 500:
        return True
    return False

def record_phishing_report(platform, content, prediction, confidence):
    if prediction not in ["Phishing Message", "Suspicious Message"]:
        return

    normalized = normalize_for_dedupe(content)
    report_doc = {
        "platform": platform,
        "content": content,
        "normalized_content": normalized,
        "prediction": prediction,
        "confidence": confidence,
        "timestamp": datetime.datetime.now().isoformat()
    }

    # 1. MongoDB Deduplication
    try:
        # Check by platform AND normalized content
        existing = reports_collection.find_one({
            "platform": platform, 
            "$or": [
                {"content": content},
                {"normalized_content": normalized}
            ]
        })
        if not existing:
            reports_collection.insert_one(report_doc)
            print(f"📁 Logged new report to MongoDB for {platform}")
        else:
            print(f"♻️ Duplicate report blocked for {platform} (MongoDB)")
    except Exception as e:
        print(f"⚠️ DB Logging Error: {e}")

    # 2. Local JSON Deduplication
    try:
        local_reports = []
        if os.path.exists(REPORTS_FILE):
            with open(REPORTS_FILE, 'r') as f:
                local_reports = json.load(f)
        
        # Check against existing local reports using normalization
        is_duplicate = False
        for r in local_reports:
            r_norm = r.get('normalized_content') or normalize_for_dedupe(r.get('content', ''))
            if r.get('platform') == platform and (r.get('content') == content or r_norm == normalized):
                is_duplicate = True
                break
        
        if not is_duplicate:
            local_reports.append(report_doc)
            with open(REPORTS_FILE, 'w') as f:
                json.dump(local_reports, f, indent=4)
            print(f"📁 Logged new report to Local JSON for {platform}")
    except Exception as e:
        print(f"⚠️ Local File Logging Error: {e}")


def handle_socket_message(msg_data):
    print(f"📩 Incoming from {msg_data['platform']}: {msg_data['content']}")
    analysis = analyze_message(msg_data['content'])
    msg_data.update(analysis)
    socketio.emit('new_message', msg_data)
    
    if analysis['prediction'] in ["Phishing Message", "Suspicious Message"]:
        print(f"🚨 ALERT ({analysis['prediction']}): {msg_data['content']}")
        socketio.emit('alert', msg_data)
        record_phishing_report(msg_data['platform'], msg_data['content'], analysis['prediction'], analysis['confidence'])

# --- Phishing Detection Endpoint ---
@app.route('/predict', methods=['POST'])
def predict():
    if not model or not vectorizer:
        return jsonify({'error': 'Model not loaded'}), 500
    data = request.get_json(force=True)
    email_text = data.get('email') or data.get('text') or data.get('message') or ''
    url = data.get('url', '')
    platform = data.get('platform', 'Web Detector')
    if not email_text: return jsonify({'error': 'No text provided'}), 400
    analysis = analyze_message(email_text)
    final_result = analysis['prediction']
    final_conf = analysis['confidence']
    if final_result in ["Phishing Message", "Suspicious Message"]:
        display_content = "\n---\n".join(analysis['snippets'][:3]) or email_text[:200]
        alert_data = {'platform': platform, 'content': display_content, 'prediction': final_result, 'confidence': final_conf, 'url': url, 'timestamp': "Just Now"}
        print(f"📡 Emitting alert for {platform}: {final_result}")
        socketio.emit('alert', alert_data)
        record_phishing_report(platform, email_text, final_result, final_conf)
    return jsonify({'prediction': final_result, 'confidence': final_conf, 'keywords': analysis['keywords'], 'snippets': analysis['snippets']})

@app.route('/report', methods=['POST'])
@jwt_required()
def report_message():
    current_user = get_jwt_identity()
    data = request.get_json(force=True)
    text = data.get('text')
    label = data.get('label')
    if not text or not label: return jsonify({"error": "Text and label required"}), 400
    community_data_collection.insert_one({"submitted_by": current_user, "text": text, "label": label, "status": "pending_review"})
    tokens = extract_tokens(text)
    inc_field = "safe" if (label == "Safe Email" or label == "Safe Message") else "phish"
    for t in tokens:
        keywords_collection.update_one({"token": t}, {"$inc": {inc_field: 1}}, upsert=True)
    return jsonify({"message": "Report submitted & Patterns Learned"}), 201

@app.route('/api/report/download', methods=['GET'])
def download_report():
    import io, csv
    from flask import Response
    
    mongo_reports = []
    try:
        mongo_reports = list(reports_collection.find({}, {'_id': False}))
    except: pass

    local_reports = []
    if os.path.exists(REPORTS_FILE):
        try:
            with open(REPORTS_FILE, 'r') as f:
                local_reports = json.load(f)
        except: pass

    combined = mongo_reports + local_reports
    
    # Filter boilerplate & deduplicate
    seen = set()
    unique_reports = []
    for r in combined:
        content = r.get('content', '')
        if is_boilerplate_content(content):
            continue
        normalized = normalize_for_dedupe(content)
        key = (r.get('platform', 'Unknown'), normalized)
        if key not in seen:
            seen.add(key)
            unique_reports.append(r)
    
    # Sort by timestamp desc
    unique_reports.sort(key=lambda x: x.get('timestamp', ''), reverse=True)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Platform", "Timestamp", "Prediction", "Confidence", "Content"])
    
    for r in unique_reports:
        safe_content = str(r.get('content', '')).replace('\n', ' ').replace('\r', '')
        writer.writerow([
            r.get('platform', 'Unknown'),
            r.get('timestamp', ''),
            r.get('prediction', ''),
            r.get('confidence', ''),
            safe_content
        ])
    
    response = Response(output.getvalue(), mimetype="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=phishing_report.csv"
    return response

@app.route('/api/report/data', methods=['GET'])
def get_report_data():
    mongo_reports = []
    try:
        mongo_reports = list(reports_collection.find({}, {'_id': False}))
    except: pass

    local_reports = []
    if os.path.exists(REPORTS_FILE):
        try:
            with open(REPORTS_FILE, 'r') as f:
                local_reports = json.load(f)
        except: pass

    combined = mongo_reports + local_reports
    
    # Filter boilerplate & deduplicate
    seen = set()
    unique_reports = []
    for r in combined:
        content = r.get('content', '')
        if is_boilerplate_content(content):
            continue
        normalized = normalize_for_dedupe(content)
        key = (r.get('platform', 'Unknown'), normalized)
        if key not in seen:
            seen.add(key)
            unique_reports.append(r)
    
    # Sort by timestamp desc
    unique_reports.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
    
    return jsonify({"reports": unique_reports})

@app.route('/stats', methods=['GET'])
def get_stats():
    count = community_data_collection.count_documents({})
    return jsonify({"community_contributions": count}), 200

@app.route('/api/metrics', methods=['GET'])
def get_metrics():
    return jsonify({"accuracy": 0.9682, "precision": 0.9346, "recall": 0.9807, "f1": 0.9571, "confusion_matrix": {"tn": 2811, "fp": 114, "fn": 32, "tp": 1630}, "model_info": {"algorithm": "Logistic Regression", "feature_extraction": "TF-IDF Vectorizer (n-gram 1-2)", "training_samples": 18349, "test_samples": 4587, "total_dataset": 22936}, "last_updated": "2025-05-20"}), 200

@app.route('/api/listeners/start', methods=['POST'])
@jwt_required()
def start_listener():
    data = request.get_json(force=True)
    platform = data.get('platform', '').lower()
    token = data.get('token')
    if not platform or not token: return jsonify({"error": "Platform and token required"}), 400
    if platform in active_listeners and active_listeners[platform].running: return jsonify({"message": f"{platform} listener already running"}), 200
    try:
        if platform == 'discord':
            monitor = DiscordMonitor(token, handle_socket_message)
            monitor.start()
            active_listeners['discord'] = monitor
        elif platform == 'telegram':
            monitor = TelegramMonitor(token, handle_socket_message)
            monitor.start()
            active_listeners['telegram'] = monitor
        elif platform == 'gmail':
            email_user = data.get('email_user')
            if not email_user: return jsonify({"error": "Email required for Gmail"}), 400
            monitor = GmailMonitor(email_user, token, handle_socket_message)
            monitor.start()
            active_listeners['gmail'] = monitor
        else: return jsonify({"error": "Invalid platform"}), 400
        return jsonify({"message": f"Started {platform} listener"}), 200
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/api/listeners/stop', methods=['POST'])
@jwt_required()
def stop_listener():
    data = request.get_json(force=True)
    platform = data.get('platform', '').lower()
    if platform in active_listeners:
        try:
            active_listeners[platform].stop()
            del active_listeners[platform]
            return jsonify({"message": f"Stopped {platform} listener"}), 200
        except Exception as e: return jsonify({"error": str(e)}), 500
    return jsonify({"error": "Listener not active"}), 404

if __name__ == '__main__':
    socketio.run(app, debug=True, host='0.0.0.0', port=5000, allow_unsafe_werkzeug=True)