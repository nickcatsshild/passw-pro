#!/bin/bash
# Constrói a imagem Docker e salva como .tar na pasta docker/
# Use: bash docker/build-save.sh

set -e

IMAGE_NAME="passw-pro:latest"
TAR_FILE="docker/passw-pro-image.tar"

echo "=== Buildando imagem Docker ==="
docker build -t "$IMAGE_NAME" .

echo "=== Salvando imagem em $TAR_FILE ==="
mkdir -p docker
docker save "$IMAGE_NAME" -o "$TAR_FILE"

echo "=== Imagem salva em $TAR_FILE ==="
echo "Para carregar em outra máquina: docker load -i $TAR_FILE"
