#!/bin/bash
# Setup shared folders for Microplate AI
# This script creates the necessary folder structure for file storage

set -e

BASE_DIR="/app/shared-storage"
echo "Setting up shared folders in $BASE_DIR..."

# Create base directories
mkdir -p "$BASE_DIR/raw-images"
mkdir -p "$BASE_DIR/annotated-images"
mkdir -p "$BASE_DIR/interface-files"
mkdir -p "$BASE_DIR/temp-files"

# Create subdirectories for organization
mkdir -p "$BASE_DIR/raw-images/original"
mkdir -p "$BASE_DIR/raw-images/processed"
mkdir -p "$BASE_DIR/annotated-images/predictions"
mkdir -p "$BASE_DIR/annotated-images/overlays"
mkdir -p "$BASE_DIR/interface-files/csv"
mkdir -p "$BASE_DIR/interface-files/exports"
mkdir -p "$BASE_DIR/temp-files/uploads"
mkdir -p "$BASE_DIR/temp-files/processing"

# Set permissions (adjust as needed for your system)
chmod -R 755 "$BASE_DIR"
chown -R 1000:1000 "$BASE_DIR" 2>/dev/null || echo "Note: Could not change ownership (this is normal on some systems)"

# Create .gitkeep files to preserve directory structure
touch "$BASE_DIR/raw-images/.gitkeep"
touch "$BASE_DIR/raw-images/original/.gitkeep"
touch "$BASE_DIR/raw-images/processed/.gitkeep"
touch "$BASE_DIR/annotated-images/.gitkeep"
touch "$BASE_DIR/annotated-images/predictions/.gitkeep"
touch "$BASE_DIR/annotated-images/overlays/.gitkeep"
touch "$BASE_DIR/interface-files/.gitkeep"
touch "$BASE_DIR/interface-files/csv/.gitkeep"
touch "$BASE_DIR/interface-files/exports/.gitkeep"
touch "$BASE_DIR/temp-files/.gitkeep"
touch "$BASE_DIR/temp-files/uploads/.gitkeep"
touch "$BASE_DIR/temp-files/processing/.gitkeep"

echo "Shared folders created successfully!"
echo ""
echo "Folder structure:"
echo "$BASE_DIR/"
echo "├── raw-images/"
echo "│   ├── original/"
echo "│   └── processed/"
echo "├── annotated-images/"
echo "│   ├── predictions/"
echo "│   └── overlays/"
echo "├── interface-files/"
echo "│   ├── csv/"
echo "│   └── exports/"
echo "└── temp-files/"
echo "    ├── uploads/"
echo "    └── processing/"
