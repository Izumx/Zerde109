"""Evaluation module for Zerde 109 classifier on held-out test split (test_instructions.jsonl).
Calculates Accuracy, Precision, Recall, Macro F1, Weighted F1, and per-category metrics.
"""

import json
import sys
from pathlib import Path
from typing import Dict, Any, List
import pandas as pd
from sklearn.metrics import classification_report, accuracy_score, f1_score, precision_score, recall_score

# Add src to path
current_dir = Path(__file__).resolve().parent
src_dir = current_dir.parent
sys.path.insert(0, str(src_dir))

from data.category_mapping import UNIFIED_CATEGORIES, map_text_to_category, detect_language

TEST_JSONL = Path("data/test_instructions.jsonl")
REPORT_OUTPUT = Path("data/evaluation_report.json")


def evaluate():
    if not TEST_JSONL.exists():
        print(f"Error: {TEST_JSONL} not found. Run ETL pipeline first.")
        return
        
    print(f"Loading test set from {TEST_JSONL}...")
    with open(TEST_JSONL, "r", encoding="utf-8") as f:
        samples = [json.loads(line) for line in f]
        
    print(f"Total test samples: {len(samples):,}")
    
    y_true = []
    y_pred = []
    by_lang = {"kk": {"true": [], "pred": []}, "ru": {"true": [], "pred": []}}
    
    for item in samples:
        true_cat = item["category_code"]
        lang = item.get("language", "ru")
        user_msg = item["messages"][1]["content"].replace("Обращение / Өтініш: ", "")
        
        # Predict category
        pred_cat = map_text_to_category(user_msg)
        
        y_true.append(true_cat)
        y_pred.append(pred_cat)
        
        if lang in by_lang:
            by_lang[lang]["true"].append(true_cat)
            by_lang[lang]["pred"].append(pred_cat)

    # Compute overall metrics
    acc = accuracy_score(y_true, y_pred)
    f1_macro = f1_score(y_true, y_pred, average="macro", zero_division=0)
    f1_weighted = f1_score(y_true, y_pred, average="weighted", zero_division=0)
    prec_macro = precision_score(y_true, y_pred, average="macro", zero_division=0)
    rec_macro = recall_score(y_true, y_pred, average="macro", zero_division=0)
    
    # Detailed per-class report
    cls_report = classification_report(y_true, y_pred, output_dict=True, zero_division=0)
    
    # Per language breakdown
    lang_metrics = {}
    for l, d in by_lang.items():
        if d["true"]:
            l_acc = accuracy_score(d["true"], d["pred"])
            l_f1 = f1_score(d["true"], d["pred"], average="macro", zero_division=0)
            lang_metrics[l] = {
                "samples_count": len(d["true"]),
                "accuracy": round(float(l_acc), 4),
                "f1_macro": round(float(l_f1), 4)
            }
            
    results = {
        "evaluation_dataset": str(TEST_JSONL),
        "total_test_samples": len(samples),
        "metrics_summary": {
            "accuracy": round(float(acc), 4),
            "f1_macro": round(float(f1_macro), 4),
            "f1_weighted": round(float(f1_weighted), 4),
            "precision_macro": round(float(prec_macro), 4),
            "recall_macro": round(float(rec_macro), 4)
        },
        "language_breakdown": lang_metrics,
        "per_category_metrics": {}
    }
    
    for cat_code, cat_dict in UNIFIED_CATEGORIES.items():
        if cat_code in cls_report:
            m = cls_report[cat_code]
            results["per_category_metrics"][cat_code] = {
                "name_ru": cat_dict["ru"],
                "name_kk": cat_dict["kk"],
                "precision": round(float(m["precision"]), 4),
                "recall": round(float(m["recall"]), 4),
                "f1_score": round(float(m["f1-score"]), 4),
                "support": int(m["support"])
            }
            
    with open(REPORT_OUTPUT, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
        
    print("\n=======================================================")
    print("           ZERDE 109 CLASSIFIER EVALUATION REPORT      ")
    print("=======================================================")
    print(f"Total Test Samples: {len(samples):,}")
    print(f"Overall Accuracy:   {acc*100:.2f}%")
    print(f"Macro F1-Score:     {f1_macro*100:.2f}%")
    print(f"Weighted F1-Score:  {f1_weighted*100:.2f}%")
    print("-------------------------------------------------------")
    print("Language Performance:")
    for l, lm in lang_metrics.items():
        name = "Казахский (KK)" if l == "kk" else "Русский (RU)"
        print(f"  - {name}: Acc={lm['accuracy']*100:.2f}%, F1={lm['f1_macro']*100:.2f}% ({lm['samples_count']} samples)")
    print("-------------------------------------------------------")
    print("Per-Category F1 Scores:")
    for cat_code, cm in results["per_category_metrics"].items():
        print(f"  [{cm['f1_score']*100:5.1f}%] {cat_code:16} ({cm['name_ru']}) [support={cm['support']}]")
    print("=======================================================")
    print(f"Full evaluation report saved to: {REPORT_OUTPUT}\n")


if __name__ == "__main__":
    evaluate()
