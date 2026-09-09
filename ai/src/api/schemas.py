"""Pydantic schemas for Zerde 109 API."""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class ClassifyRequest(BaseModel):
    text: str = Field(..., description="Raw appeal text in Kazakh or Russian", json_schema_extra={"example": "Біздің аулада су жоқ, құбыр жарылып жатыр, Абай көшесі 45"})
    region: Optional[str] = Field(None, description="Region of Kazakhstan (optional)")


class EntityItem(BaseModel):
    text: str
    label: str
    start: int = 0
    end: int = 0
    score: float = 1.0


class ClassifyResponse(BaseModel):
    category: str
    category_code: str
    sub_category: str
    responsible_org: str
    priority: str
    language: str
    confidence: float
    action: str
    execution_time_seconds: float
    reasoning_summary: str
    region: Optional[str] = None
    address: Optional[str] = None
    entities: List[EntityItem] = []
    verified: bool = True
    source: str = "nlp"



class SimilarAppealsRequest(BaseModel):
    text: str = Field(..., description="Appeal text to find similar historical cases for", json_schema_extra={"example": "су жоқ үшінші күн"})
    top_k: int = Field(5, description="Number of similar cases to return")
    category: Optional[str] = None
    region: Optional[str] = None


class AppealItem(BaseModel):
    appeal_id: str
    text: str
    category: str
    sub_category: str
    responsible_org: str
    priority: str
    status: str
    action: Optional[str] = None
    score: float


class SimilarAppealsResponse(BaseModel):
    query: str
    total_found: int
    similar_appeals: List[AppealItem]


class DuplicateCheckRequest(BaseModel):
    text: str
    threshold: float = 0.88


class DuplicateCheckResponse(BaseModel):
    is_duplicate: bool
    confidence_score: float
    matched_appeals: List[AppealItem]


class OperatorSuggestRequest(BaseModel):
    appeal_text: str
    category: Optional[str] = None


class OperatorSuggestResponse(BaseModel):
    suggested_reply_kk: str
    suggested_reply_ru: str
    recommended_action: str
    assigned_service: str
    sla_hours: int


class SpikeAlert(BaseModel):
    region: str
    category: str
    latest_count: int
    baseline_mean: float
    z_score: float
    spike_ratio: str
    severity: str
    recommendation: str


class ForecastResponse(BaseModel):
    region: str
    horizon_days: int
    total_predicted_appeals: int
    avg_daily_appeals: int
    recommended_total_operators: int
    peak_day: Dict[str, Any]
    categories_forecast: List[Dict[str, Any]]
    forecast_series: List[Dict[str, Any]]


class NLQueryRequest(BaseModel):
    question: str = Field(..., description="Executive question in Kazakh or Russian", json_schema_extra={"example": "Қарағанды бойынша жол мәселесі қанша?"})



class NLQueryResponse(BaseModel):
    question: str
    answer: str
    total_count: int
    metric_type: str
    chart_type: str
    top_regions: Optional[List[Dict[str, Any]]] = None
