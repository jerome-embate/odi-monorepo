import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { bookingPathCheck, parseBookingId } from "../lib/bookings-query.ts";

describe("parseBookingId", () => {
  it("accepts a positive integer id", () => {
    assert.equal(parseBookingId("42"), 42);
    assert.equal(parseBookingId("999999"), 999999);
  });

  it("rejects anything the API could not have issued", () => {
    for (const id of ["0", "-1", "1.5", "abc", "", " 1", "1e3", "0x1", "01", "9007199254740993"]) {
      assert.equal(parseBookingId(id), null, JSON.stringify(id));
    }
  });
});

describe("bookingPathCheck (proxy.ts)", () => {
  it("passes static routes that sit beside [id] straight through", () => {
    for (const path of ["/bookings/new", "/bookings/missing"]) {
      assert.deepEqual(bookingPathCheck(path), { action: "pass" }, path);
    }
  });

  it("asks for an API check on a canonical id, with or without /edit", () => {
    assert.deepEqual(bookingPathCheck("/bookings/42"), { action: "check", id: 42 });
    assert.deepEqual(bookingPathCheck("/bookings/42/edit"), { action: "check", id: 42 });
  });

  it("answers not-found for ids that can't exist, without asking the API", () => {
    for (const path of ["/bookings/abc", "/bookings/01", "/bookings/0/edit", "/bookings/"]) {
      assert.deepEqual(bookingPathCheck(path), { action: "not-found" }, path);
    }
  });
});
