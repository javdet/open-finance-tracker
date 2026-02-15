# Finance Tracker

React-based web app for tracking finances: multi-currency accounts, transactions, categories, and monthly budget.

## License

MIT. See [LICENSE](LICENSE). Use and redistribution are allowed; if you publish or distribute this project (or a derivative), you must keep the license and copyright notice, which includes a link to this repository.

## Tech stack

- **React 18** + **TypeScript** (Vite)
- **React Router** for SPA routing
- **Tailwind CSS** for styling
- Responsive layout (desktop and mobile)

## Project structure

```
src/
  app/           # App root and routing (App.tsx)
  components/    # Reusable UI (e.g. app-layout)
  lib/           # Utilities (clsx, future API client)
  pages/         # Route-level pages (dashboard, transactions, budget, etc.)
  types/         # Shared TypeScript types (Account, Category, Transaction)
  index.css      # Global Tailwind styles
  main.tsx       # Entry point
```

## Commands

- `npm run dev` — start dev server (default http://localhost:5173)
- `npm run server` — start API server (default http://localhost:3001)
- `npm run build` — type-check and production build
- `npm run preview` — serve production build locally
- `npm run lint` — run ESLint

## Docker

Run the app and Postgres with Docker Compose:

```bash
docker compose up -d
```

- **Postgres**: user `tracker`, database `tracker`, data in `./data`
- **App**: http://localhost:3001 (API + built frontend)
- Schema is applied automatically on first start via the `db-init` service.

Rebuild the app image after code changes:

```bash
docker compose up -d --build app
```

## Next steps

- Implement dashboard balance panel, transaction forms, category CRUD, budget plan/fact views
