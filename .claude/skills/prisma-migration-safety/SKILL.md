---
name: prisma-migration-safety
description: Safety rules for Prisma migration workflows in development and deployment. Covers migration creation, deployment, container considerations, and dotenv pitfalls.
---

When modifying Prisma workflows:

## Development

Migration creation:
npx prisma migrate dev --name <migration>

This:
- generates migration SQL
- applies it to the DB
- updates migration history

## Deployment

Use:

npx prisma migrate deploy

This only applies existing migrations.

## Rules

Never generate migrations in CI.

Migration files must be committed.

Migration path:

prisma/migrations/<timestamp>_<name>/

## Containers

When running Prisma in containers:

DATABASE_URL must be explicitly set.

Avoid dotenv override issues by excluding:

.env
.env.local
