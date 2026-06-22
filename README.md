# RepoLens — GitHub Repository Analyzer

A portfolio project demonstrating production-style backend engineering in Java. Paste a GitHub URL, get an AI-generated summary, complexity score (0–10), and topic tags — served through a **Spring Boot GraphQL API** backed by **PostgreSQL**, **Redis**, and **OpenAI**.

---

## Architecture

```
Browser (RepoLens UI)
        │
        └──► Spring Boot :8080
                  │
                  ├── GraphQL API  (resolvers → service → JPA)
                  ├── GitHub API   (WebClient + Redis cache)
                  ├── OpenAI API   (WebClient, gpt-4o-mini)
                  └── H2 / PostgreSQL  (Spring Data JPA)
```

**Request flow for analysis:**
1. `addRepository` mutation → fetch GitHub metadata (cached in Redis) → save to DB
2. `analyzeRepository` mutation → queue `@Async` background job → return immediately
3. Background job → fetch GitHub README (cached) → call OpenAI → write `Analysis` row to DB
4. Client polls `analysis(repositoryId)` query until result appears

---

## Tech Stack

| Layer | Technology |
|---|---|
| API | Spring Boot 3.2, Spring for GraphQL |
| Database | Spring Data JPA + H2 (local) / PostgreSQL (prod) |
| Caching | Spring Data Redis — TTL 1hr (metadata), 6hr (READMEs) |
| HTTP client | Spring WebFlux `WebClient` |
| Async jobs | Spring `@Async` with custom `ThreadPoolTaskExecutor` |
| LLM | OpenAI `gpt-4o-mini` (falls back to stub if no key) |
| Boilerplate | Lombok (`@Data`, `@Builder`) |
| Frontend | Vanilla JS + Tailwind CSS |
| CI | GitHub Actions — Maven build + test on every push |

---

## Local Setup

**Prerequisites:** Java 17+, Maven

```bash
# 1. Clone the repo
git clone <repo-url> && cd repolens

# 2. Copy env file (H2 is the default — no database install needed)
cp .env.example .env

# 3. Start the server
cd spring-service
mvn spring-boot:run
```

Open `frontend/index.html` in your browser — that's the UI.

**GraphQL Playground** is available at `http://localhost:8080/graphiql`.

**H2 Console** (inspect the local database) at `http://localhost:8080/h2-console`
- JDBC URL: `jdbc:h2:file:./repolens-dev`
- Username: `sa`, Password: _(empty)_

**Optional — Redis caching:**
```bash
# Install Redis (macOS)
brew install redis && brew services start redis

# Install Redis (Windows)
winget install Redis.Redis

# Without Redis the app works fine; GitHub API calls just skip the cache
```

**Optional — OpenAI analysis:**
```
# Add to .env:
OPENAI_API_KEY=sk-...
```
Without it the app returns a stub message instead of real analysis.

**Production (PostgreSQL):**
```
DATASOURCE_URL=jdbc:postgresql://localhost:5432/repolens
DATASOURCE_USERNAME=postgres
DATASOURCE_PASSWORD=yourpassword
```

---

## GraphQL API

Run queries in the playground at `http://localhost:8080/graphiql`.

```graphql
# Add a repository
mutation {
  addRepository(githubUrl: "https://github.com/spring-projects/spring-boot") {
    id
    name
    language
    stars
  }
}

# Trigger analysis (runs in background — poll for results)
mutation {
  analyzeRepository(id: "REPO_ID_HERE")
}

# Poll for analysis result
query {
  analysis(repositoryId: "REPO_ID_HERE") {
    summary
    complexityScore
    topics
    analyzedAt
  }
}

# List all repositories (optional language filter)
query {
  repositories(language: "Java", limit: 10) {
    id
    name
    stars
    language
    analysis {
      complexityScore
      topics
    }
  }
}
```

---

## Project Structure

```
spring-service/src/main/java/com/githubanalysis/
├── RepoLensApplication.java       # @SpringBootApplication + @EnableAsync
├── config/
│   └── AppConfig.java             # WebClient bean, async thread pool executor
├── model/
│   ├── RepositoryEntity.java      # JPA entity (Lombok @Data @Builder)
│   └── AnalysisEntity.java        # JPA entity + getTopics() for GraphQL
├── repository/
│   ├── RepositoryRepository.java  # Spring Data JPA (findByLanguage auto-generated)
│   └── AnalysisRepository.java    # Spring Data JPA (findByRepositoryId)
├── client/
│   ├── GitHubClient.java          # WebClient calls + Redis read-through cache
│   └── LlmClient.java             # OpenAI chat completions via WebClient
├── service/
│   ├── RepositoryService.java     # Orchestrates add/list/get + triggers analysis
│   └── AnalysisService.java       # @Async pipeline: GitHub → LLM → DB
└── controller/
    └── RepositoryController.java  # GraphQL resolvers (@QueryMapping @MutationMapping)

spring-service/src/main/resources/
├── application.yml                # Config (datasource, Redis, GraphiQL, async)
└── graphql/schema.graphqls        # GraphQL schema (source of truth)

frontend/
├── index.html                     # Tailwind UI
└── main.js                        # GraphQL client — fetch, poll, render
```

---

## Design Decisions

**Spring Boot as the single service** — one deployable, one language. Simpler to run, easier to explain, and appropriate for an enterprise Java stack. A separate Python microservice would add complexity without adding value here.

**GraphQL over REST** — clients fetch exactly what they need. The nested `Repository.analysis` query eliminates a round trip the frontend would otherwise need. `@SchemaMapping` resolves nested types cleanly without N+1 queries at this scale.

**`@Async` for analysis jobs** — analysis takes 2–10 seconds (GitHub + OpenAI). Running it on a background thread lets the mutation return immediately. The client polls `analysis(repositoryId)` at 2.5s intervals until the result appears.

**Redis as a transparent cache layer** — all Redis calls are wrapped in try/catch so the app degrades gracefully if Redis is unavailable. TTLs are resource-specific: 1hr for metadata (stars/forks change), 6hr for READMEs (rarely change).

**H2 for local dev** — no PostgreSQL installation required to run the project. Switching to PostgreSQL in production requires one env var change (`DATASOURCE_URL`). Same JPA code, same schema.

**LLM stub fallback** — if `OPENAI_API_KEY` is absent, `LlmClient` returns a deterministic stub. The full UI flow works without spending money on API calls during development.
