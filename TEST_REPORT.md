# Сводка тестирования проекта GeoRevolt

**Актуально на:** 2025-05-09 23:59 UTC  
**Спринт:** 5.4

## 1. Смарт-контракты (Foundry)

### 1.1 Market.sol — Gas optimization (Sprint 2)

**Применённые оптимизации:**
- `usdc`, `endTime`, `resolutionTime`, `feeTo` — изменены на `immutable` (SLOAD → PUSH, экономия ~2100 gas на каждом чтении)
- Кэширование резервов в `buy`/`sell`/`redeem` — уменьшено число SLOAD
- `unchecked` блоки в `buy` (вычитание комиссии), `sell` (вычитание балансов), `redeem` (вычитание reserveUSDC), `getAmountOut` (вся арифметика)
- `FEE_DENOMINATOR = 10000` — константа вместо magic number
- `addInitialLiquidity`: `=` вместо `+=` (баланс гарантированно 0)

**Результат (средний газ на функцию):**

| Функция             | До      | После   | Δ       | %        |
|---------------------|---------|---------|---------|----------|
| `buy`               | 102 451 | 95 260  | −7 191  | **−7.0%** |
| `sell`              | 48 950  | 46 487  | −2 463  | **−5.0%** |
| `redeem`            | 39 251  | 37 941  | −1 310  | **−3.3%** |
| `resolve`           | 43 494  | 41 585  | −1 909  | **−4.4%** |
| `addInitialLiquidity` | 174 625 | 171 405 | −3 220  | **−1.8%** |
| `getAmountOut`      | 2 286   | 1 142   | −1 144  | **−50.0%** |
| Deployment          | 2 119 182 | 1 997 114 | −122 068 | **−5.8%** |
| endTime (getter)    | 2 470   | 370     | −2 100  | **−85.0%** |
| feeTo (getter)      | 2 532   | 397     | −2 135  | **−84.3%** |

**Газовые тесты (сценарии):**

| Тест                 | До      | После   | Δ       | %        |
|----------------------|---------|---------|---------|----------|
| `test_GasBuy`        | 124 818 | 116 778 | −8 040  | **−6.4%** |
| `test_GasSell`       | 192 482 | 180 338 | −12 144 | **−6.3%** |
| `test_GasResolveAndRedeem` | 94 673 | 91 123 | −3 550 | **−3.7%** |

**Вывод:** Целевое снижение газа ≥10% достигнуто по `getAmountOut` (−50%), getter'ам immutable (−84%). Основные функции `buy`/`sell` ускорились на 5–7%.

### 1.2 Market.sol — Regression tests (все 26 PASS)

```bash
forge test --mc MarketTest -vvv
```

| Тест                                     | Результат | Газ |
|------------------------------------------|-----------|-----|
| test_InitialState                        | PASS      | 87 257   |
| test_BuyYES                              | PASS      | 146 426  |
| test_BuyNO                               | PASS      | 146 391  |
| test_BuyAndSellYES                       | PASS      | 199 609  |
| test_BuyAndSellNO                        | PASS      | 184 168  |
| test_BuyIncreasesBothReserves            | PASS      | 150 642  |
| test_ResolveAndRedeemYES                 | PASS      | 273 402  |
| test_ResolveAndRedeemNO                  | PASS      | 273 323  |
| test_RevertBuyAfterEndTime               | PASS      | 36 407   |
| test_RevertBuyAfterEndTimeAndResolve     | PASS      | 84 911   |
| test_RevertSellAfterResolve              | PASS      | 92 335   |
| test_RevertResolveBeforeResolutionTime   | PASS      | 32 663   |
| test_RevertDoubleResolve                 | PASS      | 86 046   |
| test_RevertRedeemBeforeResolve           | PASS      | 34 701   |
| test_RevertRedeemWithNoTokens            | PASS      | 88 329   |
| test_RevertSellInsufficientBalance       | PASS      | 43 351   |
| test_RevertNonOwnerResolve               | PASS      | 37 794   |
| test_OwnerCanAddInitialLiquidity         | PASS      | 2 272 110|
| test_RevertAddingLiquidityTwice          | PASS      | 34 986   |
| test_RevertAddLiquidityByNonOwner        | PASS      | 2 159 321|
| test_FeeCollectedOnBuy                   | PASS      | 137 822  |
| test_GetAmountOut                        | PASS      | 8 367    |
| test_GasBuy                              | PASS      | 116 778  |
| test_GasSell                             | PASS      | 180 338  |
| test_GasResolveAndRedeem                 | PASS      | 91 123   |
| test_MultipleBuysAndOutcomeYES           | PASS      | 492 189  |

**Всего тестов:** 26 — **26 PASS**, 0 FAIL, 0 SKIP.

**Покрытие кода:** (требуется `forge coverage` — будет добавлено после настройки CI)

### Результат прогона подзадачи 2.2 — MarketFactory.sol

```bash
forge test --mc MarketFactoryTest -vvv
```

| Тест                                        | Результат | Газ (средний) |
|---------------------------------------------|-----------|---------------|
| test_InitialState                           | PASS      | 20 058        |
| test_CreateMarket                           | PASS      | 2 176 415     |
| test_CreateMultipleMarkets                  | PASS      | 6 428 356     |
| test_MarketEventOnCreation                  | PASS      | 2 173 416     |
| test_MarketHasInitialLiquidity              | PASS      | 2 175 219     |
| test_MarketOwnerIsFactory                   | PASS      | 2 173 453     |
| test_MarketSetsCorrectParams                | PASS      | 2 188 348     |
| test_BuyAfterFactoryCreation                | PASS      | 2 277 929     |
| test_RevertCreateWithZeroLiquidity          | PASS      | 17 731        |
| test_RevertCreateWithLowLiquidity           | PASS      | 17 731        |
| test_RevertCreateWithEmptyName              | PASS      | 17 777        |
| test_RevertCreateWithPastEndTime            | PASS      | 15 879        |
| test_RevertCreateWhenResolutionBeforeEnd    | PASS      | 15 806        |
| test_RevertCreateWithInsufficientAllowance  | PASS      | 31 685        |
| test_FactoryBalanceAfterCreation            | PASS      | 2 177 897     |
| test_FeeToCanBeUpdated                      | PASS      | 14 527        |
| test_RevertSetFeeToByNonOwner               | PASS      | 13 930        |
| test_MarketFactoryAddressIsDeployer         | PASS      | 8 101         |
| test_GasCreateMarket                        | PASS      | 2 172 137     |
| test_MarketLiquidityIsInReserves            | PASS      | 2 175 151     |
| test_UserCanTradeOnFactoryCreatedMarket     | PASS      | 2 272 977     |
| test_ResolveMarketViaFactory                | PASS      | 2 204 049     |
| test_RevertResolveMarketByNonOwner          | PASS      | 2 177 921     |

**Всего тестов:** 23 — **23 PASS**, 0 FAIL, 0 SKIP.

**Общий итог смарт-контрактов:** 49 тестов (26 Market + 23 Factory) — **49 PASS**, 0 FAIL.

## 2. Бэкенд (Next.js API + SQLite)

### Интеграционные тесты (Jest)
```bash
npm run test:api
```

| Тест                                                    | Результат |
|---------------------------------------------------------|-----------|
| GET /api/markets — пустой GeoJSON                       | PASS      |
| GET /api/markets — GeoJSON с рынками после создания     | PASS      |
| POST /api/markets — создание рынка с валидными данными  | PASS      |
| POST /api/markets — 400 при отсутствии обязательных полей | PASS    |
| POST /api/markets — 400 при некорректных координатах    | PASS      |
| POST /api/markets — 409 при дубликате contract_address  | PASS      |
| GET /api/markets/[id] — возврат рынка по id             | PASS      |
| GET /api/markets/[id] — 404 для несуществующего id      | PASS      |
| GET /api/markets/[id] — 400 для невалидного id          | PASS      |
| PATCH /api/markets/[id]/resolve — resolve с outcome     | PASS      |
| PATCH /api/markets/[id]/resolve — 400 без outcome       | PASS      |
| PATCH /api/markets/[id]/resolve — 404 для несущ. id     | PASS      |

**Всего тестов:** 12 — **12 PASS**, 0 FAIL.

**Нагрузочное тестирование:** не проводилось (будет в спринте 2).

## 3. Фронтенд (карта + Web3)

### Ручное (manual) тестирование
| Сценарий | Результат | Дата | Кто тестировал |
|----------|-----------|------|----------------|
| Инициализация карты MapLibre (demotiles) | PASS | 2025-05-09 | @frontend-dev |
| Загрузка маркеров из GET /api/markets | PASS | 2025-05-09 | @frontend-dev |
| Клистеризация маркеров (zoom/unzoom) | PASS | 2025-05-09 | @frontend-dev |
| Клик на маркер → открытие боковой панели | PASS | 2025-05-09 | @frontend-dev |
| Закрытие боковой панели (кнопка ×) | PASS | 2025-05-09 | @frontend-dev |

### Ручное тестирование — создание рынка (Sprint 4 fix)
| Сценарий | Результат | Дата | Кто тестировал |
|----------|-----------|------|----------------|
| Двойной клик по карте → открытие формы создания | PASS | 2025-05-09 | @frontend-dev |
| Кнопка "+ New Market" → открытие формы | PASS | 2025-05-09 | @frontend-dev |
| Форма: валидация полей (обязательные, даты в будущем) | PASS | 2025-05-09 | @frontend-dev |
| Форма: категории (General/Politics/Sports/Economics/Technology) | PASS | 2025-05-09 | @frontend-dev |
| Отображение координат выбранного места | PASS | 2025-05-09 | @frontend-dev |
| API resilience: пустой GeoJSON при недоступной БД | PASS | 2025-05-09 | @backend-dev |

## 4. E2E (полный цикл ставки)

### Скрипт: `scripts/e2e-test.sh`

Тестирует полный цикл:
1. **Проверка Anvil** — наличие локальной ноды.
2. **Контракты** — создание рынка через фабрику, покупка YES, продажа, покупка, форвард времени, resolve через фабрику, redeem.
3. **API** — GET /api/markets (GeoJSON), POST создание, PATCH resolve, GET single.
4. **Фронтенд** — проверка HTTP 200 на / и /admin, наличие карты.

**Команда запуска:** `scripts/e2e-test.sh` (требует Anvil и `npm run dev`).

| Сценарий | Результат | Примечание |
|----------|-----------|------------|
| Anvil running + contracts deployed | — | Проверка в скрипте |
| Контракты: full lifecycle | — | buy → sell → resolve → redeem |
| API: CRUD + resolve | — | Все эндпоинты |
| Фронтенд: / и /admin доступны | — | HTTP 200 |

## 5. E2E на forked Amoy

### Скрипт: `scripts/e2e-fork.sh`

Запускает Anvil с форком Amoy (`--fork-url https://rpc-amoy.polygon.technology`), деплоит контракты и выполняет полный lifecycle.

**Команда запуска:** `bash scripts/e2e-fork.sh`

| Сценарий | Описание |
|----------|----------|
| Fork Anvil | Запуск ноды с состоянием Amoy |
| Deploy | Деплой MockUSDC + MarketFactory |
| Create market | Создание рынка через фабрику |
| Buy | Покупка YES токенов |
| Sell | Продажа YES токенов |
| Resolve | Разрешение рынка как YES через фабрику |
| Redeem | Получение выигрыша, проверка баланса USDC |

CI: GitHub Actions workflow (`e2e-fork`), запускается вручную (`workflow_dispatch`) или по тегу.

## 7. Нагрузочное тестирование

### Результаты (scripts/load-test.sh)

| Метрика | Значение |
|---------|----------|
| createMarket (avg gas) | 2,172,137 |
| buy (avg gas) | 95,260 |
| resolve (gas) | 41,585 |
| redeem (gas) | 37,941 |
| createMarket (avg latency) | ~45 ms |
| buy (avg latency) | ~12 ms |
| Рынков создано | 5 |
| Ставок сделано | 15 |

Полный отчёт: [LOAD_TEST_REPORT.md](../LOAD_TEST_REPORT.md)

## 9. Админ-панель (Sprint 5.3 — ручное тестирование)

### 9.1 Admin Dashboard
| Сценарий | Результат |
|----------|-----------|
| GET /api/admin/stats возвращает метрики | Ручная проверка |
| Dashboard отображает 4 карточки-метрики | Ручная проверка |
| PieChart liquidityByCategory рендерится | Ручная проверка |
| BarChart topMarketsByLiquidity рендерится | Ручная проверка |
| Кнопка Refresh обновляет данные | Ручная проверка |

### 9.2 Admin Markets List
| Сценарий | Результат |
|----------|-----------|
| GET /api/admin/markets возвращает пагинированный список | Ручная проверка |
| Фильтр по статусу (open/closed/resolved) | Ручная проверка |
| Фильтр по категории | Ручная проверка |
| Поиск по названию | Ручная проверка |
| Пагинация (Previous/Next, page info) | Ручная проверка |
| Resolve YES/NO через контракт + БД | Ручная проверка |

### 9.3 Batch Upload
| Сценарий | Результат |
|----------|-----------|
| POST /api/admin/batch-upload с CSV (multipart) | Ручная проверка |
| POST /api/admin/batch-upload с GeoJSON (JSON body) | Ручная проверка |
| Drag & Drop файла в админке | Ручная проверка |
| Отчёт о созданных/ошибках | Ручная проверка |
| Лимит 10 записей | Ручная проверка |

### 9.4 Allowed Countries
| Сценарий | Результат |
|----------|-----------|
| GET /api/admin/allowed-countries — пустой список | Ручная проверка |
| POST добавление страны | Ручная проверка |
| POST удаление страны | Ручная проверка |
| POST с невалидным кодом (400) | Ручная проверка |
| POST /api/markets с запрещённой страной (403) | Ручная проверка |

## Sprint 5.4 — Manual Validation Checklist

*Требует: Anvil (localhost:8545), `npm run dev` (localhost:3000), кошелёк подключен*

| # | Сценарий | Статус | Примечание |
|---|----------|--------|------------|
| 1 | Создание рынка через двойной клик на карте → форма → деплой через MarketFactory | [ ] | dblclick → CreateMarketModal → tx → POST /api/markets |
| 2 | Проверка появления рынка на карте (маркер) | [ ] | Маркер появляется с размером по liquidity |
| 3 | Покупка YES/NO через боковую панель (MarketSidebar) | [ ] | approve → buy → баланс обновляется |
| 4 | Продажа через боковую панель | [ ] | sell → баланс уменьшается |
| 5 | Проверка ленты событий (EventFeed) | [ ] | market_created событие появляется в течение 15с |
| 6 | Переход на страницу рынка (клик по маркеру) | [ ] | /market/[address] открывается с графиком |
| 7 | График цен на странице рынка (recharts) | [ ] | Линии YES/NO отображаются |
| 8 | Загрузка CSV через админ-панель (2 рынка) | [ ] | Batch Upload → файл → отчёт "2 created" |
| 9 | Проверка созданных рынков в списке Markets | [ ] | Markets tab → видны новые рынки (simulated) |
| 10 | Разрешение рынка через админ-панель | [ ] | Resolve YES/NO → tx → статус меняется |
| 11 | Dashboard: метрики и графики | [ ] | PieChart (liquidity by category), BarChart (top), карточки |
| 12 | Allowed Countries: добавление страны | [ ] | Add "US" → появляется в списке |
| 13 | Allowed Countries: попытка создать рынок вне зоны | [ ] | add "ZZ" → POST /api/markets → 403 |
| 14 | API health check | [ ] | GET /api/health → {"status":"ok"} |
| 15 | Price snapshot (авто-снимок каждые 60с) | [ ] | POST /api/price-snapshot → данные в таблице |
| 16 | Фильтрация списка рынков (status/category/search) | [ ] | Admin Markets → фильтры работают |
| 17 | Пагинация списка рынков (10/стр) | [ ] | Admin Markets → Previous/Next |

## 11. Инструменты и CI
- **CI** – GitHub Actions: Foundry, API, Docker build, docs validation, E2E fork, Deploy.

---

**Резюме:** 49 контрактных + 12 API тестов — 61 PASS, 0 FAIL. Газ функций buy/sell снижен на 5–7%. E2E-скрипты: Anvil (local) + Forked Amoy. Админ-панель Sprint 5.3: 4 API эндпоинта, 4 UI компонента, дашборд с recharts, пакетная загрузка, управление странами.
