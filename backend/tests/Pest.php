<?php

use App\Enums\BookingStatus;
use App\Models\Booking;
use Database\Factories\BookingFactory;
use Illuminate\Support\Collection;
use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| Test Case
|--------------------------------------------------------------------------
|
| The closure you provide to your test functions is always bound to a specific PHPUnit test
| case class. By default, that class is "PHPUnit\Framework\TestCase". Of course, you may
| need to change it using the "pest()" function to bind a different classes or traits.
|
*/

pest()->extend(TestCase::class)
 // ->use(Illuminate\Foundation\Testing\RefreshDatabase::class)
    // The factory's per-bay slot counter is static; reset it so tests don't depend on order.
    ->beforeEach(fn () => BookingFactory::resetSlots())
    ->in('Feature');

/*
|--------------------------------------------------------------------------
| Expectations
|--------------------------------------------------------------------------
|
| When you're writing tests, you often need to check that values meet certain conditions. The
| "expect()" function gives you access to a set of "expectations" methods that you can use
| to assert different things. Of course, you may extend the Expectation API at any time.
|
*/

expect()->extend('toBeOne', function () {
    return $this->toBe(1);
});

/*
|--------------------------------------------------------------------------
| Functions
|--------------------------------------------------------------------------
|
| While Pest is very powerful out-of-the-box, you may have some testing code specific to your
| project that you don't want to repeat in every file. Here you can also expose helpers as
| global functions to help you to reduce the number of lines of code in your test files.
|
*/

/** True when any two non-cancelled bookings in the same bay overlap (half-open intervals). */
function hasOverlaps(Collection $bookings): bool
{
    $active = $bookings->reject(fn (Booking $b) => $b->status === BookingStatus::Cancelled)->values();

    foreach ($active as $i => $a) {
        foreach ($active->slice($i + 1) as $b) {
            if ($a->service_bay === $b->service_bay
                && $a->starts_at->lt($b->ends_at)
                && $a->ends_at->gt($b->starts_at)) {
                return true;
            }
        }
    }

    return false;
}

/** A valid create/update body; override fields per test. */
function validBookingPayload(array $overrides = []): array
{
    return array_merge([
        'customer_name' => 'Jane Citizen',
        'customer_email' => 'jane@example.com',
        'rego' => 'ABC123',
        'service_bay' => 'bay-2',
        'starts_at' => '2026-12-01T09:00',
        'ends_at' => '2026-12-01T10:30',
        'status' => 'confirmed',
        'notes' => 'Check brakes',
    ], $overrides);
}
