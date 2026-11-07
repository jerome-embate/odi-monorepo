export default function Loading() {
  return (
    <main
      className="mx-auto w-full max-w-5xl px-4 py-8"
      aria-busy="true"
      aria-label="Loading bookings"
    >
      <h1 className="text-2xl font-semibold">Bookings</h1>
      <div className="mt-4 flex gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className="h-7 w-20 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800"
          />
        ))}
      </div>
      <div className="mt-4 space-y-2">
        {Array.from({ length: 10 }, (_, i) => (
          <div
            key={i}
            className="h-12 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900"
          />
        ))}
      </div>
    </main>
  );
}
