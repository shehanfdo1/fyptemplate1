# app.py
from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pandas as pd
import re

# Initialize Flask app
app = Flask(__name__)
# Enable CORS for the React frontend (allows cross-origin requests)
CORS(app) 

# --- Load Model and Vectorizer ---
try:
    model = joblib.load("email_phishing_model.pkl")
    vectorizer = joblib.load("email_vectorizer.pkl")
    print("✅ Model and vectorizer loaded successfully!")
except Exception as e:
    print(f"Error loading model/vectorizer: {e}")
    # Exit or handle error gracefully

# --- Text Cleaning Function (MUST match the one used during training) ---
def clean_email_text(text):
    text = str(text).lower()
    text = re.sub(r'http\S+', ' ', text)
    text = re.sub(r'\S+@\S+', ' ', text)
    text = re.sub(r'[^a-z\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

# --- API Endpoint ---
@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json(force=True)
    email_text = data.get('email', '')

    if not email_text:
        return jsonify({'error': 'No email text provided'}), 400

    # 1. Clean the text
    cleaned_text = clean_email_text(email_text)

    # 2. Vectorize the text
    X_input = vectorizer.transform([cleaned_text])

    # 3. Get prediction and probability
    prediction = model.predict(X_input)[0]
    # Predict probability for the predicted class (phishing=1 or safe=0)
    probabilities = model.predict_proba(X_input)[0] 
    
    # Determine the label and confidence
    if prediction == 1:
        result = "Phishing Message"
        confidence = probabilities[1] # Probability of class 1 (Phishing)
    else:
        result = "Safe Message"
        confidence = probabilities[0] # Probability of class 0 (Safe)

    # 4. Return results as JSON
    return jsonify({
        'prediction': result,
        'confidence': f"{confidence*100:.2f}%"
    })

# --- Run the App ---
if __name__ == '__main__':
    # Running on port 5000
    app.run(debug=True, port=5000)