import Link from "next/link";

export default function BookingNotFound() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="rounded-lg border border-dashed border-zinc-300 px-6 py-12 text-center dark:border-zinc-700">
        <h1 className="text-xl font-semibold">Booking not found</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          It may have been deleted, or the link is wrong.
        </p>
        <Link href="/bookings" className="mt-4 inline-block text-sm underline">
          Back to all bookings
        </Link>
      </div>
    </main>
  );
}
