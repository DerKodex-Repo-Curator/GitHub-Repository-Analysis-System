import base64
import httpx
import logging
from typing import Optional

from app.core.config import settings
from app.services_ext.cache import cache_get, cache_set

logger = logging.getLogger(__name__)

_META_TTL = 3600       # 1 hour — repo stats change occasionally
_README_TTL = 21600    # 6 hours — READMEs change rarely


def _headers() -> dict:
    if settings.github_token:
        return {"Authorization": f"Bearer {settings.github_token}"}
    return {}


async def fetch_repo_metadata(owner: str, repo: str) -> dict:
    key = f"github:meta:{owner}:{repo}"
    cached = await cache_get(key)
    if cached is not None:
        logger.debug("Cache hit for %s", key)
        return cached

    async with httpx.AsyncClient(timeout=30.0, headers=_headers()) as client:
        r = await client.get(f"https://api.github.com/repos/{owner}/{repo}")
    if r.status_code == 200:
        data = r.json()
        await cache_set(key, data, ttl=_META_TTL)
        return data
    logger.warning("Failed to fetch repo metadata %s/%s status=%s", owner, repo, r.status_code)
    return {}


async def fetch_repo_readme(owner: str, repo: str) -> Optional[str]:
    key = f"github:readme:{owner}:{repo}"
    cached = await cache_get(key)
    if cached is not None:
        logger.debug("Cache hit for %s", key)
        return cached

    async with httpx.AsyncClient(timeout=30.0, headers=_headers()) as client:
        r = await client.get(f"https://api.github.com/repos/{owner}/{repo}/readme")
    if r.status_code == 200:
        content = base64.b64decode(r.json().get("content", "")).decode(errors="ignore")
        await cache_set(key, content, ttl=_README_TTL)
        return content
    logger.warning("Failed to fetch README %s/%s status=%s", owner, repo, r.status_code)
    return None
