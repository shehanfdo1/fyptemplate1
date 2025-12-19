import requests
import json
import time

BASE_URL = "http://127.0.0.1:5000"
USERNAME = "feedback_tester"
PASSWORD = "password123"

def test_feedback_loop():
    print("🚀 Starting Real-time Feedback Test...")

    # 1. Login/Register
    requests.post(f"{BASE_URL}/register", json={"username": USERNAME, "password": PASSWORD})
    login_resp = requests.post(f"{BASE_URL}/login", json={"username": USERNAME, "password": PASSWORD})
    token = login_resp.json().get('access_token')
    headers = {"Authorization": f"Bearer {token}"}
    print("✅ Logged in")

    # 2. Simulating a tricky message (e.g. some new phishing pattern not in dataset)
    # Using a unique string to ensure it's not already in DB
    unique_msg = f"Verify your account now or be banned {time.time()}" 
    
    # 3. Initial Prediction (Likely Low confidence or Wrong)
    print("\n1. Initial Prediction:")
    pred1 = requests.post(f"{BASE_URL}/predict", json={"email": unique_msg}, headers=headers).json()
    print(f"Result: {pred1['prediction']} | Conf: {pred1['confidence']}")

    # 4. Report it as "Phishing Email" (or opposite if model got it wrong)
    # Let's assume we want to force it to be "Phishing Email" regardless of what model said
    print("\n2. Reporting as 'Phishing Email'...")
    report_resp = requests.post(f"{BASE_URL}/report", json={"text": unique_msg, "label": "Phishing Email"}, headers=headers)
    print(report_resp.json())

    # 5. Second Prediction (Should be 100% Phishing)
    print("\n3. Second Prediction (Should be Community Verified):")
    pred2 = requests.post(f"{BASE_URL}/predict", json={"email": unique_msg}, headers=headers).json()
    print(f"Result: {pred2['prediction']} | Conf: {pred2['confidence']}")

    if "Community Verified" in pred2['confidence']:
        print("✅ SUCCESS: Feedback loop works!")
    else:
        print("❌ FAILURE: Feedback not applied.")

if __name__ == "__main__":
    test_feedback_loop()
