"""
Shared data structures for Zerde 109 NLP and RAG pipelines.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Optional


@dataclass
class Entity:
    text: str
    label: str  # PER/PERSON, LOC/GPE, ORG, FACILITY, etc.
    lemma: str = ""
    start: int = 0
    end: int = 0
    score: float = 1.0


@dataclass
class Triplet:
    subject: str
    predicate: str
    obj: str


@dataclass
class AnalysisResult:
    original: str
    language: str  # "kk" or "ru"
    tokens: list[str] = field(default_factory=list)
    lemmas: list[str] = field(default_factory=list)
    entities: list[Entity] = field(default_factory=list)
    noun_chunks: list[str] = field(default_factory=list)
    triplets: list[Triplet] = field(default_factory=list)
    keywords: list[str] = field(default_factory=list)
    raw_doc: Any = None


@dataclass
class ClassifyResult:
    category_code: str
    category_name: str
    confidence: float
    priority: str
    assigned_organization: str
    language: str
    entities: list[Entity] = field(default_factory=list)
    region: Optional[str] = None
    address: Optional[str] = None
    keywords: list[str] = field(default_factory=list)
    source: str = "nlp"  # "nlp", "llm", "rule_fallback"
    verified: bool = True
