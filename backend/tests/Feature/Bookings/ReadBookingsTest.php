<?php

declare(strict_types=1);

use App\Enums\BookingStatus;
use App\Models\Booking;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

describe('GET /api/bookings', function () {
    it('returns the paginated resource shape, 10 per page by default', function () {
        Booking::factory()->count(15)->create();

        $this->getJson('/api/bookings')
            ->assertOk()
            ->assertJsonCount(10, 'data')
            ->assertJsonPath('meta.total', 15)
            ->assertJsonPath('meta.per_page', 10)
            ->assertJsonPath('meta.current_page', 1)
            ->assertJsonStructure(['data', 'links' => ['first', 'last', 'prev', 'next'], 'meta']);
    });

    it('returns the requested page', function () {
        Booking::factory()->count(15)->create();

        $this->getJson('/api/bookings?page=2')
            ->assertOk()
            ->assertJsonCount(5, 'data')
            ->assertJsonPath('meta.current_page', 2);
    });

    it('honours per_page', function () {
        Booking::factory()->count(8)->create();

        $this->getJson('/api/bookings?per_page=5')
            ->assertOk()
            ->assertJsonCount(5, 'data')
            ->assertJsonPath('meta.per_page', 5);
    });

    it('orders bookings by starts_at descending, not by insertion order', function () {
        // Inserted out of chronological order so id order can't fake the sort.
        foreach (['2026-11-05 09:00', '2026-11-03 09:00', '2026-11-07 09:00', '2026-11-04 09:00'] as $start) {
            Booking::factory()->create(['starts_at' => $start, 'ends_at' => "{$start} +1 hour"]);
        }

        $starts = collect($this->getJson('/api/bookings')->json('data'))->pluck('starts_at')->all();

        expect($starts)->toBe(['2026-11-07T09:00', '2026-11-05T09:00', '2026-11-04T09:00', '2026-11-03T09:00']);
    });

    it('breaks starts_at ties by newest id so pages are stable', function () {
        $first = Booking::factory()->create(['service_bay' => 'bay-1', 'starts_at' => '2026-11-03 09:00', 'ends_at' => '2026-11-03 10:00']);
        $second = Booking::factory()->create(['service_bay' => 'bay-2', 'starts_at' => '2026-11-03 09:00', 'ends_at' => '2026-11-03 10:00']);

        expect(collect($this->getJson('/api/bookings')->json('data'))->pluck('id')->all())
            ->toBe([$second->id, $first->id]);
    });

    it('filters by status and keeps the filter in pagination links', function () {
        Booking::factory()->count(12)->create(['status' => BookingStatus::Confirmed]);
        Booking::factory()->count(3)->create(['status' => BookingStatus::Pending]);
        Booking::factory()->count(2)->cancelled()->create();

        $response = $this->getJson('/api/bookings?status=confirmed')
            ->assertOk()
            ->assertJsonPath('meta.total', 12);

        expect(collect($response->json('data'))->pluck('status')->unique()->all())->toBe(['confirmed'])
            ->and($response->json('links.next'))->toContain('status=confirmed');
    });

    it('treats an empty status as no filter', function () {
        // The frontend's "All" option submits ?status= with no value.
        Booking::factory()->count(2)->create();
        Booking::factory()->cancelled()->create();

        $this->getJson('/api/bookings?status=')
            ->assertOk()
            ->assertJsonPath('meta.total', 3);
    });

    it('rejects invalid query parameters with 422', function (string $query, string $field) {
        $this->getJson("/api/bookings?{$query}")
            ->assertUnprocessable()
            ->assertJsonValidationErrors($field);
    })->with([
        'unknown status' => ['status=bogus', 'status'],
        'status as array' => ['status[]=confirmed', 'status'],
        'per_page zero' => ['per_page=0', 'per_page'],
        'per_page too big' => ['per_page=500', 'per_page'],
        'per_page not int' => ['per_page=abc', 'per_page'],
        'page zero' => ['page=0', 'page'],
    ]);
});

describe('GET /api/bookings/{id}', function () {
    it('returns the booking with dates formatted for datetime-local', function () {
        $booking = Booking::factory()->create([
            'customer_name' => 'Jane Citizen',
            'rego' => 'ABC123',
            'service_bay' => 'bay-3',
            'starts_at' => '2026-11-03 09:00',
            'ends_at' => '2026-11-03 10:30',
            'status' => BookingStatus::Pending,
            'notes' => 'Check brakes',
        ]);

        $this->getJson("/api/bookings/{$booking->id}")
            ->assertOk()
            ->assertJsonStructure(['data' => [
                'id', 'customer_name', 'customer_email', 'rego', 'service_bay',
                'starts_at', 'ends_at', 'status', 'notes', 'created_at', 'updated_at',
            ]])
            ->assertJsonPath('data.id', $booking->id)
            ->assertJsonPath('data.customer_name', 'Jane Citizen')
            ->assertJsonPath('data.service_bay', 'bay-3')
            ->assertJsonPath('data.starts_at', '2026-11-03T09:00')
            ->assertJsonPath('data.ends_at', '2026-11-03T10:30')
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.notes', 'Check brakes');
    });

    it('returns audit timestamps as UTC instants while booking times stay workshop-local', function () {
        // 23:36:49 in Sydney (AEDT, +11:00) is 12:36:49 UTC.
        $this->travelTo(CarbonImmutable::parse('2026-11-02 23:36:49', 'Australia/Sydney'));

        $booking = Booking::factory()->create([
            'starts_at' => '2026-11-03 09:00',
            'ends_at' => '2026-11-03 10:30',
        ]);

        $this->getJson("/api/bookings/{$booking->id}")
            ->assertOk()
            ->assertJsonPath('data.created_at', '2026-11-02T12:36:49Z')
            ->assertJsonPath('data.updated_at', '2026-11-02T12:36:49Z')
            ->assertJsonPath('data.starts_at', '2026-11-03T09:00')
            ->assertJsonPath('data.ends_at', '2026-11-03T10:30');
    });

    it('returns a JSON 404 for a missing booking without leaking internal class names', function (bool $debug) {
        config(['app.debug' => $debug]);

        $this->getJson('/api/bookings/999999')
            ->assertNotFound()
            ->assertExactJson(['message' => 'Booking not found.']);
    })->with(['debug off' => false, 'debug on' => true]);
});

describe('GET /api/meta', function () {
    it('returns bays from config and statuses from the enum', function () {
        $this->getJson('/api/meta')
            ->assertOk()
            ->assertExactJson([
                'bays' => [
                    ['value' => 'bay-1', 'label' => 'Bay 1'],
                    ['value' => 'bay-2', 'label' => 'Bay 2'],
                    ['value' => 'bay-3', 'label' => 'Bay 3'],
                    ['value' => 'bay-4', 'label' => 'Bay 4'],
                ],
                'statuses' => [
                    ['value' => 'pending', 'label' => 'Pending'],
                    ['value' => 'confirmed', 'label' => 'Confirmed'],
                    ['value' => 'cancelled', 'label' => 'Cancelled'],
                ],
            ]);
    });
});
