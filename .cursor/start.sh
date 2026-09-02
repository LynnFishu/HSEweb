#!/usr/bin/env bash
# Per-boot startup: bring PostgreSQL online before the app terminals launch.
set -euo pipefail

PG_VER="$(ls /etc/postgresql 2>/dev/null | sort -V | tail -1)"

if [ -n "${PG_VER}" ]; then
  echo "==> Starting PostgreSQL cluster ${PG_VER}/main"
  sudo pg_ctlcluster "$PG_VER" main start || true

  echo "==> Waiting for PostgreSQL to accept connections"
  for _ in $(seq 1 30); do
    if pg_isready -h localhost -p 5432 >/dev/null 2>&1; then
      echo "==> PostgreSQL is ready"
      break
    fi
    sleep 1
  done
else
  echo "!! PostgreSQL is not installed; run .cursor/install.sh first" >&2
fi
