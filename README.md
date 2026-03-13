# Dealer Performance Scorecard (DPS)

A Next.js web application for generating dealership performance scorecards. Upload dealer CSV data, select report types, and generate comprehensive performance analysis documents.

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Database**: PostgreSQL via Prisma ORM
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **AI**: Claude (Anthropic SDK) for optional AI-generated commentary
- **Reports**: DOCX generation

## Project Structure

```
scorecard8/
├── dps-webapp/          # Next.js application
│   ├── src/
│   │   ├── app/         # Pages and API routes
│   │   ├── components/  # React components + shadcn/ui
│   │   ├── lib/         # Prisma, AI, CSV parsing, report generation
│   │   └── types/       # TypeScript interfaces
│   └── prisma/          # Schema, seed, and SQL scripts
└── docker-compose.yml   # Local PostgreSQL
```

## Local Development

### Prerequisites

- Node.js 18+
- Docker (for local PostgreSQL)

### Setup

```bash
# Start local PostgreSQL
docker compose up -d

# Install dependencies
cd dps-webapp
npm install

# Create local env file
cat > .env.local <<EOF
DATABASE_URL="postgresql://dps_user:dps_password@localhost:5432/dps_webapp"
DIRECT_URL="postgresql://dps_user:dps_password@localhost:5432/dps_webapp"
EOF

# Push schema and seed database
npx prisma db push
DATABASE_URL="postgresql://dps_user:dps_password@localhost:5432/dps_webapp" \
DIRECT_URL="postgresql://dps_user:dps_password@localhost:5432/dps_webapp" \
npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed.ts

# Start dev server
npm run dev
```

App runs at http://localhost:3000

### Optional: AI Commentary

Add to `.env.local`:
```
ANTHROPIC_API_KEY=your-key-here
```

## Production (Vercel + Supabase)

### Database Setup

1. Create a Supabase project
2. Run `prisma/supabase-init.sql` in Supabase SQL Editor (creates tables)
3. Run `prisma/supabase-seed.sql` in Supabase SQL Editor (seeds reference data)

### Vercel Deployment

1. Import the GitHub repo in Vercel
2. Set **Root Directory** to `dps-webapp`
3. Add environment variables:
   - `DATABASE_URL` — Supabase connection string (port 6543, pgbouncer)
   - `DIRECT_URL` — Supabase direct connection (port 5432)
   - `ANTHROPIC_API_KEY` — (optional) for AI commentary

### Environment Files

| File | Purpose |
|------|---------|
| `.env.local` | Local development (Docker PostgreSQL) |
| `.env` | Production (Supabase) — gitignored |

## Dagger Pipeline

The project uses [Dagger](https://dagger.io) for containerized database workflows with ephemeral Postgres — no shared or local DB required.

### Validate (existing pipeline)

Runs migrations (`prisma migrate deploy`), seeds, and health checks against an ephemeral DB:

```bash
make dagger-pipeline
# or: dagger call pipeline --source ./dps-webapp
```

### Create a Migration

Authors a new Prisma migration (`prisma migrate dev`) inside an ephemeral container, then exports the generated migration files back to your local `prisma/migrations/` directory:

```bash
make dagger-migration name=add_user_table
# or: dagger call migration-dev --source ./dps-webapp --migration-name add_user_table
```

The generated migration SQL file will appear in `dps-webapp/prisma/migrations/` ready to commit.

### Recommended Workflow

1. **Feature branch** — modify `schema.prisma`, then run `make dagger-migration name=describe_change`
2. **Review** — inspect the generated SQL in `prisma/migrations/`
3. **Validate** — run `make dagger-pipeline` to confirm the migration applies cleanly
4. **Commit** — commit the migration files and schema changes
5. **CI / deploy** — production runs `prisma migrate deploy` to apply committed migrations

### Prisma Caveats

- `prisma migrate dev` is for **authoring** migrations during development — it creates the SQL file and applies it
- `prisma migrate deploy` is for **applying** committed migrations in CI/production — it never creates new files
- Migration files (`prisma/migrations/`) **must be committed** to version control
- Never run `migrate dev` in production

## Reports

7 department reports available:

| Code | Department |
|------|-----------|
| DPS-01 | Financial Performance |
| DPS-02 | New Vehicle Sales |
| DPS-03 | Used Vehicle Sales |
| DPS-04 | F&I Sales |
| DPS-05 | Parts & Accessories |
| DPS-06 | Apparel & Licensing |
| DPS-07 | Service Sales |

