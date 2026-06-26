import type { SettingsPanelData } from "@/types/repository";

type MaintenancePreview = SettingsPanelData["settingsSummary"]["maintenancePreview"];

const DEFAULT_NOTIFICATION_LOG_DAYS_TO_KEEP = 30;

export function getNotificationLogDaysToKeep(preview?: MaintenancePreview["notificationLogs"]) {
  return preview?.daysToKeep ?? DEFAULT_NOTIFICATION_LOG_DAYS_TO_KEEP;
}

export function buildClearExpiredExternalCacheConfirmation(preview?: MaintenancePreview["externalResearchCache"]) {
  if (!preview) {
    return "Wyczysc wygasly research cache? Usuwa to tylko lokalne wpisy po TTL.";
  }

  return [
    `Wyczysc ${preview.expiredEntries} wygaslych wpisow research cache?`,
    "",
    preview.expiredEntries > 0 ? "Dry-run: te wpisy sa juz po TTL i zostana usuniete." : "Dry-run: nie ma wpisow do usuniecia.",
    "To usuwa tylko lokalny cache zewnetrznego researchu; dane mozna odtworzyc kolejnym research runem."
  ].join("\n");
}

export function buildClearOldNotificationLogsConfirmation(preview?: MaintenancePreview["notificationLogs"]) {
  const daysToKeep = getNotificationLogDaysToKeep(preview);

  if (!preview) {
    return `Wyczysc logi powiadomien starsze niz ${daysToKeep} dni? Usuwa to tylko lokalna historie powiadomien.`;
  }

  return [
    `Wyczysc ${preview.oldEntries} logow powiadomien starszych niz ${daysToKeep} dni?`,
    "",
    `Dry-run: cutoff ${preview.cutoff}.`,
    preview.oldEntries > 0 ? "Te lokalne logi zostana usuniete." : "Nie ma logow do usuniecia."
  ].join("\n");
}

export function buildPruneSnapshotsConfirmation(preview?: MaintenancePreview["snapshots"]) {
  if (!preview) {
    return "Usunac snapshoty starsze niz 180 dni? Te dane sa lokalne i nie beda odzyskane z historii.";
  }

  const losingHistory =
    preview.repositoriesLosingAllSnapshots > 0
      ? `${preview.repositoriesLosingAllSnapshots} repo straci wszystkie snapshoty.`
      : "Zadne repo nie powinno stracic calej historii snapshotow.";

  return [
    `Usunac snapshoty starsze niz ${preview.daysToKeep} dni? Te dane sa lokalne i nie beda odzyskane z historii.`,
    "",
    `Dry-run: ${preview.oldEntries} snapshotow z ${preview.affectedRepositories} repo.`,
    losingHistory
  ].join("\n");
}
