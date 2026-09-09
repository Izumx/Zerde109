"""Compare local Ollama models on identical Russian-language tasks.

Examples:
    python ollama_model_benchmark.py --dry-run
    python ollama_model_benchmark.py
    python ollama_model_benchmark.py --models qwen3.5:9b kazllm:8b --repeat 2
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.error
import urllib.request
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

if sys.stdout:
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass


DEFAULT_MODELS = ["qwen3.5:9b", "kazllm:8b"]
OLLAMA_URL = "http://localhost:11434"


@dataclass(frozen=True)
class TestCase:
    name: str
    category: str
    prompt: str
    must_contain: tuple[str, ...] = ()
    expect_json: bool = False


TESTS = [
    TestCase(
        name="Өтінішті жіктеу",
        category="құрылымдалған жауап",
        prompt=(
            "Азаматтың өтінішін мына санаттардың біріне жікте: жолдар, жылыту, "
            "сумен жабдықтау, қоқыс шығару немесе басқа. Тек category және confidence "
            "(0 мен 1 арасындағы сан) кілттері бар JSON қайтар. "
            "Өтініш: Біздің ауладан қоқыс үш күн бойы шығарылмады, контейнерлер толып кетті."
        ),
        must_contain=("қоқыс", "confidence"),
        expect_json=True,
    ),
    TestCase(
        name="Қысқаша мазмұндау",
        category="ақпаратты ықшамдау",
        prompt=(
            "Өтінішті қазақ тілінде дәл екі сөйлеммен мазмұнда. Мәселе мен қажетті "
            "әрекетті көрсет. Жаңа дерек қоспа. Мәтін: Абай көшесі, 17 үйдің тұрғындары "
            "шатыр жөнделгеннен кейін жаңбыр кезінде кіреберіске су ағатынын хабарлады. "
            "Олар қайта тексеріп, ағып тұрған жерді жөндеуді сұрайды."
        ),
        must_contain=("су", "тексер"),
    ),
    TestCase(
        name="Өрістерді шығару",
        category="деректерді шығару",
        prompt=(
            "Деректерді шығарып, markdown қолданбай тек мына JSON форматын қайтар: "
            "{\"address\": string, \"problem\": string, "
            "\"urgency\": \"төмен\"|\"орташа\"|\"жоғары\"}. Мәтін: "
            "Көкшетау қаласында Сейфуллин көшесі, 25-үйдің жанындағы құбыр жарылды: "
            "су жол мен жертөлені басып жатыр. Бұл мәселені шұғыл хабарлаймын."
        ),
        must_contain=("Сейфуллин", "жоғары"),
        expect_json=True,
    ),
    TestCase(
        name="Логикалық ойлау",
        category="ой қорыту",
        prompt=(
            "Ауданда 120 өтініш бар. Оның 35%-ы жолдарға, 25%-ы жарықтандыруға, "
            "ал қалғаны басқа тақырыптарға қатысты. Басқа тақырыптарға қанша өтініш "
            "қатысты? Қысқа жауап беріп, есептеу жолын көрсет."
        ),
        must_contain=("48",),
    ),
    TestCase(
        name="Шектеулерді сақтау",
        category="нұсқаулық",
        prompt=(
            "Қазақ тілінде жауап бер. Жұмыс істемей тұрған көше шамы туралы өтінішті "
            "өңдеу үшін дәл 3 нөмірленген қадам құрастыр. Әр қадам 12 сөзден аспасын. "
            "'өтініш беруші' сөз тіркесін қолданба."
        ),
        must_contain=("1.", "2.", "3."),
    ),
]


def post_json(url: str, payload: dict[str, Any]) -> dict[str, Any]:
    request = urllib.request.Request(
        url,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(request, timeout=600) as response:
        return json.loads(response.read().decode("utf-8"))


def valid_json(text: str) -> bool:
    candidate = text.strip()
    if candidate.startswith("```"):
        candidate = candidate.strip("`").removeprefix("json").strip()
    try:
        json.loads(candidate)
        return True
    except json.JSONDecodeError:
        return False


def run_test(model: str, test: TestCase) -> dict[str, Any]:
    started = time.perf_counter()
    try:
        response = post_json(
            f"{OLLAMA_URL}/api/chat",
            {
                "model": model,
                "messages": [{"role": "user", "content": test.prompt}],
                "stream": False,
                "options": {"temperature": 0},
            },
        )
        answer = response.get("message", {}).get("content", "").strip()
        checks = [term.lower() in answer.lower() for term in test.must_contain]
        return {
            "model": model,
            "test": test.name,
            "category": test.category,
            "seconds": round(time.perf_counter() - started, 2),
            "answer_chars": len(answer),
            "passed": all(checks) and (not test.expect_json or valid_json(answer)),
            "checks": checks,
            "json_valid": valid_json(answer) if test.expect_json else None,
            "answer": answer,
        }
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError) as error:
        return {
            "model": model,
            "test": test.name,
            "category": test.category,
            "seconds": round(time.perf_counter() - started, 2),
            "passed": False,
            "error": str(error),
        }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--models", nargs="+", default=DEFAULT_MODELS)
    parser.add_argument("--repeat", type=int, default=1)
    parser.add_argument("--output", type=Path, default=Path("ollama_benchmark_results.jsonl"))
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    if args.repeat < 1:
        parser.error("--repeat must be at least 1")
    if args.dry_run:
        print(f"Ollama URL: {OLLAMA_URL}")
        print(f"Models: {', '.join(args.models)}")
        print(f"Tests: {len(TESTS)}; total calls: {len(TESTS) * len(args.models) * args.repeat}")
        return 0

    results: list[dict[str, Any]] = []
    for repeat in range(1, args.repeat + 1):
        for model in args.models:
            for test in TESTS:
                print(f"[{model}] {test.name} (run {repeat}/{args.repeat})...", flush=True)
                result = run_test(model, test)
                result["run"] = repeat
                results.append(result)
                status = "PASS" if result["passed"] else "FAIL"
                print(f"  {status} - {result.get('seconds', '?')} s")

    with args.output.open("w", encoding="utf-8") as file:
        for result in results:
            file.write(json.dumps(result, ensure_ascii=False) + "\n")

    print(f"\nРезультаты сохранены: {args.output.resolve()}")
    for model in args.models:
        model_results = [result for result in results if result["model"] == model]
        passed = sum(result["passed"] for result in model_results)
        total = len(model_results)
        average = sum(result.get("seconds", 0) for result in model_results) / total
        print(f"{model}: {passed}/{total} passed, average {average:.2f} s")
    return 0 if all(result["passed"] for result in results) else 1


if __name__ == "__main__":
    sys.exit(main())