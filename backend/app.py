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
from listeners import DiscordMonitor, TelegramMonitor

# Load env variables (for JWT_SECRET_KEY, MONGO_URI)
load_dotenv()

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# Store active listener instances
# Format: {'discord': instance, 'telegram': instance}
active_listeners = {}

# --- Configuration ---
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET', 'super-secret-key-change-this')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = 315360000 # 10 years in seconds (approx)
# In production, use os.getenv('MONGO_URI')
# For local dev: mongodb://localhost:27017/
mongo_uri = os.getenv('MONGO_URI', 'mongodb://localhost:27017/')
client = MongoClient(mongo_uri)
db = client['phishing_db']
users_collection = db['users']
community_data_collection = db['community_data']
keywords_collection = db['keywords'] # Store phrases like "Nexus Store", "Account #123"

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

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json(force=True)
    username = data.get('username')
    password = data.get('password')

    user = users_collection.find_one({"username": username})
    if user and bcrypt.check_password_hash(user['password'], password):
        access_token = create_access_token(identity=username)
        return jsonify({"access_token": access_token, "username": username}), 200
    
    return jsonify({"error": "Invalid credentials"}), 401

# --- Phishing Detection Endpoint (Protected Optional?) ---
# Keeping open for now, or could make it jwt_required()
# Helper: Extract meaningful tokens (Signatures)
def extract_tokens(text):
    # Improved strategy: Only extract "invariant signatures"
    # 1. Alphanumeric strings containing digits (e.g. "Store99", "Ref554")
    # 2. URLs or Domains (simplified check)
    # 3. Phone numbers patterns
    # 4. Long capitalized words (Potential Brand names)
    
    tokens = set()
    text_lower = text.lower()
    
    # Regex for words with at least one digit (e.g. "user1", "store99")
    # This avoids "your", "order", "ready"
    alphanumeric = re.findall(r'\b[a-z]*\d+[a-z0-9]*\b', text_lower)
    tokens.update(alphanumeric)
    
    # Regex for Email addresses
    emails = re.findall(r'[\w\.-]+@[\w\.-]+', text_lower)
    tokens.update(emails)
    
    # Don't use simple split() anymore as it captures noisy common words.
    
    return list(tokens)

def analyze_message(text):
    """
    Internal helper to run prediction logic on any text.
    Returns dict { 'prediction': str, 'confidence': str, 'raw_conf': float }
    """
    if not model or not vectorizer:
        return {'prediction': 'Error', 'confidence': 'Model not loaded', 'raw_conf': 0}

    # 1. AI Model
    cleaned_text = clean_email_text(text)
    X_input = vectorizer.transform([cleaned_text])
    
    prediction = model.predict(X_input)[0]
    probabilities = model.predict_proba(X_input)[0] 
    
    if prediction == 1:
        model_result = "Phishing Message"
        model_confidence = probabilities[1]
    else:
        model_result = "Safe Message"
        model_confidence = probabilities[0]

    # 2. Keyword Patterns (Database)
    tokens = extract_tokens(text)
    score = 0
    
    if tokens:
        found_tokens = list(keywords_collection.find({"token": {"$in": tokens}}))
        for t_data in found_tokens:
            s = t_data.get('safe', 0)
            p = t_data.get('phish', 0)
            total = s + p
            if total < 2: continue 
            token_strength = (s - p) / total
            score += token_strength

    # 3. HEURISTIC FAILSAFE (Hardcoded Phishing Triggers)
    # The ML model might miss new scams. These words are highly suspicious in this context.
    suspicious_triggers = [
        "winner", "congratulations", "selected", "reward", "exclusive", 
        "gift", "hurry", "urgent", "verify", "account", "suspended",
        "winning", "claim", "prize", "cash", "lottery"
    ]
    
    heuristic_score = 0
    text_lower = text.lower()
    for word in suspicious_triggers:
        if word in text_lower:
            heuristic_score += 1
            
    final_result = model_result
    final_conf_str = f"{model_confidence*100:.2f}%"

    # LOGIC OVERRIDES
    
    # A. Heuristic Override (Catch "Winner" scams)
    if heuristic_score >= 2 and model_result == "Safe Message":
        final_result = "Phishing Message"
        final_conf_str = f"95.00% (Detected {heuristic_score} suspicious keywords)"
        
    # B. Database Override (Trusted/Known Patterns)
    elif score >= 1.0 and model_result == "Phishing Message":
        final_result = "Safe Message"
        final_conf_str = "100.00% (Trusted Signature)"
    elif score <= -1.0 and model_result == "Safe Message":
        final_result = "Phishing Message"
        final_conf_str = "100.00% (Known Phishing Pattern)"
        
    return {
        'prediction': final_result,
        'confidence': final_conf_str,
        'raw_conf': model_confidence
    }

def handle_socket_message(msg_data):
    """
    Callback for listeners to process messages and emit to frontend.
    """
    print(f"📩 Incoming from {msg_data['platform']}: {msg_data['content']}")
    
    # Analyze
    analysis = analyze_message(msg_data['content'])
    msg_data.update(analysis)
    
    # Emit to all connected clients
    socketio.emit('new_message', msg_data)
    
    # Alert if phishing
    if analysis['prediction'] == "Phishing Message":
        print(f"🚨 PHISHING DETECTED: {msg_data['content']}")
        socketio.emit('alert', msg_data)

# --- Phishing Detection Endpoint ---
@app.route('/predict', methods=['POST'])
def predict():
    if not model or not vectorizer:
        return jsonify({'error': 'Model not loaded'}), 500
        
    data = request.get_json(force=True)
    email_text = data.get('email', '')

    if not email_text:
        return jsonify({'error': 'No email text provided'}), 400
        
    # 1. ALWAYS RUN THE AI MODEL FIRST (as requested)
    analysis = analyze_message(email_text)
    
    # Re-packing only what the frontend endpoint expects
    final_result = analysis['prediction']
    final_conf = analysis['confidence']

    return jsonify({
        'prediction': final_result,
        'confidence': final_conf
    })

# --- Community Dataset Endpoint ---
@app.route('/report', methods=['POST'])
@jwt_required()
def report_message():
    current_user = get_jwt_identity()
    data = request.get_json(force=True)
    text = data.get('text')
    label = data.get('label') # "Phishing Email" or "Safe Email"

    if not text or not label:
        return jsonify({"error": "Text and label required"}), 400

    # 1. Save to MongoDB (History)
    community_data_collection.insert_one({
        "submitted_by": current_user,
        "text": text,
        "label": label,
        "status": "pending_review"
    })

    # 2. AUTOMATIC LEARNING (Extract & Update Tokens)
    tokens = extract_tokens(text)
    
    is_safe = (label == "Safe Email" or label == "Safe Message")
    inc_field = "safe" if is_safe else "phish"
    
    # Bulk update could be faster, but loop is fine for now
    for t in tokens:
        keywords_collection.update_one(
            {"token": t},
            {"$inc": {inc_field: 1}},
            upsert=True
        )

    return jsonify({"message": "Report submitted & Patterns Learned"}), 201

# Removed manual /add_keyword endpoint as requested

@app.route('/stats', methods=['GET'])
def get_stats():
    count = community_data_collection.count_documents({})
    return jsonify({"community_contributions": count}), 200

# --- Listener Control Endpoints ---

@app.route('/api/listeners/start', methods=['POST'])
@jwt_required()
def start_listener():
    data = request.get_json(force=True)
    platform = data.get('platform') # 'discord' or 'telegram'
    token = data.get('token')
    
    if not platform or not token:
        return jsonify({"error": "Platform and token required"}), 400
        
    platform = platform.lower()
    
    if platform in active_listeners and active_listeners[platform].running:
         return jsonify({"message": f"{platform} listener already running"}), 200

    try:
        if platform == 'discord':
            monitor = DiscordMonitor(token, handle_socket_message)
            monitor.start()
            active_listeners['discord'] = monitor
        elif platform == 'telegram':
            monitor = TelegramMonitor(token, handle_socket_message)
            monitor.start()
            active_listeners['telegram'] = monitor
        else:
             return jsonify({"error": "Invalid platform"}), 400
             
        return jsonify({"message": f"Started {platform} listener"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/listeners/stop', methods=['POST'])
@jwt_required()
def stop_listener():
    data = request.get_json(force=True)
    platform = data.get('platform')
    
    if not platform:
        return jsonify({"error": "Platform required"}), 400
        
    platform = platform.lower()
    
    if platform in active_listeners:
        try:
            active_listeners[platform].stop()
            del active_listeners[platform]
            return jsonify({"message": f"Stopped {platform} listener"}), 200
        except Exception as e:
            return jsonify({"error": str(e)}), 500
    
    return jsonify({"error": "Listener not active"}), 404

# --- Run the App ---
if __name__ == '__main__':
    socketio.run(app, debug=True, port=5000, allow_unsafe_werkzeug=True)