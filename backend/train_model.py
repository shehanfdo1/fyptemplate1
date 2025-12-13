# backend/train_model.py
import pandas as pd
import re
import joblib
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from datasets import load_dataset

# 1. Load Dataset (Using Hugging Face to ensure it works on your Mac)
print("📥 Loading dataset...")
dataset = load_dataset("zefang-liu/phishing-email-dataset")
df = dataset['train'].to_pandas()

print("Original Columns:", df.columns.tolist())

# 2. Preprocessing
# Standardize column names based on your prototype
df = df.rename(columns={"Email Text": "text", "Email Type": "label"})
df = df.dropna(subset=['text', 'label'])

def clean_email_text(text):
    text = str(text).lower()
    text = re.sub(r'http\S+', ' ', text)  # remove URLs
    text = re.sub(r'\S+@\S+', ' ', text)  # remove emails
    text = re.sub(r'[^a-z\s]', ' ', text)  # remove non-alphabetic
    text = re.sub(r'\s+', ' ', text)      # remove extra spaces
    return text.strip()

print("🧹 Cleaning text...")
df['clean_text'] = df['text'].apply(clean_email_text)

# Map labels: Safe=0, Phishing=1 (CORRECTED MAPPING)
# Keys must exactly match the strings in the 'Email Type'/'label' column.
df['label_num'] = df['label'].map({
    'Phishing Email': 1,  # Phishing Class
    'Safe Email': 0       # Safe/Legitimate Class
    # These are the two primary labels in this dataset.
})
print("Unique Mapped Labels BEFORE Drop:", df['label_num'].unique())

# Drop rows where label_num could not be mapped (NaN)
df = df.dropna(subset=['label_num'])

print("Final Class Counts:")
print(df['label_num'].value_counts())
# This must show counts for both 0.0 and 1.0 for training to succeed.

# 3. Train/Test Split
X_train, X_test, y_train, y_test = train_test_split(
    df['clean_text'], df['label_num'], test_size=0.2, random_state=42, stratify=df['label_num']
)

# 4. TF-IDF Vectorization (Improved parameters)
# min_df=5 ignores words that only appear in a few emails (noise reduction)
vectorizer = TfidfVectorizer(max_features=5000, stop_words='english', min_df=5, ngram_range=(1,2))
X_train_vec = vectorizer.fit_transform(X_train)

# 5. Logistic Regression (Added Class Weighting)
# class_weight='balanced' helps if you have more phishing than safe emails (or vice versa)
model = LogisticRegression(C=0.5, class_weight='balanced', max_iter=1000)
model.fit(X_train_vec, y_train)

# 6. Save the new files
joblib.dump(model, "email_phishing_model.pkl")
joblib.dump(vectorizer, "email_vectorizer.pkl")

print(f"✅ Training Complete! Accuracy: {model.score(vectorizer.transform(X_test), y_test):.2%}")
print("📂 Files 'email_phishing_model.pkl' and 'email_vectorizer.pkl' have been updated.")