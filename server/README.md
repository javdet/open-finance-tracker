# Finance Tracker API Server

Data access layer for accounts, operations, and budgets using the Postgres schema. Provides REST API and budget vs actual report.

## Setup

1. Apply the schema: `psql $DATABASE_URL -f db/schema.sql`
2. Set `DATABASE_URL` (e.g. `postgres://user:pass@localhost:5432/finance_tracker`)

## Run

```bash
DATABASE_URL=postgres://... npm run server
```

Server listens on `PORT` (default 3001). Optional `X-User-Id` header or `?userId=` for multi-user (default user id `1`).

## Endpoints

- `GET /api/accounts` – list accounts
- `GET /api/accounts/:id` – get account
- `POST /api/accounts` – create account
- `PATCH /api/accounts/:id` – update account
- `DELETE /api/accounts/:id` – delete account

- `GET /api/operations?userId=&fromTime=&toTime=&accountId=&categoryId=&operationType=&limit=&offset=` – list operations
- `GET /api/operations/:id` – get operation
- `POST /api/operations` – create operation
- `PATCH /api/operations/:id` – update operation
- `DELETE /api/operations/:id` – delete operation

- `GET /api/budgets` – list budgets
- `GET /api/budgets/:id` – get budget
- `GET /api/budgets/:id/items` – list budget items
- `GET /api/budgets/:id/budget-vs-actual` – **budget vs actual report**
- `POST /api/budgets` – create budget (body may include `items[]`)
- `PATCH /api/budgets/:id` – update budget
- `DELETE /api/budgets/:id` – delete budget

## Budget vs actual

Compares planned amounts from `budget_items` to actual spending from `operations` (type `payment`, `amount_in_base`) in the budget date range. Report returns per-category and total planned, actual, and variance.
