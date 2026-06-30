export function BoardSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden">
      {[1, 2, 3].map((col) => (
        <div key={col} className="w-72 shrink-0">
          <div className="mb-3 h-4 w-24 animate-pulse rounded bg-subtle" />
          <div className="flex min-h-[420px] flex-col gap-2.5 rounded-xl border border-subtle bg-surface p-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-lg bg-elevated"
                style={{ animationDelay: `${i * 100}ms` }}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
