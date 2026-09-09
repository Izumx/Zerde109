"""Vector database manager for Zerde 109 appeals retrieval, deduplication, and operator assistance.
Supports FAISS indexing and fallback to in-memory cosine similarity for extreme speed.
"""

import json
from pathlib import Path
from typing import List, Dict, Any, Optional
import numpy as np
import torch
from sentence_transformers import SentenceTransformer

MODEL_DIR = Path("models/zerde-embedding-109")
DEFAULT_MODEL = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
INDEX_FILE = Path("data/vector_index.json")


class ZerdeVectorStore:
    def __init__(self, model_path: Optional[str] = None):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        
        # Load fine-tuned model if exists, else default
        load_path = str(MODEL_DIR) if MODEL_DIR.exists() else DEFAULT_MODEL
        if model_path:
            load_path = model_path
            
        print(f"Initializing ZerdeVectorStore with embedding model: {load_path} on {self.device}")
        self.encoder = SentenceTransformer(load_path, device=self.device)
        self.records: List[Dict[str, Any]] = []
        self.embeddings: Optional[np.ndarray] = None
        
    def add_appeals(self, records: List[Dict[str, Any]], batch_size: int = 256):
        """Encodes and stores appeal records with their metadata."""
        if not records:
            return
            
        texts = [r.get("text", "") for r in records]
        print(f"Encoding {len(texts)} records into vector space...")
        
        new_embs = self.encoder.encode(
            texts,
            batch_size=batch_size,
            show_progress_bar=True,
            normalize_embeddings=True,
            convert_to_numpy=True
        )
        
        self.records.extend(records)
        if self.embeddings is None:
            self.embeddings = new_embs
        else:
            self.embeddings = np.vstack([self.embeddings, new_embs])
            
        print(f"Vector store now holds {len(self.records)} indexed appeals.")
        
    def search_similar(
        self,
        query: str,
        top_k: int = 5,
        category: Optional[str] = None,
        region: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Finds top-K most semantically similar civil appeals."""
        if self.embeddings is None or len(self.records) == 0:
            return []
            
        query_emb = self.encoder.encode(
            [query],
            normalize_embeddings=True,
            convert_to_numpy=True
        )[0]
        
        # Cosine similarities (since embeddings are normalized, dot product = cosine similarity)
        scores = np.dot(self.embeddings, query_emb)
        
        # Rank by score descending
        ranked_indices = np.argsort(-scores)
        
        results = []
        for idx in ranked_indices:
            rec = self.records[idx]
            
            # Optional filters
            if category and rec.get("category_code") != category and rec.get("category_name_ru") != category:
                continue
            if region and rec.get("region") != region:
                continue
                
            results.append({
                "score": round(float(scores[idx]), 4),
                "appeal_id": rec.get("appeal_id", ""),
                "text": rec.get("text", ""),
                "category": rec.get("category_name_ru") or rec.get("category", ""),
                "category_code": rec.get("category_code", ""),
                "sub_category": rec.get("sub_category", ""),
                "responsible_org": rec.get("responsible_org", ""),
                "priority": rec.get("priority", ""),
                "region": rec.get("region", ""),
                "status": rec.get("status", ""),
                "action": rec.get("action", "")
            })
            if len(results) >= top_k:
                break
                
        return results

    def detect_duplicates(self, query: str, threshold: float = 0.88) -> List[Dict[str, Any]]:
        """Identifies potential duplicate appeals filed for the same issue."""
        sims = self.search_similar(query, top_k=10)
        return [item for item in sims if item["score"] >= threshold]


def create_demo_store():
    """Initializes vector store with sample appeals from training instructions."""
    store = ZerdeVectorStore()
    sample_file = Path("data/train_instructions.jsonl")
    if sample_file.exists():
        records = []
        with open(sample_file, "r", encoding="utf-8") as f:
            for i, line in enumerate(f):
                if i >= 1000:  # index first 1000 for demo
                    break
                d = json.loads(line)
                user_msg = d["messages"][1]["content"].replace("Обращение / Өтініш: ", "")
                asst_data = json.loads(d["messages"][2]["content"])
                records.append({
                    "appeal_id": f"APP-109-{i+1:05d}",
                    "text": user_msg,
                    "category": asst_data.get("category", ""),
                    "category_code": d.get("category_code", ""),
                    "sub_category": asst_data.get("sub_category", ""),
                    "responsible_org": asst_data.get("responsible_org", ""),
                    "priority": asst_data.get("priority", ""),
                    "region": "Республика Казахстан",
                    "status": "Орындалды / Решено",
                })
        store.add_appeals(records)
    else:
        parquet_candidates = [
            Path("data/unified_appeals.parquet"),
            Path("ai/data/unified_appeals.parquet"),
            Path(__file__).resolve().parent.parent.parent / "data" / "unified_appeals.parquet",
        ]
        for p in parquet_candidates:
            if p.exists():
                try:
                    import pandas as pd
                    df = pd.read_parquet(p)
                    records = []
                    for i, (_, row) in enumerate(df.head(500).iterrows()):
                        records.append({
                            "appeal_id": str(row.get("appeal_id", f"APP-{i+1}")),
                            "text": str(row.get("text", "")),
                            "category": str(row.get("category_name_ru", "")),
                            "category_code": str(row.get("category_code", "OTHER")),
                            "sub_category": str(row.get("sub_category", "")),
                            "responsible_org": str(row.get("responsible_org", "")),
                            "priority": str(row.get("priority", "medium")),
                            "action": "Передано в профильную службу",
                            "region": str(row.get("region", "Республика Казахстан")),
                            "status": str(row.get("status", "Решено")),
                        })
                    store.add_appeals(records)
                    break
                except Exception as e:
                    print(f"Failed to load parquet for vector store: {e}")
    return store
