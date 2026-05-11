# Реестр артефактов GeoRevolt

**Назначение:** фиксация версий, контрольных сумм и расположения всех генерируемых артефактов.

## Смарт-контракты (Polygon Amoy testnet)

| Контракт | Версия | Bytecode hash (SHA256) | Адрес | Дата деплоя |
|----------|--------|------------------------|-------|-------------|
| MarketFactory | 1.0.0 | `4bbf6dd39d91e9ad7f23c092ab59339cf018cbeadbc19736fc4dbbcd02e696ee` | `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0` (Anvil) | 2025-05-09 |
| Market (шаблон) | 1.0.0 | `d9234edbeccb7393a856b88eca0ead22ff1511144751769d42d93dec8e5d9d80` | (деплоится через MarketFactory.createMarket) | – |
| MockUSDC | 1.0.0 | `96c04081ec6caa92c418fb28f8d11bb6b44c0c57eb5a6da3b64e49232e430f5b` | `0x5FbDB2315678afecb367f032d93F642f64180aa3` (Anvil) | 2025-05-09 |

*После деплоя хеш вычислять командой: `forge inspect --pretty <ContractName> bytecode | sha256sum`*

## Картографические данные (PMTiles)

| Файл | MD5 | Размер | Источник OSM | Дата генерации |
|------|-----|--------|--------------|----------------|
| `public/data/russia-detail.pmtiles` | не сгенерирован | – | planet.osm 2025-05-01 | – |

**Команда генерации:** `java -Xmx48g -jar planetiler.jar --download --area=russia --output=public/data/russia-detail.pmtiles --maxzoom=15`

## Online карта (Sprint 5)

| Артефакт | Версия | Дата | MD5 | Описание |
|----------|--------|------|-----|----------|
| `public/data/style.json` | 1.0 | 2025-05-09 | `219c14d3d5b023abfd519495db7affda` | OpenFreeMap векторный стиль: здания, дороги, вода, подписи |
| `public/data/style-demo.json` | 1.0 | 2025-05-09 | `ecd0aaed600ac908caf0db455f249d83` | OSM raster стиль (tile.openstreetmap.org) — текущий используемый |
| `scripts/generate-pmtiles.sh` | 1.0 | 2025-05-09 | `cc51aa3b0cdb40f14eda233ce02e1308` | Скрипт генерации PMTiles (Planetiler, 48GB RAM) |

## Docker-образы

| Образ | Тег | SHA256 | Размер | Регистр |
|-------|-----|--------|--------|---------|
| georevolt/api | – | – | – | – |
| georevolt/frontend | – | – | – | – |

## Docker-композиция

| Файл | Версия | Дата | MD5 |
|------|--------|------|-----|
| `Dockerfile` | 1.0 | 2025-05-09 | multi-stage (standalone) |
| `Dockerfile.dev` | 1.0 | 2025-05-09 | hot-reload dev |
| `docker-compose.yml` | 1.0 | 2025-05-09 | `05ff6ea5c78904f985d7460a99b3160a` |
| `docker-compose.prod.yml` | 1.0 | 2025-05-09 | `7909b9f19341c726c367c7a456853023` |

## Бэкенд (миграции SQLite / Prisma)

| Миграция | Версия | Применена (дата) | Хеш файла |
|----------|--------|------------------|-----------|
| `001_init.sql` | 1.0.0 | 2025-05-08 | Встроена в lib/db.ts (initSqliteSchema/initPgSchema) |
| `002_price_history.sql` | 1.0 | 2025-05-09 | Встроена в lib/db.ts (initSqliteSchema/initPgSchema) |
| `scripts/migrations/003_sprint5.sql` | 1.0 | 2025-05-09 | PostgreSQL миграция: price_history, allowed_countries, geocode_cache, simulated колонка |
| `address` колонка | 1.1.0 | 2026-05-09 | ALTER TABLE markets ADD COLUMN address TEXT (SQLite + PG) |
| `radius` колонка | 1.2.0 | 2026-05-09 | ALTER TABLE markets ADD COLUMN radius REAL DEFAULT 100 (SQLite + PG) |
| `idx_markets_lat_lng` индекс | 1.0 | 2026-05-09 | CREATE INDEX idx_markets_lat_lng ON markets(lat, lng) (SQLite + PG) |
| `scripts/migrations/004_sprint6.sql` | 1.0 | 2026-05-09 | PostgreSQL миграция: radius, address, idx_markets_lat_lng |
| `scripts/bridge-matic.sh` | 1.0 | 2026-05-09 | Скрипт бриджа Sepolia→Amoy + список кранов |

## Документация

| Артефакт | Версия | Дата | Ссылка |
|----------|--------|------|--------|
| README.md | 2.1 | 2026-05-09 | End-user + developer docs (админка, батч, страны, env vars) |
| demo/SCENARIO.md | 1.0 | 2025-05-09 | Пошаговый сценарий + screencast script |
| demo/index.md | 1.0 | 2025-05-09 | Индекс демо-материалов |
| Скринкаст YouTube | — | TBD | Ссылка будет добавлена после записи |
| SOCIAL_POST.md | 1.0 | 2025-05-09 | Посты для соцсетей (EN/RU) |

## Безопасность
| Артефакт | Версия | Дата | MD5 / Ссылка |
|----------|--------|------|---------------|
| SECURITY_AUDIT.md | 1.0 | 2025-05-09 | Slither + manual audit of Market.sol, MarketFactory.sol |

## Нагрузочное тестирование
| Артефакт | Версия | Дата | MD5 / Ссылка |
|----------|--------|------|---------------|
| scripts/load-test.sh | 1.0 | 2025-05-09 | `5991df7507fc5fced7e7a495ac21d5af` — N markets, M bets, gas + time |
| LOAD_TEST_REPORT.md | 1.0 | 2025-05-09 | 5 markets, 15 bets, ~2.17M gas per create |

## Мониторинг
| Артефакт | Описание | Дата |
|----------|----------|------|
| `app/api/health/route.ts` | GET /api/health → status, timestamp, uptime | 2025-05-09 |

## Презентация и деплой
| Артефакт | Версия | Дата | Описание |
|----------|--------|------|----------|
| `vercel.json` | 1.0 | 2025-05-09 | `34817143ae3d5a221661e75d4777b260` — Конфигурация Vercel (Next.js, env) |
| Release v1.0.0 | 1.0.0 | 2025-05-09 | https://github.com/mrZhigach/GeoRevolt/releases/tag/v1.0.0 |
| Release v1.1.0 | 1.1.0 | 2026-05-09 | https://github.com/mrZhigach/GeoRevolt/releases/tag/v1.1.0 |

## API — Базовые
| Эндпоинт | Описание | Дата |
|----------|----------|------|
| `GET /api/health` | Healthcheck: status, timestamp, uptime | 2025-05-09 |
| `GET /api/markets` | GeoJSON FeatureCollection всех рынков | 2025-05-08 |
| `POST /api/markets` | Создание рынка (с геокодингом address) | 2025-05-08 |
| `GET /api/markets/[id]` | Рынок по id (GeoJSON) | 2025-05-08 |
| `PATCH /api/markets/[id]/resolve` | Разрешение рынка (outcome true/false) | 2025-05-09 |
| `GET /api/events` | Последние 20 событий (live feed) | 2025-05-09 |

## API — История цен (Sprint 5.2)
| Эндпоинт | Описание | Дата |
|----------|----------|------|
| `GET /api/price-history/[address]` | История цен для рынка (200 записей) | 2025-05-09 |
| `POST /api/price-snapshot` | Сохранение снимка цены (price_yes, price_no) | 2025-05-09 |
| `GET /api/markets/by-address/[address]` | Рынок по адресу контракта | 2025-05-09 |

## API — Админка (Sprint 5.3)
| Эндпоинт | Описание | Дата |
|----------|----------|------|
| `GET /api/admin/stats` | Аналитика: метрики, топ рынков, liquidity по категориям | 2025-05-09 |
| `GET /api/admin/markets` | Список рынков с фильтрацией и пагинацией | 2025-05-09 |
| `POST /api/admin/batch-upload` | Пакетная загрузка CSV/GeoJSON | 2025-05-09 |
| `GET/POST /api/admin/allowed-countries` | Управление разрешёнными странами | 2025-05-09 |

## Фронтенд — Основная карта и UI
| Компонент | Описание | Дата |
|-----------|----------|------|
| `app/page.tsx` | Главная страница (динамический импорт карты) | 2025-05-09 |
| `app/layout.tsx` | Корневой layout (Web3Provider, UI) | 2025-05-09 |
| `app/globals.css` | Глобальные стили | 2025-05-09 |
| `components/Map.tsx` | Карта MapLibre GL JS (OSM raster): маркеры, кластеризация, dblclick → создание, клик → сайдбар | 2025-05-09 |
| `components/MarketSidebar.tsx` | Боковая панель: информация, Buy/Sell/Redeem, график цены (recharts), адрес | 2025-05-09 |
| `components/CreateMarketModal.tsx` | Форма создания рынка: Nominatim геокодинг, approve USDC, деплой, POST в БД | 2025-05-09 |
| `components/EventFeed.tsx` | Лента событий (auto-refresh 15с) | 2025-05-09 |
| `components/PriceChart.tsx` | Динамический recharts LineChart (140px, SSR disabled) | 2026-05-09 |

## Фронтенд — Страница рынка (Sprint 5.2)
| Компонент | Описание | Дата |
|-----------|----------|------|
| `app/market/[address]/page.tsx` | Страница рынка: recharts график, Buy/Sell, авто-снимки каждые 60с | 2025-05-09 |

## Фронтенд — Админка (Sprint 5.3)
| Компонент | Описание | Дата |
|-----------|----------|------|
| `app/admin/page.tsx` | Таб-контейнер админки (4 вкладки) с mounted guard | 2025-05-09 |
| `components/AdminDashboard.tsx` | Дашборд: метрики, PieChart, BarChart, Refresh | 2025-05-09 |
| `components/AdminMarketsList.tsx` | Таблица рынков: фильтры, пагинация, кнопки Resolve | 2025-05-09 |
| `components/AdminBatchUpload.tsx` | Drag & Drop загрузка CSV/GeoJSON с отчётом | 2025-05-09 |
| `components/AdminAllowedCountries.tsx` | Управление разрешёнными странами | 2025-05-09 |

## UI-компоненты (shadcn/ui — Sprint 7)
| Компонент | Описание | Дата |
|-----------|----------|------|
| `components/MapControls.tsx` | Плавающая карточка управления: геокодер, фильтр категорий, wallet, My Bets sheet, stats block | 2026-05-11 |
| `components/MarketPopup.tsx` | Карточка события над маркером: цены YES/NO, быстрая покупка, Details → | 2026-05-11 |
| `components/AppHeader.tsx` | Глобальный Sticky Header (навигация, wallet) для страниц /admin, /market/[address] | 2026-05-11 |
| `components/ui/card.tsx` | shadcn/ui Card (base-ui) | 2026-05-11 |
| `components/ui/button.tsx` | shadcn/ui Button | 2026-05-11 |
| `components/ui/input.tsx` | shadcn/ui Input | 2026-05-11 |
| `components/ui/select.tsx` | shadcn/ui Select (base-ui) | 2026-05-11 |
| `components/ui/popover.tsx` | shadcn/ui Popover (base-ui) | 2026-05-11 |
| `components/ui/command.tsx` | shadcn/ui Command (base-ui) | 2026-05-11 |
| `components/ui/sheet.tsx` | shadcn/ui Sheet (base-ui) | 2026-05-11 |
| `components/ui/dialog.tsx` | shadcn/ui Dialog (base-ui) | 2026-05-11 |
| `components/ui/textarea.tsx` | shadcn/ui Textarea | 2026-05-11 |
| `components/ui/input-group.tsx` | shadcn/ui InputGroup | 2026-05-11 |
| `lib/utils.ts` | shadcn/ui utility (cn function) | 2026-05-11 |
| `components.json` | shadcn/ui конфигурация (base-nova style, slate dark) | 2026-05-11 |

## Web3 / Интеграция
| Компонент | Описание | Дата |
|-----------|----------|------|
| `lib/web3.ts` | wagmi config (ssr: true), viem clients, ABI экспорт | 2025-05-09 |
| `lib/abi/MarketFactory.json` | ABI MarketFactory для фронтенда | 2025-05-09 |

## Миграции БД
| Миграция | Версия | Применена | Описание |
|----------|--------|-----------|----------|
| `001_init` | 1.0.0 | 2025-05-08 | Базовая схема: markets таблица |
| `002_price_history` | 1.0 | 2025-05-09 | price_history таблица + индексы |
| `simulated` колонка | 1.0 | 2025-05-09 | Добавлена в markets (SQLite + PG) |
| `allowed_countries` таблица | 1.0 | 2025-05-09 | Хранит ISO-3166-1 alpha-2 коды |
| `geocode_cache` таблица | 1.0 | 2025-05-09 | Кэш reverse geocoding (lat, lng → country) |
| `address` колонка | 1.1.0 | 2026-05-09 | ALTER TABLE markets ADD COLUMN address TEXT |

## E2E тестирование (Sprint 5.4)
| Артефакт | Версия | Дата | MD5 | Описание |
|----------|--------|------|-----|----------|
| `playwright.config.ts` | 1.0 | 2025-05-09 | — | Конфигурация Playwright (headless, port 3000) |
| `e2e/admin.spec.ts` | 1.0 | 2025-05-09 | — | Playwright-тесты: health, stats, markets, events, allowed-countries |
| `scripts/e2e-sprint-5.sh` | 1.0 | 2025-05-09 | `0c27cb8371b02be672d79fa0f127fb88` | 14 проверок: инфраструктура, API, батч, цены, фронтенд |
| `scripts/e2e-test.sh` | 1.0 | 2025-05-09 | — | Anvil lifecycle: deploy → buy → sell → resolve → redeem |
| `scripts/e2e-fork.sh` | 1.0 | 2025-05-09 | — | E2E на forked Amoy |

## CI/CD (GitHub Actions)
| Артефакт | Описание | Дата |
|----------|----------|------|
| `.github/workflows/test.yml` | 4 jobs: Foundry, API, Docker, docs + manual e2e-fork + deploy | 2025-05-09 |

## Прочее
- **Конфигурация OpenCode:** `.opencode/` – версия от 2025-05-11.
- **Скрипты:** `scripts/validate-docs.sh` (дата создания 2025-05-11), `scripts/e2e-fork.sh` (2025-05-09), `scripts/load-test.sh` (2025-05-09), `scripts/migrations/003_sprint5.sql` (2025-05-09).

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

> **Текущие адреса на локальном Anvil (localhost:8545):**
> - MarketFactory: `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0`
> - MockUSDC: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
> - Пользовательский кошелёк: `0x61629a45BE23C02160EFa64aD1F82ccA4567D0eD` (10,000 USDC)
> - Anvil дефолтный ключ: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`

---

## Sprint 8 — Dashboard redesign (2026-05-11)

| Артефакт | Версия | Дата | Описание |
|----------|--------|------|----------|
| `components/AppHeader.tsx` | 2.0 | 2026-05-11 | Глобальная навигация: гамбургер, поиск, тема, язык, профиль |
| `components/ViewToggle.tsx` | 1.0 | 2026-05-11 | Переключение карта/список через URL |
| `components/MarketsList.tsx` | 1.0 | 2026-05-11 | Грид карточек рынков с фильтрацией и пагинацией |
| `components/CommentsSection.tsx` | 1.0 | 2026-05-11 | Система комментариев с деревом ответов |
| `app/api/markets/by-address/[address]/comments/route.ts` | 1.0 | 2026-05-11 | API комментариев (GET/POST) |
| `app/api/comments/[id]/route.ts` | 1.0 | 2026-05-11 | API удаления комментария (DELETE) |
| `components/AdminDashboard.tsx` | 2.0 | 2026-05-11 | Улучшенный дашборд с 3 графиками |
| `components/AdminBatchUpload.tsx` | 2.0 | 2026-05-11 | Прогресс-бар, улучшенный отчёт |
| `components/AdminAllowedCountries.tsx` | 2.0 | 2026-05-11 | Страны с badges и common codes |
| `e2e/sprint8.spec.ts` | 1.0 | 2026-05-11 | 15 E2E-тестов Sprint 8 |
| `lib/db.ts` (comments table + getFilteredMarkets) | 2.0 | 2026-05-11 | Новая таблица `comments`, функция фильтрации рынков |

### База данных — новые таблицы

| Таблица | Назначение | Индексы |
|---------|-----------|---------|
| `comments` | Комментарии к рынкам (threaded) | `idx_comments_market`, `idx_comments_parent` |

### Новые shadcn/ui компоненты (v4, base-nova)

dropdown-menu, tabs, avatar, progress, separator, badge, switch, scroll-area

---

**Дата последней проверки:** 2026-05-11  
**Правила:** любой новый артефакт (контракт, PMTiles, образ) добавляется в эту таблицу сразу после создания. Ответственный – @archivist.
