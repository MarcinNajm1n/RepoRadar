export type NotificationEventType = "scan_success" | "scan_failure" | "opportunity_candidate_high";
export type NotificationChannel = "windows" | "discord" | "noop";

export type NotificationRepository = {
  fullName: string;
  url: string;
  trendScore: number;
  starsCurrent: number;
  growth7d: number | null;
  relevanceScore: number;
  opportunityScore?: number | null;
  confidenceScore?: number | null;
  sourceCount?: number;
  applicationSummary?: string | null;
  businessRationale?: string | null;
};

export type NotificationPayload = {
  eventType: NotificationEventType;
  title: string;
  message: string;
  scanRunId?: string;
  opportunityCandidateId?: string;
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
