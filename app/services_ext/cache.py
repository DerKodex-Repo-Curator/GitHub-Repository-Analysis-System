import json
import logging
from typing import Any, Optional

from app.core.config import settings

logger = logging.getLogger(__name__)

try:
    import redis.asyncio as aioredis
    REDIS_AVAILABLE = True
except ImportError:
    aioredis = None
    REDIS_AVAILABLE = False

_redis: Optional[Any] = None


def _get_redis() -> Optional[Any]:
    global _redis
    if not REDIS_AVAILABLE:
        return None
    if _redis is None:
        try:
            _redis = aioredis.from_url(settings.redis_url, decode_responses=True)
        except Exception:
            logger.warning("Could not create Redis client; caching disabled")
    return _redis


async def cache_get(key: str) -> Optional[Any]:
    r = _get_redis()
    if r is None:
        return None
    try:
        val = await r.get(key)
        return json.loads(val) if val is not None else None
    except Exception:
        logger.warning("Cache get failed for key=%s", key)
        return None


async def cache_set(key: str, value: Any, ttl: int = 3600) -> None:
    r = _get_redis()
    if r is None:
        return
    try:
        await r.set(key, json.dumps(value), ex=ttl)
    except Exception:
        logger.warning("Cache set failed for key=%s", key)
