import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BookingForm } from "@/components/BookingForm";
import { getBooking, getMeta } from "@/lib/api";
import { bookingToFormValues, editMinStart } from "@/lib/booking-form";
import { parseBookingId } from "@/lib/bookings-query";
import { workshopNow } from "@/lib/format";

import { updateBooking } from "../../actions";

type Props = PageProps<"/bookings/[id]/edit">;

async function loadBooking(params: Props["params"]) {
  const id = parseBookingId((await params).id);
  return id === null ? null : getBooking(id);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const booking = await loadBooking(params);
  return { title: booking ? `Edit booking #${booking.id}` : "Booking not found" };
}

/**
 * Reuses BookingForm, prefilled, with the status field shown: setting it to
 * Cancelled is how a booking is cancelled (and its slot freed).
 */
export default async function EditBookingPage({ params }: Props) {
  const booking = await loadBooking(params);
  // proxy.ts covers unknown ids with a real 404; this covers the rest.
  if (!booking) notFound();

  const meta = await getMeta();
  const detailHref = `/bookings/${booking.id}`;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <Link href={detailHref} className="text-sm underline-offset-2 hover:underline">
        ← Booking #{booking.id}
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">Edit booking #{booking.id}</h1>

      <BookingForm
        action={updateBooking.bind(null, booking.id)}
        initialState={{ values: bookingToFormValues(booking), errors: {}, attempt: 0 }}
        bays={meta.bays}
        statuses={meta.statuses}
        submitLabel="Save changes"
        cancelHref={detailHref}
        minStart={editMinStart(booking.starts_at, workshopNow())}
      />
    </main>
  );
}
