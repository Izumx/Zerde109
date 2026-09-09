import os
import sys
from pathlib import Path

os.environ["USE_TF"] = "0"
os.environ["USE_TORCH"] = "1"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

if sys.stdout:
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Add src to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from fastapi.testclient import TestClient
from api.api import app

client = TestClient(app)


def test_health():
    resp = client.get("/api/v1/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "healthy"
    print("[PASS] Health check:", data["platform"])


def test_module1_classify_kk():
    payload = {"text": "Біздің көшеде су жоқ, құбыр жарылған, су ағып жатыр"}
    resp = client.post("/api/v1/classify", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["language"] == "kk"
    assert data["category_code"] == "WATER_SEWAGE"
    print("[PASS] Module 1 Classify (KK):", data["category"], "| Org:", data["responsible_org"])


def test_module1_classify_ru():
    payload = {"text": "Во дворе ледяные батареи, дома очень холодно, нет отопления"}
    resp = client.post("/api/v1/classify", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["language"] == "ru"
    assert data["category_code"] == "HEATING"
    print("[PASS] Module 1 Classify (RU):", data["category"], "| Org:", data["responsible_org"])


def test_module2_similar_search():
    payload = {"text": "су жоқ", "top_k": 3}
    resp = client.post("/api/v1/similar", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_found"] > 0
    print(f"[PASS] Module 2 Similar Search: Found {data['total_found']} similar cases")
    for item in data["similar_appeals"][:2]:
        print(f"   [{item['score']:.3f}] {item['text'][:60]}... ({item['category']})")


def test_module2_duplicate_check():
    payload = {"text": "контейнерлер толып кетті, қоқыс шығарылмады"}
    resp = client.post("/api/v1/duplicates", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    print(f"[PASS] Module 2 Duplicate Check: is_duplicate={data['is_duplicate']}, top_score={data['confidence_score']:.3f}")


def test_module2_operator_suggest():
    payload = {"appeal_text": "Көшедегі шамдар жанбайды, қараңғы"}
    resp = client.post("/api/v1/operator/suggest", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["suggested_reply_kk"]) > 10
    print("[PASS] Module 2 Operator Suggest:", data["assigned_service"], "| SLA:", data["sla_hours"], "h")


def test_module3_spikes():
    resp = client.get("/api/v1/analytics/spikes")
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) > 0
    print(f"[PASS] Module 3 Spikes: Detected {len(data)} critical alerts")


def test_module3_forecast():
    resp = client.get("/api/v1/analytics/forecast?horizon_days=60")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_predicted_appeals"] > 0
    print(f"[PASS] Module 3 Forecast: Total forecasted {data['total_predicted_appeals']:,} appeals over 60 days")


def test_module3_nl_query():
    questions = [
        "Қарағанды бойынша жол мәселесі қанша?",
        "Сколько обращений по водоснабжению?"
    ]
    for q in questions:
        resp = client.post("/api/v1/analytics/query", json={"question": q})
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["answer"]) > 10
        print(f"[PASS] Module 3 NL Query: '{q}' -> {data['answer'][:80]}...")


def test_module3_dashboard():
    resp = client.get("/api/v1/analytics/dashboard")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_appeals"] >= 100000
    print(f"[PASS] Module 3 Dashboard: {data['total_appeals']:,} total appeals, SLA={data['sla_compliance']}")


def test_module1_classify_emergency_override():
    payload = {"text": "Кіреберісте қатты газ иісі шығып тұр, жарылу қаупі бар, шұғыл көмек керек!"}
    resp = client.post("/api/v1/classify", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["category_code"] == "GAS"
    assert "жоғары" in data["priority"] or "высок" in data["priority"]
    assert data["verified"] is True
    print("[PASS] Module 1 Emergency Override & Verification:", data["category"], "| Priority:", data["priority"])


def test_module1_classify_empty():
    payload = {"text": "   "}
    resp = client.post("/api/v1/classify", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["category_code"] == "OTHER"
    print("[PASS] Module 1 Empty text handled gracefully:", data["category"])


def test_module1_classify_mixed_code_switching():
    payload = {"text": "Здравствуйте, біздің аулада мусорный контейнер толып кетті, вонь стоит страшная. Қоқысты қашан алып кетеді?"}
    resp = client.post("/api/v1/classify", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["category_code"] == "WASTE"
    print("[PASS] Module 1 Code-Switching:", data["category"], "| Lang:", data["language"])


if __name__ == "__main__":
    print("\n==========================================")
    print("   RUNNING INTEGRATION TESTS FOR ZERDE 109 ")
    print("==========================================")
    test_health()
    test_module1_classify_kk()
    test_module1_classify_ru()
    test_module1_classify_emergency_override()
    test_module1_classify_empty()
    test_module1_classify_mixed_code_switching()
    test_module2_similar_search()
    test_module2_duplicate_check()
    test_module2_operator_suggest()
    test_module3_spikes()
    test_module3_forecast()
    test_module3_nl_query()
    test_module3_dashboard()
    print("\n==========================================")
    print("   ALL INTEGRATION TESTS PASSED (13/13)   ")
    print("==========================================\n")

