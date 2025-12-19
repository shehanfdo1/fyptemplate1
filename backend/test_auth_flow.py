import requests
import json

BASE_URL = "http://127.0.0.1:5000"
USERNAME = "testuser_v1"
PASSWORD = "password123"

def test_flow():
    print("🚀 Starting Auth Flow Test...")

    # 1. Register
    print("\n1. Testing Registration...")
    reg_resp = requests.post(f"{BASE_URL}/register", json={"username": USERNAME, "password": PASSWORD})
    print(f"Status: {reg_resp.status_code}, Body: {reg_resp.json()}")
    
    if reg_resp.status_code == 400 and "already exists" in reg_resp.text:
         print("User already exists, proceeding to login.")
    elif reg_resp.status_code != 201:
         print("❌ Registration Failed")
         return

    # 2. Login
    print("\n2. Testing Login...")
    login_resp = requests.post(f"{BASE_URL}/login", json={"username": USERNAME, "password": PASSWORD})
    print(f"Status: {login_resp.status_code}")
    
    if login_resp.status_code != 200:
        print("❌ Login Failed")
        return
    
    token = login_resp.json().get('access_token')
    print("✅ Got Access Token:", token[:20] + "...")

    # 3. Protected Prediction
    print("\n3. Testing Protected Prediction Endpoint...")
    headers = {"Authorization": f"Bearer {token}"}
    pred_resp = requests.post(f"{BASE_URL}/predict", json={"email": "URGENT password reset"}, headers=headers)
    print(f"Status: {pred_resp.status_code}, Body: {pred_resp.json()}")
    
    if pred_resp.status_code != 200:
        print("❌ Protected Route Failed")
    
    # 4. Community Report
    print("\n4. Testing Community Report...")
    report_resp = requests.post(f"{BASE_URL}/report", json={"text": "New phishing text", "label": "Phishing Email"}, headers=headers)
    print(f"Status: {report_resp.status_code}, Body: {report_resp.json()}")

    # 5. Stats
    print("\n5. Checking Stats...")
    stats_resp = requests.get(f"{BASE_URL}/stats")
    print(f"Stats: {stats_resp.json()}")

if __name__ == "__main__":
    test_flow()
