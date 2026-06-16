import { getConfig } from "@/lib/config";
import { sanitizeExternalText, truncateText } from "@/lib/utils";
import type { NotificationPayload, NotificationResult } from "../types";

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

function buildDiscordBody(payload: NotificationPayload) {
  const repos = payload.repositories ?? [];
  const repoLines = repos
    .slice(0, 8)
    .map((repo) => {
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
        color: payload.eventType === "scan_failure" ? 0xdc2626 : 0x047857
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

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  const body = buildDiscordBody(payload);

  try {
    const response = await fetch(config.discordWebhookUrl, {
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
        payloadJson: JSON.stringify({ title: payload.title, repoCount: payload.repositories?.length ?? 0 }),
        error: `Discord webhook failed with HTTP ${response.status}`
      };
    }

    return {
      channel: "discord",
      eventType: payload.eventType,
      status: "SENT",
      maskedTarget,
      payloadJson: JSON.stringify({ title: payload.title, repoCount: payload.repositories?.length ?? 0 })
    };
  } catch (error) {
    return {
      channel: "discord",
      eventType: payload.eventType,
      status: "FAILED",
      maskedTarget,
      payloadJson: JSON.stringify({ title: payload.title, repoCount: payload.repositories?.length ?? 0 }),
      error: error instanceof Error ? error.message : "Discord webhook request failed"
    };
  } finally {
    clearTimeout(timeout);
  }
}
