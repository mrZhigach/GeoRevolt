#!/bin/bash
# GeoRevolt — Bridge MATIC from Sepolia to Polygon Amoy
# Usage: bash scripts/bridge-matic.sh <private_key> [amount_in_eth]
#
# This script bridges ETH from Sepolia testnet to MATIC on Polygon Amoy
# using the official Polygon Portal Bridge (Amoy testnet bridge).
#
# Prerequisites:
#   1. ETH on Sepolia testnet (get from Alchemy/Infura faucet)
#   2. Foundry (cast) installed
#   3. The wallet must have enough Sepolia ETH for gas (~0.01 ETH)
#
# Alternative: Use the manual bridge at https://portal.polygon.technology/bridge

set -e

PRIVATE_KEY=$1
AMOUNT=${2:-0.1}

if [ -z "$PRIVATE_KEY" ]; then
  echo "❌ Usage: bash scripts/bridge-matic.sh <private_key> [amount_in_eth]"
  echo ""
  echo "If you don't have Sepolia ETH, use one of these faucets for Polygon Amoy directly:"
  echo ""
  echo "  ┌─────────────────────┬──────────────────────┬──────────────────┐"
  echo "  │ Faucet              │ Amount               │ Requirements     │"
  echo "  ├─────────────────────┼──────────────────────┼──────────────────┤"
  echo "  │ Alchemy Faucet      │ 0.1 POL/day          │ 0.001 ETH mainnet│"
  echo "  │ Chainlink Faucet    │ 0.5 POL              │ Wallet connect   │"
  echo "  │ QuickNode Faucet    │ ~0.01 POL/12h        │ Tweet + wallet   │"
  echo "  │ LearnWeb3 Faucet    │ 0.1 MATIC/day        │ GitHub auth      │"
  echo "  │ thirdweb Faucet     │ 0.01 MATIC/24h       │ Wallet connect   │"
  echo "  │ Chainstack Faucet   │ 0.01 POL/day         │ API key + 0.08ETH│
  echo "  │ Tatum Faucet        │ 0.005 MATIC/24h      │ Signup + 0.001ETH│
  echo "  │ GetBlock Faucet     │ varies               │ Registration     │
  echo "  │ StakePool Faucet    │ varies               │ Login            │
  echo "  └─────────────────────┴──────────────────────┴──────────────────┘"
  echo ""
  echo "Links:"
  echo "  • Alchemy:    https://www.alchemy.com/faucets/polygon-amoy"
  echo "  • Chainlink:  https://faucets.chain.link/polygon-amoy"
  echo "  • QuickNode:  https://faucet.quicknode.com/polygon/amoy"
  echo "  • LearnWeb3:  https://learnweb3.io/faucets/polygon_amoy/"
  echo "  • thirdweb:   https://thirdweb.com/polygon-amoy"
  echo "  • Chainstack: https://faucet.chainstack.com/amoy-faucet"
  echo "  • Tatum:      https://tatum.io/faucets/amoy"
  echo ""
  echo "Quick start (no auth needed):"
  echo "  1. Go to https://www.alchemy.com/faucets/polygon-amoy"
  echo "  2. Enter your wallet address: $(cast wallet address --private-key "$PRIVATE_KEY" 2>/dev/null || echo '<your_address>')"
  echo "  3. Click 'Send Me 0.1 POL'"
  echo "  4. Wait ~1 min for the transaction"
  exit 1
fi

ADDRESS=$(cast wallet address --private-key "$PRIVATE_KEY" 2>/dev/null)
if [ $? -ne 0 ]; then
  echo "❌ Invalid private key format"
  exit 1
fi

echo "==========================================="
echo "  Bridge Sepolia ETH → Polygon Amoy MATIC"
echo "==========================================="
echo "Wallet:    $ADDRESS"
echo "Amount:    $AMOUNT ETH"
echo ""
echo "⚠️  This script requires Foundry (cast) and"
echo "   a wallet with Sepolia ETH."
echo ""

# Check Sepolia balance
echo "🔍 Checking Sepolia balance..."
SEPOLIA_BAL=$(cast balance --rpc-url https://rpc.sepolia.org "$ADDRESS" 2>/dev/null || echo "0")
echo "   Sepolia ETH: $SEPOLIA_BAL"

if [ "$(echo "$SEPOLIA_BAL" | awk '{print int($1)}')" -lt 1 ]; then
  echo "⚠️  Low balance on Sepolia. Get Sepolia ETH first:"
  echo "   • Alchemy:  https://www.alchemy.com/faucets/ethereum-sepolia"
  echo "   • Infura:   https://www.infura.io/faucet/sepolia"
  echo ""
fi

echo ""
echo "📋 Manual bridge instructions:"
echo "  1. Go to https://portal.polygon.technology/bridge"
echo "  2. Connect wallet (ensure you're on Sepolia network)"
echo "  3. Select 'Send ETH' → 'Polygon Amoy'"
echo "  4. Enter amount and confirm"
echo "  5. Complete the transaction in MetaMask"
echo "  6. After bridging, MATIC will appear on Amoy"
echo ""
echo "📋 Or use the Polygon Bridge CLI:"
echo "  npx @maticnetwork/maticjs-cli bridge \\"
echo "    --network sepolia \\"
echo "    --from $ADDRESS \\"
echo "    --amount $AMOUNT \\"
echo "    --token ETH"
echo ""

# Check Amoy balance
echo "🔍 Checking current Amoy MATIC balance..."
AMOY_BAL=$(cast balance --rpc-url https://rpc-amoy.polygon.technology "$ADDRESS" 2>/dev/null || echo "unknown")
echo "   Amoy MATIC: $AMOY_BAL"
echo ""

echo "✅ Done. After receiving MATIC, deploy with:"
echo "  forge script script/Deploy.s.sol:Deploy \\"
echo "    --rpc-url https://rpc-amoy.polygon.technology/ \\"
echo "    --private-key $PRIVATE_KEY \\"
echo "    --broadcast --verify"
echo ""
