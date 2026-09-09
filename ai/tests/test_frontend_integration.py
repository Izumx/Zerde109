"""
Automated Integration Tests for Zerde 109 Frontend Bridge (@zerde/web).
Tests all /api/* endpoints against FastAPI application, validating compatibility with @zerde/types.
"""
import pytest
from fastapi.testclient import TestClient

from src.api.api import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_meta_endpoint(client):
    res = client.get("/api/meta")
    assert res.status_code == 200
    data = res.json()
    assert "regions" in data
    assert "themes" in data
    assert "services" in data
    assert "channels" in data
    assert "statuses" in data
    assert len(data["regions"]) == 20
    assert len(data["themes"]) == 17
    # Check region structure
    region0 = data["regions"][0]
    assert "code" in region0 and "nameRu" in region0 and "nameKk" in region0
    # Check theme structure
    theme0 = data["themes"][0]
    assert "code" in theme0 and "color" in theme0


def test_classify_kazakh_emergency(client):
    payload = {
        "text": "Абай көшесі 45, су құбыры жарылып кетті, су ағып жатыр тез келіңіздер!",
        "language": "kk"
    }
    res = client.post("/api/classify", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["theme"] == "water"
    assert data["priority"] == "high"
    assert data["language"] in ("kk", "ru")
    assert "service" in data
    assert "confidence" in data
    assert "entities" in data
    assert "address" in data["entities"]


def test_classify_russian_heating(client):
    payload = {
        "text": "Здравствуйте, на проспекте Республики 12 в квартире ледяные батареи, нет отопления уже двое суток.",
    }
    res = client.post("/api/classify", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["theme"] == "heating"
    assert data["priority"] in ("high", "medium")
    assert data["entities"]["address"] is not None or "Республики" in str(data["entities"])


def test_appeals_list_and_filters(client):
    # Basic pagination
    res = client.get("/api/appeals?limit=10&offset=0")
    assert res.status_code == 200
    data = res.json()
    assert "items" in data
    assert "total" in data
    assert data["limit"] == 10
    assert data["offset"] == 0
    assert len(data["items"]) <= 10

    if data["items"]:
        item = data["items"][0]
        assert "id" in item
        assert "theme" in item
        assert "priority" in item
        assert "status" in item

    # Filter by theme
    res_water = client.get("/api/appeals?theme=water&limit=5")
    assert res_water.status_code == 200
    water_data = res_water.json()
    for item in water_data["items"]:
        assert item["theme"] == "water"


def test_appeal_detail(client):
    # First get an appeal ID
    list_res = client.get("/api/appeals?limit=1")
    items = list_res.json()["items"]
    appeal_id = items[0]["id"] if items else "APP-1"

    res = client.get(f"/api/appeals/{appeal_id}")
    assert res.status_code == 200
    detail = res.json()
    assert detail["id"] == appeal_id
    assert "searchText" in detail
    assert "theme" in detail
    assert "priority" in detail


def test_appeal_similar(client):
    res = client.get("/api/appeals/APP-TEST/similar")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    if data:
        assert "theme" in data[0]
        assert "similarity" in data[0]


def test_appeal_duplicates(client):
    res = client.get("/api/appeals/APP-TEST/duplicates")
    assert res.status_code == 200
    data = res.json()
    assert "nearDuplicates" in data
    assert "repeats" in data
    assert isinstance(data["nearDuplicates"], list)


def test_templates_endpoint(client):
    res = client.get("/api/templates")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 6

    # Test filtering by lang and theme
    res_kk = client.get("/api/templates?theme=water&lang=kk")
    assert res_kk.status_code == 200
    data_kk = res_kk.json()
    assert all(t["themeCode"] == "water" and t["lang"] == "kk" for t in data_kk)


def test_route_appeal_decision(client):
    res = client.post("/api/appeals/APP-123/route", json={"serviceCode": "su_arnasy", "operatorId": "OP-1"})
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_kpi_metrics(client):
    res = client.get("/api/kpi")
    assert res.status_code == 200
    data = res.json()
    assert "total" in data
    assert "overdueShare" in data
    assert "avgCloseHours" in data
    assert "openNow" in data
    assert data["total"] > 0


def test_timeseries(client):
    res = client.get("/api/timeseries?granularity=month")
    assert res.status_code == 200
    data = res.json()
    assert data["granularity"] == "month"
    assert len(data["points"]) > 0
    assert "bucket" in data["points"][0]
    assert "count" in data["points"][0]


def test_breakdown_by_theme_and_region(client):
    res_theme = client.get("/api/breakdown?dim=theme")
    assert res_theme.status_code == 200
    themes = res_theme.json()
    assert len(themes) > 0
    assert "key" in themes[0] and "count" in themes[0]

    res_region = client.get("/api/breakdown?dim=region")
    assert res_region.status_code == 200
    regions = res_region.json()
    assert len(regions) > 0


def test_spikes_detection(client):
    res = client.get("/api/spikes")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    if data:
        spike = data[0]
        assert "region" in spike
        assert "theme" in spike
        assert "zscore" in spike
        assert "severity" in spike


def test_workload_forecast(client):
    res = client.get("/api/forecast?region=Павлодарская область&theme=water")
    assert res.status_code == 200
    data = res.json()
    assert "history" in data
    assert "forecast" in data
    assert len(data["forecast"]) > 0
    assert "yhat" in data["forecast"][0]


def test_executive_nl_query(client):
    payload = {"q": "Сколько обращений по водоснабжению в Павлодаре?"}
    res = client.post("/api/nl-query", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "summary" in data
    assert "sql" in data


def test_model_evaluation(client):
    res = client.get("/api/model-eval")
    assert res.status_code == 200
    data = res.json()
    assert "accuracy" in data
    assert "macroF1" in data
    assert data["accuracy"] > 0.8


def test_export_report_csv(client):
    res = client.post("/api/report", json={"format": "csv"})
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    assert "Регион" in res.text
