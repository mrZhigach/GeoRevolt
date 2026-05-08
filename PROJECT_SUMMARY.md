# GeoRevolt — Итоговый отчёт проекта

**Статус:** MVP завершён (4 спринта)  
**Дата:** 2025-05-09  
**Репозиторий:** https://github.com/anomalyco/GeoRevolt

---

## 1. Архитектура и стек

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (Next.js 14)             │
│  MapLibre GL JS (карта) ← wagmi/viem (Web3)         │
│  MarketSidebar (покупка/продажа) ← AdminPanel       │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP REST (GeoJSON)
┌──────────────────────▼──────────────────────────────┐
│                Backend (Next.js API routes)           │
│  /api/markets (CRUD) → SQLite / PostgreSQL            │
│  /api/markets/[id]/resolve → PATCH                    │
│  /api/health → мониторинг                             │
└──────────────────────┬──────────────────────────────┘
                       │ cast / forge
┌──────────────────────▼──────────────────────────────┐
│            Smart Contracts (Solidity 0.8.20)         │
│  Market.sol (AMM — x*y=k, 0.3% fee)                 │
│  MarketFactory.sol (деплой + resolve markets)        │
│  MockUSDC (ERC20, 6 decimals)                        │
└─────────────────────────────────────────────────────┘
```

| Компонент | Технология |
|-----------|-----------|
| Фронтенд | Next.js 14 (App Router), MapLibre GL JS, wagmi/viem |
| Смарт-контракты | Solidity 0.8.20, Foundry (forge), OpenZeppelin |
| Бэкенд | Next.js API routes, better-sqlite3 / PostgreSQL 16 |
| Инфраструктура | Docker (multi-stage), docker-compose, GitHub Actions |
| Мониторинг | `/api/health`, Docker healthcheck, json-file logging |

---

## 2. Результаты спринтов

### Спринт 1 — MVP (9 задач, 61 тест)

**Создана основа продукта:**
- Рынки предсказаний: AMM-пул (USDC/YES/NO), 0.3% комиссия, Uniswap V2-подобный
- Фабрика для деплоя рынков с минимальной ликвидностью 200 USDC
- REST API (CRUD + resolve) с SQLite
- Карта MapLibre GL JS с кластеризацией маркеров
- Web3-интеграция (buy/sell/redeem в боковой панели)
- Админ-панель разрешения рынков (`/admin`)
- E2E-скрипт полного цикла (`scripts/e2e-test.sh`)
- **49 forge tests + 12 API tests — 61 PASS, 0 FAIL**

### Спринт 2 — Инфраструктура

**Оптимизация газа и инфраструктура:**

| Операция | До | После | Δ |
|----------|----|-------|---|
| `buy` | 102 451 gas | 95 260 gas | **−7.0%** |
| `sell` | 48 950 gas | 46 487 gas | **−5.0%** |
| `getAmountOut` | 2 286 gas | 1 142 gas | **−50.0%** |
| Deployment | 2 119 182 gas | 1 997 114 gas | **−5.8%** |

**Docker:** multi-stage (node:20-alpine), output: standalone  
**CI/CD:** 5 GitHub Actions jobs (contracts, API, Docker, docs, E2E fork)  
**PostgreSQL:** dual-backend в `lib/db.ts` (SQLite + PostgreSQL через `DATABASE_URL`)

### Спринт 3 — Документация и демо

- README переписан для конечного пользователя (6 шагов)
- `demo/SCENARIO.md` — сценарий демонстрации + screencast script (13 сцен)
- `scripts/e2e-fork.sh` — E2E на forked Polygon Amoy
- CI: джоба `e2e-fork` (ручной запуск / по тегу)

### Спринт 4 — Безопасность, нагрузка, деплой, мониторинг

#### Безопасность (`SECURITY_AUDIT.md`)

Slither + ручной анализ Market.sol и MarketFactory.sol:

| Уровень | Найдено | Ключевое |
|---------|---------|----------|
| Critical | 0 | — |
| High | 0 | — |
| Medium | 1 | Unchecked transfer (6 мест) — SafeERC20 запланирован на S5 |
| Low | 4 | divide-before-multiply (false positive), reentrancy в addLiquidity, missing event, zero-check feeTo |
| Info | 4 | timestamp dependency, solc warnings, централизация |

#### Нагрузочное тестирование (`LOAD_TEST_REPORT.md`)

| Метрика | Значение |
|---------|----------|
| createMarket (avg gas) | 2 172 137 |
| buy (avg gas) | 95 260 |
| resolve (gas) | 41 585 |
| redeem (gas) | 37 941 |
| createMarket (avg latency) | ~45 ms (Anvil) |
| buy (avg latency) | ~12 ms (Anvil) |

**Вывод:** ~13 markets/block на Amoy (30M gas), buy — сотни в блоке.

#### Production-деплой
- `docker-compose.prod.yml` — PostgreSQL 16 + app с healthcheck, restart, logging
- Deploy job в CI (SSH на VPS при пуше в main)
- README с секциями "Мониторинг" и "Production"

#### Мониторинг
- `GET /api/health` → `{ status, timestamp, uptime }`
- Docker healthcheck (curl каждые 30s)
- json-file logging с ротацией (10 MB × 3 файла)

---

## 3. Инструкция по локальному запуску

### Быстрый старт (без Docker)

```bash
# 1. Запустить Anvil
anvil &

# 2. Установить зависимости
npm install

# 3. Конфигурация
cp .env.example .env.local

# 4. Деплой контрактов
forge script script/Deploy.s.sol:Deploy --sig "runAnvil()" \
  --rpc-url http://localhost:8545 --broadcast

# 5. Запустить dev-сервер
npm run dev
```

### Docker (production)

```bash
docker compose -f docker-compose.prod.yml up -d
```

### Docker (разработка с hot-reload)

```bash
docker compose -f docker-compose.yml -f docker-compose.override.yml up --build
```

### Docker (с Anvil)

```bash
COMPOSE_PROFILES=dev docker compose up --build
```

### Тестирование

```bash
# Смарт-контракты (49 тестов)
forge test -vvv

# API (12 тестов)
npm run test:api

# E2E (требует Anvil + сервер)
bash scripts/e2e-test.sh

# Нагрузочный тест
bash scripts/load-test.sh
```

### Демо-сценарий

Полный сценарий с пошаговыми инструкциями: [demo/SCENARIO.md](demo/SCENARIO.md)

---

## 4. Демо-видео

Скринкаст не записан. Сценарий съёмки подготовлен в `demo/SCENARIO.md` (13 сцен с таймингом и текстом).

Для записи:
1. Запустить Anvil + контракты + Next.js
2. Записать экран согласно сценарию (13 сцен, ~2 мин)
3. Опубликовать на YouTube, добавить ссылку в `demo/SCENARIO.md`

---

## 5. Сводка тестов

| Категория | Всего | PASS | FAIL |
|-----------|-------|------|------|
| Market.sol (unit) | 26 | 26 | 0 |
| MarketFactory.sol (unit) | 23 | 23 | 0 |
| API (интеграционные) | 12 | 12 | 0 |
| E2E (Anvil) | 10+ | 10+ | 0 |
| **Итого** | **71+** | **71+** | **0** |

---

## 6. Адреса контрактов (Anvil)

| Контракт | Адрес |
|----------|-------|
| MarketFactory | `0x34A1D3fff3958843C43aD80F30b94c510645C316` |
| MockUSDC | `0x5b73C5498c1E3b4dbA84de0F1833c4a029d90519` |
| Anvil key | `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` |

---

## 7. Бэклог и планы

### Блокировано
- **Деплой на Polygon Amoy** (#11) — нет MATIC на faucet

### Sprint 5 (план)
| Задача | Описание |
|--------|----------|
| SafeERC20 | Митигация M1 (unchecked transfer) |
| Event для addInitialLiquidity | Митигация L3 |
| Zero-check для feeTo | Митигация L4 |
| UI warning | Централизация риска (I4) |
| Batch createMarket | Амортизация газа деплоя |
| forge coverage | Настройка в CI |

### Технический долг
- `forge coverage` не настроен в CI
- PMTiles для РФ (ждёт Planetiler на 48 GB RAM)
- Индексация `lat`/`lng` в SQLite
- Нет commit-reveal для front-running защиты

---

## 8. Ключевые файлы

| Файл | Назначение |
|------|-----------|
| `src/Market.sol` | AMM-пул (x*y=k, 0.3% fee) |
| `src/MarketFactory.sol` | Фабрика рынков + resolve |
| `app/api/health/route.ts` | Healthcheck endpoint |
| `components/Map.tsx` | Карта MapLibre GL JS |
| `lib/db.ts` | SQLite / PostgreSQL слой |
| `docker-compose.yml` | Dev compose (PostgreSQL + Anvil) |
| `docker-compose.prod.yml` | Production compose (healthcheck, restart) |
| `.github/workflows/test.yml` | CI/CD (6 jobs) |
| `scripts/e2e-test.sh` | E2E на Anvil |
| `scripts/e2e-fork.sh` | E2E на forked Amoy |
| `scripts/load-test.sh` | Нагрузочное тестирование |
| `scripts/validate-docs.sh` | Валидация документации |
| `SECURITY_AUDIT.md` | Аудит безопасности |
| `LOAD_TEST_REPORT.md` | Отчёт нагрузочного тестирования |
| `demo/SCENARIO.md` | Демо-сценарий + screencast script |
| `PLAN.md` | План-график спринтов |
| `CHANGELOG.md` | Журнал изменений |
| `TEST_REPORT.md` | Сводка тестирования |
| `ARTIFACT_LOG.md` | Реестр артефактов |

---

*Документ создан @technical-writer. Дата: 2025-05-09.*
