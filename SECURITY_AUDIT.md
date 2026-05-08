# Security Audit Report — GeoRevolt Smart Contracts

**Date:** 2025-05-09  
**Auditor:** @security-auditor  
**Scope:** `src/Market.sol`, `src/MarketFactory.sol`  
**Version:** 0.1.0  
**Methodology:** Automated (Slither) + Manual review

## Executive Summary

Two smart contracts were audited: Market.sol (AMM prediction market pool) and MarketFactory.sol (factory for deploying markets). Slither static analysis identified 1 medium-severity finding and several low/informational items. No critical or high-severity issues were found.

**Risk ratings:** Critical (0), High (0), Medium (1), Low (4), Informational (4).

**Overall assessment:** Contracts are safe for MVP deployment on testnet. The medium-severity finding (unchecked transfer) should be addressed before mainnet.

## Methodology

- **Slither** — static analysis via `/tmp/venv-slither/bin/slither`
- **Mythril** — could not be run (installation timed out); manual analysis substituted
- **Manual review** — reentrancy, access control, arithmetic safety, front-running vectors, slot collision

## Findings Summary

| ID | Severity | Title | File | Status |
|----|----------|-------|------|--------|
| M1 | Medium | Unchecked transfer (6 locations) | Market.sol, MarketFactory.sol | Acknowledged |
| L1 | Low | Divide-before-multiply in getAmountOut | Market.sol:157 | False positive |
| L2 | Low | Reentrancy (no-eth) in addInitialLiquidity | Market.sol:54 | Acknowledged |
| L3 | Low | Missing event in addInitialLiquidity | Market.sol:54 | Acknowledged |
| L4 | Low | Missing zero-check for feeTo | MarketFactory.sol:18 | Acknowledged |
| I1 | Info | Reentrancy (benign) — ERC20 reorder | Market.sol:65,96 | Accepted |
| I2 | Info | Timestamp dependency (block.timestamp) | Market.sol:128 | Accepted |
| I3 | Info | Solc version warnings (OZ deps) | — | Accepted |
| I4 | Info | No centralised risk warning in UI | — | Recommendation |

## Detailed Findings

### M1 — Unchecked transfer (Medium)

**Location:** Market.sol:57 (`transferFrom`), :69 (`transferFrom`), :91 (`transfer`), :123 (`transfer`), :154 (`transfer`); MarketFactory.sol:35 (`transferFrom`), :46 (`approve`)

**Description:** ERC20 `transfer`/`transferFrom` return values are not checked. While USDC (and most standard ERC20s) revert on failure, non-reverting or fee-on-transfer tokens could cause accounting discrepancies.

**Recommendation:** Use OpenZeppelin's `SafeERC20` wrapper or check return value (`require(usdc.transferFrom(...), "transfer failed")`).

**Risk:** In current context (known-compliant USDC on Amoy + Anvil), exploitation is unlikely. **Address before mainnet.**

### L1 — Divide-before-multiply (Low)

**Location:** Market.sol:157–166

**Description:** Slither flags integer division pattern. The Uniswap V2 math (`x*y=k`) inherently uses this pattern; all intermediate values are validated (`reserveIn > 0 && reserveOut > 0`, `tokensOut > 0`).

**Verdict:** False positive — standard AMM arithmetic.

### L2 — Reentrancy in addInitialLiquidity (Low)

**Location:** Market.sol:54–63

**Description:** `usdc.transferFrom` (external call) occurs before state writes on line 58. Protected by `onlyOwner` modifier and single-use (`require(reserveUSDC == 0)`).

**Verdict:** Acceptable for MVP. Upgrade to Checks-Effects-Interaction for defense-in-depth.

### L3 — Missing event in addInitialLiquidity (Low)

**Location:** Market.sol:54

**Description:** Reserve changes after `addInitialLiquidity` are not emitted. Off-chain indexers cannot detect pool initialisation via events alone.

**Recommendation:** Add event `InitialLiquidityAdded(uint256 usdcAmount, uint256 yesAmount, uint256 noAmount)`.

### L4 — Zero-check for feeTo (Low)

**Location:** MarketFactory.sol:18

**Description:** `_feeTo` constructor parameter is not validated against `address(0)`. If set to zero, collected fees become unrecoverable.

**Recommendation:** Add `require(_feeTo != address(0), "Invalid feeTo")`.

### I1 — ERC20 transfer reorder in buy/sell (Info)

**Location:** Market.sol:69 (transferFrom before state), :91 (transfer after state)

**Description:** Standard pattern with ReentrancyGuard; no exploit path identified.

### I2 — Timestamp dependency (Info)

**Location:** Market.sol:115 (`block.timestamp` usage)

**Description:** Market resolution uses `block.timestamp >= resolutionTime`. Validators can manipulate timestamps by ~30 seconds — accepted risk in prediction markets with 1h+ timeframes.

### I3 — Solc version warnings (Info)

**Description:** OpenZeppelin dependency files report solc version warnings. No impact on deployed contracts.

### I4 — Missing centralisation risk disclosure (Info)

**Recommendation:** Add UI notice: "MarketFactory owner can resolve markets unilaterally."

## Manual Review Notes

### Reentrancy
- `buy`/`sell`: protected by `ReentrancyGuard`
- `redeem`: state (balance set to 0) before external transfer — follows CEI
- `addInitialLiquidity`: unprotected but onlyOwner + single-use guard

### Access Control
- `resolve()`: `onlyOwner` on Market — factory owner can resolve via `resolveMarket`
- `createMarket`: any caller can create, but must provide ≥200 USDC
- `Ownable` from OpenZeppelin — standard, audited implementation

### Arithmetic Safety
- `unchecked` blocks used only for safe operations (fee subtraction from validated input, balance deduction after comparison)
- `getAmountOut`: Uniswap V2 invariant — overflow protection via denominator
- `FEE = 30` / `FEE_DENOMINATOR = 10000` → safe 0.3% fee

### Front-running
- AMM price impact naturally limits MEV
- `resolveMarket` is owner-only, preventing vote manipulation
- No commit-reveal — accepted for MVP

## Post-Audit Mitigation Status

| Finding | Planned Mitigation | Target |
|---------|--------------------|--------|
| M1 | Adopt SafeERC20 | Sprint 5 |
| L3 | Add initial liquidity event | Sprint 5 |
| L4 | Add address(0) check | Sprint 5 |
| I4 | Add UI warning | Sprint 5 |

## Conclusion

Contracts are suitable for testnet MVP deployment. The unchecked-transfer finding (M1) is the only actionable issue of concern — mitigated in practice by USDC's revert-on-failure behaviour. All other findings are low-severity or accepted design choices. Full remediation is recommended before mainnet launch.

## References

- Slither run: `/tmp/venv-slither/bin/slither src/Market.sol src/MarketFactory.sol`
- Tool version: slither 0.10.4
- Mythril status: Not run (timeout during installation)
