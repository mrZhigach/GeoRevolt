# План-график GeoRevolt – Спринт 8 (Доработка дизайна и функционала)

**Длительность:** 2026-05-11 – 2026-05-18  
**Ветка:** `feature/dashboard-redesign`  
**Цель:** Глобальная навигация, переключение карта/список, комментарии, админ-панель нового поколения, мобильная адаптация  
**Story Points (всего):** 40

| ID | Задача | SP | Статус | Агент | Дедлайн | Комментарий |
|----|--------|----|--------|-------|---------|--------------|
| 8.1 | **Глобальная навигация и адаптивность** — Header: гамбургер-меню, логотип, поиск, профиль/кошелёк, переключатель темы (тёмная/светлая), выбор языка (заглушка), shadcn/ui Sheet + DropdownMenu | 5 | [x] | @frontend-dev | 2026-05-12 | ✅ AppHeader переписан: Sheet (гамбургер), DropdownMenu (язык/профиль), поиск, тема, Wallet с балансом |
| 8.2 | **ViewToggle: переключение между картой и списком** — компонент ViewToggle, состояние в URL (?view=map/list), режим карты (текущий Map.tsx), режим списка (грид карточек из GET /api/markets, пагинация), карточка рынка | 8 | [x] | @frontend-dev | 2026-05-14 | ✅ ViewToggle + MarketsList + фильтры + пагинация + Load More |
| 8.3 | **Улучшенная карта и попапы** — сохранение текущего Map.tsx, улучшенный попап при клике на маркер (название, цены, "Подробнее", быстрая покупка) | 6 | [x] | @frontend-dev | 2026-05-14 | ✅ Реализовано в Sprint 7 (MarketPopup.tsx). Mobile адаптация добавлена |
| 8.4 | **Система комментариев** — БД (таблица comments), API (GET/POST/DELETE), фронтенд (вкладка "Обсуждение" на странице /market/[address]), дерево комментариев, аватар | 8 | [x] | @backend-dev, @frontend-dev | 2026-05-15 | ✅ Comments: таблица в SQLite+PG, API 3 ручки, CommentsSection с деревом, Tabs на странице рынка |
| 8.5 | **Админ-панель нового поколения** — вкладки (Дашборд, Управление рынками, Пакетная загрузка, Разрешённые страны), recharts графики, улучшенная таблица, прогресс-бар, карта стран | 6 | [x] | @frontend-dev | 2026-05-15 | ✅ Dashboard (4 метрики + 3 графика), Batch (progress bar), Countries (badges) |
| 8.6 | **Мобильная адаптация и тестирование** — 320px–1280px, карта на всю ширину, гамбургер-меню, список одной колонкой, Playwright-тесты | 5 | [x] | @qa-automation-engineer | 2026-05-16 | ✅ EventFeed скрыт на lg, MapControls w-[280px] на mobile, Playwright 15 тестов |
| 8.7 | **Документация и релиз** — CHANGELOG.md, README.md, ARTIFACT_LOG.md, validate-docs.sh → PASS, GitHub Release v1.3.0 | 2 | [x] | @feature-lead | 2026-05-17 | ✅ CHANGELOG обновлён, ARTIFACT_LOG обновлён, TEST_REPORT обновлён, validate-docs PASS |

---

## График выполнения

```
День 1 (11 мая): 8.1 + 8.4 + 8.6 (параллельно)
День 2 (12 мая): 8.2 (после 8.1)
День 3 (13 мая): 8.3 (после 8.2)
День 4 (14 мая): 8.5 (финал админки)
День 5 (15 мая): 8.7 (документация + релиз)
```

## Критерии готовности спринта
- [x] npm run build — PASS
- [x] Все API тесты — PASS (49 Foundry + 12 Jest + 15 Playwright)
- [x] Playwright E2E тесты — PASS (15 новых тестов Sprint 8)
- [x] validate-docs.sh — PASS
- [x] CHANGELOG.md, TEST_REPORT.md, ARTIFACT_LOG.md обновлены
- [ ] GitHub Release v1.3.0 — ожидает пользователя

---

## Хотфикс (2026-05-11) — Консольные ошибки браузера

| ID | Задача | SP | Статус | Агент | Дедлайн | Комментарий |
|----|--------|----|--------|-------|---------|--------------|
| HF.1 | **Button forwardRef** — компонент Button обёрнут в `React.forwardRef` для совместимости с DialogClose/SheetClose из `@base-ui/react` | 1 | [x] | @frontend-dev | 2026-05-11 | ✅ button.tsx: forwardRef + displayName |
| HF.2 | **Async root.unmount в MarketPopup** — `root.unmount()` перенесён в `queueMicrotask()` для устранения предупреждения React | 1 | [x] | @frontend-dev | 2026-05-11 | ✅ MarketPopup.tsx: queueMicrotask |
| HF.3 | **validate-docs.sh + CHANGELOG** | 1 | [x] | @feature-lead | 2026-05-11 | ✅ |

## Хотфикс Sprint 8 (2026-05-11) — Ошибки развёртывания

| ID | Задача | SP | Статус | Агент | Дедлайн | Комментарий |
|----|--------|----|--------|-------|---------|--------------|
| 8.HF.1 | **CRITICAL: TypeError toFixed lat undefined** — извлечение lat/lng из GeoJSON geometry в MarketsList | 2 | [x] | @frontend-dev | 2026-05-11 | ✅ MarketsList.tsx: geometry.coordinates → lat/lng + safe check |
| 8.HF.2 | **Sticky Header перекрывает админку** — pt-14 для app/admin/page.tsx и app/page.tsx | 1 | [x] | @frontend-dev | 2026-05-11 | ✅ pt-14 на контейнеры |
| 8.HF.3 | **z-index плавающих элементов** — MapControls z-40, кнопки карты zIndex 45 | 1 | [x] | @frontend-dev | 2026-05-11 | ✅ MapControls.tsx + Map.tsx |
| 8.HF.4 | **Попап не получает данные маркера** — enrichMarket() в click-обработчиках Map.tsx | 2 | [x] | @frontend-dev | 2026-05-11 | ✅ Map.tsx: enrichMarket helper + расширен MarketProperties |
| 8.HF.5 | **npm run build + validate-docs.sh + CHANGELOG** | 1 | [x] | @feature-lead | 2026-05-11 | ✅ |

## Хотфикс (2026-05-11) — MarketPopup data + WebGL context loss

| ID | Задача | SP | Статус | Агент | Дедлайн | Комментарий |
|----|--------|----|--------|-------|---------|--------------|
| HF.4 | **WebGL context loss loop** — счётчик restoreAttempts не инкрементился, preventDefault блокировал авто-восстановление. Исправлено: убран preventDefault, добавлен counter, source refresh после restore | 2 | [x] | @feature-lead | 2026-05-11 | ✅ Map.tsx: context loss counter + source.setData после restore |
| HF.5 | **MarketPopup не показывал описание** — `market.description` присутствовал в данных, но не отображался в попапе. Добавлен блок с line-clamp. Safe fallback для `liquidity` | 1 | [x] | @feature-lead | 2026-05-11 | ✅ MarketPopup.tsx: description + liquidity fallback |
| HF.6 | **Цены YES/NO отсутствовали в GeoJSON** — `toGeoJSON()` не экспортировал price_yes/price_no. Добавлены с null default | 1 | [x] | @feature-lead | 2026-05-11 | ✅ lib/db.ts: price_yes: null, price_no: null |
| HF.7 | **npm run build + validate-docs.sh + CHANGELOG** | 1 | [x] | @feature-lead | 2026-05-11 | ✅ |

## Хотфикс (2026-05-11) — WebGL cascade + MarketSidebar

| ID | Задача | SP | Статус | Агент | Дедлайн | Комментарий |
|----|--------|----|--------|-------|---------|--------------|
| HF.8 | **WebGL context loss cascade** — MetaMask SES lockdown → setWebglReady → Fast Refresh → loop. Исправлено: DOM overlay вместо React state | 2 | [x] | @feature-lead | 2026-05-11 | ✅ Map.tsx: webglShowOverlay/webglHideOverlay через DOM, SES detection |
| HF.9 | **MarketSidebar на клик по маркеру** — MarketSidebar был импортирован но не рендерился. Добавлен state showSidebar + рендер | 1 | [x] | @feature-lead | 2026-05-11 | ✅ Map.tsx: setShowSidebar в click-хендлерах, JSX-sidebar |
| HF.10 | **npm run build + validate-docs.sh + CHANGELOG** | 1 | [x] | @feature-lead | 2026-05-11 | ✅ |

## Хотфикс (2026-05-11) — EventFeed restyle + reposition

| ID | Задача | SP | Статус | Агент | Дедлайн | Комментарий |
|----|--------|----|--------|-------|---------|--------------|
| HF.11 | **EventFeed restyle + reposition** — полный рестайлинг на Tailwind/shadcn, перемещение под MapControls в левую колонку, скрытие на мобильных | 2 | [x] | @frontend-dev | 2026-05-11 | ✅ EventFeed.tsx: Tailwind + shadcn/ui Card, Map.tsx: общий контейнер, MapControls.tsx: убран fixed. 27/27 Playwright PASS |

## Дизайн / Enhanced (ветка `design/enhanced`)

| ID | Задача | SP | Статус | Агент | Дедлайн | Комментарий |
|----|--------|----|--------|-------|---------|--------------|
| DE.1 | **Reverse geocoding на клик по фону карты** — клик на пустую область → Nominatim API → Popup с адресом. Debounce 300ms для отличия от dblclick. Существующие хендлеры не тронуты | 2 | [x] | @cartography-engineer | 2026-05-11 | ✅ Map.tsx: новый click-хендлер с reverse geocoding через Nomintim, MapLibre Popup |

## Бэклог
- PMTiles для РФ (ждём Planetiler на 48 GB RAM)
- Деплой на Polygon Amoy (#11)
