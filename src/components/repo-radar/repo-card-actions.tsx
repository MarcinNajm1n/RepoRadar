import { BookOpen, Brain, ClipboardList, ExternalLink, FileText, RefreshCw, Search, Star, Trash2 } from "lucide-react";
import { Button } from "./ui";
import { sanitizeExternalUrl } from "@/lib/utils";
import { AiBudgetLabel, formatAiBudgetActionLabel } from "./ai-budget-label";

export type RepoCardActionsProps = {
  repoUrl: string;
  isPending: boolean;
  onSave: () => void;
  onMarkRead: () => void;
  onOpenQuickBrief: () => void;
  onOpenReport: () => void;
  onRegenerateReport: () => void;
  onGenerateIdea: () => void;
  onResearch: () => void;
  onAddCloneTask: () => void;
  onAddDemoTask: () => void;
  onValidateMarket: () => void;
  onIgnore: () => void;
};

export function RepoCardActions({
  repoUrl,
  isPending,
  onSave,
  onMarkRead,
  onOpenQuickBrief,
  onOpenReport,
  onRegenerateReport,
  onGenerateIdea,
  onResearch,
  onAddCloneTask,
  onAddDemoTask,
  onValidateMarket,
  onIgnore
}: RepoCardActionsProps) {
  const safeUrl = sanitizeExternalUrl(repoUrl);

  return (
    <div className="flex flex-wrap gap-1.5">
      <Button variant="secondary" size="sm" onClick={onSave} disabled={isPending}>
        <Star className="h-4 w-4" /> Zapisz
      </Button>
      <Button variant="secondary" size="sm" onClick={onMarkRead} disabled={isPending}>
        <BookOpen className="h-4 w-4" /> Przeczytane
      </Button>
      <Button variant="secondary" size="sm" onClick={onOpenQuickBrief} disabled={isPending}>
        <FileText className="h-4 w-4" /> Brief
      </Button>
      <span className="inline-flex items-center gap-1.5">
        <Button
          variant="secondary"
          size="sm"
          onClick={onOpenReport}
          disabled={isPending}
          aria-label={formatAiBudgetActionLabel("Raport", "repo-report")}
          title={formatAiBudgetActionLabel("Raport", "repo-report")}
        >
          <FileText className="h-4 w-4" /> Raport
        </Button>
        <AiBudgetLabel action="repo-report" />
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Button
          variant="secondary"
          size="sm"
          onClick={onRegenerateReport}
          disabled={isPending}
          aria-label={formatAiBudgetActionLabel("Regeneruj raport", "repo-report")}
          title={formatAiBudgetActionLabel("Regeneruj raport", "repo-report")}
        >
          <RefreshCw className="h-4 w-4" /> Regeneruj
        </Button>
        <AiBudgetLabel action="repo-report" />
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Button
          variant="secondary"
          size="sm"
          onClick={onGenerateIdea}
          disabled={isPending}
          aria-label={formatAiBudgetActionLabel("Pomysl", "idea")}
          title={formatAiBudgetActionLabel("Pomysl", "idea")}
        >
          <Brain className="h-4 w-4" /> Pomysl
        </Button>
        <AiBudgetLabel action="idea" />
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Button
          variant="secondary"
          size="sm"
          onClick={onResearch}
          disabled={isPending}
          aria-label={formatAiBudgetActionLabel("Research", "opportunity-research")}
          title={formatAiBudgetActionLabel("Research", "opportunity-research")}
        >
          <Search className="h-4 w-4" /> Research
        </Button>
        <AiBudgetLabel action="opportunity-research" />
      </span>
      <Button variant="secondary" size="sm" onClick={onAddCloneTask} disabled={isPending}>
        <ClipboardList className="h-4 w-4" /> Clone later
      </Button>
      <Button variant="secondary" size="sm" onClick={onAddDemoTask} disabled={isPending}>
        <ExternalLink className="h-4 w-4" /> Demo
      </Button>
      <Button variant="secondary" size="sm" onClick={onValidateMarket} disabled={isPending}>
        <Search className="h-4 w-4" /> Rynek
      </Button>
      <Button variant="danger" size="sm" onClick={onIgnore} disabled={isPending}>
        <Trash2 className="h-4 w-4" /> Ignoruj
      </Button>
      {safeUrl && safeUrl.startsWith("https://github.com/") ? (
        <a
          href={safeUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-8 items-center justify-center gap-2 rounded-md border border-transparent bg-transparent px-2.5 text-xs font-medium text-muted-foreground transition duration-fast ease-interface hover:bg-surface-inset hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <ExternalLink className="h-4 w-4" /> GitHub
        </a>
      ) : (
        <Button variant="ghost" size="sm" disabled>
          <ExternalLink className="h-4 w-4" /> Link zablokowany
        </Button>
      )}
    </div>
  );
}
