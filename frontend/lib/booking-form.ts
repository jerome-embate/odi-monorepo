import type { FieldErrors } from "./api-response";
import type { Booking } from "./types";

/**
 * Booking form values and state, shared by BookingForm (client) and the
 * server actions. Kept free of Next/server imports so it can be unit tested
 * with node:test.
 */

export const BOOKING_FIELDS = [
  "customer_name",
  "customer_email",
  "rego",
  "service_bay",
  "starts_at",
  "ends_at",
  "status",
  "notes",
] as const;

export type BookingField = (typeof BOOKING_FIELDS)[number];

/** What the inputs hold, as strings. Sent to Laravel as is. */
export type BookingFormValues = Record<BookingField, string>;

export interface BookingFormState {
  values: BookingFormValues;
  errors: FieldErrors;
  /**
   * Bumped on every failed submit. The form is keyed on it so it remounts
   * with the submitted values: React resets a form after its action, and a
   * `<select>` would otherwise snap back to its first-render value.
   */
  attempt: number;
}

export function emptyBookingValues(): BookingFormValues {
  const values = Object.fromEntries(BOOKING_FIELDS.map((field) => [field, ""]));
  return { ...(values as BookingFormValues), status: "pending" };
}

/** Edit form prefill: the booking's fields as input strings. */
export function bookingToFormValues(booking: Booking): BookingFormValues {
  const values = Object.fromEntries(
    BOOKING_FIELDS.map((field) => [field, booking[field] ?? ""]),
  );
  return values as BookingFormValues;
}

/**
 * Only the booking fields, never the whole FormData: React adds `$ACTION_`
 * keys, and a tampered form could add others.
 */
export function readBookingForm(formData: FormData): BookingFormValues {
  const values = Object.fromEntries(
    BOOKING_FIELDS.map((field) => {
      const value = formData.get(field);
      return [field, typeof value === "string" ? value : ""];
    }),
  );
  return values as BookingFormValues;
}

/** The create payload: no status, so the API's `pending` default applies. */
export type NewBookingValues = Omit<BookingFormValues, "status">;

/** Create form values without status, even if one was posted. */
export function readNewBookingForm(formData: FormData): NewBookingValues {
  const values: Partial<BookingFormValues> = readBookingForm(formData);
  delete values.status;
  return values as NewBookingValues;
}

/** Messages for keys the form has no input for, shown above the form. */
export function unknownFieldErrors(
  errors: FieldErrors,
  shown: readonly BookingField[] = BOOKING_FIELDS,
): string[] {
  const known = new Set<string>(shown);
  return Object.entries(errors)
    .filter(([key]) => !known.has(key))
    .flatMap(([, messages]) => messages);
}

/**
 * A datetime-local value raised to `min` when it's earlier. Both are
 * `YYYY-MM-DDTHH:mm`, which sorts as plain strings.
 */
export function clampToMin(value: string, min: string): string {
  return value && min && value < min ? min : value;
}

/**
 * The edit form's earliest start: now, or the booking's own start if that's
 * already past, so an in-progress booking can be edited without its start
 * being clamped forward.
 */
export function editMinStart(startsAt: string, now: string): string {
  return startsAt < now ? startsAt : now;
}
