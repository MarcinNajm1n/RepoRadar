import { loadCliEnv } from "./load-env";

loadCliEnv();

async function main() {
  const [{ runDailyScan }, { prisma }] = await Promise.all([
    import("../src/lib/github/scanner"),
    import("../src/lib/db/client")
  ]);

  try {
    const result = await runDailyScan();
    console.log(`Scan ${result.status}: found ${result.reposFound}, updated ${result.reposUpdated}`);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
