import { loadCliEnv } from "./load-env";

loadCliEnv();

async function main() {
  const [{ createWeeklyReport }, { prisma }] = await Promise.all([
    import("../src/lib/reports/weekly"),
    import("../src/lib/db/client")
  ]);

  try {
    const report = await createWeeklyReport();
    console.log(`Weekly report created: ${report.markdownPath ?? report.title}`);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
