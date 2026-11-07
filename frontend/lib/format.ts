import type { Option } from "./types";

/** The workshop's timezone. Audit timestamps are shown in it. */
const WORKSHOP_TIME_ZONE = "Australia/Sydney";

const wallClock = new Intl.DateTimeFormat("en-AU", {
  dateStyle: "medium",
  timeStyle: "short",
  hourCycle: "h23",
  timeZone: "UTC",
});

const timeOnly = new Intl.DateTimeFormat("en-AU", {
  timeStyle: "short",
  hourCycle: "h23",
  timeZone: "UTC",
});

const audit = new Intl.DateTimeFormat("en-AU", {
  dateStyle: "medium",
  timeStyle: "short",
  hourCycle: "h23",
  timeZone: WORKSHOP_TIME_ZONE,
});

/**
 * `starts_at`/`ends_at` are workshop wall-clock strings with no offset.
 * Read them as UTC and format in UTC so no timezone shift can happen,
 * whatever timezone the server or browser is in.
 */
function parseWallClock(value: string): Date {
  return new Date(`${value}:00Z`);
}

export function formatWallClock(value: string): string {
  return wallClock.format(parseWallClock(value));
}

/** "4 Nov 2026, 14:00 – 16:00", or both dates in full when it spans days. */
export function formatSlot(startsAt: string, endsAt: string): string {
  const sameDay = startsAt.slice(0, 10) === endsAt.slice(0, 10);
  const end = sameDay
    ? timeOnly.format(parseWallClock(endsAt))
    : formatWallClock(endsAt);
  return `${formatWallClock(startsAt)} – ${end}`;
}

/**
 * Audit timestamps are UTC instants (`…Z`). Server components run in the
 * server's timezone, so the workshop timezone must be explicit.
 */
export function formatAuditTimestamp(value: string | null): string {
  return value ? audit.format(new Date(value)) : "—";
}

/** A bay's display label, or its raw value if it's no longer configured. */
export function bayLabel(bays: Option[], value: string): string {
  return bays.find((bay) => bay.value === value)?.label ?? value;
}

const wallClockParts = new Intl.DateTimeFormat("en-AU", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: WORKSHOP_TIME_ZONE,
});

/**
 * The workshop's current wall-clock time as `YYYY-MM-DDTHH:mm`, the format
 * of starts_at/ends_at and of `<input type="datetime-local">` (its `min`).
 */
export function workshopNow(now: Date = new Date()): string {
  const part = Object.fromEntries(
    wallClockParts.formatToParts(now).map(({ type, value }) => [type, value]),
  );
  return `${part.year}-${part.month}-${part.day}T${part.hour}:${part.minute}`;
}
