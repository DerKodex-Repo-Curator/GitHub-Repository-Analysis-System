import logging

from app.services_ext.github_client import fetch_repo_metadata, fetch_repo_readme
from app.services_ext.llm import call_llm_for_analysis
from app.db import crud

logger = logging.getLogger(__name__)


async def analyze_repository(session, repository):
    if "/" in repository.name:
        owner, repo = repository.name.split("/", 1)
    else:
        owner = repo = repository.name

    metadata = await fetch_repo_metadata(owner, repo)
    readme = await fetch_repo_readme(owner, repo) or ""
    text = f"{metadata.get('description', '')}\n\n{readme}"

    summary, complexity_score, topics = call_llm_for_analysis(text)

    return await crud.create_analysis(session, repository.id, summary, complexity_score, topics, None)
