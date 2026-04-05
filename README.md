# Knowledge Hub API

REST API for a **Knowledge Hub** platform built with **Nest.js** and **TypeScript**.

The application provides CRUD operations for:

- users
- articles
- categories
- comments

The project uses **in-memory storage** and is organized by Nest modules, controllers, and services. Swagger documentation is available at `/doc`. :contentReference[oaicite:2]{index=2}

## Features

### Basic scope

- Nest.js application with domain-based structure
- `UserModule`
- `ArticleModule`
- `CategoryModule`
- `CommentModule`
- request validation with DTO classes
- in-memory data storage
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

### Hacker scope

- pagination for list endpoints
- sorting for list endpoints
- additional automated e2e tests

## Tech stack

- Node.js 24.10.0+
- Nest.js
- TypeScript
- class-validator
- class-transformer
- Swagger (`@nestjs/swagger`)

> According to the assignment, the application should use **Node.js 24.x.x**, minimum **24.10.0**. :contentReference[oaicite:3]{index=3}

## Installation

```bash
npm install
```

## Environment variables

Create a `.env` file in the project root.

Example:

```env
PORT=4000
```

By default, the application runs on port `4000`. :contentReference[oaicite:4]{index=4}

## Running the application

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

Current scripts are defined in `package.json`. :contentReference[oaicite:5]{index=5}

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

The assignment requires OpenAPI documentation at `/doc`. :contentReference[oaicite:6]{index=6}

## API overview

Base routes:

- `/user`
- `/article`
- `/category`
- `/comment` :contentReference[oaicite:7]{index=7}

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

Incoming request bodies are validated with DTO classes and validation decorators. A global `ValidationPipe` is used. :contentReference[oaicite:8]{index=8} :contentReference[oaicite:9]{index=9}

### User password

User passwords are stored internally but are **excluded from API responses**, as required by the assignment. :contentReference[oaicite:10]{index=10}

### Cascading behavior

- deleting a user:
  - sets `authorId = null` in related articles
  - removes related comments
- deleting a category:
  - sets `categoryId = null` in related articles
- deleting an article:
  - removes related comments :contentReference[oaicite:11]{index=11}

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

- The application currently uses **in-memory data storage**, so data is reset after restart. :contentReference[oaicite:12]{index=12}
- The architecture is prepared for future migration to a persistent database. :contentReference[oaicite:13]{index=13}