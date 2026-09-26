#!/usr/bin/env bash
# Smoke-test the Calobi API. Usage: scripts/smoke-api.sh [base_url]
# SMOKE_SKIP_AI=1 skips the steps that call Claude (no API key or food photo needed).
set -uo pipefail

BASE="${1:-http://localhost:8787}"
DIR="$(cd "$(dirname "$0")" && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
DEVICE="$(uuidgen | tr 'A-Z' 'a-z')"

fail() { echo "SMOKE FAIL: $1"; exit 1; }

# post <path> <body-file> -> writes response body to $TMP/out, prints status code
post() {
  curl -s -o "$TMP/out" -w "%{http_code}" -X POST "$BASE$1" \
    -H "content-type: application/json" -H "x-device-id: $DEVICE" --data-binary "@$2"
}

# build_scan <image> <media_type> <out-file>
build_scan() {
  node -e '
    const fs = require("fs");
    const [img, mt, out] = process.argv.slice(1);
    fs.writeFileSync(out, JSON.stringify({ image_base64: fs.readFileSync(img).toString("base64"), media_type: mt, note: "", locale: "vi" }));
  ' "$1" "$2" "$3"
}

echo "== health"
curl -s "$BASE/api/health" | grep -q '"ok":true' || fail "health"

echo "== oversized image -> 413"
node -e 'require("fs").writeFileSync(process.argv[1], JSON.stringify({ image_base64: "a".repeat(1500001), media_type: "image/jpeg", locale: "vi" }))' "$TMP/big.json"
[ "$(post /api/scan "$TMP/big.json")" = "413" ] || fail "oversized image"

if [ "${SMOKE_SKIP_AI:-0}" != "1" ]; then
  FOOD="$DIR/fixtures/food-1024.jpg"
  if [ ! -f "$FOOD" ]; then
    [ -f "$DIR/fixtures/food.jpg" ] || fail "missing scripts/fixtures/food.jpg"
    sips -Z 1024 "$DIR/fixtures/food.jpg" --out "$FOOD" >/dev/null || fail "resize fixture"
  fi

  echo "== scan food -> 200"
  build_scan "$FOOD" image/jpeg "$TMP/scan.json"
  START=$(date +%s)
  CODE=$(post /api/scan "$TMP/scan.json")
  echo "   scan took $(( $(date +%s) - START ))s"
  [ "$CODE" = "200" ] || { cat "$TMP/out"; fail "scan food (HTTP $CODE)"; }
  grep -q '"calories_kcal"' "$TMP/out" || fail "scan food body"
  cp "$TMP/out" "$TMP/scan-result.json"

  echo "== scan non-food -> 422"
  NONFOOD="$DIR/fixtures/non-food.png"
  build_scan "$NONFOOD" image/png "$TMP/nonfood.json"
  CODE=$(post /api/scan "$TMP/nonfood.json")
  [ "$CODE" = "422" ] && grep -q not_food "$TMP/out" || { cat "$TMP/out"; fail "scan non-food (HTTP $CODE)"; }

  echo "== refine -> 200"
  node -e '
    const fs = require("fs");
    const prev = JSON.parse(fs.readFileSync(process.argv[1], "utf8")).result;
    fs.writeFileSync(process.argv[2], JSON.stringify({ previous: prev, correction: "ít bánh phở hơn", locale: "vi" }));
  ' "$TMP/scan-result.json" "$TMP/refine.json"
  CODE=$(post /api/refine "$TMP/refine.json")
  [ "$CODE" = "200" ] || { cat "$TMP/out"; fail "refine (HTTP $CODE)"; }
fi

echo "== feedback -> 204"
echo '{"rating":"up","reasons":["other"],"comment":"smoke","dish_name":"x","calories_kcal":1,"quality_score":1,"model":"m","prompt_version":"p","locale":"vi"}' > "$TMP/fb.json"
[ "$(post /api/feedback "$TMP/fb.json")" = "204" ] || fail "feedback"

echo "== burst limit -> 429"
GOT429=0
for _ in 1 2 3 4 5 6 7; do
  [ "$(post /api/feedback "$TMP/fb.json")" = "429" ] && GOT429=1
done
[ "$GOT429" = "1" ] || fail "burst limit never returned 429"

echo "SMOKE PASS"
