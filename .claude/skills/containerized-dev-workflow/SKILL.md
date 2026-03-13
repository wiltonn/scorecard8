---
name: containerized-dev-workflow
description: Containerized development workflow using Git worktrees, Dagger ephemeral infrastructure, Prisma migrations, and Next.js. Covers branch isolation and migration lifecycle.
---

This project uses:

- Git worktrees
- Dagger ephemeral infrastructure
- Prisma migrations
- Next.js

## Principles

Feature branches must be fully isolated.

No shared Postgres instances.

Each run uses ephemeral Postgres inside Dagger.

## Workflow

Feature branch:

1 create migration
2 validate migration
3 commit migration

Main branch:

1 CI runs prisma migrate deploy

## Tools

Migration authoring:
Dagger function create-migration

Validation:
Dagger pipeline
