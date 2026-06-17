import type React from "react";
import { defaultTabForSection, getTabLabel, getTabSection, tabs } from "./navigation";
import type { SectionKey, TabKey } from "./navigation";
import { Sidebar } from "./sidebar";
import { cn } from "@/lib/utils";

export function AppShell({
  activeSection,
  activeTab,
  counts,
  onSectionChange,
  onTabChange,
  children
}: {
  activeSection: SectionKey;
  activeTab: TabKey;
  counts: Partial<Record<TabKey, number>>;
  onSectionChange: (section: SectionKey) => void;
  onTabChange: (tab: TabKey) => void;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen">
      <div className="mx-auto flex w-full max-w-[1500px] gap-5 px-5 py-5">
        <Sidebar
          activeSection={activeSection}
          activeTab={activeTab}
          counts={counts}
          onSectionChange={onSectionChange}
          onTabChange={onTabChange}
        />
        <section className="min-w-0 flex-1">
          <div className="mb-4 lg:hidden">
            <div className="mb-2 grid grid-cols-2 gap-2">
              {(["repo", "ideas"] as SectionKey[]).map((section) => (
                <button
                  key={section}
                  className={cn(
                    "h-10 rounded-md border border-border bg-card text-sm font-medium transition hover:bg-muted",
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
            <select
              className="h-11 w-full rounded-md border border-border bg-card px-3 text-sm font-medium shadow-soft"
              value={activeTab}
              onChange={(event) => onTabChange(event.target.value as TabKey)}
            >
              {tabs.filter((tab) => getTabSection(tab) === activeSection).map((tab) => (
                <option key={tab.key} value={tab.key}>
                  {getTabLabel(tab)}
                </option>
              ))}
            </select>
          </div>
          {children}
        </section>
      </div>
    </main>
  );
}
