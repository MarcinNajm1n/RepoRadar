import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  config: {
    enableNotifications: true
  },
  prisma: {
    notificationLog: {
      create: vi.fn()
    }
  },
  getBooleanSetting: vi.fn(),
  sendDiscordNotification: vi.fn(),
  sendNoopNotification: vi.fn(),
  sendWindowsNotification: vi.fn()
}));

vi.mock("@/lib/config", () => ({
  getConfig: () => mocks.config
}));

vi.mock("@/lib/db/client", () => ({
  prisma: mocks.prisma
}));

vi.mock("@/lib/db/settings", () => ({
  getBooleanSetting: mocks.getBooleanSetting
}));

vi.mock("@/lib/notifications/channels/discord", () => ({
  sendDiscordNotification: mocks.sendDiscordNotification
}));

vi.mock("@/lib/notifications/channels/noop", () => ({
  sendNoopNotification: mocks.sendNoopNotification
}));

vi.mock("@/lib/notifications/channels/windows", () => ({
  sendWindowsNotification: mocks.sendWindowsNotification
}));

import { dispatchTestNotification } from "../../src/lib/notifications/dispatcher";

describe("notification dispatcher settings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.config.enableNotifications = true;
    mocks.getBooleanSetting.mockResolvedValue(true);
    mocks.prisma.notificationLog.create.mockResolvedValue({});
    mocks.sendNoopNotification.mockResolvedValue({
      channel: "noop",
      eventType: "test_notification",
      status: "SKIPPED",
      maskedTarget: "local-config",
      payloadJson: "{}",
      error: "notifications disabled"
    });
    mocks.sendWindowsNotification.mockResolvedValue({
      channel: "windows",
      eventType: "test_notification",
      status: "SENT",
      maskedTarget: "local-windows",
      payloadJson: "{}"
    });
    mocks.sendDiscordNotification.mockResolvedValue({
      channel: "discord",
      eventType: "test_notification",
      status: "SKIPPED",
      maskedTarget: undefined,
      payloadJson: "{}",
      error: "DISCORD_WEBHOOK_URL is not configured"
    });
  });

  it("uses the persisted local notification setting before sending channels", async () => {
    mocks.getBooleanSetting.mockResolvedValue(false);

    const results = await dispatchTestNotification();

    expect(mocks.getBooleanSetting).toHaveBeenCalledWith("enable_local_notifications", true);
    expect(results).toEqual([
      expect.objectContaining({
        channel: "noop",
        status: "SKIPPED"
      })
    ]);
    expect(mocks.sendNoopNotification).toHaveBeenCalledTimes(1);
    expect(mocks.sendWindowsNotification).not.toHaveBeenCalled();
    expect(mocks.sendDiscordNotification).not.toHaveBeenCalled();
    expect(mocks.prisma.notificationLog.create).toHaveBeenCalledTimes(1);
  });

  it("sends configured notification channels when the persisted setting is enabled", async () => {
    const results = await dispatchTestNotification();

    expect(results.map((result) => result.channel)).toEqual(["windows", "discord"]);
    expect(mocks.sendWindowsNotification).toHaveBeenCalledTimes(1);
    expect(mocks.sendDiscordNotification).toHaveBeenCalledTimes(1);
    expect(mocks.sendNoopNotification).not.toHaveBeenCalled();
    expect(mocks.prisma.notificationLog.create).toHaveBeenCalledTimes(2);
  });
});
