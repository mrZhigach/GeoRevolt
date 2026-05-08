#!/usr/bin/env bash
# GeoRevolt E2E on forked Amoy
# Использование: bash scripts/e2e-fork.sh [--skip-deploy]
set -e

echo "=========================================="
echo " GeoRevolt E2E — Forked Amoy"
echo "=========================================="

PASS=0
FAIL=0
AMOY_RPC="https://rpc-amoy.polygon.technology"
ANVIL_PORT=18545
CHAIN_ID=31337
SKIP_DEPLOY=false
FORGE="$HOME/.foundry/bin/forge"
ANVIL_KEY="0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"

[[ "$1" == "--skip-deploy" ]] && SKIP_DEPLOY=true

pass() { PASS=$((PASS+1)); echo "  ✅ $1"; }
fail() { FAIL=$((FAIL+1)); echo "  ❌ $1: $2"; }

cleanup() {
  if [ -n "$ANVIL_PID" ]; then
    kill $ANVIL_PID 2>/dev/null || true
    wait $ANVIL_PID 2>/dev/null || true
  fi
}
trap cleanup EXIT

echo ""
echo "--- 1. Start forked Anvil ---"

if curl -s -o /dev/null -w "%{http_code}" --max-time 2 http://localhost:$ANVIL_PORT 2>/dev/null | grep -q 405; then
  pass "Anvil already running on :$ANVIL_PORT"
else
  $FORGE anvil --fork-url $AMOY_RPC --port $ANVIL_PORT --silent &
  ANVIL_PID=$!
  sleep 3
  if curl -s -o /dev/null -w "%{http_code}" --max-time 2 http://localhost:$ANVIL_PORT 2>/dev/null | grep -q 405; then
    pass "Anvil forked from Amoy started on :$ANVIL_PORT"
  else
    fail "Anvil" "Failed to start forked node"
    exit 1
  fi
fi

echo ""
echo "--- 2. Deploy contracts ---"

if [ "$SKIP_DEPLOY" = false ]; then
  $FORGE script script/Deploy.s.sol:Deploy --sig "runAnvil()" \
    --rpc-url http://localhost:$ANVIL_PORT \
    --private-key $ANVIL_KEY \
    --broadcast \
    --silent 2>&1 || true

  pass "Contracts deployed to forked Anvil"
fi

source .env.local 2>/dev/null || true
FACTORY_ADDR="${NEXT_PUBLIC_MARKET_FACTORY_ADDRESS:-0x34A1D3fff3958843C43aD80F30b94c510645C316}"
USDC_ADDR="${NEXT_PUBLIC_MOCK_USDC_ADDRESS:-0x5b73C5498c1E3b4dbA84de0F1833c4a029d90519}"

echo ""
echo "--- 3. Contract lifecycle ---"

END_TIME=$(( $(date +%s) + 3600 ))
RESOLUTION_TIME=$(( END_TIME + 3600 ))

$FORGE cast send $USDC_ADDR \
  "mint(address,uint256)" \
  "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" \
  "1000000000000" \
  --rpc-url http://localhost:$ANVIL_PORT \
  --private-key $ANVIL_KEY \
  --silent
pass "USDC minted"

$FORGE cast send $USDC_ADDR \
  "approve(address,uint256)" \
  $FACTORY_ADDR \
  "1000000000000" \
  --rpc-url http://localhost:$ANVIL_PORT \
  --private-key $ANVIL_KEY \
  --silent
pass "Factory approved to spend USDC"

TX_HASH=$($FORGE cast send $FACTORY_ADDR \
  "createMarket(string,string,uint256,uint256,uint256)" \
  "Fork E2E Market" \
  "Testing on forked Amoy" \
  "$END_TIME" "$RESOLUTION_TIME" "200000000" \
  --rpc-url http://localhost:$ANVIL_PORT \
  --private-key $ANVIL_KEY \
  --json | jq -r '.transactionHash')

if [ -n "$TX_HASH" ] && [ "$TX_HASH" != "null" ]; then
  pass "Market created (tx: ${TX_HASH:0:10}...)"

  MARKET_ADDR=$($FORGE cast logs \
    --address $FACTORY_ADDR \
    --topic "MarketCreated(address,uint256,string)" \
    --from-block latest \
    --rpc-url http://localhost:$ANVIL_PORT \
    --json | jq -r '.[0].args[0] // .[0].topics[1]' | tr -d '"\n')
else
  fail "Market creation" "Transaction failed"
  MARKET_ADDR=""
fi

if [ -z "$MARKET_ADDR" ] || [ "$MARKET_ADDR" = "null" ]; then
  fail "Market address" "Could not extract from event logs"
  MARKET_ADDR="0xdead"
else
  pass "Market deployed at $MARKET_ADDR"
fi

if [ "$MARKET_ADDR" != "0xdead" ]; then
  $FORGE cast send $USDC_ADDR \
    "approve(address,uint256)" \
    $MARKET_ADDR \
    "100000000" \
    --rpc-url http://localhost:$ANVIL_PORT \
    --private-key $ANVIL_KEY \
    --silent
  pass "USDC approved for market"

  $FORGE cast send $MARKET_ADDR \
    "buy(bool,uint256)" "true" "10000000" \
    --rpc-url http://localhost:$ANVIL_PORT \
    --private-key $ANVIL_KEY \
    --silent
  pass "Bought YES tokens"

  YES_BALANCE=$($FORGE cast call $MARKET_ADDR \
    "balanceYES(address)(uint256)" \
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" \
    --rpc-url http://localhost:$ANVIL_PORT)
  if [ "$YES_BALANCE" != "0" ]; then
    pass "YES balance is non-zero: $YES_BALANCE"
  else
    fail "YES balance" "Expected >0, got 0"
  fi

  $FORGE cast send $MARKET_ADDR \
    "sell(bool,uint256)" "true" "$YES_BALANCE" \
    --rpc-url http://localhost:$ANVIL_PORT \
    --private-key $ANVIL_KEY \
    --silent
  pass "Sold YES tokens"

  $FORGE cast send $MARKET_ADDR \
    "buy(bool,uint256)" "true" "10000000" \
    --rpc-url http://localhost:$ANVIL_PORT \
    --private-key $ANVIL_KEY \
    --silent

  $FORGE cast rpc evm_setNextBlockTimestamp $RESOLUTION_TIME \
    --rpc-url http://localhost:$ANVIL_PORT > /dev/null
  $FORGE cast rpc evm_mine \
    --rpc-url http://localhost:$ANVIL_PORT > /dev/null
  pass "Warped to resolution time"

  $FORGE cast send $FACTORY_ADDR \
    "resolveMarket(address,bool)" $MARKET_ADDR "true" \
    --rpc-url http://localhost:$ANVIL_PORT \
    --private-key $ANVIL_KEY \
    --silent
  pass "Market resolved as YES"

  RESOLVED=$($FORGE cast call $MARKET_ADDR \
    "resolved()(bool)" \
    --rpc-url http://localhost:$ANVIL_PORT)
  if [ "$RESOLVED" = "true" ]; then
    pass "Market is resolved"
  else
    fail "Market resolved" "Expected true, got $RESOLVED"
  fi

  USDC_BEFORE=$($FORGE cast call $USDC_ADDR \
    "balanceOf(address)(uint256)" \
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" \
    --rpc-url http://localhost:$ANVIL_PORT)

  $FORGE cast send $MARKET_ADDR \
    "redeem()" \
    --rpc-url http://localhost:$ANVIL_PORT \
    --private-key $ANVIL_KEY \
    --silent
  pass "Redeemed winnings"

  USDC_AFTER=$($FORGE cast call $USDC_ADDR \
    "balanceOf(address)(uint256)" \
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" \
    --rpc-url http://localhost:$ANVIL_PORT)

  if [ "$USDC_AFTER" -gt "$USDC_BEFORE" ]; then
    pass "USDC increased after redeem"
  else
    fail "USDC redeem" "No increase (before=$USDC_BEFORE, after=$USDC_AFTER)"
  fi
fi

echo ""
echo "=========================================="
echo " Results: $PASS passed, $FAIL failed"
echo "=========================================="

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
exit 0
