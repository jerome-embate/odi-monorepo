<?php

declare(strict_types=1);

use App\Models\Booking;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/*
 * The same rules guard create (POST) and update (PUT, a full replacement), so
 * every case runs against both endpoints.
 */
dataset('write endpoints', [
    'POST' => fn () => ['post', '/api/bookings'],
    'PUT' => fn () => ['put', '/api/bookings/'.Booking::factory()->create()->id],
]);

dataset('invalid payloads', [
    // Required fields
    'customer_name missing' => [['customer_name' => null], 'customer_name'],
    'customer_email missing' => [['customer_email' => null], 'customer_email'],
    'rego missing' => [['rego' => null], 'rego'],
    'rego only whitespace' => [['rego' => '   '], 'rego'],
    'service_bay missing' => [['service_bay' => null], 'service_bay'],
    'starts_at missing' => [['starts_at' => null], 'starts_at'],
    'ends_at missing' => [['ends_at' => null], 'ends_at'],
    'status missing' => [['status' => null], 'status'],

    // Shape and length
    'customer_name too long' => [['customer_name' => str_repeat('a', 256)], 'customer_name'],
    'customer_email invalid' => [['customer_email' => 'not-an-email'], 'customer_email'],
    'customer_email too long' => [['customer_email' => str_repeat('a', 250).'@x.com'], 'customer_email'],
    'rego too long' => [['rego' => str_repeat('A', 21)], 'rego'],
    'rego not a string' => [['rego' => ['ABC']], 'rego'],
    'notes too long' => [['notes' => str_repeat('a', 2001)], 'notes'],

    // Allowed values
    'unknown service_bay' => [['service_bay' => 'bay-99'], 'service_bay'],
    'invalid status' => [['status' => 'archived'], 'status'],

    // Dates
    'starts_at not a date' => [['starts_at' => 'tomorrow-ish'], 'starts_at'],
    'starts_at with timezone offset' => [['starts_at' => '2026-12-01T09:00:00Z'], 'starts_at'],
    'ends_at not a date' => [['ends_at' => 'later'], 'ends_at'],
    'ends_at equal to starts_at' => [['ends_at' => '2026-12-01T09:00'], 'ends_at'],
    'ends_at before starts_at' => [['ends_at' => '2026-12-01T08:00'], 'ends_at'],
]);

it('rejects an invalid field with 422 under that field key', function (array $endpoint, array $override, string $field) {
    [$method, $uri] = $endpoint;

    $this->{$method.'Json'}($uri, validBookingPayload($override))
        ->assertUnprocessable()
        ->assertJsonStructure(['message', 'errors'])
        ->assertOnlyJsonValidationErrors($field);
})->with('write endpoints')->with('invalid payloads');

it('accepts boundary values', function (array $endpoint, array $override) {
    [$method, $uri] = $endpoint;

    $this->{$method.'Json'}($uri, validBookingPayload($override))
        ->assertSuccessful();
})->with('write endpoints')->with([
    'customer_name at 255' => [['customer_name' => str_repeat('a', 255)]],
    'rego at 20' => [['rego' => str_repeat('A', 20)]],
    'notes at 2000' => [['notes' => str_repeat('a', 2000)]],
    'one minute long' => [['ends_at' => '2026-12-01T09:01']],
    'spans midnight' => [['starts_at' => '2026-12-01T23:00', 'ends_at' => '2026-12-02T01:00']],
]);

it('still requires status on update (PUT is a full replacement)', function () {
    $booking = Booking::factory()->create();
    $payload = validBookingPayload();
    unset($payload['status']);

    $this->putJson("/api/bookings/{$booking->id}", $payload)
        ->assertUnprocessable()
        ->assertOnlyJsonValidationErrors('status');
});

it('does not write anything when validation fails', function () {
    $booking = Booking::factory()->create(['customer_name' => 'Original']);

    $this->postJson('/api/bookings', validBookingPayload(['status' => 'archived']))->assertUnprocessable();
    $this->putJson("/api/bookings/{$booking->id}", validBookingPayload(['customer_name' => 'Changed', 'status' => 'archived']))
        ->assertUnprocessable();

    expect(Booking::count())->toBe(1)
        ->and($booking->fresh()->customer_name)->toBe('Original');
});
