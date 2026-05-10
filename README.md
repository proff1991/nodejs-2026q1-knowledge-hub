# Knowledge Hub API

REST API for a **Knowledge Hub** platform built with **NestJS**, **TypeScript**, **PostgreSQL**, **Prisma ORM**, and **Google Gemini API**.

This repository contains the implementation up to **10-ai-rag-vectordb**.

## Very Quick Start

For reviewers who want to run the project quickly from a clean checkout.

```powershell
npm install
```
```powershell
cp .env.example .env
```
Open `.env` and set your real Gemini API key:

```dotenv
GEMINI_API_KEY=your-real-gemini-api-key
```
```powershell
docker compose up --build
```
```powershell
docker compose ps
```
All three services should be healthy:
```text
knowledge-hub-db        (healthy)
knowledge-hub-vectordb  (healthy)
knowledge-hub-app       (healthy)
```
```powershell
npx prisma migrate deploy
```
```powershell
npx prisma db seed
```
```powershell
$login = Invoke-RestMethod `
    -Uri "http://localhost:4000/auth/login" `
    -Method Post `
    -ContentType "application/json" `
    -Body '{"login":"admin","password":"admin123"}'
$token = $login.accessToken
```
## Table of Contents

- [Very Quick Start](#very-quick-start)
- [Stack](#stack)
- [Implemented features](#implemented-features)
- [Default seeded users](#default-seeded-users)
- [Environment variables](#environment-variables)
- [Gemini API key setup](#gemini-api-key-setup)
- [Installation](#installation)
- [Local development](#local-development)
- [Docker Compose](#docker-compose)
- [Prisma commands](#prisma-commands)
- [Swagger](#swagger)
- [Auth flow](#auth-flow)
- [Protected routes](#protected-routes)
- [Main API routes](#main-api-routes)
- [AI API routes](#ai-api-routes)
- [RAG and Vector Database API routes](#rag-and-vector-database-api-routes)
- [Manual RAG checks](#manual-rag-checks)
- [Manual AI checks](#manual-ai-checks)
- [AI caching](#ai-caching)
- [AI known limitations](#ai-known-limitations)
- [RAG known limitations](#rag-known-limitations)
- [Logging](#logging)
- [Error handling](#error-handling)
- [Manual checks](#manual-checks)
- [Testing](#testing)
- [Available scripts](#available-scripts)
- [Troubleshooting](#troubleshooting)
- [Notes](#notes)

## Stack

- Node.js **24.10.0+**
- NestJS
- TypeScript
- PostgreSQL
- Prisma ORM
- Swagger / OpenAPI
- JWT authentication and authorization
- Google Gemini API integration through HTTP API
- Google Gemini embeddings for semantic retrieval
- Qdrant external vector database
- RAG over Knowledge Hub articles
- AI-powered article summarization, translation, analysis, and generic generation
- In-memory AI rate limiting, caching, usage tracking, diagnostics, RAG chat memory, and short-term conversation context
- Custom application logger
- Centralized error handling
- File logging with rotation
- Vitest unit tests
- Jest e2e tests for previous/auth-related assignments
- Docker / Docker Compose

## Implemented features

### Core resources

The API provides CRUD operations for:

- `user`
- `article`
- `category`
- `comment`

### AI integration

Implemented for the `09-ai-llm-integration` assignment:

- `POST /ai/articles/:articleId/summarize`
- `POST /ai/articles/:articleId/translate`
- `POST /ai/articles/:articleId/analyze`
- `POST /ai/generate`
- `GET /ai/usage`
- `GET /ai/diagnostics`

AI features:

- real article data is loaded from the Knowledge Hub database;
- Gemini requests are performed through HTTP API with Node.js `fetch`;
- Gemini API key, base URL, model, cache TTL, and rate limit are configurable through `.env`;
- prompt templates are stored outside controllers;
- request bodies and route params are validated through DTO classes and the global validation pipe;
- AI routes are available to authenticated users;
- in-memory rate limiting is applied to AI routes;
- `Retry-After` header is returned when the local AI RPM limit is exceeded;
- summarize and translate responses are cached in memory;
- cache keys include article id, request params, and article `updatedAt` value;
- AI usage is tracked in memory since service startup;
- token usage is tracked when Gemini returns `usageMetadata`;
- Gemini timeout, network, auth, quota, and upstream errors are handled gracefully;
- Gemini transient errors are retried with exponential backoff;
- analyze response is validated as structured JSON and safely falls back to plain text analysis;
- diagnostics include model, base URL, API key presence, rate limit, cache stats, usage stats, latency metrics, and conversation memory stats;
- `/ai/generate` supports session-based short-term conversation context.

### RAG and vector database integration

Implemented for the `10-ai-rag-vectordb` assignment:

- `POST /ai/rag/index`
- `POST /ai/rag/search`
- `POST /ai/rag/chat`
- `GET /ai/rag/chat/:conversationId/history`
- `DELETE /ai/rag/index/articles/:articleId`

RAG features:

- Knowledge Hub articles are loaded from PostgreSQL through Prisma;
- by default only `published` articles are indexed;
- article text is split into deterministic chunks;
- chunk size and overlap are configurable through `.env`;
- Gemini embeddings are used for document chunks and user queries;
- Qdrant is used as an external vector database in Docker Compose;
- vector payload stores article id, title, status, category id, tags, chunk index, chunk text, and update timestamp;
- semantic search returns ranked chunks with article attribution;
- RAG chat retrieves relevant chunks, builds a grounded prompt, generates an answer with Gemini, and returns sources used for the answer;
- RAG chat stores short-term in-memory conversation history by `conversationId`;
- RAG endpoints are protected by JWT authentication and AI rate limiting;
- vector database and Gemini outages are handled with `503` responses and safe logs;
- full reindex recreates the Qdrant collection to avoid stale vectors;
- selective reindex deletes old vectors for requested article ids before indexing current article content;
- article vector deletion returns `204` when vectors are removed and `404` when index entries are not found.

### Database

- PostgreSQL is used as the main database.
- Prisma schema includes:
  - `User`
  - `Article`
  - `Category`
  - `Comment`
  - `Tag`
  - `RefreshToken`
- Prisma migrations are committed to the repository.
- Seed script is available.
- Frequently queried fields are indexed.
- Article tags are handled through a many-to-many relation with `Tag`.

### Authentication and authorization

Implemented for the JWT authentication assignment:

- `POST /auth/signup`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- password hashing with `bcrypt`
- JWT access token
- JWT refresh token
- refresh token rotation and invalidation
- protected private routes
- Swagger Bearer JWT authorization through the `Authorize` button
- RBAC:
  - `viewer` — read only
  - `editor` — own content
  - `admin` — full access
- rate limiting for:
  - `POST /auth/signup`
  - `POST /auth/login`

AI routes are protected by JWT authentication and are available to every authenticated user.

### Logging and error handling

Implemented for the 08b logging/errors assignment and extended for AI usage:

- custom Nest logger configured through `LOG_LEVEL`
- console logging
- file logging to `logs/app.log`
- log file rotation through `LOG_MAX_FILE_SIZE`
- incoming HTTP request logging
- outgoing HTTP response logging
- Docker healthcheck request logging is skipped to avoid log spam
- sensitive data sanitization in logs
- Gemini API keys and sensitive headers are never logged in plain text
- global exception filter with consistent error response shape
- custom application error classes
- process-level handlers for:
  - `uncaughtException`
  - `unhandledRejection`

### Additional functionality

- DTO validation through global `ValidationPipe`
- password stripping from responses through `PasswordExcludeInterceptor`
- pagination for list endpoints
- sorting for list endpoints
- article filtering by:
  - `status`
  - `categoryId`
  - `tag`
- Swagger UI at `/doc`
- cascading/nullify behavior for related entities

## Default seeded users

The seed script creates these users:

| Login | Password | Role |
| --- | --- | --- |
| `admin` | `admin123` | `admin` |
| `editor` | `editor123` | `editor` |

Passwords are stored in the database as hashes.

## Environment variables

Use `.env.example` as a template:

```bash
cp .env.example .env
```

Example `.env` for local development:

```env
PORT=4000

CRYPT_SALT=10

JWT_SECRET=secret123123
JWT_REFRESH_SECRET=secret123123
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d

JWT_SECRET_KEY=secret123123
JWT_SECRET_REFRESH_KEY=secret123123
TOKEN_EXPIRE_TIME=15m
TOKEN_REFRESH_EXPIRE_TIME=7d

POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=knowledge_hub
POSTGRES_HOST=db
POSTGRES_PORT=5432

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/knowledge_hub?schema=public

LOG_LEVEL=log
LOG_MAX_FILE_SIZE=1048576

GEMINI_API_KEY=your-gemini-api-key
GEMINI_API_BASE_URL=https://generativelanguage.googleapis.com
GEMINI_MODEL=gemini-2.5-flash
GEMINI_EMBEDDING_MODEL=gemini-embedding-001

AI_RATE_LIMIT_RPM=20
AI_CACHE_TTL_SEC=300

RAG_VECTOR_DB_PROVIDER=qdrant
RAG_VECTOR_DB_URL=http://vectordb:6333
RAG_VECTOR_COLLECTION=knowledge_hub_articles
RAG_CHUNK_SIZE=800
RAG_CHUNK_OVERLAP=200
RAG_CONVERSATION_MAX_MESSAGES=20
```

### Database connection notes

- For **local Nest app + Dockerized PostgreSQL**, use `localhost` in `DATABASE_URL`.
- For **app running inside Docker Compose**, database host is `db`.
- `.env` must not be committed.

### Gemini environment variables

| Variable | Description | Default / example |
| --- | --- | --- |
| `GEMINI_API_KEY` | Google Gemini API key from Google AI Studio | `your-gemini-api-key` |
| `GEMINI_API_BASE_URL` | Gemini API base URL | `https://generativelanguage.googleapis.com` |
| `GEMINI_MODEL` | Gemini model used for answer generation | `gemini-2.5-flash` |
| `GEMINI_EMBEDDING_MODEL` | Gemini model used for document and query embeddings | `gemini-embedding-001` |
| `AI_RATE_LIMIT_RPM` | Maximum number of AI/RAG requests per authenticated user per minute | `20` |
| `AI_CACHE_TTL_SEC` | In-memory cache TTL for summarize/translate responses | `300` |

The assignment listed the `"gemini-2.0-flash"` model as an example, but neither I nor any other students in the Discord chat had any free tokens for that model. So, I chose the `"gemini-2.5-flash"` model as the default.

In the `.env.example` file, the model is defined as follows:

```env
GEMINI_MODEL=gemini-2.5-flash
```

If this model has no available quota for your account or region, another model available to your API key can be used locally, for example:

```env
GEMINI_MODEL=gemini-3-flash-preview
```

Do not commit a real Gemini API key. Keep the real value only in local `.env`.

### RAG environment variables

| Variable | Description | Default / example |
| --- | --- | --- |
| `RAG_VECTOR_DB_PROVIDER` | Vector database provider name | `qdrant` |
| `RAG_VECTOR_DB_URL` | Qdrant URL used by the app inside Docker Compose | `http://vectordb:6333` |
| `RAG_VECTOR_COLLECTION` | Qdrant collection name for Knowledge Hub article chunks | `knowledge_hub_articles` |
| `RAG_CHUNK_SIZE` | Maximum chunk size used during article indexing | `800` |
| `RAG_CHUNK_OVERLAP` | Text overlap between neighboring chunks | `200` |
| `RAG_CONVERSATION_MAX_MESSAGES` | Maximum number of messages kept in RAG chat memory | `20` |

When the application runs inside Docker Compose, use the service hostname in `RAG_VECTOR_DB_URL`:

```env
RAG_VECTOR_DB_URL=http://vectordb:6333
```

When checking Qdrant from the host machine, use:

```text
http://localhost:6333
```

### Logging environment variables

`LOG_LEVEL` controls which messages are written by the application logger.

Supported levels:

```text
debug
verbose
log
warn
error
fatal
```

Recommended default:

```env
LOG_LEVEL=log
```

`LOG_MAX_FILE_SIZE` controls log file rotation size in bytes.

Example:

```env
LOG_MAX_FILE_SIZE=1048576
```

This value means that `logs/app.log` is rotated after it reaches about 1 MB.

For manual rotation testing, a smaller value can be used:

```env
LOG_MAX_FILE_SIZE=1000
```

## Gemini API key setup

### 1. Open Google AI Studio

Go to Google AI Studio:

```text
https://aistudio.google.com/
```

Sign in with your Google account.

### 2. Create an API key

In Google AI Studio:

```text
Get API key -> Create API key
```

Create or select a Google Cloud project when asked.

### 3. Copy the API key

Copy the generated key.

### 4. Paste it into local `.env`

Open `.env` and set:

```env
GEMINI_API_KEY=<your real Gemini API key>
```

Keep this value private. Do not paste the real key into `.env.example`, README, pull request description, screenshots, logs, or Discord messages.

### 5. Check available models manually

You can check which models your key can see:

```bash
curl --ssl-no-revoke "https://generativelanguage.googleapis.com/v1beta/models?key=$GEMINI_API_KEY"
```

On Windows, `--ssl-no-revoke` may be needed only for manual `curl` diagnostics when the system TLS certificate revocation check fails.

The application itself does not use `curl` and does not need this flag.

### 6. Check real generation manually

Example request directly to Gemini:

```bash
curl --ssl-no-revoke -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=$GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [
      {
        "parts": [
          {
            "text": "Say hello in one short sentence."
          }
        ]
      }
    ],
    "generationConfig": {
      "maxOutputTokens": 50
    }
  }'
```

If this returns quota errors such as `RESOURCE_EXHAUSTED`, `limit: 0`, or `429 Too Many Requests`, the API key is valid but the selected model/free tier quota is not available for that project/account/region. Try another available model in local `.env`, for example:

```env
GEMINI_MODEL=gemini-3-flash-preview
```

## Installation

```bash
npm install
```

## Local development

### 1. Start PostgreSQL in Docker

```bash
docker compose up -d db
```

### 2. Generate Prisma Client

```bash
npx prisma generate
```

### 3. Apply migrations

```bash
npx prisma migrate dev
```

### 4. Run seed

```bash
npx prisma db seed
```

### 5. Configure Gemini

Copy `.env.example` to `.env` and set the real Gemini API key:

```env
GEMINI_API_KEY=<your real Gemini API key>
GEMINI_API_BASE_URL=https://generativelanguage.googleapis.com
GEMINI_MODEL=gemini-2.5-flash
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
AI_RATE_LIMIT_RPM=20
AI_CACHE_TTL_SEC=300
RAG_VECTOR_DB_PROVIDER=qdrant
RAG_VECTOR_DB_URL=http://vectordb:6333
RAG_VECTOR_COLLECTION=knowledge_hub_articles
RAG_CHUNK_SIZE=800
RAG_CHUNK_OVERLAP=200
RAG_CONVERSATION_MAX_MESSAGES=20
```

If `gemini-2.5-flash` has no free-tier quota for your account, use another available model locally:

```env
GEMINI_MODEL=gemini-3-flash-preview
```

### 6. Start the application

```bash
npm run start:dev
```

The API will be available at:

- `http://localhost:4000/`
- Swagger: `http://localhost:4000/doc`

## Docker Compose

Build and start the application together with PostgreSQL and Qdrant:

```bash
docker compose up --build
```

Stop containers:

```bash
docker compose down
```

Stop containers and remove PostgreSQL volume:

```bash
docker compose down -v
```

Run with optional Adminer profile:

```bash
docker compose --profile debug up --build
```

Adminer will be available at:

```text
http://localhost:8080
```

The production Docker image runs the application under a non-root user and creates `/app/logs` with write permissions for that user.

## Prisma commands

Generate Prisma Client:

```bash
npx prisma generate
```

Create and apply a migration:

```bash
npx prisma migrate dev --name <migration_name>
```

Apply committed migrations:

```bash
npx prisma migrate deploy
```

Reset database, re-apply migrations, and run seed:

```bash
npx prisma migrate reset --force
```

Run seed only:

```bash
npx prisma db seed
```

Open Prisma Studio:

```bash
npx prisma studio
```

## Swagger

Swagger UI is available at:

```text
http://localhost:4000/doc
```

JWT Bearer authorization is configured in Swagger.

Use `POST /auth/login` to get an access token, then click **Authorize** in Swagger UI and paste the access token.

When using Swagger UI, paste only the token value, without the `Bearer` prefix. Swagger will automatically send requests with this header:

```http
Authorization: Bearer <accessToken>
```

## Auth flow

### Signup

```http
POST /auth/signup
Content-Type: application/json

{
  "login": "new_user",
  "password": "secret123"
}
```

### Login

```http
POST /auth/login
Content-Type: application/json

{
  "login": "admin",
  "password": "admin123"
}
```

Successful response:

```json
{
  "accessToken": "<accessToken>",
  "refreshToken": "<refreshToken>"
}
```

### Refresh tokens

```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "<refreshToken>"
}
```

### Logout

```http
POST /auth/logout
Content-Type: application/json

{
  "refreshToken": "<refreshToken>"
}
```

## Protected routes

All private routes require an access token in the `Authorization` header:

```http
Authorization: Bearer <accessToken>
```

Public routes:

- `GET /`
- `GET /doc`
- `POST /auth/signup`
- `POST /auth/login`
- `POST /auth/refresh`

## Main API routes

### Users

```text
GET    /user
GET    /user/:id
POST   /user
PUT    /user/:id
DELETE /user/:id
```

### Articles

```text
GET    /article
GET    /article/:id
POST   /article
PUT    /article/:id
DELETE /article/:id
```

Article filters:

```text
GET /article?status=published
GET /article?categoryId=<categoryId>
GET /article?tag=nodejs
```

### Categories

```text
GET    /category
GET    /category/:id
POST   /category
PUT    /category/:id
DELETE /category/:id
```

### Comments

```text
GET    /comment?articleId=<articleId>
GET    /comment/:id
POST   /comment
DELETE /comment/:id
```

## AI API routes

All AI routes require an access token.

AI routes are protected by JWT authentication and additionally limited by `AI_RATE_LIMIT_RPM`.

### Generic AI generation

```text
POST /ai/generate
```

Request body:

```json
{
  "prompt": "Explain Nest.js dependency injection in 3 sentences.",
  "maxOutputTokens": 300,
  "temperature": 0.4
}
```

Response example:

```json
{
  "text": "Nest.js uses dependency injection to provide class dependencies automatically...",
  "model": "gemini-2.5-flash",
  "sessionId": "a4281ddf-ad0c-451d-b68a-e113e165c3a5"
}
```

### Generic AI generation with conversation context

The first request may omit `sessionId`. The response contains a generated `sessionId`.

First request:

```json
{
  "prompt": "For this session, remember that my favorite backend framework is Nest.js. Reply with OK.",
  "maxOutputTokens": 100,
  "temperature": 0.2
}
```

Second request using the same `sessionId`:

```json
{
  "sessionId": "a4281ddf-ad0c-451d-b68a-e113e165c3a5",
  "prompt": "What is my favorite backend framework in this session?",
  "maxOutputTokens": 100,
  "temperature": 0.2
}
```

The generic endpoint stores short-term in-memory session context. It is not persisted to the database and is lost when the application restarts.

### Summarize article

```text
POST /ai/articles/:articleId/summarize
```

Request body:

```json
{
  "maxLength": "short"
}
```

`maxLength` is optional. Supported values:

```text
short
medium
detailed
```

Default value:

```text
medium
```

Response example:

```json
{
  "articleId": "85fd9189-41cc-4c19-b567-b5f4c98dfb06",
  "summary": "TypeScript improves maintainability in backend services.",
  "originalLength": 60,
  "summaryLength": 56
}
```

### Translate article

```text
POST /ai/articles/:articleId/translate
```

Request body:

```json
{
  "targetLanguage": "Esperanto",
  "sourceLanguage": "English"
}
```

`targetLanguage` is required.

`sourceLanguage` is optional. If it is omitted, the prompt asks Gemini to detect the source language automatically.

Response example:

```json
{
  "articleId": "85fd9189-41cc-4c19-b567-b5f4c98dfb06",
  "translatedText": "Kial TypeScript plibonigas konserveblecon en backend-projektoj.",
  "detectedLanguage": "English"
}
```

### Analyze article

```text
POST /ai/articles/:articleId/analyze
```

Request body:

```json
{
  "task": "review"
}
```

`task` is optional. Supported values:

```text
review
bugs
optimize
explain
```

Default value:

```text
review
```

Response example:

```json
{
  "articleId": "85fd9189-41cc-4c19-b567-b5f4c98dfb06",
  "analysis": "The article content is too short and needs more detail.",
  "suggestions": [
    "Add examples.",
    "Explain the main idea in more detail."
  ],
  "severity": "warning"
}
```

The analyze endpoint asks Gemini to return JSON and validates the response shape before returning it to the client. If Gemini returns invalid JSON or an unexpected shape, the API safely falls back to plain text analysis with empty suggestions and `info` severity.

### AI usage tracking

```text
GET /ai/usage
```

Response example:

```json
{
  "usage": {
    "startedAt": "2026-05-03T15:02:52.859Z",
    "totalRequests": 3,
    "requestsByEndpoint": {
      "generate": 0,
      "summarize": 3,
      "translate": 0,
      "analyze": 0
    },
    "tokenUsage": {
      "promptTokenCount": 59,
      "candidatesTokenCount": 8,
      "totalTokenCount": 107
    }
  },
  "cache": {
    "size": 1,
    "hits": 1,
    "misses": 2,
    "hitRatio": 0.3333333333333333,
    "ttlSeconds": 300
  }
}
```

Usage statistics are stored in memory and reset when the application restarts.

### AI diagnostics

```text
GET /ai/diagnostics
```

Response example:

```json
{
  "model": "gemini-2.5-flash",
  "baseUrl": "https://generativelanguage.googleapis.com",
  "hasApiKey": true,
  "rateLimitRpm": 20,
  "cache": {
    "size": 0,
    "hits": 0,
    "misses": 0,
    "hitRatio": 0,
    "ttlSeconds": 300
  },
  "usage": {
    "startedAt": "2026-05-03T17:26:38.141Z",
    "totalRequests": 2,
    "requestsByEndpoint": {
      "generate": 2,
      "summarize": 0,
      "translate": 0,
      "analyze": 0
    },
    "tokenUsage": {
      "promptTokenCount": 146,
      "candidatesTokenCount": 14,
      "totalTokenCount": 236
    }
  },
  "observability": {
    "metricsByEndpoint": {
      "generate": {
        "totalCalls": 2,
        "successCalls": 2,
        "failedCalls": 0,
        "averageLatencyMs": 866,
        "minLatencyMs": 800,
        "maxLatencyMs": 932
      }
    }
  },
  "conversationContext": {
    "activeSessions": 1,
    "totalMessages": 4,
    "maxMessagesPerSession": 10,
    "maxSessions": 100
  }
}
```

Diagnostics intentionally returns only `hasApiKey: true/false` and never returns the actual API key.

## RAG and Vector Database API routes

All RAG routes require an access token.

RAG routes are protected by JWT authentication and additionally limited by `AI_RATE_LIMIT_RPM`.

### Build or refresh RAG index

```text
POST /ai/rag/index
```

Request body:

```json
{
  "onlyPublished": true
}
```

Selective reindex is also supported:

```json
{
  "onlyPublished": true,
  "articleIds": [
    "d19bf1c3-ad1e-4688-b9ec-483a1e2cabb0"
  ]
}
```

Response example:

```json
{
  "indexedArticles": 2,
  "indexedChunks": 2,
  "vectorCollection": "knowledge_hub_articles"
}
```

Full reindex recreates the Qdrant collection before upserting fresh vectors. This prevents stale chunks from remaining in search results after articles are updated, deleted, or moved out of the published status.

### Semantic RAG search

```text
POST /ai/rag/search
```

Request body:

```json
{
  "query": "How does Prisma work with PostgreSQL?",
  "limit": 5
}
```

Optional metadata filters:

```json
{
  "query": "authentication",
  "limit": 5,
  "articleStatus": "published",
  "categoryId": "550e8400-e29b-41d4-a716-446655440000",
  "tags": [
    "nestjs",
    "auth"
  ]
}
```

Response example:

```json
{
  "results": [
    {
      "articleId": "d19bf1c3-ad1e-4688-b9ec-483a1e2cabb0",
      "articleTitle": "Prisma with PostgreSQL",
      "chunk": "Title: Prisma with PostgreSQL...",
      "similarity": 0.72
    }
  ]
}
```

If `query` is missing, the API returns `400 Bad Request`.

### RAG chat

```text
POST /ai/rag/chat
```

Request body:

```json
{
  "question": "What does Knowledge Hub say about Prisma and PostgreSQL?"
}
```

Response example:

```json
{
  "answer": "Knowledge Hub says that Prisma is used with PostgreSQL...",
  "sources": [
    {
      "articleId": "d19bf1c3-ad1e-4688-b9ec-483a1e2cabb0",
      "articleTitle": "Prisma with PostgreSQL",
      "relevantChunk": "Title: Prisma with PostgreSQL..."
    }
  ],
  "conversationId": "30d70301-8eb3-4af8-a819-fad5ad3042bb"
}
```

Continue the same conversation by sending `conversationId`:

```json
{
  "question": "Can you explain it in simpler words?",
  "conversationId": "30d70301-8eb3-4af8-a819-fad5ad3042bb"
}
```

If `question` is missing, the API returns `400 Bad Request`.

### RAG chat history

```text
GET /ai/rag/chat/:conversationId/history
```

Response example:

```json
{
  "conversationId": "30d70301-8eb3-4af8-a819-fad5ad3042bb",
  "messages": [
    {
      "role": "user",
      "content": "What does Knowledge Hub say about Prisma and PostgreSQL?",
      "createdAt": "2026-05-10T14:18:35.890Z"
    },
    {
      "role": "assistant",
      "content": "Knowledge Hub says that Prisma is used with PostgreSQL...",
      "createdAt": "2026-05-10T14:18:37.124Z"
    }
  ]
}
```

RAG conversation history is stored in memory and is lost when the application restarts.

### Delete article vectors from RAG index

```text
DELETE /ai/rag/index/articles/:articleId
```

Expected successful response:

```text
204 No Content
```

If vectors for the article are not found, the API returns:

```text
404 Not Found
```

## Manual RAG checks

### 1. Start Docker Compose

```bash
docker compose up --build
```

Check that all required containers are healthy:

```bash
docker compose ps
```

Expected services:

```text
knowledge-hub-db
knowledge-hub-vectordb
knowledge-hub-app
```

### 2. Check Qdrant from host machine

```bash
curl http://localhost:6333/healthz
```

Expected response:

```text
healthz check passed
```

Check Qdrant collections:

```bash
curl http://localhost:6333/collections
```

### 3. Check that app can reach Qdrant inside Docker Compose network

```bash
docker compose exec app node -e "fetch('http://vectordb:6333/healthz').then(r=>r.text()).then(console.log).catch(console.error)"
```

Expected response:

```text
healthz check passed
```

### 4. Apply migrations and seed data

```bash
npx prisma migrate deploy
npx prisma db seed
```

For a clean database:

```bash
npx prisma migrate reset --force
```

### 5. Login and get access token in PowerShell

```powershell
$login = Invoke-RestMethod `
    -Uri "http://localhost:4000/auth/login" `
    -Method Post `
    -ContentType "application/json" `
    -Body '{"login":"admin","password":"admin123"}'

$token = $login.accessToken
$token
```

### 6. Build RAG index

```powershell
Invoke-RestMethod `
    -Uri "http://localhost:4000/ai/rag/index" `
    -Method Post `
    -Headers @{ Authorization = "Bearer $token" } `
    -ContentType "application/json" `
    -Body '{"onlyPublished":true}' | ConvertTo-Json -Depth 20
```

Expected response:

```json
{
  "indexedArticles": 2,
  "indexedChunks": 2,
  "vectorCollection": "knowledge_hub_articles"
}
```

The exact numbers may differ when seed data or article content changes.

### 7. Check Qdrant collection

```bash
curl http://localhost:6333/collections
```

```bash
curl http://localhost:6333/collections/knowledge_hub_articles
```

`points_count` should be greater than `0` after successful indexing.

`indexed_vectors_count` can be `0` for a very small collection because Qdrant may skip building a separate vector index below its indexing threshold.

### 8. Test semantic search

```powershell
$search = Invoke-RestMethod `
    -Uri "http://localhost:4000/ai/rag/search" `
    -Method Post `
    -Headers @{ Authorization = "Bearer $token" } `
    -ContentType "application/json" `
    -Body '{"query":"How does Prisma work with PostgreSQL?","limit":5}'

$search | ConvertTo-Json -Depth 20
```

### 9. Test RAG chat

```powershell
$chat = Invoke-RestMethod `
    -Uri "http://localhost:4000/ai/rag/chat" `
    -Method Post `
    -Headers @{ Authorization = "Bearer $token" } `
    -ContentType "application/json" `
    -Body '{"question":"What does Knowledge Hub say about Prisma and PostgreSQL?"}'

$chat | ConvertTo-Json -Depth 20
```

### 10. Test RAG chat history

```powershell
$history = Invoke-RestMethod `
    -Uri "http://localhost:4000/ai/rag/chat/$($chat.conversationId)/history" `
    -Method Get `
    -Headers @{ Authorization = "Bearer $token" }

$history | ConvertTo-Json -Depth 20
```

### 11. Test validation errors

Windows PowerShell 5.1 does not support `-SkipHttpErrorCheck`, so `400` responses can be checked with `try/catch`:

```powershell
try {
    Invoke-WebRequest `
        -Uri "http://localhost:4000/ai/rag/search" `
        -Method Post `
        -Headers @{ Authorization = "Bearer $token" } `
        -ContentType "application/json" `
        -Body '{}'
} catch {
    $response = $_.Exception.Response
    $statusCode = [int]$response.StatusCode

    Write-Host "StatusCode: $statusCode"
}
```

Expected status:

```text
StatusCode: 400
```

### 12. Test delete endpoint

```powershell
$articleId = $search.results[0].articleId

Invoke-WebRequest `
    -Uri "http://localhost:4000/ai/rag/index/articles/$articleId" `
    -Method Delete `
    -Headers @{ Authorization = "Bearer $token" }
```

Expected status:

```text
204 No Content
```

Repeated deletion should return `404`:

```powershell
try {
    Invoke-WebRequest `
        -Uri "http://localhost:4000/ai/rag/index/articles/$articleId" `
        -Method Delete `
        -Headers @{ Authorization = "Bearer $token" }
} catch {
    $response = $_.Exception.Response
    $statusCode = [int]$response.StatusCode

    Write-Host "StatusCode: $statusCode"
}
```

Expected status:

```text
StatusCode: 404
```

After testing delete, rebuild the index if more RAG checks are needed:

```powershell
Invoke-RestMethod `
    -Uri "http://localhost:4000/ai/rag/index" `
    -Method Post `
    -Headers @{ Authorization = "Bearer $token" } `
    -ContentType "application/json" `
    -Body '{"onlyPublished":true}' | ConvertTo-Json -Depth 20
```

## Manual AI checks

### 1. Login and get access token

```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "login": "admin",
    "password": "admin123"
  }'
```

Use the returned `accessToken` in the next requests:

```http
Authorization: Bearer <accessToken>
```

### 2. Get article id

```bash
curl http://localhost:4000/article \
  -H "Authorization: Bearer <accessToken>"
```

### 3. Test summarize

```bash
curl -X POST http://localhost:4000/ai/articles/<articleId>/summarize \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <accessToken>" \
  -d '{
    "maxLength": "short"
  }'
```

### 4. Test translate

```bash
curl -X POST http://localhost:4000/ai/articles/<articleId>/translate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <accessToken>" \
  -d '{
    "targetLanguage": "Esperanto",
    "sourceLanguage": "English"
  }'
```

### 5. Test analyze

```bash
curl -X POST http://localhost:4000/ai/articles/<articleId>/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <accessToken>" \
  -d '{
    "task": "review"
  }'
```

### 6. Test generic generate

```bash
curl -X POST http://localhost:4000/ai/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <accessToken>" \
  -d '{
    "prompt": "Explain Nest.js dependency injection in 3 sentences.",
    "maxOutputTokens": 300,
    "temperature": 0.4
  }'
```

### 7. Test AI validation error

Missing `targetLanguage` must return `400`:

```bash
curl -X POST http://localhost:4000/ai/articles/<articleId>/translate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <accessToken>" \
  -d '{}'
```

### 8. Test article not found

Unknown article id must return `404`:

```bash
curl -X POST http://localhost:4000/ai/articles/11111111-1111-4111-8111-111111111111/summarize \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <accessToken>" \
  -d '{
    "maxLength": "short"
  }'
```

### 9. Test local AI rate limit

Temporarily set in `.env`:

```env
AI_RATE_LIMIT_RPM=2
```

Restart the application and call an AI endpoint three times in one minute. The third request should return:

```text
HTTP/1.1 429 Too Many Requests
Retry-After: <seconds>
```

Then restore:

```env
AI_RATE_LIMIT_RPM=20
```

## AI caching

The application caches responses for:

- `POST /ai/articles/:articleId/summarize`
- `POST /ai/articles/:articleId/translate`

Cache behavior:

- in-memory only;
- TTL is controlled by `AI_CACHE_TTL_SEC`;
- deterministic key includes:
  - endpoint name;
  - article id;
  - article `updatedAt`;
  - request params.

Including `updatedAt` prevents stale cached AI responses after the article is updated.

## AI known limitations

- Gemini free-tier quotas depend on Google account, project, model, billing status, and region.
- A key may successfully list available models but still have `limit: 0` for `generateContent` on a specific model.
- Gemini may return `429 RESOURCE_EXHAUSTED` when quota is not available or is exceeded.
- Some regions may not have access to Google AI Studio or Gemini API free tier.
- AI responses are probabilistic and may vary between requests.
- AI calls may add latency to API responses.
- In-memory cache, usage tracking, rate limit buckets, diagnostics, and conversation context are reset when the application restarts.
- Conversation context for `/ai/generate` is short-term only and is not persisted to the database.
- The application never logs or returns the real Gemini API key.

## RAG known limitations

- RAG quality depends on indexed article content. If article content is short or outdated, answers can be incomplete.
- Gemini free-tier quotas can limit indexing and chat requests because both embeddings and generation call Gemini.
- Indexing large datasets can be slow because embeddings are generated through an external API.
- Qdrant data is persisted in a Docker volume. Old data can remain until the collection is recreated or the volume is removed.
- Full reindex recreates the RAG collection. This is simple and consistent, but not optimized for very large datasets.
- Selective reindex is idempotent for provided article ids, but automatic background indexing is not implemented.
- RAG chat memory is in-memory only and is lost when the application restarts.
- Model availability can differ by Google account, project, quota, and region.
- The embedding model is configurable because older Gemini embedding models can become unavailable.

## Logging

Application logs are written to the console and to:

```text
logs/app.log
```

When `logs/app.log` reaches `LOG_MAX_FILE_SIZE`, it is rotated. The old file is renamed using a timestamp, and a new `app.log` file is created.

Example rotated file name:

```text
logs/app-2026-04-27T12-30-15-123Z.log
```

The `logs/` directory and log files are ignored by Git.

### Request and response logs

The application logs incoming HTTP requests and outgoing HTTP responses.

Example request log:

```json
{
  "timestamp": "2026-04-26T23:19:51.960Z",
  "level": "log",
  "message": "Incoming request",
  "context": "HttpLoggingInterceptor",
  "data": [
    {
      "method": "POST",
      "url": "/auth/login",
      "params": {},
      "query": {},
      "body": {
        "login": "admin",
        "password": "[REDACTED]"
      },
      "headers": {
        "content-type": "application/json"
      }
    }
  ]
}
```

Docker healthcheck requests are skipped by the HTTP logging interceptor to avoid filling the log file with repeated `GET /` entries.

### Sensitive data sanitization

Sensitive fields are redacted before being written to logs.

Examples of redacted fields:

```text
password
oldPassword
newPassword
old_password
new_password
token
accessToken
refreshToken
access_token
refresh_token
authorization
cookie
set-cookie
apiKey
api_key
geminiApiKey
gemini_api_key
x-goog-api-key
```

Example:

```json
{
  "login": "admin",
  "password": "[REDACTED]",
  "accessToken": "[REDACTED]"
}
```

## Error handling

### Global exception filter

All application errors are handled by the global exception filter.

Error responses use a consistent shape:

```json
{
  "statusCode": 400,
  "timestamp": "2026-04-26T23:22:13.168Z",
  "path": "/auth/login",
  "method": "POST",
  "message": "Bad Request",
  "error": "Bad Request"
}
```

Unexpected errors are returned as a generic internal server error response:

```json
{
  "statusCode": 500,
  "timestamp": "2026-04-26T23:22:13.168Z",
  "path": "/auth/login",
  "method": "POST",
  "message": "Internal server error",
  "error": "Internal Server Error"
}
```

Full error details are written to application logs.

### AI error handling

Gemini-related errors are handled without leaking secrets.

Examples:

| Situation | API behavior |
| --- | --- |
| Missing `GEMINI_API_KEY` | `500` with safe message |
| Invalid API key / auth failure | `500` with safe message |
| Gemini timeout | `503` |
| Gemini network error | `503` |
| Gemini upstream rate limit / quota exhausted | retry with backoff, then `503` if still failing |
| Local AI RPM limit exceeded | `429` with `Retry-After` header |

### Custom application errors

The application uses custom error classes for expected application errors:

```text
AppBadRequestError
AppNotFoundError
AppForbiddenError
AppUnauthorizedError
AppUnprocessableEntityError
```

These classes extend standard NestJS HTTP exceptions, so existing status codes and HTTP behavior are preserved.

### Process-level error handlers

The application handles process-level errors:

```text
uncaughtException
unhandledRejection
```

When one of these errors occurs, the application:

```text
1. writes a fatal log entry;
2. tries to close the Nest application gracefully;
3. exits the process with code 1.
```

## Manual checks

### Check request logging and sanitization

PowerShell:

```powershell
curl.exe -X POST "http://localhost:4000/auth/login" `
  -H "Content-Type: application/json" `
  --data-raw '{\"login\":\"admin\",\"password\":\"admin123\"}'
```

Alternative PowerShell command:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:4000/auth/login" `
  -ContentType "application/json" `
  -Body '{"login":"admin","password":"admin123"}'
```

The request body should appear in logs with the password redacted:

```json
"password": "[REDACTED]"
```

### Check log rotation

Set a small value in `.env`:

```env
LOG_MAX_FILE_SIZE=1000
```

Restart the application and send several requests. The `logs/` directory should contain `app.log` and rotated files.

## Testing

The project contains unit tests implemented with **Vitest**.

Unit tests are located in:

```text
test/unit
```

### Run default test command

```bash
npm run test
```

The default test command runs the Vitest unit test suite.

### Run unit tests only

```bash
npm run test:unit
```

Example successful result:

```text
Test Files  26 passed (26)
Tests       250 passed (250)
```

### Run unit tests with coverage

```bash
npm run test:coverage
```

Coverage thresholds are configured in `vitest.config.ts`:

| Metric | Threshold |
| --- | --- |
| Lines | `90%` |
| Branches | `85%` |

Current unit test coverage is above the required thresholds.

The unit test suite covers:

- services:
  - `UserService`
  - `ArticleService`
  - `AuthService`
  - `CategoryService`
  - `CommentService`
  - `AiService`
  - `GeminiService`
  - `AiCacheService`
  - `AiUsageService`
  - `AiConversationContextService`
- guards:
  - JWT access token guard
  - RBAC guard
  - AI rate limit guard
- validators:
  - analyze response validator
  - UUID validation pipe
  - DTO validation through `class-validator`
- interceptors and filters:
  - password exclusion interceptor
  - HTTP request/response logging interceptor
  - global exception filter
- logging and process behavior:
  - custom application errors
  - application logger service
  - file log writer with rotation
  - sensitive log data sanitization
  - process-level error handlers
- Prisma mocking without real database calls
- JWT, refresh token, RBAC, logging, error handling, AI caching, AI usage tracking, Gemini error mapping, and conversation context edge cases

AI unit tests use mocks for Gemini/fetch to avoid real external API calls during automated testing. Runtime application code still performs real Gemini HTTP API integration.

### Legacy Jest e2e tests

Older Jest e2e tests are kept in the repository for previous assignments:

```bash
npm run test:base
```

These tests were originally created before JWT authorization was added. Since protected routes now require an access token, this legacy script is not used as the default test command.

### Auth-related Jest e2e tests

JWT/Auth-related Jest suites can be run separately:

```bash
npm run test:auth
npm run test:refresh
npm run test:rbac
```

These tests require PostgreSQL, Prisma migrations, and seed data.

Prepare the database before running e2e tests:

```bash
docker compose up -d db
npx prisma migrate reset --force
```

## Available scripts

| Script | Description |
| --- | --- |
| `npm run build` | Build the NestJS application |
| `npm run start` | Start the app with Nest CLI |
| `npm run start:dev` | Start the app in watch mode |
| `npm run start:prod` | Start compiled app from `dist/main.js` |
| `npm run lint` | Run ESLint with auto-fix |
| `npm run test` | Run Vitest unit test suite |
| `npm run test:unit` | Run Vitest unit tests |
| `npm run test:coverage` | Run Vitest unit tests with coverage |
| `npm run test:all` | Run unit tests and auth-related Jest suites |
| `npm run test:base` | Run legacy Jest e2e tests from previous assignments |
| `npm run test:auth` | Run auth Jest e2e tests |
| `npm run test:refresh` | Run refresh token Jest e2e tests |
| `npm run test:rbac` | Run RBAC Jest e2e tests |
| `npm run docker:up` | Start Docker Compose with build |
| `npm run docker:down` | Stop Docker Compose services |
| `npm run docker:debug` | Start Docker Compose with Adminer profile |
| `npm run docker:logs` | Follow app logs |

## Troubleshooting

### Gemini model list works but generation returns `429` or `limit: 0`

This means the API key can access the model list, but the selected model has no available `generateContent` quota for the current Google project/account/region.

Example error details may include:

```text
Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 0
```

Try another available model in local `.env`:

```env
GEMINI_MODEL=gemini-3-flash-preview
```

Then restart the application.

### Gemini returns `User location is not supported for the API use`

This is a Google Gemini API regional availability limitation. Use a Google account/project/region where Gemini API is available, or use a model/API configuration available to your account.

### Gemini request returns `503`

The application returns `503` for Gemini timeout, network, upstream rate limit, or temporary unavailability.

Check:

```text
GEMINI_API_KEY
GEMINI_API_BASE_URL
GEMINI_MODEL
available Gemini quota
network access to generativelanguage.googleapis.com
```

### Windows curl returns `CRYPT_E_NO_REVOCATION_CHECK`

When manually testing Gemini with Windows `curl`, this TLS error can happen:

```text
curl: (35) schannel: next InitializeSecurityContext failed: CRYPT_E_NO_REVOCATION_CHECK
```

For manual diagnostics only, use:

```bash
curl --ssl-no-revoke "https://generativelanguage.googleapis.com/v1beta/models?key=$GEMINI_API_KEY"
```

Do not add this option to the NestJS application code.

### Prisma seed fails with missing table

If `npx prisma db seed` fails with an error like:

```text
The table `public.User` does not exist in the current database.
```

then migrations were not applied to the current database.

Run:

```bash
docker compose up -d db
npx prisma migrate reset --force
```

### Local Prisma cannot connect to `db:5432`

When running Prisma commands from the host machine, use `localhost` in `DATABASE_URL`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/knowledge_hub?schema=public
```

The hostname `db` works only inside Docker Compose network.

### Docker build fails on `npm ci`

If Docker build fails with an error about `package.json` and `package-lock.json` not being in sync, update the lock file:

```bash
npm install
```

If the problem is related to a corrupted lock file, remove `package-lock.json` and regenerate it:

```bash
rm package-lock.json
npm install
```

Then rebuild:

```bash
docker compose build --no-cache
```

### Docker logs fail with `EACCES`

If the application logs this error inside Docker:

```text
EACCES: permission denied, mkdir '/app/logs'
```

make sure the Dockerfile creates `/app/logs` and gives ownership to the application user before `USER appuser`:

```dockerfile
RUN addgroup -S appgroup \
    && adduser -S appuser -G appgroup \
    && mkdir -p /app/logs \
    && chown -R appuser:appgroup /app/logs
```

Then rebuild the image:

```bash
docker compose build --no-cache
docker compose up
```

### PowerShell curl sends invalid JSON

If PowerShell `curl.exe` returns an error like:

```text
Expected property name or '}' in JSON at position 1
```

use `--data-raw` with escaped JSON:

```powershell
curl.exe -X POST "http://localhost:4000/auth/login" `
  -H "Content-Type: application/json" `
  --data-raw '{\"login\":\"admin\",\"password\":\"admin123\"}'
```

Or use `Invoke-RestMethod`:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:4000/auth/login" `
  -ContentType "application/json" `
  -Body '{"login":"admin","password":"admin123"}'
```

### Login returns `403 Authentication failed`

If the request body is valid but login returns:

```json
{
  "statusCode": 403,
  "message": "Authentication failed"
}
```

check that migrations and seed data were applied:

```bash
docker compose up -d db
npx prisma migrate reset --force
```

### Qdrant container is missing

If only `knowledge-hub-db` and `knowledge-hub-app` are running, check whether Docker Compose sees the vector database service:

```bash
docker compose config --services
```

Expected services:

```text
db
vectordb
app
adminer
```

If `vectordb` is missing, check `docker-compose.yml`.

### Qdrant healthcheck is unhealthy

Check logs:

```bash
docker compose logs vectordb
```

Check Qdrant manually from host:

```bash
curl http://localhost:6333/healthz
```

Check Qdrant from the app container:

```bash
docker compose exec app node -e "fetch('http://vectordb:6333/healthz').then(r=>r.text()).then(console.log).catch(console.error)"
```

### RAG returns `503 Vector database is unavailable`

Check that the app uses Docker Compose service hostname, not `localhost`:

```env
RAG_VECTOR_DB_URL=http://vectordb:6333
```

Inside the `app` container, `localhost` means the app container itself, not Qdrant.

### RAG index returns Gemini embedding error

Check:

```text
GEMINI_API_KEY
GEMINI_API_BASE_URL
GEMINI_EMBEDDING_MODEL
Gemini embedding model availability
Gemini quota
```

Recommended default:

```env
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
```

If the selected embedding model is unavailable for the current account/project/region, use another model available to your Gemini API key.

### RAG search returns empty results

Check that the index was built:

```powershell
Invoke-RestMethod `
    -Uri "http://localhost:4000/ai/rag/index" `
    -Method Post `
    -Headers @{ Authorization = "Bearer $token" } `
    -ContentType "application/json" `
    -Body '{"onlyPublished":true}' | ConvertTo-Json -Depth 20
```

Check Qdrant point count:

```bash
curl http://localhost:6333/collections/knowledge_hub_articles
```

Also check that there are published articles in PostgreSQL.

### PowerShell shows JSON as a table or truncates nested fields

`Invoke-RestMethod` converts JSON to PowerShell objects and displays them as tables. Use `ConvertTo-Json -Depth 20` to see formatted JSON:

```powershell
$response | ConvertTo-Json -Depth 20
```

Or use `Invoke-WebRequest` to inspect raw content:

```powershell
$response = Invoke-WebRequest `
    -Uri "http://localhost:4000/ai/rag/search" `
    -Method Post `
    -Headers @{ Authorization = "Bearer $token" } `
    -ContentType "application/json" `
    -Body '{"query":"How does Prisma work with PostgreSQL?","limit":5}'

$response.Content
```

## Notes

- The application targets Node.js `>=24.10.0 <25`.
- The application uses generated Prisma Client from `src/generated/prisma`.
- Gemini integration is implemented through HTTP API calls with `fetch`.
- Gemini embeddings are used for semantic search and RAG indexing.
- Qdrant is used as the external vector database.
- No real Gemini API key is committed to the repository.
- Passwords are never returned in API responses.
- Sensitive fields are never written to logs in plain text.
- Unit tests do not perform real HTTP requests or database calls.
- AI usage, cache, rate limit buckets, diagnostics, and conversation context are in-memory runtime data.
