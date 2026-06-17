import { BookOpen, Brain, ClipboardList, ExternalLink, FileText, RefreshCw, Search, Star, Trash2 } from "lucide-react";
import { Button } from "./ui";
import { sanitizeExternalUrl } from "@/lib/utils";

export type RepoCardActionsProps = {
  repoUrl: string;
  isPending: boolean;
  onSave: () => void;
  onMarkRead: () => void;
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
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" onClick={onSave} disabled={isPending}>
        <Star className="h-4 w-4" /> Zapisz
      </Button>
      <Button variant="secondary" onClick={onMarkRead} disabled={isPending}>
        <BookOpen className="h-4 w-4" /> Przeczytane
      </Button>
      <Button variant="secondary" onClick={onOpenReport} disabled={isPending}>
        <FileText className="h-4 w-4" /> Raport
      </Button>
      <Button variant="secondary" onClick={onRegenerateReport} disabled={isPending}>
        <RefreshCw className="h-4 w-4" /> Regeneruj
      </Button>
      <Button variant="secondary" onClick={onGenerateIdea} disabled={isPending}>
        <Brain className="h-4 w-4" /> Pomysl
      </Button>
      <Button variant="secondary" onClick={onResearch} disabled={isPending}>
        <Search className="h-4 w-4" /> Research
      </Button>
      <Button variant="secondary" onClick={onAddCloneTask} disabled={isPending}>
        <ClipboardList className="h-4 w-4" /> Clone later
      </Button>
      <Button variant="secondary" onClick={onAddDemoTask} disabled={isPending}>
        <ExternalLink className="h-4 w-4" /> Demo
      </Button>
      <Button variant="secondary" onClick={onValidateMarket} disabled={isPending}>
        <Search className="h-4 w-4" /> Rynek
      </Button>
      <Button variant="danger" onClick={onIgnore} disabled={isPending}>
        <Trash2 className="h-4 w-4" /> Ignoruj
      </Button>
      {safeUrl && safeUrl.startsWith("https://github.com/") ? (
        <a
          href={safeUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-transparent bg-transparent px-3 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ExternalLink className="h-4 w-4" /> GitHub
        </a>
      ) : (
        <Button variant="ghost" disabled>
          <ExternalLink className="h-4 w-4" /> Link zablokowany
        </Button>
      )}
    </div>
  );
}
