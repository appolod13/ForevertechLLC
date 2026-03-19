#!/usr/bin/env sh

set -eu

cd "$(dirname "$0")/../.."

if [ ! -f .env ]; then
  echo "missing .env in traefik-enterprise (cp .env.example .env)"
  exit 2
fi

set -a
. ./.env
set +a

if [ -z "${DOMAIN:-}" ]; then
  echo "DOMAIN is required in .env"
  exit 2
fi

if [ -z "${ACME_EMAIL:-}" ]; then
  echo "ACME_EMAIL is required in .env"
  exit 2
fi

if [ -z "${CLOUDFLARE_EMAIL:-}" ] || [ -z "${CLOUDFLARE_DNS_API_TOKEN:-}" ]; then
  echo "CLOUDFLARE_EMAIL and CLOUDFLARE_DNS_API_TOKEN are required in .env"
  exit 2
fi

echo "deploy_start time=$(date -u +"%Y-%m-%dT%H:%M:%SZ") domain=${DOMAIN}"

docker compose build --no-cache public-catalog quantum-image-gen || docker compose build public-catalog quantum-image-gen
docker compose up -d --remove-orphans

./scripts/deploy/wait-healthy.sh
./scripts/deploy/smoke.sh
