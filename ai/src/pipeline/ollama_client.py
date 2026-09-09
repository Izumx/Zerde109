"""
Asynchronous Ollama client for Zerde 109.
Handles LLM classification fallback and executive RAG question answering.
Target LLM runs on GPU (RTX 4070 8GB VRAM).
"""
from __future__ import annotations

import json
from typing import AsyncIterator, Optional

import aiohttp
import structlog
from tenacity import retry, stop_after_attempt, wait_exponential

from src.config.settings import settings

log = structlog.get_logger(__name__)

_CLASSIFY_SYSTEM_PROMPT = """Сіз Қазақстанның 109 бірыңғай байланыс орталығының сарапшысысыз.
Вы эксперт контакт-центра 109 в Казахстане.

Ваша задача — классифицировать обращение гражданина строго в одну из 12 категорий:
- WATER_SEWAGE (Водоснабжение и канализация / Сумен жабдықтау және кәріз)
- HEATING (Теплоснабжение и отопление / Жылумен жабдықтау)
- ELECTRICITY (Электроснабжение / Электрмен жабдықтау)
- LIGHTING (Освещение улиц и дворов / Жарықтандыру)
- ROADS (Дороги и тротуары / Жолдар мен тротуарлар)
- WASTE (Вывоз мусора, ТБО / Қоқыс шығару)
- LANDSCAPING (Благоустройство, озеленение, детские площадки / Абаттандыру)
- PUBLIC_TRANSPORT (Общественный транспорт / Қоғамдық көлік)
- GAS (Газоснабжение / Газбен жабдықтау)
- VET_ANIMALS (Отлов бродячих животных / Жануарларды аулау)
- INFO_CONSULT (Справочная информация / Анықтама)
- OTHER (Прочее / Өзге)

Ответьте ТОЛЬКО в формате JSON:
{
  "category_code": "КОД_КАТЕГОРИИ",
  "priority": "жоғары / высокий" | "орташа / средний" | "төмен / низкий",
  "assigned_organization": "Название организации",
  "confidence": 0.85
}
"""

_RAG_SYSTEM_PROMPT = """Сіз Қазақстан қалалары әкімдігінің Ситуациялық орталығының (109) сарапшы аналитигісіз.
Вы аналитик Ситуационного центра 109 при акимате.
Отвечайте на основе предоставленного контекста из графа знаний Neo4j.
Если контекст неполон, честно укажите это. Давайте краткие, управленческие выводы для руководства.
"""


class ZerdeOllamaClient:
    """Async Ollama client with robust error handling and domain prompts."""

    def __init__(self, base_url: Optional[str] = None, model: Optional[str] = None) -> None:
        self.base_url = base_url or settings.ollama_base_url
        self.model = model or settings.ollama_model
        self.timeout = settings.ollama_timeout
        self._session: Optional[aiohttp.ClientSession] = None

    async def _get_session(self) -> aiohttp.ClientSession:
        if self._session is None or self._session.closed:
            timeout = aiohttp.ClientTimeout(total=self.timeout)
            self._session = aiohttp.ClientSession(timeout=timeout)
        return self._session

    async def close(self) -> None:
        if self._session and not self._session.closed:
            await self._session.close()

    async def is_online(self) -> bool:
        """Check if Ollama server is responding with a fast 2-second timeout."""
        try:
            fast_timeout = aiohttp.ClientTimeout(total=2.0)
            async with aiohttp.ClientSession(timeout=fast_timeout) as session:
                async with session.get(f"{self.base_url}/api/tags") as resp:
                    return resp.status == 200
        except Exception:
            return False

    @retry(stop=stop_after_attempt(2), wait=wait_exponential(min=1, max=4), reraise=False)
    async def generate(self, prompt: str, system: Optional[str] = None) -> str:
        """Non-streaming text generation."""
        session = await self._get_session()
        payload = {
            "model": self.model,
            "prompt": prompt,
            "system": system or _RAG_SYSTEM_PROMPT,
            "stream": False,
            "options": {
                "temperature": 0.2,
                "top_p": 0.9,
                "num_ctx": 4096,
            },
        }
        url = f"{self.base_url}/api/generate"
        async with session.post(url, json=payload) as resp:
            resp.raise_for_status()
            data = await resp.json()
            return data.get("response", "")

    async def classify_appeal(self, text: str) -> Optional[dict]:
        """Classifies appeal text using LLM structured output."""
        prompt = f"Текст обращения гражданина:\n«««\n{text}\n»»»\n\nКлассифицируй и верни JSON:"
        try:
            raw_response = await self.generate(prompt=prompt, system=_CLASSIFY_SYSTEM_PROMPT)
            # Clean JSON formatting
            cleaned = raw_response.strip()
            if "```json" in cleaned:
                cleaned = cleaned.split("```json")[1].split("```")[0].strip()
            elif "```" in cleaned:
                cleaned = cleaned.split("```")[1].split("```")[0].strip()

            data = json.loads(cleaned)
            return data
        except Exception as e:
            log.warning("ollama_classify_error", error=str(e))
            return None

    def build_rag_prompt(self, query: str, graph_context: str) -> str:
        """Builds prompt for situational center queries."""
        lines = [
            f"Запрос руководителя/аналитика: {query}\n",
            "=== Данные из Графа инцидентов Neo4j ===",
            graph_context if graph_context else "Нет прямых совпадений в графе.",
            "========================================",
            "\nПодготовьте четкий аналитический ответ со статистикой, выявленными аномалиями и рекомендациями.",
        ]
        return "\n".join(lines)
