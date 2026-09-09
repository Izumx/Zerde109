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


class ZerdeNLPClassifier:
    """Production-grade hybrid classifier for 109 appeals."""

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
        log.info("zerde_nlp_classifier_init_done")

    async def classify(self, text: str) -> ClassifyResult:
        """Classify a citizen appeal text with hybrid pipeline."""
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

        # Step 2: Run CPU NLP Pipeline (in worker thread to keep event loop free)
        if lang == "kk":
            analysis: AnalysisResult = await asyncio.to_thread(self.kazakh_nlp.analyze, text)
        else:
            analysis = await asyncio.to_thread(self.natasha.analyze, text)

        # Step 3: Extract Address, Region & Organizations from Entities
        region, address = self._extract_location(analysis.entities)
        detected_org = self._extract_org(analysis.entities)

        # Step 4: NLP Lemma-based Classification
        category_code, confidence = map_lemmas_to_category(analysis.lemmas, text)
        priority = detect_priority(text)

        source = "nlp"

        # Step 5: LLM Fallback if confidence < threshold
        if confidence < self.confidence_threshold:
            log.info(
                "low_confidence_trigger_llm",
                category=category_code,
                confidence=confidence,
                threshold=self.confidence_threshold,
            )
            # Check if Ollama is available before awaiting
            if await self.ollama.is_online():
                llm_res = await self.ollama.classify_appeal(text)
                if llm_res and "category_code" in llm_res:
                    llm_cat = llm_res["category_code"]
                    if llm_cat in UNIFIED_CATEGORIES:
                        category_code = llm_cat
                        confidence = float(llm_res.get("confidence", 0.88))
                        if "priority" in llm_res:
                            priority = llm_res["priority"]
                        if "assigned_organization" in llm_res and llm_res["assigned_organization"]:
                            detected_org = llm_res["assigned_organization"]
                        source = "llm"

        # Step 6: Determine default organization if not extracted
        cat_info = UNIFIED_CATEGORIES.get(category_code, UNIFIED_CATEGORIES["OTHER"])
        org_name = detected_org or (
            cat_info["default_org_kk"] if lang == "kk" else cat_info["default_org_ru"]
        )
        cat_name = cat_info["kk"] if lang == "kk" else cat_info["ru"]

        # Step 7: Multi-Signal Verification
        ver_res = self.verifier.verify_classification(text, category_code, priority)

        # Emergency override if verification caught priority mismatch
        is_verified = ver_res.passed
        if not ver_res.passed and any(s.name == "domain_109" and not s.passed for s in ver_res.signals):
            priority = "жоғары / высокий"
            # Re-evaluate verification: if domain was the only failed signal, it is now satisfied
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
