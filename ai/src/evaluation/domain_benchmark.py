import os
import sys
sys.stdout.reconfigure(encoding="utf-8")
import json
import re
import time
from typing import List, Dict, Any
import numpy as np
from sklearn.metrics import f1_score, accuracy_score
from rouge_score import rouge_scorer
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
from peft import PeftModel

MODEL_ID = "issai/LLama-3.1-KazLLM-1.0-8B"
ADAPTER_DIR = "models/kazllm-8b-finetuned"
TEST_DATA_PATH = "data/test_instructions.jsonl"
RESULTS_PATH = "data/domain_benchmark_results.json"

CODE_SWITCHING_CASES = [
    {
        "lang": "mixed",
        "text": "Сәлеметсіз бе! Біздің подъезде отопление мүлдем істемейді, батареялар ледяные. Ребенок ауырып қалды, срочно слесарь жіберіңіздерші!",
        "expected_category": "HEATING",
        "expected_priority": "high",
        "key_facts": ["подъезд", "отопление", "батареялар", "слесарь"]
    },
    {
        "lang": "mixed",
        "text": "Здравствуйте, біздің аулада мусорный контейнер толып кетті, вонь стоит страшная. Қоқысты қашан алып кетеді?",
        "expected_category": "WASTE",
        "expected_priority": "medium",
        "key_facts": ["аула", "мусорный контейнер", "қоқыс"]
    },
    {
        "lang": "mixed",
        "text": "Абай көшесінде светофор не работает уже второй день, страшная пробка және авариялық ситуация болып тұр.",
        "expected_category": "ROADS",
        "expected_priority": "high",
        "key_facts": ["Абай", "светофор", "пробка", "авариялық"]
    },
    {
        "lang": "mixed",
        "text": "Мектептің қасында стая бродячих собак жүр, балаларға килігіп үреді. Отлов вызвать етіңіздерші срочно!",
        "expected_category": "VET_ANIMALS",
        "expected_priority": "high",
        "key_facts": ["мектеп", "собак", "отлов", "иттер"]
    },
    {
        "lang": "mixed",
        "text": "Су өшіп қалды таңертеңнен бері, құбыр порыв болған сияқты. Водоканалға хабарласа алмай отырмыз.",
        "expected_category": "WATER_SEWAGE",
        "expected_priority": "high",
        "key_facts": ["су", "құбыр", "порыв", "водоканал"]
    }
]

def load_domain_dataset(max_samples: int = 100) -> List[Dict]:
    appeals = []
    kk_count = 0
    ru_count = 0
    with open(TEST_DATA_PATH, "r", encoding="utf-8") as f:
        for line in f:
            data = json.loads(line)
            lang = data.get("language", "ru")
            if lang == "kk" and kk_count < max_samples // 2:
                appeals.append(data)
                kk_count += 1
            elif lang == "ru" and ru_count < max_samples // 2:
                appeals.append(data)
                ru_count += 1
            if len(appeals) >= max_samples:
                break
    return appeals

def parse_json_safely(text: str) -> dict:
    text = text.strip()
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0].strip()
    elif "```" in text:
        text = text.split("```")[1].split("```")[0].strip()
    try:
        return json.loads(text)
    except Exception:
        s = text.find("{")
        e = text.rfind("}")
        if s != -1 and e != -1 and e > s:
            try:
                return json.loads(text[s:e+1])
            except Exception:
                pass
    return {}

def detect_language(text: str) -> str:
    kz_specific = set("әғқңөұүһіӘҒҚҢӨҰҮҺІ")
    has_kz_chars = any(c in kz_specific for c in text)
    ru_chars = len(re.findall(r'[а-яА-ЯёЁ]', text))
    if has_kz_chars:
        return "kk"
    if ru_chars > 10:
        return "ru"
    return "unknown"

def evaluate_official_reply_compliance(reply: str) -> Dict[str, Any]:
    reply_lower = reply.lower()
    greetings = ["құрметті", "уважаемый", "уважаемая", "сәлеметсіз бе", "здравствуйте", "өтініш беруші", "заявитель"]
    has_greeting = any(g in reply_lower for g in greetings)
    org_markers = ["акимат", "әкімдік", "бөлім", "басқарма", "қызмет", "служба", "кәсіпорын", "тоо", "мкк", "отдел", "управление", "бригада", "қала"]
    has_org = any(o in reply_lower for o in org_markers)
    action_markers = ["жұмыс", "тексеру", "жөндеу", "жойылды", "қабылданды", "бақылауда", "направлен", "проверка", "устранено", "принято в работу", "исполнени"]
    has_action = any(a in reply_lower for a in action_markers)
    contact_markers = ["109", "байланыс", "хабарла", "номер", "телефон", "жауап", "статус"]
    has_contact = any(c in reply_lower for c in contact_markers)
    score = sum([has_greeting, has_org, has_action, has_contact]) / 4.0
    return {
        "compliance_score": score,
        "has_greeting": has_greeting,
        "has_org": has_org,
        "has_action": has_action,
        "has_contact": has_contact
    }

def main():
    print("=" * 80)
    print("ЗАПУСК ДОМЕННОГО БЕНЧМАРКА «ZERDE 109»")
    print("Оценка спецификаций обращений: Классификация, Суммаризация, Ответ, Code-Switching")
    print("=" * 80)

    print("\n[1/4] Инициализация модели в 4-bit...")
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16,
        bnb_4bit_use_double_quant=True,
    )
    tokenizer = AutoTokenizer.from_pretrained(MODEL_ID, trust_remote_code=True)
    base_model = AutoModelForCausalLM.from_pretrained(
        MODEL_ID,
        quantization_config=bnb_config,
        device_map="auto",
        trust_remote_code=True,
    )
    ft_model = PeftModel.from_pretrained(base_model, ADAPTER_DIR)
    ft_model.eval()
    print("[+] Модель готова!")

    test_appeals = load_domain_dataset(max_samples=100)
    print(f"\n[2/4] Загружен отложенный тестовый датасет: {len(test_appeals)} обращений (50 KK + 50 RU) + {len(CODE_SWITCHING_CASES)} смешанных.")

    scorer = rouge_scorer.RougeScorer(["rouge1", "rouge2", "rougeL"], use_stemmer=False)

    y_true_cats = []
    y_pred_base_cats = []
    y_pred_ft_cats = []

    rouge_base = {"rouge1": [], "rouge2": [], "rougeL": []}
    rouge_ft = {"rouge1": [], "rouge2": [], "rougeL": []}

    base_compliance_scores = []
    ft_compliance_scores = []

    base_lang_match = []
    ft_lang_match = []

    def run_inference(system_prompt: str, user_prompt: str, use_adapter: bool) -> str:
        prompt = (
            f"<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n"
            f"{system_prompt}<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n"
            f"{user_prompt}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n"
        )
        inputs = tokenizer(prompt, return_tensors="pt").to("cuda")
        with torch.no_grad():
            if use_adapter:
                out = ft_model.generate(
                    **inputs,
                    max_new_tokens=180,
                    do_sample=False,
                    pad_token_id=tokenizer.eos_token_id,
                    eos_token_id=tokenizer.convert_tokens_to_ids("<|eot_id|>")
                )
            else:
                with ft_model.disable_adapter():
                    out = ft_model.generate(
                        **inputs,
                        max_new_tokens=180,
                        do_sample=False,
                        pad_token_id=tokenizer.eos_token_id,
                        eos_token_id=tokenizer.convert_tokens_to_ids("<|eot_id|>")
                    )
        gen = out[0][inputs["input_ids"].shape[1]:]
        return tokenizer.decode(gen, skip_special_tokens=True).strip()

    print("\n[3/4] Прогон тестов классификации, суммаризации и генерации ответов...")
    N_EVAL = min(len(test_appeals), 50)
    for i in range(N_EVAL):
        item = test_appeals[i]
        messages = item["messages"]
        system_msg = messages[0]["content"]
        user_msg = messages[1]["content"]
        expected_assistant = messages[2]["content"]
        expected_json = parse_json_safely(expected_assistant)
        expected_cat = item.get("category_code", expected_json.get("category_code", "OTHER"))
        appeal_lang = item.get("language", "kk")
        
        y_true_cats.append(expected_cat)

        # 1. Base Model (Adapter disabled)
        base_out = run_inference(system_msg, user_msg, use_adapter=False)
        base_json = parse_json_safely(base_out)
        base_cat = base_json.get("category_code") or base_json.get("category") or "NONE"
        y_pred_base_cats.append(str(base_cat))

        # 2. Fine-Tuned Model (Adapter enabled)
        ft_out = run_inference(system_msg, user_msg, use_adapter=True)
        ft_json = parse_json_safely(ft_out)
        ft_cat = ft_json.get("category_code", "NONE")
        y_pred_ft_cats.append(str(ft_cat))

        # Summarization ROUGE
        ref_action = expected_json.get("action", "")
        base_action = base_json.get("action", base_json.get("действие", base_out[:100]))
        ft_action = ft_json.get("action", "")

        score_b = scorer.score(ref_action, base_action)
        score_ft = scorer.score(ref_action, ft_action)

        for k in ["rouge1", "rouge2", "rougeL"]:
            rouge_base[k].append(score_b[k].fmeasure)
            rouge_ft[k].append(score_ft[k].fmeasure)

        # Compliance
        base_comp = evaluate_official_reply_compliance(base_out)["compliance_score"]
        ft_comp = evaluate_official_reply_compliance(ft_out)["compliance_score"]
        base_compliance_scores.append(base_comp)
        ft_compliance_scores.append(ft_comp)

        # Language consistency
        base_detected = detect_language(base_out)
        ft_detected = detect_language(ft_out)
        base_lang_match.append(1 if (base_detected == appeal_lang or base_detected == "unknown") else 0)
        ft_lang_match.append(1 if ft_detected == appeal_lang else 0)

        if (i + 1) % 10 == 0 or i == N_EVAL - 1:
            print(f"  Обработано: {i + 1}/{N_EVAL} обращений...")

    print("\n[4/4] Тестирование Code-Switching (смешанные запросы)...")
    cs_results = []
    system_cs = "Ты интеллектуальный диспетчер «Zerde 109». Определи категорию, срочность и действие в формате JSON."
    for cs in CODE_SWITCHING_CASES:
        ft_cs_out = run_inference(system_cs, cs["text"], use_adapter=True)
        parsed_cs = parse_json_safely(ft_cs_out)
        cat_match = parsed_cs.get("category_code") == cs["expected_category"]
        cs_results.append({
            "text": cs["text"],
            "expected": cs["expected_category"],
            "predicted": parsed_cs.get("category_code"),
            "correct": cat_match,
            "reply": ft_cs_out[:150]
        })

    acc_base = accuracy_score(y_true_cats, [c if c in y_true_cats else "OTHER" for c in y_pred_base_cats])
    acc_ft = accuracy_score(y_true_cats, y_pred_ft_cats)

    f1_base = f1_score(y_true_cats, [c if c in y_true_cats else "OTHER" for c in y_pred_base_cats], average="macro", zero_division=0)
    f1_ft = f1_score(y_true_cats, y_pred_ft_cats, average="macro", zero_division=0)

    r_l_base = np.mean(rouge_base["rougeL"])
    r_l_ft = np.mean(rouge_ft["rougeL"])

    comp_base = np.mean(base_compliance_scores) * 100
    comp_ft = np.mean(ft_compliance_scores) * 100

    lang_base = np.mean(base_lang_match) * 100
    lang_ft = np.mean(ft_lang_match) * 100

    cs_acc = sum(1 for c in cs_results if c["correct"]) / len(cs_results) * 100

    final_report = {
        "total_test_samples": N_EVAL,
        "classification": {
            "accuracy_base": round(acc_base * 100, 2),
            "accuracy_finetuned": round(acc_ft * 100, 2),
            "f1_macro_base": round(f1_base * 100, 2),
            "f1_macro_finetuned": round(f1_ft * 100, 2)
        },
        "summarization": {
            "rouge1_base": round(np.mean(rouge_base["rouge1"]), 4),
            "rouge1_finetuned": round(np.mean(rouge_ft["rouge1"]), 4),
            "rougeL_base": round(r_l_base, 4),
            "rougeL_finetuned": round(r_l_ft, 4)
        },
        "official_reply_compliance": {
            "base_model_compliance_pct": round(comp_base, 2),
            "finetuned_compliance_pct": round(comp_ft, 2)
        },
        "language_consistency": {
            "base_model_pct": round(lang_base, 2),
            "finetuned_pct": round(lang_ft, 2),
            "code_switching_accuracy_pct": round(cs_acc, 2)
        },
        "code_switching_samples": cs_results
    }

    with open(RESULTS_PATH, "w", encoding="utf-8") as f:
        json.dump(final_report, f, ensure_ascii=False, indent=2)

    print("\n" + "=" * 80)
    print("РЕЗУЛЬТАТЫ ДОМЕННОГО БЕНЧМАРКА «ZERDE 109»")
    print("=" * 80)
    print(f"1. Классификация и маршрутизация:")
    print(f"   - Accuracy:   Базовая = {acc_base*100:.1f}%  |  Fine-Tuned = {acc_ft*100:.1f}%")
    print(f"   - F1 (Macro): Базовая = {f1_base*100:.1f}%  |  Fine-Tuned = {f1_ft*100:.1f}%")
    print(f"2. Суммаризация и суть (ROUGE-L):")
    print(f"   - ROUGE-L:    Базовая = {r_l_base:.3f}  |  Fine-Tuned = {r_l_ft:.3f} (+{((r_l_ft-r_l_base)/max(r_l_base,0.001))*100:.1f}%)")
    print(f"3. Соблюдение регламента ответа (SLA, Орган, Стандарты 109):")
    print(f"   - Соответствие: Базовая = {comp_base:.1f}%  |  Fine-Tuned = {comp_ft:.1f}%")
    print(f"4. Соблюдение языка (Language Consistency & Code-Switching):")
    print(f"   - Чистый KK/RU: Базовая = {lang_base:.1f}%  |  Fine-Tuned = {lang_ft:.1f}%")
    print(f"   - Code-Switching (смешанные запросы): {cs_acc:.1f}% точность")
    print("=" * 80)
    print(f"Результаты сохранены в: {RESULTS_PATH}")

if __name__ == "__main__":
    main()
