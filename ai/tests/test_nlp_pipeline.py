import sys
import asyncio
from pathlib import Path
import pytest

# Ensure src is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from src.data.category_mapping import (
    UNIFIED_CATEGORIES,
    map_lemmas_to_category,
    map_text_to_category,
    detect_priority,
)
from src.pipeline.language_detector import detect_language
from src.pipeline.kazakh_analyzer import KazakhNLPAnalyzer
from src.pipeline.natasha_analyzer import NatashaAnalyzer
from src.pipeline.verifier import ZerdeVerifier
from src.pipeline.zerde_nlp_classifier import ZerdeNLPClassifier


# ==========================================
# 1. LANGUAGE DETECTION TESTS
# ==========================================

def test_language_detection_kazakh_specific_chars():
    assert detect_language("Біздің аулада су жоқ") == "kk"
    assert detect_language("Құбыр жарылды, көшеге су ағып жатыр") == "kk"
    assert detect_language("Қоқыс жәшіктері толып кетті") == "kk"


def test_language_detection_kazakh_common_words():
    # Kazakh text written without specific diacritics
    assert detect_language("су жок кошеде жарык жок") == "kk"
    assert detect_language("акимат уйи кашан жондеу болады") == "kk"


def test_language_detection_russian():
    assert detect_language("Во дворе нет холодной воды уже третий день") == "ru"
    assert detect_language("Холодные батареи в квартире, замерзаем") == "ru"
    assert detect_language("Здравствуйте, во дворе не горит фонарь") == "ru"


def test_language_detection_edge_cases():
    assert detect_language("") == "ru"
    assert detect_language("   ") == "ru"
    assert detect_language("12345 !!!") == "ru"


# ==========================================
# 2. CATEGORY MAPPING & PRIORITY TESTS
# ==========================================

def test_category_mapping_all_major_domains():
    cases = [
        ("құбыр жарылып су ағып жатыр канализация", "WATER_SEWAGE"),
        ("ледяные батареи нет отопления дома холод", "HEATING"),
        ("электр жарығы сөніп қалды трансформатор", "ELECTRICITY"),
        ("көшедегі түнгі шам жанбайды фонари", "LIGHTING"),
        ("асфальтта үлкен шұңқыр пайда болды яма на дороге", "ROADS"),
        ("контейнер толып кетті қоқыс шығарылмады мусор", "WASTE"),
        ("құлаған ағаш саябақта балалар алаңы благоустройство", "LANDSCAPING"),
        ("автобус келмейді аялдамада күтіп тұрмыз", "PUBLIC_TRANSPORT"),
        ("газ иісі шығып тұр подьезде утечка газа", "GAS"),
        ("қаңғыбас иттер мектеп қасында бродячие собаки", "VET_ANIMALS"),
        ("анықтама керек байланыс орталығы телефон консультация", "INFO_CONSULT"),
    ]
    for text, expected_code in cases:
        detected = map_text_to_category(text)
        assert detected == expected_code, f"Failed for text '{text}': got {detected}, expected {expected_code}"


def test_priority_detection():
    # Emergency / High priority
    assert "жоғары" in detect_priority("Құбыр жарылды, су басып жатыр авария!")
    assert "жоғары" in detect_priority("Газ иісі шығып жарылу қаупі бар срочно")
    assert "жоғары" in detect_priority("Балалар тоңып қалды, замерзаем без отопления")
    
    # Low priority (consultation)
    assert "төмен" in detect_priority("109 анықтама телефоны және сауалнама")
    
    # Medium priority (standard)
    assert "орташа" in detect_priority("Көшедегі бордюр сырланбаған")


# ==========================================
# 3. KAZAKH NLP ANALYZER TESTS
# ==========================================

def test_kazakh_analyzer_morphology():
    analyzer = KazakhNLPAnalyzer()
    # Case and plural endings stemming
    assert analyzer.stem_word("үйлерімізде") in ("үй", "үйлер", "үйлері")
    assert analyzer.stem_word("көшесінде") in ("көше", "көшесі")
    assert analyzer.stem_word("құбырлар") == "құбыр"


def test_kazakh_analyzer_entities():
    analyzer = KazakhNLPAnalyzer()
    text = "Астана қаласы Абай көшесі 45 үй бойында Астана Тазалық мекемесі мен № 25 мектеп қасында су жоқ"
    res = analyzer.analyze(text)
    
    assert res.language == "kk"
    assert len(res.tokens) > 5
    assert len(res.lemmas) > 5
    
    labels = {e.label for e in res.entities}
    assert "LOCATION" in labels
    assert any("Абай көшесі" in e.text for e in res.entities)
    assert any("Астана" in e.text for e in res.entities)
    assert any(e.label in ("ORGANIZATION", "FACILITY") for e in res.entities)


# ==========================================
# 4. NATASHA ANALYZER (RUSSIAN) TESTS
# ==========================================

def test_natasha_analyzer_pipeline():
    analyzer = NatashaAnalyzer()
    text = "В городе Караганда по улице Бухар Жырау 12 прорвало трубу около акимата"
    res = analyzer.analyze(text)
    
    assert res.language == "ru"
    assert len(res.tokens) > 5
    assert len(res.lemmas) > 5
    
    # Check NER
    ent_texts = [e.text for e in res.entities]
    assert any("Караганда" in t or "Бухар Жырау" in t for t in ent_texts)
    
    # Check noun chunks and keywords
    assert len(res.keywords) > 0
    assert any("труб" in kw or "прорва" in kw or "бухар" in kw for kw in res.keywords)


# ==========================================
# 5. VERIFIER TESTS
# ==========================================

def test_verifier_signals():
    verifier = ZerdeVerifier()
    
    # 1. Normal classification verification
    res = verifier.verify_classification(
        original_text="Біздің үйде су жоқ, құбыр жарылды",
        category_code="WATER_SEWAGE",
        priority="жоғары / высокий"
    )
    assert res.passed is True
    
    # 2. Domain check failure: Unknown category
    res_bad_cat = verifier.verify_classification(
        original_text="Тест",
        category_code="UNKNOWN_CATEGORY_XYZ",
        priority="орташа / средний"
    )
    assert res_bad_cat.passed is False
    assert any(s.name == "domain_109" and not s.passed for s in res_bad_cat.signals)
    
    # 3. Domain safety rule: Emergency text with low priority fails
    res_emergency_fail = verifier.verify_classification(
        original_text="Утечка газа, сильный запах, опасность взрыва!",
        category_code="GAS",
        priority="төмен / низкий"
    )
    assert res_emergency_fail.passed is False
    assert any(s.name == "domain_109" and not s.passed for s in res_emergency_fail.signals)
    
    # 4. Uncertainty phrase check
    uncert_signal = verifier._check_heuristics("Возможно это относится к отоплению, но я не уверен")
    assert uncert_signal.passed is False
    
    # 5. LLM Response verification
    llm_ver = verifier.verify_llm_response(
        "По вашему запросу: в городе Караганда зарегистрировано 154 обращения по ремонту дорог. "
        "Аварийные бригады работают в круглосуточном режиме для устранения повреждений."
    )
    assert llm_ver.passed is True


# ==========================================
# 6. HYBRID NLP CLASSIFIER TESTS
# ==========================================

def test_hybrid_classifier_kk():
    classifier = ZerdeNLPClassifier()
    text = "Абай көшесі 10 үй жанында су құбыры жарылып кетті, су тоқтаусыз ағып жатыр"
    res = asyncio.run(classifier.classify(text))
    
    assert res.category_code == "WATER_SEWAGE"
    assert res.language == "kk"
    assert res.confidence >= 0.70
    assert "жоғары" in res.priority
    assert res.verified is True
    assert len(res.entities) > 0


def test_hybrid_classifier_emergency_override():
    classifier = ZerdeNLPClassifier()
    # Mentions explosive gas emergency
    text = "Кіреберісте газ иісі шығып тұр, шұғыл авариялық қызмет жіберіңіздер, жарылыс қаупі бар!"
    res = asyncio.run(classifier.classify(text))
    
    assert res.category_code == "GAS"
    assert "жоғары" in res.priority
    assert res.verified is True


def test_hybrid_classifier_empty_input():
    classifier = ZerdeNLPClassifier()
    res = asyncio.run(classifier.classify("   "))
    assert res.category_code == "OTHER"
    assert res.confidence == 0.0
    assert res.verified is False
