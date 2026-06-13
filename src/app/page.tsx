import { RepoRadarApp } from "@/components/repo-radar-app";
import { getDashboardData } from "@/lib/db/repositories";

export default async function Home() {
  const data = await getDashboardData();
  return <RepoRadarApp initialData={data} />;
}
