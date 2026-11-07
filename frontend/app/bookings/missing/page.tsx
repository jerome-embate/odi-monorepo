import { notFound } from "next/navigation";

/**
 * Static 404 target for proxy.ts (see SPEC → T6 finding). It always calls
 * notFound(), so opt it out of dev-time instant validation, which would
 * otherwise report that the segment can't render.
 */
export const instant = false;

export default function MissingBooking() {
  notFound();
}
