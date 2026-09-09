"""Fine-tunes a multilingual embedding model for 109 civil appeal retrieval and deduplication.
Trained on Kazakh and Russian cross-lingual pairs (e.g. 'су жоқ' <-> 'нет воды')
using MultipleNegativesRankingLoss.
"""

import json
import os
import random
import sys
from pathlib import Path

# Enforce pure PyTorch mode and avoid slow TensorFlow/tf_keras loading
os.environ["USE_TF"] = "0"
os.environ["USE_TORCH"] = "1"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
os.environ["TOKENIZERS_PARALLELISM"] = "false"

if sys.stdout:
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

import torch
from sentence_transformers import (
    SentenceTransformer,
    InputExample,
    losses,
    evaluation
)
from torch.utils.data import DataLoader

TRAIN_JSONL = Path("data/train_instructions.jsonl")
TEST_JSONL = Path("data/test_instructions.jsonl")
OUTPUT_MODEL_DIR = Path("models/zerde-embedding-109")

BASE_MODEL = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"


def load_pairs_from_instructions(jsonl_path: Path):
    """Extracts query-target pairs and cross-lingual semantically equivalent appeals."""
    with open(jsonl_path, "r", encoding="utf-8") as f:
        records = [json.loads(line) for line in f]
        
    by_category = {}
    for r in records:
        cat = r.get("category_code", "OTHER")
        # Extract user appeal text
        user_msg = r["messages"][1]["content"].replace("Обращение / Өтініш: ", "")
        # Extract assistant JSON response
        asst_data = json.loads(r["messages"][2]["content"])
        
        entry = {
            "text": user_msg,
            "category": cat,
            "sub_category": asst_data.get("sub_category", ""),
            "responsible_org": asst_data.get("responsible_org", ""),
            "language": r.get("language", "ru")
        }
        by_category.setdefault(cat, []).append(entry)
        
    pairs = []
    # Build positive pairs (same category and similar issue)
    for cat, items in by_category.items():
        for i in range(len(items)):
            anchor = items[i]["text"]
            # Pick positive from same category (preferably other language or different formulation)
            pos_idx = (i + 1) % len(items)
            positive = items[pos_idx]["text"]
            pairs.append(InputExample(texts=[anchor, positive]))
            
    random.seed(42)
    random.shuffle(pairs)
    return pairs, records


def evaluate_sample_queries(model):
    """Tests sample Kazakh-Russian equivalence pairs to verify semantic matching."""
    test_cases = [
        ("су жоқ", "нет воды третий день"),
        ("жылу жоқ, батареялар мұздай", "в квартире ледяные батареи, нет отопления"),
        ("көшеде шамдар жанбайды, қараңғы", "не работает уличное освещение во дворе"),
        ("қоқыс жәшігі толып кетті", "переполнен мусорный контейнер"),
        ("жолда үлкен шұңқыр бар", "огромная яма на проезжей части"),
        ("қаңғыбас иттер қаптап кетті", "стая бродячих собак бегает возле школы"),
    ]
    
    print("\n--- Testing Cross-Lingual Semantic Similarity (Kazakh <-> Russian) ---")
    for kk_text, ru_text in test_cases:
        emb1 = model.encode(kk_text, convert_to_tensor=True)
        emb2 = model.encode(ru_text, convert_to_tensor=True)
        sim = torch.cosine_similarity(emb1.unsqueeze(0), emb2.unsqueeze(0)).item()
        print(f"  [{sim:.3f}] '{kk_text}' <---> '{ru_text}'")


def main():
    print(f"Loading base model: {BASE_MODEL}...")
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Compute device: {device} ({torch.cuda.get_device_name(0) if device == 'cuda' else 'CPU'})")
    
    model = SentenceTransformer(BASE_MODEL, device=device)
    
    print("\nBaseline zero-shot similarity before fine-tuning:")
    evaluate_sample_queries(model)
    
    print("\nLoading training pairs...")
    train_pairs, _ = load_pairs_from_instructions(TRAIN_JSONL)
    print(f"Total training pairs: {len(train_pairs):,}")
    
    # Train dataloader
    train_dataloader = DataLoader(train_pairs[:4000], shuffle=True, batch_size=32)
    
    # Loss: MultipleNegativesRankingLoss (Contrastive cross-entropy)
    train_loss = losses.MultipleNegativesRankingLoss(model)
    
    print("\nStarting contrastive fine-tuning (1 epoch)...")
    model.fit(
        train_objectives=[(train_dataloader, train_loss)],
        epochs=1,
        warmup_steps=100,
        show_progress_bar=True
    )
    
    OUTPUT_MODEL_DIR.mkdir(parents=True, exist_ok=True)
    model.save(str(OUTPUT_MODEL_DIR))
    print(f"\nFine-tuned model successfully saved to: {OUTPUT_MODEL_DIR}")
    
    print("\nSimilarity AFTER fine-tuning:")
    evaluate_sample_queries(model)
    print("\nEmbeddings fine-tuning completed successfully!")


if __name__ == "__main__":
    main()
