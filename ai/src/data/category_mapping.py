import re
from typing import Tuple


# Unified 12 Key Categories for 109
UNIFIED_CATEGORIES = {
    "WATER_SEWAGE": {
        "ru": "Водоснабжение и канализация",
        "kk": "Сумен жабдықтау және кәріз",
        "default_org_ru": "ГКП Су Арнасы",
        "default_org_kk": "Су Арнасы МКК",
    },
    "HEATING": {
        "ru": "Теплоснабжение и отопление",
        "kk": "Жылумен жабдықтау",
        "default_org_ru": "Теплотранзит / Теплокоммунэнерго",
        "default_org_kk": "Жылутранзит / Жылукоммунэнерго",
    },
    "ELECTRICITY": {
        "ru": "Электроснабжение",
        "kk": "Электрмен жабдықтау",
        "default_org_ru": "Электросетевая компания (Жарық)",
        "default_org_kk": "Электр желілері компаниясы (Жарық)",
    },
    "LIGHTING": {
        "ru": "Уличное и дворовое освещение",
        "kk": "Көше және аула жарығы",
        "default_org_ru": "Горсвет / Отдел ЖКХ",
        "default_org_kk": "Қалалық жарық / ТКШ бөлімі",
    },
    "ROADS": {
        "ru": "Дороги и дорожная инфраструктура",
        "kk": "Жолдар және жол инфрақұрылымы",
        "default_org_ru": "Отдел пассажирского транспорта и автодорог",
        "default_org_kk": "Жолаушылар көлігі және автожолдар бөлімі",
    },
    "WASTE": {
        "ru": "ТБО и санитарная очистка",
        "kk": "Қоқыс шығару және санитарлық тазалау",
        "default_org_ru": "Мусоровывозящая компания / Саночистка",
        "default_org_kk": "Қоқыс шығару компаниясы / Санитарлық тазалық",
    },
    "LANDSCAPING": {
        "ru": "Благоустройство и озеленение",
        "kk": "Абаттандыру және көгалдандыру",
        "default_org_ru": "Аппарат акима района / Отдел благоустройства",
        "default_org_kk": "Аудан әкімінің аппараты / Абаттандыру бөлімі",
    },
    "PUBLIC_TRANSPORT": {
        "ru": "Общественный транспорт",
        "kk": "Қоғамдық көлік",
        "default_org_ru": "Управление городской мобильности / Автопарк",
        "default_org_kk": "Қалалық мобильділік басқармасы / Автопарк",
    },
    "GAS": {
        "ru": "Газоснабжение",
        "kk": "Газбен жабдықтау",
        "default_org_ru": "КазТрансГаз Аймак",
        "default_org_kk": "ҚазТрансГаз Аймақ",
    },
    "VET_ANIMALS": {
        "ru": "Ветсервис и отлов безнадзорных животных",
        "kk": "Ветсервис және жануарларды аулау",
        "default_org_ru": "Городская ветеринарная служба",
        "default_org_kk": "Қалалық ветеринариялық қызмет",
    },
    "INFO_CONSULT": {
        "ru": "Справочная информация и консультация",
        "kk": "Анықтамалық ақпарат және кеңес беру",
        "default_org_ru": "Единый контакт-центр 109",
        "default_org_kk": "109 бірыңғай байланыс орталығы",
    },
    "OTHER": {
        "ru": "Прочие вопросы жизнеобеспечения",
        "kk": "Өзге де тыныс-тіршілік мәселелері",
        "default_org_ru": "Акимат / Профильное управление",
        "default_org_kk": "Әкімдік / Бейінді басқарма",
    },
}

# Rule-based mapper for terms to standard category
KEYWORD_MAPPING = [
    # Water & Sewage
    (["вод", "су", "канализац", "кәріз", "люк", "құдық", "колодец", "порыв воды", "акқан су", "септик", "дренаж", "су құбыры"], "WATER_SEWAGE"),
    # Heating
    (["тепл", "жылу", "отоплен", "батаре", "радиатор", "қазандық", "котельн", "горяч", "ыстық су"], "HEATING"),
    # Electricity
    (["электр", "жарық сөнді", "свет жоқ", "трансформатор", "подстанц", "провод", "электроэнерг", "ток жоқ", "ток жок", "жарык жок"], "ELECTRICITY"),
    # Lighting
    (["фонар", "көше жарығы", "шам", "освещен", "столб", "қоңыр шам", "лампочк"], "LIGHTING"),
    # Roads
    (["жол", "дорог", "шұңқыр", "яма", "асфальт", "тротуар", "зебра", "светофор", "белгі", "знак", "бордюр", "чугунный люк"], "ROADS"),
    # Waste
    (["қоқыс", "мусор", "тбо", "контейнер", "жәшік", "свалка", "полигон", "қалдық", "тазалау"], "WASTE"),
    # Landscaping
    (["ағаш", "дерев", "бұтақ", "ветк", "парк", "саябақ", "балалар алаңы", "детск", "скамейк", "орындық", "көгал", "газон"], "LANDSCAPING"),
    # Public transport
    (["автобус", "маршрут", "аялдама", "остановк", "такси", "жолкіре", "оңай", "билет"], "PUBLIC_TRANSPORT"),
    # Gas
    (["газ", "иіс", "запах газа", "утечка газа", "газопровод", "құбыр газ"], "GAS"),
    # Vet (strict word boundaries for short words like 'ит', 'кот')
    (["мысық", "собак", "кошк", "ветеринар", "отлов", "қаңғыбас", "бродяч", "қабу", "пёс"], "VET_ANIMALS"),
    # Info
    (["анықтама", "справк", "информ", "консультац", "байланыс", "телефон", "кеңес", "сауалнама", "дауыс беру"], "INFO_CONSULT"),
]

# Emergency / Priority keywords
HIGH_PRIORITY_KEYWORDS = [
    "авария", "прорыв", "жарылды", "жарылу", "жарылып", "утечка", "порыв", "искрит", "искрение",
    "открытый люк", "ашық құдық", "угарный", "иіс", "құлады", "упало дерево",
    "затопило", "су басты", "су ағып", "нет тепла", "жылу жоқ", "замерзаем", "тоңып", "шұғыл", "срочно",
    "газ", "газ иісі", "газ шығып"
]


def map_lemmas_to_category(lemmas: list[str], text: str = "") -> tuple[str, float]:
    """
    Classifies using extracted lemmas + text matching.
    Returns (category_code, confidence).
    """
    if not lemmas and not text:
        return ("OTHER", 0.3)

    lower_lemmas = set(l.lower() for l in lemmas)
    t = text.lower() if text else ""

    # Check for short animal words with word boundaries
    if re.search(r"\b(?:ит|иттер|собака|собаки|псы|кот|коты)\b", t):
        return ("VET_ANIMALS", 0.92)

    best_cat = "OTHER"
    best_score = 0.0

    for keywords, cat_code in KEYWORD_MAPPING:
        matches = 0
        for kw in keywords:
            # Check in lemmas or in full text
            if kw in lower_lemmas or any(kw in l for l in lower_lemmas) or (len(kw) >= 4 and kw in t):
                matches += 1
        if matches > 0:
            score = min(0.65 + matches * 0.15, 0.95)
            if score > best_score:
                best_score = score
                best_cat = cat_code

    if best_score == 0.0:
        return ("OTHER", 0.4)

    return (best_cat, best_score)


def map_text_to_category(text: str) -> str:
    """Classifies raw text or label into one of the 12 unified category codes."""
    cat, _ = map_lemmas_to_category([], text)
    return cat


def detect_priority(text: str, is_emergency_flag: bool = False) -> str:
    """Detect priority level: high (жоғары), medium (орташа), low (төмен)."""
    if is_emergency_flag:
        return "жоғары / высокий"
    
    if not text or not isinstance(text, str):
        return "орташа / средний"
    
    t = text.lower()
    for kw in HIGH_PRIORITY_KEYWORDS:
        if kw in t:
            return "жоғары / высокий"
    
    # Check for consultation
    if any(w in t for w in ["справка", "консультация", "анықтама", "телефон", "информирование"]):
        return "төмен / низкий"
        
    return "орташа / средний"


def detect_language(text: str) -> str:
    """Simple detector for Kazakh (kk) vs Russian (ru) vs mixed."""
    if not text:
        return "ru"
    t = text.lower()
    kk_letters = set("әіңғүұқөһ")
    if any(c in kk_letters for c in t):
        return "kk"
    # Check typical kazakh words without specific letters
    kk_words = {"жок", "бар", "болады", "болды", "уй", "коше", "кун", "су", "аула", "кеше"}
    words = set(t.split())
    if len(words.intersection(kk_words)) > 0:
        return "kk"
    return "ru"
