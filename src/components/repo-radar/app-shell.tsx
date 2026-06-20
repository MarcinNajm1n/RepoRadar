"use client";

import type React from "react";
import { defaultTabForSection, getTabLabel, getTabsForSection } from "./navigation";
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
    <main className="min-h-screen bg-surface-canvas text-foreground">
      <div className="mx-auto flex w-full max-w-[1500px] gap-4 px-4 py-4 sm:px-5 lg:gap-5 lg:py-5">
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
                    "h-10 rounded-md border border-border-subtle bg-surface-panel text-sm font-medium transition duration-fast ease-interface hover:bg-surface-inset",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    activeSection === section && "border-primary/30 bg-accent text-accent-foreground"
                  )}
                  onClick={() => {
                    onSectionChange(section);
                    onTabChange(defaultTabForSection(section));
                  }}
                  aria-pressed={activeSection === section}
                >
                  {section === "repo" ? "Repo" : "Pomysły"}
                </button>
              ))}
            </div>
            <select
              aria-label="Wybierz widok"
              className="h-11 w-full rounded-md border border-control-border bg-control px-3 text-sm font-medium shadow-soft focus:border-focus focus:outline-none focus:ring-2 focus:ring-focus/25"
              value={activeTab}
              onChange={(event) => onTabChange(event.target.value as TabKey)}
            >
              {getTabsForSection(activeSection).map((tab) => (
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
