<?php

declare(strict_types=1);

// Guards the spec rule: backend/ is API-only — no Node tooling, assets, views or Sanctum.

it('has no frontend tooling or assets', function (string $path) {
    expect(file_exists(base_path($path)))->toBeFalse("backend/{$path} should not exist");
})->with([
    'package.json',
    'vite.config.js',
    'resources/css',
    'resources/js',
    'resources/views/welcome.blade.php',
]);

it('does not depend on Sanctum or call npm from composer scripts', function () {
    $composer = file_get_contents(base_path('composer.json'));

    expect($composer)
        ->not->toContain('laravel/sanctum')
        ->not->toContain('npm ')
        ->not->toContain('npx ');
});
