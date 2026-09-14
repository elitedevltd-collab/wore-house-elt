#!/usr/bin/env bash
# Build & push the Warehouse System images using the Docker Build Cloud
# "worehouse" builder (Docker Hub account: elitedevltd).
#
# Prerequisites (must be done once on the machine that runs this script):
#   1. Docker Desktop installed, with the Docker Build Cloud extension/CLI plugin.
#   2. Logged in to the elitedevltd Docker Hub account:
#        docker login
#   3. The cloud builder already exists (it does — visible in the
#      Docker Cloud dashboard as "worehouse", Enabled). If it's ever missing,
#      create it once with:
#        docker buildx create --driver cloud elitedevltd/worehouse
#
# Usage:
#   ./docker-cloud-build.sh            # build + push amd64 & arm64 images
#   PUSH=0 ./docker-cloud-build.sh     # build only, don't push (sanity check)

set -euo pipefail

NAMESPACE="elitedevltd"
BUILDER="cloud-elitedevltd-worehouse"
PLATFORMS="linux/amd64,linux/arm64"
PUSH="${PUSH:-1}"
TAG="${TAG:-latest}"

cd "$(dirname "$0")"

# Make sure the local pointer to the cloud builder exists (no-op if it does).
docker buildx create --driver cloud elitedevltd/worehouse --name "$BUILDER" >/dev/null 2>&1 || true

PUSH_FLAG=()
if [[ "$PUSH" == "1" ]]; then
  PUSH_FLAG=(--push)
else
  echo "PUSH=0 set — building only (image stays in the cloud build cache, not pushed)."
fi

echo "== Building backend  ($NAMESPACE/warehouse-backend:$TAG) =="
docker buildx build \
  --builder "$BUILDER" \
  --platform "$PLATFORMS" \
  -t "$NAMESPACE/warehouse-backend:$TAG" \
  "${PUSH_FLAG[@]}" \
  ./backend

echo "== Building frontend ($NAMESPACE/warehouse-frontend:$TAG) =="
docker buildx build \
  --builder "$BUILDER" \
  --platform "$PLATFORMS" \
  -t "$NAMESPACE/warehouse-frontend:$TAG" \
  "${PUSH_FLAG[@]}" \
  ./frontend

echo
echo "Done."
if [[ "$PUSH" == "1" ]]; then
  echo "Pushed:"
  echo "  docker.io/$NAMESPACE/warehouse-backend:$TAG"
  echo "  docker.io/$NAMESPACE/warehouse-frontend:$TAG"
fi
