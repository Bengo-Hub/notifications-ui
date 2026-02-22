#!/usr/bin/env bash
# =============================================================================
# Notifications UI Build & Deploy Script
# =============================================================================
set -euo pipefail

# Configuration
APP_NAME="notifications-ui"
NAMESPACE="notifications"
REGISTRY_REPO="docker.io/codevertex/notifications-ui"
DEVOPS_DIR="d:/Projects/BengoBox/devops-k8s"

# Git Commit ID
GIT_COMMIT_ID=$(git rev-parse --short=8 HEAD || echo "local")

# Build-time args
NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-"https://notificationsapi.codevertexitsolutions.com"}

echo "Building ${APP_NAME}:${GIT_COMMIT_ID}"

# Docker Build
DOCKER_BUILDKIT=1 docker build . -t "${REGISTRY_REPO}:${GIT_COMMIT_ID}" \
  --build-arg NEXT_PUBLIC_API_URL="$NEXT_PUBLIC_API_URL"

# Push to registry (conditional)
if [[ "${1:-}" == "--push" ]]; then
  docker push "${REGISTRY_REPO}:${GIT_COMMIT_ID}"
fi

# Update Helm Values using centralized script
if [[ -f "${DEVOPS_DIR}/scripts/tools/update-helm-values.sh" ]]; then
  "${DEVOPS_DIR}/scripts/tools/update-helm-values.sh" "$APP_NAME" "$GIT_COMMIT_ID"
fi

echo "Done!"
