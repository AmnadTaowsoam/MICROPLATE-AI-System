#!/bin/bash
# MinIO Bucket Initialization Script
# This script creates the necessary buckets for Microplate AI

set -e

# Wait for MinIO to be ready
until mc alias set myminio http://localhost:9000 minioadmin minioadmin123; do
  echo "Waiting for MinIO to be ready..."
  sleep 2
done

echo "MinIO is ready. Creating buckets..."

# Create buckets
mc mb myminio/raw-images --ignore-existing
mc mb myminio/annotated-images --ignore-existing
mc mb myminio/interface-files --ignore-existing
mc mb myminio/temp-files --ignore-existing

# Set bucket policies (public read for images, private for interface files)
mc anonymous set public myminio/raw-images
mc anonymous set public myminio/annotated-images
mc anonymous set download myminio/interface-files
mc anonymous set download myminio/temp-files

# Create folder structure
mc cp /dev/null myminio/raw-images/.gitkeep
mc cp /dev/null myminio/annotated-images/.gitkeep
mc cp /dev/null myminio/interface-files/.gitkeep
mc cp /dev/null myminio/temp-files/.gitkeep

echo "Buckets created successfully:"
mc ls myminio

echo "MinIO initialization completed!"
