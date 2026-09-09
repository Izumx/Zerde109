"""
Fast language detector for Kazakh (kk) vs Russian (ru) civic appeals.
Runs in sub-millisecond on CPU.
"""
from __future__ import annotations

import re

# Unique Kazakh Cyrillic letters
_KK_UNIQUE_CHARS = set("әғқңөұүһіӘҒҚҢӨҰҮҺІ")

# Common Kazakh words & suffixes
_KK_COMMON_WORDS = frozenset({
    "жоқ", "бар", "керек", "болып", "үшін", "жатыр", "болды", "қаласы", "көшесі",
    "ауданы", "үйі", "балалар", "жұмыс", "су", "жарық", "жылу", "жол", "ақпарат",
    "өтініш", "мәселе", "жөндеу", "қашан", "неге", "туралы", "бойынша", "акимат",
    "ауласында", "тұрғындары", "осы", "келді", "басқармасы", "мекемесі",
    # Transliterated / non-diacritic equivalents commonly typed by citizens
    "жок", "жарык", "коше", "кошеде", "кошеси", "уй", "уйи", "кашан", "жондеу",
    "болады", "аула", "кун", "шагым",
})

# Common Russian words
_RU_COMMON_WORDS = frozenset({
    "нет", "есть", "нужно", "было", "для", "город", "улица", "район", "дом",
    "дети", "работа", "вода", "свет", "тепло", "дорога", "просьба", "проблема",
    "ремонт", "когда", "почему", "около", "акимат", "дворе", "жители", "это",
    "приехали", "управление", "жалоба", "пожалуйста", "здравствуйте",
})


def detect_language(text: str) -> str:
    """
    Detects if text is Kazakh ('kk') or Russian ('ru').
    Defaults to 'ru' if ambiguous, but gives high weight to Kazakh markers.
    """
    if not text or not text.strip():
        return "ru"

    # Check 1: Kazakh specific characters
    for ch in text:
        if ch in _KK_UNIQUE_CHARS:
            return "kk"

    # Check 2: Word frequency check
    words = [w.lower() for w in re.findall(r"\b\w+\b", text)]
    kk_count = sum(1 for w in words if w in _KK_COMMON_WORDS)
    ru_count = sum(1 for w in words if w in _RU_COMMON_WORDS)

    if kk_count > ru_count:
        return "kk"
    if ru_count > kk_count:
        return "ru"

    # Check 3: Suffix heuristics (Kazakh typical endings: -да/-де, -та/-те, -ы/-і, -ның/-нің, -дар/-дер)
    kk_suffix_count = len(re.findall(r"\b\w+(?:сында|сінде|тары|тері|лары|лері|ныкі|нікі|дық|дік)\b", text.lower()))
    if kk_suffix_count >= 1:
        return "kk"

    return "ru"
