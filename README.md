# CC Dashboard

**A self-hosted personal credit card dashboard powered by Plaid.**

Connect all your credit cards and bank accounts in one place. View balances, daily spending, category breakdowns, and recent transactions — all synced automatically from your real financial institutions.

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white)
![Plaid](https://img.shields.io/badge/Powered%20by-Plaid-00C1C1?logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0xMiAyQzYuNDggMiAyIDYuNDggMiAxMnM0LjQ4IDEwIDEwIDEwIDEwLTQuNDggMTAtMTBTMTcuNTIgMiAxMiAyeiIvPjwvc3ZnPg==)
![Vercel](https://img.shields.io/badge/Deploy%20on-Vercel-black?logo=vercel&logoColor=white)

---
<p align="center">
  <img src="docs/image.gif" alt="CC Dashboard — screenshot coming soon" width="840" />
</p>

---

## Features

- **Connect multiple cards** — add credit cards and bank accounts via Plaid Link in seconds
- **Unified dashboard** — balances, credit utilization, daily spending chart, category breakdown, and recent transactions in one view
- **Incremental sync** — cursor-based sync only fetches new and changed transactions, keeping API calls minimal
- **Manual sync with rate-limiting** — configurable cooldown and daily cap prevent accidental over-fetching
- **Google OAuth + email allowlist** — lock access to specific email addresses; no user database required
- **Fully type-safe** — TypeScript end-to-end with raw SQL (no ORM)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 18 · Tremor · Tailwind CSS 4 |
| Database | PostgreSQL via [Neon](https://neon.tech) |
| Auth | NextAuth 5 (Google OAuth) |
| Banking API | Plaid |
| Data fetching | SWR (60s polling) |
| Language | TypeScript 5 |
| Testing | Jest · TestContainers |

---

## Self-Hosting Guide

Running this for personal use is essentially free. You need three external services.

### 1. Plaid

1. Sign up at [plaid.com](https://plaid.com) and create an application.
2. Use **Sandbox** mode (fully simulated, always free) to test, or **Development** mode to connect real accounts.
3. Copy your `PLAID_CLIENT_ID` and `PLAID_SECRET` from the dashboard.

> **Cost:** Sandbox is free forever. Development is free for personal use (up to 100 Items).

### 2. Neon (PostgreSQL)

1. Sign up at [neon.tech](https://neon.tech) and create a new project.
2. Copy the connection string — it looks like `postgresql://user:pass@host/dbname`.
3. After deploying, run `npm run migrate` once to create all tables.

> **Cost:** Free tier includes 512 MB storage and 190 compute hours/month — plenty for personal use.

### 3. Vercel

1. Fork this repository.
2. Import the fork into [Vercel](https://vercel.com) (New Project → Import Git Repository).
3. Set all environment variables (see table below) in the Vercel project settings.
4. Deploy.

> **Cost:** Hobby plan is free and covers personal use.

#### Optional: Automatic sync

The `/api/sync` endpoint accepts a `POST` request with `Authorization: Bearer <CRON_SECRET>` to trigger a background sync. You can call this from:

- **Vercel Cron Jobs** — requires the Pro plan ($20/month)
- **cron-job.org** — free external scheduler; set up a job pointing at your deployment URL
- **GitHub Actions** — use a `schedule:` workflow to `curl` the endpoint on a timer

If you skip this, the dashboard still has a manual **Sync** button.

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

| Variable | Required | Default | Description |
|---|---|---|---|
| `PLAID_CLIENT_ID` | Yes | — | Plaid application client ID |
| `PLAID_SECRET` | Yes | — | Plaid API secret |
| `PLAID_ENV` | No | `sandbox` | `sandbox` or `development` |
| `DATABASE_URL` | Yes | — | Neon (or any PostgreSQL) connection string |
| `CRON_SECRET` | Yes | — | Bearer token for the `/api/sync` endpoint. Generate with: `openssl rand -hex 32` |
| `ALLOWED_EMAILS` | Yes | — | Comma-separated list of Google emails allowed to sign in (e.g. `you@gmail.com`) |
| `AUTH_SECRET` | Yes | — | NextAuth secret. Generate with: `openssl rand -hex 32` |
| `AUTH_GOOGLE_ID` | Yes | — | Google OAuth client ID (from [Google Cloud Console](https://console.cloud.google.com)) |
| `AUTH_GOOGLE_SECRET` | Yes | — | Google OAuth client secret |
| `MAX_DAILY_SYNCS` | No | `10` | Maximum syncs per calendar day |
| `SYNC_COOLDOWN_MINUTES` | No | `30` | Minimum minutes between manual syncs |
| `MAX_LIFETIME_PLAID_CONNECTIONS` | No | `10` | Maximum total card connections |

---

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env.local
# Fill in .env.local with your values

# 3. Create database tables
npm run migrate

# 4. Start the dev server
npm run dev
# Open http://localhost:3000
```

### Testing

```bash
npm test                  # Unit tests
npm run test:watch        # Unit tests in watch mode
npm run test:integration  # Integration tests (requires Docker for TestContainers)
npm run test:all          # All tests
npm run test:coverage     # Unit tests with coverage report
```

Integration tests spin up a real PostgreSQL container via TestContainers, so Docker must be running.

### Linting

```bash
npm run lint
```

---

## Contributing

Contributions are welcome. Before opening a pull request, please read the [Contributing Guide and CLA](CONTRIBUTING.md).

The `main` branch is protected — **all changes must go through a pull request**. Direct pushes are disabled.

**Workflow:**

1. Fork the repository and create a feature branch off `main`
2. Make your changes and write or update relevant tests
3. Run `npm test` (unit) and `npm run test:integration` (if your change touches the database layer)
4. Ensure `npm run lint` passes with no errors
5. Open a pull request and include the CLA agreement line in your PR description (see [CONTRIBUTING.md](CONTRIBUTING.md))

---

## License

MIT — see [LICENSE](LICENSE).
