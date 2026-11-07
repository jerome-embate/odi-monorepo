"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";

/**
 * Next 16.4 passes `retry` (re-fetches and re-renders the segment), not the
 * older `reset`. Server error details are hidden in production, so the
 * message is generic; `digest` matches the server log entry.
 */
export default function BookingsError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const digest =
    error instanceof Error && "digest" in error && typeof error.digest === "string"
      ? error.digest
      : undefined;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Bookings</h1>
      <div
        role="alert"
        className="mt-4 rounded-lg border border-red-300 bg-red-50 px-6 py-8 text-center dark:border-red-900 dark:bg-red-950/40"
      >
        <p className="font-medium">We couldn&apos;t load the bookings.</p>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          The booking service may be unavailable. Please try again.
        </p>
        {digest && (
          <p className="mt-1 font-mono text-xs text-zinc-500">Ref: {digest}</p>
        )}
        <button
          type="button"
          onClick={() => retry()}
          className="mt-4 rounded bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
