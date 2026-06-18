# Architecture & Interview Talking Points

This document provides concise interview-style talking points for each major technology and design decision in the GitHub Engineering Assistant project.

## Spring Boot (GraphQL)

What it is
- Java-based framework for building production-grade REST/GraphQL services.

Why used here
- Provides a typed, enterprise-ready GraphQL gateway; aligns with hiring stacks that value Java/Spring.

Key implementation notes
- Controllers (resolvers) delegate to `service` layer; business logic is not in resolvers.
- Uses Spring Data JPA for read-only access against the shared Postgres DB.

Interview talking points
- Explain `@QueryMapping` and `@MutationMapping` and why resolvers should be thin.
- Discuss how you'd handle pagination, error mapping, and batching for GraphQL.

## GraphQL

What it is
- A query language and runtime for APIs, enabling clients to request exactly the data they need.

Why used here
- Simplifies frontend integrations by returning precise shapes; GraphQL Playground is useful for demos.

Interview talking points
- Explain schema design: types, queries, mutations and how to model relations (Repository -> Analysis).
- Explain trade-offs vs REST (caching complexity, overfetching vs underfetching).

## PostgreSQL

What it is
- Reliable relational database, used for persistent storage of repository and analysis records.

Why used here
- Strong ACID guarantees, array/JSON support for analysis `topics`, and wide industry adoption.

Interview talking points
- Explain normalization vs denormalization choices; why you might store analyses in a separate table.
- Discuss indexing strategies for common queries (e.g., index by `repository_id`, `language`, or `created_at`).

## FastAPI

What it is
- Modern Python ASGI framework with fast async support and Pydantic validation.

Why used here
- Best fit for integrating Python ML libraries, async I/O for GitHub and Chroma calls.

Interview talking points
- Describe dependency injection via `Depends` and startup/shutdown events used for DB engine lifecycle.
- Explain how Pydantic models become the API contract and auto-generate OpenAPI docs.

## Redis Caching

What it is
- An in-memory key/value store used here as a read-through cache in front of the GitHub API.

Why used here
- GitHub's API rate limits (60 req/hr unauthenticated, 5000/hr authenticated) become a bottleneck when repeatedly analyzing repos. Caching metadata (TTL 1 hr) and READMEs (TTL 6 hr) eliminates redundant network calls and keeps analysis fast.

Interview talking points
- Explain the cache-aside pattern: check cache → on miss, fetch from source and populate cache → return result.
- Discuss TTL strategy: shorter TTLs for frequently-changing data (stars, forks), longer for stable data (READMEs).
- Explain graceful degradation: the cache layer is a transparent wrapper — if Redis is down, calls fall through to the live API with no user-visible failure.
- Discuss cache invalidation: when a re-analysis is triggered, you could explicitly delete the cache keys to force a fresh fetch.

## Microservices design

What it is
- Split services by responsibility: GraphQL gateway vs AI analysis service.

Why used here
- Separation of concerns, language-appropriate tools (Java for GraphQL gateway, Python for AI), and independent scaling.

Interview talking points
- How would you handle shared DB consistency, cross-service transactions, and eventual consistency for analyses?
- How to implement authentication/authorization across services (JWT, API gateway), and rate-limiting for external API calls.

## Testing & CI considerations

What to emphasize
- Unit tests for business logic; integration tests for DB interactions; mock external HTTP/LLM calls.

CI pipeline talking points
- Run unit tests for FastAPI (pytest) and build Spring service (mvn package) in separate jobs.
- Use SQLite in-process and mocked external calls (GitHub, OpenAI, Chroma) to keep CI fast and dependency-free.

---

Use these bullets to prepare concise answers for interviews; you should be able to draw a simple diagram and walk through a request from client -> GraphQL -> service -> DB / FastAPI, and explain why the split exists, how data flows, and how you'd improve or scale the system.
