"""ETL pipeline for 109 civil appeals across Kazakhstan regions.
Processes raw CSVs and Excel files into a unified analytical store and instruction-tuning dataset.
"""

import json
import os
import random
import re
from datetime import datetime
from pathlib import Path
import pandas as pd

try:
    from src.data.category_mapping import (
        UNIFIED_CATEGORIES,
        map_text_to_category,
        detect_priority,
        detect_language
    )
except ImportError:
    from category_mapping import (
        UNIFIED_CATEGORIES,
        map_text_to_category,
        detect_priority,
        detect_language
    )

DATA_DIR = Path("drive-download-20260908T140040Z-1-001")
OUTPUT_DIR = Path("data")
OUTPUT_PARQUET = OUTPUT_DIR / "unified_appeals.parquet"
TRAIN_JSONL = OUTPUT_DIR / "train_instructions.jsonl"
TEST_JSONL = OUTPUT_DIR / "test_instructions.jsonl"


def clean_text(text: str) -> str:
    if not text or not isinstance(text, str):
        return ""
    # remove excessive whitespace
    return re.sub(r"\s+", " ", text).strip()


def process_akmola():
    """Process Akmola appeals (direction, request_subject, region_g_a)."""
    p = DATA_DIR / "Обращения граждан 109 - Акмолинская область.csv"
    if not p.exists():
        return []
    print(f"Processing Akmola: {p}")
    df = pd.read_csv(p, encoding="utf-8")
    records = []
    for _, row in df.iterrows():
        direction = str(row.get("direction", "") or "")
        subject = str(row.get("request_subject", "") or "")
        text = direction if len(direction) > 3 else subject
        if not text or text == "nan":
            continue
            
        cat_code = map_text_to_category(f"{direction} {subject}")
        cat_info = UNIFIED_CATEGORIES.get(cat_code, UNIFIED_CATEGORIES["OTHER"])
        lang = detect_language(text)
        priority = detect_priority(text)
        org = subject if len(subject) > 3 else cat_info[f"default_org_{lang}"]
        
        records.append({
            "appeal_id": str(row.get("request_number", "")),
            "region": str(row.get("region_g_a", "Ақмола облысы")),
            "created_at": str(row.get("creation_date", "")),
            "status": str(row.get("status", "Жабық")),
            "text": text,
            "category_code": cat_code,
            "category_name_ru": cat_info["ru"],
            "category_name_kk": cat_info["kk"],
            "sub_category": direction if direction != "nan" else "",
            "responsible_org": org,
            "priority": priority,
            "language": lang,
            "source_system": "AI-Komek 109"
        })
    return records


def process_turkestan():
    """Process Turkestan appeals (servicelevel1..3, organizationname, result)."""
    p = DATA_DIR / "Обращения жителей 109 - Туркестанская область.csv"
    if not p.exists():
        return []
    print(f"Processing Turkestan: {p}")
    # Read sample of Turkestan records
    df = pd.read_csv(p, encoding="utf-8", nrows=60000)
    records = []
    for _, row in df.iterrows():
        s1 = str(row.get("servicelevel1", "") or "")
        s2 = str(row.get("servicelevel2", "") or "")
        s3 = str(row.get("servicelevel3", "") or "")
        org = str(row.get("organizationname", "") or "")
        
        # Compose realistic appeal problem description
        parts = [p for p in [s2, s1, s3] if p and p != "nan"]
        if not parts:
            continue
        text = ", ".join(parts).capitalize()
        
        cat_code = map_text_to_category(f"{s1} {s2} {s3} {org}")
        cat_info = UNIFIED_CATEGORIES.get(cat_code, UNIFIED_CATEGORIES["OTHER"])
        lang = detect_language(f"{s1} {s2} {org}")
        priority = detect_priority(f"{s1} {s2}")
        
        records.append({
            "appeal_id": str(row.get("incidentcode", "") or row.get("incidentid", "")),
            "region": str(row.get("region", "Түркістан облысы")),
            "created_at": str(row.get("createddate", "")),
            "status": str(row.get("status", "жабық")),
            "text": text,
            "category_code": cat_code,
            "category_name_ru": cat_info["ru"],
            "category_name_kk": cat_info["kk"],
            "sub_category": s2 if s2 != "nan" else s1,
            "responsible_org": org if org != "nan" else cat_info[f"default_org_{lang}"],
            "priority": priority,
            "language": lang,
            "source_system": "RDJardem3.0"
        })
    return records


def process_kostanay():
    """Process Kostanay appeals (servicelevel1..3, organizationname, result)."""
    p = DATA_DIR / "Обращения жителей 109 - Костанайская область.csv"
    if not p.exists():
        return []
    print(f"Processing Kostanay: {p}")
    df = pd.read_csv(p, encoding="utf-8")
    records = []
    for _, row in df.iterrows():
        s1 = str(row.get("servicelevel1", "") or "")
        s2 = str(row.get("servicelevel2", "") or "")
        s3 = str(row.get("servicelevel3", "") or "")
        org = str(row.get("organizationname", "") or "")
        res = str(row.get("result", "") or "")
        
        parts = [p for p in [s2, s1, s3] if p and p != "nan"]
        if not parts:
            continue
        text = ", ".join(parts).capitalize()
        
        cat_code = map_text_to_category(f"{s1} {s2} {s3} {org}")
        cat_info = UNIFIED_CATEGORIES.get(cat_code, UNIFIED_CATEGORIES["OTHER"])
        lang = detect_language(f"{s1} {s2} {org}")
        priority = detect_priority(f"{s1} {s2}")
        
        records.append({
            "appeal_id": str(row.get("incidentcode", "") or row.get("incidentid", "")),
            "region": str(row.get("region", "Қостанай облысы")),
            "created_at": str(row.get("createddate", "")),
            "status": str(row.get("status", "жабық")),
            "text": text,
            "category_code": cat_code,
            "category_name_ru": cat_info["ru"],
            "category_name_kk": cat_info["kk"],
            "sub_category": s2 if s2 != "nan" else s1,
            "responsible_org": org if org != "nan" else cat_info[f"default_org_{lang}"],
            "priority": priority,
            "language": lang,
            "source_system": "RDJardem3.0"
        })
    return records


def process_karaganda():
    """Process Karaganda appeals (sub_category, appeal_address, executor_gov_org)."""
    p = DATA_DIR / "Обращения граждан 109 - Карагандинская область.csv"
    if not p.exists():
        return []
    print(f"Processing Karaganda: {p}")
    df = pd.read_csv(p, encoding="utf-8", nrows=60000)
    records = []
    for _, row in df.iterrows():
        sub_cat = str(row.get("sub_category", "") or "")
        cat = str(row.get("category", "") or "")
        addr = str(row.get("appeal_address", "") or "")
        org = str(row.get("executor_gov_org", "") or "")
        
        if not sub_cat or sub_cat == "nan":
            continue
            
        desc = sub_cat
        if addr and addr != "nan":
            desc = f"{sub_cat}, мекенжай: {addr}"
            
        cat_code = map_text_to_category(f"{sub_cat} {cat} {org}")
        cat_info = UNIFIED_CATEGORIES.get(cat_code, UNIFIED_CATEGORIES["OTHER"])
        lang = detect_language(f"{sub_cat} {cat}")
        priority = detect_priority(sub_cat)
        
        records.append({
            "appeal_id": f"KRG-{len(records)+1}",
            "region": str(row.get("region", "Қарағанды облысы")),
            "created_at": str(row.get("created_date", "")),
            "status": "жабық",
            "text": desc,
            "category_code": cat_code,
            "category_name_ru": cat_info["ru"],
            "category_name_kk": cat_info["kk"],
            "sub_category": sub_cat,
            "responsible_org": org if org != "nan" else cat_info[f"default_org_{lang}"],
            "priority": priority,
            "language": lang,
            "source_system": "Открытый город 109"
        })
    return records


def generate_natural_appeal_variations(record: dict) -> list:
    """Generates rich Kazakh and Russian citizen complaint text variations based on real data."""
    text = record["text"]
    cat_code = record["category_code"]
    org = record["responsible_org"]
    priority = record["priority"]
    sub_cat = record["sub_category"]
    
    variations = []
    
    # Templates for natural citizen messages
    TEMPLATES_KK = {
        "WATER_SEWAGE": [
            "Сәлеметсіз бе! Біздің көшеде су жоқ, құбыр жарылып жатыр. Мәселені шұғыл шешуді сұраймыз. Мәселе: {text}",
            "Кәріз құдығы бітеліп, лас су көшеге ағып жатыр. Иісінен дем алу мүмкін емес: {text}",
            "Үйде үшінші күн су тоқтап тұр, қысым мүлдем жоқ. {text}",
            "Ашық қалған су құдығы (люк) бар, балалар құлап кетуі мүмкін! {text}"
        ],
        "HEATING": [
            "Үйде батареялар мұздай, пәтерде күн суық, балалар тоңып қалды! {text}",
            "Жылу беру маусымы басталса да, біздің үйде әлі жылу қосылмады: {text}",
            "Жертөледен бу шығып, ыстық су құбыры жарылған сияқты: {text}"
        ],
        "ELECTRICITY": [
            "Тұтас ауданда жарық сөніп қалды, электр қуаты мүлдем жоқ! {text}",
            "Сымдар үзіліп, жерге түсіп ұшқындап жатыр, өте қауіпті! {text}",
            "Кернеу тұрақсыз, тұрмыстық техникалар күйіп кетейін деп тұр. {text}"
        ],
        "LIGHTING": [
            "Біздің аулада және көше бойында түнгі шамдар жұмыс істемейді, қараңғы: {text}",
            "Көше бағанасындағы шамдар күндіз-түні жанып тұр, ал келесі көшеде қараңғы: {text}",
            "Мектеп жанындағы жаяу жүргіншілер өткеліндегі шам сынған: {text}"
        ],
        "ROADS": [
            "Жолда үлкен шұңқыр пайда болды, көліктер дөңгелегін жарып жатыр: {text}",
            "Асфальт төселгеннен кейін ойылып кетті, жүру мүмкін емес: {text}",
            "Бағдаршам жұмыс істемей тұр, үлкен кептеліс және апат қаупі бар: {text}"
        ],
        "WASTE": [
            "Ауладағы қоқыс жәшіктері толып, үш күннен бері қоқыс шығарылмады: {text}",
            "Қоқыс контейнері қираған, айнала лас болып кетті: {text}",
            "Заңсыз төгілген қоқыс үйіндісі бар, тазалау қажет: {text}"
        ],
        "LANDSCAPING": [
            "Қураған үлкен ағаш бұтақтары жолға және көліктерге құлайын деп тұр: {text}",
            "Балалар ойын алаңындағы әткеншектер сынған, қауіп төндіреді: {text}",
            "Саябақтағы орындықтар мен қоршаулар қираған: {text}"
        ],
        "PUBLIC_TRANSPORT": [
            "Автобус таңертең 40 минуттан астам уақыт келмейді, адамдар жұмысқа кешігіп жатыр: {text}",
            "№12 бағыттағы автобус жүргізушісі аялдамаға тоқтамай өтіп кетті: {text}",
            "Автобуста төлем терминалы істемейді, жүргізуші қолма-қол ақша талап етеді: {text}"
        ],
        "GAS": [
            "Кіреберістен өткір газ иісі шығып тұр, өтінеміз шұғыл тексеріңіздер! {text}",
            "Газ құбырынан сыбдырлаған дыбыс естіледі, апаттық қызметті жіберіңіз: {text}"
        ],
        "VET_ANIMALS": [
            "Мектептің жанында қаңғыбас иттер үйірі жиналып, балаларға шабуыл жасауда: {text}",
            "Аулада бұралқы иттер қаптап кетті, отлов қызметін жіберуді сұраймыз: {text}"
        ],
        "INFO_CONSULT": [
            "Сәлеметсіз бе! 109 қызметіне қалай арыз қалдыруға болады және кезекші дәріхана мекенжайын бере аласыз ба? {text}",
            "ТКШ бойынша тарифтер мен субсидиялар туралы анықтама алғым келеді: {text}"
        ],
        "OTHER": [
            "Қала тыныс-тіршілігі бойынша өтініш білдіремін: {text}"
        ]
    }
    
    TEMPLATES_RU = {
        "WATER_SEWAGE": [
            "Здравствуйте! По нашему адресу отсутствует холодная вода, прорвало трубу. Срочно примите меры: {text}",
            "Канализационный люк забился, нечистоты текут по проезжей части, сильный запах: {text}",
            "Открыт колодец возле жилого дома, могут упасть дети: {text}"
        ],
        "HEATING": [
            "В квартире ледяные батареи, дома очень холодно, замерзаем! Просим направить специалистов: {text}",
            "Из подвала идет сильный пар, прорыв отопительной трубы: {text}"
        ],
        "ELECTRICITY": [
            "Во всем микрорайоне отключили электричество, свет отсутствует более 4 часов! {text}",
            "Искрят провода на столбе, угроза пожара! Срочно вызовите аварийную службу: {text}"
        ],
        "LIGHTING": [
            "Во дворе не работает уличное освещение, перегорели фонари, вечером темно: {text}",
            "Фонарные столбы не светят на пешеходном переходе, очень опасно: {text}"
        ],
        "ROADS": [
            "Огромная яма на проезжей части, автомобили пробивают колеса: {text}",
            "Светофор не работает на перекрестке, образовалась пробка и риск ДТП: {text}"
        ],
        "WASTE": [
            "Контейнеры для мусора переполнены, отходы не вывозят уже несколько дней: {text}",
            "Образовалась стихийная свалка бытовых отходов возле детской площадки: {text}"
        ],
        "LANDSCAPING": [
            "Сухое аварийное дерево опасно накренилось над тротуаром и проводами: {text}",
            "Сломаны качели и элементы на детской площадке, почините: {text}"
        ],
        "PUBLIC_TRANSPORT": [
            "Автобусы не соблюдают интервал движения, стоим на остановке уже 45 минут: {text}",
            "Водитель автобуса отказался производить безналичную оплату: {text}"
        ],
        "GAS": [
            "Чувствуется резкий запах газа в подъезде! Срочно пришлите газовую службу: {text}"
        ],
        "VET_ANIMALS": [
            "Стая агрессивных бродячих собак бегает возле школы, страшно за детей! Просим отлов: {text}"
        ],
        "INFO_CONSULT": [
            "Здравствуйте, подскажите телефон дежурной службы и справочную информацию по графику отключений: {text}"
        ],
        "OTHER": [
            "Обращаюсь по вопросу жизнеобеспечения города: {text}"
        ]
    }
    
    cat = cat_code if cat_code in TEMPLATES_KK else "OTHER"
    
    # Generate 1 KK example
    t_kk = random.choice(TEMPLATES_KK[cat]).format(text=text)
    variations.append((t_kk, "kk"))
    
    # Generate 1 RU example
    t_ru = random.choice(TEMPLATES_RU[cat]).format(text=text)
    variations.append((t_ru, "ru"))
    
    return variations


def build_instruction(appeal_text: str, record: dict, lang: str) -> dict:
    """Builds a high-quality instruction training sample formatted for KazLLM 8B."""
    cat_code = record["category_code"]
    cat_info = UNIFIED_CATEGORIES.get(cat_code, UNIFIED_CATEGORIES["OTHER"])
    cat_name = cat_info[lang]
    sub_cat = record["sub_category"] if record["sub_category"] else cat_name
    org = record["responsible_org"] if record["responsible_org"] else cat_info[f"default_org_{lang}"]
    priority = record["priority"]
    
    action_kk = "Авариялық/профильдік қызметті жіберу, тексеру жүргізу және өтініш берушіге орындалу барысы туралы хабарлау."
    action_ru = "Направить профильную аварийную бригаду, провести проверку и уведомить заявителя о статусе исполнения."
    
    if lang == "kk":
        system_prompt = (
            "Сен «Zerde 109» бірыңғай интеллектуалды жүйесінің ақылды диспетчерісің. "
            "Азаматтың өтінішін талдап, оның санатын, ішкі санатын, жауапты қызметті, "
            "шұғылдық деңгейін және қажетті әрекетті қатаң түрде JSON форматында қайтар."
        )
        target_payload = {
            "category": cat_name,
            "category_code": cat_code,
            "sub_category": sub_cat,
            "responsible_org": org,
            "priority": priority,
            "language": "kk",
            "action": action_kk
        }
    else:
        system_prompt = (
            "Ты интеллектуальный диспетчер единой платформы «Zerde 109». "
            "Проанализируй обращение гражданина и определи категорию, подкатегорию, "
            "ответственную организацию, приоритет срочности и рекомендуемое действие строго в формате JSON."
        )
        target_payload = {
            "category": cat_name,
            "category_code": cat_code,
            "sub_category": sub_cat,
            "responsible_org": org,
            "priority": priority,
            "language": "ru",
            "action": action_ru
        }
        
    return {
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Обращение / Өтініш: {appeal_text}"},
            {"role": "assistant", "content": json.dumps(target_payload, ensure_ascii=False, indent=2)}
        ],
        "category_code": cat_code,
        "language": lang
    }


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    print("=== STARTING ETL PIPELINE FOR ZERDE 109 ===")
    all_appeals = []
    
    all_appeals.extend(process_akmola())
    all_appeals.extend(process_turkestan())
    all_appeals.extend(process_kostanay())
    all_appeals.extend(process_karaganda())
    
    print(f"\nTotal collected unified appeals: {len(all_appeals):,}")
    
    df_unified = pd.DataFrame(all_appeals)
    df_unified.to_parquet(OUTPUT_PARQUET, index=False)
    print(f"Saved unified dataset to Parquet: {OUTPUT_PARQUET} (shape={df_unified.shape})")
    
    print("\nCategory breakdown:")
    print(df_unified["category_name_ru"].value_counts())
    
    # Generate instruction tuning dataset
    print("\nGenerating bilingual instruction-tuning dataset...")
    instructions = []
    
    # Sample balanced set across categories
    grouped = df_unified.groupby("category_code")
    for cat_code, group in grouped:
        # Sample up to 600 records per category to avoid imbalance
        sample_records = group.sample(n=min(len(group), 600), random_state=42).to_dict("records")
        for rec in sample_records:
            variations = generate_natural_appeal_variations(rec)
            for text, lang in variations:
                inst = build_instruction(text, rec, lang)
                instructions.append(inst)
                
    random.seed(42)
    random.shuffle(instructions)
    print(f"Total generated instruction samples: {len(instructions):,}")
    
    # Split 85% train, 15% test
    split_idx = int(len(instructions) * 0.85)
    train_set = instructions[:split_idx]
    test_set = instructions[split_idx:]
    
    with open(TRAIN_JSONL, "w", encoding="utf-8") as f:
        for item in train_set:
            f.write(json.dumps(item, ensure_ascii=False) + "\n")
            
    with open(TEST_JSONL, "w", encoding="utf-8") as f:
        for item in test_set:
            f.write(json.dumps(item, ensure_ascii=False) + "\n")
            
    print(f"Train dataset: {len(train_set):,} samples -> {TRAIN_JSONL}")
    print(f"Test dataset: {len(test_set):,} samples -> {TEST_JSONL}")
    print("ETL and dataset generation completed successfully!")


if __name__ == "__main__":
    main()
