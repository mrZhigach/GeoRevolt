# Vercel Environment Variables — GeoRevolt v1.1.0

Set these in Vercel Dashboard → Project → Settings → Environment Variables.

## Required (базовый функционал)

| Variable | Value | Notes |
|----------|-------|-------|
| `NEXT_PUBLIC_MARKET_FACTORY_ADDRESS` | `0x34A1D3fff3958843C43aD80F30b94c510645C316` | Anvil; для Amoy — адрес деплоя |
| `NEXT_PUBLIC_MOCK_USDC_ADDRESS` | `0x5b73C5498c1E3b4dbA84de0F1833c4a029d90519` | Anvil; для Amoy — адрес USDC |

## Required for API (PostgreSQL)

| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | `postgresql://...` | Connection string из Neon. Без неё API возвращает 503 |

## Optional (админ-функции)

| Variable | Value | Notes |
|----------|-------|-------|
| `NEXT_PUBLIC_ADMIN_WALLET_ADDRESS` | `0x...` | Админ-кошелёк для доступа к /admin. Если не задан — доступ открыт всем |
| `ADMIN_PRIVATE_KEY` | `0x...` | Приватный ключ для on-chain деплоя при батч-загрузке. Без него — симуляция |

## How to set

1. Откройте https://vercel.com/mrzhigach/georevolt/settings/environment-variables
2. Добавьте каждую переменную
3. Для Production, Preview, Development выберите нужные среды
4. Redeploy: Vercel → Deployments → последний деплой → Redeploy
