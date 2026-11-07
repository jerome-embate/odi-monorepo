#!/usr/bin/env bash
# Computes the next semantic version for one app in the monorepo.
#
# Each app has its own version line, kept as namespaced git tags (<app>/vX.Y.Z),
# so frontend and backend are released independently:
#
#   ./scripts/git_image_tag.sh -a frontend -v patch   # frontend/v0.1.1 -> frontend/v0.1.2
#   ./scripts/git_image_tag.sh -a backend  -v minor   # backend/v0.1.1  -> backend/v0.2.0
#   ./scripts/git_image_tag.sh -a backend  -v major   # backend/v0.1.1  -> backend/v1.0.0
#
# Prints the image tag (vX.Y.Z) on stdout. Each app has its own ECR repository, so the
# image tag doesn't need the app prefix, and the "v" prefix keeps it matched by the
# ECR lifecycle rule.
#
# If HEAD already carries a tag for this app (e.g. a re-run), that version is reused.
# The git tag is created locally only; push it with `git push origin <app>/vX.Y.Z`.
# In GitHub Actions these are written to $GITHUB_OUTPUT:
#   image-tag=vX.Y.Z   git-tag=<app>/vX.Y.Z   created=true|false
set -euo pipefail

APP=""
BUMP="patch"
# Starting point when the app has no version tags yet.
INITIAL_VERSION="v0.1.0"

usage() { echo "usage: $0 -a <app> [-v major|minor|patch]" >&2; exit 1; }

while getopts "a:v:" opt; do
  case "$opt" in
    a) APP="$OPTARG" ;;
    v) BUMP="$OPTARG" ;;
    *) usage ;;
  esac
done

[[ -n "$APP" ]] || usage

# The app must be a top-level directory of the monorepo (frontend, backend, ...).
REPO_ROOT=$(git rev-parse --show-toplevel)
if [[ ! "$APP" =~ ^[a-z0-9][a-z0-9-]*$ || ! -d "$REPO_ROOT/$APP" ]]; then
  echo "unknown app '$APP': expected a top-level directory such as frontend or backend" >&2
  exit 1
fi

case "$BUMP" in
  major|minor|patch) ;;
  *) echo "invalid bump '$BUMP', expected major, minor or patch" >&2; exit 1 ;;
esac

git fetch --tags --quiet origin 2>/dev/null || true

TAG_PREFIX="${APP}/"
VERSION_PATTERN="^${APP}/v[0-9]+\.[0-9]+\.[0-9]+$"
CREATED=false

EXISTING_TAG=$(git tag --points-at HEAD | grep -E "$VERSION_PATTERN" | sort -V | tail -n1 || true)
if [[ -n "$EXISTING_TAG" ]]; then
  echo "HEAD is already tagged $EXISTING_TAG, reusing it" >&2
  GIT_TAG="$EXISTING_TAG"
else
  LATEST_TAG=$(git tag -l "${TAG_PREFIX}v*" | grep -E "$VERSION_PATTERN" | sort -V | tail -n1 || true)
  LATEST_VERSION="${LATEST_TAG#"$TAG_PREFIX"}"
  LATEST_VERSION="${LATEST_VERSION:-$INITIAL_VERSION}"

  IFS='.' read -r MAJOR MINOR PATCH <<< "${LATEST_VERSION#v}"
  case "$BUMP" in
    major) MAJOR=$((MAJOR + 1)); MINOR=0; PATCH=0 ;;
    minor) MINOR=$((MINOR + 1)); PATCH=0 ;;
    patch) PATCH=$((PATCH + 1)) ;;
  esac

  GIT_TAG="${TAG_PREFIX}v${MAJOR}.${MINOR}.${PATCH}"
  echo "Bumping $APP $BUMP: ${LATEST_TAG:-$TAG_PREFIX$INITIAL_VERSION} -> $GIT_TAG" >&2
  git tag "$GIT_TAG"
  CREATED=true
fi

IMAGE_TAG="${GIT_TAG#"$TAG_PREFIX"}"

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  {
    echo "image-tag=$IMAGE_TAG"
    echo "git-tag=$GIT_TAG"
    echo "created=$CREATED"
  } >> "$GITHUB_OUTPUT"
fi
echo "$IMAGE_TAG"
