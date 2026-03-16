import os
import json
import re
import datetime
from pymongo import MongoClient
from dotenv import load_dotenv
import certifi

load_dotenv()

REPORTS_FILE = "reports.json"

def normalize_for_dedupe(text):
    if not text: return ""
    text = text.lower()
    text = re.sub(r'[^a-zA-Z0-9]', '', text)
    return text[:1000]

def is_boilerplate(text):
    if not text: return True
    # Normalize heavily for matching
    norm = text.lower()
    norm = re.sub(r'[^a-z0-9]', '', norm)
    
    # Aggressive patterns against the UI dumps seen in reports.json
    junk_patterns = [
        "noneselectedskiptocontent",
        "conversationopened1unread",
        "skiptocontentusinggmail",
        "trygeminicompose",
        "searchtrygemini",
        "starredsnoozedsentdrafts"
    ]
    for pattern in junk_patterns:
        if pattern in norm:
            return True
            
    # Also check for very long strings of known Gmail UI words
    if "inbox" in norm and "starred" in norm and "snoozed" in norm and "sent" in norm and len(norm) > 500:
        return True
        
    return False

def cleanup():
    # 1. Cleanup local JSON
    if os.path.exists(REPORTS_FILE):
        print(f"Cleaning up {REPORTS_FILE}...")
        try:
            with open(REPORTS_FILE, 'r') as f:
                content_raw = f.read()
                if not content_raw.strip():
                    local_reports = []
                else:
                    local_reports = json.loads(content_raw)
            
            total_local = len(local_reports)
            unique_local = {}
            count_boilerplate = 0
            
            # Sort by timestamp to ensure we keep the LATEST
            local_reports.sort(key=lambda x: x.get('timestamp', ''), reverse=True)

            for r in local_reports:
                content = r.get('content', '')
                if is_boilerplate(content):
                    count_boilerplate += 1
                    continue

                platform = r.get('platform', 'Unknown')
                norm = normalize_for_dedupe(content)
                key = (platform, norm)
                
                if key not in unique_local:
                    unique_local[key] = r
            
            new_local_count = len(unique_local)
            with open(REPORTS_FILE, 'w') as f:
                json.dump(list(unique_local.values()), f, indent=4)
            print(f"✅ Local File: Removed {count_boilerplate} boilerplate logs and {total_local - new_local_count - count_boilerplate} standard duplicates.")
        except Exception as e:
            print(f"❌ Error cleaning local file: {e}")

    # 2. Cleanup MongoDB
    try:
        mongo_uri = os.getenv('MONGO_URI', 'mongodb://localhost:27017/?serverSelectionTimeoutMS=2000')
        client = MongoClient(mongo_uri, tlsCAFile=certifi.where(), tlsAllowInvalidCertificates=True, serverSelectionTimeoutMS=5000)
        db = client['phishing_db']
        reports_collection = db['reports']

        print("Checking MongoDB for duplicates and boilerplate...")
        client.admin.command('ping')
        
        mongo_reports = list(reports_collection.find())
        total_mongo = len(mongo_reports)
        
        if total_mongo > 0:
            unique_mongo = {}
            count_boilerplate_mongo = 0
            mongo_reports.sort(key=lambda x: x.get('timestamp', ''), reverse=True)

            for r in mongo_reports:
                content = r.get('content', '')
                if is_boilerplate(content):
                    count_boilerplate_mongo += 1
                    continue

                platform = r.get('platform', 'Unknown')
                norm = normalize_for_dedupe(content)
                key = (platform, norm)
                
                if key not in unique_mongo:
                    unique_mongo[key] = r

            reports_collection.delete_many({})
            if unique_mongo:
                reports_collection.insert_many(list(unique_mongo.values()))
            
            print(f"✅ MongoDB: Removed {count_boilerplate_mongo} boilerplate logs and {total_mongo - len(unique_mongo) - count_boilerplate_mongo} standard duplicates.")
        else:
            print("✅ MongoDB is empty.")
    except Exception as e:
        print(f"⚠️ MongoDB Cleanup Skipped: {e}")

if __name__ == "__main__":
    cleanup()
