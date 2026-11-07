import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { listHref, listQuery, parseListFilters } from "../lib/bookings-query.ts";
import type { BookingStatus, Option } from "../lib/types.ts";

const statuses: Option<BookingStatus>[] = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "cancelled", label: "Cancelled" },
];

describe("parseListFilters", () => {
  it("reads a known status and page from the URL", () => {
    assert.deepEqual(parseListFilters({ status: "confirmed", page: "2" }, statuses), {
      status: "confirmed",
      page: 2,
    });
  });

  it("defaults to all statuses and page 1 when nothing is given", () => {
    assert.deepEqual(parseListFilters({}, statuses), { status: undefined, page: 1 });
  });

  it("drops an unknown status instead of passing it to the API", () => {
    for (const status of ["bogus", "CONFIRMED", ""]) {
      assert.equal(parseListFilters({ status }, statuses).status, undefined, status);
    }
  });

  it("falls back to page 1 for anything that isn't a positive integer", () => {
    for (const page of ["abc", "0", "-1", "1.5", "", "1e999", " "]) {
      assert.equal(parseListFilters({ page }, statuses).page, 1, JSON.stringify(page));
    }
  });

  it("uses the first value when a param is repeated", () => {
    assert.deepEqual(
      parseListFilters({ status: ["pending", "cancelled"], page: ["3", "4"] }, statuses),
      { status: "pending", page: 3 },
    );
  });
});

describe("listQuery (API query string)", () => {
  it("includes the status and any page after the first", () => {
    assert.equal(listQuery({ status: "pending", page: 2 }), "status=pending&page=2");
  });

  it("leaves out defaults", () => {
    assert.equal(listQuery({}), "");
    assert.equal(listQuery({ page: 1 }), "");
  });
});

describe("listHref (pager and filter links)", () => {
  it("keeps the status filter when paging", () => {
    assert.equal(listHref("confirmed", 2), "/bookings?status=confirmed&page=2");
    assert.equal(listHref("confirmed", 1), "/bookings?status=confirmed");
  });

  it("links to the bare list for all statuses on page 1", () => {
    assert.equal(listHref(undefined), "/bookings");
    assert.equal(listHref(undefined, 3), "/bookings?page=3");
  });
});
