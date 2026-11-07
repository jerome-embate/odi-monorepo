/** Placeholder for BookingForm while its data loads (new and edit pages). */
export function FormSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading form" className="mt-6 grid gap-5 sm:grid-cols-2">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="h-16 animate-pulse rounded bg-zinc-100 dark:bg-zinc-900" />
      ))}
    </div>
  );
}
