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
  section?: SectionKey;
  group: "main" | "repo" | "ideas" | "system";
};

export const tabs: NavigationTab[] = [
  { key: "radar", label: "Radar dzisiaj", icon: Bell, section: "repo", group: "main" },
  { key: "library", label: "Biblioteka", icon: Github, section: "repo", group: "main" },
  { key: "tasks", label: "Zadania", icon: ClipboardList, section: "repo", group: "main" },
  { key: "new", label: "Nowo znalezione", icon: Sparkles, section: "repo", group: "repo" },
  { key: "saved", label: "Zapisane", icon: Star, section: "repo", group: "repo" },
  { key: "read", label: "Przeczytane", icon: BookOpen, section: "repo", group: "repo" },
  { key: "ignored", label: "Ignorowane", icon: Trash2, section: "repo", group: "repo" },
  { key: "old", label: "Stare repo", icon: CheckCircle2, section: "repo", group: "repo" },
  { key: "candidates", label: "Kandydaci", icon: Search, section: "ideas", group: "ideas" },
  { key: "ideas", label: "Pelne pomysly", icon: Brain, section: "ideas", group: "ideas" },
  { key: "savedIdeas", label: "Zapisane pomysly", icon: Star, section: "ideas", group: "ideas" },
  { key: "dismissedIdeas", label: "Odrzucone pomysly", icon: Trash2, section: "ideas", group: "ideas" },
  { key: "weekly", label: "Raporty", icon: FileText, section: "repo", group: "system" },
  { key: "settings", label: "Ustawienia", icon: Settings, section: "repo", group: "system" }
];

export const navigationGroups: Array<{ key: NavigationTab["group"]; label: string }> = [
  { key: "main", label: "Glowne" },
  { key: "repo", label: "Repo" },
  { key: "ideas", label: "Pomysly" },
  { key: "system", label: "System" }
];

export function getTabSection(tab: NavigationTab): SectionKey {
  return tab.section ?? ((["ideas", "candidates", "savedIdeas", "dismissedIdeas"] as TabKey[]).includes(tab.key) ? "ideas" : "repo");
}

export function getTabLabel(tab: NavigationTab) {
  return tab.label;
}

export function defaultTabForSection(section: SectionKey): TabKey {
  return section === "repo" ? "radar" : "candidates";
}
