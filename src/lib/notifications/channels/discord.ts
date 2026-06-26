import { getConfig } from "@/lib/config";
import { sanitizeExternalText, truncateText } from "@/lib/utils";
import type { NotificationPayload, NotificationResult } from "../types";

const DISCORD_WEBHOOK_HOSTS = new Set(["discord.com", "discordapp.com"]);
const DISCORD_WEBHOOK_ERROR = "DISCORD_WEBHOOK_URL must be an HTTPS Discord webhook URL";

export function maskDiscordWebhookUrl(url: string | undefined) {
  if (!url) {
    return undefined;
  }

  try {
    const parsed = new URL(url);
    return `${parsed.hostname}/configured`;
  } catch {
    return "discord-webhook:configured";
  }
}

function parseDiscordWebhookUrl(url: string | undefined) {
  if (!url) {
    return null;
  }

  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase().replace(/\.+$/g, "");
    if (parsed.protocol !== "https:" || parsed.username || parsed.password || !DISCORD_WEBHOOK_HOSTS.has(hostname)) {
      return null;
    }

    const parts = parsed.pathname.split("/").filter(Boolean);
    const webhookIndex = parts[1] === "webhooks" ? 1 : /^v\d+$/.test(parts[1] ?? "") && parts[2] === "webhooks" ? 2 : -1;
    const webhookId = parts[webhookIndex + 1];
    const webhookToken = parts[webhookIndex + 2];
    if (parts[0] !== "api" || webhookIndex < 0 || parts.length !== webhookIndex + 3 || !/^\d+$/.test(webhookId ?? "") || !webhookToken) {
      return null;
    }

    parsed.hash = "";
    return parsed.toString();
  } catch {
    return null;
  }
}

function buildDiscordBody(payload: NotificationPayload) {
  const repos = payload.repositories ?? [];
  const repoLines = repos
    .slice(0, 8)
    .map((repo) => {
      if (payload.eventType === "opportunity_candidate_high") {
        return `- ${repo.fullName} | opportunity ${repo.opportunityScore ?? "?"}/100 | confidence ${repo.confidenceScore ?? "?"}/5 | sources ${repo.sourceCount ?? 0} | ${repo.url}`;
      }
      const growth = repo.growth7d === null ? "growth: zbieramy" : `growth 7d: +${repo.growth7d}`;
      return `- ${repo.fullName} | score ${repo.trendScore} | ${growth} | ${repo.url}`;
    })
    .join("\n");

  return {
    username: "RepoRadar",
    content: truncateText([payload.message, repoLines].filter(Boolean).join("\n\n"), 1900),
    allowed_mentions: { parse: [] },
    embeds: [
      {
        title: sanitizeExternalText(payload.title, 250) ?? "RepoRadar",
        description: truncateText(sanitizeExternalText(payload.error ?? payload.message, 1000) ?? "", 1000),
        color: payload.eventType === "scan_failure" ? 0xdc2626 : payload.eventType === "opportunity_candidate_high" ? 0x2563eb : 0x047857
      }
    ]
  };
}

export async function sendDiscordNotification(payload: NotificationPayload): Promise<NotificationResult> {
  const config = getConfig();
  const maskedTarget = maskDiscordWebhookUrl(config.discordWebhookUrl);

  if (!config.discordWebhookUrl) {
    return {
      channel: "discord",
      eventType: payload.eventType,
      status: "SKIPPED",
      maskedTarget,
      error: "DISCORD_WEBHOOK_URL is not configured"
    };
  }

  const webhookUrl = parseDiscordWebhookUrl(config.discordWebhookUrl);
  if (!webhookUrl) {
    return {
      channel: "discord",
      eventType: payload.eventType,
      status: "FAILED",
      maskedTarget,
      payloadJson: JSON.stringify({ title: payload.title, repoCount: payload.repositories?.length ?? 0, opportunityCandidateId: payload.opportunityCandidateId }),
      error: DISCORD_WEBHOOK_ERROR
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  const body = buildDiscordBody(payload);

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal
    });

    if (!response.ok) {
      return {
        channel: "discord",
        eventType: payload.eventType,
        status: "FAILED",
        maskedTarget,
        payloadJson: JSON.stringify({ title: payload.title, repoCount: payload.repositories?.length ?? 0, opportunityCandidateId: payload.opportunityCandidateId }),
        error: `Discord webhook failed with HTTP ${response.status}`
      };
    }

    return {
      channel: "discord",
      eventType: payload.eventType,
      status: "SENT",
      maskedTarget,
      payloadJson: JSON.stringify({ title: payload.title, repoCount: payload.repositories?.length ?? 0, opportunityCandidateId: payload.opportunityCandidateId })
    };
  } catch (error) {
    return {
      channel: "discord",
      eventType: payload.eventType,
      status: "FAILED",
      maskedTarget,
      payloadJson: JSON.stringify({ title: payload.title, repoCount: payload.repositories?.length ?? 0, opportunityCandidateId: payload.opportunityCandidateId }),
      error: error instanceof Error ? error.message : "Discord webhook request failed"
    };
  } finally {
    clearTimeout(timeout);
  }
}
