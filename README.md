# GeoRevolt

[![Version](https://img.shields.io/badge/version-1.1.0-green.svg)](https://github.com/mrZhigach/GeoRevolt/releases/tag/v1.1.0)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![CI](https://github.com/mrZhigach/GeoRevolt/actions/workflows/test.yml/badge.svg)](https://github.com/mrZhigach/GeoRevolt/actions/workflows/test.yml)

Децентрализованные рынки предсказаний на карте. AMM (Uniswap V2) + MapLibre GL JS + Next.js.

## Для пользователя

### 1. Подключите кошелек
Откройте приложение и нажмите **Connect Wallet** в левом верхнем углу. Поддерживаются MetaMask, WalletConnect и другие EIP-1193 провайдеры.

### 2. Исследуйте карту
Маркеры на карте — это активные рынки предсказаний. Цветные кластеры группируют близкие рынки. Приблизьтесь, чтобы увидеть отдельные маркеры.

### 3. Купите токены
Кликните на маркер → откроется боковая панель. Выберите сторону (YES/NO), введите сумму в USDC и нажмите **Buy**. Подтвердите транзакцию в кошельке.

> **Как это работает:** Каждый рынок — AMM-пул (USDC + YES + NO). Цена токена определяется резервами пула по формуле `x*y=k`. Комиссия 0.3% идёт в казначейский адрес.

### 4. Продайте токены
В боковой панели отображается ваша позиция. Нажмите **Sell**, чтобы продать токены обратно в пул.

### 5. Администрирование (для владельца фабрики)
Перейдите на `/admin`. После наступления времени разрешения нажмите **Resolve YES** или **Resolve NO** во вкладке **Markets**. Транзакция отправляется от вашего кошелька через MarketFactory.

### 6. Пакетная загрузка рынков
Перейдите на `/admin` → вкладка **Batch Upload**. Загрузите CSV или GeoJSON файл:
- **CSV**: колонки `name, description, category, lng, lat, endTime, resolutionTime, liquidity` (endTime/resolutionTime — Unix epoch или ISO 8601)
- **GeoJSON**: FeatureCollection с точками, properties: `name, description, category, endTime, resolutionTime, liquidity`
Максимум 10 записей за раз. Рынки создаются в симуляционном режиме (без on-chain деплоя), если не задан `ADMIN_PRIVATE_KEY`.

### 7. Управление разрешёнными странами
Перейдите на `/admin` → вкладка **Allowed Countries**. Добавьте ISO-3166-1 alpha-2 коды стран, где разрешено создание рынков. При создании рынка (через карту или пакетную загрузку) координаты проверяются через reverse geocoding. Если страна не в списке — создание отклоняется.

### 8. Получите выигрыш
Если рынок разрешён в вашу пользу, в боковой панели появится кнопка **Redeem Winnings**. Нажмите её, чтобы получить USDC из пула.

## Для разработчика

### Стек

- **Frontend:** Next.js 14 (App Router), MapLibre GL JS, wagmi/viem
- **Contracts:** Solidity 0.8.20, Foundry (forge), OpenZeppelin
- **Backend:** Next.js API routes, better-sqlite3 / PostgreSQL 16
- **Map:** MapLibre GL JS with clustering, GeoJSON from API

### Быстрый старт

```bash
# 1. Запустить Anvil
anvil &

# 2. Установить зависимости
npm install

# 3. Скопировать .env
cp .env.example .env.local

# 4. Деплой контрактов на Anvil
forge script script/Deploy.s.sol:Deploy --sig "runAnvil()" --rpc-url http://localhost:8545 --broadcast

# 5. Запустить Next.js
npm run dev
```

### Docker

```bash
# Production (app + postgres)
docker compose up --build

# Разработка (hot-reload)
docker compose -f docker-compose.yml -f docker-compose.override.yml up --build

# С Anvil
COMPOSE_PROFILES=dev docker compose up --build
```

### Тестирование

```bash
# Smart contracts (49 тестов)
forge test -vvv

# API (12 тестов)
npm run test:api

# E2E (требует Anvil + сервер)
npm run test:e2e

# E2E на forked Amoy (требует ключ)
bash scripts/e2e-fork.sh
```

### Демо

Полный сценарий демонстрации: [demo/SCENARIO.md](demo/SCENARIO.md)

## Структура проекта

```
├── app/                  # Next.js 14 App Router
│   ├── api/markets/      # REST API для рынков
│   ├── api/admin/        # Админ API (stats, markets, batch-upload, allowed-countries)
│   ├── api/events/       # Лента событий
│   ├── api/price-history/ # История цен
│   ├── api/price-snapshot/ # Снимки цен
│   ├── admin/            # Админ-панель (Dashboard, Markets, Batch Upload, Countries)
│   └── market/           # Страница детального просмотра рынка
├── components/           # React компоненты
│   ├── Map.tsx           # Карта MapLibre
│   ├── MarketSidebar.tsx # Покупка/продажа
│   ├── AdminDashboard.tsx # Дашборд с recharts
│   ├── AdminMarketsList.tsx # Таблица рынков с фильтрами
│   ├── AdminBatchUpload.tsx # Drag & Drop загрузка
│   ├── AdminAllowedCountries.tsx # Управление странами
│   ├── EventFeed.tsx     # Лента событий
│   ├── CreateMarketModal.tsx # Создание рынка
│   └── Web3Provider.tsx  # wagmi provider
├── src/                  # Solidity контракты
│   ├── Market.sol        # AMM рынок предсказаний
│   ├── MarketFactory.sol # Фабрика рынков
│   └── mocks/
├── lib/                  # Утилиты
│   ├── db.ts             # SQLite / PostgreSQL слой
│   ├── web3.ts           # wagmi конфиг
│   └── abi/              # ABI контрактов
├── test/                 # Forge тесты
├── __tests__/            # Jest тесты API
├── scripts/              # CI/CD и E2E скрипты
├── demo/                 # Документация и сценарии
├── Dockerfile            # Multi-stage production
├── docker-compose.yml    # Production стек
└── docker-compose.override.yml  # Dev overrides
```

## Мониторинг

### Healthcheck

`GET /api/health` — возвращает статус приложения:

```json
{"status": "ok", "timestamp": "2025-05-09T20:00:00Z", "uptime": 3600}
```

### Docker healthcheck

В `docker-compose.prod.yml` контейнер `app` проверяется каждые 30 секунд:

```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
  interval: 30s
  timeout: 10s
  retries: 3
```

### Логирование

- Драйвер: `json-file`
- Ротация: 10 MB на файл, макс. 3 файла
- В production: настройте агрегацию через `journald` или внешний сервис (Datadog, Grafana Loki)

## CI/CD

GitHub Actions (`.github/workflows/test.yml`):
- `forge test` — контракты
- `npm run test:api` — API
- `docker build` — проверка Dockerfile
- `scripts/validate-docs.sh` — документация
- `scripts/e2e-fork.sh` — E2E на forked Amoy (ручной запуск)
- `deploy` — автоматический деплой на production VPS через SSH (при пуше в main)

## Production

### Production-стек (docker-compose.prod.yml)

```bash
# Запуск на VPS
export NEXT_PUBLIC_MARKET_FACTORY_ADDRESS="<address>"
export NEXT_PUBLIC_MOCK_USDC_ADDRESS="<address>"
export DB_PASSWORD="<strong-password>"

docker compose -f docker-compose.prod.yml up -d
```

- **PostgreSQL 16 Alpine** — именованный volume, healthcheck, ротация логов
- **App** — Next.js standalone build, healthcheck, restart unless-stopped
- **Без Anvil** — подключение к реальной сети (Polygon Amoy / mainnet)

### Переменные окружения

| Переменная | Описание | Обязательная |
|------------|----------|--------------|
| `DATABASE_URL` | PostgreSQL connection string | да |
| `NEXT_PUBLIC_MARKET_FACTORY_ADDRESS` | Адрес MarketFactory | да |
| `NEXT_PUBLIC_MOCK_USDC_ADDRESS` | Адрес USDC | да |
| `DB_PASSWORD` | Пароль PostgreSQL | да |
| `NEXT_PUBLIC_ADMIN_WALLET_ADDRESS` | Адрес admin-кошелька (ограничивает доступ к /admin) | нет |
| `ADMIN_PRIVATE_KEY` | Приватный ключ для on-chain деплоя при батч-загрузке (без него — симуляция) | нет |

## Деплой на Vercel

Проект оптимизирован для деплоя на [Vercel](https://vercel.com):

1. Зарегистрируйтесь на vercel.com через GitHub.
2. Нажмите **Add New → Project**, импортируйте `mrZhigach/GeoRevolt`.
3. Vercel автоматически определит Next.js и применит настройки из `vercel.json`.
4. В разделе **Environment Variables** добавьте переменные из `.env.example`:
   - `NEXT_PUBLIC_MARKET_FACTORY_ADDRESS` — адрес MarketFactory
   - `NEXT_PUBLIC_MOCK_USDC_ADDRESS` — адрес USDC
5. Нажмите **Deploy**.
6. После деплоя откройте публичную ссылку и подключите кошелёк к Polygon Amoy.

> **Важно:** Vercel — serverless-платформа. SQLite не поддерживается, используйте PostgreSQL (`DATABASE_URL`).

## Лицензия

GNU Affero General Public License v3.0 (AGPL-3.0)
