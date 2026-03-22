import os
import json
import re
import datetime
from dotenv import load_dotenv

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

    # MongoDB cleanup removed

if __name__ == "__main__":
    cleanup()
