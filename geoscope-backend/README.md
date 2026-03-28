# GeoScope Backend

GeoScope is a hackathon-speed backend for an interactive globe news app. It exposes REST endpoints for country news, AI-generated briefs, sentiment heatmap data, and country comparison, with Redis caching and provider fallbacks built in.

## Stack

- Node.js + TypeScript
- Express
- Redis
- Zod
- Native `fetch`
- Helmet, CORS, rate limiting
- Vitest + Supertest

## Project Layout

```text
.
|-- docker-compose.yml
|-- package.json
|-- README.md
|-- src
|   |-- app.ts
|   |-- index.ts
|   |-- controllers
|   |-- lib
|   |-- middleware
|   |-- providers
|   |-- routes
|   |-- schemas
|   |-- services
|   |-- types
|   `-- utils
`-- tests
```

## Environment Variables

Copy `.env.example` to `.env` and set:

```env
PORT=3000
NODE_ENV=development
REDIS_URL=redis://localhost:6379
NEWS_API_KEY=your-newsapi-key
OPENAI_API_KEY=your-openai-key
```

## Local Development

1. Install Node.js 20+.
2. Start Redis:

```bash
docker compose up -d redis
```

3. Install dependencies:

```bash
npm install
```

4. Start the API:

```bash
npm run dev
```

The server listens on `http://localhost:3000` by default.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run typecheck
npm run test
```

## API Endpoints

### Health

```bash
curl http://localhost:3000/api/health
```

### Country News

```bash
curl "http://localhost:3000/api/news/US?limit=5&topic=climate"
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

## Notes

- News provider strategy is `NewsAPI -> GDELT` fallback.
- AI brief generation uses OpenAI structured JSON output and falls back to a deterministic headline-based summary if the AI provider fails.
- Cache TTLs are 15 minutes for news, brief, and compare, and 30 minutes for global sentiment.
- Geo coordinates are preserved when available from a provider and otherwise fall back to tracked-country centroids or `null`.
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
