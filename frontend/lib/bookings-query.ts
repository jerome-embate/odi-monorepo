import type { BookingStatus, Option } from "./types";

/**
 * URL parsing for the bookings routes: list search params to filters (and
 * back), and `/bookings/[id]` paths to booking ids. Kept free of Next/server
 * imports so it can be unit tested with node:test.
 */

type SearchParamValue = string | string[] | undefined;

export interface ListFilters {
  status: BookingStatus | undefined;
  page: number;
}

function first(value: SearchParamValue): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Unknown values are dropped rather than sent on: a hand-edited URL shows
 * the unfiltered first page instead of an API 422 and the error page.
 */
export function parseListFilters(
  params: Record<string, SearchParamValue>,
  statuses: Option<BookingStatus>[],
): ListFilters {
  const requestedStatus = first(params.status);
  const status = statuses.find((s) => s.value === requestedStatus)?.value;

  const page = Number(first(params.page));

  return {
    status,
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

/** `status=…&page=…`, leaving out defaults so URLs stay canonical. */
export function listQuery({ status, page }: Partial<ListFilters>): string {
  const query = new URLSearchParams();
  if (status) query.set("status", status);
  if (page && page > 1) query.set("page", String(page));
  return query.toString();
}

/** Link to the list page for the given filters. */
export function listHref(status: BookingStatus | undefined, page = 1): string {
  const query = listQuery({ status, page });
  return query ? `/bookings?${query}` : "/bookings";
}

/**
 * The `[id]` route param as a booking id, or null when it can't be one.
 * Canonical digits only (no "01", "1e3", " 1"), so each booking has one URL
 * and junk ids become a 404 without a round trip to the API.
 */
export function parseBookingId(param: string): number | null {
  if (!/^[1-9]\d*$/.test(param)) return null;
  const id = Number(param);
  return Number.isSafeInteger(id) ? id : null;
}

/** Real routes that sit beside `[id]`. Add each new sibling folder here. */
const STATIC_SEGMENTS = new Set(["new", "missing"]);

export type BookingPathCheck =
  | { action: "pass" }
  | { action: "not-found" }
  | { action: "check"; id: number };

/**
 * What proxy.ts should do with `/bookings/:id` or `/bookings/:id/edit`:
 * let a static sibling route through, answer an impossible id with a 404
 * straight away, or ask the API whether the booking exists.
 */
export function bookingPathCheck(pathname: string): BookingPathCheck {
  const segment = pathname.split("/")[2] ?? "";
  if (STATIC_SEGMENTS.has(segment)) return { action: "pass" };

  const id = parseBookingId(segment);
  return id === null ? { action: "not-found" } : { action: "check", id };
}
