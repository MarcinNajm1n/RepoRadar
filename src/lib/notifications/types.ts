export type NotificationEventType = "scan_success" | "scan_failure";
export type NotificationChannel = "windows" | "discord" | "noop";

export type NotificationRepository = {
  fullName: string;
  url: string;
  trendScore: number;
  starsCurrent: number;
  growth7d: number | null;
  relevanceScore: number;
};

export type NotificationPayload = {
  eventType: NotificationEventType;
  title: string;
  message: string;
  scanRunId?: string;
  repositories?: NotificationRepository[];
  error?: string;
};

export type NotificationResult = {
  channel: NotificationChannel;
  eventType: NotificationEventType;
  status: "SENT" | "SKIPPED" | "FAILED";
  maskedTarget?: string;
  payloadJson?: string;
  error?: string;
};
