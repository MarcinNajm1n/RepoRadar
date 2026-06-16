import type { NotificationPayload, NotificationResult } from "../types";

export async function sendNoopNotification(payload: NotificationPayload): Promise<NotificationResult> {
  return {
    channel: "noop",
    eventType: payload.eventType,
    status: "SKIPPED",
    maskedTarget: "local-config",
    payloadJson: JSON.stringify({ title: payload.title, repoCount: payload.repositories?.length ?? 0 }),
    error: "notifications disabled"
  };
}
