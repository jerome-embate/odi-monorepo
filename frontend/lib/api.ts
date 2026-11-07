import "server-only";

import { cacheLife } from "next/cache";
import { cache } from "react";

import {
  ApiError,
  readDeleteResponse,
  readWriteResponse,
  type WriteResult,
} from "./api-response";
import { apiUrl } from "./api-url";
import type { BookingFormValues, NewBookingValues } from "./booking-form";
import { listQuery } from "./bookings-query";
import type { Booking, BookingStatus, Meta, Paginated } from "./types";

/**
 * Server-only client for the Laravel API. API_URL never reaches the browser:
 * pages and server actions call these functions, the client never calls
 * Laravel directly.
 */

async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...init,
    headers: { Accept: "application/json", ...init?.headers },
  });
  if (!response.ok) {
    throw new ApiError(response.status, path);
  }
  return (await response.json()) as T;
}

export interface BookingFilters {
  status?: BookingStatus;
  page?: number;
}

/** Operational data where stale is wrong: never cached. */
export async function getBookings({
  status,
  page,
}: BookingFilters = {}): Promise<Paginated<Booking>> {
  const query = listQuery({ status, page });
  const qs = query ? `?${query}` : "";

  return getJson<Paginated<Booking>>(`/bookings${qs}`, { cache: "no-store" });
}

/**
 * One booking, or null when the API says it doesn't exist (404). Wrapped in
 * React `cache` so generateMetadata and the page share one request.
 */
export const getBooking = cache(async (id: number): Promise<Booking | null> => {
  try {
    const body = await getJson<{ data: Booking }>(`/bookings/${id}`, {
      cache: "no-store",
    });
    return body.data;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
});

/** Bays and statuses are effectively static: cached, revalidated hourly. */
export async function getMeta(): Promise<Meta> {
  "use cache";
  cacheLife("hours");

  return getJson<Meta>("/meta");
}

/**
 * POST /bookings. Field errors (incl. the overlap rule) come back, not thrown.
 * No status is sent: Laravel defaults new bookings to pending.
 */
export async function postBooking(values: NewBookingValues): Promise<WriteResult> {
  const response = await fetch(apiUrl("/bookings"), {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(values),
    cache: "no-store",
  });
  return readWriteResponse(response, "/bookings");
}

/** PUT /bookings/{id}: a full replacement, status included. */
export async function putBooking(id: number, values: BookingFormValues): Promise<WriteResult> {
  const path = `/bookings/${id}`;
  const response = await fetch(apiUrl(path), {
    method: "PUT",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify(values),
    cache: "no-store",
  });
  return readWriteResponse(response, path);
}

/** DELETE /bookings/{id}. Already gone (404) counts as deleted. */
export async function deleteBookingById(id: number): Promise<void> {
  const path = `/bookings/${id}`;
  const response = await fetch(apiUrl(path), {
    method: "DELETE",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  await readDeleteResponse(response, path);
}
