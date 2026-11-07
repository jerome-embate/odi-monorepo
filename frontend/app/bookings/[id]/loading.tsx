export default function Loading() {
  return (
    <main
      className="mx-auto w-full max-w-3xl px-4 py-8"
      aria-busy="true"
      aria-label="Loading booking"
    >
      <div className="h-5 w-28 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="mt-4 h-8 w-56 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="mt-6 space-y-4 rounded-lg border border-zinc-200 p-6 dark:border-zinc-800">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="h-5 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
        ))}
      </div>
    </main>
  );
}
