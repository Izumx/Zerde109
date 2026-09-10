"""Trains an industrial-grade high-speed classifier for Zerde 109 appeals.
Uses zerde-embedding-109 representations to train a calibrated classifier for 12 categories.
Runs on CPU or GPU in ~1-2 minutes.
"""
import json
import os
import sys
from pathlib import Path
import numpy as np
import joblib
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import classification_report, f1_score, accuracy_score
from sentence_transformers import SentenceTransformer

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent.parent
EMBEDDING_MODEL_DIR = BASE_DIR / "models" / "zerde-embedding-109"
TRAIN_DATA_PATH = BASE_DIR / "data" / "train_instructions.jsonl"
TEST_DATA_PATH = BASE_DIR / "data" / "test_instructions.jsonl"
OUTPUT_DIR = BASE_DIR / "models" / "zerde-classifier-109"

def load_data(filepath: Path):
    texts, labels = [], []
    with open(filepath, "r", encoding="utf-8") as f:
        for line in f:
            d = json.loads(line)
            cat = d.get("category_code")
            if not cat:
                continue
            # Extract user message
            raw_user = d["messages"][1]["content"]
            clean_user = raw_user.replace("Обращение / Өтініш: ", "").strip()
            texts.append(clean_user)
            labels.append(cat)
    return texts, labels

def main():
    print("=" * 70)
    print("ZERDE 109: TRAINING INDUSTRIAL SEQUENCE CLASSIFIER")
    print(f"Backbone: {EMBEDDING_MODEL_DIR}")
    print("=" * 70)

    # 1. Load Data
    print(f"[1/4] Loading train and test sets...")
    train_texts, train_labels = load_data(TRAIN_DATA_PATH)
    test_texts, test_labels = load_data(TEST_DATA_PATH)
    print(f"Train samples: {len(train_texts):,}")
    print(f"Test samples:  {len(test_texts):,}")

    # 2. Encode with fine-tuned zerde-embedding-109
    print(f"\n[2/4] Encoding texts with domain embedding model...")
    device = "cuda" if os.environ.get("USE_CUDA", "1") == "1" else "cpu"
    try:
        import torch
        device = "cuda" if torch.cuda.is_available() else "cpu"
    except Exception:
        device = "cpu"
    print(f"Device: {device}")

    encoder = SentenceTransformer(str(EMBEDDING_MODEL_DIR), device=device)
    
    print("Encoding train set...")
    X_train = encoder.encode(train_texts, batch_size=128, show_progress_bar=True, normalize_embeddings=True)
    y_train = np.array(train_labels)

    print("Encoding test set...")
    X_test = encoder.encode(test_texts, batch_size=128, show_progress_bar=True, normalize_embeddings=True)
    y_test = np.array(test_labels)

    # 3. Train Calibrated Classifier
    print(f"\n[3/4] Training calibrated classifier...")
    clf = LogisticRegression(
        C=2.0,
        max_iter=1000,
        class_weight="balanced",
        solver="lbfgs",
        random_state=42
    )
    clf.fit(X_train, y_train)

    # 4. Evaluate on Test Set
    print(f"\n[4/4] Evaluating on held-out test split...")
    y_pred = clf.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    f1_macro = f1_score(y_test, y_pred, average="macro")
    f1_weighted = f1_score(y_test, y_pred, average="weighted")

    print("\n" + "=" * 70)
    print(f"HELD-OUT EVALUATION RESULTS:")
    print(f"Accuracy:        {acc * 100:.2f}%")
    print(f"Macro F1-Score:  {f1_macro * 100:.2f}%")
    print(f"Weighted F1:     {f1_weighted * 100:.2f}%")
    print("=" * 70)
    print("\nPer-Category Report:")
    print(classification_report(y_test, y_pred, digits=4))

    # Save artifacts
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    model_path = OUTPUT_DIR / "classifier.joblib"
    meta_path = OUTPUT_DIR / "metadata.json"

    joblib.dump(clf, model_path)
    metadata = {
        "classes": clf.classes_.tolist(),
        "accuracy": round(float(acc), 4),
        "f1_macro": round(float(f1_macro), 4),
        "f1_weighted": round(float(f1_weighted), 4),
        "embedding_backbone": str(EMBEDDING_MODEL_DIR.name),
        "embedding_dim": int(X_train.shape[1]),
        "train_samples": len(train_texts),
        "test_samples": len(test_texts)
    }
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)

    print(f"\n[+] Classifier successfully saved to: {model_path}")
    print(f"[+] Metadata saved to: {meta_path}")

if __name__ == "__main__":
    main()
