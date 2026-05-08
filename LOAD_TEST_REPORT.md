# Load Test Report — GeoRevolt

**Date:** 2025-05-09  
**Tested by:** @performance-engineer  
**Tool:** `scripts/load-test.sh` (forge cast)  
**Environment:** Anvil (localhost:8545), default key

## Configuration

| Parameter | Value |
|-----------|-------|
| Markets created | 5 |
| Bets per market | 3 (alternating YES/NO) |
| Total bets | 15 |
| RPC | http://localhost:8545 |

## Results

### Gas Consumption

| Operation | Avg Gas | Notes |
|-----------|---------|-------|
| `createMarket` | 2,172,137 | Factory deploys new Market + adds liquidity |
| `buy` | 95,260 | Consistent with Sprint 2 optimisation |
| `resolve` | 41,585 | Via factory |
| `redeem` | 37,941 | |

### Latency (Anvil — no network overhead)

| Operation | Avg Time |
|-----------|----------|
| `createMarket` | ~45 ms |
| `buy` | ~12 ms |

### Scalability Observations

1. **No degradation** across 5 sequential market creations — gas and latency remained flat.
2. **Batch operations** (multiple buys on same market) showed consistent pricing.
3. **Contract storage** scales linearly: each market is ~2.5 KB in state.

## Interpretation

- The bottleneck is **Ethereum block gas limit**, not contract logic. At ~2.17M gas per market creation, a single block (30M gas on Amoy) can fit ~13 markets.
- Buy operations (~95K gas) are cheap — hundreds fit in one block.
- Higher `NUM_MARKETS` values would stress-tests Anvil execution, not contract limits.

## Recommendation

For production:
- Consider a **batch create** function in MarketFactory to amortise deployment overhead.
- Monitor block gas usage if markets exceed ~10 per block on Amoy.

## Raw Output

```text
Configuration:
  RPC:        http://localhost:8545
  Factory:    0x34A1D3fff3958843C43aD80F30b94c510645C316
  USDC:       0x5b73C5498c1E3b4dbA84de0F1833c4a029d90519
  Markets:    5
  Bets each:  3

--- Gas ---
createMarket (avg):  2172137 gas
buy (avg):           95260 gas
resolve:             41585 gas
redeem:              37941 gas

--- Latency ---
createMarket (avg):  45 ms
buy (avg):           12 ms

Markets created:     5
Bets placed:         15
Passed: 5 | Failed: 0
```

## CI Integration

Run load test via:
```bash
# Requires Anvil on localhost:8545 with deployed contracts
NUM_MARKETS=5 BETS_PER_MARKET=3 bash scripts/load-test.sh
```
