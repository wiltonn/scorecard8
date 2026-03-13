# Project Context

Stack:

Next.js
Prisma
Postgres
Dagger pipelines
Git worktrees

Key rules:

- migrations authored in feature branches
- prisma migrate dev used for creation
- prisma migrate deploy used for CI
- ephemeral postgres via dagger