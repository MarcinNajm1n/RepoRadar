import { subMonths, subDays } from "date-fns";
import { getConfig } from "@/lib/config";

function yyyyMmDd(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function buildGitHubSearchQueries(now = new Date()) {
  const config = getConfig();
  const createdSince = yyyyMmDd(subMonths(now, config.newRepoMaxAgeMonths));
  const pushedSince = yyyyMmDd(subDays(now, 90));
  const minStars = config.minStars;

  return [
    `"ai agent" stars:>=${minStars} pushed:>=${pushedSince}`,
    `"llm" stars:>=${minStars} created:>=${createdSince}`,
    `"mcp" stars:>=${minStars} pushed:>=${pushedSince}`,
    `"model context protocol" stars:>=${minStars}`,
    `"claude code" stars:>=${minStars}`,
    `"codex" stars:>=${minStars}`,
    `"cursor" stars:>=${minStars}`,
    `"openai agents" stars:>=${minStars}`,
    `"rag" stars:>=${minStars} language:TypeScript`,
    `"rag" stars:>=${minStars} language:Python`,
    `"autonomous agent" stars:>=${minStars}`,
    `"developer tools" "llm" stars:>=${minStars}`,
    `"workflow automation" "ai" stars:>=${minStars}`,
    `topic:ai stars:>=${minStars} pushed:>=${pushedSince}`,
    `topic:llm stars:>=${minStars} pushed:>=${pushedSince}`,
    `topic:mcp stars:>=${minStars} pushed:>=${pushedSince}`
  ];
}
