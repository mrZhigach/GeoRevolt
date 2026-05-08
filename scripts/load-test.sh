#!/usr/bin/env bash
# GeoRevolt Load Test Script
# Создаёт N рынков, делает M ставок на каждый, замеряет газ и время.
set -e

echo "=========================================="
echo " GeoRevolt Load Test"
echo "=========================================="

# Configuration
RPC_URL="${RPC_URL:-http://localhost:8545}"
PRIVATE_KEY="${PRIVATE_KEY:-0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80}"
FACTORY_ADDR="${NEXT_PUBLIC_MARKET_FACTORY_ADDRESS:-0x34A1D3fff3958843C43aD80F30b94c510645C316}"
USDC_ADDR="${NEXT_PUBLIC_MOCK_USDC_ADDRESS:-0x5b73C5498c1E3b4dbA84de0F1833c4a029d90519}"
NUM_MARKETS="${NUM_MARKETS:-5}"
BETS_PER_MARKET="${BETS_PER_MARKET:-3}"
FORGE="$HOME/.foundry/bin/forge"

# Accumulators
total_gas_create=0
total_gas_buy=0
total_gas_sell=0
total_gas_resolve=0
total_gas_redeem=0
total_time_create=0
total_time_buy=0
start_time=$(date +%s%N)

pass=0
fail=0

pass_count() { pass=$((pass+1)); echo "  ✅ $1"; }
fail_count() { fail=$((fail+1)); echo "  ❌ $1: $2"; }

echo ""
echo "Configuration:"
echo "  RPC:        $RPC_URL"
echo "  Factory:    $FACTORY_ADDR"
echo "  USDC:       $USDC_ADDR"
echo "  Markets:    $NUM_MARKETS"
echo "  Bets each:  $BETS_PER_MARKET"
echo ""

# ---- 1. Check Anvil ----
echo "--- 1. Checking Anvil ---"
if ! curl -s -o /dev/null -w "%{http_code}" --max-time 2 "$RPC_URL" 2>/dev/null | grep -q 405; then
  fail_count "Anvil" "Not running on $RPC_URL"
  exit 1
fi
pass_count "Anvil is running"

# ---- 2. Mint USDC ----
echo ""
echo "--- 2. Minting USDC ---"
$FORGE cast send "$USDC_ADDR" \
  "mint(address,uint256)" \
  "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" \
  "$(($NUM_MARKETS * 1000000000000))" \
  --rpc-url "$RPC_URL" \
  --private-key "$PRIVATE_KEY" \
  --silent
pass_count "USDC minted"

$FORGE cast send "$USDC_ADDR" \
  "approve(address,uint256)" \
  "$FACTORY_ADDR" \
  "$(($NUM_MARKETS * 1000000000000))" \
  --rpc-url "$RPC_URL" \
  --private-key "$PRIVATE_KEY" \
  --silent
pass_count "USDC approved for factory"

# ---- 3. Create Markets ----
echo ""
echo "--- 3. Creating $NUM_MARKETS markets ---"
declare -a MARKET_ADDRS
NOW=$(date +%s)

for i in $(seq 1 $NUM_MARKETS); do
  END_TIME=$((NOW + 7200 + i))
  RESOLUTION_TIME=$((END_TIME + 3600))

  t_start=$(date +%s%N)
  TX_HASH=$($FORGE cast send "$FACTORY_ADDR" \
    "createMarket(string,string,uint256,uint256,uint256)" \
    "Load Test Market $i" \
    "Will this load test pass? $i" \
    "$END_TIME" \
    "$RESOLUTION_TIME" \
    "200000000" \
    --rpc-url "$RPC_URL" \
    --private-key "$PRIVATE_KEY" \
    --json 2>/dev/null | jq -r '.transactionHash')
  t_end=$(date +%s%N)

  # Extract gas used
  TX_RECEIPT=$($FORGE cast receipt "$TX_HASH" --json 2>/dev/null)
  GAS_USED=$(echo "$TX_RECEIPT" | jq -r '.gasUsed // 0')

  total_gas_create=$((total_gas_create + GAS_USED))
  elapsed=$(( (t_end - t_start) / 1000000 ))
  total_time_create=$((total_time_create + elapsed))

  # Extract market address from event logs
  MARKET_ADDR=$($FORGE cast logs \
    --address "$FACTORY_ADDR" \
    --topic "MarketCreated(address,uint256,string)" \
    --from-block latest \
    --rpc-url "$RPC_URL" \
    --json 2>/dev/null | jq -r '[.[] | select(.args[2] == "Load Test Market '"$i"'")][0].args[0] // .[0].topics[1]' | tr -d '"\n')

  if [ -n "$MARKET_ADDR" ] && [ "$MARKET_ADDR" != "null" ]; then
    MARKET_ADDRS+=("$MARKET_ADDR")
    pass_count "Market $i created at $MARKET_ADDR (gas: $GAS_USED, time: ${elapsed}ms)"
  else
    fail_count "Market $i" "Could not get address from logs"
    MARKET_ADDRS+=("0xdead")
  fi
done

# ---- 4. Make Bets ----
echo ""
echo "--- 4. Making $BETS_PER_MARKET bets per market ---"

for market_addr in "${MARKET_ADDRS[@]}"; do
  [ "$market_addr" = "0xdead" ] && continue

  # Approve USDC for this market
  $FORGE cast send "$USDC_ADDR" \
    "approve(address,uint256)" \
    "$market_addr" \
    "10000000000" \
    --rpc-url "$RPC_URL" \
    --private-key "$PRIVATE_KEY" \
    --silent

  for b in $(seq 1 $BETS_PER_MARKET); do
    IS_YES="true"
    [ $((b % 2)) -eq 0 ] && IS_YES="false"

    t_start=$(date +%s%N)
    TX_HASH=$($FORGE cast send "$market_addr" \
      "buy(bool,uint256)" \
      "$IS_YES" \
      "5000000" \
      --rpc-url "$RPC_URL" \
      --private-key "$PRIVATE_KEY" \
      --json 2>/dev/null | jq -r '.transactionHash')
    t_end=$(date +%s%N)

    TX_RECEIPT=$($FORGE cast receipt "$TX_HASH" --json 2>/dev/null)
    GAS_USED=$(echo "$TX_RECEIPT" | jq -r '.gasUsed // 0')

    total_gas_buy=$((total_gas_buy + GAS_USED))
    elapsed=$(( (t_end - t_start) / 1000000 ))
    total_time_buy=$((total_time_buy + elapsed))
  done
  pass_count "$BETS_PER_MARKET bets on $market_addr"
done

# ---- 5. Resolve & Redeem (first market only) ----
echo ""
echo "--- 5. Resolve & Redeem (first market) ---"

FIRST_MARKET="${MARKET_ADDRS[0]}"
if [ "$FIRST_MARKET" != "0xdead" ]; then
  # Get market resolution time
  RESOLVE_TIME=$($FORGE cast call "$FIRST_MARKET" "resolutionTime()(uint256)" --rpc-url "$RPC_URL")

  # Warp past resolution time
  $FORGE cast rpc evm_setNextBlockTimestamp "$RESOLVE_TIME" --rpc-url "$RPC_URL" > /dev/null
  $FORGE cast rpc evm_mine --rpc-url "$RPC_URL" > /dev/null

  t_start=$(date +%s%N)
  TX_HASH=$($FORGE cast send "$FACTORY_ADDR" \
    "resolveMarket(address,bool)" \
    "$FIRST_MARKET" \
    "true" \
    --rpc-url "$RPC_URL" \
    --private-key "$PRIVATE_KEY" \
    --json 2>/dev/null | jq -r '.transactionHash')
  t_end=$(date +%s%N)

  TX_RECEIPT=$($FORGE cast receipt "$TX_HASH" --json 2>/dev/null)
  GAS_USED=$(echo "$TX_RECEIPT" | jq -r '.gasUsed // 0')
  total_gas_resolve=$GAS_USED
  elapsed=$(( (t_end - t_start) / 1000000 ))
  pass_count "Resolved (gas: $GAS_USED, time: ${elapsed}ms)"

  t_start=$(date +%s%N)
  TX_HASH=$($FORGE cast send "$FIRST_MARKET" \
    "redeem()" \
    --rpc-url "$RPC_URL" \
    --private-key "$PRIVATE_KEY" \
    --json 2>/dev/null | jq -r '.transactionHash')
  t_end=$(date +%s%N)

  TX_RECEIPT=$($FORGE cast receipt "$TX_HASH" --json 2>/dev/null)
  GAS_USED=$(echo "$TX_RECEIPT" | jq -r '.gasUsed // 0')
  total_gas_redeem=$GAS_USED
  elapsed=$(( (t_end - t_start) / 1000000 ))
  pass_count "Redeemed (gas: $GAS_USED, time: ${elapsed}ms)"
fi

# ---- 6. Results ----
end_time=$(date +%s%N)
wall_clock=$(( (end_time - start_time) / 1000000000 ))

echo ""
echo "=========================================="
echo " Load Test Results"
echo "=========================================="
echo ""
echo "Duration: ${wall_clock}s wall clock"
echo ""
echo "--- Gas ---"
echo "createMarket (avg):  $(( total_gas_create / NUM_MARKETS )) gas"
echo "buy (avg):           $(( total_gas_buy / (NUM_MARKETS * BETS_PER_MARKET) )) gas"
echo "resolve:             $total_gas_resolve gas" 
echo "redeem:              $total_gas_redeem gas"
echo ""
echo "--- Latency ---"
echo "createMarket (avg):  $(( total_time_create / NUM_MARKETS )) ms"
echo "buy (avg):           $(( total_time_buy / (NUM_MARKETS * BETS_PER_MARKET) )) ms"
echo ""
echo "Markets created:     $NUM_MARKETS"
echo "Bets placed:         $(( NUM_MARKETS * BETS_PER_MARKET ))"
echo "Passed: $pass | Failed: $fail"

if [ "$fail" -gt 0 ]; then
  exit 1
fi
exit 0
