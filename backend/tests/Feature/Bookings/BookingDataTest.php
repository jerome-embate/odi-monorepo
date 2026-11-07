<?php

declare(strict_types=1);

use App\Enums\BookingStatus;
use App\Models\Booking;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

it('creates the bookings table with the spec columns', function () {
    expect(Schema::hasColumns('bookings', [
        'id', 'customer_name', 'customer_email', 'rego', 'service_bay',
        'starts_at', 'ends_at', 'status', 'notes', 'created_at', 'updated_at',
    ]))->toBeTrue();
});

it('indexes bookings by bay and time range', function () {
    $columns = collect(Schema::getIndexes('bookings'))->pluck('columns');

    expect($columns)->toContain(['service_bay', 'starts_at', 'ends_at']);
});

it('casts status to the enum and times to Carbon, defaulting to pending', function () {
    $created = Booking::create([
        'customer_name' => 'Jane Citizen',
        'customer_email' => 'jane@example.com',
        'rego' => 'ABC123',
        'service_bay' => 'bay-1',
        'starts_at' => '2026-11-03 09:00',
        'ends_at' => '2026-11-03 10:30',
    ]);
    $booking = $created->fresh();

    // The instance returned by create() (what an API response serializes) must
    // carry the default too, not only the reloaded row.
    expect($created->status)->toBe(BookingStatus::Pending)
        ->and($booking->status)->toBe(BookingStatus::Pending)
        ->and($booking->starts_at)->toBeInstanceOf(CarbonInterface::class)
        ->and($booking->starts_at->format('Y-m-d H:i'))->toBe('2026-11-03 09:00')
        ->and($booking->ends_at->format('Y-m-d H:i'))->toBe('2026-11-03 10:30');
});

it('defines the three booking statuses with labels', function () {
    expect(array_column(BookingStatus::cases(), 'value'))->toBe(['pending', 'confirmed', 'cancelled'])
        ->and(BookingStatus::Confirmed->label())->toBe('Confirmed');
});

it('configures four service bays', function () {
    expect(config('bookings.bays'))->toBe(['bay-1', 'bay-2', 'bay-3', 'bay-4']);
});

it('runs in the Australia/Sydney timezone', function () {
    expect(config('app.timezone'))->toBe('Australia/Sydney');
});

it('defaults factory bookings to confirmed so they block their slot', function () {
    // Deterministic: overlap tests rely on a factory booking being active.
    $bookings = Booking::factory()->count(20)->create();

    expect($bookings->pluck('status')->unique()->all())->toBe([BookingStatus::Confirmed]);
});

it('offers a cancelled factory state', function () {
    expect(Booking::factory()->cancelled()->create()->status)->toBe(BookingStatus::Cancelled);
});

it('produces valid bookings from the factory', function () {
    $booking = Booking::factory()->create();

    expect(config('bookings.bays'))->toContain($booking->service_bay)
        ->and($booking->ends_at->gt($booking->starts_at))->toBeTrue()
        ->and($booking->status)->toBeInstanceOf(BookingStatus::class);
});

it('never produces overlapping bookings in the same bay', function () {
    // Many bookings forced into one bay is the worst case for collisions.
    $bookings = Booking::factory()->count(40)->create(['service_bay' => 'bay-2', 'status' => BookingStatus::Confirmed]);

    expect(hasOverlaps($bookings))->toBeFalse();
});

it('seeds 50 non-overlapping bookings across every bay and status', function () {
    $this->seed(DatabaseSeeder::class);

    $bookings = Booking::all();

    expect($bookings)->toHaveCount(50)
        ->and(hasOverlaps($bookings))->toBeFalse()
        ->and($bookings->pluck('service_bay')->unique()->sort()->values()->all())->toBe(config('bookings.bays'))
        ->and($bookings->pluck('status')->unique()->count())->toBe(count(BookingStatus::cases()));
});

it('seeds both past and upcoming bookings', function () {
    $this->seed(DatabaseSeeder::class);

    expect(Booking::where('starts_at', '<', now()->startOfDay())->count())->toBeGreaterThan(0)
        ->and(Booking::where('starts_at', '>', now()->endOfDay())->count())->toBeGreaterThan(0);
});

it('keeps seeded bookings inside the current year, even near its edges', function (string $today) {
    $this->travelTo(CarbonImmutable::parse($today));
    $this->seed(DatabaseSeeder::class);

    $bookings = Booking::all();
    $years = $bookings->flatMap(fn (Booking $b) => [$b->starts_at->year, $b->ends_at->year])->unique()->values();

    expect($years->all())->toBe([now()->year])
        ->and($bookings)->toHaveCount(50)
        ->and(hasOverlaps($bookings))->toBeFalse();
})->with([
    'late December' => '2026-12-30 10:00',
    'New Year\'s Eve' => '2026-12-31 10:00',
    'New Year\'s Day' => '2027-01-01 10:00',
    'mid-year' => '2026-06-15 10:00',
]);

it('keeps a crowded bay inside the current year without overlaps', function () {
    // 40 in one bay from 29 Dec: most must go before the window, not into next year.
    $this->travelTo(CarbonImmutable::parse('2026-12-29 10:00'));

    $bookings = Booking::factory()->count(40)->create(['service_bay' => 'bay-2', 'status' => BookingStatus::Confirmed]);

    expect($bookings->every(fn (Booking $b) => $b->starts_at->year === 2026 && $b->ends_at->year === 2026))->toBeTrue()
        ->and(hasOverlaps($bookings))->toBeFalse();
});

// Kept last on purpose: earlier tests in this file advance the factory's slot
// counter, so this only passes if the global beforeEach in Pest.php resets it.
it('starts every test with a fresh factory slot sequence', function () {
    $booking = Booking::factory()->create(['service_bay' => 'bay-2']);

    expect($booking->starts_at->toDateString())->toBe(today()->subDays(3)->toDateString());
});
