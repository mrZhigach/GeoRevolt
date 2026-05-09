# Реестр артефактов GeoRevolt

**Назначение:** фиксация версий, контрольных сумм и расположения всех генерируемых артефактов.

## Смарт-контракты (Polygon Amoy testnet)

| Контракт | Версия | Bytecode hash (SHA256) | Адрес | Дата деплоя |
|----------|--------|------------------------|-------|-------------|
| MarketFactory | 0.1.0 | `f2ca1b7a...` | `0x34A1D3fff3958843C43aD80F30b94c510645C316` (Anvil) | 2025-05-08 |
| Market (шаблон) | 0.1.0 | `ad11ba64...` | (деплоится через MarketFactory.createMarket) | – |
| MockUSDC | 0.1.0 | `96c04081...` | `0x5b73C5498c1E3b4dbA84de0F1833c4a029d90519` (Anvil) | 2025-05-08 |

*После деплоя хеш вычислять командой: `forge inspect --pretty <ContractName> bytecode | sha256sum`*

## Картографические данные (PMTiles)

| Файл | MD5 | Размер | Источник OSM | Дата генерации |
|------|-----|--------|--------------|----------------|
| `public/data/russia-detail.pmtiles` | не сгенерирован | – | planet.osm 2025-05-01 | – |

**Команда генерации:** `java -Xmx48g -jar planetiler.jar --download --area=russia --output=public/data/russia-detail.pmtiles --maxzoom=15`

## Online карта (Sprint 5)

| Артефакт | Версия | Дата | Описание |
|----------|--------|------|----------|
| `public/data/style.json` | 1.0 | 2025-05-09 | OpenFreeMap стиль: здания, дороги, вода, подписи |
| `scripts/generate-pmtiles.sh` | 1.0 | 2025-05-09 | Скрипт генерации PMTiles (Planetiler, 48GB RAM) |

## Docker-образы

| Образ | Тег | SHA256 | Размер | Регистр |
|-------|-----|--------|--------|---------|
| georevolt/api | – | – | – | – |
| georevolt/frontend | – | – | – | – |

## Бэкенд (миграции SQLite / Prisma)

| Миграция | Версия | Применена (дата) | Хеш файла |
|----------|--------|------------------|-----------|
| `001_init.sql` | 1.0.0 | – | – |
| `002_price_history.sql` | 1.0 | 2025-05-09 | Встроена в lib/db.ts (initSqliteSchema/initPgSchema) |

## Документация

| Артефакт | Версия | Дата | Ссылка |
|----------|--------|------|--------|
| README.md | 2.0 | 2025-05-09 | End-user + developer docs |
| demo/SCENARIO.md | 1.0 | 2025-05-09 | Пошаговый сценарий + screencast script |
| demo/index.md | 1.0 | 2025-05-09 | Индекс демо-материалов |
| Скринкаст YouTube | — | TBD | Ссылка будет добавлена после записи |

## Безопасность
| Артефакт | Версия | Дата | Ссылка |
|----------|--------|------|--------|
| SECURITY_AUDIT.md | 1.0 | 2025-05-09 | Slither + manual audit of Market.sol, MarketFactory.sol |

## Нагрузочное тестирование
| Артефакт | Версия | Дата | Ссылка |
|----------|--------|------|--------|
| scripts/load-test.sh | 1.0 | 2025-05-09 | N markets, M bets, gas + time measurement |
| LOAD_TEST_REPORT.md | 1.0 | 2025-05-09 | 5 markets, 15 bets, ~2.17M gas per create |

## Мониторинг
| Артефакт | Описание | Дата |
|----------|----------|------|
| `app/api/health/route.ts` | GET /api/health → status, timestamp, uptime | 2025-05-09 |
| `docker-compose.prod.yml` | Production stack: PostgreSQL 16 + app with healthcheck | 2025-05-09 |

## Презентация и деплой
| Артефакт | Версия | Дата | Описание |
|----------|--------|------|----------|
| `vercel.json` | 1.0 | 2025-05-09 | Конфигурация Vercel (Next.js, env) |
| `SOCIAL_POST.md` | 1.0 | 2025-05-09 | Посты для соцсетей (EN/RU) |
| Release v1.0.0 | 1.0.0 | 2025-05-09 | https://github.com/mrZhigach/GeoRevolt/releases/tag/v1.0.0 |

## API (Sprint 5.2)
| Эндпоинт | Описание | Дата |
|----------|----------|------|
| `GET /api/price-history/[address]` | История цен для рынка (200 записей) | 2025-05-09 |
| `POST /api/price-snapshot` | Сохранение снимка цены (price_yes, price_no) | 2025-05-09 |
| `GET /api/markets/by-address/[address]` | Рынок по адресу контракта | 2025-05-09 |

## API (Sprint 5.3 — Админка)
| Эндпоинт | Описание | Дата |
|----------|----------|------|
| `GET /api/admin/stats` | Аналитика: метрики, топ рынков, liquidity по категориям | 2025-05-09 |
| `GET /api/admin/markets` | Список рынков с фильтрацией и пагинацией | 2025-05-09 |
| `POST /api/admin/batch-upload` | Пакетная загрузка CSV/GeoJSON | 2025-05-09 |
| `GET/POST /api/admin/allowed-countries` | Управление разрешёнными странами | 2025-05-09 |

## Фронтенд (Sprint 5.2)
| Компонент | Описание | Дата |
|-----------|----------|------|
| `app/market/[address]/page.tsx` | Страница рынка: recharts график, Buy/Sell, авто-снимки | 2025-05-09 |

## Фронтенд (Sprint 5.3 — Админка)
| Компонент | Описание | Дата |
|-----------|----------|------|
| `components/AdminDashboard.tsx` | Дашборд: метрики, PieChart, BarChart, Refresh | 2025-05-09 |
| `components/AdminMarketsList.tsx` | Таблица рынков: фильтры, пагинация, кнопки Resolve | 2025-05-09 |
| `components/AdminBatchUpload.tsx` | Drag & Drop загрузка CSV/GeoJSON с отчётом | 2025-05-09 |
| `components/AdminAllowedCountries.tsx` | Управление разрешёнными странами | 2025-05-09 |
| `app/admin/page.tsx` | Таб-контейнер админки (4 вкладки) | 2025-05-09 |

## Миграции БД (Sprint 5.3)
| Миграция | Версия | Применена | Описание |
|----------|--------|-----------|----------|
| `simulated` колонка | 1.0 | 2025-05-09 | Добавлена в markets (SQLite + PG) |
| `allowed_countries` таблица | 1.0 | 2025-05-09 | Хранит ISO-3166-1 alpha-2 коды |
| `geocode_cache` таблица | 1.0 | 2025-05-09 | Кэш reverse geocoding (lat, lng → country) |

## Прочее
- **Конфигурация OpenCode:** `.opencode/` – версия от 2025-05-11.
- **Скрипты:** `scripts/validate-docs.sh` (дата создания 2025-05-11), `scripts/e2e-fork.sh` (2025-05-09), `scripts/load-test.sh` (2025-05-09).

---

## Инструкция по деплою (Polygon Amoy)

1. **Настройка:**
   ```bash
   cp .env.example .env.local
   # Заполнить PRIVATE_KEY (с тестовыми MATIC от faucet)
   ```

2. **Деплой MarketFactory:**
   ```bash
   forge script script/Deploy.s.sol:Deploy \
     --rpc-url https://rpc-amoy.polygon.technology/ \
     --private-key $PRIVATE_KEY \
     --broadcast \
     --verify
   ```

3. **Локальный деплой (Anvil):**
   ```bash
   anvil &
   forge script script/Deploy.s.sol:Deploy --sig "runAnvil()" \
     --rpc-url http://localhost:8545 \
     --broadcast
   ```

4. **Обновить ARTIFACT_LOG.md** с полученным адресом фабрики после деплоя.

---

**Правила:** любой новый артефакт (контракт, PMTiles, образ) добавляется в эту таблицу сразу после создания. Ответственный – @archivist.
