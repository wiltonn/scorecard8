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
