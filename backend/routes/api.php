<?php

declare(strict_types=1);

use App\Http\Controllers\Api\BookingController;
use App\Http\Controllers\Api\MetaController;
use Illuminate\Support\Facades\Route;

// Prefixed with /api, stateless "api" middleware group.
Route::apiResource('bookings', BookingController::class)->except('update');
Route::put('bookings/{booking}', [BookingController::class, 'update']); // full replace only, no PATCH
Route::get('meta', MetaController::class);
