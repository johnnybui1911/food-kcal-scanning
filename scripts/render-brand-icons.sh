#!/usr/bin/env bash
# Rasterise the SVG sources in assets/brand/ into every PNG the app ships.
# Uses headless Google Chrome, so no extra npm dependency is needed.
set -euo pipefail
cd "$(dirname "$0")/.."

CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# render <svg> <size> <out.png>
render() {
  local page="$TMP/page.html"
  printf '<style>html,body{margin:0;background:transparent}img{display:block;width:%spx;height:%spx}</style><img src="file://%s">' \
    "$2" "$2" "$PWD/$1" > "$page"
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --default-background-color=00000000 --window-size="$2,$2" \
    --screenshot="$PWD/$3" "file://$page" >/dev/null 2>&1
  echo "wrote $3 (${2}px)"
}

render assets/brand/bobi-app-icon.svg 1024 assets/images/icon.png
render assets/brand/bobi-app-icon.svg 512 public/icons/icon-512.png
render assets/brand/bobi-app-icon.svg 192 public/icons/icon-192.png
render assets/brand/bobi-app-icon.svg 180 public/apple-touch-icon.png
render assets/brand/bobi-favicon.svg 48 assets/images/favicon.png
render assets/brand/bobi-mascot.svg 480 assets/images/bobi-mascot.png
