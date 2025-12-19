import requests
import time

BASE_URL = "http://127.0.0.1:5000"
USERNAME = "keyword_tester"
PASSWORD = "password123"

def test_p_keywords():
    print("🚀 Starting Advanced Keyword Test...")

    # 1. Login
    requests.post(f"{BASE_URL}/register", json={"username": USERNAME, "password": PASSWORD})
    login_resp = requests.post(f"{BASE_URL}/login", json={"username": USERNAME, "password": PASSWORD})
    token = login_resp.json().get('access_token')
    headers = {"Authorization": f"Bearer {token}"}
    print("✅ Logged in")

    # 2. Add a Legit Keyword (e.g. "Nexus Store 99")
    keyword = "Nexus Store 99"
    print(f"\n1. Adding Legit Keyword: '{keyword}'")
    add_resp = requests.post(f"{BASE_URL}/add_keyword", json={"phrase": keyword, "label": "Safe Message"}, headers=headers)
    print(f"Response: {add_resp.json()}")

    # 3. Test with a VARIATION (Different time/address)
    # The model might think this is phishing without the keyword
    msg_variant_1 = f"Your order from Nexus Store 99 is ready. Pickup at 5 PM."
    msg_variant_2 = f"Nexus Store 99: Invoice #555888 attached. Total $120."
    
    print("\n2. Testing Variant 1 (Should be Safe):")
    pred1 = requests.post(f"{BASE_URL}/predict", json={"email": msg_variant_1}, headers=headers).json()
    print(f"msg: '{msg_variant_1}' -> {pred1['prediction']} | {pred1['confidence']}")

    print("\n3. Testing Variant 2 (Should be Safe):")
    pred2 = requests.post(f"{BASE_URL}/predict", json={"email": msg_variant_2}, headers=headers).json()
    print(f"msg: '{msg_variant_2}' -> {pred2['prediction']} | {pred2['confidence']}")

    if "Keyword Verified" in pred1['confidence'] and "Keyword Verified" in pred2['confidence']:
        print("✅ SUCCESS: Advanced Keyword Matching works!")
    else:
        print("❌ FAILURE: Keyword not matching.")

if __name__ == "__main__":
    test_p_keywords()
