import pandas as pd
import re
import joblib
from datasets import load_dataset
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, classification_report
from sklearn.model_selection import train_test_split

def clean_email_text(text):
    text = str(text).lower()
    text = re.sub(r'http\S+', ' ', text)  # remove URLs
    text = re.sub(r'\S+@\S+', ' ', text)  # remove emails
    text = re.sub(r'[^a-z\s]', ' ', text)  # remove non-alphabetic
    text = re.sub(r'\s+', ' ', text)      # remove extra spaces
    return text.strip()

def check_fit():
    print("📥 Loading dataset for evaluation...")
    dataset = load_dataset("zefang-liu/phishing-email-dataset")
    df = dataset['train'].to_pandas()

    print("🧹 Preprocessing...")
    df = df.rename(columns={"Email Text": "text", "Email Type": "label"})
    df = df.dropna(subset=['text', 'label'])
    
    try:
        from custom_data import custom_emails
        print(f"💉 Injecting {len(custom_emails)} custom examples (oversampled 100x)...")
        custom_df = pd.DataFrame(custom_emails)
        custom_df = pd.concat([custom_df] * 100, ignore_index=True)
        df = pd.concat([df, custom_df], ignore_index=True)
    except:
        print("⚠️ Custom data not found.")

    df['clean_text'] = df['text'].apply(clean_email_text)
    df['label_num'] = df['label'].map({
        'Phishing Email': 1,
        'Safe Email': 0
    })
    df = df.dropna(subset=['label_num'])
    
    # Split data exactly as in train_model.py
    X_train_text, X_test_text, y_train, y_test = train_test_split(
        df['clean_text'], df['label_num'], test_size=0.2, random_state=42, stratify=df['label_num']
    )
    
    # Load Model and Vectorizer
    print("🧠 Loading saved model and vectorizer...")
    try:
        model = joblib.load("email_phishing_model.pkl")
        vectorizer = joblib.load("email_vectorizer.pkl")
    except Exception as e:
        print(f"❌ Error loading model: {e}")
        return

    # Transform
    X_train = vectorizer.transform(X_train_text)
    X_test = vectorizer.transform(X_test_text)
    
    # Predictions
    print("🔮 Predicting on Training set...")
    y_train_pred = model.predict(X_train)
    print("🔮 Predicting on Test set...")
    y_test_pred = model.predict(X_test)
    
    # Metrics
    train_acc = accuracy_score(y_train, y_train_pred)
    test_acc = accuracy_score(y_test, y_test_pred)
    
    train_f1 = f1_score(y_train, y_train_pred)
    test_f1 = f1_score(y_test, y_test_pred)

    print("\n" + "="*50)
    print("📊 MODEL FIT ANALYSIS")
    print("="*50)
    print(f"📈 TRAINING SET Accuracy: {train_acc:.2%}")
    print(f"📉 TEST SET Accuracy:     {test_acc:.2%}")
    print("-" * 50)
    print(f"📈 TRAINING SET F1 Score: {train_f1:.2%}")
    print(f"📉 TEST SET F1 Score:     {test_f1:.2%}")
    print("="*50)
    
    diff = train_acc - test_acc
    
    if train_acc < 0.80 and test_acc < 0.80:
        print("❌ CONCLUSION: The model is UNDERFITTING.")
        print("💡 Suggestion: Increase model complexity (e.g., more features, different algorithm).")
    elif diff > 0.05:
        print("❌ CONCLUSION: The model is OVERFITTING.")
        print("💡 Suggestion: Add regularization (lower C), reduce features, or add more data.")
    else:
        print("✅ CONCLUSION: The model is WELL-FITTED.")
        print("💡 The training and test accuracies are close, indicating good generalization.")
    print("="*50)

if __name__ == "__main__":
    check_fit()
