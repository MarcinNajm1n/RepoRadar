import { runDailyScan } from "../src/lib/github/scanner";
import { prisma } from "../src/lib/db/client";

async function main() {
  const result = await runDailyScan();
  console.log(`Scan ${result.status}: found ${result.reposFound}, updated ${result.reposUpdated}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
