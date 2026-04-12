# Knowledge Hub API

REST API for a **Knowledge Hub** platform built with **Nest.js**, **TypeScript**, **PostgreSQL** and **Prisma ORM**.

The application provides CRUD operations for:

- users
- articles
- categories
- comments

Swagger documentation is available at `/doc`.

At the current stage, the application uses a real **PostgreSQL** database through **Prisma ORM**.
The Docker setup from assignment `06a` is reused for the database and application runtime.

## Features

### Basic scope

- Nest.js application with domain-based structure
- `UserModule`
- `ArticleModule`
- `CategoryModule`
- `CommentModule`
- request validation with DTO classes
- Prisma schema with models: `User`, `Article`, `Category`, `Comment`, `Tag`
- PostgreSQL data storage via Prisma ORM
- existing API routes preserved after migration from in-memory storage
- all base e2e tests pass

### Advanced scope

- DTO validation via `ValidationPipe`
- article filtering by:
  - `status`
  - `categoryId`
  - `tag`
- Swagger / OpenAPI documentation at `/doc`
- cascading delete behavior:
  - deleting a user sets `authorId = null` in related articles and removes related comments
  - deleting a category sets `categoryId = null` in related articles
  - deleting an article removes its comments
- seed script runnable via `npx prisma db seed`
- cascading delete / nullify behavior via Prisma relations
- article tags handled with `connectOrCreate`

### Hacker scope

- pagination for list endpoints
- sorting for list endpoints
- additional automated e2e tests
- indexes for frequently queried database fields
- connection pooling via PostgreSQL pool adapter
- N+1 avoidance for article tags via Prisma `include`

## Tech stack

- Node.js 24.10.0+
- Nest.js
- TypeScript
- class-validator
- class-transformer
- Swagger (`@nestjs/swagger`)
- Docker
- Docker Compose
- PostgreSQL
- Adminer (optional, debug profile)
- Prisma ORM
- Prisma Client

> According to the assignment, the application should use **Node.js 24.x.x**, minimum **24.10.0**.

## Installation

```bash
npm install
```

## Environment variables

Create a `.env` file in the project root.

You can use `.env.example` as a template:

```bash
cp .env.example .env
```

Example `.env.example`:

```env
PORT=4000

CRYPT_SALT=10
JWT_SECRET_KEY=change_me
JWT_SECRET_REFRESH_KEY=change_me_too
TOKEN_EXPIRE_TIME=1h
TOKEN_REFRESH_EXPIRE_TIME=24h

POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=knowledge_hub
POSTGRES_HOST=db
POSTGRES_PORT=5432

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/knowledge_hub?schema=public
```

For local development with Dockerized PostgreSQL, `DATABASE_URL` uses `localhost`.
Inside Docker Compose, the application uses the database host `db`.

## Running the application locally

### Development mode

```bash
npm run start:dev
```

### Standard start

```bash
npm start
```

### Production mode

```bash
npm run build
npm run start:prod
```

Current scripts are defined in `package.json`.

## Running with Docker Compose

Before running Docker Compose, make sure you have created a `.env` file based on `.env.example`.

Build and start the application with PostgreSQL:

```bash
docker-compose up --build
```

Stop containers:

```bash
docker-compose down
```

Stop containers and remove PostgreSQL volume:

```bash
docker-compose down -v
```

Run with optional Adminer debug service:

```bash
docker-compose --profile debug up --build
```

## Prisma workflow

Generate Prisma Client:

```bash
npx prisma generate
```

Create and apply migrations:
```bash
npx prisma migrate dev --name <migration_name>
```

Run seed:
```bash
npx prisma db seed
```

Open Prisma Studio:
```bash
npx prisma studio
```

## Available services

After startup, the following services are available:

- API root: `http://localhost:4000/`
- Swagger UI: `http://localhost:4000/doc`
- PostgreSQL: `localhost:5432`
- Adminer (debug profile only): `http://localhost:8080`

## Docker infrastructure

The project includes the following Docker services:

- `app` — Knowledge Hub API container
- `db` — PostgreSQL 16 container
- `adminer` — optional database UI for local debugging

Docker setup features:

- multi-stage Docker build
- production image based on `node:24-alpine`
- non-root user in the final application image
- custom bridge network for inter-service communication
- named volume for PostgreSQL data persistence
- health checks for both `app` and `db`
- restart policies for application and database containers

## Testing

Run all tests:

```bash
npm run test
```

Run lint:

```bash
npm run lint
```

## Swagger documentation

After starting the application, Swagger UI is available at:

```text
http://localhost:4000/doc
```

The assignment requires OpenAPI documentation at `/doc`.

## Security scan

The application Docker image was scanned with Docker Scout.

Command used:

```bash
docker scout cves knowledge-hub:latest
```

Scan result:

- CRITICAL: 0
- HIGH: 36
- MEDIUM: 14
- LOW: 4
- UNSPECIFIED: 2

No critical vulnerabilities were found in the application image.

## Docker Hub image

Docker Hub image:

```text
https://hub.docker.com/r/proff1991/knowledge-hub
```

## API overview

Base routes:

- `/user`
- `/article`
- `/category`
- `/comment`

---

## User endpoints

### `GET /user`
Get all users.

Supports optional pagination and sorting:
- `page`
- `limit`
- `sortBy`
- `order`

### `GET /user/:id`
Get user by id.

### `POST /user`
Create user.

Example body:

```json
{
  "login": "alex",
  "password": "secret",
  "role": "viewer"
}
```

### `PUT /user/:id`
Update user password.

Example body:

```json
{
  "oldPassword": "secret",
  "newPassword": "new-secret"
}
```

### `DELETE /user/:id`
Delete user.

---

## Category endpoints

### `GET /category`
Get all categories.

Supports optional pagination and sorting:
- `page`
- `limit`
- `sortBy`
- `order`

### `GET /category/:id`
Get category by id.

### `POST /category`
Create category.

Example body:

```json
{
  "name": "Node.js",
  "description": "Articles about Node.js backend development"
}
```

### `PUT /category/:id`
Update category.

### `DELETE /category/:id`
Delete category.

---

## Article endpoints

### `GET /article`
Get all articles.

Supports filtering:
- `status`
- `categoryId`
- `tag`

Supports optional pagination and sorting:
- `page`
- `limit`
- `sortBy`
- `order`

Example:

```text
/article?status=published&tag=nodejs&page=1&limit=10&sortBy=title&order=asc
```

### `GET /article/:id`
Get article by id.

### `POST /article`
Create article.

Example body:

```json
{
  "title": "How Event Loop works in Node.js",
  "content": "Detailed explanation of timers, poll and check phases.",
  "status": "draft",
  "authorId": null,
  "categoryId": null,
  "tags": ["nodejs", "javascript"]
}
```

### `PUT /article/:id`
Update article.

### `DELETE /article/:id`
Delete article.

---

## Comment endpoints

### `GET /comment`
Get comments for a specific article.

Required query parameter:
- `articleId`

Supports optional pagination and sorting:
- `page`
- `limit`
- `sortBy`
- `order`

Example:

```text
/comment?articleId=550e8400-e29b-41d4-a716-446655440000&page=1&limit=10&sortBy=createdAt&order=desc
```

### `GET /comment/:id`
Get comment by id.

### `POST /comment`
Create comment.

Example body:

```json
{
  "content": "Very useful article, thanks!",
  "articleId": "550e8400-e29b-41d4-a716-446655440000",
  "authorId": null
}
```

### `DELETE /comment/:id`
Delete comment.

---

## Response behavior

### Validation

Incoming request bodies are validated with DTO classes and validation decorators. A global `ValidationPipe` is used.

### User password

User passwords are stored internally but are **excluded from API responses**, as required by the assignment.

### Cascading behavior

- deleting a user:
  - sets `authorId = null` in related articles
  - removes related comments
- deleting a category:
  - sets `categoryId = null` in related articles
- deleting an article:
  - removes related comments

## Project structure

```text
src/
  article/
  category/
  comment/
  user/
  main.ts
  app.module.ts
test/
  *.e2e.spec.ts
```

## Notes

- The application now uses **PostgreSQL** as the primary data store through **Prisma ORM**.
- Docker Compose is used to run the PostgreSQL database and the application container.
- PostgreSQL data inside Docker is persisted through a named volume.
- Prisma migrations and seed are included in the repository.