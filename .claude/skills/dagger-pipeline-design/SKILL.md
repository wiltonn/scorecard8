---
name: dagger-pipeline-design
description: Guide for adding new functions to Dagger modules. Covers service composition, Prisma migration authoring, and pipeline best practices.
---

When adding new functions to a Dagger module:

## Principles

1. Reuse existing services
2. Avoid duplicating containers
3. Prefer composition of existing functions

Example structure:

postgres()
appContainer()
pipeline()

Add new functions by composing:

createMigration()
    -> postgres()
    -> appContainer()
    -> run prisma migrate dev

## Best practices

- Use service binding instead of port mapping
- Use container.withServiceBinding("postgres", postgresService)
- Set DATABASE_URL using postgres hostname
- Avoid dotenv overrides
- Ensure source mount allows file writes

## For Prisma migration authoring

Run:

prisma migrate dev --name <migrationName>

Ensure migrations are written to:

prisma/migrations/

## Important

`migrate dev` creates migrations
`migrate deploy` applies migrations

Never use `migrate dev` in CI.
