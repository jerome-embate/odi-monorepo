<?php

declare(strict_types=1);

use App\Models\Booking;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

/*
 * Proves the overlap check runs while this request already holds SQLite's
 * write lock, so a second writer cannot run its own check-then-insert at the
 * same moment. Needs a real file DB: an in-memory DB can't be shared between
 * two connections.
 */

beforeEach(function () {
    // Use the file tempnam() creates as is: adding an extension would leave
    // the original behind on every run.
    $this->dbFile = tempnam(sys_get_temp_dir(), 'bookings-lock-');

    config(['database.connections.sqlite.database' => $this->dbFile]);
    DB::purge('sqlite');
    Artisan::call('migrate', ['--force' => true]);
});

afterEach(function () {
    DB::purge('sqlite');
    @unlink($this->dbFile);
});

/** A second, independent connection that gives up immediately if the DB is locked. */
function secondWriterCanStart(string $dbFile): bool
{
    $pdo = new PDO("sqlite:{$dbFile}", options: [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
    $pdo->exec('PRAGMA busy_timeout = 0');

    try {
        $pdo->exec('BEGIN IMMEDIATE');
        $pdo->exec('ROLLBACK');

        return true;
    } catch (PDOException $e) {
        expect($e->getMessage())->toContain('database is locked');

        return false;
    }
}

it('holds the write lock while the overlap check runs', function (string $method) {
    $existing = Booking::factory()->create(['service_bay' => 'bay-2', 'starts_at' => '2026-12-02 09:00', 'ends_at' => '2026-12-02 10:00']);

    $checks = [];
    DB::listen(function (QueryExecuted $query) use (&$checks) {
        if (str_starts_with($query->sql, 'select') && str_contains($query->sql, '"ends_at" >')) {
            $checks[] = secondWriterCanStart($this->dbFile);
        }
    });

    [$verb, $url] = $method === 'POST'
        ? ['postJson', '/api/bookings']
        : ['putJson', "/api/bookings/{$existing->id}"];

    $this->{$verb}($url, validBookingPayload())->assertSuccessful();

    expect($checks)->toBe([false])                        // locked out during the check
        ->and(secondWriterCanStart($this->dbFile))->toBeTrue(); // and free again after commit
})->with(['POST', 'PUT']);
