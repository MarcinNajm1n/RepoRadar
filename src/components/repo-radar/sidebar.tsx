import { Github } from "lucide-react";
import { cn } from "@/lib/utils";
import { defaultTabForSection, getTabLabel, getTabSection, navigationGroups, tabs } from "./navigation";
import type { SectionKey, TabKey } from "./navigation";

export function Sidebar({
  activeSection,
  activeTab,
  counts,
  onSectionChange,
  onTabChange
}: {
  activeSection: SectionKey;
  activeTab: TabKey;
  counts: Partial<Record<TabKey, number>>;
  onSectionChange: (section: SectionKey) => void;
  onTabChange: (tab: TabKey) => void;
}) {
  return (
    <aside className="hidden w-72 shrink-0 lg:block">
      <div className="sticky top-5 rounded-lg border border-border bg-card p-4 shadow-soft">
        <div className="mb-5 flex items-center gap-3 px-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Github className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">RepoRadar</h1>
            <p className="text-xs text-muted-foreground">Lokalny radar GitHub</p>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2">
          {(["repo", "ideas"] as SectionKey[]).map((section) => (
            <button
              key={section}
              className={cn(
                "rounded-md border border-border px-3 py-2 text-sm font-medium transition hover:bg-muted",
                activeSection === section && "border-primary/30 bg-primary/10 text-foreground"
              )}
              onClick={() => {
                onSectionChange(section);
                onTabChange(defaultTabForSection(section));
              }}
            >
              {section === "repo" ? "Repo" : "Pomysly"}
            </button>
          ))}
        </div>

        <nav className="space-y-5">
          {navigationGroups.map((group) => {
            const groupTabs = tabs.filter((tab) => tab.group === group.key && getTabSection(tab) === activeSection);
            if (!groupTabs.length) {
              return null;
            }

            return (
              <div key={group.key}>
                <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.label}</div>
                <div className="space-y-1">
                  {groupTabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.key;
                    const count = counts[tab.key] ?? 0;

                    return (
                      <button
                        key={tab.key}
                        className={cn(
                          "relative flex w-full items-center justify-between gap-3 rounded-lg border border-transparent px-3 py-2.5 text-left text-sm font-medium text-muted-foreground transition",
                          "hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                          isActive && "border-primary/20 bg-primary/10 text-foreground"
                        )}
                        onClick={() => onTabChange(tab.key)}
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="truncate">{getTabLabel(tab)}</span>
                        </span>
                        {count > 0 ? <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">{count}</span> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
