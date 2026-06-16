import { afterEach, describe, expect, it } from "vitest";
import { isExcellentOpportunity } from "../../src/lib/market-research/opportunity";
import { sendDiscordNotification, maskDiscordWebhookUrl } from "../../src/lib/notifications/channels/discord";
import { isHighValueRepository } from "../../src/lib/notifications/thresholds";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("notification safety", () => {
  it("masks Discord webhook targets", () => {
    const masked = maskDiscordWebhookUrl("https://discord.com/api/webhooks/1234567890/super-secret-token");

    expect(masked).toBe("discord.com/configured");
    expect(masked).not.toContain("super-secret-token");
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
