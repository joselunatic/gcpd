#!/usr/bin/env bash
set -euo pipefail

SERVICES=(gcpd-api gcpd-frontend)
DO_STOP=1
DO_START=1
SHOW_STATUS=0

usage() {
  cat <<'EOF'
Usage: sudo ./scripts/restart-gcpd.sh [--stop-only] [--start-only] [--status]

Stops and starts the GCPD services in a clean order.

Options:
  --stop-only   Only stop gcpd-api and gcpd-frontend.
  --start-only  Only start gcpd-api and gcpd-frontend.
  --status      Print service status after the operation.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --stop-only)
      DO_STOP=1
      DO_START=0
      ;;
    --start-only)
      DO_STOP=0
      DO_START=1
      ;;
    --status)
      SHOW_STATUS=1
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

if [[ "$DO_STOP" == "1" ]]; then
  systemctl stop "${SERVICES[@]}"
fi

if [[ "$DO_START" == "1" ]]; then
  systemctl start "${SERVICES[@]}"
fi

if [[ "$SHOW_STATUS" == "1" ]]; then
  systemctl --no-pager --full status "${SERVICES[@]}"
fi
