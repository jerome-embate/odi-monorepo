import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DeleteBookingButton } from "@/components/DeleteBookingButton";
import { StatusBadge } from "@/components/StatusBadge";
import { getBooking, getMeta } from "@/lib/api";
import { parseBookingId } from "@/lib/bookings-query";
import { bayLabel, formatAuditTimestamp, formatSlot } from "@/lib/format";

import { deleteBooking } from "../actions";

type Props = PageProps<"/bookings/[id]">;

/** getBooking is request-cached, so metadata and page share one API call. */
async function loadBooking(params: Props["params"]) {
  const id = parseBookingId((await params).id);
  return id === null ? null : getBooking(id);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const booking = await loadBooking(params);
  return {
    title: booking ? `${booking.rego} · ${booking.customer_name}` : "Booking not found",
  };
}

export default async function BookingPage({ params }: Props) {
  const booking = await loadBooking(params);
  // proxy.ts already answered unknown ids with a real 404; this covers a
  // booking deleted in between, and client-side navigations.
  if (!booking) notFound();

  const meta = await getMeta();

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <Link href="/bookings" className="text-sm underline-offset-2 hover:underline">
        ← All bookings
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="flex items-center gap-3 text-2xl font-semibold">
          <span>Booking #{booking.id}</span>
          <StatusBadge status={booking.status} />
        </h1>
        <div className="flex items-center gap-3">
          <DeleteBookingButton
            action={deleteBooking.bind(null, booking.id)}
            label={`${booking.rego} (${booking.customer_name})`}
          />
          <Link
            href={`/bookings/${booking.id}/edit`}
            className="rounded bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Edit
          </Link>
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-1 gap-x-6 gap-y-4 rounded-lg border border-zinc-200 p-6 text-sm sm:grid-cols-[10rem_1fr] dark:border-zinc-800">
        <Field label="Customer">{booking.customer_name}</Field>
        <Field label="Email">
          <a
            href={`mailto:${booking.customer_email}`}
            className="underline-offset-2 hover:underline"
          >
            {booking.customer_email}
          </a>
        </Field>
        <Field label="Rego">
          <span className="font-mono">{booking.rego}</span>
        </Field>
        <Field label="Service bay">{bayLabel(meta.bays, booking.service_bay)}</Field>
        <Field label="Slot">{formatSlot(booking.starts_at, booking.ends_at)}</Field>
        <Field label="Notes">
          {booking.notes ? (
            <span className="whitespace-pre-line">{booking.notes}</span>
          ) : (
            <span className="text-zinc-500">None</span>
          )}
        </Field>
        <Field label="Created">{formatAuditTimestamp(booking.created_at)}</Field>
        <Field label="Last updated">{formatAuditTimestamp(booking.updated_at)}</Field>
      </dl>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="font-medium text-zinc-600 dark:text-zinc-400">{label}</dt>
      <dd>{children}</dd>
    </>
  );
}
