<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;

Route::get('/', fn () => response()->json([
    'name' => 'workshop-bookings-api',
    'status' => 'ok',
]));
