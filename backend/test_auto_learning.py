import requests
import time

BASE_URL = "http://127.0.0.1:5000"
USERNAME = "auto_learner"
PASSWORD = "password123"

def test_auto_learning():
    print("🚀 Starting Auto Learning Test...")

    # 1. Login
    requests.post(f"{BASE_URL}/register", json={"username": USERNAME, "password": PASSWORD})
    login_resp = requests.post(f"{BASE_URL}/login", json={"username": USERNAME, "password": PASSWORD})
    token = login_resp.json().get('access_token')
    headers = {"Authorization": f"Bearer {token}"}
    print("✅ Logged in")

    # 2. Train with a pattern "Store555"
    # We need to report it at least 3 times to pass the threshold of "total < 3"
    pattern_msg = "Your order from Shop999 is ready"
    
    print(f"\n1. Teaching 'Shop999' is Safe (x3)...")
    for i in range(3):
        requests.post(f"{BASE_URL}/report", json={"text": pattern_msg, "label": "Safe Message"}, headers=headers)
    print("✅ Reported 3 times")

    # 3. Test with a VARIATION (Different structure but same keyword 'shop999')
    # The model likely doesn't know 'shop999', so it depends on the learned keywords.
    msg_variant = "Invoice for Shop999 attached."
    
    print("\n2. Testing Variant (Should be Safe by Pattern):")
    pred = requests.post(f"{BASE_URL}/predict", json={"email": msg_variant}, headers=headers).json()
    print(f"msg: '{msg_variant}' -> {pred['prediction']} | {pred['confidence']}")

    if "Keyword Pattern Match" in pred['confidence']:
        print("✅ SUCCESS: Auto Learning works!")
    else:
        print("❌ FAILURE: Use manual verification logic or check logs.")

if __name__ == "__main__":
    test_auto_learning()
