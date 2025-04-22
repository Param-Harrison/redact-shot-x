#!/bin/bash
set -e

echo "🐧 Building RedactShotX for Linux via Docker..."

docker build -t redactshotx-linux -f scripts/Dockerfile.linux .
mkdir -p dist-linux
docker run --rm -v "$PWD/dist-linux:/app/dist" redactshotx-linux
echo "✅ Linux binary is in dist-linux/"
