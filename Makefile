# Workshop Bookings — root task runner.
# Override the PHP binary if `php` on your PATH is older than 8.2:
#   make setup PHP=/opt/homebrew/opt/php@8.3/bin/php

PHP ?= php
COMPOSER ?= $(PHP) $(shell command -v composer)
API_URL ?= http://127.0.0.1:8000

.PHONY: check setup dev dev-api dev-web prod build-web start-web test test-api test-web lint fresh

check:
	@$(PHP) -r 'exit(version_compare(PHP_VERSION, "8.2.0", ">=") ? 0 : 1);' || { \
		echo "PHP >= 8.2 required (found $$($(PHP) -r 'echo PHP_VERSION;'))."; \
		echo "Install it (e.g. brew install php@8.3) or run: make setup PHP=/path/to/php8.3"; \
		exit 1; }
	@command -v composer >/dev/null || { echo "Composer is required: https://getcomposer.org"; exit 1; }
	@node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 20 ? 0 : 1)' || { \
		echo "Node >= 20 required (found $$(node -v))."; exit 1; }
	@echo "PHP $$($(PHP) -r 'echo PHP_VERSION;') and Node $$(node -v) OK"

setup: check
	cd backend && $(COMPOSER) install --no-interaction
	cd backend && { [ -f .env ] || cp .env.example .env; }
	cd backend && { grep -q '^APP_KEY=.\+' .env || $(PHP) artisan key:generate --no-interaction; }
	@# Seed only when the DB is created here, so re-running setup is safe (use `make fresh` to reseed).
	cd backend && if [ -f database/database.sqlite ]; then \
		$(PHP) artisan migrate --force; \
	else \
		touch database/database.sqlite && $(PHP) artisan migrate --seed --force; \
	fi
	cd frontend && npm install
	cd frontend && { [ -f .env.local ] || echo 'API_URL=$(API_URL)' > .env.local; }

dev:
	$(MAKE) -j2 dev-api dev-web

dev-api:
	cd backend && $(PHP) artisan serve --host=127.0.0.1 --port=8000

dev-web:
	cd frontend && npm run dev -- --port 3000

# Production build of the web app (next build + next start) next to the API.
# Use this to check what ships: prerendered shells, Cache Components, and the proxy.ts 404,
# which only shows the T6 problem it solves in a production build (`next dev` always 404s).
prod: build-web
	$(MAKE) -j2 dev-api start-web

build-web:
	cd frontend && npm run build

start-web:
	cd frontend && npm run start -- --port 3000

test: test-api test-web

test-api:
	cd backend && $(PHP) artisan test

test-web:
	cd frontend && npm test && npx next typegen && npx tsc --noEmit && npx eslint .

lint:
	cd backend && $(PHP) vendor/bin/pint --test
	cd frontend && npx next typegen && npx tsc --noEmit && npx eslint .

fresh:
	cd backend && $(PHP) artisan migrate:fresh --seed --force
