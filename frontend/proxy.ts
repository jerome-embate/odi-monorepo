import { NextResponse, type NextRequest } from "next/server";

import { apiUrl } from "@/lib/api-url";
import { bookingPathCheck } from "@/lib/bookings-query";

/**
 * Real HTTP 404s for missing bookings.
 *
 * With Cache Components the prerendered shell streams before the page runs,
 * so `notFound()` in the page can only send 200 + noindex. Here, before
 * rendering, unknown ids are rewritten to /bookings/missing: a static page
 * that calls notFound() at build time and is therefore served as a 404.
 *
 * Link prefetches are skipped: they only fetch the static shell, never the
 * booking, so checking them would just cost a Laravel query per visible link.
 */
export const config = {
  matcher: [
    {
      source: "/bookings/:id",
      missing: [{ type: "header", key: "next-router-prefetch" }],
    },
    {
      source: "/bookings/:id/edit",
      missing: [{ type: "header", key: "next-router-prefetch" }],
    },
  ],
};

export async function proxy(request: NextRequest) {
  const check = bookingPathCheck(request.nextUrl.pathname);
  if (check.action === "pass") return NextResponse.next();

  if (check.action === "not-found" || (await bookingExists(check.id)) === false) {
    return NextResponse.rewrite(new URL("/bookings/missing", request.url));
  }
  return NextResponse.next();
}

/**
 * HEAD keeps the check cheap. Anything but a definite 404 (API down, 5xx)
 * lets the request through, so the page's error boundary reports it.
 */
async function bookingExists(id: number): Promise<boolean | null> {
  try {
    const response = await fetch(apiUrl(`/bookings/${id}`), {
      method: "HEAD",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (response.status === 404) return false;
    return response.ok ? true : null;
  } catch {
    return null;
  }
}
