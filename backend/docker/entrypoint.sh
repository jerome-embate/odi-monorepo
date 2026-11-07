#!/bin/sh
set -e

DB_FILE="${DB_DATABASE:-/app/database/sqlite/database.sqlite}"
KEY_FILE="$(dirname "$DB_FILE")/.app_key"

# APP_KEY: use the env var if given, else one generated once and kept in the volume.
if [ -z "$APP_KEY" ]; then
    if [ ! -s "$KEY_FILE" ]; then
        php artisan key:generate --show --no-interaction > "$KEY_FILE"
    fi
    APP_KEY="$(cat "$KEY_FILE")"
    export APP_KEY
fi

# Same rule as `make setup`: seed only when the database is created here.
# A failed first run removes the file, so the next start retries from scratch.
if [ -f "$DB_FILE" ]; then
    php artisan migrate --force --no-interaction
else
    SEED_FLAG="--seed"
    [ "${DB_SEED:-true}" = "false" ] && SEED_FLAG=""
    touch "$DB_FILE"
    php artisan migrate $SEED_FLAG --force --no-interaction || { rm -f "$DB_FILE"; exit 1; }
fi

php artisan config:cache --no-interaction
php artisan route:cache --no-interaction

exec "$@"
