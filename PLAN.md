# План-график GeoRevolt – Спринт 4 (Масштабирование и безопасность)

**Длительность:** 2025-06-08 – 2025-06-21  
**Цель:** Аудит безопасности, нагрузочное тестирование, production-деплой, мониторинг.
**Story Points (всего):** 26

| ID | Задача | SP | Статус | Агент | Дедлайн | Комментарий |
|----|--------|----|--------|-------|---------|--------------|
| 17 | **Аудит безопасности смарт-контрактов** | 8 | [x] | @security-auditor | 2025-06-14 | SECURITY_AUDIT.md создан. Slither + ручной анализ. Mythril недоступен |
| 18 | **Нагрузочное тестирование** | 5 | [x] | @performance-engineer, @qa-automation-engineer | 2025-06-14 | scripts/load-test.sh + LOAD_TEST_REPORT.md |
| 19 | **Production-деплой** | 8 | [x] | @devops | 2025-06-21 | docker-compose.prod.yml + CI/CD deploy job + README |
| 20 | **Мониторинг и алертинг** | 5 | [x] | @devops | 2025-06-21 | /api/health + healthcheck в compose + секция README |

---

## Спринт 3 (Пользовательский опыт и демо) — завершён ✅

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
