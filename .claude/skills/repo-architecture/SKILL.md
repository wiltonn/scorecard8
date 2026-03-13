---
name: repo-architecture
description: Discover and summarize the repository architecture before implementing changes. Inspects Dagger modules, Prisma setup, pipeline functions, and source mounting.
---

Before implementing changes, always perform repository discovery.

## Steps

1. Inspect root structure
   - README.md
   - Makefile
   - dagger/
   - prisma/
   - package.json

2. Identify Dagger module files
   - look for:
     - dagger.json
     - dagger/main.go
     - dagger.ts
     - dagger/module.ts

3. Inspect Prisma setup
   - prisma/schema.prisma
   - prisma/migrations/
   - prisma/seed.ts

4. Inspect existing pipeline functions
   - postgres
   - app-container
   - pipeline

5. Identify how source is mounted
   - ensure migrations generated inside container persist to host

## Output

Summarize:

- dagger module structure
- postgres service configuration
- app container build steps
- prisma usage
- migration locations
