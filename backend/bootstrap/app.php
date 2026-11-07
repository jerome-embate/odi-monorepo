<?php

use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        // Registered manually (not via install:api) so Sanctum isn't pulled in.
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        //
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // API-only app: every error (404, 405, 422, 500) renders as JSON regardless of Accept header.
        $exceptions->shouldRenderJsonWhen(fn () => true);

        // Laravel's default message names the model class ("No query results for model
        // [App\Models\Booking] 1"). Clients get a friendly message instead, debug or not.
        $exceptions->render(function (NotFoundHttpException $e) {
            $previous = $e->getPrevious();

            if ($previous instanceof ModelNotFoundException) {
                $model = Str::headline(class_basename($previous->getModel()));

                return response()->json(['message' => "{$model} not found."], 404);
            }

            return null; // fall through to the default JSON 404 (e.g. unknown routes)
        });
    })->create();
