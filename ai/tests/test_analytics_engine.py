import sys
from pathlib import Path
from datetime import datetime, timedelta
import pandas as pd
import pytest

# Ensure src is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from src.analytics.anomaly_detector import SpikeDetector, get_demo_spikes
from src.analytics.forecaster import WorkloadForecaster
from src.analytics.nl_query_engine import ExecutiveNLQueryEngine


# ==========================================
# 1. SPIKE DETECTOR TESTS
# ==========================================

def test_spike_detector_synthetic_breakout():
    detector = SpikeDetector(baseline_days=7, threshold_sigma=2.0)
    
    # Generate 10 days of normal baseline followed by an extreme spike
    dates = [datetime(2026, 1, 1) + timedelta(days=i) for i in range(10)]
    records = []
    
    # Baseline ~10 calls per day
    for d in dates[:-1]:
        for _ in range(10):
            records.append({
                "created_at": d.strftime("%Y-%m-%d %H:%M:%S"),
                "region": "г. Кокшетау",
                "category_name_ru": "Водоснабжение и канализация"
            })
            
    # Spike day: 60 calls
    for _ in range(60):
        records.append({
            "created_at": dates[-1].strftime("%Y-%m-%d %H:%M:%S"),
            "region": "г. Кокшетау",
            "category_name_ru": "Водоснабжение и канализация"
        })
        
    df = pd.DataFrame(records)
    alerts = detector.analyze_spikes(df)
    
    assert len(alerts) > 0
    top_alert = alerts[0]
    assert top_alert["region"] == "г. Кокшетау"
    assert top_alert["category"] == "Водоснабжение и канализация"
    assert top_alert["latest_count"] == 60
    assert top_alert["z_score"] >= 2.0


def test_spike_detector_empty_and_corrupt_data():
    detector = SpikeDetector()
    assert detector.analyze_spikes(pd.DataFrame()) == []
    assert detector.analyze_spikes(pd.DataFrame({"dummy": [1, 2, 3]})) == []


def test_get_demo_spikes_fallback():
    spikes = get_demo_spikes()
    assert len(spikes) > 0
    for s in spikes:
        assert "region" in s
        assert "category" in s
        assert "z_score" in s
        assert "severity" in s


# ==========================================
# 2. WORKLOAD FORECASTER TESTS
# ==========================================

def test_forecaster_30_and_60_days():
    forecaster = WorkloadForecaster()
    
    f30 = forecaster.forecast_workload(region="Все регионы", horizon_days=30)
    assert f30["horizon_days"] == 30
    assert f30["total_predicted_appeals"] > 0
    assert f30["avg_daily_appeals"] > 0
    assert f30["recommended_total_operators"] >= 4
    assert len(f30["forecast_series"]) == 30
    assert "date" in f30["peak_day"]
    
    f60 = forecaster.forecast_workload(region="г. Караганда", horizon_days=60)
    assert f60["horizon_days"] == 60
    assert f60["total_predicted_appeals"] > 0
    assert len(f60["categories_forecast"]) >= 5


# ==========================================
# 3. EXECUTIVE NL QUERY ENGINE TESTS
# ==========================================

def test_nl_query_engine_total():
    engine = ExecutiveNLQueryEngine()
    
    # Russian query
    res_ru = engine.query("Сколько всего обращений поступило в систему?")
    assert res_ru["total_count"] >= 100000
    assert "обращений" in res_ru["answer"]
    assert res_ru["metric_type"] == "total_volume"
    
    # Kazakh query
    res_kk = engine.query("Жүйе бойынша барлығы қанша өтініш тіркелді?")
    assert res_kk["total_count"] >= 100000
    assert "өтініш" in res_kk["answer"]


def test_nl_query_engine_roads():
    engine = ExecutiveNLQueryEngine()
    
    res_kk = engine.query("Қарағанды бойынша жол мәселесі қанша?")
    assert res_kk["total_count"] > 0
    assert "жол" in res_kk["answer"].lower()
    assert res_kk["top_regions"] is not None


def test_nl_query_engine_water_and_heating():
    engine = ExecutiveNLQueryEngine()
    
    # Water query
    res_water = engine.query("Сколько жалоб на порыв труб и канализацию?")
    assert res_water["total_count"] > 0
    assert "водоснабжен" in res_water["answer"].lower() or "су" in res_water["answer"].lower()
    
    # Heating query
    res_heat = engine.query("Жылу және батареялар бойынша шағымдар қанша?")
    assert res_heat["total_count"] > 0
    assert "жылу" in res_heat["answer"].lower() or "отоплен" in res_heat["answer"].lower()
