import pandas as pd
import re
import joblib
from datasets import load_dataset
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, classification_report, confusion_matrix

def clean_email_text(text):
    text = str(text).lower()
    text = re.sub(r'http\S+', ' ', text)  # remove URLs
    text = re.sub(r'\S+@\S+', ' ', text)  # remove emails
    text = re.sub(r'[^a-z\s]', ' ', text)  # remove non-alphabetic
    text = re.sub(r'\s+', ' ', text)      # remove extra spaces
    return text.strip()

def evaluate():
    print("📥 Loading dataset for evaluation...")
    # Load same dataset as training
    dataset = load_dataset("zefang-liu/phishing-email-dataset")
    df = dataset['train'].to_pandas()

    print("🧹 Preprocessing...")
    df = df.rename(columns={"Email Text": "text", "Email Type": "label"})
    df = df.dropna(subset=['text', 'label'])
    
    # --- CUSTOM DATA INJECTION (MUST MATCH TRAINING) ---
    try:
        from custom_data import custom_emails
        print(f"💉 Injecting {len(custom_emails)} custom examples for split consistency...")
        custom_df = pd.DataFrame(custom_emails)
        custom_df = pd.concat([custom_df] * 100, ignore_index=True)
        df = pd.concat([df, custom_df], ignore_index=True)
    except:
        print("⚠️ Custom data not found, metrics might drift if training used it.")
    # -----------------------------

    # Preprocess text
    df['clean_text'] = df['text'].apply(clean_email_text)
    
    # Map labels
    df['label_num'] = df['label'].map({
        'Phishing Email': 1,
        'Safe Email': 0
    })
    df = df.dropna(subset=['label_num'])
    
    # 3. Predict Test Set ONLY (Replicating Split)
    from sklearn.model_selection import train_test_split
    _, X_test, _, y_test = train_test_split(
        df['clean_text'], df['label_num'], test_size=0.2, random_state=42, stratify=df['label_num']
    )
    
    print(f"📊 Evaluated on TEST SET ONLY: {len(X_test)} samples")

    # Load Model
    print("🧠 Loading saved model...")
    try:
        model = joblib.load("email_phishing_model.pkl")
        vectorizer = joblib.load("email_vectorizer.pkl")
    except Exception as e:
        print(f"❌ Error loading model: {e}")
        return

    # Transform
    X = vectorizer.transform(X_test)
    y_true = y_test
    
    # Predict
    print("🔮 Predicting...")
    y_pred = model.predict(X)
    
    # Metrics
    acc = accuracy_score(y_true, y_pred)
    prec = precision_score(y_true, y_pred)
    rec = recall_score(y_true, y_pred)
    f1 = f1_score(y_true, y_pred)
    tn, fp, fn, tp = confusion_matrix(y_true, y_pred).ravel()
    
    print("\n" + "="*40)
    print("       TEST SET METRICS (n=3700+)")
    print("="*40)
    print(f"✅ Accuracy:  {acc:.2%}")
    print(f"🎯 Precision: {prec:.2%}")
    print(f"🔎 Recall:    {rec:.2%}")
    print(f"⚖️  F1 Score:  {f1:.2%}")
    print(f"Confusion Matrix: TN={tn}, FP={fp}, FN={fn}, TP={tp}")
    print("="*40)
    
    print(confusion_matrix(y_true, y_pred))

if __name__ == "__main__":
    evaluate()
