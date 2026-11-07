<?php

declare(strict_types=1);

use App\Enums\BookingStatus;
use App\Models\Booking;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

/** The existing booking every case is checked against: bay-2, 09:00-11:00. */
function existingBooking(array $overrides = []): Booking
{
    return Booking::factory()->create(array_merge([
        'service_bay' => 'bay-2',
        'starts_at' => '2026-12-01 09:00',
        'ends_at' => '2026-12-01 11:00',
    ], $overrides));
}

function slot(string $start, string $end, array $overrides = []): array
{
    return validBookingPayload(array_merge([
        'starts_at' => "2026-12-01T{$start}",
        'ends_at' => "2026-12-01T{$end}",
    ], $overrides));
}

const OVERLAP_MESSAGE = 'Service bay bay-2 is already booked between 09:00 and 11:00.';

dataset('overlapping slots', [
    'exact match' => ['09:00', '11:00'],
    'overlaps the start' => ['08:00', '09:30'],
    'overlaps the end' => ['10:30', '12:00'],
    'contains the existing booking' => ['08:00', '12:00'],
    'contained in the existing booking' => ['09:30', '10:30'],
]);

dataset('free slots', [
    'ends where the existing starts' => [slot('08:00', '09:00')],
    'starts where the existing ends' => [slot('11:00', '12:00')],
    'different bay' => [slot('09:00', '11:00', ['service_bay' => 'bay-3'])],
]);

describe('POST /api/bookings', function () {
    it('rejects a slot that overlaps an active booking in the same bay', function (string $start, string $end) {
        existingBooking();

        $this->postJson('/api/bookings', slot($start, $end))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['starts_at' => OVERLAP_MESSAGE])
            ->assertJsonMissingValidationErrors(['ends_at', 'service_bay']);

        expect(Booking::count())->toBe(1);
    })->with('overlapping slots');

    it('allows a slot that does not overlap', function (array $payload) {
        existingBooking();

        $this->postJson('/api/bookings', $payload)->assertCreated();
    })->with('free slots');

    it('names the earliest conflict when several bookings overlap', function () {
        existingBooking(['starts_at' => '2026-12-01 11:00', 'ends_at' => '2026-12-01 12:00']);
        existingBooking(); // 09:00-11:00, created second so insertion order can't be what picks it

        $this->postJson('/api/bookings', slot('08:00', '12:00'))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['starts_at' => OVERLAP_MESSAGE]);
    });

    it('ignores a cancelled existing booking', function () {
        existingBooking(['status' => BookingStatus::Cancelled]);

        $this->postJson('/api/bookings', slot('09:00', '11:00'))->assertCreated();
    });

    it('allows a new booking to be created as cancelled over an occupied slot', function () {
        existingBooking();

        $this->postJson('/api/bookings', slot('09:00', '11:00', ['status' => 'cancelled']))->assertCreated();
    });
});

describe('PUT /api/bookings/{id}', function () {
    it('does not conflict with itself', function () {
        $booking = existingBooking();

        $this->putJson("/api/bookings/{$booking->id}", slot('09:30', '11:00'))->assertOk();
    });

    it('rejects moving a booking into an occupied slot', function () {
        existingBooking();
        $other = existingBooking(['starts_at' => '2026-12-01 13:00', 'ends_at' => '2026-12-01 14:00']);

        $this->putJson("/api/bookings/{$other->id}", slot('10:00', '12:00'))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['starts_at' => OVERLAP_MESSAGE]);

        expect($other->fresh()->starts_at->format('H:i'))->toBe('13:00');
    });

    it('rejects un-cancelling a booking into an occupied slot', function () {
        existingBooking();
        $cancelled = existingBooking(['status' => BookingStatus::Cancelled]);

        $this->putJson("/api/bookings/{$cancelled->id}", slot('09:00', '11:00', ['status' => 'confirmed']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['starts_at' => OVERLAP_MESSAGE]);

        expect($cancelled->fresh()->status)->toBe(BookingStatus::Cancelled);
    });
});
