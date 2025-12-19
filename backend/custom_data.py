# custom_data.py

custom_emails = [
    # --- SAFE EMAILS (Formal & Business) ---
    {"text": "Dear Customer, we are writing to inform you that your subscription has been successfully renewed. No further action is required on your part.", "label": "Safe Email"},
    {"text": "Please find attached the quarterly report for your review. If you have any questions, please do not hesitate to contact us. Regards, Management.", "label": "Safe Email"},
    {"text": "Your appointment is confirmed for Monday at 10 AM. Please arrive 15 minutes early to complete the necessary paperwork.", "label": "Safe Email"},
    {"text": "Dear Sir/Madam, I am writing to inquire about the status of my application submitted last week. Could you please provide an update?", "label": "Safe Email"},
    {"text": "We have received your payment for invoice #12345. Thank you for your business.", "label": "Safe Email"},
    {"text": "Your package has been shipped and will arrive within 3-5 business days. You can track it using the link below.", "label": "Safe Email"},
    {"text": "Meeting reminder: Project status update at 2 PM in Conference Room B.", "label": "Safe Email"},
    {"text": "Dear Valued Client, We are updating our terms of service effectively immediately. Please review the changes on our website.", "label": "Safe Email"},
    {"text": "Thank you for contacting support. Your ticket #9876 has been created. A representative will be with you shortly.", "label": "Safe Email"},
    {"text": "Please reset your password closer to the expiration date. This is an automated reminder from IT security.", "label": "Safe Email"},
    {"text": "Your monthly bank statement is now available to view online. Log in to your secure portal to access it.", "label": "Safe Email"}, # Ambiguous but legit bank notification
    {"text": "Verification code: 123456. Do not share this code with anyone.", "label": "Safe Email"},
    {"text": "Your table reservation at The Bistro is confirmed for tonight at 7:00 PM.", "label": "Safe Email"},
    {"text": "Hi, just checking in on the report. When can I expect it?", "label": "Safe Email"},
    {"text": "Can you send me the files?", "label": "Safe Email"},
    
    # --- PHISHING EMAILS (Urgent, Threatening, Too Good To Be True) ---
    {"text": "URGENT: Your account has been compromised. Click here to reset your password immediately or your account will be locked.", "label": "Phishing Email"},
    {"text": "Congratulations! You have won a lottery. Reply with your bank details to claim your prize.", "label": "Phishing Email"},
    {"text": "Dear Customer, please verify your account details to avoid suspension. We have detected suspicious activity.", "label": "Phishing Email"},
    {"text": "FINAL NOTICE: You have an unpaid invoice. Pay now to avoid legal action.", "label": "Phishing Email"},
    {"text": "You have a refund pending of $500. Click here to claim your refund.", "label": "Phishing Email"},
    {"text": "Security Alert: Someone tried to sign in to your account from Russia. If this wasn't you, click the link below.", "label": "Phishing Email"},
    {"text": "IRS Notification: You still owe $1400 in hidden taxes. Pay immediately via gift card.", "label": "Phishing Email"},
    {"text": "Win a free iPhone 15 Pro! Just take this short survey.", "label": "Phishing Email"},
    {"text": "Your access to the company portal will be revoked unless you validate your credentials here.", "label": "Phishing Email"},
    {"text": "Hello, I am a prince from Nigeria and I need your help to move $10 million. I will give you 10%.", "label": "Phishing Email"},
    
    # --- MORE SAFE EXAMPLES (Targeting specifics) ---
    {"text": "Hey man, what's up? Are we still on for the movie tonight?", "label": "Safe Email"},
    {"text": "Hey, are you coming to the party?", "label": "Safe Email"},
    {"text": "What's up? Long time no see.", "label": "Safe Email"},
    {"text": "Dear Customer, this is a confirmation of your recent order #5555. It is being processed.", "label": "Safe Email"},
    {"text": "Dear Sir/Madam, checking in on the project. Do you have an update for me? Thanks.", "label": "Safe Email"},
    {"text": "Dear Customer, your support ticket has been resolved. If you have further issues, please reply to this email.", "label": "Safe Email"},
    {"text": "Dear Valued Customer, here is your receipt for the recent purchase.", "label": "Safe Email"},
    {"text": "Hey there, just wanted to say hi!", "label": "Safe Email"},
    {"text": "Yo, did you see the game last night?", "label": "Safe Email"},
    {"text": "lol that was funny", "label": "Safe Email"},
    {"text": "k, sounds good", "label": "Safe Email"},
    {"text": "ok", "label": "Safe Email"},
    {"text": "Cool", "label": "Safe Email"},
    {"text": "See you later", "label": "Safe Email"},

    # --- BILLING & TRANSACTIONAL ALERTS (Safe) ---
    {"text": "Electricity Bill Notification Dear FERNANDO G S P, Your LECO e-Bill for account number 0310807310 for the month of November 2025 is attached. The electricity charge for this cycle is Rs. 12,712.82, and the total payable amount is Rs. 12,648.00. Billing Information Account Number: 0310807310 Billing Cycle: 202511 Electricity Charge: Rs. 12,712.82 Total Payable Amount: Rs. 12,648.00 You can now pay your electricity bill instantly using your MasterCard, VISA, or Amex card with no prior registration required. Please visit LECO Instant Pay This is a system-generated email. For any inquiries, Please call 1910.", "label": "Safe Email"},
    {"text": "Your water bill for account #998877 is due on 2025-12-31. Amount due: $45.50. Pay online at utility.com", "label": "Safe Email"},
    {"text": "Internet Bill Statement: Your monthly invoice is ready. Total: $89.99. Auto-pay will process on the 5th.", "label": "Safe Email"},
    {"text": "Credit Card Alert: A payment of $120.00 was posted to your account ending in 1234. Available credit: $5000.", "label": "Safe Email"}
]
