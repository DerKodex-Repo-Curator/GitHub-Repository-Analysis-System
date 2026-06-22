# Architecture & Interview Talking Points

## Spring Boot (GraphQL)

What it is
- Java-based framework for building production-grade services; used here as the single backend.

Why used here
- Provides a typed GraphQL API, mature ecosystem, and aligns with enterprise stacks like Intuit's.

Key implementation notes
- Controllers (`@Controller`) hold GraphQL resolvers and stay thin — no business logic.
- Service layer orchestrates GitHub fetching, caching, LLM calls, and DB writes.
- Repository layer (Spring Data JPA) abstracts all SQL — method names generate queries automatically.

Interview talking points
- Explain `@QueryMapping` / `@MutationMapping` and why resolvers should delegate immediately to a service.
- Explain `@SchemaMapping` for resolving nested types (e.g. `Repository.analysis`).
- Discuss `@Async` + a custom `ThreadPoolTaskExecutor` for non-blocking background jobs.

## GraphQL

What it is
- A query language for APIs. One endpoint; clients ask for exactly the fields they need.

Why used here
- Avoids over-fetching; a single `repositories` query can include nested `analysis` in one round trip.
- GraphiQL playground at `/graphiql` makes the API self-documenting and easy to demo.

Interview talking points
- Schema-first design: `schema.graphqls` defines the contract; Java implements it.
- Explain trade-offs vs REST: no HTTP caching out of the box, but flexible queries and strong typing.
- Explain how `@SchemaMapping` prevents N+1 queries (and how DataLoader would improve it at scale).

## PostgreSQL / H2

What it is
- Relational database. H2 (file-based) for local dev, PostgreSQL for production — same code, different JDBC URL.

Why used here
- Strong ACID guarantees; JPA/Hibernate handles DDL automatically (`ddl-auto: update`).

Interview talking points
- Explain why H2 lets the project run locally with zero infrastructure.
- Discuss switching to PostgreSQL in production via a single env var (`DATASOURCE_URL`).
- Discuss indexing: `repository_id` on analyses, `language` on repositories for filtered queries.

## Redis Caching

What it is
- In-memory key/value store used as a read-through cache in front of the GitHub API.

Why used here
- GitHub rate-limits unauthenticated requests to 60/hr. Caching metadata (TTL 1hr) and READMEs (TTL 6hr) eliminates redundant calls across repeated analyses.

Interview talking points
- Cache-aside pattern: check Redis → on miss fetch from GitHub → store result → return.
- Graceful degradation: all Redis calls are wrapped in try/catch. If Redis is down, the app falls through to the live API with no failure.
- TTL strategy: shorter for metadata (stars/forks change), longer for READMEs (rarely change).

## Async Background Jobs (@Async)

What it is
- Spring's `@Async` annotation executes a method on a separate thread pool, returning immediately to the caller.

Why used here
- Analysis (GitHub fetch + LLM call) takes 2–10 seconds. Running it in a background thread lets the GraphQL mutation return instantly while analysis completes in the background.

Interview talking points
- Custom `ThreadPoolTaskExecutor` with `corePoolSize=4`, `maxPoolSize=8`, `queueCapacity=100` — tunable without code changes.
- The mutation returns a status string; the client polls `analysis(repositoryId)` to detect completion.

## LLM Integration (OpenAI)

What it is
- HTTP call to OpenAI's chat completions API via Spring's `WebClient`.

Why used here
- Generates structured analysis (summary, 0–10 complexity score, topic tags) from repo metadata and README text.

Interview talking points
- `response_format: {type: json_object}` forces structured output — no regex parsing needed.
- Stub fallback when no API key is set — the app is fully functional for demo without spending money.
- Text is truncated to 3000 chars before sending to control token cost.

## Testing & CI

What to emphasize
- GitHub Actions builds and tests on every push: `mvn package` compiles, runs unit tests, and packages the JAR.
- Maven dependency cache cuts CI time significantly on repeat runs.

Interview talking points
- Unit test services by mocking `GitHubClient` and `LlmClient` — no real network calls in tests.
- Integration tests can use H2 in-memory and a mock Redis (Testcontainers for full fidelity).

---

Use these bullets to prepare concise answers for interviews. Be able to draw the request flow:
`Browser → GraphQL mutation → RepositoryController → RepositoryService → GitHubClient (Redis cache) → LlmClient (OpenAI) → DB`
and explain each hop and why it exists.
