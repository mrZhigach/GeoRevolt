#!/usr/bin/env bash
# GeoRevolt E2E Test Script
# Полный цикл: деплой контрактов → API → фронтенд (если Anvil доступен)
set -e

echo "=========================================="
echo " GeoRevolt E2E Test Suite"
echo "=========================================="

PASS=0
FAIL=0

pass() { PASS=$((PASS+1)); echo "  ✅ $1"; }
fail() { FAIL=$((FAIL+1)); echo "  ❌ $1: $2"; }

# ---- 1. Check Anvil availability ----
echo ""
echo "--- 1. Anvil / Contract checks ---"

ANVIL_RUNNING=false
if curl -s -o /dev/null -w "%{http_code}" --max-time 2 http://localhost:8545 2>/dev/null | grep -q 405; then
  ANVIL_RUNNING=true
  pass "Anvil is running on localhost:8545"
else
  fail "Anvil" "Not running (start with: anvil &)"
fi

if [ "$ANVIL_RUNNING" = true ]; then
  source .env.local 2>/dev/null || true

  FACTORY_ADDR="${NEXT_PUBLIC_MARKET_FACTORY_ADDRESS:-0x34A1D3fff3958843C43aD80F30b94c510645C316}"
  USDC_ADDR="${NEXT_PUBLIC_MOCK_USDC_ADDRESS:-0x5b73C5498c1E3b4dbA84de0F1833c4a029d90519}"

  FORGE="$HOME/.foundry/bin/forge"
  ANVIL_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"

  # Verify factory is deployed
  CODE=$($FORGE code $FACTORY_ADDR --rpc-url http://localhost:8545 2>/dev/null | xxd -r -p | wc -c)
  if [ "$CODE" -gt 100 ]; then
    pass "MarketFactory deployed at $FACTORY_ADDR"
  else
    fail "MarketFactory" "No code at $FACTORY_ADDR — run deploy first"
  fi

  echo ""
  echo "--- 2. Contract E2E: Full lifecycle ---"

  # Create a market via factory (200 USDC)
  END_TIME=$(( $(date +%s) + 3600 ))
  RESOLUTION_TIME=$(( END_TIME + 3600 ))

  # Mint USDC to the deployer
  $FORGE cast send $USDC_ADDR \
    "mint(address,uint256)" \
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" \
    "1000000000000" \
    --rpc-url http://localhost:8545 \
    --private-key $ANVIL_KEY \
    --silent

  # Approve factory to spend USDC
  $FORGE cast send $USDC_ADDR \
    "approve(address,uint256)" \
    $FACTORY_ADDR \
    "1000000000000" \
    --rpc-url http://localhost:8545 \
    --private-key $ANVIL_KEY \
    --silent

  # Create market
  TX_HASH=$($FORGE cast send $FACTORY_ADDR \
    "createMarket(string,string,uint256,uint256,uint256)" \
    "E2E Test Market" \
    "Will the E2E test pass?" \
    "$END_TIME" \
    "$RESOLUTION_TIME" \
    "200000000" \
    --rpc-url http://localhost:8545 \
    --private-key $ANVIL_KEY \
    --json | jq -r '.transactionHash')

  if [ -n "$TX_HASH" ] && [ "$TX_HASH" != "null" ]; then
    pass "Market created (tx: ${TX_HASH:0:10}...)"

    # Get market address from event
    MARKET_ADDR=$($FORGE cast logs \
      --address $FACTORY_ADDR \
      --topic "MarketCreated(address,uint256,string)" \
      --from-block latest \
      --rpc-url http://localhost:8545 \
      --json | jq -r '.[0].args[0] // .[0].topics[1]' | tr -d '"\n')

    if [ -n "$MARKET_ADDR" ] && [ "$MARKET_ADDR" != "null" ]; then
      pass "Market deployed at $MARKET_ADDR"
    else
      fail "Market address" "Could not extract from event logs"
      MARKET_ADDR="0xdead"
    fi
  else
    fail "Market creation" "Transaction failed"
    MARKET_ADDR="0xdead"
  fi

  if [ "$MARKET_ADDR" != "0xdead" ]; then
    # Buy YES tokens
    $FORGE cast send $USDC_ADDR \
      "approve(address,uint256)" \
      $MARKET_ADDR \
      "100000000" \
      --rpc-url http://localhost:8545 \
      --private-key $ANVIL_KEY \
      --silent
    pass "USDC approved for market"

    $FORGE cast send $MARKET_ADDR \
      "buy(bool,uint256)" \
      "true" \
      "10000000" \
      --rpc-url http://localhost:8545 \
      --private-key $ANVIL_KEY \
      --silent
    pass "Bought YES tokens"

    YES_BALANCE=$($FORGE cast call $MARKET_ADDR \
      "balanceYES(address)(uint256)" \
      "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" \
      --rpc-url http://localhost:8545)
    if [ "$YES_BALANCE" != "0" ]; then
      pass "YES balance is non-zero: $YES_BALANCE"
    else
      fail "YES balance" "Expected >0, got 0"
    fi

    # Sell YES tokens
    $FORGE cast send $MARKET_ADDR \
      "sell(bool,uint256)" \
      "true" \
      "$YES_BALANCE" \
      --rpc-url http://localhost:8545 \
      --private-key $ANVIL_KEY \
      --silent
    pass "Sold YES tokens back"

    # Buy again for resolve test
    $FORGE cast send $MARKET_ADDR \
      "buy(bool,uint256)" \
      "true" \
      "10000000" \
      --rpc-url http://localhost:8545 \
      --private-key $ANVIL_KEY \
      --silent

    # Warp to resolution time
    $FORGE cast rpc evm_setNextBlockTimestamp $RESOLUTION_TIME --rpc-url http://localhost:8545 > /dev/null
    $FORGE cast rpc evm_mine --rpc-url http://localhost:8545 > /dev/null
    pass "Warped to resolution time"

    # Resolve via factory
    $FORGE cast send $FACTORY_ADDR \
      "resolveMarket(address,bool)" \
      $MARKET_ADDR \
      "true" \
      --rpc-url http://localhost:8545 \
      --private-key $ANVIL_KEY \
      --silent
    pass "Market resolved as YES via factory"

    # Check resolved state
    RESOLVED=$($FORGE cast call $MARKET_ADDR \
      "resolved()(bool)" \
      --rpc-url http://localhost:8545)
    if [ "$RESOLVED" = "true" ]; then
      pass "Market is resolved"
    else
      fail "Market resolved" "Expected true, got $RESOLVED"
    fi

    # Redeem
    USDC_BEFORE=$($FORGE cast call $USDC_ADDR \
      "balanceOf(address)(uint256)" \
      "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" \
      --rpc-url http://localhost:8545)

    $FORGE cast send $MARKET_ADDR \
      "redeem()" \
      --rpc-url http://localhost:8545 \
      --private-key $ANVIL_KEY \
      --silent
    pass "Redeemed winnings"

    USDC_AFTER=$($FORGE cast call $USDC_ADDR \
      "balanceOf(address)(uint256)" \
      "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" \
      --rpc-url http://localhost:8545)

    if [ "$USDC_AFTER" -gt "$USDC_BEFORE" ]; then
      pass "USDC increased after redeem"
    else
      fail "USDC redeem" "No increase (before=$USDC_BEFORE, after=$USDC_AFTER)"
    fi
  fi
else
  echo ""
  echo "--- 2. Contract E2E — SKIPPED (Anvil not available) ---"
  pass "Contract E2E (skipped, Anvil down)"
fi

# ---- 3. API E2E ----
echo ""
echo "--- 3. API E2E tests ---"

if [ "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/api/markets 2>/dev/null)" = "200" ]; then
  pass "GET /api/markets returns 200"

  GEOJSON=$(curl -s http://localhost:3000/api/markets)
  if echo "$GEOJSON" | jq -e '.type == "FeatureCollection"' > /dev/null 2>&1; then
    pass "Response is valid GeoJSON"
  else
    fail "GeoJSON format" "Not a FeatureCollection"
  fi

  MARKET_COUNT=$(echo "$GEOJSON" | jq '.features | length')
  pass "Markets in DB: $MARKET_COUNT"

  # Test create market via API
  CREATE_RESP=$(curl -s -X POST http://localhost:3000/api/markets \
    -H 'Content-Type: application/json' \
    -d "{
      \"contract_address\": \"0xe2e-$(date +%s)\",
      \"name\": \"E2E Test via API\",
      \"description\": \"Created by E2E test\",
      \"category\": \"testing\",
      \"lng\": 37.62,
      \"lat\": 55.75,
      \"end_time\": $END_TIME,
      \"resolution_time\": $RESOLUTION_TIME
    }")
  
  CREATED_ID=$(echo "$CREATE_RESP" | jq -r '.id // empty')
  if [ -n "$CREATED_ID" ]; then
    pass "POST /api/markets created market (id=$CREATED_ID)"

    # Test resolve via API
    RESOLVE_RESP=$(curl -s -X PATCH "http://localhost:3000/api/markets/$CREATED_ID/resolve" \
      -H 'Content-Type: application/json' \
      -d '{"outcome": true}')
    
    RESOLVED=$(echo "$RESOLVE_RESP" | jq -r '.resolved')
    if [ "$RESOLVED" = "true" ]; then
      pass "PATCH resolve updated market (resolved=true)"
    else
      fail "Resolve API" "Expected resolved=true, got $RESOLVED"
    fi

    # Test single market GET
    SINGLE_RESP=$(curl -s "http://localhost:3000/api/markets/$CREATED_ID")
    if echo "$SINGLE_RESP" | jq -e '.features[0].properties.id' > /dev/null 2>&1; then
      pass "GET /api/markets/$CREATED_ID returns market"
    else
      fail "Single market GET" "Unexpected response"
    fi
  else
    fail "POST /api/markets" "Create failed: $CREATE_RESP"
  fi
else
  fail "API" "Server not running on :3000 (start with: npm run dev)"
fi

# ---- 4. Frontend E2E ----
echo ""
echo "--- 4. Frontend checks ---"

FRONTEND_RESP=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000 2>/dev/null)
if [ "$FRONTEND_RESP" = "200" ]; then
  pass "Frontend returns 200 at /"

  HTML=$(curl -s http://localhost:3000)
  if echo "$HTML" | grep -q "maplibregl-map"; then
    pass "Map container present in HTML"
  else
    fail "Map container" "maplibregl-map not found"
  fi

  # Check admin page
  ADMIN_RESP=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/admin 2>/dev/null)
  if [ "$ADMIN_RESP" = "200" ]; then
    pass "Admin page returns 200 at /admin"
  else
    fail "Admin page" "Got status $ADMIN_RESP"
  fi
else
  fail "Frontend" "Not serving on :3000"
fi

# ---- Summary ----
echo ""
echo "=========================================="
echo " Results: $PASS passed, $FAIL failed"
echo "=========================================="

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
exit 0
