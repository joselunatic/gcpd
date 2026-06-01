#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
SYSTEMD_DIR="${SYSTEMD_DIR:-/etc/systemd/system}"
ENABLE_SERVICES="${ENABLE_SERVICES:-0}"
START_SERVICES="${START_SERVICES:-0}"

usage() {
  cat <<'EOF'
Usage: sudo ./scripts/install-systemd.sh [--enable] [--start]

Copies the GCPD systemd unit files into /etc/systemd/system and reloads systemd.

Options:
  --enable   Enable gcpd-api and gcpd-frontend at boot.
  --start    Start gcpd-api and gcpd-frontend after installing.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --enable)
      ENABLE_SERVICES=1
      ;;
    --start)
      START_SERVICES=1
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 1
      ;;
  esac
  shift
done

if [[ $EUID -ne 0 ]]; then
  echo "This script must be run with sudo." >&2
  exit 1
fi

if [[ ! -d "$REPO_ROOT/.git" ]]; then
  echo "Expected to run from inside a git repo. Repo root not found: $REPO_ROOT" >&2
  exit 1
fi

UNITS=(
  "deploy/systemd/gcpd-api.service"
  "deploy/systemd/gcpd-frontend.service"
)

for unit in "${UNITS[@]}"; do
  src="$REPO_ROOT/$unit"
  if [[ ! -f "$src" ]]; then
    echo "Missing unit file: $src" >&2
    exit 1
  fi

  install -D -m 0644 "$src" "$SYSTEMD_DIR/$(basename "$unit")"
done

systemctl daemon-reload

if [[ "$ENABLE_SERVICES" == "1" ]]; then
  systemctl enable gcpd-api gcpd-frontend
fi

if [[ "$START_SERVICES" == "1" ]]; then
  systemctl start gcpd-api gcpd-frontend
fi

echo "Systemd units installed."
