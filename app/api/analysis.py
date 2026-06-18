from fastapi import APIRouter, Depends, BackgroundTasks, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_async_session
from app.db import crud
from app.usecases.analysis_usecase import analyze_repository
from app.api import schemas

router = APIRouter()


@router.post("/analyze/{repo_id}", response_model=schemas.AnalysisOut)
async def analyze_endpoint(repo_id: str, background_tasks: BackgroundTasks, session: AsyncSession = Depends(get_async_session)):
    repo = await crud.get_repository(session, repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    background_tasks.add_task(analyze_repository, session, repo)

    analysis = await crud.get_analysis_by_repository(session, repo_id)
    if analysis:
        return analysis
    return {"id": "", "repository_id": repo_id, "summary": "Analysis queued", "complexity_score": 0.0, "topics": [], "created_at": None}


@router.get("/analyze/{repo_id}", response_model=schemas.AnalysisOut)
async def get_analysis(repo_id: str, session: AsyncSession = Depends(get_async_session)):
    analysis = await crud.get_analysis_by_repository(session, repo_id)
    if not analysis:
        raise HTTPException(status_code=404, detail="No analysis found for this repository")
    return analysis
