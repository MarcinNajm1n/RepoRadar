import type React from "react";
import {
  Bell,
  BookOpen,
  Brain,
  CheckCircle2,
  ClipboardList,
  FileText,
  Github,
  Search,
  Settings,
  Sparkles,
  Star,
  Trash2
} from "lucide-react";

export type TabKey =
  | "radar"
  | "library"
  | "new"
  | "saved"
  | "read"
  | "ignored"
  | "tasks"
  | "candidates"
  | "ideas"
  | "savedIdeas"
  | "dismissedIdeas"
  | "weekly"
  | "old"
  | "settings";

export type SectionKey = "repo" | "ideas";

export type NavigationTab = {
  key: TabKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  section: SectionKey;
  group: "main" | "repo" | "ideas" | "system";
};

export const repoTabKeys = [
  "radar",
  "library",
  "new",
  "saved",
  "read",
  "ignored",
  "tasks",
  "weekly",
  "old",
  "settings"
] as const satisfies readonly TabKey[];

export const ideasTabKeys = ["candidates", "ideas", "savedIdeas", "dismissedIdeas"] as const satisfies readonly TabKey[];

export const tabs: NavigationTab[] = [
  { key: "radar", label: "Radar dzisiaj", icon: Bell, section: "repo", group: "main" },
  { key: "library", label: "Biblioteka", icon: Github, section: "repo", group: "main" },
  { key: "new", label: "Nowo znalezione", icon: Sparkles, section: "repo", group: "repo" },
  { key: "saved", label: "Zapisane", icon: Star, section: "repo", group: "repo" },
  { key: "read", label: "Przeczytane", icon: BookOpen, section: "repo", group: "repo" },
  { key: "ignored", label: "Ignorowane", icon: Trash2, section: "repo", group: "repo" },
  { key: "tasks", label: "Zadania", icon: ClipboardList, section: "repo", group: "repo" },
  { key: "weekly", label: "Raporty tygodniowe", icon: FileText, section: "repo", group: "repo" },
  { key: "old", label: "Stare repo", icon: CheckCircle2, section: "repo", group: "repo" },
  { key: "settings", label: "Ustawienia", icon: Settings, section: "repo", group: "system" },
  { key: "candidates", label: "Kandydaci", icon: Search, section: "ideas", group: "ideas" },
  { key: "ideas", label: "Pełne pomysły", icon: Brain, section: "ideas", group: "ideas" },
  { key: "savedIdeas", label: "Zapisane pomysły", icon: Star, section: "ideas", group: "ideas" },
  { key: "dismissedIdeas", label: "Odrzucone pomysły", icon: Trash2, section: "ideas", group: "ideas" }
];

export const navigationGroups: Array<{ key: NavigationTab["group"]; label: string }> = [
  { key: "main", label: "Główne" },
  { key: "repo", label: "Repo" },
  { key: "ideas", label: "Pomysły" },
  { key: "system", label: "System" }
];

export function getTabSection(tab: NavigationTab): SectionKey {
  return tab.section;
}

export function getTabLabel(tab: NavigationTab) {
  return tab.label;
}

export function getTabsForSection(section: SectionKey) {
  return tabs.filter((tab) => tab.section === section);
}

export function defaultTabForSection(section: SectionKey): TabKey {
  return section === "repo" ? "radar" : "candidates";
}
