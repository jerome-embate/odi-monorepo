<?php

declare(strict_types=1);

use App\Enums\BookingStatus;
use App\Models\Booking;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

describe('POST /api/bookings', function () {
    it('creates a booking and returns 201 with the resource', function () {
        $response = $this->postJson('/api/bookings', validBookingPayload())
            ->assertCreated()
            ->assertJsonPath('data.customer_name', 'Jane Citizen')
            ->assertJsonPath('data.customer_email', 'jane@example.com')
            ->assertJsonPath('data.rego', 'ABC123')
            ->assertJsonPath('data.service_bay', 'bay-2')
            ->assertJsonPath('data.starts_at', '2026-12-01T09:00')
            ->assertJsonPath('data.ends_at', '2026-12-01T10:30')
            ->assertJsonPath('data.status', 'confirmed')
            ->assertJsonPath('data.notes', 'Check brakes');

        $booking = Booking::findOrFail($response->json('data.id'));

        expect($booking->status)->toBe(BookingStatus::Confirmed)
            ->and($booking->starts_at->format('Y-m-d H:i'))->toBe('2026-12-01 09:00');
    });

    it('defaults to pending when no status is sent', function () {
        $payload = validBookingPayload();
        unset($payload['status']);

        $response = $this->postJson('/api/bookings', $payload)
            ->assertCreated()
            ->assertJsonPath('data.status', 'pending');

        expect(Booking::findOrFail($response->json('data.id'))->status)->toBe(BookingStatus::Pending);
    });

    it('trims and uppercases rego before storing it', function () {
        $this->postJson('/api/bookings', validBookingPayload(['rego' => '  abc123 ']))
            ->assertCreated()
            ->assertJsonPath('data.rego', 'ABC123');
    });

    it('allows notes to be omitted or null', function (array $notes) {
        $payload = array_diff_key(validBookingPayload(), ['notes' => true]) + $notes;

        $this->postJson('/api/bookings', $payload)
            ->assertCreated()
            ->assertJsonPath('data.notes', null);
    })->with([
        'omitted' => [[]],
        'null' => [['notes' => null]],
        'empty string' => [['notes' => '']],
    ]);

    it('ignores unknown and guarded attributes', function () {
        $response = $this->postJson('/api/bookings', validBookingPayload(['id' => 999, 'created_at' => '2000-01-01T00:00:00Z']))
            ->assertCreated();

        expect($response->json('data.id'))->not->toBe(999)
            ->and($response->json('data.created_at'))->not->toStartWith('2000');
    });
});

describe('PUT /api/bookings/{id}', function () {
    it('updates a booking and returns 200 with the fresh resource', function () {
        $booking = Booking::factory()->create(['service_bay' => 'bay-1', 'status' => BookingStatus::Pending]);

        $this->putJson("/api/bookings/{$booking->id}", validBookingPayload([
            'customer_name' => 'John Updated',
            'rego' => 'xyz 999',
            'service_bay' => 'bay-4',
            'status' => 'cancelled',
        ]))
            ->assertOk()
            ->assertJsonPath('data.id', $booking->id)
            ->assertJsonPath('data.customer_name', 'John Updated')
            ->assertJsonPath('data.rego', 'XYZ 999')
            ->assertJsonPath('data.service_bay', 'bay-4')
            ->assertJsonPath('data.status', 'cancelled');

        expect($booking->fresh())
            ->customer_name->toBe('John Updated')
            ->service_bay->toBe('bay-4')
            ->status->toBe(BookingStatus::Cancelled);
    });

    it('clears notes when sent as null', function () {
        $booking = Booking::factory()->create(['notes' => 'Old note']);

        $this->putJson("/api/bookings/{$booking->id}", validBookingPayload(['notes' => null]))
            ->assertOk()
            ->assertJsonPath('data.notes', null);
    });

    it('does not offer PATCH (updates are full replacements)', function () {
        $booking = Booking::factory()->create();

        $this->patchJson("/api/bookings/{$booking->id}", ['notes' => 'x'])
            ->assertMethodNotAllowed();
    });

    it('returns a JSON 404 for a missing booking', function () {
        $this->putJson('/api/bookings/999999', validBookingPayload())
            ->assertNotFound()
            ->assertExactJson(['message' => 'Booking not found.']);
    });
});

describe('DELETE /api/bookings/{id}', function () {
    it('deletes the booking and returns 204 with no body', function () {
        $booking = Booking::factory()->create();

        $this->deleteJson("/api/bookings/{$booking->id}")
            ->assertNoContent();

        expect(Booking::find($booking->id))->toBeNull();
    });

    it('returns a JSON 404 for a missing booking', function () {
        $this->deleteJson('/api/bookings/999999')
            ->assertNotFound()
            ->assertExactJson(['message' => 'Booking not found.']);
    });
});
