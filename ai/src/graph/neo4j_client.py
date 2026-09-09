"""
Neo4j knowledge graph client for Zerde 109 civic appeals platform.
Schema:
  (:Appeal {id, text, created_at, status, priority, language, source_system})
  (:Category {code, name_ru, name_kk})
  (:Region {name})
  (:Organization {name})

  (Appeal)-[:CLASSIFIED_AS {confidence, source}]->(Category)
  (Appeal)-[:LOCATED_IN]->(Region)
  (Appeal)-[:ASSIGNED_TO]->(Organization)
"""
from __future__ import annotations

import asyncio
from typing import Optional, Any
import structlog
from neo4j import AsyncGraphDatabase, AsyncDriver
from tenacity import retry, stop_after_attempt, wait_exponential

from src.config.settings import settings

log = structlog.get_logger(__name__)

_INIT_CONSTRAINTS = [
    "CREATE CONSTRAINT appeal_id IF NOT EXISTS FOR (a:Appeal) REQUIRE a.id IS UNIQUE",
    "CREATE CONSTRAINT category_code IF NOT EXISTS FOR (c:Category) REQUIRE c.code IS UNIQUE",
    "CREATE CONSTRAINT region_name IF NOT EXISTS FOR (r:Region) REQUIRE r.name IS UNIQUE",
    "CREATE CONSTRAINT org_name IF NOT EXISTS FOR (o:Organization) REQUIRE o.name IS UNIQUE",
    "CREATE INDEX appeal_created IF NOT EXISTS FOR (a:Appeal) ON (a.created_at)",
]

_SEARCH_SIMILAR_CYPHER = """
MATCH (a:Appeal)-[:CLASSIFIED_AS]->(c:Category)
OPTIONAL MATCH (a)-[:LOCATED_IN]->(r:Region)
OPTIONAL MATCH (a)-[:ASSIGNED_TO]->(o:Organization)
WHERE ($category IS NULL OR c.code = $category)
  AND ($region IS NULL OR r.name CONTAINS $region)
  AND (
    $keywords IS NULL OR size($keywords) = 0 OR
    ANY(kw IN $keywords WHERE toLower(a.text) CONTAINS toLower(kw))
  )
RETURN a.id AS appeal_id,
       a.text AS text,
       a.created_at AS created_at,
       a.priority AS priority,
       a.status AS status,
       c.code AS category_code,
       c.name_ru AS category_name,
       r.name AS region,
       o.name AS organization
ORDER BY a.created_at DESC
LIMIT $limit
"""

_CATEGORY_STATS_CYPHER = """
MATCH (a:Appeal)-[:CLASSIFIED_AS]->(c:Category)
OPTIONAL MATCH (a)-[:LOCATED_IN]->(r:Region)
WHERE ($region IS NULL OR r.name CONTAINS $region)
RETURN c.code AS category_code,
       c.name_ru AS category_name,
       count(a) AS total_count,
       count(CASE WHEN a.priority CONTAINS 'высок' OR a.priority CONTAINS 'жоғары' THEN 1 END) AS high_priority_count
ORDER BY total_count DESC
"""

_SPIKE_DETECTION_CYPHER = """
MATCH (a:Appeal)-[:CLASSIFIED_AS]->(c:Category)
OPTIONAL MATCH (a)-[:LOCATED_IN]->(r:Region)
WHERE ($region IS NULL OR r.name CONTAINS $region)
WITH c.code AS category, count(a) AS total_appeals
WHERE total_appeals > 5
RETURN category, total_appeals
ORDER BY total_appeals DESC
LIMIT 10
"""

_UPSERT_APPEAL_CYPHER = """
MERGE (a:Appeal {id: $id})
ON CREATE SET
    a.text = $text,
    a.created_at = $created_at,
    a.status = $status,
    a.priority = $priority,
    a.language = $language,
    a.source_system = $source_system
ON MATCH SET
    a.status = $status,
    a.priority = $priority

WITH a
MERGE (c:Category {code: $category_code})
ON CREATE SET c.name_ru = $category_name_ru, c.name_kk = $category_name_kk
MERGE (a)-[rc:CLASSIFIED_AS]->(c)
SET rc.confidence = $confidence, rc.source = $source

WITH a
FOREACH (_ IN CASE WHEN $region IS NOT NULL AND $region <> '' THEN [1] ELSE [] END |
    MERGE (r:Region {name: $region})
    MERGE (a)-[:LOCATED_IN]->(r)
)

WITH a
FOREACH (_ IN CASE WHEN $organization IS NOT NULL AND $organization <> '' THEN [1] ELSE [] END |
    MERGE (o:Organization {name: $organization})
    MERGE (a)-[:ASSIGNED_TO]->(o)
)

RETURN a.id AS appeal_id
"""


class ZerdeNeo4jClient:
    """Async Neo4j client for graph RAG and analytics in Zerde 109."""

    def __init__(self) -> None:
        self._driver: Optional[AsyncDriver] = None

    async def connect(self) -> bool:
        """Connects to Neo4j and initializes schema constraints."""
        try:
            self._driver = AsyncGraphDatabase.driver(
                settings.neo4j_uri,
                auth=(settings.neo4j_user, settings.neo4j_password),
                connection_timeout=2.0,
                max_connection_pool_size=25,
            )
            await self._driver.verify_connectivity()
            await self._init_schema()
            log.info("neo4j_connected", uri=settings.neo4j_uri)
            return True
        except Exception as e:
            log.warning("neo4j_connection_failed", error=str(e), uri=settings.neo4j_uri)
            if self._driver:
                try:
                    await self._driver.close()
                except Exception:
                    pass
                self._driver = None
            return False

    async def close(self) -> None:
        if self._driver:
            try:
                await self._driver.close()
            except Exception:
                pass
            self._driver = None

    async def _init_schema(self) -> None:
        if not self._driver:
            return
        async with self._driver.session() as session:
            for query in _INIT_CONSTRAINTS:
                try:
                    await session.run(query)
                except Exception as e:
                    log.debug("neo4j_constraint_init", query=query, error=str(e))

    async def is_online(self) -> bool:
        """Check if Neo4j is available."""
        if self._driver is None:
            return False
        try:
            await self._driver.verify_connectivity()
            return True
        except Exception:
            return False

    async def save_appeal(self, appeal_data: dict[str, Any]) -> bool:
        """Upserts an appeal and its relationships into Neo4j."""
        if not self._driver:
            return False

        async with self._driver.session() as session:
            await session.run(
                _UPSERT_APPEAL_CYPHER,
                id=appeal_data.get("id"),
                text=appeal_data.get("text", ""),
                created_at=str(appeal_data.get("created_at", "")),
                status=appeal_data.get("status", "NEW"),
                priority=appeal_data.get("priority", "орташа / средний"),
                language=appeal_data.get("language", "ru"),
                source_system=appeal_data.get("source_system", "Zerde 109"),
                category_code=appeal_data.get("category_code", "OTHER"),
                category_name_ru=appeal_data.get("category_name_ru", "Прочее"),
                category_name_kk=appeal_data.get("category_name_kk", "Өзге"),
                confidence=float(appeal_data.get("confidence", 1.0)),
                source=appeal_data.get("source", "nlp"),
                region=appeal_data.get("region"),
                organization=appeal_data.get("assigned_organization"),
            )
            return True

    async def search_similar(
        self,
        keywords: Optional[list[str]] = None,
        category: Optional[str] = None,
        region: Optional[str] = None,
        limit: int = 5,
    ) -> list[dict]:
        """Search similar appeals using Neo4j graph traversal."""
        if not self._driver:
            return []
        async with self._driver.session() as session:
            res = await session.run(
                _SEARCH_SIMILAR_CYPHER,
                keywords=keywords or [],
                category=category,
                region=region,
                limit=limit,
            )
            records = await res.data()
            return records

    async def get_category_stats(self, region: Optional[str] = None) -> list[dict]:
        """Calculates real category breakdown from knowledge graph."""
        if not self._driver:
            return []
        async with self._driver.session() as session:
            res = await session.run(_CATEGORY_STATS_CYPHER, region=region)
            return await res.data()

    async def get_spike_data(self, region: Optional[str] = None) -> list[dict]:
        """Fetches spike analytics across categories."""
        if not self._driver:
            return []
        async with self._driver.session() as session:
            res = await session.run(_SPIKE_DETECTION_CYPHER, region=region)
            return await res.data()

    def format_context(self, records: list[dict]) -> str:
        """Formats graph search results into a clean context prompt for LLM."""
        if not records:
            return "Обращений по данному вопросу в базе не обнаружено."
        lines = ["[Контекст из Графа инцидентов Zerde 109]"]
        for i, r in enumerate(records, 1):
            cat = r.get("category_name") or r.get("category_code", "")
            reg = r.get("region") or "Не указан"
            org = r.get("organization") or "Не назначена"
            pri = r.get("priority") or "орташа"
            lines.append(
                f"{i}. ID: {r.get('appeal_id')} | Категория: {cat} | Регион: {reg} | Приоритет: {pri} | Орг: {org}\n"
                f"   Текст: {r.get('text', '')[:160]}..."
            )
        return "\n".join(lines)
