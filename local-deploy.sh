#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

APP_PORT=4002
REDIS_CONTAINER_NAME="redis"
SERVICE_IMAGE="notifications-api:local"
SERVICE_CONTAINER_NAME="notifications-api-local"
ENV_FILE="$ROOT_DIR/.env"
EXAMPLE_ENV="$ROOT_DIR/config/app.env.example"
TEMPLATES_DIR="$ROOT_DIR/templates"

log() {
  echo "[local-deploy] $*"
}

require() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1"
    exit 1
  fi
}

ensure_database() {
  if grep -q '^NOTIFICATIONS_POSTGRES_URL=' "$ENV_FILE"; then
    local db_url
    db_url="$(grep '^NOTIFICATIONS_POSTGRES_URL=' "$ENV_FILE" | sed 's/^NOTIFICATIONS_POSTGRES_URL=//')"
    log "Checking database connectivity at ${db_url%%:*}..."
    
    # Extract host and port from database URL for basic connectivity check
    if command -v pg_isready >/dev/null 2>&1; then
      local db_host db_port
      db_host="$(echo "$db_url" | sed -n 's/.*@\([^:]*\):.*/\1/p')"
      db_port="$(echo "$db_url" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')"
      
      # Default values if extraction failed
      db_host="${db_host:-localhost}"
      db_port="${db_port:-5432}"
      
      # Map localhost for Docker containers
      if [[ "$db_host" == "localhost" || "$db_host" == "127.0.0.1" ]]; then
        db_host="host.docker.internal"
      fi
      
      log "Waiting for database at $db_host:$db_port..."
      timeout 30s sh -c "until pg_isready -h '$db_host' -p '$db_port'; do sleep 1; done" 2>/dev/null || {
        log "Database may not be ready - continuing anyway"
      }
    fi
  fi
}

ensure_env() {
  if [[ ! -f "$ENV_FILE" ]]; then
    log "Creating .env from config/app.env.example"
    cp "$EXAMPLE_ENV" "$ENV_FILE"

    # Normalize defaults for local dev (share Redis at 6379)
    if grep -q '^NOTIFICATIONS_REDIS_ADDR=' "$ENV_FILE"; then
      sed -i.bak 's|^NOTIFICATIONS_REDIS_ADDR=.*|NOTIFICATIONS_REDIS_ADDR=127.0.0.1:6379|' "$ENV_FILE" || true
    else
      printf "NOTIFICATIONS_REDIS_ADDR=127.0.0.1:6379\n" >> "$ENV_FILE"
    fi
    if grep -q '^NOTIFICATIONS_HTTP_PORT=' "$ENV_FILE"; then
      APP_PORT="$(grep '^NOTIFICATIONS_HTTP_PORT=' "$ENV_FILE" | sed 's/^NOTIFICATIONS_HTTP_PORT=//')"
    fi
    rm -f "$ENV_FILE.bak"
  else
    if grep -q '^NOTIFICATIONS_HTTP_PORT=' "$ENV_FILE"; then
      APP_PORT="$(grep '^NOTIFICATIONS_HTTP_PORT=' "$ENV_FILE" | sed 's/^NOTIFICATIONS_HTTP_PORT=//')"
    fi
  fi
}

ensure_redis() {
  if ! command -v docker >/dev/null 2>&1; then
    log "Docker not found; skipping Redis container. Ensure Redis is reachable at 127.0.0.1:6379."
    return 0
  fi
  if ! docker ps -a --format '{{.Names}}' | grep -wq "$REDIS_CONTAINER_NAME"; then
    log "Starting Redis container"
    docker run -d --name "$REDIS_CONTAINER_NAME" -p 6379:6379 redis:7 >/dev/null || {
      log "Redis start failed (likely port in use); continuing"
      true
    }
  elif ! docker ps --format '{{.Names}}' | grep -wq "$REDIS_CONTAINER_NAME"; then
    log "Starting existing Redis container"
    docker start "$REDIS_CONTAINER_NAME" >/dev/null || {
      log "Redis start failed (likely port in use); continuing"
      true
    }
  else
    log "Redis container already running"
  fi
}

build_image() {
  require docker
  log "Building image $SERVICE_IMAGE"
  docker build -t "$SERVICE_IMAGE" . >/dev/null
}

ensure_container() {
  require docker

  # Prepare host overrides for DB and Redis if needed
  local override_env=()
  if grep -q '^NOTIFICATIONS_POSTGRES_URL=' "$ENV_FILE"; then
    local db_url
    db_url="$(grep '^NOTIFICATIONS_POSTGRES_URL=' "$ENV_FILE" | sed 's/^NOTIFICATIONS_POSTGRES_URL=//')"
    if [[ "$db_url" == *"localhost"* || "$db_url" == *"127.0.0.1"* ]]; then
      db_url="${db_url//localhost/host.docker.internal}"
      db_url="${db_url//127.0.0.1/host.docker.internal}"
      override_env+=("-e" "NOTIFICATIONS_POSTGRES_URL=$db_url")
    fi
  fi
  # Force Redis to host.docker.internal inside container
  override_env+=("-e" "NOTIFICATIONS_REDIS_ADDR=host.docker.internal:6379")

  # Determine desired container port from env
  local port_in_env="$APP_PORT"
  if grep -q '^NOTIFICATIONS_HTTP_PORT=' "$ENV_FILE"; then
    port_in_env="$(grep '^NOTIFICATIONS_HTTP_PORT=' "$ENV_FILE" | sed 's/^NOTIFICATIONS_HTTP_PORT=//')"
  fi

  if docker ps -a --format '{{.Names}}' | grep -wq "$SERVICE_CONTAINER_NAME"; then
    if ! docker ps --format '{{.Names}}' | grep -wq "$SERVICE_CONTAINER_NAME"; then
      log "Starting existing service container"
      docker start "$SERVICE_CONTAINER_NAME" >/dev/null && return 0
    fi
    log "Service container already running"
    return 0
  fi

  log "Running container $SERVICE_CONTAINER_NAME on :$port_in_env"
  docker run --name "$SERVICE_CONTAINER_NAME" -d \
    -p "$port_in_env:$port_in_env" \
    --env-file "$ENV_FILE" \
    "${override_env[@]}" \
    -v "$TEMPLATES_DIR:/app/templates" \
    "$SERVICE_IMAGE" >/dev/null
}

recreate_container() {
  require docker
  # Stop existing container if running
  if docker ps -a --format '{{.Names}}' | grep -wq "$SERVICE_CONTAINER_NAME"; then
    docker rm -f "$SERVICE_CONTAINER_NAME" >/dev/null 2>&1 || true
  fi
  ensure_container
}

usage() {
  cat <<USAGE
Usage: $(basename "$0") [command]

Commands:
  init         Ensure .env exists (from config/app.env.example)
  redis        Ensure Redis (Docker) is running
  db           Check database connectivity
  build        Build the Docker image
  up           Init, DB, Redis, then ensure container is running
  run          Rebuild image and recreate container
  help         Show this help

Examples:
  ./local-deploy.sh up
  ./local-deploy.sh run
USAGE
}

case "${1:-up}" in
  init)
    ensure_env
    ;;
  redis)
    ensure_redis
    ;;
  db)
    ensure_database
    ;;
  build)
    ensure_env
    build_image
    ;;
  run)
    ensure_env
    ensure_database
    ensure_redis
    build_image
    recreate_container
    ;;
  up)
    ensure_env
    ensure_database
    ensure_redis
    build_image
    ensure_container
    ;;
  help|-h|--help)
    usage
    ;;
  *)
    usage
    exit 1
    ;;
esac


