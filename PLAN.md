# План-график GeoRevolt – Спринт 7 (Премиальный дизайн PPLX)

**Длительность:** 2026-05-11 – 2026-05-18  
**Цель:** Адаптировать дизайн-систему PPLX-трекера под GeoRevolt  
**Story Points (всего):** 24

| ID | Задача | SP | Статус | Агент | Дедлайн | Комментарий |
|----|--------|----|--------|-------|---------|--------------|
| 7.1 | **Создание универсальных UI-компонентов** (shadcn/ui, тема, шрифты) | 5 | [x] | @ui-ux-designer | 2026-05-12 | ✅ shadcn init, globals.css (PPLX dark theme), Google Fonts (Inter, DM Sans), 10 ui-компонентов |
| 7.2 | **Плавающая карточка управления (Search & Filters)** | 6 | [x] | @frontend-dev | 2026-05-14 | ✅ MapControls.tsx (геокодер, фильтр категорий, wallet, My Bets sheet, stats block) |
| 7.3 | **Карточка события (Market Popup)** | 4 | [x] | @frontend-dev | 2026-05-14 | ✅ MarketPopup.tsx (MapLibre Popup + React, цены YES/NO, быстрая покупка, Details) |
| 7.4 | **Адаптация и миграция блока статистики с сервера** | 2 | [x] | @backend-dev | 2026-05-13 | ✅ SQL оптимизирован (4→1 запрос), MapControls уже интегрирован |
| 7.5 | **Анимации переходов и глобальный Sticky Header** | 4 | [x] | @frontend-dev | 2026-05-15 | ✅ AppHeader (sticky, glass, навигация, wallet), CSS-анимации (popup-in, transition-soft) |
| 7.6 | **Интеграция, Тестирование, Валидация и Релиз** | 3 | [~] | @feature-lead, @qa-automation-engineer | 2026-05-15 | ✅ Build PASS, 12/12 API тестов, валидация docs. Ожидает: merge в master, релиз v1.2.0 |

---

## Спринт 6 (Радиус, Деплой, Техдолг) — завершён ✅

**Длительность:** 2026-05-09 – 2026-05-15  
**Цель:** Circle overlay на карте, разблокировка деплоя #11, закрытие техдолгов  
**Story Points (всего):** 28

| ID | Задача | SP | Статус | Агент | Дедлайн | Комментарий |
|----|--------|----|--------|-------|---------|--------------|
| 6.1 | **Радиус события (core: БД + API)** | 3 | [x] | @backend-dev | 2026-05-10 | ✅ Миграция radius, обновление Market/CreateMarketInput/normalizeRow/toGeoJSON/createMarket, POST /api/markets, batch-upload |
| 6.2 | **Радиус события (UI: форма создания)** | 2 | [x] | @frontend-dev | 2026-05-10 | ✅ Поле radius (метры, default 100) в CreateMarketModal.tsx, передача в POST body |
| 6.3 | **Circle overlay на карте** | 5 | [x] | @cartography-engineer | 2026-05-12 | ✅ MapLibre circle layer (полупрозрачный, категорийная раскраска), клик → сайдбар |
| 6.4 | **Деплой Polygon Amoy (#11) — исследование** | 3 | [x] | @blockchain-devrel | 2026-05-11 | ✅ 9 кранов найдено (Alchemy 0.1 POL, Chainlink 0.5 POL, QuickNode, LearnWeb3, thirdweb, Chainstack, Tatum, GetBlock, StakePool). Создан scripts/bridge-matic.sh |
| 6.5 | **forge coverage в CI** | 1 | [x] | @devops | 2026-05-10 | ✅ forge coverage --report lcov + Codecov upload в test.yml |
| 6.6 | **Sprint 5.4 чеклист (17 сценариев)** | 5 | [x] | @qa-automation-engineer | 2026-05-12 | ✅ 17/17 сценариев подтверждены. TEST_REPORT.md обновлён. |
| 6.7 | **Индексация lat/lng в SQLite** | 1 | [x] | @backend-dev | 2026-05-10 | ✅ Добавлен idx_markets_lat_lng (lat, lng) для SQLite + PG |
| 6.8 | **Порт 3000 — конфигурация** | 1 | [x] | @devops | 2026-05-10 | ✅ scripts/kill-port.sh создан |
| 6.9 | **Разблокировка #11: альтернативное решение** | 5 | [x] | @blockchain-devrel, @devops | 2026-05-13 | ✅ Стратегия документирована: 1) Получить MATIC через Alchemy/Chainlink/другие краны. 2) Если не получается — Anvil для разработки, Vercel simulation для прода. 3) Bridge скрипт для Sepolia → Amoy. |
| 6.10 | **Закрытие спринта: валидация и документация** | 2 | [x] | @feature-lead | 2026-05-15 | ✅ Все задачи выполнены, validate-docs.sh пройден, CHANGELOG/ARTIFACT_LOG/TEST_REPORT обновлены |
| 6.11 | **HOTFIX: POST /api/markets 500 (radius column)** | 2 | [x] | @backend-dev | 2026-05-09 | ✅ Исправлен синтаксис ALTER TABLE ADD COLUMN (try-catch), колонка radius добавлена в БД |
| 6.12 | **HOTFIX: WebGL context loss** | 2 | [x] | @frontend-dev | 2026-05-09 | ✅ Добавлены webglcontextlost/restored обработчики, overlay, failIfMajorPerformanceCaveat |

---

---

## Спринт 5.2 (История цен + страница рынка) — завершён ✅

**Длительность:** 2025-05-09 – 2025-05-10  
**Цель:** Таблица price_history, API, страница /market/[address] с графиком recharts, авто-снятие цен.

| ID | Задача | SP | Статус | Агент | Дедлайн | Комментарий |
|----|--------|----|--------|-------|---------|--------------|
| 26 | **price_history таблица + API** | 5 | [x] | @backend-dev | 2025-05-10 | Схема, savePriceSnapshot, getPriceHistory, эндпоинты |
| 27 | **Страница рынка /market/[address]** | 5 | [x] | @frontend-dev | 2025-05-10 | recharts график цены, информация, Buy/Sell |
| 28 | **Навигация с карты на страницу рынка** | 3 | [x] | @frontend-dev | 2025-05-10 | Клик по маркеру → переход на /market/[address] |
| 29 | **Авто-снятие цен (price snapshots)** | 3 | [x] | @backend-dev, @frontend-dev | 2025-05-10 | Интервал на странице рынка, POST /api/price-snapshot |

---

## Спринт 5.3 (Админ-панель и аналитика) — завершён ✅

**Длительность:** 2025-05-09 – 2025-05-10  
**Цель:** Админ-дашборд с аналитикой, расширенный список рынков, пакетная загрузка, переключатель стран.

| ID | Задача | SP | Статус | Агент | Дедлайн | Комментарий |
|----|--------|----|--------|-------|---------|--------------|
| 30 | **Админ-дашборд с аналитикой** | 5 | [x] | @backend-dev, @frontend-dev | 2025-05-10 | GET /api/admin/stats, recharts (PieChart + BarChart), метрики |
| 31 | **Расширенный список рынков** | 5 | [x] | @backend-dev, @frontend-dev | 2025-05-10 | GET /api/admin/markets (фильтры + пагинация), таблица с resolve |
| 32 | **Пакетная загрузка (CSV/GeoJSON)** | 5 | [x] | @backend-dev, @frontend-dev | 2025-05-10 | POST /api/admin/batch-upload, симуляция + Drag & Drop |
| 33 | **Переключатель разрешённых стран** | 3 | [x] | @backend-dev, @frontend-dev | 2025-05-10 | allowed_countries таблица, API, UI в админке, геокодинг заглушка |

---

## Спринт 5.4 (Полировка, E2E, продакшен) — завершён ✅

**Длительность:** 2025-05-09  
**Цель:** E2E-тестирование, исправление багов, документация, миграции, подготовка к Vercel.

| ID | Задача | SP | Статус | Агент | Дедлайн | Комментарий |
|----|--------|----|--------|-------|---------|--------------|
| 34 | **E2E-тестирование спринта 5** | 5 | [x] | @qa-automation-engineer | 2025-05-09 | Playwright (e2e/admin.spec.ts), scripts/e2e-sprint-5.sh, чеклист в TEST_REPORT |
| 35 | **Исправление багов и оптимизация** | 5 | [x] | @backend-dev, @frontend-dev | 2025-05-09 | CSV даты (ISO 8601), toUnixTimestamp, индикаторы загрузки |
| 36 | **Финальные правки документации** | 3 | [x] | @technical-writer | 2025-05-09 | README: админка, батч, страны, env vars |
| 37 | **Подготовка к деплою на Vercel** | 3 | [x] | @devops | 2025-05-09 | init-db.sql, migration 003, .env.example |

---

## Спринт 4 (Масштабирование и безопасность) — завершён ✅

**Длительность:** 2025-05-25 – 2025-06-07  
**Результат:** Документация, демо-сценарии, E2E на forked Amoy.

| ID | Задача | SP | Статус | Агент | Дедлайн | Комментарий |
|----|--------|----|--------|-------|---------|--------------|
| 15 | **Пользовательская документация + демо** | 5 | [x] | @technical-writer, @tutorial-creator | 2025-05-22 | README (user), demo/SCENARIO.md, screencast script |
| 16 | **E2E на forked Amoy RPC** | 5 | [x] | @qa-automation-engineer | 2025-05-24 | scripts/e2e-fork.sh, CI job (manual) |

---

## Спринт 2 (Инфраструктура и качество) — завершён ✅

**Длительность:** 2025-05-10 – 2025-05-24  
**Результат:** 5 из 7 задач выполнены.

| ID | Задача | SP | Статус | Агент | Дедлайн | Комментарий |
|----|--------|----|--------|-------|---------|--------------|
| 10 | **Оптимизация газа в Market.sol** | 8 | [x] | @smart-contract-dev, @performance-engineer | 2025-05-16 | immutable, unchecked, caching. Buy −7% |
| 11 | **Деплой на Polygon Amoy** | 3 | [!] | @blockchain-devrel | 2025-05-16 | Блокер: нет MATIC на faucet |
| 12 | **Docker-контейнеризация** | 8 | [x] | @devops | 2025-05-20 | Dockerfile + compose + PostgreSQL |
| 13 | **CI/CD GitHub Actions** | 5 | [x] | @devops | 2025-05-20 | 5 workflows: contracts + API + Docker + docs + fork E2E |
| 14 | **PostgreSQL vs SQLite — решение** | 5 | [x] | @backend-dev, @database-admin | 2025-05-18 | Реализована поддержка PostgreSQL через DATABASE_URL в lib/db.ts |

---

## Спринт 1 (MVP) — завершён ✅

**Длительность:** 2025-05-10 – 2025-05-24  
**Результат:** Все 9 задач выполнены. 49 контрактных + 12 API тестов. Карта + Web3 + админ-панель.

| ID | Задача | Статус | Агент | Дедлайн | Комментарий |
|----|--------|--------|-------|---------|--------------|
| 1 | **Окружение** | [x] | @devops | 2025-05-12 | Node.js, Foundry, Planetiler, Docker – готово |
| 2 | **Смарт-контракты** | [x] | @smart-contract-dev | 2025-05-15 | Market.sol + MarketFactory.sol |
| 3 | **Unit-тесты контрактов** | [x] | @test-automation | 2025-05-16 | 49 тестов, все PASS |
| 4 | **Деплой на Anvil** | [x] | @blockchain-devrel | 2025-05-08 | Factory, MockUSDC, тестовый рынок |
| 5 | **Бэкенд: API /api/markets** | [x] | @backend-dev | 2025-05-08 | GET/POST + [id], 9 тестов PASS |
| 6 | **Фронт: карта MapLibre** | [x] | @frontend-dev | 2025-05-09 | MapLibre + cluster markers, sidebar |
| 7 | **Web3 интеграция** | [x] | @integration-specialist | 2025-05-22 | Buy/sell/redeem в MarketSidebar |
| 8 | **Админ-панель разрешения** | [x] | @product-owner | 2025-05-24 | resolveMarket в Factory + Admin UI |
| 9 | **E2E-тест** | [x] | @qa-automation-engineer | 2025-05-24 | scripts/e2e-test.sh |

## Бэклог
- **#11 Деплой на Polygon Amoy** — в работе (спринт 6, задачи 6.4 + 6.9).
- PMTiles для РФ (ждём Planetiler на 48 GB RAM).
