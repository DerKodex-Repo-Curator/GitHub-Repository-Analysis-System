# RepoLens — GitHub Repository Analyzer

A full-stack portfolio project demonstrating production-style backend engineering. Paste a GitHub URL, get an AI-generated summary, complexity score, and topic breakdown — served through a **Spring Boot GraphQL gateway** and a **FastAPI analysis service**.

---

## Architecture

```
Browser (RepoLens UI)
        │
        ├─── REST ──────────► FastAPI :8000  ──► SQLite / PostgreSQL
        │                         │
        │                         ├─── GitHub API (cached in Redis)
        │                         └─── OpenAI API (LLM analysis)
        │
        └─── GraphQL ───────► Spring Boot :8080 ──► PostgreSQL (shared read model)
                                    │
                                    └─── HTTP ──► FastAPI :8000 (mutations)
```

Both services share the same database. FastAPI owns all writes; Spring reads via JPA and proxies mutations to FastAPI.

---

## Tech Stack

| Layer | Technology |
|---|---|
| GraphQL gateway | Spring Boot 3.2, Spring for GraphQL, Spring Data JPA |
| Analysis service | FastAPI, SQLAlchemy 2.0 async, Alembic, httpx |
| Database | SQLite (local dev) / PostgreSQL (production) |
| Caching | Redis — GitHub API responses cached with per-resource TTLs |
| LLM | OpenAI `gpt-4o-mini` (falls back to a deterministic stub if no API key) |
| Frontend | Vanilla JS, Tailwind CSS |
| CI | GitHub Actions — pytest + Maven build |

---

## Local Setup

**Prerequisites:** Python 3.11+, Java 17+, Maven

```bash
# 1. Clone and install Python dependencies
pip install -r requirements.txt

# 2. Copy env file (SQLite is the default — no database install required)
cp .env.example .env

# 3. Run database migrations
PYTHONPATH=. alembic upgrade head

# 4. Start FastAPI  (http://localhost:8000)
PYTHONPATH=. uvicorn app.main:app --reload --port 8000

# 5. Open the UI
open frontend/index.html   # or just double-click it
```

**Optional — Spring Boot GraphQL gateway:**
```bash
cd spring-service && mvn spring-boot:run
# GraphQL Playground: http://localhost:8080/graphiql
```

**Optional — Redis caching:**
```bash
redis-server
# Add REDIS_URL=redis://localhost:6379 to .env
# Without Redis the app works fine; GitHub API calls just skip the cache
```

**Optional — OpenAI analysis:**
```bash
# Add to .env:
OPENAI_API_KEY=sk-...
# Without it the app uses a built-in stub that returns placeholder text
```

---

## FastAPI Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/repositories` | Register a GitHub repo by URL |
| `GET` | `/api/repositories` | List all tracked repos |
| `GET` | `/api/repositories/{id}` | Get a single repo |
| `POST` | `/api/analyze/{id}` | Trigger background LLM analysis |
| `GET` | `/api/analyze/{id}` | Fetch the latest analysis result |

Auto-generated docs: `http://localhost:8000/docs`

---

## GraphQL Examples

Run these in GraphQL Playground at `http://localhost:8080/graphiql`:

```graphql
# Add a repository
mutation {
  addRepository(githubUrl: "https://github.com/tiangolo/fastapi") {
    id
    name
    language
    stars
  }
}

# List repositories (optional language filter)
query {
  listRepositories(language: "Python", limit: 10) {
    id
    name
    stars
    language
  }
}

# Trigger analysis
mutation {
  triggerAnalysis(repositoryId: "REPO_ID_HERE") {
    id
    summary
    complexityScore
    topics
  }
}

# Fetch analysis
query {
  getAnalysis(repositoryId: "REPO_ID_HERE") {
    summary
    complexityScore
    topics
    createdAt
  }
}
```

---

## Design Decisions

**FastAPI for the analysis service** — Python's async ecosystem (httpx, OpenAI SDK) is the natural fit for a service that chains external HTTP calls. Pydantic gives request validation and auto-generated OpenAPI docs for free.

**Spring Boot + GraphQL as the gateway** — demonstrates an enterprise-grade typed API layer in Java. Resolvers stay thin (delegate to service/repository layers); mutations proxy to FastAPI rather than duplicating write logic.

**Shared database, separate concerns** — one PostgreSQL instance (SQLite locally) acts as the read model for Spring and the write store for FastAPI. Schema evolution is handled by Alembic migrations; Spring's `ddl-auto: none` ensures it never touches the schema.

**Redis caching in front of GitHub API** — metadata is cached for 1 hour, READMEs for 6 hours. The cache layer is a transparent wrapper: if Redis is unavailable, calls fall through to the live API with no user-visible failure.

**Repository + usecase pattern in FastAPI** — `crud.py` handles raw DB access, `analysis_usecase.py` orchestrates the full pipeline (fetch → LLM → store). Business logic stays out of route handlers and is independently testable.

**LLM stub for local dev** — if `OPENAI_API_KEY` is absent the service returns deterministic placeholder output so the full UI flow works without an API key or network access.

---

## Project Structure

```
├── app/                        # FastAPI service
│   ├── api/                    # Route handlers and Pydantic schemas
│   ├── db/                     # SQLAlchemy models, CRUD, session
│   ├── usecases/               # Analysis orchestration
│   ├── services_ext/           # GitHub client, LLM, Redis cache
│   └── core/config.py          # Pydantic settings (env-based)
├── spring-service/             # Spring Boot GraphQL gateway
│   └── src/main/
│       ├── java/.../           # Controllers, services, JPA repos, WebClient
│       └── resources/
│           ├── application.yml
│           └── graphql/schema.graphqls
├── frontend/                   # Static UI (no build step)
│   ├── index.html
│   └── main.js
├── alembic/                    # Database migrations
├── tests/                      # Pytest fixtures and route tests
└── .github/workflows/ci.yml    # GitHub Actions CI
```
