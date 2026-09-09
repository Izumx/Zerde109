"""
Migration script: Loads unified_appeals.parquet into Neo4j Knowledge Graph.
Supports batching and progress tracking.
Usage:
    python -m src.graph.migrate_parquet --limit 5000
    python -m src.graph.migrate_parquet --all
"""
from __future__ import annotations

import argparse
import asyncio
import time
import pandas as pd
import structlog
from neo4j import AsyncGraphDatabase

from src.config.settings import settings

log = structlog.get_logger(__name__)

_BATCH_UPSERT_CYPHER = """
UNWIND $batch AS item
MERGE (a:Appeal {id: item.appeal_id})
ON CREATE SET
    a.text = item.text,
    a.created_at = item.created_at,
    a.status = item.status,
    a.priority = item.priority,
    a.language = item.language,
    a.source_system = item.source_system

WITH a, item
MERGE (c:Category {code: item.category_code})
ON CREATE SET c.name_ru = item.category_name_ru, c.name_kk = item.category_name_kk
MERGE (a)-[rc:CLASSIFIED_AS]->(c)
SET rc.confidence = 1.0, rc.source = 'historical_dataset'

WITH a, item
FOREACH (_ IN CASE WHEN item.region IS NOT NULL AND item.region <> '' THEN [1] ELSE [] END |
    MERGE (r:Region {name: item.region})
    MERGE (a)-[:LOCATED_IN]->(r)
)

WITH a, item
FOREACH (_ IN CASE WHEN item.responsible_org IS NOT NULL AND item.responsible_org <> '' THEN [1] ELSE [] END |
    MERGE (o:Organization {name: item.responsible_org})
    MERGE (a)-[:ASSIGNED_TO]->(o)
)
"""


async def migrate_data(parquet_path: str = "data/unified_appeals.parquet", limit: int | None = 5000, batch_size: int = 500):
    print(f"Loading parquet data from {parquet_path}...")
    df = pd.read_parquet(parquet_path)
    if limit:
        df = df.head(limit)

    total_records = len(df)
    print(f"Total records to migrate: {total_records}")

    driver = AsyncGraphDatabase.driver(
        settings.neo4j_uri,
        auth=(settings.neo4j_user, settings.neo4j_password),
    )

    try:
        await driver.verify_connectivity()
        print("Connected to Neo4j successfully!")
    except Exception as e:
        print(f"Failed to connect to Neo4j at {settings.neo4j_uri}: {e}")
        return

    start_time = time.time()
    migrated = 0

    # Ensure constraints exist
    constraints = [
        "CREATE CONSTRAINT appeal_id IF NOT EXISTS FOR (a:Appeal) REQUIRE a.id IS UNIQUE",
        "CREATE CONSTRAINT category_code IF NOT EXISTS FOR (c:Category) REQUIRE c.code IS UNIQUE",
        "CREATE CONSTRAINT region_name IF NOT EXISTS FOR (r:Region) REQUIRE r.name IS UNIQUE",
        "CREATE CONSTRAINT org_name IF NOT EXISTS FOR (o:Organization) REQUIRE o.name IS UNIQUE",
    ]
    async with driver.session() as session:
        for cql in constraints:
            try:
                await session.run(cql)
            except Exception:
                pass

    # Batch migration
    for i in range(0, total_records, batch_size):
        chunk = df.iloc[i : i + batch_size].to_dict(orient="records")
        # Ensure strings for dates and null handling
        for row in chunk:
            row["created_at"] = str(row.get("created_at", ""))
            row["region"] = str(row.get("region", "")) if pd.notna(row.get("region")) else ""
            row["responsible_org"] = str(row.get("responsible_org", "")) if pd.notna(row.get("responsible_org")) else ""
            row["text"] = str(row.get("text", ""))[:1500]

        async with driver.session() as session:
            await session.run(_BATCH_UPSERT_CYPHER, batch=chunk)

        migrated += len(chunk)
        elapsed = time.time() - start_time
        print(f"Migrated {migrated}/{total_records} appeals ({migrated/elapsed:.1f} rec/s)...")

    print(f"Migration completed! {migrated} appeals in {time.time() - start_time:.2f}s")
    await driver.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migrate appeals to Neo4j")
    parser.add_argument("--limit", type=int, default=5000, help="Number of records to migrate (0 for all)")
    args = parser.parse_args()
    limit = None if args.limit == 0 else args.limit
    asyncio.run(migrate_data(limit=limit))
