import { afterEach, describe, expect, it, vi } from "vitest";
import { isExcellentOpportunity } from "../../src/lib/market-research/opportunity";
import { getDiscordWebhookStatus, sendDiscordNotification, maskDiscordWebhookUrl } from "../../src/lib/notifications/channels/discord";
import { isHighValueRepository } from "../../src/lib/notifications/thresholds";

const originalEnv = { ...process.env };
const originalFetch = global.fetch;

afterEach(() => {
  process.env = { ...originalEnv };
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe("notification safety", () => {
  it("masks Discord webhook targets", () => {
    const masked = maskDiscordWebhookUrl("https://discord.com/api/webhooks/1234567890/super-secret-token");

    expect(masked).toBe("discord.com/configured");
    expect(masked).not.toContain("super-secret-token");
  });

  it("classifies Discord webhook configuration without exposing the token", () => {
    expect(getDiscordWebhookStatus(undefined)).toBe("missing");
    expect(getDiscordWebhookStatus("https://discord.com/api/webhooks/1234567890/test-token")).toBe("valid");
    expect(getDiscordWebhookStatus("https://example.com/api/webhooks/1234567890/test-token")).toBe("invalid");
  });

  it("skips Discord when webhook is not configured", async () => {
    delete process.env.DISCORD_WEBHOOK_URL;

    const result = await sendDiscordNotification({
      eventType: "scan_success",
      title: "RepoRadar",
      message: "Scan complete",
      repositories: []
    });

    expect(result.status).toBe("SKIPPED");
    expect(result.maskedTarget).toBeUndefined();
  });

  it("sends Discord notifications only to a valid Discord webhook URL", async () => {
    process.env.DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1234567890/test-token";
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await sendDiscordNotification({
      eventType: "scan_success",
      title: "RepoRadar",
      message: "Scan complete",
      repositories: []
    });

    expect(result.status).toBe("SENT");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://discord.com/api/webhooks/1234567890/test-token",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("rejects non-Discord webhook URLs without sending a request", async () => {
    process.env.DISCORD_WEBHOOK_URL = "https://example.com/api/webhooks/1234567890/test-token";
    const fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await sendDiscordNotification({
      eventType: "scan_success",
      title: "RepoRadar",
      message: "Scan complete",
      repositories: []
    });

    expect(result.status).toBe("FAILED");
    expect(result.error).toBe("DISCORD_WEBHOOK_URL must be an HTTPS Discord webhook URL");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects malformed Discord webhook paths without sending a request", async () => {
    process.env.DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1234567890/test-token/extra";
    const fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await sendDiscordNotification({
      eventType: "scan_success",
      title: "RepoRadar",
      message: "Scan complete",
      repositories: []
    });

    expect(result.status).toBe("FAILED");
    expect(result.error).toBe("DISCORD_WEBHOOK_URL must be an HTTPS Discord webhook URL");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses configurable high-value thresholds", () => {
    process.env.NOTIFICATION_MIN_TREND_SCORE = "75";
    process.env.NOTIFICATION_MIN_WEEKLY_GROWTH = "150";

    expect(isHighValueRepository({ trendScore: 75, growth7d: 0, relevanceScore: 0 })).toBe(true);
    expect(isHighValueRepository({ trendScore: 40, growth7d: 150, relevanceScore: 0 })).toBe(true);
    expect(isHighValueRepository({ trendScore: 40, growth7d: 20, relevanceScore: 40 })).toBe(false);
  });

  it("requires strong independent evidence for opportunity alerts", () => {
    const text = "B2B devtools automation saves time and cost for teams";

    expect(
      isExcellentOpportunity({
        opportunityScore: 90,
        confidenceScore: 4,
        sourceCount: 3,
        independentSourceCount: 3,
        averageSourceConfidence: 80,
        text
      })
    ).toBe(true);
    expect(
      isExcellentOpportunity({
        opportunityScore: 90,
        confidenceScore: 4,
        sourceCount: 3,
        independentSourceCount: 1,
        averageSourceConfidence: 80,
        text
      })
    ).toBe(false);
  });
});
