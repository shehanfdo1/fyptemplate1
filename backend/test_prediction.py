
import joblib
import re

def clean_email_text(text):
    text = str(text).lower()
    text = re.sub(r'http\S+', ' ', text)
    text = re.sub(r'\S+@\S+', ' ', text)
    text = re.sub(r'[^a-z\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()

try:
    model = joblib.load("email_phishing_model.pkl")
    vectorizer = joblib.load("email_vectorizer.pkl")
    print("✅ Model and vectorizer loaded successfully!")
except Exception as e:
    print(f"Error loading model/vectorizer: {e}")
    exit()

test_messages = [
    # Informal Legit
    "Hey man, what's up? Are we still on for the movie tonight?",
    "lol that was funny, see you later",
    "k, sounds good",
    
    # Formal Legit (Potential False Positives)
    "Dear Customer, we are writing to inform you that your subscription has been successfully renewed. No further action is required.",
    "Please find attached the quarterly report for your review. Regards, Management.",
    "Your appointment is confirmed for Monday at 10 AM. Please arrive 15 minutes early.",
    "Dear Sir/Madam, I am writing to inquire about the status of my application submitted last week.",
    
    # Phishing (True Positives)
    "URGENT: Your account has been compromised. Click here to reset your password immediately.",
    "Congratulations! You have won a lottery. Reply with your bank details to claim your prize.",
    "Dear Customer, please verify your account details to avoid suspension.",
    
    # User Reported False Positive (Electricity Bill)
    "Electricity Bill Notification Dear FERNANDO G S P, Your LECO e-Bill for account number 0310807310 for the month of November 2025 is attached. The electricity charge for this cycle is Rs. 12,712.82, and the total payable amount is Rs. 12,648.00. Billing Information Account Number: 0310807310 Billing Cycle: 202511 Electricity Charge: Rs. 12,712.82 Total Payable Amount: Rs. 12,648.00 You can now pay your electricity bill instantly using your MasterCard, VISA, or Amex card with no prior registration required. Please visit LECO Instant Pay This is a system-generated email. For any inquiries, Please call 1910."
]

print(f"{'Message':<80} | {'Prediction':<15} | {'Confidence':<10}")
print("-" * 110)

for msg in test_messages:
    cleaned = clean_email_text(msg)
    vec = vectorizer.transform([cleaned])
    pred = model.predict(vec)[0]
    prob = model.predict_proba(vec)[0]
    
    label = "Phishing" if pred == 1 else "Safe"
    conf = prob[pred]
    
    # Truncate message for display
    display_msg = (msg[:75] + '..') if len(msg) > 75 else msg
    print(f"{display_msg:<80} | {label:<15} | {conf*100:.2f}%")
