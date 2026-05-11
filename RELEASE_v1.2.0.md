# GeoRevolt v1.2.0 — PPLX-Inspired Premium Design

**Дата:** 2026-05-11  
**Ветка:** `design/pplx-overhaul` → `master`  
**Tag:** `v1.2.0`

## Что нового

### 🎨 Дизайн-система (PPLX-адаптация)
- **shadcn/ui v4** (base-ui v9) — инициализация через CLI, 13 базовых компонентов
- **Тёмная тема** с зелёным акцентом (`hsl(142 71% 45%)`), прозрачные glass-карточки с backdrop-blur
- **Google Fonts** — Inter + DM Sans через `next/font/google`
- **CSS-утилиты** — `.glass`, `.card-glass`, `transition-soft`, анимация `popup-in`

### 🗺️ Плавающая карточка управления (MapControls)
- **Геокодер Nominatim** — поиск адреса/места с debounce 400ms и fly-to
- **Фильтр категорий** — 6 категорий (Politics, Sports, Economics, Technology, General, All)
- **Wallet-виджет** — Connect/Disconnect с отображением сокращённого адреса
- **"My Bets"** — боковая панель (Sheet) для просмотра ставок
- **Stats-блок** — Markets / Active / TVL с автообновлением каждые 30с

### 📍 Карточка события (MarketPopup)
- React-рендеринг внутри нативного MapLibre Popup
- Цены YES/NO в виде компактных индикаторов
- Кнопки быстрой покупки "💰 Buy YES" / "💰 Buy NO"
- Ссылка "Details →" на страницу рынка
- Автозагрузка текущих цен

### 📊 Оптимизации
- **getAdminStats()** — 4 отдельных SQL-запроса объединены в 1 агрегированный (sub-selects)
- **Динамическая фильтрация** — фильтр категорий применяется через `map.setFilter` без перезагрузки

### 🧭 Глобальная навигация
- **AppHeader** — Sticky Header для страниц /admin и /market/[address] (скрывается на карте)
- Навигация: Map / Admin, Wallet-виджет

### 🧪 Тестирование
- `next build` — ✅ PASS
- 12/12 API тестов — ✅ PASS
- `validate-docs.sh` — ✅ PASS

## Полный список изменений

### Added
- shadcn/ui v4: 13 UI-компонентов (card, button, input, select, popover, command, sheet, dialog, textarea, input-group)
- components/MapControls.tsx — плавающая карточка управления (геокодер, фильтр, wallet, stats)
- components/MarketPopup.tsx — карточка события над маркером карты
- components/AppHeader.tsx — глобальный Sticky Header для страниц /admin, /market
- CSS: glass-эффекты, анимация popup-in, утилита transition-soft
- Google Fonts Inter + DM Sans

### Changed
- app/globals.css — полная переработка: PPLX-тёмная тема, shadcn v4 интеграция
- app/layout.tsx — подключены шрифты, добавлен AppHeader
- components/Map.tsx — интеграция MapControls + MarketPopup, клиент-сайд фильтрация
- lib/db.ts — оптимизация getAdminStats (4→1 запрос)

### Infrastructure
- components.json — конфигурация shadcn/ui (base-nova, slate dark)
- postcss.config.mjs — конфигурация Tailwind CSS v4 + PostCSS
- .gitignore — добавлен .next.prod_bak/

---

**Артефакты:** shadcn/ui дизайн-система, 3 новых React-компонента, оптимизированный API статистики.
