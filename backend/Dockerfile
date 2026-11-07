# syntax=docker/dockerfile:1

# Laravel 12 API on FrankenPHP (Caddy + PHP 8.4 in one process), SQLite storage.
# PHP 8.4 so the sqlite connection's transaction_mode=IMMEDIATE applies natively.

FROM composer:2 AS composer

FROM dunglas/frankenphp:1-php8.4 AS base
WORKDIR /app
# pdo_sqlite ships with the base image; zip/unzip let composer use dist archives.
RUN apt-get update \
    && apt-get install -y --no-install-recommends unzip \
    && rm -rf /var/lib/apt/lists/* \
    && install-php-extensions zip opcache
COPY --from=composer /usr/bin/composer /usr/bin/composer

# Dev deps are on by default because the seeder's factories need Faker (require-dev).
# Don't run the test suite in this container: config is cached, so tests would hit
# the real SQLite file instead of :memory:. For a lean image without seed data:
#   docker compose build --build-arg COMPOSER_DEV=0   (and set DB_SEED=false)
ARG COMPOSER_DEV=1

FROM base AS vendor
ARG COMPOSER_DEV
COPY composer.json composer.lock ./
RUN composer install $([ "$COMPOSER_DEV" = "1" ] || echo --no-dev) \
    --no-scripts --no-autoloader --no-interaction --prefer-dist

FROM base AS runtime
ARG COMPOSER_DEV
ENV APP_ENV=production \
    APP_DEBUG=false \
    LOG_CHANNEL=stderr \
    DB_CONNECTION=sqlite \
    DB_DATABASE=/app/database/sqlite/database.sqlite \
    SERVER_NAME=:8000

RUN mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini"

COPY --from=vendor /app/vendor ./vendor
COPY . .
RUN composer dump-autoload --optimize $([ "$COMPOSER_DEV" = "1" ] || echo --no-dev) --no-interaction \
    && php artisan package:discover --ansi

# Run as an unprivileged user; Caddy needs its config/data dirs writable.
RUN useradd --uid 1000 --create-home app \
    && mkdir -p database/sqlite storage/logs storage/framework/cache/data \
        storage/framework/sessions storage/framework/views bootstrap/cache \
    && chown -R app:app database/sqlite storage bootstrap/cache /config/caddy /data/caddy

COPY --chmod=755 docker/entrypoint.sh /usr/local/bin/entrypoint
USER app

EXPOSE 8000
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=5 \
    CMD curl -fsS http://127.0.0.1:8000/up || exit 1

ENTRYPOINT ["entrypoint"]
CMD ["frankenphp", "run", "--config", "/etc/frankenphp/Caddyfile", "--adapter", "caddyfile"]
