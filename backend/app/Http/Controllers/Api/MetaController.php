<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Enums\BookingStatus;
use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Str;

/** Reference data for form dropdowns and the list's status filter. */
class MetaController extends Controller
{
    public function __invoke(): JsonResponse
    {
        return response()->json([
            'bays' => array_map(
                fn (string $bay) => ['value' => $bay, 'label' => Str::headline($bay)],
                config('bookings.bays'),
            ),
            'statuses' => array_map(
                fn (BookingStatus $status) => ['value' => $status->value, 'label' => $status->label()],
                BookingStatus::cases(),
            ),
        ]);
    }
}
