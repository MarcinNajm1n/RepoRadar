import notifier from "node-notifier";
import { getConfig } from "@/lib/config";
import { truncateText } from "@/lib/utils";
import type { NotificationPayload, NotificationResult } from "../types";

function buildWindowsMessage(payload: NotificationPayload) {
  const repos = payload.repositories ?? [];
  if (payload.eventType === "scan_failure") {
    return truncateText(payload.error ?? payload.message, 240);
  }

  const top = repos[0];
  if (!top) {
    return truncateText(payload.message, 240);
  }

  const growth = top.growth7d === null ? "growth baseline" : `+${top.growth7d} stars / 7d`;
  return truncateText(`${top.fullName} | score ${top.trendScore} | ${growth}`, 240);
}

export async function sendWindowsNotification(payload: NotificationPayload): Promise<NotificationResult> {
  const config = getConfig();

  if (!config.enableWindowsNotifications || process.platform !== "win32") {
    return {
      channel: "windows",
      eventType: payload.eventType,
      status: "SKIPPED",
      maskedTarget: process.platform,
      error: config.enableWindowsNotifications ? "Windows notifications are only available on Windows" : "disabled"
    };
  }

  return new Promise((resolve) => {
    notifier.notify(
      {
        title: truncateText(payload.title, 64),
        message: buildWindowsMessage(payload),
        appID: "RepoRadar",
        sound: false,
        wait: false
      },
      (error) => {
        if (error) {
          resolve({
            channel: "windows",
            eventType: payload.eventType,
            status: "FAILED",
            maskedTarget: "local-windows",
            error: error.message
          });
          return;
        }

        resolve({
          channel: "windows",
          eventType: payload.eventType,
          status: "SENT",
          maskedTarget: "local-windows",
          payloadJson: JSON.stringify({ title: payload.title, repoCount: payload.repositories?.length ?? 0 })
        });
      }
    );
  });
}
