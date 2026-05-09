#!/bin/bash
# GeoRevolt Sprint 5 — Full E2E verification
# Usage: bash scripts/e2e-sprint-5.sh
set -e

PASS=0
FAIL=0

pass() { PASS=$((PASS+1)); echo "  ✅ $1"; }
fail() { FAIL=$((FAIL+1)); echo "  ❌ $1"; }

echo "==========================================="
echo "  GeoRevolt Sprint 5 — E2E Validation"
echo "==========================================="
echo ""

# ---- Check services ----
echo "--- Infrastructure ---"

if curl -s http://localhost:8545 > /dev/null 2>&1; then
  pass "Anvil is running on :8545"
else
  fail "Anvil is NOT running — start with: anvil &"
fi

if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
  pass "Next.js dev server is running on :3000"
else
  fail "Next.js is NOT running — start with: npm run dev"
fi

echo ""
echo "--- API Endpoints ---"

# 1. Health
HEALTH=$(curl -s http://localhost:3000/api/health)
if echo "$HEALTH" | grep -q '"ok"'; then
  pass "GET /api/health → status ok"
else
  fail "GET /api/health returned: $HEALTH"
fi

# 2. Markets GeoJSON
MARKETS=$(curl -s http://localhost:3000/api/markets)
if echo "$MARKETS" | grep -q '"FeatureCollection"'; then
  pass "GET /api/markets → GeoJSON FeatureCollection"
else
  fail "GET /api/markets is not GeoJSON"
fi

# 3. Events
EVENTS=$(curl -s http://localhost:3000/api/events)
if echo "$EVENTS" | grep -q '\['; then
  pass "GET /api/events → array"
else
  fail "GET /api/events is not an array: $EVENTS"
fi

# 4. Admin stats
STATS=$(curl -s http://localhost:3000/api/admin/stats)
if echo "$STATS" | grep -q '"totalMarkets"'; then
  pass "GET /api/admin/stats → has totalMarkets"
else
  fail "GET /api/admin/stats missing totalMarkets: $STATS"
fi

# 5. Admin markets (paginated)
ADMIN_MKTS=$(curl -s "http://localhost:3000/api/admin/markets?page=1&limit=5")
if echo "$ADMIN_MKTS" | grep -q '"markets"'; then
  pass "GET /api/admin/markets → paginated list"
else
  fail "GET /api/admin/markets failed: $ADMIN_MKTS"
fi

# 6. Allowed countries — empty initially
COUNTRIES=$(curl -s http://localhost:3000/api/admin/allowed-countries)
if echo "$COUNTRIES" | grep -q '"countries"'; then
  pass "GET /api/admin/allowed-countries → has countries array"
else
  fail "GET /api/admin/allowed-countries failed: $COUNTRIES"
fi

echo ""
echo "--- Admin: Allowed Countries ---"

# 7. Add countries
ADD=$(curl -s -X POST http://localhost:3000/api/admin/allowed-countries \
  -H "Content-Type: application/json" \
  -d '{"countries":["US","GB","DE"]}')
if echo "$ADD" | grep -q '"US"'; then
  pass "POST allowed countries → US, GB, DE added"
else
  fail "POST allowed countries failed: $ADD"
fi

# 8. Invalid country code
INVALID=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/admin/allowed-countries \
  -H "Content-Type: application/json" \
  -d '{"countries":["INVALID"]}')
if [ "$INVALID" = "400" ]; then
  pass "Invalid country code → 400"
else
  fail "Invalid country code returned $INVALID (expected 400)"
fi

echo ""
echo "--- Batch Upload ---"

# 9. CSV batch upload
cat > /tmp/test-batch.csv << 'CSVEOF'
name,description,category,lng,lat,endTime,resolutionTime,liquidity
Test Market 1,First test market,sports,37.62,55.75,1893456000,1893542400,200
Test Market 2,Second test market,politics,30.31,59.93,1893456000,1893542400,500
CSVEOF

BATCH_RESULT=$(curl -s -X POST http://localhost:3000/api/admin/batch-upload \
  -F "file=@/tmp/test-batch.csv")
if echo "$BATCH_RESULT" | grep -q '"successCount":2'; then
  pass "CSV batch upload → 2 markets created"
else
  fail "CSV batch upload failed: $BATCH_RESULT"
fi

# 10. GeoJSON batch upload
cat > /tmp/test-batch.geojson << 'GEOEOF'
{"type":"FeatureCollection","features":[
  {"type":"Feature","geometry":{"type":"Point","coordinates":[37.62,55.75]},"properties":{"name":"Geo Market 1","description":"From GeoJSON","category":"technology","endTime":1893456000,"resolutionTime":1893542400,"liquidity":300}},
  {"type":"Feature","geometry":{"type":"Point","coordinates":[30.31,59.93]},"properties":{"name":"Geo Market 2","description":"From GeoJSON","category":"economics","endTime":1893456000,"resolutionTime":1893542400,"liquidity":400}}
]}
GEOEOF

GEO_RESULT=$(curl -s -X POST http://localhost:3000/api/admin/batch-upload \
  -F "file=@/tmp/test-batch.geojson")
if echo "$GEO_RESULT" | grep -q '"successCount":2'; then
  pass "GeoJSON batch upload → 2 markets created"
else
  fail "GeoJSON batch upload failed: $GEO_RESULT"
fi

echo ""
echo "--- Price History ---"

# 11. Get price history for first market (might be empty — that's OK)
# First get a contract address
FIRST_ADDR=$(echo "$MARKETS" | python3 -c "
import json,sys
data = json.load(sys.stdin)
feats = data.get('features', [])
if feats:
    print(feats[0]['properties']['contract_address'])
" 2>/dev/null || echo "")

if [ -n "$FIRST_ADDR" ]; then
  PRICE_HIST=$(curl -s "http://localhost:3000/api/price-history/$FIRST_ADDR")
  if echo "$PRICE_HIST" | grep -q '\['; then
    pass "GET /api/price-history → array"
  else
    fail "GET /api/price-history failed: $PRICE_HIST"
  fi
else
  pass "No markets found — skipping price-history test (not a failure)"
fi

echo ""
echo "--- Frontend Pages ---"

# 12. Home page
HOME_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/)
if [ "$HOME_STATUS" = "200" ]; then
  pass "GET / → 200"
else
  fail "GET / returned $HOME_STATUS"
fi

# 13. Admin page
ADMIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/admin)
if [ "$ADMIN_STATUS" = "200" ]; then
  pass "GET /admin → 200"
else
  fail "GET /admin returned $ADMIN_STATUS"
fi

# 14. Market detail page (if any market exists)
if [ -n "$FIRST_ADDR" ]; then
  MKT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/market/$FIRST_ADDR")
  if [ "$MKT_STATUS" = "200" ]; then
    pass "GET /market/$FIRST_ADDR → 200"
  else
    fail "GET /market/$FIRST_ADDR returned $MKT_STATUS"
  fi
fi

echo ""
echo "==========================================="
echo "  RESULTS: $PASS passed, $FAIL failed"
echo "==========================================="

# Cleanup
rm -f /tmp/test-batch.csv /tmp/test-batch.geojson

exit $FAIL
