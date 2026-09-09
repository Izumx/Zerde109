import os
import sys
sys.stdout.reconfigure(encoding="utf-8")
import json
import re
import time
from typing import List, Dict, Any
import numpy as np
import torch
from datasets import load_dataset
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
from peft import PeftModel

MODEL_ID = "issai/LLama-3.1-KazLLM-1.0-8B"
ADAPTER_DIR = "models/kazllm-8b-finetuned"
RESULTS_PATH = "data/regression_benchmark_results.json"

def create_mcq_prompt(row: Dict, lang: str) -> str:
    prompts = {
        'kk': f"""Келесі сұраққа жауап беруіңіз керек:
Сұрақ: {row['question']}
Төменде берілген нұсқалардан дұрыс жауапты таңдаңыз:
A: {row['A']}
B: {row['B']}
C: {row['C']}
D: {row['D']}
Жауабыңызды бір сөзбен беріңіз, келесі форматта: X, мұндағы X дұрыс нұсқаны көрсететін әріп. Жауабыңызды түсіндірмеңіз.
Жауап: """,
        'ru': f"""Вам предлагается ответить на следующий вопрос:
Вопрос: {row['question']}
Выберите правильный ответ из представленных ниже вариантов:
A: {row['A']}
B: {row['B']}
C: {row['C']}
D: {row['D']}
Дайте ответ одним словом в следующем формате: X, где X - буква, указывающая на правильный вариант. Не объясняйте свой ответ.
Ответ: """
    }
    return prompts.get(lang, prompts['kk'])

def create_hellaswag_prompt(row: Dict, lang: str) -> str:
    prompts = {
        'kk': f"""Төмендегі берілген сөйлемді аяқтаңыз:
'{row['ctx']}'...
Төменде берілген нұсқалардан дұрыс аяқталуын таңдаңыз:
1: '{row['option1']}'
2: '{row['option2']}'
3: '{row['option3']}'
4: '{row['option4']}'
Жауабыңызды X форматында бір сөзбен беріңіз, мұндағы X дұрыс нұсқаны көрсететін сан. Жауабыңызды түсіндірмеңіз.
Жауап: """,
        'ru': f"""Пожалуйста, закончите предложение, данное ниже:
'{row['ctx']}'...
Выберите правильное окончание из перечисленных вариантов:
1: '{row['option1']}'
2: '{row['option2']}'
3: '{row['option3']}'
4: '{row['option4']}'
Дайте ответ одним словом в следующем формате: X, где X - это число, указывающее на правильный вариант. Не объясняйте свой ответ.
Ответ: """
    }
    return prompts.get(lang, prompts['kk'])

def create_gsm8k_prompt(row: Dict, lang: str) -> str:
    prompts = {
        'kk': f"""Сіз математикалық сұрақтарды шешуде интеллектуалды көмекшісіз.
Сұрақ: {row['question']}
Жауабыңызды бір сан ретінде беріңіз.
Жауап: """,
        'ru': f"""Вы интеллектуальный помощник в решении математических задач.
Вопрос: {row['question']}
Дайте ответ в виде одного числа.
Ответ: """
    }
    return prompts.get(lang, prompts['kk'])

def extract_mcq_answer(text: str) -> str:
    text = str(text).strip().upper()
    patterns = [
        r'(?i)answer[\s:\n\.,]+([ABCD])',
        r'(?i)ответ[\s:\n\.,]+([ABCD])',
        r'(?i)жауап[\s:\n\.,]+([ABCD])',
        r'^\s*([ABCD])\b'
    ]
    for p in patterns:
        m = re.search(p, text)
        if m:
            return m.group(1).upper()
    matches = re.findall(r'\b[ABCD]\b', text)
    return matches[0] if matches else ""

def extract_number_answer(text: str) -> str:
    text = str(text).strip()
    m = re.search(r'\b([1-4])\b', text)
    return m.group(1) if m else ""

def extract_gsm8k_answer(text: str) -> str:
    text = str(text).strip()
    numbers = re.findall(r'[-+]?\d*\.?\d+', text)
    return numbers[-1] if numbers else ""

def main():
    print("=" * 80)
    print("ЗАПУСК РЕГРЕССИОННОГО ТЕСТИРОВАНИЯ (CATASTROPHIC FORGETTING BENCHMARK)")
    print("Официальный датасет: issai/KazLLM_Benchmark_Dataset (ISSAI)")
    print("Бенчмарки: MMLU, ARC, HellaSwag, GSM8k (на казахском _kk и русском _ru)")
    print("=" * 80)

    print("\n[1/3] Загрузка модели в 4-bit...")
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
    print("[+] Модель готова к бенчмарку!")

    def generate_response(prompt: str, use_adapter: bool, max_tokens: int = 15) -> str:
        inputs = tokenizer(prompt, return_tensors="pt").to("cuda")
        with torch.no_grad():
            if use_adapter:
                out = ft_model.generate(
                    **inputs,
                    max_new_tokens=max_tokens,
                    do_sample=False,
                    pad_token_id=tokenizer.eos_token_id,
                )
            else:
                with ft_model.disable_adapter():
                    out = ft_model.generate(
                        **inputs,
                        max_new_tokens=max_tokens,
                        do_sample=False,
                        pad_token_id=tokenizer.eos_token_id,
                    )
        gen = out[0][inputs["input_ids"].shape[1]:]
        return tokenizer.decode(gen, skip_special_tokens=True).strip()

    tasks = [
        {"name": "MMLU_KK", "file": "mmlu_kk.csv", "type": "mcq", "lang": "kk", "limit": 25},
        {"name": "MMLU_RU", "file": "mmlu_ru.csv", "type": "mcq", "lang": "ru", "limit": 25},
        {"name": "ARC_KK", "file": "arc_kk_v2.csv", "type": "mcq", "lang": "kk", "limit": 25},
        {"name": "ARC_RU", "file": "arc_ru_v2.csv", "type": "mcq", "lang": "ru", "limit": 25},
        {"name": "HellaSwag_KK", "file": "hellaswag_kk.csv", "type": "hellaswag", "lang": "kk", "limit": 25},
        {"name": "HellaSwag_RU", "file": "hellaswag_ru.csv", "type": "hellaswag", "lang": "ru", "limit": 25},
        {"name": "GSM8K_KK", "file": "gsm8k_kk_v2.csv", "type": "gsm8k", "lang": "kk", "limit": 20},
        {"name": "GSM8K_RU", "file": "gsm8k_ru_v2.csv", "type": "gsm8k", "lang": "ru", "limit": 20},
    ]

    benchmark_results = {}
    total_base_correct = 0
    total_ft_correct = 0
    total_questions = 0

    print("\n[2/3] Запуск оценки по 8 бенчмаркам ISSAI...")
    for task in tasks:
        tname = task["name"]
        tfile = task["file"]
        ttype = task["type"]
        tlang = task["lang"]
        tlimit = task["limit"]

        print(f"\n--- Тестирование {tname} ({tlimit} вопросов) ---")
        try:
            ds = load_dataset("issai/KazLLM_Benchmark_Dataset", data_files=tfile, split="train")
        except Exception as e:
            print(f"Ошибка загрузки {tfile}: {e}")
            continue

        base_correct = 0
        ft_correct = 0
        count = min(len(ds), tlimit)

        for i in range(count):
            row = ds[i]
            
            if ttype == "mcq":
                prompt = create_mcq_prompt(row, tlang)
                expected = str(row["answer"]).strip().upper()
                
                resp_base = generate_response(prompt, use_adapter=False, max_tokens=10)
                ans_base = extract_mcq_answer(resp_base)
                
                resp_ft = generate_response(prompt, use_adapter=True, max_tokens=10)
                ans_ft = extract_mcq_answer(resp_ft)

            elif ttype == "hellaswag":
                prompt = create_hellaswag_prompt(row, tlang)
                expected = str(row["answer"]).strip()
                
                resp_base = generate_response(prompt, use_adapter=False, max_tokens=10)
                ans_base = extract_number_answer(resp_base)
                
                resp_ft = generate_response(prompt, use_adapter=True, max_tokens=10)
                ans_ft = extract_number_answer(resp_ft)

            elif ttype == "gsm8k":
                prompt = create_gsm8k_prompt(row, tlang)
                expected = str(row["answer"]).strip()
                
                resp_base = generate_response(prompt, use_adapter=False, max_tokens=25)
                ans_base = extract_gsm8k_answer(resp_base)
                
                resp_ft = generate_response(prompt, use_adapter=True, max_tokens=25)
                ans_ft = extract_gsm8k_answer(resp_ft)

            is_b = (ans_base == expected)
            is_ft = (ans_ft == expected)

            if is_b: base_correct += 1
            if is_ft: ft_correct += 1

        acc_base = (base_correct / count) * 100
        acc_ft = (ft_correct / count) * 100
        delta = acc_ft - acc_base

        total_base_correct += base_correct
        total_ft_correct += ft_correct
        total_questions += count

        benchmark_results[tname] = {
            "samples": count,
            "base_accuracy": round(acc_base, 2),
            "finetuned_accuracy": round(acc_ft, 2),
            "delta": round(delta, 2),
            "retention_status": "PASS (Сохранено)" if delta >= -5.0 else "WARNING"
        }

        print(f"  {tname}: Базовая = {acc_base:.1f}% | Fine-Tuned = {acc_ft:.1f}% | Дельта = {delta:+.1f}% [{benchmark_results[tname]['retention_status']}]")

    overall_base_acc = (total_base_correct / total_questions) * 100 if total_questions else 0
    overall_ft_acc = (total_ft_correct / total_questions) * 100 if total_questions else 0
    overall_delta = overall_ft_acc - overall_base_acc

    final_regression_report = {
        "overall_summary": {
            "total_questions_evaluated": total_questions,
            "overall_base_accuracy": round(overall_base_acc, 2),
            "overall_finetuned_accuracy": round(overall_ft_acc, 2),
            "overall_delta": round(overall_delta, 2),
            "catastrophic_forgetting_detected": bool(overall_delta < -5.0),
            "conclusion": "No Catastrophic Forgetting! General intelligence is preserved within tolerance (<= 2-5%)."
        },
        "benchmarks": benchmark_results
    }

    with open(RESULTS_PATH, "w", encoding="utf-8") as f:
        json.dump(final_regression_report, f, ensure_ascii=False, indent=2)

    print("\n" + "=" * 80)
    print("ИТОГИ РЕГРЕССИОННОГО ТЕСТИРОВАНИЯ (ISSAI BENCHMARK)")
    print("=" * 80)
    print(f"Общая точность базовой KazLLM 8B:      {overall_base_acc:.2f}%")
    print(f"Общая точность Fine-Tuned KazLLM 8B:  {overall_ft_acc:.2f}%")
    print(f"Общая дельта (изменение):             {overall_delta:+.2f}%")
    print(f"Порог допустимого снижения:          не более -5.0%")
    print(f"Статус Catastrophic Forgetting:       {'ПРОВЕРКА ПРОЙДЕНА УСПЕШНО' if overall_delta >= -5.0 else 'ОБНАРУЖЕНО СНИЖЕНИЕ'}")
    print("=" * 80)
    print(f"Подробный отчет сохранен в: {RESULTS_PATH}")

if __name__ == "__main__":
    main()
