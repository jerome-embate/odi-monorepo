<?php

declare(strict_types=1);

namespace App\Services;

use App\Enums\BookingStatus;
use App\Models\Booking;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Owns booking writes and the "no double-booked bay" rule.
 *
 * Each write is one transaction: take the database write lock, check the bay
 * is free, then save. Because the lock is held before the check runs, a
 * concurrent writer waits (busy_timeout) until this one commits, and its own
 * check then sees the committed row. Check-then-insert can't race.
 */
class BookingService
{
    /** @param array<string, mixed> $attributes validated input */
    public function create(array $attributes): Booking
    {
        return $this->save(new Booking($attributes));
    }

    /** @param array<string, mixed> $attributes validated input */
    public function update(Booking $booking, array $attributes): Booking
    {
        return $this->save($booking->fill($attributes));
    }

    private function save(Booking $booking): Booking
    {
        return DB::transaction(function () use ($booking) {
            $this->acquireWriteLock();
            $this->assertBayIsFree($booking);
            $booking->save();

            return $booking;
        });
    }

    /**
     * Rejects the booking if an active booking in the same bay overlaps it.
     * Intervals are half-open [starts_at, ends_at), so touching edges are fine.
     * A cancelled booking never conflicts and never blocks anything.
     *
     * @throws ValidationException
     */
    private function assertBayIsFree(Booking $booking): void
    {
        if ($booking->status === BookingStatus::Cancelled) {
            return;
        }

        $conflict = Booking::query()
            ->where('service_bay', $booking->service_bay)
            ->where('status', '!=', BookingStatus::Cancelled)
            ->where('starts_at', '<', $booking->ends_at)
            ->where('ends_at', '>', $booking->starts_at)
            ->when($booking->exists, fn ($query) => $query->whereKeyNot($booking->getKey()))
            ->orderBy('starts_at')
            ->first();

        if ($conflict !== null) {
            throw ValidationException::withMessages([
                'starts_at' => sprintf(
                    'Service bay %s is already booked between %s and %s.',
                    $conflict->service_bay,
                    $conflict->starts_at->format('H:i'),
                    $conflict->ends_at->format('H:i'),
                ),
            ]);
        }
    }

    /**
     * SQLite: make sure this transaction holds the write (RESERVED) lock
     * before the overlap check reads anything.
     *
     * config/database.php sets transaction_mode=IMMEDIATE, but Laravel 12 only
     * honours it on PHP >= 8.4 (SQLiteConnection::executeBeginTransactionStatement);
     * below that, PDO opens a DEFERRED transaction that only locks on its
     * first write. A write statement that matches no rows still takes the
     * lock, so this works on every PHP version and is a no-op on 8.4+.
     */
    private function acquireWriteLock(): void
    {
        if (DB::connection()->getDriverName() === 'sqlite') {
            DB::update('UPDATE bookings SET id = id WHERE 0 = 1');
        }
    }
}
