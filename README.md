# Knowledge Hub API

REST API for a **Knowledge Hub** platform built with **NestJS**, **TypeScript**, **PostgreSQL**, and **Prisma ORM**.

This repository contains the implementation up to **08b-logging-errors**.

## Stack

- Node.js **24.10.0+**
- NestJS
- TypeScript
- PostgreSQL
- Prisma ORM
- Swagger / OpenAPI
- JWT authentication and authorization
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

### Logging and error handling

Implemented for the 08b logging/errors assignment:

- custom Nest logger configured through `LOG_LEVEL`
- console logging
- file logging to `logs/app.log`
- log file rotation through `LOG_MAX_FILE_SIZE`
- incoming HTTP request logging
- outgoing HTTP response logging
- Docker healthcheck request logging is skipped to avoid log spam
- sensitive data sanitization in logs
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
```

### Database connection notes

- For **local Nest app + Dockerized PostgreSQL**, use `localhost` in `DATABASE_URL`.
- For **app running inside Docker Compose**, database host is `db`.
- `.env` must not be committed.

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

The project contains unit tests for the **08a-testing** and **08b-logging-errors** assignments implemented with **Vitest**.

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
- guards:
  - JWT access token guard
  - RBAC guard
- UUID validation pipe
- DTO validation through `class-validator`
- password exclusion interceptor
- HTTP request/response logging interceptor
- global exception filter
- custom application errors
- application logger service
- file log writer with rotation
- sensitive log data sanitization
- process-level error handlers
- Prisma mocking without real database calls
- JWT, refresh token, RBAC, logging, and error handling edge cases

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

## Notes

- The application targets Node.js `>=24.10.0 <25`.
- The application uses generated Prisma Client from `src/generated/prisma`.
- Passwords are never returned in API responses.
- Sensitive fields are never written to logs in plain text.
- Unit tests do not perform real HTTP requests or database calls.
