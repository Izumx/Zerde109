"""
Multi-signal verification engine for Zerde 109.
Performs 5 checks:
1. Shannon entropy (rolling z-score)
2. Semantic coherence (MiniLM cosine similarity)
3. Heuristic / uncertainty phrase detection
4. Bigram perplexity approximation
5. Domain validation (valid category in 109 taxonomy, priority safety rules)
Runs 100% on CPU.
"""
from __future__ import annotations

import math
import re
from collections import Counter, deque
from dataclasses import dataclass, field
from statistics import median, stdev
from typing import Optional

import numpy as np
import structlog

from src.config.settings import settings
from src.data.category_mapping import UNIFIED_CATEGORIES

log = structlog.get_logger(__name__)

_UNCERTAINTY_PHRASES = re.compile(
    r"\b(не уверен|не знаю|возможно|вероятно|может быть|"
    r"сенімді емеспін|білмеймін|мүмкін|болуы мүмкін|"
    r"i('m| am) not sure|i don'?t know|possibly|probably)\b",
    re.IGNORECASE,
)

_CRITICAL_EMERGENCY_WORDS = [
    "газ", "жарылу", "взрыв", "угарный", "пожар", "өрт", "током",
    "искрит", "обрыв провода", "открытый люк", "ашық құдық", "су басты"
]


@dataclass
class SignalScore:
    name: str
    value: float
    passed: bool
    note: str = ""


@dataclass
class VerificationResult:
    passed: bool
    signals: list[SignalScore] = field(default_factory=list)
    reason: str = ""

    def summary(self) -> str:
        lines = [f"Verdict: {'✅ PASS' if self.passed else '❌ FAIL'} — {self.reason}"]
        for s in self.signals:
            icon = "✓" if s.passed else "✗"
            lines.append(f"  {icon} {s.name}: {s.value:.3f}  {s.note}")
        return "\n".join(lines)


class ZerdeVerifier:
    """Verifier for LLM responses and classification outputs in Zerde 109."""

    def __init__(self) -> None:
        self._entropy_history: deque[float] = deque(maxlen=settings.verifier_entropy_window)
        self._model: Optional[object] = None

    def _get_model(self):
        if self._model is None:
            log.info("loading_verifier_minilm_cpu")
            from sentence_transformers import SentenceTransformer
            # Load on CPU to preserve 8GB GPU VRAM for Ollama
            self._model = SentenceTransformer("all-MiniLM-L6-v2", device="cpu")
        return self._model

    # ── 1. Shannon entropy ─────────────────────────────────────────────────────
    @staticmethod
    def _shannon_entropy(text: str) -> float:
        if not text:
            return 0.0
        chars = Counter(text.lower())
        total = len(text)
        return -sum((c / total) * math.log2(c / total) for c in chars.values())

    def _check_entropy(self, text: str) -> SignalScore:
        h = self._shannon_entropy(text)
        self._entropy_history.append(h)

        if len(self._entropy_history) < 5:
            return SignalScore("entropy", h, True, "calibrating history")

        med = median(self._entropy_history)
        try:
            sd = stdev(self._entropy_history)
        except Exception:
            sd = 0.5
        sd = max(sd, 0.05)
        z = abs(h - med) / (sd + 1e-9)
        passed = z < settings.entropy_z_threshold
        return SignalScore("entropy", h, passed, f"z={z:.2f} med={med:.2f}")

    # ── 2. MiniLM semantic coherence ──────────────────────────────────────────
    def _check_semantic_coherence(self, text: str) -> SignalScore:
        sentences = [s.strip() for s in re.split(r"[.!?]\s+", text) if len(s.strip()) > 15]
        if len(sentences) < 2:
            return SignalScore("semantic_coherence", 1.0, True, "single sentence")

        model = self._get_model()
        embeddings = model.encode(sentences, normalize_embeddings=True)
        sims = []
        for i in range(len(embeddings) - 1):
            sim = float(np.dot(embeddings[i], embeddings[i + 1]))
            sims.append(sim)
        mean_sim = float(np.mean(sims))
        passed = mean_sim >= settings.semantic_similarity_threshold
        return SignalScore(
            "semantic_coherence",
            mean_sim,
            passed,
            f"threshold={settings.semantic_similarity_threshold}",
        )

    # ── 3. Uncertainty heuristics ─────────────────────────────────────────────
    def _check_heuristics(self, text: str) -> SignalScore:
        if _UNCERTAINTY_PHRASES.search(text):
            return SignalScore("heuristics", 0.0, False, "uncertainty phrase detected")
        return SignalScore("heuristics", 1.0, True, "clean")

    # ── 4. Bigram Perplexity ──────────────────────────────────────────────────
    @staticmethod
    def _estimate_perplexity(text: str) -> float:
        words = re.findall(r"\w+", text.lower())
        if len(words) < 4:
            return 0.0
        bigrams = list(zip(words, words[1:]))
        unigram_counts = Counter(words)
        bigram_counts = Counter(bigrams)
        total_words = len(words)

        log_prob = 0.0
        for w1, w2 in bigrams:
            p_bigram = (bigram_counts[(w1, w2)] + 1) / (unigram_counts[w1] + total_words)
            log_prob += math.log(p_bigram + 1e-10)

        n = len(bigrams)
        return math.exp(-log_prob / n) if n > 0 else float("inf")

    def _check_perplexity(self, text: str) -> SignalScore:
        ppl = self._estimate_perplexity(text)
        passed = ppl < settings.perplexity_threshold
        return SignalScore("perplexity", ppl, passed, f"threshold={settings.perplexity_threshold}")

    # ── 5. Domain 109 Validation ──────────────────────────────────────────────
    def _check_domain(self, category_code: str, priority: str, original_text: str) -> SignalScore:
        # Check if category is valid
        if category_code not in UNIFIED_CATEGORIES:
            return SignalScore("domain_109", 0.0, False, f"Unknown category: {category_code}")

        # Safety rule: if text mentions critical emergencies, priority must be high
        orig_lower = original_text.lower()
        if any(w in orig_lower for w in _CRITICAL_EMERGENCY_WORDS):
            if "жоғары" not in priority.lower() and "высок" not in priority.lower():
                return SignalScore("domain_109", 0.5, False, "Emergency words detected but priority not high")

        return SignalScore("domain_109", 1.0, True, "taxonomy & safety rules met")

    # ── Main verification methods ─────────────────────────────────────────────
    def verify_classification(
        self, original_text: str, category_code: str, priority: str
    ) -> VerificationResult:
        """Verifies a classification decision before saving or routing."""
        signals = [
            self._check_entropy(original_text),
            self._check_heuristics(original_text),
            self._check_domain(category_code, priority, original_text),
        ]
        failed = [s for s in signals if not s.passed]
        passed = len(failed) == 0
        reason = "OK" if passed else f"Failed: {', '.join(s.name for s in failed)}"
        return VerificationResult(passed=passed, signals=signals, reason=reason)

    def verify_llm_response(self, response_text: str) -> VerificationResult:
        """Verifies LLM generated answer for executive situational queries."""
        if len(response_text.strip()) < 10:
            return VerificationResult(
                passed=False,
                reason="Response too short",
                signals=[SignalScore("length", len(response_text), False, "")],
            )

        signals = [
            self._check_entropy(response_text),
            self._check_semantic_coherence(response_text),
            self._check_heuristics(response_text),
            self._check_perplexity(response_text),
        ]
        failed = [s for s in signals if not s.passed]
        passed = len(failed) == 0
        reason = "OK" if passed else f"Failed: {', '.join(s.name for s in failed)}"
        return VerificationResult(passed=passed, signals=signals, reason=reason)
