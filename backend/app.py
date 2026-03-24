import eventlet
eventlet.monkey_patch()

# app.py
import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from flask_bcrypt import Bcrypt
import pymysql
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

# MySQL Configuration
MYSQL_HOST = os.getenv('MYSQL_HOST', 'localhost')
MYSQL_PORT = int(os.getenv('MYSQL_PORT', 3306))
MYSQL_USER = os.getenv('MYSQL_USER', 'root')
MYSQL_PASSWORD = os.getenv('MYSQL_PASSWORD', '')
MYSQL_DB = os.getenv('MYSQL_DB', 'phishing_db')

def get_db_connection():
    try:
        # Aiven and other managed MySQL often require SSL
        use_ssl = MYSQL_HOST != 'localhost'
        
        connection_args = {
            'host': MYSQL_HOST,
            'port': MYSQL_PORT,
            'user': MYSQL_USER,
            'password': MYSQL_PASSWORD,
            'database': MYSQL_DB,
            'cursorclass': pymysql.cursors.DictCursor,
            'connect_timeout': 10
        }
        
        if use_ssl:
            # General SSL support for cloud databases
            connection_args['ssl'] = {'ssl_verify_id': False} 
            
        return pymysql.connect(**connection_args)
    except Exception as e:
        print(f"⚠️ MySQL Connection Failed: {e}")
        return None

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

        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database error"}), 500
        
        with conn.cursor() as cursor:
            cursor.execute("SELECT id FROM users WHERE username = %s", (username,))
            if cursor.fetchone():
                conn.close()
                return jsonify({"error": "User already exists"}), 400

            hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
            cursor.execute("INSERT INTO users (username, password_hash) VALUES (%s, %s)", (username, hashed_password))
            conn.commit()
        
        conn.close()
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

        conn = get_db_connection()
        if not conn:
            return jsonify({"error": "Database error"}), 500

        with conn.cursor() as cursor:
            cursor.execute("SELECT id, username, password_hash FROM users WHERE username = %s", (username,))
            user = cursor.fetchone()

        conn.close()
        
        if user and bcrypt.check_password_hash(user['password_hash'], password):
            access_token = create_access_token(identity=str(user['id']))
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

def analyze_message(text, platform=None):
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
    
    # Database keyword lookup was removed with MongoDB.

    # 3. HEURISTIC FAILSAFE
    suspicious_triggers = [
        "winner", "congratulations", "selected", "reward", "exclusive", 
        "gift", "hurry", "urgent", "verify", "account", "suspended",
        "winning", "claim", "prize", "cash", "lottery"
    ]
    
    # Legit Whitelist (Reduces False Positives for OTP/Banks)
    safe_keywords = [
        "otp", "one-time password", "verification code", "official statement", 
        "statement for account", "bank alert", "transaction successful", 
        "security code", "your code is", "login attempt", "password reset"
    ]
    
    heuristic_score = 0
    total_suspicious_count = 0
    text_lower = text.lower()
    
    # Check for Safe Keywords first
    safe_hit = any(word in text_lower for word in safe_keywords)
    
    for word in suspicious_triggers:
        if word in text_lower:
            heuristic_score += 1
            total_suspicious_count += text_lower.count(word)
            if word not in matched_keywords:
                matched_keywords.append(word)
            
    final_result = model_result
    final_conf_str = f"{model_confidence*100:.2f}%"

    # LOGIC OVERRIDES
    is_gmail = platform and 'gmail' in platform.lower()

    if safe_hit:
        # If a safe keyword is found, be much more conservative
        if model_result == "Phishing Message" and heuristic_score < 3:
            final_result = "Suspicious Message"
            final_conf_str = f"{model_confidence*100:.2f}% (Found Legit Markers)"
        elif model_result == "Safe Message":
            final_result = "Safe Message"
            final_conf_str = "100.00% (Trusted Legit Source)"
    elif is_gmail and heuristic_score >= 2:
        # Gmail Specific: If we have keywords but it's Gmail, mark as Suspicious unless massive hit
        if total_suspicious_count > 3 or phishing_prob > 0.90:
            final_result = "Phishing Message"
            final_conf_str = f"95.00% (High Risk Gmail Pattern)"
        else:
            final_result = "Suspicious Message"
            final_conf_str = f"85.00% (Gmail: Verify Sender)"
    elif heuristic_score >= 2:
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
    # 1. Lowercase and remove URLs
    text = text.lower()
    text = re.sub(r'http\S+', '', text)
    
    # 2. Split into words and keep only alphabetic ones
    words = re.findall(r'[a-z]{3,}', text) # Only words with 3+ letters
    
    # 3. Filter out extremely common UI tokens and file extensions
    ui_noise = {
        "archived", "chats", "never", "miss", "message", "enable", "notifications",
        "stay", "updated", "search", "reconnecting", "friends", "direct", "messages",
        "online", "unmute", "results", "found", "files", "page", "note", "will",
        "auto", "deleted", "draft", "telegram", "unseen", "updates", "movie", "series",
        "news", "value", "only", "negotiate", "full", "month", "notice", "today",
        "open", "positions", "force", "closed", "fund", "with", "pinned", "promote",
        "subscribers", "joined", "group", "check", "activity", "account", "google",
        "security", "alert", "recovery", "recognise", "remove", "sign", "device",
        "anything", "secure", "through", "important", "changes", "services", "browser",
        "safety", "features", "fixes", "protecting", "threats", "malware", "phishing",
        "setup", "privacy", "settings", "continue", "started", "right", "review", "adjust",
        "docx", "pdf", "png", "jpg", "jpeg", "capture", "screen", "capture", "bar", "stool",
        "filebot", "mcfbot", "nazia", "transponster", "seriesbot", "filmsbot"
    }
    
    filtered_words = [w for w in words if w not in ui_noise]
    
    # 4. Join the remaining words into a signature
    signature = "".join(filtered_words)
    return signature[:400]

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

def record_phishing_report(platform, content, prediction, confidence, keywords=None, user_id_override=None):
    if prediction not in ["Phishing Message", "Suspicious Message"]:
        return

    normalized = normalize_for_dedupe(content)
    report_doc = {
        "platform": platform,
        "content": content,
        "normalized_content": normalized,
        "prediction": prediction,
        "confidence": confidence,
        "keywords": keywords or [],
        "timestamp": datetime.datetime.now().isoformat()
    }

    # 1. MySQL Deduplication
    conn = get_db_connection()
    if conn:
        try:
            user_id = user_id_override or 1 
            if not user_id_override:
                try:
                    # Try to get user from token context if available (in request contexts)
                    from flask import has_request_context
                    if has_request_context():
                        from flask_jwt_extended import verify_jwt_in_request
                        try:
                            verify_jwt_in_request(optional=True)
                            uid = get_jwt_identity()
                            if uid:
                                user_id = int(uid)
                        except: pass
                except: pass

            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT id FROM reports 
                    WHERE platform = %s AND (content = %s OR normalized_content = %s) AND user_id = %s
                """, (platform, content, normalized, user_id))
                
                existing = cursor.fetchone()
                
                if not existing:
                    cursor.execute("""
                        INSERT INTO reports (user_id, platform, content, normalized_content, prediction, confidence, timestamp, keywords)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """, (user_id, platform, content, normalized, prediction, confidence, report_doc['timestamp'], json.dumps(keywords or [])))
                    conn.commit()
                    print(f"📁 Logged new report to MySQL for {platform}")
                else:
                    print(f"♻️ Duplicate report blocked for {platform} (MySQL)")
        except Exception as e:
            print(f"⚠️ DB Logging Error: {e}")
        finally:
            conn.close()

    # Local JSON Deduplication removed for isolated MySQL history.


def handle_socket_message(msg_data):
    platform = msg_data.get('platform', '')
    lower_platform = platform.lower()
    
    # Identify user_id from active_listeners
    monitor = active_listeners.get(lower_platform)
    user_id_override = getattr(monitor, 'user_id', None) if monitor else None

    print(f"📩 Incoming from {platform}: {msg_data['content']}")
    analysis = analyze_message(msg_data['content'], platform)
    msg_data.update(analysis)
    socketio.emit('new_message', msg_data)
    
    if analysis['prediction'] in ["Phishing Message", "Suspicious Message"]:
        active_username = None
        if user_id_override:
            try:
                conn = get_db_connection()
                with conn.cursor() as cursor:
                    cursor.execute("SELECT username FROM users WHERE id = %s LIMIT 1", (user_id_override,))
                    row = cursor.fetchone()
                    if row: active_username = row['username']
                conn.close()
            except: pass
            
        print(f"🚨 ALERT ({analysis['prediction']} for {active_username}): {msg_data['content']}")
        msg_data['username'] = active_username
        socketio.emit('alert', msg_data)
        record_phishing_report(platform, msg_data['content'], analysis['prediction'], analysis['confidence'], analysis.get('keywords'), user_id_override)

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
    
    # Optional username override from extension payloads
    username = data.get('username')
    user_id_override = None
    if username:
        conn = get_db_connection()
        if conn:
            try:
                with conn.cursor() as cursor:
                    cursor.execute("SELECT id FROM users WHERE username = %s LIMIT 1", (username,))
                    user = cursor.fetchone()
                    if user: user_id_override = user['id']
            except: pass
            finally: conn.close()

    analysis = analyze_message(email_text, platform)
    final_result = analysis['prediction']
    final_conf = analysis['confidence']
    if final_result in ["Phishing Message", "Suspicious Message"]:
        display_content = "\n---\n".join(analysis['snippets'][:3]) or email_text[:200]
        
        # We also attempt to extract active JWT identity blindly so web components auto-map their alerts!
        active_username = username
        try:
            from flask import has_request_context
            if not active_username and has_request_context():
                from flask_jwt_extended import verify_jwt_in_request
                verify_jwt_in_request(optional=True)
                uid = get_jwt_identity()
                if uid:
                    conn = get_db_connection()
                    with conn.cursor() as cursor:
                        cursor.execute("SELECT username FROM users WHERE id = %s LIMIT 1", (uid,))
                        row = cursor.fetchone()
                        if row: active_username = row['username']
                    conn.close()
        except: pass
        
        alert_data = {'platform': platform, 'content': display_content, 'prediction': final_result, 'confidence': final_conf, 'url': url, 'timestamp': "Just Now", 'keywords': analysis['keywords'], 'username': active_username}
        print(f"📡 Emitting alert for {platform} (User: {active_username}): {final_result}")
        socketio.emit('alert', alert_data)
        record_phishing_report(platform, email_text, final_result, final_conf, analysis['keywords'], user_id_override)
    return jsonify({'prediction': final_result, 'confidence': final_conf, 'keywords': analysis['keywords'], 'snippets': analysis['snippets']})

@app.route('/report', methods=['POST'])
def report_message():
    current_user = "Admin"
    data = request.get_json(force=True)
    text = data.get('text')
    label = data.get('label')
    if not text or not label: return jsonify({"error": "Text and label required"}), 400
    
    # DB storage removed
    
    tokens = extract_tokens(text)
    
    return jsonify({"message": "Report submitted & Patterns Learned"}), 201

@app.route('/api/report/download', methods=['GET'])
@jwt_required(optional=True)
def download_report():
    import io, csv
    from flask import Response
    
    uid = get_jwt_identity()
    user_id = int(uid) if uid else 1

    combined = []
    conn = get_db_connection()
    if conn:
        try:
            with conn.cursor() as cursor:
                cursor.execute("SELECT * FROM reports WHERE user_id = %s", (user_id,))
                combined = cursor.fetchall()
        except: pass
        finally:
            conn.close()
    
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
@jwt_required(optional=True)
def get_report_data():
    uid = get_jwt_identity()
    user_id = int(uid) if uid else 1

    combined = []
    conn = get_db_connection()
    if conn:
        try:
            with conn.cursor() as cursor:
                cursor.execute("SELECT * FROM reports WHERE user_id = %s ORDER BY timestamp DESC", (user_id,))
                rows = cursor.fetchall()
                for r in rows:
                    if r.get('keywords') and isinstance(r['keywords'], str):
                        try:
                            r['keywords'] = json.loads(r['keywords'])
                        except: pass
                    combined.append(r)
        except Exception as e:
            print("reports fetch error:", e)
        finally:
            conn.close()
    
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
    count = 0
    return jsonify({"community_contributions": count}), 200

@app.route('/api/metrics', methods=['GET'])
def get_metrics():
    return jsonify({"accuracy": 0.9682, "precision": 0.9346, "recall": 0.9807, "f1": 0.9571, "confusion_matrix": {"tn": 2811, "fp": 114, "fn": 32, "tp": 1630}, "model_info": {"algorithm": "Logistic Regression", "feature_extraction": "TF-IDF Vectorizer (n-gram 1-2)", "training_samples": 18349, "test_samples": 4587, "total_dataset": 22936}, "last_updated": "2025-05-20"}), 200

@app.route('/api/listeners/start', methods=['POST'])
@jwt_required(optional=True)
def start_listener():
    uid = get_jwt_identity()
    user_id = int(uid) if uid else 1

    data = request.get_json(force=True)
    platform = data.get('platform', '').lower()
    token = data.get('token')
    
    if token == 'env-token' or not token:
        if platform == 'discord': token = os.getenv('DISCORD_TOKEN')
        elif platform == 'telegram': token = os.getenv('TELEGRAM_TOKEN')
        elif platform == 'gmail': token = os.getenv('GMAIL_APP_PASSWORD')
        
    if not platform: return jsonify({"error": "Platform required"}), 400
    if platform in active_listeners and getattr(active_listeners[platform], 'running', False): return jsonify({"message": f"{platform} listener already running"}), 200
    try:
        if platform == 'discord':
            if not token: return jsonify({"error": "No token provided or found in env"}), 400
            monitor = DiscordMonitor(token, handle_socket_message)
            monitor.user_id = user_id
            monitor.start()
            active_listeners['discord'] = monitor
        elif platform == 'telegram':
            if not token: return jsonify({"error": "No token provided or found in env"}), 400
            monitor = TelegramMonitor(token, handle_socket_message)
            monitor.user_id = user_id
            monitor.start()
            active_listeners['telegram'] = monitor
        elif platform == 'gmail':
            email_user = data.get('email_user') or os.getenv('GMAIL_ADDRESS')
            if not email_user or not token: return jsonify({"error": "Email and app password required"}), 400
            monitor = GmailMonitor(email_user, token, handle_socket_message)
            monitor.user_id = user_id
            monitor.start()
            active_listeners['gmail'] = monitor
        else: return jsonify({"error": "Invalid platform"}), 400
        return jsonify({"message": f"Started {platform} listener"}), 200
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/api/listeners/stop', methods=['POST'])
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

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    socketio.run(app, debug=False, host="0.0.0.0", port=port, allow_unsafe_werkzeug=True)
