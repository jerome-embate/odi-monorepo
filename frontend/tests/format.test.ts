// Run in a zone that is neither UTC nor Sydney, so any formatting that leans
// on the machine's timezone shows up as a wrong hour or date.
process.env.TZ = "America/Los_Angeles";

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  bayLabel,
  formatAuditTimestamp,
  formatSlot,
  formatWallClock,
  workshopNow,
} from "../lib/format.ts";

describe("formatWallClock (starts_at / ends_at)", () => {
  it("shows the workshop time exactly as stored, with no timezone shift", () => {
    assert.equal(formatWallClock("2026-11-04T14:00"), "4 Nov 2026, 14:00");
  });

  it("keeps late-evening and midnight times on their own date", () => {
    assert.equal(formatWallClock("2026-11-04T23:30"), "4 Nov 2026, 23:30");
    assert.equal(formatWallClock("2026-11-05T00:00"), "5 Nov 2026, 00:00");
  });
});

describe("formatSlot", () => {
  it("shows the end as a time only when the slot is within one day", () => {
    assert.equal(
      formatSlot("2026-11-04T14:00", "2026-11-04T16:30"),
      "4 Nov 2026, 14:00 – 16:30",
    );
  });

  it("shows the end date too when the slot spans days", () => {
    assert.equal(
      formatSlot("2026-11-04T22:00", "2026-11-05T01:00"),
      "4 Nov 2026, 22:00 – 5 Nov 2026, 01:00",
    );
  });
});

describe("formatAuditTimestamp (created_at / updated_at)", () => {
  it("converts UTC to Sydney daylight time (AEDT, +11), rolling the date", () => {
    assert.equal(formatAuditTimestamp("2026-11-02T13:52:19Z"), "3 Nov 2026, 00:52");
  });

  it("converts UTC to Sydney standard time (AEST, +10) in winter", () => {
    assert.equal(formatAuditTimestamp("2026-06-15T02:00:00Z"), "15 June 2026, 12:00");
  });

  it("shows a dash when the timestamp is missing", () => {
    assert.equal(formatAuditTimestamp(null), "—");
  });
});

describe("bayLabel", () => {
  const bays = [
    { value: "bay-1", label: "Bay 1" },
    { value: "bay-2", label: "Bay 2" },
  ];

  it("shows the configured label for a bay", () => {
    assert.equal(bayLabel(bays, "bay-2"), "Bay 2");
  });

  it("falls back to the raw value for a bay no longer in config", () => {
    assert.equal(bayLabel(bays, "bay-9"), "bay-9");
  });
});

describe("workshopNow (min for datetime-local inputs)", () => {
  it("gives the current Sydney wall-clock time, whatever the machine's timezone", () => {
    // 13:52Z is 00:52 the next day in Sydney (AEDT, +11).
    assert.equal(workshopNow(new Date("2026-11-02T13:52:19Z")), "2026-11-03T00:52");
  });

  it("uses Sydney standard time (+10) in winter and 00 for midnight, not 24", () => {
    assert.equal(workshopNow(new Date("2026-06-15T14:00:00Z")), "2026-06-16T00:00");
  });
});
