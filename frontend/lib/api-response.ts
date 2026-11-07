import type { Booking } from "./types";

/**
 * Response handling shared by the API client and server actions. Kept free
 * of Next/server imports so it can be unit tested with node:test.
 */

export class ApiError extends Error {
  // Not a parameter property: node:test's type stripping can't run those.
  readonly status: number;

  constructor(status: number, path: string) {
    super(`API request failed: ${status} ${path}`);
    this.status = status;
    this.name = "ApiError";
  }
}

export type FieldErrors = Record<string, string[]>;

export type WriteResult =
  | { ok: true; booking: Booking }
  | { ok: false; errors: FieldErrors };

/**
 * A create/update response: the booking on 2xx, Laravel's field errors on
 * 422 (validation and the overlap rule). Anything else is unexpected and
 * throws, so the route's error boundary reports it.
 */
export async function readWriteResponse(
  response: Response,
  path: string,
): Promise<WriteResult> {
  if (response.status === 422) {
    const body = (await response.json()) as { errors?: FieldErrors };
    return { ok: false, errors: body.errors ?? {} };
  }
  if (!response.ok) {
    throw new ApiError(response.status, path);
  }
  const body = (await response.json()) as { data: Booking };
  return { ok: true, booking: body.data };
}

/**
 * A delete response. 404 counts as success: the booking is gone either
 * way (e.g. deleted in another tab). Anything else throws.
 */
export async function readDeleteResponse(response: Response, path: string): Promise<void> {
  if (response.ok || response.status === 404) return;
  throw new ApiError(response.status, path);
}
