#!/usr/bin/env bash
set -euo pipefail

# Build a Poland PMTiles extract from the latest Protomaps daily basemap.
#
# Usage:
#   bun run map:tiles
#   POLAND_MAXZOOM=12 POLAND_BBOX=14.12,49.00,24.15,54.84 bun run map:tiles
#
# The output is written to public/poland.pmtiles and is ignored by git.
# Defaults: maxzoom 15 (about 4 GB), 12 download threads. For a quick, small
# extract use POLAND_MAXZOOM=10 (about 100 MB; the map overzooms past it).
# Set PROTOMAPS_PLANET_URL to use a specific planet build instead of the latest.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="${1:-$ROOT_DIR/public/poland.pmtiles}"
BBOX="${POLAND_BBOX:-14.12,49.00,24.15,54.84}"
MAXZOOM="${POLAND_MAXZOOM:-15}"
THREADS="${PMTILES_THREADS:-12}"
ATTEMPTS="${PMTILES_ATTEMPTS:-3}"
BIN_DIR="${PMTILES_BIN_DIR:-$HOME/.local/bin}"

if ! command -v pmtiles >/dev/null 2>&1; then
	if [ -x "$BIN_DIR/pmtiles" ]; then
		export PATH="$BIN_DIR:$PATH"
	else
		echo "pmtiles CLI not found." >&2
		echo "Install it from https://github.com/protomaps/go-pmtiles/releases" >&2
		exit 1
	fi
fi

BUILD_URL="${PROTOMAPS_PLANET_URL:-}"
if [ -z "$BUILD_URL" ]; then
	for offset in 0 1 2 3 4 5 6; do
		day="$(date -u -d "-${offset} day" +%Y%m%d)"
		candidate="https://build.protomaps.com/${day}.pmtiles"
		if curl -fsI --max-time 20 "$candidate" >/dev/null; then
			BUILD_URL="$candidate"
			break
		fi
	done
fi

if [ -z "$BUILD_URL" ]; then
	echo "No recent Protomaps daily build found." >&2
	echo "Set PROTOMAPS_PLANET_URL to a valid PMTiles archive URL." >&2
	exit 1
fi

mkdir -p "$(dirname "$OUT")"

echo "Extracting Poland from $BUILD_URL"
echo "  bbox=$BBOX maxzoom=$MAXZOOM output=$OUT"

attempt=1
while true; do
	# Remove any partial archive from a previous attempt before retrying.
	rm -f "$OUT"

	if pmtiles extract "$BUILD_URL" "$OUT" \
		--bbox="$BBOX" \
		--maxzoom="$MAXZOOM" \
		--download-threads="$THREADS"; then
		break
	else
		status=$?
	fi

	if [ "$attempt" -ge "$ATTEMPTS" ]; then
		echo "Extraction failed after $ATTEMPTS attempts (exit $status)." >&2
		exit "$status"
	fi

	attempt=$((attempt + 1))
	echo "Extract failed (exit $status); retrying in 5s ($attempt/$ATTEMPTS)..." >&2
	sleep 5
done

echo "Done: $(du -h "$OUT" | cut -f1)"
