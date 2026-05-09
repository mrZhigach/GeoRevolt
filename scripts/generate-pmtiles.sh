#!/usr/bin/env bash
# GeoRevolt PMTiles Generator (Russia)
# Требует: Java 21+, ~48 GB RAM, 100 GB свободного места
set -e

echo "=== GeoRevolt PMTiles Generator ==="
echo "Downloading Planetiler..."
PLANETILER_URL="https://github.com/onthegomap/planetiler/releases/latest/download/planetiler.jar"
PLANETILER_JAR="planetiler.jar"

if [ ! -f "$PLANETILER_JAR" ]; then
  curl -L -o "$PLANETILER_JAR" "$PLANETILER_URL"
fi

echo "Generating PMTiles for Russia..."
java -Xmx48g -jar "$PLANETILER_JAR" \
  --download --area=russia \
  --output=public/data/russia-detail.pmtiles \
  --maxzoom=15 \
  --nodata=public/data/russia-detail-nodata.pmtiles

echo "Computing checksum..."
sha256sum public/data/russia-detail.pmtiles > public/data/russia-detail.pmtiles.sha256

echo "Done! Output: public/data/russia-detail.pmtiles"
ls -lh public/data/russia-detail.pmtiles
