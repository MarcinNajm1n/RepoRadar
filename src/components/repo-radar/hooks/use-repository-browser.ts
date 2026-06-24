"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction, TransitionStartFunction } from "react";
import { getRepositoryPageAction, getRepositoryTimelineAction, updateStatusAction } from "@/app/actions";
import type {
  DashboardData,
  RepositoryPage,
  RepositoryPageInput,
  RepositoryTimelineItem
} from "@/types/repository";
import { REPO_SORT_OPTIONS } from "@/components/repo-radar/repo-filter-bar";
import type { RepoSortKey } from "@/components/repo-radar/repo-filter-bar";
import type { TabKey } from "@/components/repo-radar/navigation";
import type { FeedbackState } from "@/components/repo-radar/ui";
import {
  BUILT_IN_REPOSITORY_FILTER_PRESETS,
  FILTER_PRESET_STORAGE_KEY,
  createSavedFilterPreset,
  parseSavedFilterPresets,
  serializeSavedFilterPresets
} from "@/lib/repository-filter-presets";
import type { RepositoryFilterPreset } from "@/lib/repository-filter-presets";
import type { FeedbackActionRunner } from "./use-feedback-action";

type UseRepositoryBrowserOptions = {
  initialData: DashboardData;
  activeTab: TabKey;
  switchToTab: (tabKey: TabKey) => void;
  runAction: FeedbackActionRunner;
  setFeedback: Dispatch<SetStateAction<FeedbackState | null>>;
  startTransition: TransitionStartFunction;
};

export function isRepositoryListTab(tab: TabKey) {
  return tab === "library" || tab === "new" || tab === "saved" || tab === "read" || tab === "ignored" || tab === "old";
}

function isRepoSortKey(value: string): value is RepoSortKey {
  return REPO_SORT_OPTIONS.some((option) => option.value === value);
}

function readSavedFilterPresets() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    return parseSavedFilterPresets(window.localStorage.getItem(FILTER_PRESET_STORAGE_KEY));
  } catch {
    return [];
  }
}

export function useRepositoryBrowser({
  initialData,
  activeTab,
  switchToTab,
  runAction,
  setFeedback,
  startTransition
}: UseRepositoryBrowserOptions) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [languageFilter, setLanguageFilter] = useState("ALL");
  const [discoveryProfileFilter, setDiscoveryProfileFilter] = useState("ALL");
  const [minTrend, setMinTrend] = useState(0);
  const [repoSortKey, setRepoSortKey] = useState<RepoSortKey>("trend_desc");
  const [repositoryPage, setRepositoryPage] = useState<RepositoryPage>(initialData.repositoryPage);
  const [isRepositoryPageLoading, setIsRepositoryPageLoading] = useState(false);
  const [expandedRepoId, setExpandedRepoId] = useState<string | null>(null);
  const [selectedCompareRepoIds, setSelectedCompareRepoIds] = useState<string[]>([]);
  const [repositoryTimelines, setRepositoryTimelines] = useState<Record<string, RepositoryTimelineItem[]>>({});
  const [loadingTimelineRepoId, setLoadingTimelineRepoId] = useState<string | null>(null);
  const [savedFilterPresets, setSavedFilterPresets] = useState<RepositoryFilterPreset[]>(readSavedFilterPresets);
  const repositoryRequestKeyRef = useRef("");
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const languages = useMemo(
    () => initialData.repositoryFilterOptions.languages,
    [initialData.repositoryFilterOptions.languages]
  );
  const discoveryProfiles = useMemo(
    () => initialData.repositoryFilterOptions.discoveryProfiles,
    [initialData.repositoryFilterOptions.discoveryProfiles]
  );
  const filterPresets = useMemo(
    () => [...BUILT_IN_REPOSITORY_FILTER_PRESETS, ...savedFilterPresets],
    [savedFilterPresets]
  );
  const repositoryPageInput = useMemo<RepositoryPageInput>(
    () => ({
      tab: activeTab,
      query,
      status: statusFilter,
      language: languageFilter,
      profile: discoveryProfileFilter,
      minTrend,
      sortKey: repoSortKey,
      page: 1,
      pageSize: repositoryPage.pageSize
    }),
    [activeTab, discoveryProfileFilter, languageFilter, minTrend, query, repoSortKey, repositoryPage.pageSize, statusFilter]
  );
  const repositoryRequestKey = useMemo(() => JSON.stringify(repositoryPageInput), [repositoryPageInput]);
  const repositoryRefreshKey = useMemo(
    () =>
      [
        initialData.counts.all,
        initialData.counts.new,
        initialData.counts.saved,
        initialData.counts.read,
        initialData.counts.ignored,
        initialData.counts.old
      ].join(":"),
    [initialData.counts]
  );
  const hasActiveRepositoryFilters = Boolean(
    query.trim() ||
      statusFilter !== "ALL" ||
      languageFilter !== "ALL" ||
      discoveryProfileFilter !== "ALL" ||
      minTrend > 0 ||
      repoSortKey !== "trend_desc"
  );

  useEffect(() => {
    if (!isRepositoryListTab(activeTab)) {
      return;
    }

    let cancelled = false;
    repositoryRequestKeyRef.current = repositoryRequestKey;

    void Promise.resolve()
      .then(() => {
        if (cancelled) {
          return null;
        }

        setIsRepositoryPageLoading(true);
        setExpandedRepoId(null);
        return getRepositoryPageAction(repositoryPageInput);
      })
      .then((page) => {
        if (!cancelled && page && repositoryRequestKeyRef.current === repositoryRequestKey) {
          startTransition(() => setRepositoryPage(page));
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setFeedback({ tone: "error", message: error instanceof Error ? error.message : "Nie udalo sie pobrac repozytoriow." });
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsRepositoryPageLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeTab, repositoryPageInput, repositoryRefreshKey, repositoryRequestKey, setFeedback, startTransition]);

  const applyFilterPreset = useCallback((preset: RepositoryFilterPreset) => {
    setQuery(preset.query);
    setStatusFilter(preset.status);
    setLanguageFilter(preset.language);
    setDiscoveryProfileFilter(preset.profile);
    setMinTrend(preset.minTrend);
    setRepoSortKey(isRepoSortKey(preset.sortKey) ? preset.sortKey : "trend_desc");
  }, []);

  const saveCurrentFilterPreset = useCallback(() => {
    const label = window.prompt("Nazwa presetu filtrow:");
    if (!label?.trim()) {
      return;
    }

    const preset = createSavedFilterPreset(label, {
      query,
      status: statusFilter,
      language: languageFilter,
      profile: discoveryProfileFilter,
      minTrend,
      sortKey: repoSortKey
    });
    setSavedFilterPresets((current) => {
      const next = [preset, ...current].slice(0, 8);
      try {
        window.localStorage.setItem(FILTER_PRESET_STORAGE_KEY, serializeSavedFilterPresets(next));
        setFeedback({ tone: "success", message: "Preset filtrow zapisany lokalnie." });
      } catch {
        setFeedback({ tone: "info", message: "Preset dziala w tej sesji, ale nie udalo sie zapisac localStorage." });
      }
      return next;
    });
  }, [discoveryProfileFilter, languageFilter, minTrend, query, repoSortKey, setFeedback, statusFilter]);

  const searchRepositoriesFromCommand = useCallback(
    (searchQuery: string) => {
      const trimmed = searchQuery.trim();
      if (!trimmed) {
        return;
      }

      switchToTab("library");
      setQuery(trimmed);
      setStatusFilter("ALL");
      setLanguageFilter("ALL");
      setDiscoveryProfileFilter("ALL");
      setMinTrend(0);
      setRepoSortKey("trend_desc");
      setExpandedRepoId(null);
      window.requestAnimationFrame(() => searchInputRef.current?.focus());
    },
    [switchToTab]
  );

  const toggleCompareRepository = useCallback(
    (repoId: string) => {
      setSelectedCompareRepoIds((current) => {
        if (current.includes(repoId)) {
          return current.filter((id) => id !== repoId);
        }

        if (current.length >= 3) {
          setFeedback({ tone: "info", message: "Porownanie obsluguje maksymalnie 3 repo naraz." });
          return current;
        }

        return [...current, repoId];
      });
    },
    [setFeedback]
  );

  const findRepositoryForStatus = useCallback(
    (repoId: string) =>
      repositoryPage.items.find((repo) => repo.id === repoId) ??
      initialData.repositories.find((repo) => repo.id === repoId) ??
      initialData.radarToday.topRepositories.find((repo) => repo.id === repoId) ??
      initialData.radarToday.newGems.find((repo) => repo.id === repoId) ??
      initialData.radarToday.highInitialMomentum.find((repo) => repo.id === repoId) ??
      initialData.radarToday.scanChanges.latestRepositories.find((repo) => repo.id === repoId),
    [initialData.radarToday, initialData.repositories, repositoryPage.items]
  );

  const updateRepositoryStatusWithUndo = useCallback(
    (repoId: string, nextStatus: string, success: string) => {
      const repo = findRepositoryForStatus(repoId);
      const previousStatus = repo?.status;

      runAction(
        () => updateStatusAction(repoId, nextStatus),
        () => ({
          tone: "success",
          message: success,
          action:
            previousStatus && previousStatus !== nextStatus
              ? {
                  label: "Cofnij",
                  onClick: () =>
                    runAction(
                      () => updateStatusAction(repoId, previousStatus),
                      `Przywrocono status ${previousStatus}.`,
                      "Cofam zmiane statusu..."
                    )
                }
              : undefined
        }),
        "Zmieniam status repo..."
      );
    },
    [findRepositoryForStatus, runAction]
  );

  const resetRepoFilters = useCallback(() => {
    setQuery("");
    setStatusFilter("ALL");
    setLanguageFilter("ALL");
    setDiscoveryProfileFilter("ALL");
    setMinTrend(0);
    setRepoSortKey("trend_desc");
  }, []);

  const toggleRepositoryDetails = useCallback(
    (repoId: string) => {
      const shouldExpand = expandedRepoId !== repoId;
      setExpandedRepoId(shouldExpand ? repoId : null);

      if (!shouldExpand || repositoryTimelines[repoId]) {
        return;
      }

      setLoadingTimelineRepoId(repoId);
      void getRepositoryTimelineAction(repoId)
        .then((timeline) => {
          setRepositoryTimelines((current) => ({ ...current, [repoId]: timeline }));
        })
        .catch((error) => {
          setFeedback({ tone: "error", message: error instanceof Error ? error.message : "Nie udalo sie pobrac timeline repo." });
        })
        .finally(() => {
          setLoadingTimelineRepoId((current) => (current === repoId ? null : current));
        });
    },
    [expandedRepoId, repositoryTimelines, setFeedback]
  );

  const loadMoreRepositories = useCallback(() => {
    if (isRepositoryPageLoading || !repositoryPage.hasMore) {
      return;
    }

    const requestKey = repositoryRequestKey;
    setIsRepositoryPageLoading(true);
    startTransition(() => {
      void getRepositoryPageAction({
        ...repositoryPageInput,
        page: repositoryPage.page + 1,
        pageSize: repositoryPage.pageSize
      })
        .then((nextPage) => {
          setRepositoryPage((current) =>
            repositoryRequestKeyRef.current === requestKey
              ? {
                  ...nextPage,
                  items: [...current.items, ...nextPage.items]
                }
              : current
          );
        })
        .catch((error) => {
          setFeedback({ tone: "error", message: error instanceof Error ? error.message : "Nie udalo sie pobrac kolejnych repozytoriow." });
        })
        .finally(() => setIsRepositoryPageLoading(false));
    });
  }, [
    isRepositoryPageLoading,
    repositoryPage.hasMore,
    repositoryPage.page,
    repositoryPage.pageSize,
    repositoryPageInput,
    repositoryRequestKey,
    setFeedback,
    startTransition
  ]);

  const removeCompareRepository = useCallback((repoId: string) => {
    setSelectedCompareRepoIds((current) => current.filter((id) => id !== repoId));
  }, []);

  const clearCompareRepositories = useCallback(() => {
    setSelectedCompareRepoIds([]);
  }, []);

  return {
    query,
    setQuery,
    statusFilter,
    setStatusFilter,
    languageFilter,
    setLanguageFilter,
    discoveryProfileFilter,
    setDiscoveryProfileFilter,
    minTrend,
    setMinTrend,
    repoSortKey,
    setRepoSortKey,
    repositoryPage,
    isRepositoryPageLoading,
    expandedRepoId,
    selectedCompareRepoIds,
    repositoryTimelines,
    loadingTimelineRepoId,
    searchInputRef,
    languages,
    discoveryProfiles,
    filterPresets,
    hasActiveRepositoryFilters,
    applyFilterPreset,
    saveCurrentFilterPreset,
    searchRepositoriesFromCommand,
    toggleCompareRepository,
    removeCompareRepository,
    clearCompareRepositories,
    updateRepositoryStatusWithUndo,
    resetRepoFilters,
    toggleRepositoryDetails,
    loadMoreRepositories
  };
}
