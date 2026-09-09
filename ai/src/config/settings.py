"""
Central configuration settings for Zerde 109 platform.
Loads from environment variables and .env file.
"""
from __future__ import annotations

import os
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
        case_sensitive=False
    )

    # Application
    app_name: str = "Zerde 109 Intelligence Platform"
    environment: str = "development"
    log_level: str = "INFO"
    api_host: str = "0.0.0.0"
    api_port: int = 8000

    # Neo4j Graph DB
    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "changeme123"
    max_neo4j_results: int = 10

    # Ollama LLM (runs on GPU 8GB VRAM)
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "qwen2.5:7b"
    ollama_timeout: int = 120

    # NLP Pipeline Settings (runs 100% on CPU)
    hybrid_confidence_threshold: float = 0.85
    kazakh_nlp_backend: str = "turkicnlp"
    russian_nlp_backend: str = "natasha"

    # Verifier Thresholds
    verifier_entropy_window: int = 50
    entropy_z_threshold: float = 2.0
    semantic_similarity_threshold: float = 0.35
    perplexity_threshold: float = 500.0


settings = Settings()

