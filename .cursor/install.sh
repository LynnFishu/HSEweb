#!/usr/bin/env bash
# Idempotent bootstrap for the HSE Dashboard dev environment.
# Installs system + node dependencies, seeds a local PostgreSQL database,
# and writes the local .env files that the app expects.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "==> Installing PostgreSQL (if needed)"
if ! command -v psql >/dev/null 2>&1; then
  sudo apt-get update
  sudo apt-get install -y --no-install-recommends postgresql postgresql-contrib
fi

PG_VER="$(ls /etc/postgresql | sort -V | tail -1)"

echo "==> Starting PostgreSQL cluster ${PG_VER}/main"
sudo pg_ctlcluster "$PG_VER" main start || true

echo "==> Waiting for PostgreSQL to accept connections"
for _ in $(seq 1 30); do
  if pg_isready -h localhost -p 5432 >/dev/null 2>&1; then break; fi
  sleep 1
done

echo "==> Ensuring postgres role password"
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'password';"

echo "==> Writing local .env files (if missing)"
if [ ! -f dashboard/.env ]; then
  cat > dashboard/.env <<'EOF'
VITE_API_URL=http://localhost:5000
EOF
fi

if [ ! -f dashboard/backend/.env ]; then
  cat > dashboard/backend/.env <<'EOF'
PORT=5000
NODE_ENV=development

# PostgreSQL (local dev)
DB_USER=postgres
DB_HOST=localhost
DB_NAME=hse_dashboard
DB_PASSWORD=password
DB_PORT=5432
DB_SSL=false

# Frontend origin for CORS
FRONTEND_URL=http://localhost:5173

# MQTT (disabled locally; the edge device publishes to the public broker)
ENABLE_MQTT=false
MQTT_BROKER=localhost
MQTT_PORT=1883
EOF
fi

echo "==> Installing frontend dependencies"
(cd dashboard && npm install)

echo "==> Installing backend dependencies"
(cd dashboard/backend && npm install)

echo "==> Creating database schema and seed data"
(cd dashboard/backend && node setup.js || true)

echo "==> Install complete"
