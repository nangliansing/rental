#!/usr/bin/env bash
set -euo pipefail

# Reproduce the GitHub Actions E2E smoke job locally.
cd "$(dirname "$0")/.."

export CI=1
export VITE_GOOGLE_MAPS_API_KEY="${VITE_GOOGLE_MAPS_API_KEY:-test-google-maps-api-key}"
export VITE_GOOGLE_MAPS_MAP_ID="${VITE_GOOGLE_MAPS_MAP_ID:-test-google-maps-map-id}"

echo "==> Installing dependencies"
npm ci

echo "==> Installing Playwright Chromium"
npx playwright install chromium --with-deps

echo "==> Building production bundle"
npm run build

echo "==> Running Playwright smoke tests (CI mode)"
npm run test:e2e -- --workers=1

echo "==> E2E smoke passed"
