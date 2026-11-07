import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ApiError, readDeleteResponse, readWriteResponse } from "../lib/api-response.ts";
import {
  BOOKING_FIELDS,
  bookingToFormValues,
  clampToMin,
  editMinStart,
  emptyBookingValues,
  readBookingForm,
  readNewBookingForm,
  unknownFieldErrors,
} from "../lib/booking-form.ts";

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.append(key, value);
  return data;
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("readBookingForm", () => {
  it("reads every booking field as entered (Laravel trims and normalises)", () => {
    const values = readBookingForm(
      form({
        customer_name: "Ada Lovelace",
        customer_email: "ada@example.com",
        rego: " abc123 ",
        service_bay: "bay-2",
        starts_at: "2026-11-04T09:00",
        ends_at: "2026-11-04T11:00",
        status: "confirmed",
        notes: "Check the awning",
      }),
    );

    assert.deepEqual(values, {
      customer_name: "Ada Lovelace",
      customer_email: "ada@example.com",
      rego: " abc123 ",
      service_bay: "bay-2",
      starts_at: "2026-11-04T09:00",
      ends_at: "2026-11-04T11:00",
      status: "confirmed",
      notes: "Check the awning",
    });
  });

  it("uses empty strings for missing fields, so an empty form reaches Laravel", () => {
    const values = readBookingForm(form({}));
    for (const field of BOOKING_FIELDS) assert.equal(values[field], "", field);
  });

  it("drops anything that isn't a booking field (e.g. React's $ACTION_ keys, id)", () => {
    const values = readBookingForm(form({ $ACTION_ID_abc: "", id: "7", rego: "X1" }));
    assert.deepEqual(Object.keys(values).sort(), [...BOOKING_FIELDS].sort());
    assert.equal(values.rego, "X1");
  });
});

describe("readNewBookingForm", () => {
  it("leaves status out, so the API's pending default applies", () => {
    const payload = readNewBookingForm(form({ rego: "X1" }));
    assert.equal("status" in payload, false);
    assert.equal(payload.rego, "X1");
  });

  it("drops a status smuggled into the form", () => {
    assert.equal("status" in readNewBookingForm(form({ status: "confirmed" })), false);
  });
});

describe("emptyBookingValues", () => {
  it("defaults new bookings to pending and leaves everything else blank", () => {
    const values = emptyBookingValues();
    assert.equal(values.status, "pending");
    assert.equal(values.service_bay, "");
    assert.equal(values.starts_at, "");
  });
});

describe("unknownFieldErrors", () => {
  it("collects messages for keys the form has no input for", () => {
    assert.deepEqual(
      unknownFieldErrors({ starts_at: ["Taken."], dealer: ["Bad."], other: ["A.", "B."] }),
      ["Bad.", "A.", "B."],
    );
    assert.deepEqual(unknownFieldErrors({ rego: ["Required."] }), []);
  });

  it("counts errors for fields the form doesn't render, such as status on create", () => {
    const shown = BOOKING_FIELDS.filter((field) => field !== "status");
    assert.deepEqual(unknownFieldErrors({ status: ["Bad status."], rego: ["x"] }, shown), [
      "Bad status.",
    ]);
  });
});

describe("readWriteResponse", () => {
  const booking = { id: 42, rego: "ABC123" };

  it("returns the booking on 201", async () => {
    assert.deepEqual(await readWriteResponse(json(201, { data: booking }), "/bookings"), {
      ok: true,
      booking,
    });
  });

  it("returns the booking on 200 (update)", async () => {
    const result = await readWriteResponse(json(200, { data: booking }), "/bookings/42");
    assert.equal(result.ok, true);
  });

  it("returns Laravel's field errors on 422", async () => {
    const errors = { starts_at: ["Service bay Bay 1 is already booked between 09:00 and 11:00."] };
    assert.deepEqual(
      await readWriteResponse(json(422, { message: "Invalid.", errors }), "/bookings"),
      { ok: false, errors },
    );
  });

  it("treats a 422 without an errors object as having no field errors", async () => {
    assert.deepEqual(await readWriteResponse(json(422, { message: "Nope" }), "/bookings"), {
      ok: false,
      errors: {},
    });
  });

  it("throws ApiError for anything else, so the error boundary reports it", async () => {
    for (const status of [404, 500, 503]) {
      await assert.rejects(
        readWriteResponse(json(status, { message: "x" }), "/bookings"),
        (error: unknown) => error instanceof ApiError && error.status === status,
      );
    }
  });
});

describe("clampToMin (no past dates in datetime-local inputs)", () => {
  const min = "2026-11-03T09:30";

  it("raises an earlier time to the minimum, including earlier the same day", () => {
    assert.equal(clampToMin("2026-11-02T10:00", min), min);
    assert.equal(clampToMin("2026-11-03T09:29", min), min);
  });

  it("keeps the minimum itself and anything later", () => {
    assert.equal(clampToMin(min, min), min);
    assert.equal(clampToMin("2027-01-01T08:00", min), "2027-01-01T08:00");
  });

  it("leaves an empty value or a missing minimum alone", () => {
    assert.equal(clampToMin("", min), "");
    assert.equal(clampToMin("2020-01-01T00:00", ""), "2020-01-01T00:00");
  });
});

describe("bookingToFormValues (edit form prefill)", () => {
  const booking = {
    id: 7,
    customer_name: "Ada Lovelace",
    customer_email: "ada@example.com",
    rego: "ABC123",
    service_bay: "bay-2",
    starts_at: "2026-11-04T09:00",
    ends_at: "2026-11-04T11:00",
    status: "confirmed" as const,
    notes: null,
    created_at: "2026-11-01T00:00:00Z",
    updated_at: "2026-11-01T00:00:00Z",
  };

  it("maps every form field from the booking and nothing else", () => {
    assert.deepEqual(bookingToFormValues({ ...booking, notes: "Awning" }), {
      customer_name: "Ada Lovelace",
      customer_email: "ada@example.com",
      rego: "ABC123",
      service_bay: "bay-2",
      starts_at: "2026-11-04T09:00",
      ends_at: "2026-11-04T11:00",
      status: "confirmed",
      notes: "Awning",
    });
  });

  it("turns null notes into an empty string, so PUT doesn't send \"null\"", () => {
    assert.equal(bookingToFormValues(booking).notes, "");
  });
});

describe("editMinStart", () => {
  const now = "2026-11-03T09:30";

  it("is now for a booking that starts later", () => {
    assert.equal(editMinStart("2026-11-05T08:00", now), now);
  });

  it("is the booking's own start when that's already past, so it isn't clamped", () => {
    assert.equal(editMinStart("2026-11-01T08:00", now), "2026-11-01T08:00");
  });
});

describe("readDeleteResponse", () => {
  it("resolves on 204", async () => {
    await readDeleteResponse(new Response(null, { status: 204 }), "/bookings/7");
  });

  it("resolves on 404: the booking is already gone, which is what was asked", async () => {
    await readDeleteResponse(json(404, { message: "Not found" }), "/bookings/7");
  });

  it("throws ApiError for anything else, so the error boundary reports it", async () => {
    for (const status of [409, 500, 503]) {
      await assert.rejects(
        readDeleteResponse(json(status, { message: "x" }), "/bookings/7"),
        (error: unknown) => error instanceof ApiError && error.status === status,
      );
    }
  });
});
