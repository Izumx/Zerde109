import os
import sys
sys.stdout.reconfigure(encoding="utf-8")
import json
import time
import torch
import urllib.request
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
from peft import PeftModel

MODEL_ID = "issai/LLama-3.1-KazLLM-1.0-8B"
ADAPTER_DIR = "models/kazllm-8b-finetuned"
OLLAMA_URL = "http://localhost:11434/api/chat"

# Benchmark test cases representing real 109 citizen appeals (Kazakh & Russian)
TEST_CASES = [
    {
        "id": "CASE_1_KK_LIGHTING",
        "lang": "kk",
        "system": "Сен «Zerde 109» бірыңғай интеллектуалды жүйесінің ақылды диспетчерісің. Азаматтың өтінішін талдап, оның санатын, ішкі санатын, жауапты қызметті, шұғылдық деңгейін және қажетті әрекетті қатаң түрде JSON форматында қайтар.",
        "user": "Обращение / Өтініш: Біздің аулада және көше бойында түнгі шамдар жұмыс істемейді, қараңғы: Дворовое/уличное освещение, мекенжай: Қарағанды, Бөкетов көшесі",
        "expected_category_code": "LIGHTING",
        "desc": "Көше жарығы (Освещение) на казахском языке"
    },
    {
        "id": "CASE_2_RU_HEATING",
        "lang": "ru",
        "system": "Ты интеллектуальный диспетчер единой платформы «Zerde 109». Проанализируй обращение гражданина и определи категорию, подкатегорию, ответственную организацию, приоритет срочности и рекомендуемое действие строго в формате JSON.",
        "user": "Обращение / Өтініш: В квартире ледяные батареи, дома очень холодно, замерзаем с маленькими детьми! Срочно примите меры: Снабжение тепловой энергией, адрес: Караганда, 14-й микрорайон, 6",
        "expected_category_code": "HEATING",
        "desc": "ЖКХ / Отопление (Теплоснабжение) на русском языке"
    },
    {
        "id": "CASE_3_KK_GAS_EMERGENCY",
        "lang": "kk",
        "system": "Сен «Zerde 109» бірыңғай интеллектуалды жүйесінің ақылды диспетчерісің. Азаматтың өтінішін талдап, оның санатын, ішкі санатын, жауапты қызметті, шұғылдық деңгейін және қажетті әрекетті қатаң түрде JSON форматында қайтар.",
        "user": "Обращение / Өтініш: Кіреберістен өткір газ иісі шығып тұр, өтінеміз шұғыл авариялық қызмет жіберіңіздер, жарылыс қаупі бар!",
        "expected_category_code": "GAS",
        "desc": "Төтенше жағдай / Газ иісі (Авариялық газ қызметі)"
    },
    {
        "id": "CASE_4_RU_ROADS",
        "lang": "ru",
        "system": "Ты интеллектуальный диспетчер единой платформы «Zerde 109». Проанализируй обращение гражданина и определи категорию, подкатегорию, ответственную организацию, приоритет срочности и рекомендуемое действие строго в формате JSON.",
        "user": "Обращение / Өтініш: На перекрестке образовалась огромная глубокая яма, машины разбивают колеса и создается аварийная ситуация: Ремонт дорожного полотна, адрес: проспект Республики 45",
        "expected_category_code": "ROADS",
        "desc": "Дороги и ремонт полотна на русском языке"
    },
    {
        "id": "CASE_5_KK_VET",
        "lang": "kk",
        "system": "Сен «Zerde 109» бірыңғай интеллектуалды жүйесінің ақылды диспетчерісің. Азаматтың өтінішін талдап, оның санатын, ішкі санатын, жауапты қызметті, шұғылдық деңгейін және қажетті әрекетті қатаң түрде JSON форматында қайтар.",
        "user": "Обращение / Өтініш: Мектеп жанында қаңғыбас иттер үйірі жүр, балаларға үріп қауып төндіреді: Жануарларды аулау қызметі",
        "expected_category_code": "VET_ANIMALS",
        "desc": "Қаңғыбас иттерді аулау (Ветсервис)"
    }
]

def query_ollama_base(system_msg: str, user_msg: str) -> tuple[str, float]:
    """Query baseline KazLLM 8B via Ollama."""
    payload = {
        "model": "kazllm:8b",
        "messages": [
            {"role": "system", "content": system_msg},
            {"role": "user", "content": user_msg}
        ],
        "stream": False,
        "options": {"temperature": 0.1, "num_predict": 300}
    }
    t0 = time.time()
    req = urllib.request.Request(
        OLLAMA_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    lat = time.time() - t0
    return data["message"]["content"], lat

def parse_json_safely(text: str) -> dict | None:
    text = text.strip()
    # Strip markdown if present
    if "```json" in text:
        text = text.split("```json")[1].split("```")[0].strip()
    elif "```" in text:
        text = text.split("```")[1].split("```")[0].strip()
    try:
        return json.loads(text)
    except Exception:
        # try to find first { and last }
        s = text.find("{")
        e = text.rfind("}")
        if s != -1 and e != -1 and e > s:
            try:
                return json.loads(text[s:e+1])
            except Exception:
                return None
        return None

def main():
    print("=" * 80)
    print("БЕНЧМАРК: Сравнение обычной KazLLM 8B и нашей Fine-Tuned (QLoRA) версии")
    print("=" * 80)

    # 1. Load fine-tuned model via HuggingFace + Peft (4-bit)
    print("\n[1/4] Загрузка токенизатора и квантованной модели с нашим адаптером...")
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
    model = PeftModel.from_pretrained(base_model, ADAPTER_DIR)
    model.eval()
    print("[+] Fine-tuned модель успешно инициализирована!")

    results = []

    def generate_finetuned(system_msg: str, user_msg: str) -> tuple[str, float]:
        prompt = (
            f"<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n"
            f"{system_msg}<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n"
            f"{user_msg}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n"
        )
        inputs = tokenizer(prompt, return_tensors="pt").to("cuda")
        t0 = time.time()
        with torch.no_grad():
            output_tokens = model.generate(
                **inputs,
                max_new_tokens=250,
                do_sample=False,
                pad_token_id=tokenizer.eos_token_id,
                eos_token_id=tokenizer.convert_tokens_to_ids("<|eot_id|>")
            )
        lat = time.time() - t0
        gen_tokens = output_tokens[0][inputs["input_ids"].shape[1]:]
        resp = tokenizer.decode(gen_tokens, skip_special_tokens=True).strip()
        return resp, lat

    print("\n[2/4] Запуск сравнительных тестов по 5 ключевым сценариям 109...")
    for idx, test in enumerate(TEST_CASES, 1):
        print(f"\n--- Тест {idx}: {test['desc']} ---")
        
        # A. Base Model (Ollama)
        base_resp, base_time = query_ollama_base(test["system"], test["user"])
        base_json = parse_json_safely(base_resp)
        base_is_json = base_json is not None
        base_code = base_json.get("category_code") if base_json else None
        base_correct = (base_code == test["expected_category_code"])

        # B. Fine-Tuned Model (Our QLoRA)
        ft_resp, ft_time = generate_finetuned(test["system"], test["user"])
        ft_json = parse_json_safely(ft_resp)
        ft_is_json = ft_json is not None
        ft_code = ft_json.get("category_code") if ft_json else None
        ft_correct = (ft_code == test["expected_category_code"])

        res = {
            "test_id": test["id"],
            "desc": test["desc"],
            "expected_code": test["expected_category_code"],
            "base": {
                "time": round(base_time, 2),
                "is_valid_json": base_is_json,
                "category_code": base_code,
                "correct_code": base_correct,
                "raw_response": base_resp[:300] + ("..." if len(base_resp) > 300 else "")
            },
            "finetuned": {
                "time": round(ft_time, 2),
                "is_valid_json": ft_is_json,
                "category_code": ft_code,
                "correct_code": ft_correct,
                "parsed": ft_json,
                "raw_response": ft_resp[:300] + ("..." if len(ft_resp) > 300 else "")
            }
        }
        results.append(res)

        print(f"  [Базовая KazLLM]    Время: {base_time:.2f}s | Валидный JSON: {base_is_json} | Код: {base_code} | Совпадение: {'Да' if base_correct else 'НЕТ'}")
        print(f"  [Fine-Tuned KazLLM] Время: {ft_time:.2f}s | Валидный JSON: {ft_is_json} | Код: {ft_code} | Совпадение: {'Да' if ft_correct else 'НЕТ'}")

    # Save detailed JSON report
    with open("data/model_comparison_report.json", "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print("\n" + "=" * 80)
    print("ИТОГОВАЯ СВОДНАЯ ТАБЛИЦА СРАВНЕНИЯ")
    print("=" * 80)
    print(f"{'Кейс / Задача':<35} | {'Базовая KazLLM 8B':<20} | {'Наша Fine-Tuned KazLLM':<20}")
    print("-" * 80)
    for r in results:
        b_mark = "PASS (" + str(r['base']['category_code']) + ")" if r['base']['correct_code'] else "FAIL (нет кода)"
        ft_mark = "PASS (" + str(r['finetuned']['category_code']) + ")" if r['finetuned']['correct_code'] else "FAIL"
        print(f"{r['desc'][:35]:<35} | {b_mark:<20} | {ft_mark:<20}")

    base_acc = sum(1 for r in results if r["base"]["correct_code"]) / len(results) * 100
    ft_acc = sum(1 for r in results if r["finetuned"]["correct_code"]) / len(results) * 100
    base_json_rate = sum(1 for r in results if r["base"]["is_valid_json"]) / len(results) * 100
    ft_json_rate = sum(1 for r in results if r["finetuned"]["is_valid_json"]) / len(results) * 100

    print("-" * 80)
    print(f"Точность таксономии (Category Code):   Базовая = {base_acc:.1f}%   |   Наша Fine-Tuned = {ft_acc:.1f}%")
    print(f"Строгое соответствие JSON схемы:      Базовая = {base_json_rate:.1f}%   |   Наша Fine-Tuned = {ft_json_rate:.1f}%")
    print("=" * 80)
    print("Подробный отчет сохранен в: data/model_comparison_report.json")

if __name__ == "__main__":
    main()
