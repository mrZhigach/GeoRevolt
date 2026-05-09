# План-график GeoRevolt – Спринт 5 (Карта, маркеры, события, цены)

**Длительность:** 2025-05-09 – 2025-05-23  
**Цель:** Улучшение карты (PMTiles/OSM, размер маркеров), API liquidity, лента событий, история цен, страница рынка.
**Story Points (всего):** 26

| ID | Задача | SP | Статус | Агент | Дедлайн | Комментарий |
|----|--------|----|--------|-------|---------|--------------|
| 21 | **PMTiles / OSM тайлы для карты** | 5 | [x] | @cartography-engineer | 2025-05-12 | scripts/generate-pmtiles.sh + style.json с OpenFreeMap |
| 22 | **Liquidity в API + маркеры** | 5 | [x] | @backend-dev, @frontend-dev | 2025-05-14 | Колонка liquidity, обновление toGeoJSON, interpolate-маркеры |
| 23 | **Лента событий (events)** | 5 | [x] | @backend-dev, @frontend-dev | 2025-05-16 | GET /api/events + EventFeed компонент |
| 24 | **Логирование событий** | 3 | [x] | @backend-dev | 2025-05-18 | createEvent при создании рынка |
| 25 | **Market creation UI + API** | 3 | [x] | @frontend-dev | 2025-05-18 | CreateMarketModal → POST /api/markets → EventFeed |

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
- **#11 Деплой на Polygon Amoy** — блокер: MATIC на faucet. Вернуться при появлении тестовых токенов.
- PMTiles для РФ (ждём Planetiler на 48 GB RAM).
- Индексация полей `lat`/`lng` в SQLite.
