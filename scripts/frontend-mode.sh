#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-}"
DEV_UNIT="gcpd-frontend-dev"
PROD_UNIT="gcpd-frontend"
WORKDIR="/opt/gcpd"
NPM_BIN="/home/jose/.nvm/versions/node/v20.19.5/bin/npm"
NODE_BIN_DIR="/home/jose/.nvm/versions/node/v20.19.5/bin"

usage() {
  cat <<'EOF'
Usage: sudo ./scripts/frontend-mode.sh <dev|prod> [--status]

Switches the frontend between development and production mode on port 5174.

Options:
  --status   Print status after switching.

Examples:
  sudo ./scripts/frontend-mode.sh dev
  sudo ./scripts/frontend-mode.sh prod
  sudo ./scripts/frontend-mode.sh dev --status
EOF
}

if [[ $# -lt 1 ]]; then
  usage
  exit 1
fi

SHOW_STATUS=0
shift || true
while [[ $# -gt 0 ]]; do
  case "$1" in
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

stop_current() {
  systemctl stop "${PROD_UNIT}" 2>/dev/null || true
  systemctl stop "${DEV_UNIT}" 2>/dev/null || true
}

start_dev() {
  systemd-run \
    --unit="${DEV_UNIT}" \
    --description="GCPD Brother Eye Frontend (dev)" \
    --property=User=gcpd \
    --property=Group=gcpd \
    --property=WorkingDirectory="${WORKDIR}" \
    --property=Environment=PATH=${NODE_BIN_DIR}:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin \
    --property=StandardOutput=journal \
    --property=StandardError=journal \
    --property=Restart=no \
    --collect \
    "${NPM_BIN}" run dev -- --host 0.0.0.0 --port 5174
}

start_prod() {
  systemctl start "${PROD_UNIT}"
}

case "${MODE}" in
  dev)
    stop_current
    start_dev
    ;;
  prod)
    stop_current
    start_prod
    ;;
  *)
    usage
    exit 1
    ;;
esac

if [[ "$SHOW_STATUS" == "1" ]]; then
  systemctl --no-pager --full status "${PROD_UNIT}" "${DEV_UNIT}" || true
fi
