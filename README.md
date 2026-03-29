# GeoScope

An interactive 3D globe that visualizes global news sentiment in real time. News articles are scraped from RSS feeds worldwide. Click any country to explore AI-generated briefs, articles, and sentiment analysis.

## Tech Stack

- **Frontend:** React, Three.js / React Three Fiber, Zustand, Tailwind CSS, Vite
- **Backend:** Node.js, Express, TypeScript, PostgreSQL, Redis
- **News Source:** RSS scraping (Google News, BBC, Al Jazeera, NYT, Guardian, Sky News)
- **AI Briefs:** Google Gemini API

## Prerequisites

- [Node.js](https://nodejs.org/) v18+ (or [Bun](https://bun.sh/))
- [Docker](https://www.docker.com/) (for Redis and PostgreSQL, or run them natively)
- A [Gemini API](https://aistudio.google.com/apikey) key (free tier — only needed for AI briefs)

## Setup

### 1. Database & Redis

Start Redis with Docker:

```bash
cd geoscope-backend
docker compose up -d
```

You also need a PostgreSQL database. You can run one locally, use Docker, or use a hosted service. The backend will auto-create all tables on first startup.

### 2. Backend

```bash
cd geoscope-backend
npm install
```

Create a `.env` file:

```
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://user:password@localhost:5432/geoscope
INGEST_API_KEY=any-secret-string-here
REDIS_URL=redis://localhost:6379
GEMINI_API_KEY=your-gemini-key
```

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | Yes | Server port (default 3000) |
| `NODE_ENV` | Yes | `development`, `test`, or `production` |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `INGEST_API_KEY` | Yes | Secret key for the admin ingest endpoint |
| `REDIS_URL` | No | Redis URL for caching (gracefully disabled if omitted) |
| `GEMINI_API_KEY` | Yes | Google Gemini API key for AI-generated briefs |

Start the backend:

```bash
npm run dev
```

The API runs at `http://localhost:3000`. Verify with `http://localhost:3000/api/health`.

On startup, the backend automatically scrapes news for all countries via RSS feeds and populates the database. This runs in the background and takes a few minutes to complete. No manual ingestion trigger is needed.

### 3. Frontend

```bash
cd frontend/geoscope
npm install
npm run dev
```

Opens at `http://localhost:5173`. The frontend proxies API requests to `localhost:3000`. If the backend is unavailable, it falls back to built-in mock data.

The globe will progressively populate with sentiment dots as the backend finishes scraping each country.

To point at a different backend URL, create a `.env.local`:

```
VITE_API_URL=http://your-backend-url:3000
```

## How It Works

1. **RSS Scraping** — The backend scrapes Google News RSS (per country) plus global feeds from BBC, Al Jazeera, NYT, Guardian, and Sky News. Articles are matched to countries by name and stored in PostgreSQL.
2. **Sentiment Analysis** — Each article is scored using keyword-based sentiment analysis combined with provider tone scores. Country-level sentiment is the average across all articles.
3. **3D Globe** — The frontend renders an interactive Three.js globe with sentiment-colored dots for each country. Click a dot to zoom in and see articles, briefs, and comparisons.
4. **AI Briefs** — Country briefs are generated on-demand using the Gemini API, summarizing the latest news for that country.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Server + Redis status |
| GET | `/api/news/:countryCode` | News articles for a country |
| GET | `/api/news/:countryCode?topic=Economy` | Filter by topic |
| GET | `/api/brief/:countryCode` | AI-generated country brief |
| GET | `/api/sentiment/global` | Sentiment scores for all tracked countries |
| GET | `/api/compare/:countryA/:countryB` | Side-by-side country comparison |
| POST | `/api/admin/ingest` | Manually trigger news ingestion (requires `X-Ingest-Key` header) |

## Build for Production

```bash
# Backend
cd geoscope-backend
npm run build
npm start

# Frontend
cd frontend/geoscope
npm run build
npm run preview
```
