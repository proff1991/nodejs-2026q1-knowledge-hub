# Knowledge Hub API

REST API for a **Knowledge Hub** platform built with **NestJS**, **TypeScript**, **PostgreSQL**, and **Prisma ORM**.

This repository contains the solution up to **07a-auth-jwt**.

## Stack

- Node.js **24.10.0+**
- NestJS
- TypeScript
- PostgreSQL
- Prisma ORM
- Swagger (`/doc`)
- JWT auth (access + refresh tokens)
- Docker / Docker Compose

## Implemented features

### Core resources

The API provides CRUD operations for:

- `user`
- `article`
- `category`
- `comment`

### Database

- PostgreSQL is used as the main database
- Prisma schema includes:
  - `User`
  - `Article`
  - `Category`
  - `Comment`
  - `Tag`
  - `RefreshToken`
- migrations are committed to the repository
- seed script is available
- indexes are added for frequently queried fields

### Authentication and authorization

Implemented for assignment **07a**:

- `POST /auth/signup`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- password hashing with `bcrypt`
- JWT access token
- JWT refresh token
- refresh token rotation and invalidation
- access protection for all private routes
- RBAC:
  - `viewer` — read only
  - `editor` — own content
  - `admin` — full access
- rate limiting for:
  - `POST /auth/signup`
  - `POST /auth/login`

### Additional functionality

- DTO validation via global `ValidationPipe`
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

- `admin / admin123`
- `editor / editor123`

Passwords are stored in the database as **hashes**.

## Environment variables

You can use `.env.example` as a template:

```bash
cp .env.example .env
```

Example:

```env
PORT=4000

CRYPT_SALT=10
JWT_SECRET_KEY=secret123123
JWT_SECRET_REFRESH_KEY=secret123123
TOKEN_EXPIRE_TIME=1h
TOKEN_REFRESH_EXPIRE_TIME=24h

POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=knowledge_hub
POSTGRES_HOST=db
POSTGRES_PORT=5432

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/knowledge_hub?schema=public
```

Notes:

- for **local Nest app + Dockerized PostgreSQL**, use `localhost` in `DATABASE_URL`
- for **app running inside Docker Compose**, database host is `db`

## Installation

```bash
npm install
```

## Local development

### 1. Start PostgreSQL in Docker

```bash
docker compose up -d db
```

### 2. Generate Prisma client

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

### 5. Start the application

```bash
npm run start:dev
```

The API will be available at:

- `http://localhost:4000/`
- Swagger: `http://localhost:4000/doc`

## Docker Compose

Build and start the application together with PostgreSQL:

```bash
docker compose up --build
```

Stop containers:

```bash
docker compose down
```

Run with optional Adminer profile:

```bash
docker compose --profile debug up --build
```

## Prisma commands

Generate client:

```bash
npx prisma generate
```

Create and apply a migration:

```bash
npx prisma migrate dev --name <migration_name>
```

Reset database and run seed:

```bash
npx prisma migrate reset
```

Run seed only:

```bash
npx prisma db seed
```

Open Prisma Studio:

```bash
npx prisma studio
```

## Available scripts

```bash
npm run build
npm run start:dev
npm run start:prod
npm run lint
npm run test:auth
npm run test:refresh
npm run test:rbac
npm run docker:up
npm run docker:down
npm run docker:debug
npm run docker:logs
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

Creates a new user with role `viewer`.

### Login

```http
POST /auth/login
Content-Type: application/json

{
  "login": "editor",
  "password": "editor123"
}
```

Response:

```json
{
  "accessToken": "...",
  "refreshToken": "..."
}
```

### Refresh

```http
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "..."
}
```

Returns a new access/refresh token pair.

### Logout

```http
POST /auth/logout
Content-Type: application/json

{
  "refreshToken": "..."
}
```

Invalidates the refresh token.

### Authorization header

Private routes require Bearer token:

```http
Authorization: Bearer <access_token>
```

Public routes:

- `GET /`
- `GET /doc`
- `POST /auth/signup`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`

## RBAC rules

- `viewer`
  - can use only `GET` routes
- `editor`
  - can use `GET`
  - can create/update/delete only **own** articles and comments
  - cannot manage users or categories
- `admin`
  - full access to all operations
  - can change user roles

## Testing

Main test commands for assignment **07a**:

```bash
npm run test:auth
npm run test:refresh
npm run test:rbac
```

These test sets were adapted to the current Prisma client generation path and to repeated runs.

## Swagger

Swagger UI is available after startup at:

```text
http://localhost:4000/doc
```