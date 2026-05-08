# Журнал изменений GeoRevolt

Все значимые изменения в проекте фиксируются здесь в хронологическом порядке (от новых к старым).

## [2025-05-09] – Презентация проекта (badges, topics, release, Vercel, social)

### Added
- **README.md** — бейджи лицензии AGPL-3.0 и CI (shields.io)
- **README.md** — раздел "Деплой на Vercel" с пошаговой инструкцией
- **vercel.json** — конфигурация деплоя на Vercel (Next.js, env vars)
- **SOCIAL_POST.md** — посты для соцсетей (английский + русский)
- **Topics** — 10 тегов на GitHub (prediction-markets, polymarket, defi, map, nextjs, solidity, foundry, opencode, blockchain, polygon)
- **Release v1.0.0** — создан тег и GitHub-релиз с описанием MVP

---

## [2025-05-09] – License fix + initial GitHub push

### Fixed
- **README.md** — упоминание "MIT" заменено на "GNU Affero General Public License v3.0 (AGPL-3.0)"
- **LICENSE** — подтверждён полный текст AGPL-3.0 (661 строка), GitHub распознаёт как `agpl-3.0`
- **Git push** — проект выгружен на github.com/mrZhigach/GeoRevolt

---

## [2025-05-09] – Спринт 4 – Security + Load test + Deploy + Monitoring

### Added
- **SECURITY_AUDIT.md** — аудит Market.sol и MarketFactory.sol: Slither (1 medium, 4 low, 4 info) + ручной анализ. Mythril не запущен.
- **scripts/load-test.sh** — скрипт нагрузочного тестирования: N рынков, M ставок, замер газа и времени.
- **LOAD_TEST_REPORT.md** — отчёт: createMarket ~2.17M gas, buy ~95K gas, ~45ms latency на Anvil.
- **app/api/health/route.ts** — GET `/api/health` возвращает `{ status, timestamp, uptime }`.
- **docker-compose.prod.yml** — production-стек: PostgreSQL 16 + app с healthcheck, restart unless-stopped, json-file logging.
- **.github/workflows/test.yml** — добавлена джоба `deploy` (SSH deploy на VPS при пуше в main).
- **README.md** — разделы "Мониторинг" (healthcheck, логи) и "Production" (docker-compose.prod.yml, переменные окружения).

### Changed
- **PLAN.md** — задачи #17–20 → [x].
- **TEST_REPORT.md** — добавлена секция 7 "Нагрузочное тестирование".
- **ARTIFACT_LOG.md** — добавлены SECURITY_AUDIT.md, LOAD_TEST_REPORT.md, health endpoint.

---

## [2025-05-09] – Спринт 4 – Планирование

### Added
- **PLAN.md** — спринт 4 (Масштабирование и безопасность): 4 задачи, 26 SP. Задача #14 → [x].
- **ROADMAP.md** — обновлены даты и метрики спринтов.

### Changed
- **PLAN.md** — задача #11 перенесена в бэклог (MATIC по-прежнему нет).
- **PLAN.md** — задача #14 → [x] (PostgreSQL поддержка реализована в спринте 2).

---

## [2025-05-09] – Спринт 3 – Документация + E2E Fork

### Added
- **README.md** — переписан для конечного пользователя: разделы «Для пользователя» (создание рынка, ставка, разрешение, клейм) и «Для разработчика».
- **demo/SCENARIO.md** — пошаговый сценарий демонстрации (6 шагов) + screencast script (13 сцен с таймингом и текстом).
- **demo/index.md** — индекс демо-материалов с инструкцией по записи скринкаста.
- **scripts/e2e-fork.sh** — E2E на forked Amoy: запуск anvil с --fork-url, деплой, полный lifecycle (create → buy → sell → resolve → redeem).
- **.github/workflows/test.yml** — добавлена джоба `e2e-fork` (ручной запуск или по тегу).

### Changed
- **PLAN.md** — спринт 3 создан, задачи #15 и #16 → [x]. #11 и #14 в бэклог.
- **TEST_REPORT.md** — добавлена секция 5 "E2E на forked Amoy".
- **ARTIFACT_LOG.md** — добавлена таблица документации (README, demo, скринкаст).

---

## [2025-05-09] – Спринт 2 – Docker + CI/CD

### Added
- **Dockerfile** — multi-stage build (deps → builder → runner, node:20-alpine) с output: standalone
- **Dockerfile.dev** — лёгкий образ для разработки с hot-reload
- **docker-compose.yml** — 3 сервиса: app (Next.js), db (PostgreSQL 16), anvil (опционально)
- **docker-compose.override.yml** — dev override (монтирование исходников, WATCHPACK_POLLING)
- **scripts/init-db.sql** — инициализация схемы PostgreSQL
- **lib/db.ts** — поддержка PostgreSQL через `DATABASE_URL` (наравне с SQLite)
- **.github/workflows/test.yml** — 4 джобы: Foundry tests, API tests, Docker build, docs validation
- **README.md** — полное описание проекта, инструкции по Docker и разработке
- **.env.example** — добавлены переменные для Docker, PostgreSQL, фронтенда

### Changed
- **next.config.js** — добавлен `output: 'standalone'` для Docker
- **app/api/markets/** — адаптированы под асинхронный db.ts
- **PLAN.md** — задачи #12 и #13 → [x]

---

## [2025-05-09] – Спринт 2 – Оптимизация газа Market.sol

### Changed
- **src/Market.sol** — газовые оптимизации:
  - `usdc`, `endTime`, `resolutionTime`, `feeTo` → `immutable` (экономия ~2100 gas за SLOAD)
  - Кэширование резервов в `buy`/`sell`/`redeem` (меньше SLOAD)
  - `unchecked` блоки для безопасной арифметики (вычитание комиссии, балансов)
  - `FEE_DENOMINATOR = 10000` — константа вместо magic number
  - `addInitialLiquidity`: `=` вместо `+=` (баланс гарантированно 0)
- **TEST_REPORT.md** — добавлена секция "Gas optimization Sprint 2" с таблицами до/после
- **PLAN.md** — задача #10 → [x]

### Results
- `buy` avg: 102,451 → 95,260 (−7.0%)
- `sell` avg: 48,950 → 46,487 (−5.0%)
- `getAmountOut` avg: 2,286 → 1,142 (−50.0%)
- Deployment: 2,119,182 → 1,997,114 (−5.8%)
- Все 49 тестов PASS

---

## [2025-05-09] – Спринт 2 – Планирование

### Added
- **ROADMAP.md** — стратегический план Q2 2025: 3 вехи, бизнес-метрики, критерии готовности.
- **PLAN.md** — спринт 2 (Инфраструктура и качество): 7 задач, 39 SP, распределение по агентам.

### Changed
- **PLAN.md** — спринт 1 перенесён в архивную секцию, все задачи [x].

---

## [2025-05-09] – Спринт 1 – E2E тест + завершение задач

### Added
- **scripts/e2e-test.sh** — E2E скрипт полного цикла: Anvil → контракты (buy/sell/resolve/redeem) → API (CRUD + resolve) → фронтенд.

### Changed
- **PLAN.md** — задача #8 (админ-панель) → [x].
- **TEST_REPORT.md** — добавлена секция E2E.

---

## [2025-05-09] – Спринт 1 – Админ-панель + resolve в фабрике

### Added
- **MarketFactory.sol** — добавлена функция `resolveMarket(address, bool) external onlyOwner` для разрешения рынка от имени фабрики.
- **test/MarketFactory.t.sol** — 2 новых теста: `test_ResolveMarketViaFactory`, `test_RevertResolveMarketByNonOwner`.
- **lib/abi/MarketFactory.json** — ABI фабрики для фронтенда.
- **PATCH /api/markets/[id]/resolve** — эндпоинт для обновления статуса разрешения рынка в SQLite.
- **components/AdminPanel.tsx** — админ-панель: список рынков с кнопками Resolve YES/NO, подключение кошелька (factory owner).
- **app/admin/page.tsx** — маршрут `/admin` для панели управления.

### Changed
- **next.config.js** — добавлен `resolve.fallback` для `@react-native-async-storage/async-storage` и `pino-pretty` (опциональные зависимости).
- **tsconfig.json** — target изменён с ES2017 на ES2020 (поддержка BigInt-литералов).
- **scripts/validate-docs.sh** — исправлена строка 30 (удалён мусорный текст).
- **lib/web3.ts** — экспортирован `MarketFactoryABI`.
- **PLAN.md** — задачи #3 (unit-тесты контрактов) и #7 (Web3 интеграция) переведены в [x].

### Fixed
- **scripts/validate-docs.sh** — удалён невалидный текст else-ветки, вызывавший игнорирование проверки CHANGELOG.

---

## [2025-05-09] – Спринт 1 – Фронтенд: карта MapLibre

### Added
- **components/Map.tsx** — карта MapLibre GL JS с кластеризацией маркеров, загрузка данных из GET /api/markets, клик по маркеру → боковая панель.
- **components/MarketSidebar** — встроенная боковая панель (тёмная тема): название, статус, описание, категория, адрес контракта.
- **app/page.tsx** — главная страница с динамическим импортом карты (SSR disabled).
- **app/layout.tsx, app/globals.css** — корневой layout и стили.

### Changed
- **TEST_REPORT.md** — обновлена секция ручного тестирования карты (5 сценариев PASS).
- **PLAN.md** — задача #6 переведена в [x].

---

## [2025-05-08] – Спринт 1 – Бэкенд API + SQLite

### Added
- **lib/db.ts** — слой SQLite (better-sqlite3): схема таблицы `markets` с индексами по координатам и статусу, CRUD-функции, конвертация в GeoJSON.
- **GET /api/markets** — возвращает GeoJSON FeatureCollection всех рынков.
- **POST /api/markets** — создание рынка с валидацией (обязательные поля, диапазон координат, уникальность contract_address).
- **GET /api/markets/[id]** — возврат одного рынка по id (GeoJSON).
- **9 интеграционных тестов** (Jest) для всех эндпоинтов: пустой список, создание, валидация, дубликаты, несуществующий id.
- **package.json, tsconfig, jest.config, next.config** — конфигурация Next.js 14 + TypeScript.

### Changed
- **TEST_REPORT.md** — переписана секция бэкенда (9 тестов, все PASS).
- **PLAN.md** — задача #5 переведена в [x].

---

## [2025-05-08] – Спринт 1 – Деплой на Anvil

### Added
- **Деплой контрактов на Anvil (localhost:8545):**
  - MockUSDC: `0x5b73C5498c1E3b4dbA84de0F1833c4a029d90519`
  - MarketFactory: `0x34A1D3fff3958843C43aD80F30b94c510645C316`
  - Создан первый тестовый рынок с начальной ликвидностью 200 USDC.
- **ARTIFACT_LOG.md** — обновлён таблицей с адресами и хешами байткода.
- **.env.local** — добавлены `MOCK_USDC_ADDRESS`, `MARKET_FACTORY_ADDRESS`, `NEXT_PUBLIC_MARKET_FACTORY_ADDRESS`.
- **PLAN.md** — задача #4 отмечена как выполненная.

---

## [2025-05-08] – Спринт 1 – Скрипт деплоя на Amoy

### Added
- **script/Deploy.s.sol** — Foundry-скрипт деплоя MarketFactory: автоматический выбор USDC (реальный или Mock), создание тестового рынка, режим для Anvil.
- **.env.local / .env.example** — конфигурация деплоя: PRIVATE_KEY, RPC_URL, USDC_ADDRESS (Amoy: `0xd02419296eF08A575E6deA178950e9c9c25126B8`), CREATE_TEST_MARKET.
- **ARTIFACT_LOG.md** — добавлена инструкция по деплою на Polygon Amoy и Anvil с командами forge script.

---

## [2025-05-08] – Спринт 1 – Реализация MarketFactory.sol

### Added
- **MarketFactory.sol** — фабрика для деплоя рынков: createMarket с валидацией (мин. ликвидность 200 USDC, имя, даты), Transfer-Then-Approve-Then-AddLiquidity, массив markets, событие MarketCreated.
- **src/mocks/MockUSDC.sol** — вынесен из Market.t.sol в отдельный контракт для переиспользования в обоих тестах.
- **21 unit-тест** для MarketFactory: создание рынка, проверка ликвидности, параметров, владельца, revert-сценарии по валидации, торговля на созданном рынке.

### Changed
- **Market.t.sol** — импорт MockUSDC из src/mocks вместо inline-определения.
- **TEST_REPORT.md** — добавлены результаты тестирования MarketFactory (21 тест).
- **PLAN.md** — подзадача 2.2 переведена в [x].

---

## [2025-05-08] – Спринт 1 – Реализация Market.sol

### Added
- **Market.sol** — полная реализация AMM-рынка предсказаний: Uniswap V2-подобный пул (USDC/YES/NO), функции buy/sell/resolve/redeem, комиссия 0.3%, защита от реентранси (Checks-Effects-Interaction в redeem), Ownable от OpenZeppelin.
- **MockUSDC** — тестовый ERC20-токен с 6 decimals для тестирования.
- **26 unit-тестов** для Market.sol: состояния, покупка/продажа YES/NO, разрешение и клейм, revert-сценарии по времени и доступу, проверка комиссии.

### Changed
- **TEST_REPORT.md** обновлён актуальными результатами тестирования Market.sol.
- **PLAN.md** подзадача 2.1 переведена в [x].

### Technical Debt
- `forge coverage` не настроен (требуется флаг `--coverage` в CI).

---

## [2025-05-08] – Спринт 1 – Уточнение архитектуры

### Added
- **Детальный дизайн смарт-контрактов** из Project_Summary_Essay.md: Market.sol с AMM-пулом (Uniswap V2-подобный), MarketFactory.sol.
- **Декомпозиция задачи #2**: выделены подзадачи 2.1 Market.sol и 2.2 MarketFactory.sol.

### Changed
- **PLAN.md** актуализирован: задача #2 разбита на подзадачи, статус — [~] (в работе).

---

## [2025-05-11] – Спринт 1, день 1

### Added
- **Инициализация документации**: созданы `AGENTS.md`, `PLAN.md`, `TEST_REPORT.md`, `ARTIFACT_LOG.md`.
- **Агентная система**: развёрнуты 26 агентов в `.opencode/agents/` с ролями от `@smart-contract-dev` до `@cartography-engineer`.
- **Дисциплина документирования**: внедрены стандарты Keep a Changelog, обязательный скрипт валидации.

### Changed
- Нет (начальное состояние).

### Fixed
- Нет.

### Technical Debt
- **Отсутствует CI**: нет автоматического запуска тестов при PR. Запланировано на спринт 2.
- **Нет индексации координат** в SQLite – при большом количестве рынков возможны тормоза.
- **PMTiles для РФ** – не сгенерирован (ждём Planetiler на 48 GB RAM).

### DevOps / Infrastructure
- Dockerfile и docker-compose.yml пока не созданы.

---

*Записи добавляются агентами автоматически после каждого коммита или значимого изменения.*
