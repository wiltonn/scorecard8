import {
  dag,
  Container,
  Directory,
  Service,
  object,
  func,
} from "@dagger.io/dagger"

@object()
export class Scorecard8 {
  /**
   * Starts an ephemeral Postgres 15 container configured for the DPS webapp
   */
  @func()
  postgres(): Service {
    return dag
      .container()
      .from("postgres:15")
      .withEnvVariable("POSTGRES_USER", "dps_user")
      .withEnvVariable("POSTGRES_PASSWORD", "dps_password")
      .withEnvVariable("POSTGRES_DB", "dps_webapp")
      .withExposedPort(5432)
      .asService()
  }

  /**
   * Builds the app container with deps and Prisma client, bound to the given Postgres service
   */
  @func()
  appContainer(pg: Service, source: Directory): Container {
    const dbUrl =
      "postgresql://dps_user:dps_password@postgres:5432/dps_webapp"

    // Remove env files to prevent dotenv from overriding container env vars
    const cleanSource = source
      .withoutFile(".env")
      .withoutFile(".env.local")

    return dag
      .container()
      .from("node:22-slim")
      .withExec(["apt-get", "update", "-y"])
      .withExec(["apt-get", "install", "-y", "openssl"])
      .withExec(["rm", "-rf", "/var/lib/apt/lists/*"])
      .withMountedDirectory("/app", cleanSource)
      .withWorkdir("/app")
      .withServiceBinding("postgres", pg)
      .withEnvVariable("DATABASE_URL", dbUrl)
      .withEnvVariable("DIRECT_URL", dbUrl)
      .withExec(["npm", "ci"])
      .withExec(["npx", "prisma", "generate"])
  }

  /**
   * Runs the full pipeline: ephemeral DB, migrations, seed, and health check
   */
  @func()
  async pipeline(
    source: Directory,
  ): Promise<string> {
    const pg = this.postgres()
    const app = this.appContainer(pg, source)

    // Cache-bust: ensure migration always runs against the current ephemeral DB
    const migrated = app
      .withEnvVariable("CACHE_BUST", Date.now().toString())
      .withExec([
        "npx",
        "prisma",
        "migrate",
        "deploy",
      ])

    const seeded = migrated.withExec([
      "npx",
      "ts-node",
      "--compiler-options",
      '{"module":"CommonJS"}',
      "prisma/seed.ts",
    ])

    const healthCheck = seeded.withExec([
      "node",
      "-e",
      `
const { PrismaClient } = require("@prisma/client");
async function main() {
  const prisma = new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL } },
  });
  const result = await prisma.$queryRaw\`
    SELECT
      (SELECT count(*)::int FROM "Department") as departments,
      (SELECT count(*)::int FROM "KpiDefinition") as kpis,
      (SELECT count(*)::int FROM "ReportTemplate") as templates
  \`;
  const row = result[0];
  console.log(JSON.stringify(row));
  if (row.departments < 7) throw new Error("Expected at least 7 departments, got " + row.departments);
  console.log("Health check passed");
  await prisma.$disconnect();
}
main();
      `.trim(),
    ])

    return healthCheck.stdout()
  }
}
