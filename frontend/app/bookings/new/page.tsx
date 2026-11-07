import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { BookingForm } from "@/components/BookingForm";
import { FormSkeleton } from "@/components/FormSkeleton";
import { getMeta } from "@/lib/api";
import { emptyBookingValues } from "@/lib/booking-form";
import { workshopNow } from "@/lib/format";

import { createBooking } from "../actions";

export const metadata: Metadata = { title: "New booking" };

export default function NewBookingPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <Link href="/bookings" className="text-sm underline-offset-2 hover:underline">
        ← All bookings
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">New booking</h1>

      <Suspense fallback={<FormSkeleton />}>
        <NewBookingForm />
      </Suspense>
    </main>
  );
}

/**
 * The bay and status options come from the API. `connection()` keeps them
 * out of the build-time prerender, so `next build` doesn't need Laravel
 * running, and `workshopNow()` is the request's time, not the build's.
 * getMeta's own cache still makes this cheap per request.
 */
async function NewBookingForm() {
  await connection();
  const meta = await getMeta();

  return (
    <BookingForm
      action={createBooking}
      initialState={{ values: emptyBookingValues(), errors: {}, attempt: 0 }}
      bays={meta.bays}
      submitLabel="Create booking"
      cancelHref="/bookings"
      minStart={workshopNow()}
    />
  );
}
