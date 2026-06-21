"use client";

import type React from "react";
import { Bell, CalendarClock, Download, Moon, Trash2 } from "lucide-react";
import type { NotificationSummary, SettingsSummary } from "@/types/repository";
import { Badge, Button, SectionCard, Switch } from "./ui";

export function SettingsView({
  settingsSummary,
  notificationSummary,
  isPending,
  onSaveSetting,
  onClearExpiredExternalCache,
  onClearOldNotificationLogs,
  onTestNotification,
  onOpenDailyBriefing,
  onDownloadIdeasCsv,
  onPruneSnapshots
}: {
  settingsSummary: SettingsSummary;
  notificationSummary: NotificationSummary;
  isPending: boolean;
  onSaveSetting: (key: string, value: boolean) => void;
  onClearExpiredExternalCache: () => void;
  onClearOldNotificationLogs: () => void;
  onTestNotification: () => void;
  onOpenDailyBriefing: () => void;
  onDownloadIdeasCsv: () => void;
  onPruneSnapshots: () => void;
}) {
  return (
    <section className="space-y-4">
      <SectionCard title="Ustawienia MVP" description="Konfiguracja lokalnej instancji i bezpieczne akcje utrzymaniowe.">
        <div className="grid gap-3 lg:grid-cols-2">
          <SettingToggle
            id="setting-auto-weekly-ideas"
            label="Automatyczne pomysły z top weekly"
            description="Domyślnie wyłączone, żeby ograniczyć koszt analiz OpenAI."
            initialChecked={settingsSummary.autoGenerateWeeklyIdeas}
            isPending={isPending}
            onSave={(value) => onSaveSetting("auto_generate_weekly_ideas", value)}
          />
          <SettingToggle
            id="setting-local-notifications"
            label="Powiadomienia lokalne"
            description="Badge w UI, logi powiadomień i opcjonalne kanały lokalne."
            initialChecked={settingsSummary.notificationsEnabled}
            isPending={isPending}
            onSave={(value) => onSaveSetting("enable_local_notifications", value)}
          />
        </div>
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-2">
        <SettingsPanel title="Status konfiguracji">
          <div className="grid gap-2 sm:grid-cols-2">
            <InfoItem label="GitHub token" value={settingsSummary.githubTokenConfigured ? "skonfigurowany" : "brak"} />
            <InfoItem label="GitHub API limit" value={formatGitHubRateLimit(settingsSummary.githubRateLimit)} />
            <InfoItem label="OpenAI key" value={settingsSummary.openAiConfigured ? "skonfigurowany" : "brak"} />
            <InfoItem label="Discord webhook" value={settingsSummary.discordWebhookConfigured ? "skonfigurowany" : "brak"} />
            <InfoItem label="DB settings" value={String(settingsSummary.persistedSettingCount)} />
          </div>
          <p className="mt-3 rounded-md border border-border-subtle bg-surface-inset p-3 text-sm text-muted-foreground">
            Sekrety nie są zapisywane w SQLite. Zmieniaj je ręcznie w `.env`; UI pokazuje tylko status.
          </p>
        </SettingsPanel>

        <SettingsPanel title="Ogólne">
          <div className="grid gap-2 sm:grid-cols-2">
            <InfoItem label="UI" value="Polski, desktop-first" />
            <InfoItem label="Motyw" value="preferencje systemu" />
            <InfoItem label="Reports dir" value={settingsSummary.reportsDir} />
            <InfoItem label="Scheduler" value="scripts/register-windows-task.ps1" />
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-md border border-border-subtle bg-surface-inset p-3 text-sm text-muted-foreground">
            <Moon className="h-4 w-4" />
            Ciemny motyw korzysta z ustawień systemu.
          </div>
        </SettingsPanel>

        <SettingsPanel title="Business Research">
          <div className="grid gap-2 sm:grid-cols-2">
            <InfoItem label="Market research" value={String(settingsSummary.marketResearchEnabled)} />
            <InfoItem label="Tryb" value={settingsSummary.marketResearchMode} />
            <InfoItem label="Auto opportunity" value={String(settingsSummary.autoOpportunityResearchEnabled)} />
            <InfoItem label="Market daily limit" value={String(settingsSummary.marketResearchDailyLimit)} />
            <InfoItem label="OpenAI daily limit" value={String(settingsSummary.openAiDailyAnalysisLimit)} />
            <InfoItem label="AI jobs" value={formatAiJobSummary(settingsSummary.aiJobSummary)} />
          </div>
        </SettingsPanel>

        <SettingsPanel title="Evidence, cache i notyfikacje">
          <div className="grid gap-2 sm:grid-cols-2">
            <InfoItem label="Cache TTL" value={`${settingsSummary.externalResearchCacheTtlHours}h`} />
            <InfoItem label="Sent 24h" value={String(notificationSummary.sent24h)} />
            <InfoItem label="Failed 24h" value={String(notificationSummary.failed24h)} />
            <InfoItem label="Skipped 24h" value={String(notificationSummary.skipped24h)} />
            <InfoItem label="Windows" value={String(settingsSummary.windowsNotificationsEnabled)} />
            <InfoItem label="Discord" value={settingsSummary.discordWebhookConfigured ? "skonfigurowany" : "brak"} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={onClearExpiredExternalCache} disabled={isPending}>
              Wyczyść cache
            </Button>
            <Button variant="secondary" onClick={onClearOldNotificationLogs} disabled={isPending}>
              Wyczyść logi 30d+
            </Button>
            <Button variant="secondary" onClick={onTestNotification} disabled={isPending}>
              <Bell className="h-4 w-4" /> Test powiadomienia
            </Button>
          </div>
        </SettingsPanel>
      </div>

      <SettingsPanel title="Źródła zewnętrzne">
        <div className="grid gap-2 text-sm md:grid-cols-2 xl:grid-cols-3">
          <InfoItem label="Market research" value="MARKET_RESEARCH_ENABLED" />
          <InfoItem label="Tryb domyślny" value="MARKET_RESEARCH_MODE=light" />
          <InfoItem label="HN" value="ENABLE_HN_SOURCE" />
          <InfoItem label="RSS" value="ENABLE_RSS_SOURCE + MARKET_RESEARCH_RSS_FEEDS" />
          <InfoItem label="OpenAI web search" value="ENABLE_OPENAI_WEB_SEARCH_SOURCE" />
          <InfoItem label="Auto opportunity" value="ENABLE_AUTO_OPPORTUNITY_RESEARCH" />
          <InfoItem label="Auto limit repo" value="AUTO_OPPORTUNITY_RESEARCH_TOP_REPOS max 3" />
          <InfoItem label="Reddit OAuth" value="ENABLE_REDDIT_SOURCE + REDDIT_CLIENT_ID/SECRET" />
          <InfoItem label="Bluesky" value="ENABLE_BLUESKY_SOURCE" />
          <InfoItem label="Daily limit" value="MARKET_RESEARCH_DAILY_LIMIT" />
          <InfoItem label="Max sources" value="MARKET_RESEARCH_MAX_SOURCES" />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Light używa HN/RSS/cache/OpenAI web search. Full może użyć Reddit i Bluesky tylko po włączeniu ich w .env.
        </p>
        <p className="mt-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm text-warning-foreground">
          Auto research może zużywać limity API. Tryb full powinien być uruchamiany ręcznie.
        </p>
      </SettingsPanel>

      <SettingsPanel title="Dane i maintenance">
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={onOpenDailyBriefing} disabled={isPending}>
            <CalendarClock className="h-4 w-4" /> Daily briefing
          </Button>
          <Button variant="secondary" onClick={onDownloadIdeasCsv} disabled={isPending}>
            <Download className="h-4 w-4" /> Export ideas CSV
          </Button>
          <Button variant="danger" onClick={onPruneSnapshots} disabled={isPending}>
            <Trash2 className="h-4 w-4" /> Prune snapshots 180d+
          </Button>
        </div>
        <div className="mt-3 rounded-md border border-border-subtle bg-surface-inset p-3 text-sm text-muted-foreground">
          GitHub token: Fine-grained PAT, read-only public repositories. OpenAI: pełne raporty i pomysły tylko na żądanie.
        </div>
      </SettingsPanel>
    </section>
  );
}

function SettingToggle({
  id,
  label,
  description,
  initialChecked,
  isPending,
  onSave
}: {
  id: string;
  label: string;
  description: string;
  initialChecked: boolean;
  isPending: boolean;
  onSave: (value: boolean) => void;
}) {
  return (
    <div className="rounded-md border border-border-subtle bg-surface-inset p-3">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div id={`${id}-label`} className="font-medium">
            {label}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <Switch
          checked={initialChecked}
          disabled={isPending}
          aria-labelledby={`${id}-label`}
          onCheckedChange={onSave}
        />
      </div>
    </div>
  );
}

function SettingsPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border-subtle bg-surface-panel p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold">{title}</h3>
        <Badge tone="neutral">{title === "Dane i maintenance" ? "local" : "status"}</Badge>
      </div>
      {children}
    </section>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-border-subtle bg-surface-inset px-3 py-2">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 break-words text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}

function formatGitHubRateLimit(rateLimit: SettingsSummary["githubRateLimit"]) {
  if (!rateLimit) {
    return "brak danych";
  }

  const remaining = rateLimit.remaining ?? "?";
  const limit = rateLimit.limit ?? "?";
  const reset = rateLimit.resetAt ? new Date(rateLimit.resetAt).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }) : "?";
  return `${remaining}/${limit}, reset ${reset}`;
}

function formatAiJobSummary(summary: SettingsSummary["aiJobSummary"]) {
  return `${summary.running} w toku, ${summary.done24h} OK / 24h, ${summary.failed24h} bledow / 24h`;
}
