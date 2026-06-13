import { createWeeklyReport } from "../src/lib/reports/weekly";
import { prisma } from "../src/lib/db/client";

async function main() {
  const report = await createWeeklyReport();
  console.log(`Weekly report created: ${report.markdownPath ?? report.title}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
