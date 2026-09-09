"""
Natasha-based NLP analyzer for Russian civic appeals.
Provides morphology, NER, syntax parsing, noun chunks, and triplet extraction.
Runs 100% on CPU.
"""
from __future__ import annotations

import re
from typing import Optional

import structlog
from natasha import (
    Segmenter,
    MorphVocab,
    NewsEmbedding,
    NewsMorphTagger,
    NewsSyntaxParser,
    NewsNERTagger,
    NamesExtractor,
    Doc,
)

from src.pipeline.models import AnalysisResult, Entity, Triplet

log = structlog.get_logger(__name__)

# Russian stop-words
_RU_STOP_WORDS = frozenset({
    "и", "в", "во", "не", "что", "он", "на", "я", "с", "со", "как", "а",
    "то", "все", "она", "так", "его", "но", "да", "ты", "к", "у", "же",
    "вы", "за", "бы", "по", "только", "её", "мне", "было", "вот", "от",
    "меня", "ещё", "нет", "о", "из", "ему", "теперь", "когда", "даже",
    "ну", "вдруг", "ли", "если", "уже", "или", "ни", "быть", "был",
    "него", "до", "вас", "нибудь", "опять", "уж", "вам", "ведь", "там",
    "потом", "себя", "ничего", "ей", "может", "они", "тут", "где", "есть",
    "надо", "ней", "для", "мы", "тебя", "их", "чем", "была", "сам", "чтоб",
    "без", "будто", "чего", "раз", "тоже", "себе", "под", "будет", "ж",
    "тогда", "кто", "этот", "того", "потому", "этого", "какой", "совсем",
    "ним", "здесь", "этом", "один", "почти", "мой", "тем", "чтобы", "нее",
    "сейчас", "были", "куда", "зачем", "всех", "никогда", "можно", "при",
    "наконец", "два", "об", "другой", "хоть", "после", "над", "больше",
    "тот", "через", "эти", "нас", "про", "всего", "них", "какая", "много",
    "разве", "три", "эту", "моя", "впрочем", "хорошо", "свою", "этой",
    "перед", "иногда", "лучше", "чуть", "том", "нельзя", "такой", "им",
    "более", "всегда", "конечно", "всю", "между", "это", "быть", "здравствуйте",
    "пожалуйста", "прошу", "уважаемый",
})

_STOP_POS = {"AUX", "CCONJ", "SCONJ", "PUNCT", "SPACE", "DET", "ADP", "PART", "PRON"}

_NER_LABEL_MAP = {
    "PER": "PERSON",
    "LOC": "LOCATION",
    "ORG": "ORGANIZATION",
}


class NatashaAnalyzer:
    """Russian NLP analyzer using Natasha (100% CPU)."""

    def __init__(self) -> None:
        log.info("natasha_init_start")
        self._segmenter = Segmenter()
        self._morph_vocab = MorphVocab()
        self._emb = NewsEmbedding()
        self._morph_tagger = NewsMorphTagger(self._emb)
        self._syntax_parser = NewsSyntaxParser(self._emb)
        self._ner_tagger = NewsNERTagger(self._emb)
        self._names_extractor = NamesExtractor(self._morph_vocab)
        log.info("natasha_init_done")

    def analyze(self, text: str) -> AnalysisResult:
        doc = Doc(text)

        # Pipeline steps
        doc.segment(self._segmenter)
        doc.tag_morph(self._morph_tagger)

        for token in doc.tokens:
            token.lemmatize(self._morph_vocab)

        doc.parse_syntax(self._syntax_parser)
        doc.tag_ner(self._ner_tagger)

        for span in doc.spans:
            span.normalize(self._morph_vocab)

        tokens = [t.text for t in doc.tokens if t.text.strip()]
        lemmas = [t.lemma for t in doc.tokens if t.text.strip() and t.lemma]

        entities: list[Entity] = []
        for span in doc.spans:
            label = _NER_LABEL_MAP.get(span.type, span.type)
            lemma = span.normal if span.normal else span.text.lower()
            entities.append(Entity(
                text=span.text,
                label=label,
                lemma=lemma,
                start=span.start,
                end=span.stop,
                score=1.0,
            ))

        # Additional regex for addresses (e.g., ул. Абая 15, мкр. Самал)
        address_entities = self._extract_address_regex(text)
        for ae in address_entities:
            if not any(e.start == ae.start for e in entities):
                entities.append(ae)

        noun_chunks = self._extract_noun_chunks(doc)
        triplets = self._extract_triplets(doc)
        keywords = self._extract_keywords(doc)

        return AnalysisResult(
            original=text,
            language="ru",
            tokens=tokens,
            lemmas=lemmas,
            entities=entities,
            noun_chunks=noun_chunks,
            triplets=triplets,
            keywords=keywords,
            raw_doc=doc,
        )

    def _extract_address_regex(self, text: str) -> list[Entity]:
        patterns = [
            r"(?:ул(?:ица|\.)?|пр(?:оспект|\.)?|пер(?:еулок|\.)?|мкр(?:-н|\.|\sрайон)?)\s+[А-Яа-яA-Za-z0-9\-]+(?:\s+\d+[а-яА-Я]?)?",
            r"[А-Яа-яA-Za-z\-]+(?:\s+(?:көшесі|даңғылы|ауданы|ықшам ауданы))(?:\s+\d+)?",
        ]
        results: list[Entity] = []
        for pat in patterns:
            for m in re.finditer(pat, text, re.IGNORECASE):
                results.append(Entity(
                    text=m.group(0).strip(),
                    label="LOCATION",
                    lemma=m.group(0).strip().lower(),
                    start=m.start(),
                    end=m.end(),
                    score=0.9,
                ))
        return results

    def _extract_noun_chunks(self, doc: Doc) -> list[str]:
        chunks: set[str] = set()
        for sent in doc.sents:
            for token in sent.tokens:
                if token.pos not in ("NOUN", "PROPN"):
                    continue

                phrase_tokens = []
                for dep_token in sent.tokens:
                    if dep_token.head_id == token.id and dep_token.rel in (
                        "amod", "det", "nmod", "nummod", "case", "flat:name",
                        "flat", "appos",
                    ):
                        phrase_tokens.append(dep_token)

                phrase_tokens.append(token)
                phrase_tokens.sort(key=lambda t: t.start)
                chunk_text = " ".join(t.text for t in phrase_tokens).lower()

                if len(chunk_text) > 2:
                    chunks.add(chunk_text)

        return list(chunks)

    def _extract_triplets(self, doc: Doc) -> list[Triplet]:
        triplets: list[Triplet] = []
        for sent in doc.sents:
            for token in sent.tokens:
                if token.pos not in ("VERB", "AUX"):
                    continue

                subj = self._find_dep(sent, token.id, {"nsubj", "nsubj:pass"})
                obj = self._find_dep(sent, token.id, {"obj", "obl", "iobj", "xcomp", "nmod"})

                if subj and obj:
                    subj_text = self._subtree_text(sent, subj)
                    obj_text = self._subtree_text(sent, obj)
                    predicate = token.lemma if token.lemma else token.text.lower()

                    triplets.append(Triplet(
                        subject=subj_text,
                        predicate=predicate,
                        obj=obj_text,
                    ))
        return triplets

    @staticmethod
    def _find_dep(sent, head_id: str, dep_rels: set[str]) -> Optional[object]:
        for token in sent.tokens:
            if token.head_id == head_id and token.rel in dep_rels:
                return token
        return None

    @staticmethod
    def _subtree_text(sent, root_token) -> str:
        subtree_ids: set[str] = {root_token.id}
        changed = True
        while changed:
            changed = False
            for token in sent.tokens:
                if token.head_id in subtree_ids and token.id not in subtree_ids:
                    subtree_ids.add(token.id)
                    changed = True

        subtree_tokens = sorted(
            [t for t in sent.tokens if t.id in subtree_ids],
            key=lambda t: t.start,
        )
        return " ".join(t.text for t in subtree_tokens if t.pos != "PUNCT")

    def _extract_keywords(self, doc: Doc, top_n: int = 10) -> list[str]:
        seen: set[str] = set()
        keywords: list[str] = []

        for token in doc.tokens:
            if token.pos in _STOP_POS:
                continue
            lemma = (token.lemma or token.text).lower().strip()
            if len(lemma) < 2 or lemma in seen or lemma in _RU_STOP_WORDS:
                continue
            seen.add(lemma)
            keywords.append(lemma)
            if len(keywords) >= top_n:
                break

        return keywords
