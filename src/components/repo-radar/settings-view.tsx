"use client";

import { useEffect, useState } from "react";
import type React from "react";
import { Bell, CalendarClock, Download, Moon, RefreshCw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { AI_JOB_STATUSES, AI_JOB_TYPES } from "@/types/ai-job";
import type { NotificationSummary, SettingsSummary } from "@/types/repository";
import { Badge, Button, SectionCard, SkeletonBlock, SkeletonText, Switch } from "./ui";
import type { BadgeTone } from "./ui";

const settingsSections = [
  { key: "configuration", label: "Konfiguracja" },
  { key: "ai-costs", label: "AI i koszty" },
  { key: "integrations", label: "Integracje" },
  { key: "observability", label: "Observability" },
  { key: "maintenance", label: "Maintenance" }
] as const;

const OPENAI_CACHE_KIND_LABELS: Record<string, string> = {
  summary: "Podsumowania",
  "repo-report": "Pełne raporty",
  idea: "Pomysły",
  "idea:v2": "Pomysły v2",
  "idea-promote": "Promocje pomysłów",
  "opportunity-research": "Research szans"
};

export type SettingsSectionKey = (typeof settingsSections)[number]["key"];
export type SettingsPanelTarget = "ai-jobs" | "scheduler" | "maintenance" | "observability";

function settingsPanelElementId(target: SettingsPanelTarget) {
  return `settings-panel-${target}`;
}

export function SettingsView({
  activeSection: controlledActiveSection,
  onSectionChange,
  focusPanel,
  onFocusPanelHandled,
  settingsSummary,
  notificationSummary,
  isLoading,
  isPending,
  onSaveSetting,
  onClearExpiredExternalCache,
  onClearOldNotificationLogs,
  onTestNotification,
  onRetryAiJob,
  onOpenDailyBriefing,
  onDownloadIdeasCsv,
  onPruneSnapshots,
  onRetryLoad
}: {
  activeSection?: SettingsSectionKey;
  onSectionChange?: (section: SettingsSectionKey) => void;
  focusPanel?: SettingsPanelTarget | null;
  onFocusPanelHandled?: () => void;
  settingsSummary: SettingsSummary | null;
  notificationSummary: NotificationSummary | null;
  isLoading: boolean;
  isPending: boolean;
  onSaveSetting: (key: string, value: boolean) => void;
  onClearExpiredExternalCache: () => void;
  onClearOldNotificationLogs: () => void;
  onTestNotification: () => void;
  onRetryAiJob: (job: SettingsSummary["recentAiJobs"][number]) => void;
  onOpenDailyBriefing: () => void;
  onDownloadIdeasCsv: () => void;
  onPruneSnapshots: () => void;
  onRetryLoad: () => void;
}) {
  const [localActiveSection, setLocalActiveSection] = useState<SettingsSectionKey>("configuration");
  const activeSection = controlledActiveSection ?? localActiveSection;

  function handleSectionChange(section: SettingsSectionKey) {
    if (controlledActiveSection === undefined) {
      setLocalActiveSection(section);
    }
    onSectionChange?.(section);
  }

  useEffect(() => {
    if (!focusPanel || !settingsSummary || !notificationSummary) {
      return undefined;
    }

    const focusFrame = window.requestAnimationFrame(() => {
      const element = document.getElementById(settingsPanelElementId(focusPanel));
      if (element instanceof HTMLElement && !element.classList.contains("hidden")) {
        element.scrollIntoView({ block: "start" });
        element.focus({ preventScroll: true });
        onFocusPanelHandled?.();
      }
    });

    return () => window.cancelAnimationFrame(focusFrame);
  }, [activeSection, focusPanel, notificationSummary, onFocusPanelHandled, settingsSummary]);

  if (!settingsSummary || !notificationSummary) {
    return (
      <section className="space-y-4" aria-busy={isLoading}>
        <SectionCard
          title="Ustawienia MVP"
          description={isLoading ? "Pobieram pelne dane ustawien i observability..." : "Dane ustawien nie sa jeszcze zaladowane."}
        >
          {isLoading ? (
            <div className="space-y-4" role="status" aria-live="polite">
              <span className="sr-only">Laduje pelne dane ustawien.</span>
              <div className="grid gap-3 lg:grid-cols-2">
                <SkeletonBlock className="h-24" />
                <SkeletonBlock className="h-24" />
              </div>
              <div className="grid gap-3 xl:grid-cols-2">
                <SkeletonBlock className="h-40" />
                <SkeletonBlock className="h-40" />
                <SkeletonBlock className="h-40" />
                <SkeletonBlock className="h-40" />
              </div>
              <SkeletonText lines={6} />
            </div>
          ) : (
            <div className="rounded-md border border-border-subtle bg-surface-inset p-3">
              <p className="text-sm text-muted-foreground">Nie udalo sie zaladowac pelnych danych ustawien.</p>
              <Button className="mt-3" variant="secondary" size="sm" onClick={onRetryLoad} disabled={isPending}>
                Ponow pobieranie
              </Button>
            </div>
          )}
        </SectionCard>
      </section>
    );
  }

  const maintenancePreview = settingsSummary.maintenancePreview;
  const expiredCacheCount = maintenancePreview.externalResearchCache.expiredEntries;
  const oldNotificationLogCount = maintenancePreview.notificationLogs.oldEntries;
  const oldSnapshotCount = maintenancePreview.snapshots.oldEntries;

  return (
    <section className="space-y-4">
      <SettingsSectionNav activeSection={activeSection} onSectionChange={handleSectionChange} />

      <SectionCard
        title="Ustawienia MVP"
        description="Konfiguracja lokalnej instancji i bezpieczne akcje utrzymaniowe."
        className={activeSection === "configuration" ? undefined : "hidden"}
      >
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
        <SettingsPanel title="Status konfiguracji" className={activeSection === "configuration" ? undefined : "hidden"}>
          <div className="grid gap-2 sm:grid-cols-2">
            <InfoItem label="GitHub token" value={settingsSummary.githubTokenConfigured ? "skonfigurowany" : "brak"} />
            <InfoItem label="GitHub API limit" value={formatGitHubRateLimit(settingsSummary.githubRateLimit)} />
            <InfoItem label="OpenAI key" value={settingsSummary.openAiConfigured ? "skonfigurowany" : "brak"} />
            <InfoItem label="Discord webhook" value={formatDiscordWebhookStatus(settingsSummary.discordWebhookStatus)} />
            <InfoItem label="DB settings" value={String(settingsSummary.persistedSettingCount)} />
          </div>
          <p className="mt-3 rounded-md border border-border-subtle bg-surface-inset p-3 text-sm text-muted-foreground">
            Sekrety nie są zapisywane w SQLite. Zmieniaj je ręcznie w `.env`; UI pokazuje tylko status.
          </p>
          {!settingsSummary.githubTokenConfigured ? (
            <p className="mt-3 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm text-warning-foreground" role="alert">
              GITHUB_TOKEN ustaw w `.env`, zeby zwiekszyc limit skanow GitHub. Po zmianie zrestartuj `npm run dev`. UI nie pokazuje ani nie zapisuje wartosci tokena.
            </p>
          ) : null}
          {!settingsSummary.openAiConfigured ? (
            <p className="mt-3 rounded-md border border-info/40 bg-info/10 p-3 text-sm text-info-foreground">
              OPENAI_API_KEY jest opcjonalny. Dodaj go w `.env` tylko dla raportow, briefow i pomyslow AI na zadanie; po zmianie zrestartuj `npm run dev`.
            </p>
          ) : null}
          {settingsSummary.discordWebhookStatus === "invalid" ? (
            <p className="mt-3 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm text-warning-foreground" role="alert">
              DISCORD_WEBHOOK_URL musi byc adresem HTTPS w formacie https://discord.com/api/webhooks/ID/TOKEN. Po zmianie zrestartuj `npm run dev`.
            </p>
          ) : null}
        </SettingsPanel>

        <SettingsPanel title="Ogólne" className={activeSection === "configuration" ? undefined : "hidden"}>
          <div className="grid gap-2 sm:grid-cols-2">
            <InfoItem label="UI" value="Polski, desktop-first" />
            <InfoItem label="Motyw" value="preferencje systemu" />
            <InfoItem label="Reports dir" value={settingsSummary.reportsDir} />
            <InfoItem label="Scheduler" value={formatSchedulerShortStatus(settingsSummary.scheduler)} />
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-md border border-border-subtle bg-surface-inset p-3 text-sm text-muted-foreground">
            <Moon className="h-4 w-4" />
            Ciemny motyw korzysta z ustawień systemu.
          </div>
        </SettingsPanel>

        <SettingsPanel id={settingsPanelElementId("scheduler")} title="Scheduler Windows" className={activeSection === "configuration" ? "xl:col-span-2" : "hidden"}>
          <SchedulerDiagnostics scheduler={settingsSummary.scheduler} />
        </SettingsPanel>

        <SettingsPanel title="Business Research" className={activeSection === "ai-costs" ? "xl:col-span-2" : "hidden"}>
          <div className="grid gap-2 sm:grid-cols-2">
            <InfoItem label="Market research" value={String(settingsSummary.marketResearchEnabled)} />
            <InfoItem label="Tryb" value={settingsSummary.marketResearchMode} />
            <InfoItem label="Auto opportunity" value={String(settingsSummary.autoOpportunityResearchEnabled)} />
            <InfoItem label="Market daily limit" value={String(settingsSummary.marketResearchDailyLimit)} />
            <InfoItem label="OpenAI daily limit" value={String(settingsSummary.openAiDailyAnalysisLimit)} />
            <InfoItem label="AI jobs" value={formatAiJobSummary(settingsSummary.aiJobSummary)} />
            <InfoItem label="AI dzisiaj" value={String(settingsSummary.aiCostSummary.analysesToday)} />
            <InfoItem label="AI tydzien" value={String(settingsSummary.aiCostSummary.analysesThisWeek)} />
            <InfoItem label="AI all-time" value={String(settingsSummary.aiCostSummary.analysesAllTime)} />
            <InfoItem label="Next full report" value={settingsSummary.aiCostSummary.estimatedNextActions.report} />
          </div>
        </SettingsPanel>

        <SettingsPanel id={settingsPanelElementId("ai-jobs")} title="Centrum zadan AI" className={activeSection === "ai-costs" ? "xl:col-span-2" : "hidden"}>
          <AiJobsCenter
            queue={settingsSummary.aiJobQueue}
            jobs={settingsSummary.recentAiJobs}
            estimatedNextActions={settingsSummary.aiCostSummary.estimatedNextActions}
            isPending={isPending}
            onRetryAiJob={onRetryAiJob}
          />
        </SettingsPanel>

        <SettingsPanel title="Cache OpenAI" className={activeSection === "ai-costs" ? "xl:col-span-2" : "hidden"}>
          <OpenAiCacheDiagnostics summary={settingsSummary.openAiCache} />
        </SettingsPanel>

        <SettingsPanel title="Evidence, cache i notyfikacje" className={activeSection === "integrations" ? "xl:col-span-2" : "hidden"}>
          <div className="grid gap-2 sm:grid-cols-2">
            <InfoItem label="Cache TTL" value={`${settingsSummary.externalResearchCacheTtlHours}h`} />
            <InfoItem label="Sent 24h" value={String(notificationSummary.sent24h)} />
            <InfoItem label="Failed 24h" value={String(notificationSummary.failed24h)} />
            <InfoItem label="Skipped 24h" value={String(notificationSummary.skipped24h)} />
            <InfoItem label="Windows" value={String(settingsSummary.windowsNotificationsEnabled)} />
            <InfoItem label="Discord" value={formatDiscordWebhookStatus(settingsSummary.discordWebhookStatus)} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="secondary" onClick={onTestNotification} disabled={isPending}>
              <Bell className="h-4 w-4" /> Test powiadomienia
            </Button>
          </div>
        </SettingsPanel>
      </div>

      <SettingsPanel title="Źródła zewnętrzne" className={activeSection === "integrations" ? undefined : "hidden"}>
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

      <SettingsPanel id={settingsPanelElementId("observability")} title="Observability" className={activeSection === "observability" ? undefined : "hidden"}>
        <div className="grid gap-2 text-sm md:grid-cols-2 xl:grid-cols-4">
          <InfoItem label="Ostatni scan" value={formatLastScan(settingsSummary.observability)} />
          <InfoItem label="Czas ostatniego skanu" value={formatDuration(settingsSummary.observability.lastScan?.durationMs ?? null)} />
          <InfoItem label="Sredni czas skanu" value={formatDuration(settingsSummary.observability.averageScanDurationMs)} />
          <InfoItem label="Bledy scan 24h" value={String(settingsSummary.observability.failedScans24h)} />
          <InfoItem label="Repo aktywne" value={String(settingsSummary.observability.totalRepositories)} />
          <InfoItem label="Repos scanned" value={formatScanRepos(settingsSummary.observability)} />
          <InfoItem label="GitHub calls runtime" value={String(settingsSummary.observability.githubRuntime.requests)} />
          <InfoItem label="GitHub ETag hits" value={formatGitHubCacheStats(settingsSummary.observability.githubRuntime)} />
          <InfoItem label="OpenAI cache" value={String(settingsSummary.observability.openAiCacheEntries)} />
          <InfoItem label="Research cache" value={formatResearchCache(settingsSummary.observability)} />
          <InfoItem label="Research runs 24h" value={String(settingsSummary.observability.marketResearchRuns24h)} />
          <InfoItem label="Research sources 24h" value={String(settingsSummary.observability.marketResearchSources24h)} />
        </div>
        <p className="mt-3 rounded-md border border-border-subtle bg-surface-inset p-3 text-sm text-muted-foreground">
          Liczniki GitHub calls i ETag hits sa runtime-only dla obecnego procesu Next.js. Scan duration, cache i rate limit pochodza z lokalnej bazy.
        </p>
      </SettingsPanel>

      <SettingsPanel title="Graphify maintenance" className={activeSection === "maintenance" ? undefined : "hidden"}>
        <div className="grid gap-2 text-sm md:grid-cols-2 xl:grid-cols-4">
          <InfoItem label="Status grafu" value={settingsSummary.graphify.status} />
          <InfoItem label="Nodes" value={String(settingsSummary.graphify.nodeCount)} />
          <InfoItem label="Edges" value={String(settingsSummary.graphify.edgeCount)} />
          <InfoItem label="Communities" value={String(settingsSummary.graphify.communityCount)} />
          <InfoItem label="Manifest files" value={String(settingsSummary.graphify.manifestFileCount)} />
          <InfoItem label="Last update" value={formatOptionalDateTime(settingsSummary.graphify.lastUpdatedAt)} />
          <InfoItem label="Graph size" value={formatBytes(settingsSummary.graphify.graphSizeBytes)} />
          <InfoItem label="Report size" value={formatBytes(settingsSummary.graphify.reportSizeBytes)} />
          <InfoItem label="Package/cache" value={settingsSummary.graphify.packageVersion ?? "brak danych"} />
          <InfoItem label="Skill" value={formatGraphifySkill(settingsSummary.graphify)} />
          <InfoItem label="Skill path" value={settingsSummary.graphify.skillPath ?? "brak lokalnego skill"} />
          <InfoItem label="Graph exists" value={String(settingsSummary.graphify.graphExists)} />
        </div>
        <p className="mt-3 rounded-md border border-border-subtle bg-surface-inset p-3 text-sm text-muted-foreground">
          {settingsSummary.graphify.note} Panel czyta pliki lokalnie i nie uruchamia `graphify update` podczas renderowania UI.
        </p>
      </SettingsPanel>

      <SettingsPanel id={settingsPanelElementId("maintenance")} title="Dane i maintenance" className={activeSection === "maintenance" ? undefined : "hidden"}>
        <MaintenancePreview preview={maintenancePreview} />
        <p className="mt-3 rounded-md border border-border-subtle bg-surface-inset p-3 text-sm text-muted-foreground">
          Akcje czyszczenia pokazuja potwierdzenie z aktualnym dry-run, zanim usuna lokalne dane.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={onClearExpiredExternalCache} disabled={isPending || expiredCacheCount === 0}>
            Wyczysc cache ({expiredCacheCount})
          </Button>
          <Button variant="secondary" onClick={onClearOldNotificationLogs} disabled={isPending || oldNotificationLogCount === 0}>
            Wyczysc logi {maintenancePreview.notificationLogs.daysToKeep}d+ ({oldNotificationLogCount})
          </Button>
          <Button variant="danger" onClick={onPruneSnapshots} disabled={isPending || oldSnapshotCount === 0}>
            <Trash2 className="h-4 w-4" /> Przytnij snapshoty {maintenancePreview.snapshots.daysToKeep}d+ ({oldSnapshotCount})
          </Button>
          <Button variant="secondary" onClick={onOpenDailyBriefing} disabled={isPending}>
            <CalendarClock className="h-4 w-4" /> Brief dzienny
          </Button>
          <Button variant="secondary" onClick={onDownloadIdeasCsv} disabled={isPending}>
            <Download className="h-4 w-4" /> Eksport pomyslow CSV
          </Button>
        </div>
        <div className="mt-3 rounded-md border border-border-subtle bg-surface-inset p-3 text-sm text-muted-foreground">
          GitHub token: Fine-grained PAT, read-only public repositories. OpenAI: pełne raporty i pomysły tylko na żądanie.
        </div>
      </SettingsPanel>
    </section>
  );
}

function SettingsSectionNav({
  activeSection,
  onSectionChange
}: {
  activeSection: SettingsSectionKey;
  onSectionChange: (section: SettingsSectionKey) => void;
}) {
  return (
    <nav className="rounded-lg border border-border-subtle bg-surface-panel p-2 shadow-soft" aria-label="Sekcje ustawien">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {settingsSections.map((section) => {
          const isActive = activeSection === section.key;

          return (
            <button
              key={section.key}
              type="button"
              className={cn(
                "rounded-md border border-border-subtle bg-surface-raised px-3 py-2 text-sm font-medium transition duration-fast ease-interface hover:bg-surface-inset",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                isActive && "border-primary/30 bg-accent text-accent-foreground"
              )}
              aria-pressed={isActive}
              aria-current={isActive ? "page" : undefined}
              onClick={() => onSectionChange(section.key)}
            >
              {section.label}
            </button>
          );
        })}
      </div>
    </nav>
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

function SettingsPanel({ id, title, children, className }: { id?: string; title: string; children: React.ReactNode; className?: string }) {
  const titleId = id ? `${id}-title` : undefined;

  return (
    <section
      id={id}
      tabIndex={id ? -1 : undefined}
      aria-labelledby={titleId}
      className={cn(
        "rounded-lg border border-border-subtle bg-surface-panel p-4 shadow-soft",
        id && "scroll-mt-24 focus:outline-none focus:ring-2 focus:ring-focus/50 focus:ring-offset-2 focus:ring-offset-background",
        className
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 id={titleId} className="text-base font-semibold">
          {title}
        </h3>
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
      <div className="mt-1 break-words text-sm font-semibold tabular-nums text-foreground">{value}</div>
    </div>
  );
}

function SchedulerDiagnostics({ scheduler }: { scheduler: SettingsSummary["scheduler"] }) {
  return (
    <div className="space-y-3">
      <div className="grid gap-2 text-sm md:grid-cols-2 xl:grid-cols-4">
        <InfoItem label="Status" value={formatSchedulerShortStatus(scheduler)} />
        <InfoItem label="Task" value={scheduler.taskName} />
        <InfoItem label="Stan" value={scheduler.state ?? "brak danych"} />
        <InfoItem label="Ostatni wynik" value={scheduler.lastResultLabel} />
        <InfoItem label="Ostatni run" value={formatOptionalDateTime(scheduler.lastRunAt)} />
        <InfoItem label="Nastepny run" value={formatOptionalDateTime(scheduler.nextRunAt)} />
        <InfoItem label="Missed runs" value={scheduler.missedRuns === null ? "brak danych" : String(scheduler.missedRuns)} />
        <InfoItem label="Ostatni log" value={scheduler.latestLogPath ?? "brak logow"} />
      </div>

      <div className="rounded-md border border-border-subtle bg-surface-inset p-3 text-sm text-muted-foreground">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge tone={getSchedulerBadgeTone(scheduler.status)} variant="status">
            {formatSchedulerShortStatus(scheduler)}
          </Badge>
          <span>{scheduler.note}</span>
        </div>
        <div className="grid gap-2 lg:grid-cols-2">
          <div>
            <div className="mb-1 text-xs font-medium text-muted-foreground">Sprawdz status</div>
            <code className="block break-words rounded-md border border-border-subtle bg-surface-panel p-2 text-xs text-foreground">
              {scheduler.checkCommand}
            </code>
          </div>
          <div>
            <div className="mb-1 text-xs font-medium text-muted-foreground">Uruchom recznie</div>
            <code className="block break-words rounded-md border border-border-subtle bg-surface-panel p-2 text-xs text-foreground">
              {scheduler.runCommand}
            </code>
          </div>
        </div>
      </div>

      {scheduler.error ? (
        <p className="break-words rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {scheduler.error}
        </p>
      ) : null}
    </div>
  );
}

function MaintenancePreview({ preview }: { preview: SettingsSummary["maintenancePreview"] }) {
  const snapshots = preview.snapshots;
  const losingAllSnapshots = snapshots.repositoriesLosingAllSnapshots;

  return (
    <div>
      <div className="grid gap-2 text-sm md:grid-cols-2 xl:grid-cols-5">
        <InfoItem label="Wygasly research cache" value={String(preview.externalResearchCache.expiredEntries)} />
        <InfoItem label={`Logi ${preview.notificationLogs.daysToKeep}d+`} value={String(preview.notificationLogs.oldEntries)} />
        <InfoItem label={`Snapshoty ${snapshots.daysToKeep}d+`} value={String(snapshots.oldEntries)} />
        <InfoItem label="Repo dotkniete" value={String(snapshots.affectedRepositories)} />
        <InfoItem label="Repo bez historii" value={String(losingAllSnapshots)} />
      </div>
      <p className="mt-3 rounded-md border border-border-subtle bg-surface-inset p-3 text-sm text-muted-foreground">
        Preview jest dry-run: pokazuje lokalne rekordy kwalifikujace sie do czyszczenia bez usuwania danych. Wygenerowano:{" "}
        {formatOptionalDateTime(preview.generatedAt)}.
      </p>
      {losingAllSnapshots > 0 ? (
        <p className="mt-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm text-warning-foreground">
          {losingAllSnapshots} repo straci wszystkie snapshoty po prune. Sprawdz, czy to akceptowalne przed potwierdzeniem.
        </p>
      ) : null}
    </div>
  );
}

function OpenAiCacheDiagnostics({ summary }: { summary: SettingsSummary["openAiCache"] }) {
  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <InfoItem label="Łącznie wpisów" value={String(summary.totalEntries)} />
        {summary.byKind.map((entry) => (
          <InfoItem key={entry.kind} label={formatOpenAiCacheKind(entry.kind)} value={String(entry.count)} />
        ))}
      </div>

      {summary.byKind.length === 0 ? (
        <div className="rounded-md border border-border-subtle bg-surface-inset p-3 text-sm text-muted-foreground">
          Brak wpisów cache OpenAI.
        </div>
      ) : (
        <RecentOpenAiCacheEntries entries={summary.recentEntries} />
      )}

      {summary.byKind.length > 0 ? (
        <p className="rounded-md border border-border-subtle bg-surface-inset p-3 text-sm text-muted-foreground">
          Panel jest tylko diagnostyczny: nie czyści cache i nie pokazuje liczby trafień, bo tabela jej nie zapisuje.
        </p>
      ) : null}
    </div>
  );
}

function RecentOpenAiCacheEntries({ entries }: { entries: SettingsSummary["openAiCache"]["recentEntries"] }) {
  if (entries.length === 0) {
    return (
      <div className="rounded-md border border-border-subtle bg-surface-inset p-3 text-sm text-muted-foreground">
        Brak ostatnich wpisów cache.
      </div>
    );
  }

  return (
    <div
      className="overflow-x-auto rounded-md border border-border-subtle"
      role="region"
      aria-label="Ostatnie wpisy cache OpenAI"
      tabIndex={0}
    >
      <table className="min-w-full divide-y divide-border-subtle text-sm">
        <caption className="sr-only">Ostatnie wpisy cache OpenAI</caption>
        <thead className="bg-surface-inset text-xs font-medium uppercase text-muted-foreground">
          <tr>
            <th scope="col" className="px-3 py-2 text-left">
              Typ
            </th>
            <th scope="col" className="px-3 py-2 text-left">
              Repo
            </th>
            <th scope="col" className="px-3 py-2 text-left">
              Model
            </th>
            <th scope="col" className="px-3 py-2 text-left">
              Zapisano
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle bg-surface-panel">
          {entries.map((entry) => (
            <tr key={entry.id}>
              <td className="px-3 py-2 font-medium text-foreground">{formatOpenAiCacheKind(entry.kind)}</td>
              <td className="max-w-[18rem] break-words px-3 py-2 text-muted-foreground">{entry.repoFullName ?? "bez repo"}</td>
              <td className="max-w-[16rem] break-words px-3 py-2 text-muted-foreground">{entry.model}</td>
              <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{formatOpenAiCacheDate(entry.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AiJobsCenter({
  queue,
  jobs,
  estimatedNextActions,
  isPending,
  onRetryAiJob
}: {
  queue: SettingsSummary["aiJobQueue"];
  jobs: SettingsSummary["recentAiJobs"];
  estimatedNextActions: SettingsSummary["aiCostSummary"]["estimatedNextActions"];
  isPending: boolean;
  onRetryAiJob: (job: SettingsSummary["recentAiJobs"][number]) => void;
}) {
  const oldestActive = queue.oldestActiveJob;
  const availableRetryCount = queue.recentFailures.filter((job) => canRetryAiJobFromSettings(job, estimatedNextActions)).length;

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <InfoItem label="Aktywne" value={String(queue.activeCount)} />
        <InfoItem label="Bledy lacznie" value={String(queue.needsAttentionCount)} />
        <InfoItem label="Retry dostepne" value={String(availableRetryCount)} />
        <InfoItem label="Najstarsze aktywne" value={oldestActive ? formatAiJobSource(oldestActive) : "brak"} />
      </div>

      <div className="grid gap-2 lg:grid-cols-2">
        <AiJobCountLedger title="Statusy" counts={queue.byStatus} />
        <AiJobCountLedger title="Typy" counts={queue.byType} emptyText="Brak zarejestrowanych typow zadan." />
      </div>

      {queue.activeCount > 0 ? (
        <p className="rounded-md border border-info/40 bg-info/10 p-3 text-sm text-info-foreground">
          {queue.activeCount} zadanie AI jest aktywne. Kolejne uruchomienie tej samej analizy zostanie zablokowane przez dedupe.
        </p>
      ) : null}

      <AiJobRetryActions
        failures={queue.recentFailures}
        totalFailedCount={queue.needsAttentionCount}
        estimatedNextActions={estimatedNextActions}
        isPending={isPending}
        onRetryAiJob={onRetryAiJob}
      />
      <RecentAiJobsList jobs={jobs} />
    </div>
  );
}

function AiJobCountLedger({
  title,
  counts,
  emptyText = "Brak danych."
}: {
  title: string;
  counts: SettingsSummary["aiJobQueue"]["byStatus"];
  emptyText?: string;
}) {
  const visibleCounts = counts.filter((entry) => entry.count > 0);

  return (
    <div className="rounded-md border border-border-subtle bg-surface-inset p-3">
      <div className="text-xs font-medium text-muted-foreground">{title}</div>
      {visibleCounts.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {visibleCounts.map((entry) => (
            <Badge key={entry.key} tone="neutral">
              {entry.label}: <span className="tabular-nums">{entry.count}</span>
            </Badge>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">{emptyText}</p>
      )}
    </div>
  );
}

function AiJobRetryActions({
  failures,
  totalFailedCount,
  estimatedNextActions,
  isPending,
  onRetryAiJob
}: {
  failures: SettingsSummary["aiJobQueue"]["recentFailures"];
  totalFailedCount: number;
  estimatedNextActions: SettingsSummary["aiCostSummary"]["estimatedNextActions"];
  isPending: boolean;
  onRetryAiJob: (job: SettingsSummary["recentAiJobs"][number]) => void;
}) {
  if (failures.length === 0) {
    return totalFailedCount > 0 ? (
      <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm text-warning-foreground">
        W historii jest {totalFailedCount} nieudanych zadan AI, ale nie ma bledow z ostatnich 24h do szybkiego retry.
      </div>
    ) : (
      <div className="rounded-md border border-border-subtle bg-surface-inset p-3 text-sm text-muted-foreground">
        Brak bledow AI z ostatnich 24h.
      </div>
    );
  }

  return (
    <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm text-warning-foreground">
      <div className="font-medium">Ostatnie bledy 24h</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {failures.map((job) => {
          const retryCost = getAiJobRetryCostLabel(job.type, estimatedNextActions);
          const canRetry = canRetryAiJobFromSettings(job, estimatedNextActions);

          return canRetry ? (
            <Button
              key={job.id}
              size="sm"
              variant="secondary"
              className="max-w-full justify-start"
              title={`Ponow ${formatAiJobSource(job)} (${retryCost})`}
              onClick={() => onRetryAiJob(job)}
              disabled={isPending}
            >
              <RefreshCw className="h-4 w-4 shrink-0" />
              <span className="max-w-[18rem] truncate">Ponow {formatAiJobSource(job)}</span>
              <span className="shrink-0 text-xs text-muted-foreground">({retryCost})</span>
            </Button>
          ) : (
            <span key={job.id} className="rounded-md border border-warning/40 bg-surface-panel px-2 py-1 text-warning-foreground">
              {formatAiJobSource(job)}: {formatAiJobRetryHint(job, estimatedNextActions)}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function RecentAiJobsList({ jobs }: { jobs: SettingsSummary["recentAiJobs"] }) {
  if (jobs.length === 0) {
    return (
      <div className="rounded-md border border-border-subtle bg-surface-inset p-3 text-sm text-muted-foreground">
        Brak zarejestrowanych zadań AI.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border-subtle" role="region" aria-label="Ostatnie zadania AI" tabIndex={0}>
      <table className="min-w-full divide-y divide-border-subtle text-sm">
        <caption className="sr-only">Ostatnie zadania AI</caption>
        <thead className="bg-surface-inset text-xs font-medium uppercase text-muted-foreground">
          <tr>
            <th scope="col" className="px-3 py-2 text-left">
              Typ
            </th>
            <th scope="col" className="px-3 py-2 text-left">
              Status
            </th>
            <th scope="col" className="px-3 py-2 text-right">
              Priorytet
            </th>
            <th scope="col" className="px-3 py-2 text-left">
              Repo
            </th>
            <th scope="col" className="px-3 py-2 text-left">
              Ostatni etap
            </th>
            <th scope="col" className="px-3 py-2 text-left">
              Błąd
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle bg-surface-panel">
          {jobs.map((job) => (
            <tr key={job.id}>
              <td className="px-3 py-2 font-medium text-foreground">{formatAiJobType(job.type)}</td>
              <td className="px-3 py-2">
                <Badge tone={getAiJobStatusTone(job.status)} variant="status">
                  {formatAiJobStatus(job.status)}
                </Badge>
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{job.priority}</td>
              <td className="max-w-[18rem] break-words px-3 py-2 text-muted-foreground">
                {job.repoFullName ?? "bez repo"}
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">{formatAiJobTime(job)}</td>
              <td className="max-w-[22rem] break-words px-3 py-2 text-muted-foreground">
                {job.error ?? <span aria-label="Brak błędu">-</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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

function formatSchedulerShortStatus(scheduler: SettingsSummary["scheduler"]) {
  switch (scheduler.status) {
    case "ready":
      return "zarejestrowany";
    case "missing":
      return "brak zadania";
    case "unavailable":
      return "tylko Windows";
    case "error":
      return "blad odczytu";
    default:
      return scheduler.status;
  }
}

function formatDiscordWebhookStatus(status: SettingsSummary["discordWebhookStatus"]) {
  if (status === "valid") {
    return "skonfigurowany";
  }

  if (status === "invalid") {
    return "niepoprawny URL";
  }

  return "brak";
}

function getSchedulerBadgeTone(status: SettingsSummary["scheduler"]["status"]): BadgeTone {
  switch (status) {
    case "ready":
      return "success";
    case "missing":
      return "warning";
    case "error":
      return "danger";
    case "unavailable":
    default:
      return "neutral";
  }
}

function formatAiJobSummary(summary: SettingsSummary["aiJobSummary"]) {
  return `${summary.running} w toku, ${summary.done24h} OK / 24h, ${summary.failed24h} błędów / 24h`;
}

function formatAiJobSource(job: SettingsSummary["recentAiJobs"][number]) {
  return `${formatAiJobType(job.type)} / ${job.repoFullName ?? "bez repo"}`;
}

function getAiJobRetryCostLabel(type: string, estimatedNextActions: SettingsSummary["aiCostSummary"]["estimatedNextActions"]) {
  switch (type) {
    case "REPORT":
      return estimatedNextActions.report;
    case "IDEA":
      return estimatedNextActions.idea;
    case "RESEARCH":
      return estimatedNextActions.research;
    case "SUMMARY":
      return estimatedNextActions.summary;
    default:
      return null;
  }
}

function canRetryAiJobFromSettings(
  job: SettingsSummary["recentAiJobs"][number],
  estimatedNextActions: SettingsSummary["aiCostSummary"]["estimatedNextActions"]
) {
  const retryCost = getAiJobRetryCostLabel(job.type, estimatedNextActions);
  return job.status === "FAILED" && Boolean(job.repoId) && Boolean(retryCost) && retryCost !== "wylaczone";
}

function formatAiJobRetryHint(
  job: SettingsSummary["recentAiJobs"][number],
  estimatedNextActions: SettingsSummary["aiCostSummary"]["estimatedNextActions"]
) {
  if (job.status !== "FAILED") {
    return "Brak akcji";
  }
  if (!job.repoId) {
    return "Brak repo do ponowienia";
  }
  const retryCost = getAiJobRetryCostLabel(job.type, estimatedNextActions);
  if (retryCost === "wylaczone") {
    return "Retry wylaczone w ustawieniach kosztow";
  }
  if (!retryCost) {
    return "Ponow z kontekstu zrodla";
  }
  return "Ponow z panelu bledow";
}

function formatAiJobType(type: string) {
  return AI_JOB_TYPES[type as keyof typeof AI_JOB_TYPES] ?? type;
}

function formatAiJobStatus(status: string) {
  return AI_JOB_STATUSES[status as keyof typeof AI_JOB_STATUSES] ?? status;
}

function getAiJobStatusTone(status: string): BadgeTone {
  switch (status) {
    case "DONE":
      return "success";
    case "FAILED":
      return "danger";
    case "RUNNING":
      return "info";
    case "QUEUED":
      return "warning";
    default:
      return "neutral";
  }
}

function formatAiJobTime(job: SettingsSummary["recentAiJobs"][number]) {
  if (job.finishedAt) {
    return `Koniec ${formatAiJobDateTime(job.finishedAt)}`;
  }
  if (job.startedAt) {
    return `Start ${formatAiJobDateTime(job.startedAt)}`;
  }
  return `Utworzono ${formatAiJobDateTime(job.createdAt)}`;
}

function formatAiJobDateTime(value: string) {
  return new Date(value).toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatOpenAiCacheKind(kind: string) {
  return OPENAI_CACHE_KIND_LABELS[kind] ?? kind;
}

function formatOpenAiCacheDate(value: string) {
  return new Date(value).toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatDuration(ms: number | null) {
  if (ms === null) {
    return "brak danych";
  }

  if (ms < 1000) {
    return `${ms} ms`;
  }

  const seconds = Math.round(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s`;
}

function formatLastScan(observability: SettingsSummary["observability"]) {
  if (!observability.lastScan) {
    return "brak danych";
  }

  return `${observability.lastScan.status}, ${new Date(observability.lastScan.startedAt).toLocaleString("pl-PL")}`;
}

function formatScanRepos(observability: SettingsSummary["observability"]) {
  const scan = observability.lastScan;
  return scan ? `${scan.reposUpdated}/${scan.reposFound}` : "brak danych";
}

function formatGitHubCacheStats(stats: SettingsSummary["observability"]["githubRuntime"]) {
  return `${stats.cacheHits} hit, ${stats.cacheEntries}/${stats.maxEntries} entries`;
}

function formatResearchCache(observability: SettingsSummary["observability"]) {
  return `${observability.externalResearchCacheEntries} total, ${observability.expiredExternalResearchCacheEntries} expired`;
}

function formatOptionalDateTime(value: string | null) {
  return value ? new Date(value).toLocaleString("pl-PL") : "brak danych";
}

function formatBytes(value: number) {
  if (value <= 0) {
    return "0 B";
  }

  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${Math.round(value / 1024)} KiB`;
  }

  return `${(value / 1024 / 1024).toFixed(1)} MiB`;
}

function formatGraphifySkill(graphify: SettingsSummary["graphify"]) {
  return graphify.skillVersion ? `${graphify.skillVersion}` : "brak lokalnego skill";
}
