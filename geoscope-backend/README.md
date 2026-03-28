# GeoScope Backend

GeoScope is a hackathon-speed backend for an interactive globe news app. It exposes REST endpoints for stored country news, AI-generated briefs, sentiment heatmap data, and country comparison, with Postgres-backed reads and scheduled ingestion.

## Stack

- Bun + TypeScript
- Express
- Postgres
- Redis (optional cache)
- Zod
- Native `fetch`
- Helmet, CORS, rate limiting
- Vitest + Supertest

## Project Layout

```text
.
|-- docker-compose.yml
|-- package.json
|-- bun.lock
|-- README.md
|-- src
|   |-- app.ts
|   |-- index.ts
|   |-- controllers
|   |-- lib
|   |-- middleware
|   |-- providers
|   |-- repositories
|   |-- routes
|   |-- schemas
|   |-- services
|   |-- types
|   `-- utils
`-- tests
```

## Environment Variables

Copy [`.env.example`](/Users/jacksangl/hack_psu/geoscope-backend/.env.example) to `.env` and set:

```env
PORT=3000
NODE_ENV=development
DATABASE_URL=postgres://...
INGEST_API_KEY=replace-with-a-long-random-secret
GEMINI_API_KEY=your-gemini-key
REDIS_URL=redis://localhost:6379
NEWS_API_KEY=
```

`DATABASE_URL`, `INGEST_API_KEY`, and `GEMINI_API_KEY` are required. `REDIS_URL` and `NEWS_API_KEY` are optional in the current v1 flow.

## Local Development

1. Install Bun 1.3+.
2. Start Postgres and, if you want caching enabled locally, Redis:

```bash
docker compose up -d
```

3. Install dependencies:

```bash
bun install
```

4. Start the API. Migrations run automatically on boot:

```bash
bun run dev
```

The server listens on `http://localhost:3000` by default.

## Scripts

```bash
bun run dev
bun run build
bun run start
bun run typecheck
bun run test
```

## API Endpoints

### Health

```bash
curl http://localhost:3000/api/health
```

### Country News

```bash
curl "http://localhost:3000/api/news/US?limit=5"
```

### Country Brief

```bash
curl http://localhost:3000/api/brief/US
```

### Global Sentiment

```bash
curl http://localhost:3000/api/sentiment/global
```

### Country Comparison

```bash
curl http://localhost:3000/api/compare/US/JP
```

### Manual Ingest

```bash
curl -X POST "http://localhost:3000/api/admin/ingest?countryCode=US" \
  -H "X-Ingest-Key: your-ingest-key"
```

Configure external cron to call that admin route every 3 hours for scheduled ingestion.

## Notes

- Public read routes serve from Postgres, not from live provider fetches.
- Scheduled ingestion is `GDELT`-first in the current v1 flow.
- AI brief generation uses Gemini and falls back to a deterministic headline-based summary if the AI provider fails.
- Redis is optional and is used as a cache layer only; correctness does not depend on it.
- Geo coordinates are preserved when available from a provider and otherwise fall back to country centroids or `null`.
- All errors use the shape:

```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "Request validation failed.",
    "details": {}
  }
}
```
