#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
DEST_DIR="${DEST_DIR:-/opt/gcpd}"
DEPLOY_USER="${DEPLOY_USER:-gcpd}"
NPM_BIN="${NPM_BIN:-/home/jose/.nvm/versions/node/v20.19.5/bin/npm}"
INSTALL_DEPS="${INSTALL_DEPS:-0}"
BUILD_FRONTEND="${BUILD_FRONTEND:-0}"
RESTART_SERVICES="${RESTART_SERVICES:-0}"
DRY_RUN="${DRY_RUN:-0}"

usage() {
  cat <<'EOF'
Usage: sudo ./scripts/sync-to-opt.sh [--install] [--build] [--restart] [--dry-run]

Synchronizes the repository into /opt/gcpd for systemd deployment.

Options:
  --install   Run npm ci in the destination after syncing.
  --build     Run npm run build in the destination after syncing. Optional; normally dist/ comes from git.
  --restart   Restart gcpd-api and gcpd-frontend after syncing.
  --dry-run   Show rsync changes without writing or restarting services.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --install)
      INSTALL_DEPS=1
      ;;
    --build)
      BUILD_FRONTEND=1
      ;;
    --restart)
      RESTART_SERVICES=1
      ;;
    --dry-run)
      DRY_RUN=1
      INSTALL_DEPS=0
      BUILD_FRONTEND=0
      RESTART_SERVICES=0
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

if [[ ! -x "$NPM_BIN" ]]; then
  echo "npm not found at: $NPM_BIN" >&2
  echo "Set NPM_BIN to the absolute npm path from your nvm install." >&2
  exit 1
fi

sync_tree() {
  if [[ "$DRY_RUN" != "1" ]]; then
    install -d -o "$DEPLOY_USER" -g "$DEPLOY_USER" "$DEST_DIR"
  fi

  local -a rsync_args=(
    -a
    --delete
    --exclude '.git'
    --exclude '.github'
    --exclude '.gitignore'
    --exclude 'node_modules'
    --exclude '.codex'
    --exclude '.DS_Store'
    --exclude 'var'
    --exclude 'server/batconsole.db'
    --exclude 'public/assets'
    --exclude 'public/uploads'
  )

  if [[ "$DRY_RUN" == "1" ]]; then
    rsync_args+=(--dry-run --itemize-changes)
  fi

  rsync "${rsync_args[@]}" "$REPO_ROOT"/ "$DEST_DIR"/

  if [[ "$DRY_RUN" != "1" ]]; then
    chown -R "$DEPLOY_USER:$DEPLOY_USER" "$DEST_DIR"
  fi
}

install_deps() {
  if [[ ! -f "$DEST_DIR/package.json" ]]; then
    echo "package.json not found in $DEST_DIR after sync." >&2
    exit 1
  fi

  su -s /bin/bash "$DEPLOY_USER" -c "cd '$DEST_DIR' && '$NPM_BIN' ci"
}

build_frontend() {
  if [[ ! -f "$DEST_DIR/package.json" ]]; then
    echo "package.json not found in $DEST_DIR after sync." >&2
    exit 1
  fi

  su -s /bin/bash "$DEPLOY_USER" -c "cd '$DEST_DIR' && '$NPM_BIN' run build"
}

restart_services() {
  systemctl restart gcpd-api gcpd-frontend
}

echo "Syncing $REPO_ROOT -> $DEST_DIR"
sync_tree

if [[ "$INSTALL_DEPS" == "1" ]]; then
  echo "Installing dependencies in $DEST_DIR"
  install_deps
fi

if [[ "$BUILD_FRONTEND" == "1" ]]; then
  echo "Building frontend in $DEST_DIR"
  build_frontend
fi

if [[ "$RESTART_SERVICES" == "1" ]]; then
  echo "Restarting services"
  restart_services
fi

echo "Done."
