from pydantic import BaseModel, HttpUrl, Field


class RepositoryCreate(BaseModel):
    github_url: HttpUrl = Field(..., description="A valid GitHub repository URL")
    description: str | None = Field(None, max_length=280)


class RepositoryOut(BaseModel):
    id: str
    github_url: HttpUrl
    name: str
    description: str | None
    stars: int | None = None
    language: str | None = None
    last_analyzed: str | None = None
    created_at: str | None = None

    model_config = {"from_attributes": True}


class AnalysisOut(BaseModel):
    id: str
    repository_id: str
    summary: str
    complexity_score: float
    topics: list | None = None
    embedding_id: str | None = None
    created_at: str | None = None

    model_config = {"from_attributes": True}
