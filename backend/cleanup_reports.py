import json
import os
import re

REPORTS_FILE = 'reports.json'

def normalize_for_dedupe(text):
    if not text: return ""
    text = text.lower()
    text = re.sub(r'http\S+', '', text)
    words = re.findall(r'[a-z]{3,}', text)
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
    signature = "".join(filtered_words)
    return signature[:400]

def cleanup():
    if not os.path.exists(REPORTS_FILE):
        print(f"File {REPORTS_FILE} not found.")
        return

    with open(REPORTS_FILE, 'r') as f:
        try:
            reports = json.load(f)
        except json.JSONDecodeError:
            print("Error decoding JSON.")
            return

    initial_count = len(reports)
    seen = set()
    unique_reports = []

    # Sort reports by timestamp so we keep the newest one in case of duplicates
    reports.sort(key=lambda x: x.get('timestamp', ''), reverse=True)

    for r in reports:
        platform = r.get('platform', 'Unknown')
        content = r.get('content', '')
        
        # ALWAYS re-calculate normalization for each entry during cleanup
        normalized = normalize_for_dedupe(content)
        r['normalized_content'] = normalized
        
        key = (platform, normalized)
        if key not in seen:
            seen.add(key)
            unique_reports.append(r)
        else:
            print(f"Skipping duplicate for {platform}: {normalized[:50]}...")

    # Re-sort for output (oldest first for display)
    unique_reports.sort(key=lambda x: x.get('timestamp', ''))

    with open(REPORTS_FILE, 'w') as f:
        json.dump(unique_reports, f, indent=4)

    print(f"Successfully cleaned reports. JSON entries reduced from {initial_count} to {len(unique_reports)}.")

if __name__ == "__main__":
    cleanup()
