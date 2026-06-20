"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/repo-radar/ui";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-canvas p-5 text-foreground">
      <section className="w-full max-w-xl rounded-lg border border-border-subtle bg-surface-panel p-5 shadow-soft">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-destructive/30 bg-destructive/10 text-destructive">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold">Nie udało się załadować RepoRadar</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sprawdź lokalną bazę danych i konfigurację środowiska, a potem spróbuj ponownie.
            </p>
            {error.digest ? <p className="mt-2 text-xs text-muted-foreground">Kod błędu: {error.digest}</p> : null}
            <Button className="mt-4" onClick={reset}>
              <RefreshCw className="h-4 w-4" />
              Spróbuj ponownie
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
