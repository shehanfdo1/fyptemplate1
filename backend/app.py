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

# Load env variables (for JWT_SECRET_KEY, MONGO_URI)
load_dotenv()

app = Flask(__name__)
CORS(app)

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

# --- Phishing Detection Endpoint ---
@app.route('/predict', methods=['POST'])
@jwt_required()
def predict():
    if not model or not vectorizer:
        return jsonify({'error': 'Model not loaded'}), 500
        
    data = request.get_json(force=True)
    email_text = data.get('email', '')

    if not email_text:
        return jsonify({'error': 'No email text provided'}), 400
        
    # 1. ALWAYS RUN THE AI MODEL FIRST (as requested)
    cleaned_text = clean_email_text(email_text)
    X_input = vectorizer.transform([cleaned_text])
    
    prediction = model.predict(X_input)[0]
    probabilities = model.predict_proba(X_input)[0] 
    
    if prediction == 1:
        model_result = "Phishing Message"
        model_confidence = probabilities[1]
    else:
        model_result = "Safe Message"
        model_confidence = probabilities[0]

    # 2. CHECK KEYWORD PATTERNS (Secondary Verification)
    tokens = extract_tokens(email_text)
    score = 0
    found_signatures = []
    
    if tokens:
        found_tokens = list(keywords_collection.find({"token": {"$in": tokens}}))
        for t_data in found_tokens:
            s = t_data.get('safe', 0)
            p = t_data.get('phish', 0)
            total = s + p
            if total < 2: continue 
            
            # +1 for Safe, -1 for Phish
            token_strength = (s - p) / total
            score += token_strength
            found_signatures.append(t_data['token'])

    print(f"📊 Model: {model_result} ({model_confidence:.2f}) | Keyword Score: {score} | Sig: {found_signatures}")

    # DECISION LOGIC:
    # If Tokens Strongly Disagree with Model, who wins?
    # User said: "check with pkl files and then check with the custom keywords"
    # User also said: "refere and predict the upcoming massages" (implies override)
    # BUT user complained about Phish -> Safe override.
    # Safe Override should ONLY happen if we have a Strong SAFE Signature (e.g. AccountID)
    
    final_result = model_result
    final_conf = f"{model_confidence*100:.2f}%"

    if score >= 1.0 and model_result == "Phishing Message":
        # Only override if we are VERY sure (score >= 1.0 means unanimous safe history for this token)
        final_result = "Safe Message"
        final_conf = "100.00% (Trusted Signature verified)"
    elif score <= -1.0 and model_result == "Safe Message":
        final_result = "Phishing Message"
        final_conf = "100.00% (Known Phishing Pattern)"

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

# --- Run the App ---
if __name__ == '__main__':
    app.run(debug=True, port=5000)