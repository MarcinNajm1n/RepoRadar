import type { RepositoryListItem } from "@/types/repository";

export type RadarReasonTone = "positive" | "warning" | "neutral";

export type RadarReason = {
  id: string;
  title: string;
  detail: string;
  tone: RadarReasonTone;
};

export function buildRepositoryRadarReasons(repo: RepositoryListItem): RadarReason[] {
  const reasons: RadarReason[] = [];

  if (repo.trendScore >= 80) {
    reasons.push({
      id: "high-trend",
      title: "Wysoki trend score",
      detail: `Repo ma ${repo.trendScore}/100, wiec trafia wysoko w rankingu decyzji.`,
      tone: "positive"
    });
  } else if (repo.trendScore >= 60) {
    reasons.push({
      id: "medium-trend",
      title: "Umiarkowany trend score",
      detail: `Repo ma ${repo.trendScore}/100, wiec warto je szybko przeskanowac przed pelnym raportem.`,
      tone: "neutral"
    });
  }

  if (repo.growth7d !== null && repo.growth7d > 0) {
    reasons.push({
      id: "growth-7d",
      title: "Potwierdzony wzrost",
      detail: `Ostatni snapshot pokazuje +${repo.growth7d} stars / 7d.`,
      tone: "positive"
    });
  } else if (repo.scoreBreakdown.usedInitialMomentumFallback || repo.initialMomentumScore > 0) {
    reasons.push({
      id: "initial-momentum",
      title: "Initial momentum zamiast historii 7d",
      detail: "Repo wyglada mocno na starcie, ale wymaga kolejnych skanow do potwierdzenia trendu.",
      tone: "warning"
    });
  }

  if (repo.relevanceScore >= 70 || repo.discoveryProfiles.length > 0) {
    reasons.push({
      id: "relevance",
      title: "Pasuje do profilu RepoRadar",
      detail: repo.discoveryProfiles.length
        ? `Profile: ${repo.discoveryProfiles.slice(0, 3).join(", ")}.`
        : `Relevance score: ${repo.relevanceScore}/100.`,
      tone: "positive"
    });
  }

  if (repo.pushedAt) {
    reasons.push({
      id: "fresh-push",
      title: "Aktywnosc repo",
      detail: `Ostatni push: ${new Date(repo.pushedAt).toLocaleDateString("pl-PL")}.`,
      tone: "neutral"
    });
  }

  if (repo.isArchived) {
    reasons.push({
      id: "archived",
      title: "Repo jest archived",
      detail: "To obniza praktyczna wartosc mimo potencjalnych starsow lub historii.",
      tone: "warning"
    });
  }

  if (repo.isFork) {
    reasons.push({
      id: "fork",
      title: "Repo jest forkiem",
      detail: "Przed decyzja sprawdz repo zrodlowe i realna aktywnosc autora.",
      tone: "warning"
    });
  }

  return reasons.slice(0, 6);
}
