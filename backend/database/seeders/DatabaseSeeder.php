<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\BookingStatus;
use App\Models\Booking;
use Database\Factories\BookingFactory;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Eloquent\Factories\Sequence;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        BookingFactory::resetSlots();

        $bays = config('bookings.bays');

        // Cycle bays and statuses so every combination shows up in the UI.
        Booking::factory()
            ->count(50)
            ->state(new Sequence(fn (Sequence $s) => [
                'service_bay' => $bays[$s->index % count($bays)],
                'status' => [
                    BookingStatus::Confirmed,
                    BookingStatus::Pending,
                    BookingStatus::Confirmed,
                    BookingStatus::Cancelled,
                    BookingStatus::Pending,
                ][$s->index % 5],
            ]))
            ->create();
    }
}
