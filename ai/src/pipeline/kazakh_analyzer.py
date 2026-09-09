"""
Kazakh NLP Analyzer for civic appeals (Zerde 109).
Uses TurkicNLP + domain-specific entity extraction & morphological analysis.
Runs 100% on CPU (0 MB VRAM).
"""
from __future__ import annotations

import re
from typing import Optional
import structlog

from src.pipeline.models import AnalysisResult, Entity, Triplet

log = structlog.get_logger(__name__)

# Kazakh Stop Words
_KK_STOP_WORDS = frozenset({
    "және", "мен", "бен", "пен", "да", "де", "та", "те", "үшін", "туралы",
    "бойынша", "арқылы", "дейін", "кейін", "соң", "бірге", "қатар", "себепті",
    "сондықтан", "бірақ", "алайда", "дегенмен", "әлде", "немесе", "яғни",
    "өйткені", "себебі", "егер", "онда", "тіпті", "тек", "ғана", "қана",
    "осы", "бұл", "сол", "анау", "мынау", "барлық", "барша", "бүкіл", "әр",
    "кейбір", "ешқандай", "ешкім", "ештеңе", "өзі", "өздері", "біз", "сіз",
    "олар", "менің", "сенің", "оның", "біздің", "сіздің", "олардың", "жоқ",
    "бар", "болып", "болады", "болды", "етті", "еді", "жатыр", "тұр", "жүр",
    "отыр", "керек", "қажет", "тиіс", "сұраймын", "өтінемін", "құрметті",
})

# Kazakh agglutinative inflectional suffixes for stemming
_KK_SUFFIX_PATTERNS = [
    # Case endings (септік)
    r"(?:ның|нің|дың|дің|тың|тің)$",        # ілік
    r"(?:ға|ге|қа|ке|на|не)$",               # барыс
    r"(?:ны|ні|ды|ді|ты|ті|н)$",             # табыс
    r"(?:да|де|та|те|нда|нде)$",             # жатыс
    r"(?:дан|ден|тан|тен|нан|нен)$",         # шығыс
    r"(?:мен|бен|пен|менен|бенен|пенен)$",   # көмектес
    # Possessive endings (тәуелдік)
    r"(?:ым|ім|м|ымыз|іміз|мыз|міз)$",
    r"(?:ың|ің|ң|ыңыз|іңіз|ңыз|ңіз)$",
    r"(?:сы|сі|ы|і)$",
    # Plural endings (көптік)
    r"(?:лар|лер|дар|дер|тар|тер)$",
]


class KazakhNLPAnalyzer:
    """
    CPU-efficient Kazakh NLP Analyzer.
    Integrates TurkicNLP with domain rule extraction for Zerde 109.
    """

    def __init__(self) -> None:
        log.info("kazakh_analyzer_init_start")
        self._turkic_pipeline = None
        try:
            import turkicnlp
            # Try initializing TurkicNLP tokenizer/NER if available
            self._turkicnlp = turkicnlp
            log.info("turkicnlp_loaded")
        except Exception as e:
            log.warning("turkicnlp_init_warning", error=str(e))
            self._turkicnlp = None
        log.info("kazakh_analyzer_init_done")

    def stem_word(self, word: str) -> str:
        """Heuristic morphological stemmer for Kazakh words."""
        w = word.lower().strip()
        if len(w) <= 3:
            return w

        # Strip suffixes iteratively (up to 3 levels: case -> possessive -> plural)
        for _ in range(3):
            matched = False
            for pat in _KK_SUFFIX_PATTERNS:
                new_w, count = re.subn(pat, "", w)
                if count > 0 and len(new_w) >= 3:
                    w = new_w
                    matched = True
                    break
            if not matched:
                break
        return w

    def analyze(self, text: str) -> AnalysisResult:
        """Full analysis of Kazakh civic appeal."""
        tokens = [t for t in re.findall(r"\b[A-Za-zА-Яа-яӘғқңөұүһіІӘҒҚҢӨҰҮҺ0-9\-]+\b", text) if t]
        lemmas = [self.stem_word(t) for t in tokens if len(t) > 1]

        # Extract entities via domain patterns & gazetteers
        entities = self._extract_entities(text)
        keywords = self._extract_keywords(lemmas)

        # Build basic subject-predicate triplets from verbs
        triplets = self._extract_triplets(text, tokens)

        return AnalysisResult(
            original=text,
            language="kk",
            tokens=tokens,
            lemmas=lemmas,
            entities=entities,
            noun_chunks=[],
            triplets=triplets,
            keywords=keywords,
            raw_doc=None,
        )

    def _extract_entities(self, text: str) -> list[Entity]:
        entities: list[Entity] = []

        # 1. Location patterns (көшесі, даңғылы, ауданы, ықшам ауданы, қаласы)
        loc_patterns = [
            r"\b([А-ЯӘҒҚҢӨҰҮҺ][а-яәғқңөұүһі\-]+(?:\s+[А-ЯӘҒҚҢӨҰҮҺ][а-яәғқңөұүһі\-]+)?\s+(?:көшесі|даңғылы|ауданы|ықшам\s*ауданы|қаласы|кенті|ауылы))(?:\s+(?:үй|үйі)?\s*\d+[а-яА-Я]?)?",
            r"\b((?:Астана|Алматы|Шымкент|Қарағанды|Ақтөбе|Тараз|Павлодар|Өскемен|Семей|Атырау|Қостанай|Қызылорда|Орал|Петропавл|Түркістан|Көкшетау|Теміртау|Екібастұз)\s*(?:қаласы)?)",
            r"\b((?:Алматы|Байқоңыр|Сарыарқа|Есіл|Нұра)\s*ауданы)",
        ]
        for pat in loc_patterns:
            for m in re.finditer(pat, text, re.IGNORECASE):
                match_text = m.group(0).strip()
                entities.append(Entity(
                    text=match_text,
                    label="LOCATION",
                    lemma=self.stem_word(match_text),
                    start=m.start(),
                    end=m.end(),
                    score=0.95,
                ))

        # 2. Organization patterns (әкімдік, КСК, ОСИ, басқармасы, коммуналдық кәсіпорындар)
        org_patterns = [
            r"([А-ЯӘҒҚҢӨҰҮҺ][а-яәғқңөұүһі\-]+\s+(?:әкімдігі|әкімшілігі|басқармасы|департаменті|бөлімі))",
            r"(«?[А-ЯӘҒҚҢӨҰҮҺ][а-яәғқңөұүһіA-Za-z0-9\-]+»?\s*(?:ЖШС|АҚ|МКК|ШЖҚ|КСК|ОСИ|ПИК))",
            r"\b(Астана-РЭК|Астана\s*Тазалық|Астана\s*Су\s*Арнасы|Қарағанды\s*Су|Алматы\s*Су|ҚазТрансГаз|Көкше\s*Су\s*Арнасы)\b",
            r"\b(КСК|ОСИ|ПИК|МИБ)\b",
        ]
        for pat in org_patterns:
            for m in re.finditer(pat, text, re.IGNORECASE):
                match_text = m.group(0).strip()
                entities.append(Entity(
                    text=match_text,
                    label="ORGANIZATION",
                    lemma=self.stem_word(match_text),
                    start=m.start(),
                    end=m.end(),
                    score=0.92,
                ))

        # 3. Infrastructure & Emergency facilities
        fac_patterns = [
            r"([А-ЯӘҒҚҢӨҰҮҺа-яәғқңөұүһі\-]+\s+(?:мектебі|балабақшасы|ауруханасы|емханасы|саябағы|аялдамасы))",
            r"(№\s*\d+\s*(?:мектеп|емхана|балабақша|маршрут|автобус))",
        ]
        for pat in fac_patterns:
            for m in re.finditer(pat, text, re.IGNORECASE):
                match_text = m.group(0).strip()
                entities.append(Entity(
                    text=match_text,
                    label="FACILITY",
                    lemma=self.stem_word(match_text),
                    start=m.start(),
                    end=m.end(),
                    score=0.90,
                ))

        # Deduplicate overlapping entities
        unique_entities: list[Entity] = []
        for ent in sorted(entities, key=lambda e: (e.start, -(e.end - e.start))):
            if not any(e.start <= ent.start and e.end >= ent.end for e in unique_entities):
                unique_entities.append(ent)

        return unique_entities

    def _extract_keywords(self, lemmas: list[str], top_n: int = 10) -> list[str]:
        seen: set[str] = set()
        keywords: list[str] = []
        for lemma in lemmas:
            if len(lemma) < 3 or lemma in seen or lemma in _KK_STOP_WORDS:
                continue
            seen.add(lemma)
            keywords.append(lemma)
            if len(keywords) >= top_n:
                break
        return keywords

    def _extract_triplets(self, text: str, tokens: list[str]) -> list[Triplet]:
        # Fast triplet heuristics: noun subject + verb predicate
        triplets: list[Triplet] = []
        verbs = [t for t in tokens if re.search(r"(?:ды|ді|ты|ті|ған|ген|қан|кен|ады|еді|жатыр|болды)$", t.lower())]
        if verbs and len(tokens) >= 3:
            triplets.append(Triplet(
                subject=tokens[0],
                predicate=verbs[-1].lower(),
                obj=" ".join(tokens[1:-1])[:40],
            ))
        return triplets
