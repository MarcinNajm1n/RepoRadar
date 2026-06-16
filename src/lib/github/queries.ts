import { subMonths, subDays } from "date-fns";
import { getConfig } from "@/lib/config";
import type { GitHubSearchQuerySpec } from "./types";

function yyyyMmDd(date: Date) {
  return date.toISOString().slice(0, 10);
}

function spec(
  profile: GitHubSearchQuerySpec["profile"],
  query: string,
  minStars: number,
  sort: GitHubSearchQuerySpec["sort"] = "stars"
): GitHubSearchQuerySpec {
  return {
    profile,
    query,
    sort,
    order: "desc",
    minStars
  };
}

export function buildGitHubSearchQueries(now = new Date()): GitHubSearchQuerySpec[] {
  const config = getConfig();
  const specs: GitHubSearchQuerySpec[] = [];
  const freshCreatedSince = yyyyMmDd(subDays(now, config.freshRepoMaxAgeDays));
  const freshPushedSince = yyyyMmDd(subDays(now, config.freshRepoPushedWithinDays));
  const fastPushedSince = yyyyMmDd(subDays(now, config.fastMomentumPushedWithinDays));
  const establishedPushedSince = yyyyMmDd(subDays(now, config.establishedPushedWithinDays));
  const oldCreatedBefore = yyyyMmDd(subMonths(now, config.oldReactivatedMinAgeMonths));
  const oldPushedSince = yyyyMmDd(subDays(now, config.oldReactivatedPushedWithinDays));
  const nichePushedSince = yyyyMmDd(subDays(now, config.nicheRepoPushedWithinDays));

  if (config.enableScanProfileFreshRepos) {
    const minStars = config.freshRepoMinStars;
    specs.push(
      spec("fresh_repos", `"ai agent" stars:>=${minStars} created:>=${freshCreatedSince} pushed:>=${freshPushedSince}`, minStars, "updated"),
      spec("fresh_repos", `"llm" stars:>=${minStars} created:>=${freshCreatedSince} pushed:>=${freshPushedSince}`, minStars, "updated"),
      spec("fresh_repos", `"mcp" stars:>=${minStars} created:>=${freshCreatedSince} pushed:>=${freshPushedSince}`, minStars, "updated"),
      spec("fresh_repos", `"developer tools" "ai" stars:>=${minStars} created:>=${freshCreatedSince} pushed:>=${freshPushedSince}`, minStars, "updated")
    );
  }

  if (config.enableScanProfileFastMomentum) {
    const minStars = config.fastMomentumMinStars;
    specs.push(
      spec("fast_momentum", `"ai agent" stars:>=${minStars} pushed:>=${fastPushedSince}`, minStars),
      spec("fast_momentum", `"llm" stars:>=${minStars} pushed:>=${fastPushedSince}`, minStars),
      spec("fast_momentum", `"rag" stars:>=${minStars} pushed:>=${fastPushedSince}`, minStars),
      spec("fast_momentum", `"model context protocol" stars:>=${minStars} pushed:>=${fastPushedSince}`, minStars),
      spec("fast_momentum", `"workflow automation" "ai" stars:>=${minStars} pushed:>=${fastPushedSince}`, minStars)
    );
  }

  if (config.enableScanProfileEstablishedHot) {
    const minStars = config.minStars;
    specs.push(
      spec("established_hot", `"ai agent" stars:>=${minStars} pushed:>=${establishedPushedSince}`, minStars),
      spec("established_hot", `"llm" stars:>=${minStars} pushed:>=${establishedPushedSince}`, minStars),
      spec("established_hot", `"mcp" stars:>=${minStars} pushed:>=${establishedPushedSince}`, minStars),
      spec("established_hot", `"claude code" stars:>=${minStars} pushed:>=${establishedPushedSince}`, minStars),
      spec("established_hot", `"codex" stars:>=${minStars} pushed:>=${establishedPushedSince}`, minStars),
      spec("established_hot", `"cursor" stars:>=${minStars} pushed:>=${establishedPushedSince}`, minStars),
      spec("established_hot", `"openai agents" stars:>=${minStars} pushed:>=${establishedPushedSince}`, minStars),
      spec("established_hot", `topic:ai stars:>=${minStars} pushed:>=${establishedPushedSince}`, minStars),
      spec("established_hot", `topic:llm stars:>=${minStars} pushed:>=${establishedPushedSince}`, minStars),
      spec("established_hot", `topic:mcp stars:>=${minStars} pushed:>=${establishedPushedSince}`, minStars)
    );
  }

  if (config.enableScanProfileOldReactivated) {
    const minStars = config.oldReactivatedMinStars;
    specs.push(
      spec("old_reactivated", `"ai agent" stars:>=${minStars} created:<=${oldCreatedBefore} pushed:>=${oldPushedSince}`, minStars, "updated"),
      spec("old_reactivated", `"llm" stars:>=${minStars} created:<=${oldCreatedBefore} pushed:>=${oldPushedSince}`, minStars, "updated"),
      spec("old_reactivated", `"mcp" stars:>=${minStars} created:<=${oldCreatedBefore} pushed:>=${oldPushedSince}`, minStars, "updated"),
      spec("old_reactivated", `"developer tools" "llm" stars:>=${minStars} created:<=${oldCreatedBefore} pushed:>=${oldPushedSince}`, minStars, "updated")
    );
  }

  if (config.enableScanProfileNicheAiTools) {
    const minStars = config.nicheRepoMinStars;
    specs.push(
      spec("niche_ai_tools", `"rag" stars:>=${minStars} language:TypeScript pushed:>=${nichePushedSince}`, minStars, "updated"),
      spec("niche_ai_tools", `"rag" stars:>=${minStars} language:Python pushed:>=${nichePushedSince}`, minStars, "updated"),
      spec("niche_ai_tools", `"autonomous agent" stars:>=${minStars} pushed:>=${nichePushedSince}`, minStars, "updated"),
      spec("niche_ai_tools", `"hooks" "ai" stars:>=${minStars} pushed:>=${nichePushedSince}`, minStars, "updated"),
      spec("niche_ai_tools", `"skills" "ai" stars:>=${minStars} pushed:>=${nichePushedSince}`, minStars, "updated")
    );
  }

  return specs;
}
