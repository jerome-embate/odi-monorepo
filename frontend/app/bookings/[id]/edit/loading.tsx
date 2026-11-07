import { FormSkeleton } from "@/components/FormSkeleton";

/**
 * Its own boundary, not [id]/loading.tsx: navigating from the detail page
 * shares the [id] segment, so a boundary there sits above what re-renders
 * and the navigation would block on the API instead of showing this.
 */
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="h-5 w-28 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="mt-4 h-8 w-56 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      <FormSkeleton />
    </main>
  );
}
