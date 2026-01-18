#!/usr/bin/env bash
set -euo pipefail

echo "=== Docker Configuration Verification ==="
echo ""

# Expected configuration
EXPECTED_NAMESPACE="codevertex"
EXPECTED_APP_NAME="notifications-api"
EXPECTED_IMAGE="docker.io/codevertex/notifications-api"

echo "Expected Configuration:"
echo "  Namespace: $EXPECTED_NAMESPACE"
echo "  App Name: $EXPECTED_APP_NAME"
echo "  Full Image: $EXPECTED_IMAGE"
echo ""

# Check build.sh
echo "Checking build.sh..."
if grep -q "REGISTRY_NAMESPACE=.*codevertex" build.sh; then
  echo "  ✅ REGISTRY_NAMESPACE correctly set to codevertex"
else
  echo "  ❌ REGISTRY_NAMESPACE not set to codevertex in build.sh"
fi

if grep -q "APP_NAME=.*notifications-api" build.sh; then
  echo "  ✅ APP_NAME correctly set to notifications-api"
else
  echo "  ❌ APP_NAME not set correctly in build.sh"
fi
echo ""

# Check workflow
echo "Checking .github/workflows/deploy.yml..."
if grep -q "REGISTRY_NAMESPACE=codevertex" .github/workflows/deploy.yml; then
  echo "  ✅ REGISTRY_NAMESPACE correctly set in workflow"
else
  echo "  ❌ REGISTRY_NAMESPACE not set correctly in workflow"
fi

if grep -q "APP_NAME=notifications-api" .github/workflows/deploy.yml; then
  echo "  ✅ APP_NAME correctly set in workflow"
else
  echo "  ❌ APP_NAME not set correctly in workflow"
fi
echo ""

# Test docker image name construction
echo "Testing Docker image name construction:"
REGISTRY_SERVER="docker.io"
REGISTRY_NAMESPACE="codevertex"
APP_NAME="notifications-api"
IMAGE_REPO="${REGISTRY_SERVER}/${REGISTRY_NAMESPACE}/${APP_NAME}"
echo "  Constructed: $IMAGE_REPO"

if [ "$IMAGE_REPO" = "$EXPECTED_IMAGE" ]; then
  echo "  ✅ Image name matches expected: $EXPECTED_IMAGE"
else
  echo "  ❌ Image name MISMATCH!"
  echo "     Expected: $EXPECTED_IMAGE"
  echo "     Got: $IMAGE_REPO"
fi
echo ""

echo "=== Common Issues & Solutions ==="
echo ""
echo "1. Repository not found on Docker Hub:"
echo "   - Create repository at: https://hub.docker.com/repository/create"
echo "   - Name: codevertex/notifications-api"
echo "   - Visibility: Public or Private (ensure account has access)"
echo ""
echo "2. Authentication failure:"
echo "   - Verify REGISTRY_USERNAME secret is set in GitHub"
echo "   - Verify REGISTRY_PASSWORD secret is set in GitHub"
echo "   - Test credentials: docker login docker.io -u USERNAME"
echo ""
echo "3. Permission denied:"
echo "   - Ensure Docker Hub account has push access to 'codevertex' namespace"
echo "   - For organization repos, check team permissions"
echo ""
echo "4. Tag already exists:"
echo "   - Check if image with same SHA already exists"
echo "   - Docker Hub doesn't allow overwriting existing tags"
echo ""

# Check if running in CI
if [ -n "${GITHUB_ACTIONS:-}" ]; then
  echo "Running in GitHub Actions CI environment"
  echo "Available secrets (masked):"
  echo "  REGISTRY_USERNAME: ${REGISTRY_USERNAME:+SET}"
  echo "  REGISTRY_PASSWORD: ${REGISTRY_PASSWORD:+SET}"
fi

