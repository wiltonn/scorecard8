This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Dagger Pipeline (Ephemeral DB)

The project uses [Dagger](https://dagger.io) to run an ephemeral, containerized Postgres instance for migrations, seeding, and health checks — no shared local DB required. Each pipeline run gets its own isolated Postgres, so multiple worktrees or CI jobs can run simultaneously with zero port conflicts.

### Prerequisites

Install the Dagger CLI:

```bash
curl -fsSL https://dl.dagger.io/dagger/install.sh | BIN_DIR=$HOME/.local/bin sh
```

### Running the pipeline

From the repo root:

```bash
dagger call pipeline --source ./dps-webapp
```

Or using the Makefile shortcut:

```bash
make dagger-pipeline
```

### What the pipeline does

1. Starts an ephemeral **Postgres 15** container (no host port binding)
2. Builds a **Node 22** app container with `npm ci` and `prisma generate`
3. Runs `prisma migrate deploy` to apply all pending migrations
4. Runs the seed script (`prisma/seed.ts`)
5. Runs a health check verifying expected row counts (7 departments, KPIs, templates)

### Pipeline functions

| Function | Description |
|----------|-------------|
| `postgres` | Ephemeral Postgres 15 service with DPS credentials |
| `app-container` | Node 22 container with deps, Prisma client, and DB binding |
| `pipeline` | Full pipeline: migrate, seed, and health check |

### Key design decisions

- **Service binding** (not port mapping): Postgres is only reachable within the Dagger network via hostname `postgres`. Two worktrees running simultaneously get fully isolated databases.
- **`prisma migrate deploy`** (not `migrate dev`): No interactive prompts, applies pending migrations only.
- **`.env` files excluded**: The container sets `DATABASE_URL` via env vars; `.env` and `.env.local` are stripped from the mounted source to prevent dotenv overrides.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
