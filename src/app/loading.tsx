export default function Loading() {
  return (
    <main className="min-h-screen bg-surface-canvas p-5 text-foreground">
      <section className="mx-auto max-w-[1500px] rounded-lg border border-border-subtle bg-surface-panel p-5 shadow-soft">
        <div className="h-5 w-40 animate-pulse rounded-md bg-surface-inset" />
        <div className="mt-4 grid gap-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-16 animate-pulse rounded-md border border-border-subtle bg-surface-inset" />
          ))}
        </div>
        <div className="mt-5 grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
          <div className="h-80 animate-pulse rounded-lg border border-border-subtle bg-surface-inset" />
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-20 animate-pulse rounded-md border border-border-subtle bg-surface-inset" />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
