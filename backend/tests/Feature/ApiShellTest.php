<?php

declare(strict_types=1);

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

it('returns the JSON health payload at the root', function () {
    $this->get('/')
        ->assertOk()
        ->assertExactJson(['name' => 'workshop-bookings-api', 'status' => 'ok']);
});

it('returns a JSON 404 for unknown API routes even without an Accept header', function () {
    $this->get('/api/nope')
        ->assertNotFound()
        ->assertHeader('Content-Type', 'application/json')
        ->assertJsonStructure(['message']);
});

it('returns a JSON 405 for a wrong HTTP method even without an Accept header', function () {
    $this->post('/')
        ->assertStatus(405)
        ->assertHeader('Content-Type', 'application/json')
        ->assertJsonStructure(['message']);
});

it('returns validation failures as a JSON 422 instead of redirecting', function () {
    Route::middleware('api')->post('/api/_test/validate', function (Request $request) {
        $request->validate(['name' => 'required']);
    });

    $this->post('/api/_test/validate', [])
        ->assertStatus(422)
        ->assertHeader('Content-Type', 'application/json')
        ->assertJsonValidationErrors(['name']);
});

it('returns unexpected exceptions as a JSON 500', function () {
    Route::middleware('api')->get('/api/_test/boom', function () {
        throw new RuntimeException('boom');
    });

    $this->get('/api/_test/boom')
        ->assertStatus(500)
        ->assertHeader('Content-Type', 'application/json')
        ->assertJsonStructure(['message']);
});
