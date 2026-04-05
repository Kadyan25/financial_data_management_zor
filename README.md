# Finance Data Processing and Access Control Backend

A robust backend API for a finance dashboard system with role-based access control, built with Node.js, Express, TypeScript, Prisma, and SQLite.

## Features

- **Role-Based Access Control** — VIEWER, ANALYST, ADMIN roles with enforced permissions
- **JWT Authentication** — Access tokens (15m) + Refresh tokens (7d) with rotation
- **Financial Records** — Full CRUD with filtering, pagination, and soft delete
- **Dashboard Analytics** — Summary totals, category breakdowns, monthly/weekly trends
- **API Documentation** — Swagger UI at `/api/docs`
- **Input Validation** — Zod schemas with meaningful error messages
- **Security** — Helmet, rate limiting on login, bcrypt password hashing

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 18+ + TypeScript |
| Framework | Express.js |
| ORM | Prisma |
| Database | SQLite (file-based, no installation needed) |
| Auth | JWT (jsonwebtoken) |
| Validation | Zod |
| API Docs | swagger-jsdoc + swagger-ui-express |
| Tests | Jest + Supertest |
| Security | Helmet, express-rate-limit, bcryptjs |

## Prerequisites

- Node.js 18+
- npm 9+
- *(No database installation needed — SQLite creates a local file automatically)*

## Setup

### 1. Install dependencies

```bash
cd D:/Zorvyn
npm install
```

### 2. Set up database

```bash
# Run migrations (creates prisma/dev.db automatically)
npm run db:migrate

# Seed with sample data
npm run db:seed
```

> `.env` is already included with working defaults. No configuration needed to run locally.

### 3. Start the server

```bash
# Development (with hot reload)
npm run dev

# Production
npm run build && npm start
```

Server: `http://localhost:3000`

## API Documentation

Swagger UI: **http://localhost:3000/api/docs**

JSON spec: **http://localhost:3000/api/docs.json**

## Seed Credentials

| Role | Email | Password |
|------|-------|----------|
| ADMIN | admin@zorvyn.com | Admin@1234 |
| ANALYST | analyst@zorvyn.com | Analyst@1234 |
| VIEWER | viewer@zorvyn.com | Viewer@1234 |

## API Overview

### Authentication (`/api/v1/auth`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/register` | No | Register new account (role defaults to VIEWER) |
| POST | `/login` | No | Login, returns accessToken + refreshToken |
| POST | `/refresh` | No | Rotate refresh token, get new token pair |
| POST | `/logout` | Yes | Invalidate refresh token |
| GET | `/me` | Yes | Get current user profile |

### Users (`/api/v1/users`) — ADMIN only

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List users (paginated, filterable by role/status/search) |
| GET | `/:id` | Get user by ID |
| POST | `/` | Create user with specified role |
| PATCH | `/:id` | Update name, role, or status |
| DELETE | `/:id` | Deactivate user (sets status=INACTIVE, force-logs out) |

### Financial Records (`/api/v1/records`)

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| GET | `/` | ALL | List records — VIEWER sees own only |
| GET | `/:id` | ALL | Get record — VIEWER sees own only |
| POST | `/` | ANALYST, ADMIN | Create record |
| PATCH | `/:id` | ANALYST (own), ADMIN | Update record |
| DELETE | `/:id` | ANALYST (own), ADMIN | Soft delete |

**Query params:** `?page&limit&type&category&startDate&endDate&sortBy&sortOrder&userId`

### Dashboard (`/api/v1/dashboard`)

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| GET | `/summary` | ALL | Total income, expenses, net balance |
| GET | `/categories` | ALL | Breakdown by category and type |
| GET | `/trends` | ANALYST, ADMIN | Monthly or weekly income vs expense trends |
| GET | `/recent` | ALL | Last N transactions |

**Query params for trends:** `?period=monthly|weekly&startDate&endDate&userId`

## Role Permissions

| Action | VIEWER | ANALYST | ADMIN |
|--------|--------|---------|-------|
| View own records | ✓ | ✓ | ✓ |
| View all records | ✗ | ✓ | ✓ |
| Create records | ✗ | ✓ | ✓ |
| Edit own records | ✗ | ✓ | ✓ |
| Edit any record | ✗ | ✗ | ✓ |
| Delete own records | ✗ | ✓ | ✓ |
| Delete any record | ✗ | ✗ | ✓ |
| Dashboard summary | Own data | All data | All data |
| Dashboard trends | ✗ | ✓ | ✓ |
| Manage users | ✗ | ✗ | ✓ |

## Running Tests

```bash
# Unit tests (fast, no DB required)
npm run test:unit

# Integration tests (requires running server + DB)
npm run test:int

# All tests with coverage
npm run test:cov
```

### Integration Test Setup

Create `.env.test`:
```env
DATABASE_URL="file:./test.db"
JWT_ACCESS_SECRET=test_access_secret_that_is_long_enough_for_validation
JWT_REFRESH_SECRET=test_refresh_secret_that_is_different_and_long_enough
BCRYPT_ROUNDS=4
```

## Design Decisions & Assumptions

### Database: SQLite
SQLite is used for simplicity — no local database server required. Prisma manages the schema and migrations. The database file lives at `prisma/dev.db`.

### Financial Data Precision
`Decimal` type is used for `amount` (not `Float`). IEEE 754 floating-point can introduce rounding errors for monetary values. Prisma's `Decimal` serializes safely; values are converted to `number` at the API response layer via `.toNumber()`.

### Enums as Strings (SQLite limitation)
SQLite does not support Prisma enums. Role, status, and record type are stored as plain strings in the database. Allowed values are enforced at the API boundary via Zod schemas. App-level TypeScript types (`Role`, `RecordType`, `UserStatus`) are defined in `src/types/enums.ts`.

### Soft Delete
Records are never permanently deleted — `isDeleted: true` hides them from all queries. This preserves audit history. The flag is always included in `WHERE` clauses using the `ACTIVE_RECORD` constant.

### JWT Refresh Token Rotation
Refresh tokens are stored as SHA-256 hashes (not raw tokens — treated like passwords). On each refresh, the old token is deleted and a new pair issued. If a refresh token is replayed (used twice), all tokens for that user are revoked as a security measure.

### Password Security
Bcrypt with cost factor 12. The `passwordHash` field is never returned in API responses — a shared `USER_SELECT` constant excludes it from all Prisma queries.

### VIEWER Scope Enforcement
VIEWERs are scoped to their own data at the service layer via `buildScope()` and `assertOwnership()` helpers — not just by query filtering. A VIEWER who knows another record's ID still receives 403, not the record.

### Dashboard Trends
Monthly/weekly aggregation uses SQLite's `strftime('%Y-%m', date)` via `$queryRawUnsafe` with `?` placeholders (parameterized, SQL injection safe). Results are merged into `{ period, income, expenses, net }` objects in the application layer.

### Category
Free-text string, lowercased on write. No predefined list — avoids migrations for new categories while Zod trims and normalizes input.

## Project Structure

```
src/
├── config/         env.ts, database.ts, swagger.ts
├── middleware/     authenticate.ts, authorize.ts, validate.ts, errorHandler.ts
├── modules/
│   ├── auth/       auth.schema.ts, auth.service.ts, auth.controller.ts, auth.routes.ts
│   ├── users/      users.schema.ts, users.service.ts, users.controller.ts, users.routes.ts
│   ├── records/    records.schema.ts, records.service.ts, records.controller.ts, records.routes.ts
│   └── dashboard/  dashboard.service.ts, dashboard.controller.ts, dashboard.routes.ts
├── utils/          jwt.ts, password.ts, pagination.ts, apiResponse.ts
├── types/          express.d.ts, enums.ts
├── app.ts
└── server.ts
prisma/
├── schema.prisma
├── seed.ts
├── dev.db          (auto-created by migrate)
└── migrations/
tests/
├── unit/           Service tests with mocked Prisma (24 tests)
├── integration/    API tests with Supertest
├── helpers/        factories.ts, testServer.ts
└── setup.ts
```
