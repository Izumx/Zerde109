"""
Hybrid NLP classifier for Zerde 109 civil appeals.
Combines:
- Fast CPU NLP (TurkicNLP/Kazakh + Natasha/Russian)
- Lemma-based categorization
- Entity & address extraction
- Asynchronous LLM fallback (Ollama on GPU) when confidence < 0.85
- Multi-signal verification
"""
from __future__ import annotations

import asyncio
from typing import Optional
import structlog

from src.config.settings import settings
from src.data.category_mapping import (
    UNIFIED_CATEGORIES,
    map_lemmas_to_category,
    detect_priority,
)
from src.pipeline.models import AnalysisResult, ClassifyResult, Entity
from src.pipeline.language_detector import detect_language
from src.pipeline.natasha_analyzer import NatashaAnalyzer
from src.pipeline.kazakh_analyzer import KazakhNLPAnalyzer
from src.pipeline.ollama_client import ZerdeOllamaClient
from src.pipeline.verifier import ZerdeVerifier

log = structlog.get_logger(__name__)


from pathlib import Path
import joblib
import numpy as np

class ZerdeNLPClassifier:
    """Production-grade fine-tuned ML classifier for 109 appeals."""

    def __init__(
        self,
        ollama_client: Optional[ZerdeOllamaClient] = None,
        verifier: Optional[ZerdeVerifier] = None,
    ) -> None:
        log.info("zerde_nlp_classifier_init_start")
        self.natasha = NatashaAnalyzer()
        self.kazakh_nlp = KazakhNLPAnalyzer()
        self.ollama = ollama_client or ZerdeOllamaClient()
        self.verifier = verifier or ZerdeVerifier()
        self.confidence_threshold = settings.hybrid_confidence_threshold

        # Load Fine-Tuned Embedding Backbone + Classifier Head
        self._encoder = None
        self._classifier = None
        self._init_ml_models()
        log.info("zerde_nlp_classifier_init_done")

    def _init_ml_models(self):
        try:
            from sentence_transformers import SentenceTransformer
            import torch
            device = "cuda" if torch.cuda.is_available() else "cpu"
            emb_dir = Path("models/zerde-embedding-109")
            clf_path = Path("models/zerde-classifier-109/classifier.joblib")

            if emb_dir.exists():
                self._encoder = SentenceTransformer(str(emb_dir), device=device)
            if clf_path.exists():
                self._classifier = joblib.load(clf_path)
                log.info("fine_tuned_classifier_loaded", classes=len(self._classifier.classes_))
        except Exception as e:
            log.warning("ml_model_init_warning", error=str(e))

    async def classify(self, text: str) -> ClassifyResult:
        """Classify a citizen appeal text with fine-tuned ML pipeline."""
        if not text or not text.strip():
            return ClassifyResult(
                category_code="OTHER",
                category_name=UNIFIED_CATEGORIES["OTHER"]["ru"],
                confidence=0.0,
                priority="орташа / средний",
                assigned_organization=UNIFIED_CATEGORIES["OTHER"]["default_org_ru"],
                language="ru",
                source="rule_fallback",
                verified=False,
            )

        # Step 1: Detect Language
        lang = detect_language(text)

        # Step 2: Run CPU NLP Pipeline for NER & Location extraction
        if lang == "kk":
            analysis: AnalysisResult = await asyncio.to_thread(self.kazakh_nlp.analyze, text)
        else:
            analysis = await asyncio.to_thread(self.natasha.analyze, text)

        # Step 3: Extract Address, Region & Organizations from Entities
        region, address = self._extract_location(analysis.entities)
        detected_org = self._extract_org(analysis.entities)

        # Step 4: Fine-Tuned ML Classification
        category_code = "OTHER"
        confidence = 0.50
        source = "fine_tuned_model"

        if self._encoder is not None and self._classifier is not None:
            try:
                emb = await asyncio.to_thread(
                    self._encoder.encode,
                    [text],
                    normalize_embeddings=True
                )
                probs = self._classifier.predict_proba(emb)[0]
                best_idx = int(np.argmax(probs))
                category_code = str(self._classifier.classes_[best_idx])
                confidence = float(probs[best_idx])
            except Exception as e:
                log.warning("ml_inference_fallback", error=str(e))
                category_code, confidence = map_lemmas_to_category(analysis.lemmas, text)
                source = "nlp_lemma_fallback"
        else:
            category_code, confidence = map_lemmas_to_category(analysis.lemmas, text)
            source = "nlp_lemma_fallback"

        # Step 5: Priority Detection with Emergency Guard
        priority = detect_priority(text)

        # Step 6: Determine default organization if not extracted
        cat_info = UNIFIED_CATEGORIES.get(category_code, UNIFIED_CATEGORIES["OTHER"])
        org_name = detected_org or (
            cat_info["default_org_kk"] if lang == "kk" else cat_info["default_org_ru"]
        )
        cat_name = cat_info["kk"] if lang == "kk" else cat_info["ru"]

        # Step 7: Multi-Signal Verification
        ver_res = self.verifier.verify_classification(text, category_code, priority, confidence=confidence)

        is_verified = ver_res.passed
        if not ver_res.passed and any(s.name == "domain_109" and not s.passed for s in ver_res.signals):
            priority = "жоғары / высокий"
            other_failures = [s for s in ver_res.signals if s.name != "domain_109" and not s.passed]
            is_verified = len(other_failures) == 0

        return ClassifyResult(
            category_code=category_code,
            category_name=cat_name,
            confidence=round(confidence, 2),
            priority=priority,
            assigned_organization=org_name,
            language=lang,
            entities=analysis.entities,
            region=region,
            address=address,
            keywords=analysis.keywords,
            source=source,
            verified=is_verified,
        )

    def _extract_location(self, entities: list[Entity]) -> tuple[Optional[str], Optional[str]]:
        region = None
        address = None
        for ent in entities:
            if ent.label in ("LOCATION", "GPE"):
                lower = ent.text.lower()
                if any(city in lower for city in ["астана", "алматы", "шымкент", "қарағанды", "караганда", "тараз", "павлодар"]):
                    region = ent.text
                elif not address:
                    address = ent.text
        return region, address

    def _extract_org(self, entities: list[Entity]) -> Optional[str]:
        for ent in entities:
            if ent.label == "ORGANIZATION":
                return ent.text
        return None
