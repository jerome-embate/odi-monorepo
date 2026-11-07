"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { deleteBookingById, postBooking, putBooking } from "@/lib/api";
import {
  emptyBookingValues,
  readBookingForm,
  readNewBookingForm,
  type BookingFormState,
} from "@/lib/booking-form";

/**
 * Server actions for the booking form. On 422 the form gets Laravel's field
 * errors back with the submitted values; on success the list is revalidated
 * (so the client router drops its stale copy) and we go to the new booking.
 * API errors and an unreachable API throw to the route's error boundary.
 */
export async function createBooking(
  previous: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  const values = readNewBookingForm(formData);
  const result = await postBooking(values);

  if (!result.ok) {
    return {
      values: { ...emptyBookingValues(), ...values },
      errors: result.errors,
      attempt: previous.attempt + 1,
    };
  }

  revalidatePath("/bookings");
  redirect(`/bookings/${result.booking.id}`);
}

/**
 * Bound to the booking id by the edit page. Bound arguments arrive from the
 * client as is, so the id is checked before it goes into a URL.
 */
export async function updateBooking(
  id: number,
  previous: BookingFormState,
  formData: FormData,
): Promise<BookingFormState> {
  const bookingId = requireBookingId(id);
  const values = readBookingForm(formData);
  const result = await putBooking(bookingId, values);

  if (!result.ok) {
    return { values, errors: result.errors, attempt: previous.attempt + 1 };
  }

  revalidatePath("/bookings");
  revalidatePath(`/bookings/${bookingId}`);
  redirect(`/bookings/${bookingId}`);
}

/** Bound to the booking id by DeleteBookingButton. */
export async function deleteBooking(id: number): Promise<void> {
  const bookingId = requireBookingId(id);
  await deleteBookingById(bookingId);

  revalidatePath("/bookings");
  redirect("/bookings");
}

function requireBookingId(id: unknown): number {
  if (typeof id !== "number" || !Number.isSafeInteger(id) || id < 1) {
    throw new Error("Invalid booking id");
  }
  return id;
}
