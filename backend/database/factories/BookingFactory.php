<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Enums\BookingStatus;
use App\Models\Booking;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Bookings never overlap within a bay: each bay gets at most one booking per
 * day (starting a few days ago, so data spans past and upcoming), starting
 * 08:00-14:00 and lasting at most 3 hours. Seeding can never break the rule.
 * Every booking falls in the current year: near its edges the window starts
 * no earlier than 1 Jan, and days past 31 Dec are taken before the window.
 *
 * @extends Factory<Booking>
 */
class BookingFactory extends Factory
{
    private const DAYS_BEFORE_TODAY = 3;

    private const DURATIONS_MINUTES = [60, 90, 120, 180];

    /** @var array<string, int> next free day index per bay */
    private static array $nextSlot = [];

    public function definition(): array
    {
        return [
            'customer_name' => fake()->name(),
            'customer_email' => fake()->safeEmail(),
            'rego' => strtoupper(fake()->bothify('???###')),
            'service_bay' => fake()->randomElement(config('bookings.bays')),
            'starts_at' => fn (array $attributes) => $this->nextSlotStart($attributes['service_bay']),
            'ends_at' => fn (array $attributes) => CarbonImmutable::parse($attributes['starts_at'])
                ->addMinutes(fake()->randomElement(self::DURATIONS_MINUTES)),
            // Active by default so a factory booking always occupies its slot;
            // opt out explicitly with cancelled(). The seeder sets mixed statuses.
            'status' => BookingStatus::Confirmed,
            'notes' => fake()->optional(0.4)->sentence(),
        ];
    }

    public function cancelled(): static
    {
        return $this->state(['status' => BookingStatus::Cancelled]);
    }

    /** Restart every bay's slot sequence (call before seeding an empty table). */
    public static function resetSlots(): void
    {
        self::$nextSlot = [];
    }

    private function nextSlotStart(string $bay): CarbonImmutable
    {
        $day = self::$nextSlot[$bay] = (self::$nextSlot[$bay] ?? -1) + 1;

        return $this->slotDay($day)
            ->setTime(fake()->numberBetween(8, 14), fake()->randomElement([0, 30]));
    }

    /** The bay's nth booking day: forward from the window start, then backwards before it. */
    private function slotDay(int $n): CarbonImmutable
    {
        $today = CarbonImmutable::today();
        $firstDay = $today->startOfYear();
        $start = $today->subDays(self::DAYS_BEFORE_TODAY)->max($firstDay);
        $daysForward = (int) $start->diffInDays($today->endOfYear()->startOfDay()) + 1;

        $date = $n < $daysForward
            ? $start->addDays($n)
            : $start->subDays($n - $daysForward + 1);

        if ($date->lt($firstDay)) {
            throw new \LogicException('More bookings for one bay than days in the year.');
        }

        return $date;
    }
}
