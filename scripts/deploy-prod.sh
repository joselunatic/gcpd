#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
APP_DIR="${APP_DIR:-/opt/gcpd}"
SERVICE_USER="${SERVICE_USER:-gcpd}"
NPM_BIN="${NPM_BIN:-/usr/local/bin/gcpd-npm}"
API_SERVICE="${API_SERVICE:-gcpd-api}"
FRONTEND_SERVICE="${FRONTEND_SERVICE:-gcpd-frontend}"
INSTALL_DEPS=0
BUILD_FRONTEND=0
RESTART_SERVICES=1
RUN_HEALTHCHECKS=1

usage() {
  cat <<'EOF'
Usage: ./scripts/deploy-prod.sh [options]

Deploys the current workspace into /opt/gcpd without touching persistent data.

Options:
  --source <dir>      Source tree to deploy. Defaults to repo root.
  --app-dir <dir>     Target application directory. Default: /opt/gcpd
  --install           Run npm ci in the target.
  --build             Build frontend in the target. Disabled by default.
  --no-restart        Skip systemd restart.
  --no-healthcheck    Skip curl/systemctl verification after deploy.
  -h, --help          Show this help.

Environment:
  APP_DIR, SERVICE_USER, NPM_BIN, API_SERVICE, FRONTEND_SERVICE

Notes:
  - Requires passwordless sudo for rsync/chown/systemctl and sudo -u SERVICE_USER gcpd-npm.
  - Never copies public/uploads from the source tree.
  - dist should normally be built in CI and shipped inside the release artifact.
  - Persistent data must live outside APP_DIR, typically in /var/lib/gcpd.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --source)
      SOURCE_DIR="$2"
      shift
      ;;
    --app-dir)
      APP_DIR="$2"
      shift
      ;;
    --install)
      INSTALL_DEPS=1
      ;;
    --build)
      BUILD_FRONTEND=1
      ;;
    --no-restart)
      RESTART_SERVICES=0
      ;;
    --no-healthcheck)
      RUN_HEALTHCHECKS=0
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

if [[ ! -d "$SOURCE_DIR" ]]; then
  echo "Source directory not found: $SOURCE_DIR" >&2
  exit 1
fi

if [[ ! -f "$SOURCE_DIR/package.json" ]]; then
  echo "package.json not found in source dir: $SOURCE_DIR" >&2
  exit 1
fi

if [[ ! -x "$NPM_BIN" ]]; then
  echo "deploy npm wrapper not found at: $NPM_BIN" >&2
  exit 1
fi

echo "[deploy] source: $SOURCE_DIR"
echo "[deploy] target: $APP_DIR"
echo "[deploy] service user: $SERVICE_USER"

sudo install -d -o "$SERVICE_USER" -g "$SERVICE_USER" "$APP_DIR"

sudo rsync -a --delete \
  --exclude '.git' \
  --exclude '.github' \
  --exclude '.gitignore' \
  --exclude 'node_modules' \
  --exclude '.codex' \
  --exclude '.DS_Store' \
  --exclude 'public/uploads' \
  "$SOURCE_DIR"/ "$APP_DIR"/

sudo chown -R "$SERVICE_USER:$SERVICE_USER" "$APP_DIR"

if [[ "$INSTALL_DEPS" == "1" ]]; then
  echo "[deploy] npm ci"
  sudo rm -rf "$APP_DIR/node_modules"
  sudo -u "$SERVICE_USER" "$NPM_BIN" --prefix "$APP_DIR" ci
fi

if [[ "$BUILD_FRONTEND" == "1" ]]; then
  echo "[deploy] npm run build"
  sudo -u "$SERVICE_USER" "$NPM_BIN" --prefix "$APP_DIR" run build
fi

if [[ "$RESTART_SERVICES" == "1" ]]; then
  echo "[deploy] restarting services"
  sudo systemctl restart "$API_SERVICE" "$FRONTEND_SERVICE"
fi

if [[ "$RUN_HEALTHCHECKS" == "1" ]]; then
  echo "[deploy] healthchecks"
  sudo systemctl --no-pager --full status "$API_SERVICE" "$FRONTEND_SERVICE" >/dev/null
  curl -fsS "http://127.0.0.1:4000/api/health" >/dev/null || curl -fsS "http://127.0.0.1:4000/api/cases-data" >/dev/null
  curl -fsS "http://127.0.0.1:5174" >/dev/null
fi

echo "[deploy] done"
