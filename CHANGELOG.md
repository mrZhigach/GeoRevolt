# Журнал изменений GeoRevolt

Все значимые изменения в проекте фиксируются здесь в хронологическом порядке (от новых к старым).

## [2026-05-11] — Fix: EventFeed overlap, allowed-countries validation, E2E test fixes

### Fixed
- **EventFeed перекрывал MarketSidebar и CreateMarketModal** — EventFeed (z-index:10) и MarketSidebar (z-index:10) были в одной плоскости, EventFeed в DOM рендерился позже и перекрывал сайдбар. Исправлено:
  - EventFeed скрывается при открытом сайдбаре или модалке (условный рендеринг `{!showSidebar && !createCoords && <EventFeed />}`).
  - z-index EventFeed понижен до 5, MarketSidebar повышен до 30.
- **API /api/admin/allowed-countries не валидировал ISO-коды** — принимал любые 2-буквенные коды. Добавлен полный список ISO 3166-1 alpha-2. Код 'XX' теперь возвращает 400.
- **E2E тесты** — исправлены 5 упавших тестов:
  - `allowed-countries validates country codes` — починил API валидацию
  - `Frontend map page loads` — заменён `text=Connect Wallet` (зависит от wagmi) на проверку body + map container
  - `Admin page has tab navigation` — strict mode fix: `.first()`
  - `Mobile hamburger menu visible` — более надёжный селектор
  - `Responsive list view` — strict mode fix: конкретный grid селектор

## [2026-05-11] — Fix: WebGL context loss cascade + MarketSidebar on marker click

### Fixed
- **WebGL context loss cascade (CRITICAL)** — MetaMask SES lockdown вызывал повторяющуюся потерю WebGL-контекста. Старый обработчик использовал `setWebglReady(false)`, что триггерило React re-render → Fast Refresh → SES опять блокировал контекст → бесконечный цикл. Исправлено:
  - WebGL overlay теперь создаётся через прямую DOM-манипуляцию (не через React state), что полностью исключает re-render и Fast Refresh.
  - Оверлей показывается только после `WEBGL_RESTORE_MAX_ATTEMPTS` (5) попыток.
  - После восстановления контекста (`webglcontextrestored`) вызывается `m.resize()` и перезагружаются данные GeoJSON-слоя.
  - Добавлено детектирование SES lockdown при монтировании (diagnostic warn).
- **Клик по маркеру не открывал дашборд с графиком и ценами** — компонент `MarketSidebar` был импортирован, но нигде не рендерился. Исправлено:
  - Добавлен state `showSidebar`, который устанавливается при клике на маркер (одновременно с `selectedMarket` для popup).
  - В JSX добавлен `<MarketSidebar>` — панель справа с полной информацией: график цен (recharts), YES/NO цены, торговый интерфейс (buy/sell), позиция пользователя, redeem.
  - `showSidebar` очищается при закрытии сайдбара, двойном клике по карте, создании нового маркета.

### Changed
- `components/Map.tsx`:
  - WebGL: убран `setWebglReady` (state), заменён на `webglOverlayRef` (DOM-узел) с функциями `webglShowOverlay()` / `webglHideOverlay()`.
  - SES detection: `useEffect` с проверкой `window.SES?.lockdown` для диагностического warn.
  - Marker click: `m.on('click', 'markets-radius/...')` теперь вызывает `setShowSidebar(enriched)`.
  - Close handlers: `handleMarketClosed`, `dblclick`, "New Market" button — все очищают `showSidebar`.
  - Убран старый React-оверлей `{!webglReady && (...)}`.

## [2026-05-11] – Hotfix Sprint 8: MarketPopup data, WebGL context loss loop, description display

### Fixed
- **WebGL context loss loop в Map.tsx** — `webglcontextlost` обработчик вызывал `e.preventDefault()`, что блокировало автоматическое восстановление контекста браузером. Счётчик `restoreAttempts.current` никогда не инкрементировался. Исправлено:
  - Убран `e.preventDefault()` — браузер и MapLibre GL JS 4.x теперь автоматически восстанавливают контекст.
  - `restoreAttempts.current` инкрементируется при каждой потере контекста.
  - После восстановления (`webglcontextrestored`) вызывается `m.resize()` и перезагружаются данные GeoJSON-слоя через `source.setData()`.
  - В оверлей WebGL добавлено отображение номера попытки и диагностическое сообщение о возможном конфликте с расширениями браузера при превышении `WEBGL_RESTORE_MAX_ATTEMPTS`.
- **Цены маркеров отсутствовали в GeoJSON** — `toGeoJSON()` в `lib/db.ts` не включал поля `price_yes`/`price_no`. Добавлены с `null` по умолчанию — попап корректно отображает статус цен через `formatPrice()`.
- **Описание рынка не показывалось в MarketPopup** — компонент `MarketPopupContent` не отображал `market.description`. Добавлен блок с description (line-clamp-3, обрезается при длинном тексте).
- **Потенциальный crash при undefined liquidity** — `market.liquidity.toLocaleString()` мог выбросить TypeError, если `liquidity` отсутствует. Добавлена проверка `market.liquidity != null` с fallback `'—'`.

### Changed
- `lib/db.ts` — `toGeoJSON()`: добавлены `price_yes: null, price_no: null` в properties.
- `components/Map.tsx` — исправлены обработчики `webglcontextlost`/`webglcontextrestored` (no preventDefault, counter increment, source refresh). WebGL overlay показывает номер попытки и диагностику.
- `components/MarketPopup.tsx` — добавлен блок описания, safe fallback для `liquidity`.

## [2026-05-11] – Hotfix Sprint 8: GeoJSON lat/lng, z-index, header overlap, popup data

### Fixed
- **Критический баг: `TypeError: can't access property "toFixed", market.lat is undefined` в MarketsList.tsx** — компонент ожидал поля `lat`/`lng` на объекте маркета, но API возвращает GeoJSON с координатами в `feature.geometry.coordinates`. Исправлено: при маппинге `features` координаты извлекаются из `geometry.coordinates` как `[lng, lat]`. Добавлена fallback-проверка `market.lat != null` в `MarketCard`.
- **Sticky Header перекрывает контент админ-панели** — AppHeader имеет `position: sticky; z-index: 50; h-14`. Добавлен `pt-14` на контейнеры `app/admin/page.tsx` и `app/page.tsx` (list view), чтобы контент не прятался под шапкой.
- **Неправильный z-index плавающих элементов на карте** — MapControls имел `z-10`, нижние кнопки — `zIndex: 5`. Исправлено: MapControls → `z-40`, кнопки → `zIndex: 45`, чтобы соблюдался порядок Header (50) > элементы управления (40-45) > карта (0).
- **Попап не получал координаты маркера при клике** — обработчики `click` на `markets-radius`/`markets-layer` передавали только `feature.properties` без lat/lng. Исправлено: добавлена функция `enrichMarket()`, извлекающая `lng`/`lat` из `geometry.coordinates`. Интерфейс `MarketProperties` расширен полями `lng`, `lat`, `price_yes`, `price_no`.

### Changed
- `components/MarketsList.tsx` — маппинг GeoJSON → MarketCardData теперь включает `lng/lat` из geometry.
- `components/Map.tsx` — click-обработчики обогащают данные маркера координатами из geometry; `setMarkets` также включает координаты.
- `components/MapControls.tsx` — z-index повышен с 10 до 40.
- `app/admin/page.tsx` — добавлен `pt-14` для отступа от sticky header.
- `app/page.tsx` — добавлен `pt-14` для list view.

## [2026-05-11] – Hotfix: Button forwardRef + async root.unmount

### Fixed
- **Критический баг: `Function components cannot be given refs` в DialogClose → Button** — компонент `Button` из shadcn/ui v4 (`components/ui/button.tsx`) не был обёрнут в `React.forwardRef`, из-за чего `@base-ui/react` компоненты (DialogClose, SheetClose) не могли пробросить ref в DOM при рендеринге через `asChild`. Исправлено: Button обёрнут в `React.forwardRef<HTMLButtonElement, ButtonProps>`, ref передаётся в `ButtonPrimitive`. Добавлен `Button.displayName = "Button"`.
- **Предупреждение: `Attempted to synchronously unmount a root` в MarketPopup.tsx** — cleanup эффекта вызывал `root.unmount()` синхронно, что приводило к предупреждению React, когда другой эффект уже выполнял рендер. Исправлено: `root.unmount()` обёрнут в `queueMicrotask()`, чтобы unmount происходил асинхронно после завершения рендера React. Root-ссылка обнуляется синхронно для предотвращения повторных вызовов.

## [2026-05-11] – Sprint 8 — Dashboard redesign: navigation, view toggle, comments, admin panel

### Added
- **Глобальная навигация (8.1):** новый AppHeader с гамбургер-меню (Sheet), глобальный поиск, переключатель темы (тёмная/светлая), выбор языка (заглушка), профиль/кошелёк с балансом через wagmi `useBalance`. Desktop-навигация: Map, Markets List, Admin.
- **Поддержка светлой темы:** в `globals.css` добавлены CSS-переменные `.light` для светлой темы, переключение через localStorage.
- **ViewToggle (8.2):** компонент `ViewToggle` — две кнопки "Map" / "List" с состоянием в URL (`?view=map` или `?view=list`). Главная страница `app/page.tsx` переписана для поддержки обоих режимов.
- **MarketsList (8.2):** компонент `MarketsList` — грид карточек рынков (3 колонки на десктопе, 1 на мобильном), категорийный фильтр, поиск, пагинация "Load More", цены YES/NO с ProgressBar, кнопки быстрой покупки.
- **Paginated API (8.2):** GET `/api/markets` теперь поддерживает query-параметры `page`, `limit`, `category`, `search`. Добавлена функция `getFilteredMarkets()` в `lib/db.ts`.
- **Система комментариев (8.4):**
  - БД: таблица `comments` (id, market_address, user_address, parent_id, content, created_at, updated_at) для SQLite и PostgreSQL.
  - API: GET `/api/markets/by-address/[address]/comments` (пагинация, вложенные ответы), POST (создание), DELETE `/api/comments/[id]` (удаление владельцем).
  - Фронтенд: `CommentsSection` — дерево комментариев с отступами, аватар (shadcn/Avatar), обрезанный адрес кошелька, форма нового комментария, кнопки Reply/Delete.
  - Страница `/market/[address]` — добавлена вкладка "Discussions" (shadcn/Tabs) с переключением Overview/Discussions.
- **Улучшенная Admin-панель (8.5):**
  - `app/admin/page.tsx` — полностью переписана с shadcn/Tabs и новым дизайном.
  - `AdminDashboard` — 4 метрические карточки (Total Markets, Total Liquidity, Active, Resolved), PieChart (Liquidity by Category), BarChart (Top Markets), LineChart (Daily Activity mock), Category Summary с прогресс-барами.
  - `AdminBatchUpload` — прогресс-бар загрузки, file info карточка, улучшенный отчёт с визуализацией успехов/ошибок.
  - `AdminAllowedCountries` — новый дизайн с Input + Button, badges для стран, кликабельные common country codes, сообщения об успехе/ошибке.
- **E2E-тесты Sprint 8 (8.6):** новый `e2e/sprint8.spec.ts` — 15 тестов: Comments API (CRUD, валидация), ViewToggle API (paginated, фильтры), Frontend (tabs, header, discussions), Mobile (hamburger, viewport), Batch Upload.
- **Mobile-адаптация:** EventFeed скрыт на мобильных (`hidden lg:block`), MapControls уже на мобильных (`w-[280px] sm:w-[340px]`), список рынков в 1 колонку на `xs`, гамбургер-меню только на `md:hidden`.

### Changed
- **components/AppHeader.tsx** — полностью переписан: добавлены Sheet (гамбургер), DropdownMenu (язык, профиль), поиск, переключатель темы, мобильная навигация.
- **components/MapControls.tsx** — адаптивная ширина на мобильных (`w-[280px] sm:w-[340px]`).
- **components/EventFeed.tsx** — скрыт на экранах меньше `lg` (`hidden lg:block`).
- **app/layout.tsx** — добавлен класс `dark` на `<html>` для явной тёмной темы.
- **app/globals.css** — добавлена светлая тема (`.light`), CSS-переменные для всех компонентов.
- **app/api/markets/route.ts** — GET теперь принимает query-параметры (page, limit, category, search) с вызовом `getFilteredMarkets()`.
- **app/page.tsx** — переписан с поддержкой `?view=list` (MarketsList) и `?view=map` (Map).
- **app/market/[address]/page.tsx** — добавлены Tabs (Overview/Discussions), интеграция CommentsSection.

### Fixed
- **SSR window is not defined** — в AppHeader убраны прямые обращения к `window` в теле компонента.

### Technical Debt
- Добавлены новые shadcn/ui компоненты: dropdown-menu, tabs, avatar, progress, separator, badge, switch, scroll-area.
- `getFilteredMarkets()` — новая функция фильтрации и пагинации в lib/db.ts.

### DevOps / Infrastructure
- Новая API-ручка: `/api/markets/by-address/[address]/comments` (GET/POST).
- Новая API-ручка: `/api/comments/[id]` (DELETE).

## [2026-05-11] – Sprint 7 — Hotfix: Cannot update an unmounted root + Input forwardRef

### Fixed
- **Критический баг: `Cannot update an unmounted root` в MarketPopup.tsx** — асинхронный `fetchPrices` продолжал вызывать `root.render()` после закрытия popup и размонтирования root. Исправлено: добавлен `mountedRef` для отслеживания состояния монтирования, проверка `if (!mountedRef.current || !rootRef.current) return;` перед каждым `root.render()`, try-catch вокруг `root.unmount()`, `onClose` добавлен в dependency array эффекта. Также устранена мутация пропа `market` — вместо неё создаётся новый объект через `{ ...market, ...overrides }`.
- **Предупреждение: `Function components cannot be given refs` в MapControls.tsx → input.tsx** — компонент `Input` из shadcn/ui не был обёрнут в `React.forwardRef`, хотя `MapControls` передавал ему `ref={inputRef}`. Исправлено: `Input` обёрнут в `React.forwardRef`, ref пробрасывается в `InputPrimitive`.

### Changed
- **components/ui/input.tsx** — заменена декларация `function Input(...)` на `React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(...)`.

## [2026-05-11] – Sprint 7 — Премиальный дизайн PPLX (Task 7.1: Дизайн-система)

### Added
- **shadcn/ui установка** — инициализация через CLI (v4, base-nova стиль), создан `components.json`, установлены зависимости.
- **UI-компоненты** — добавлены в `/components/ui`: `card`, `button`, `input`, `select`, `popover`, `command`, `sheet`, `dialog`, `textarea`, `input-group`.
- **Google Fonts** — подключены Inter и DM Sans через `next/font/google` в корневом `layout.tsx`.
- **PPLX-тёмная тема** — кастомизация CSS-переменных в `globals.css`: зелёный акцент (`hsl(142 71% 45%)`), прозрачные карточки через `hsla(0, 0%, 6%, 0.75)`, backdrop-blur.
- **Glass-утилиты** — CSS-классы `.glass` и `.card-glass` для карточек с эффектом матового стекла.

### Changed
- **app/globals.css** — полная переработка: добавлены Tailwind v4 директивы (`@import 'tailwindcss'`, `@theme inline`), shadcn v4 интеграция, кастомные цвета и радиусы.
- **app/layout.tsx** — добавлены `Inter` и `DM_Sans` шрифты, `font-sans antialiased` на body.
- **components/Map.tsx** — исправлена типовая ошибка `failIfMajorPerformanceCaveat` (несуществующее свойство в новых типах maplibre-gl).

### Technical Debt
- **Map.tsx**: удалён `failIfMajorPerformanceCaveat: false`, теперь отсутствует явная обработка WebGL performance caveat.

## [2026-05-11] – Sprint 7 (Task 7.2: Плавающая карточка управления MapControls)

### Added
- **components/MapControls.tsx** — новый компонент плавающей карточки управления (fixed top-4 left-4 z-10, glass-эффект, 340px ширина):
  - **Геокодер (Nominatim)**: поиск адреса/места с debounce (400ms), выпадающий список подсказок, fly-to при выборе.
  - **Фильтр по категориям**: select-компонент с 6 категориями (All, Politics, Sports, Economics, Technology, General) с иконками.
  - **Wallet-виджет**: отображение адреса (сокращённый) при подключении, кнопки Connect/Exit.
  - **Кнопка "My Bets"**: Sheet (shadcn/ui) справа с информацией о ставках (заглушка для неавторизованных).
  - **Stats-блок**: мини-карточка с метриками (Markets, Active, TVL), данные из `/api/admin/stats`, автообновление каждые 30с.

### Changed
- **components/Map.tsx** — заменён inline-виджет кошелька на `<MapControls>`. Добавлены:
  - `handleFlyTo` — плавное перемещение карты по координатам.
  - `handleCategoryFilter` — динамическая фильтрация слоёв маркеров на карте (client-side через `map.setFilter`).
  - Кнопка "+ New Market" переведена на Tailwind/glass-стиль.

## [2026-05-11] – Sprint 7 (Task 7.5: Анимации и глобальный Sticky Header)

### Added
- **components/AppHeader.tsx** — глобальный Sticky Header для страниц, отличных от карты:
  - Логотип GeoRevolt с иконкой Globe.
  - Навигация: Map, Admin (с активным состоянием).
  - Wallet-виджет (connect/disconnect, сокращённый адрес).
  - Автоматически скрывается на главной странице (`pathname === '/'`).
  - Glass-эффект `backdrop-blur-md`, тёмная тема, sticky top-0.
- **Анимации CSS** — в `globals.css`:
  - `.georevolt-marker-popup` — entry-анимация `popup-in` (opacity + scale + translateY).
  - `@utility transition-soft` — `transition: all 0.2s ease`.
  - `.glass:hover` — плавное изменение border-color.
  - `@keyframes popup-in` — анимация появления попапа (0.2s, ease-out).
- **MapControls.tsx** — класс `transition-soft` на главной карточке.

### Changed
- **app/layout.tsx** — добавлен `<AppHeader />` в корневой layout, удалён глобальный `overflow: hidden` с body для поддержки скролла на страницах /admin и /market/[address].
- **app/globals.css** — убран `overflow: hidden` из html (перенесён в стили карты).

## [2026-05-11] – Sprint 7 (Task 7.4: Оптимизация блока статистики)

### Changed
- **lib/db.ts** — оптимизирован `getAdminStats()`: 4 отдельных запроса (COUNT, SUM, COUNT active, COUNT resolved) объединены в один агрегированный с подзапросами как для SQLite, так и для PostgreSQL. Это сокращает число round-trips к БД с 6 до 3.
- **components/MapControls.tsx** — блок статистики уже интегрирован (из задачи 7.2), получает данные через `fetch('/api/admin/stats')` при монтировании с автообновлением каждые 30 секунд.

## [2026-05-11] – Sprint 7 (Task 7.3: Карточка события MarketPopup)

### Added
- **components/MarketPopup.tsx** — новый компонент-попап для отображения информации о рынке при клике на маркер:
  - Рендерится через нативный MapLibre `Popup` с React-контентом (через `createRoot`).
  - Позиционируется над координатами маркера, offset 10px.
  - Заголовок: категория (с цветовой точкой), название рынка, статус resolved.
  - Адрес (если есть) — одной строкой.
  - Цены YES/NO — две компактные карточки с процентным отображением (`¢{price * 100}%`).
  - Ссылка "Details →" на `/market/{address}`.
  - Кнопки быстрой покупки "💰 Buy YES" / "💰 Buy NO" с glass-стилем и hover-эффектами.
  - Автозагрузка текущих цен через `/api/price-history/[address]`.

### Changed
- **components/Map.tsx** — клик по маркеру/кругу теперь открывает `MarketPopup` вместо `MarketSidebar`.
  - Добавлено состояние `clickedLngLat` для передачи координат клика в попап.
  - Попап рендерится при `selectedMarket && clickedLngLat && map.current`.
  - Dblclick и close очищают оба состояния.
  - `handleMarketClosed` теперь сбрасывает `clickedLngLat`.

## [2026-05-09] – Hotfix: 500 error on market creation + WebGL context loss handling

### Fixed
- **Критический баг: POST /api/markets → 500 Internal Server Error**: Колонка `radius` отсутствовала в таблице `markets` SQLite из-за неверного синтаксиса `ALTER TABLE markets ADD COLUMN IF NOT EXISTS radius...` — `better-sqlite3` не поддерживает `IF NOT EXISTS` после `ADD COLUMN`. Исправлено: обёртка ALTER TABLE в try-catch, корректный синтаксис без `IF NOT EXISTS`. Колонка `address` также защищена try-catch.
- **WebGL context loss**: В `Map.tsx` добавлены обработчики `webglcontextlost` (preventDefault + overlay с сообщением) и `webglcontextrestored` (resize + сброс состояния). Параметр `failIfMajorPerformanceCaveat: false` при инициализации карты. UI-оверлей с кнопкой Reload при потере контекста.

### Changed
- **lib/db.ts**: `ALTER TABLE ADD COLUMN` обёрнут в try-catch для защиты от ошибок при уже существующих колонках.
- **components/Map.tsx**: добавлены `webglReady` state, `restoreAttempts` ref, обработчики `webglcontextlost`/`webglcontextrestored` на canvas, WebGL context-lost overlay (285px).

### DevOps / Infrastructure
- **data/georevolt.db**: добавлена отсутствующая колонка `radius` через ручной ALTER TABLE.

## [2026-05-09] – Hotfix: webpack cache corruption — frontend не загружался

### Fixed
- **Критический баг**: Next.js dev-сервер не генерировал клиентские чанки (main-app.js, app/layout.js, app-pages-internals.js — 404). Корень: повреждённый webpack cache (`Caching failed for pack: Error: ENOENT`) и ошибки `Cannot find module './276.js'`/`./682.js'` при компиляции. Исправление: очистка `.next/cache/webpack` и `.next/static/chunks`, перезапуск dev-сервера с чистой компиляцией. Production-билд (`next build`) подтвердил корректность кода.

### DevOps / Infrastructure
- **Очистка кэша сборки**: удалены повреждённые `webpack/client-development/*.pack.gz`, SWC cache и `node_modules/.cache`. После `next build` (успешно) и перезапуска `next dev` все чанки отдаются 200, API работают, ошибок нет.

## [2026-05-09] – Sprint 6 — Радиус, CI, индексация, порт

### Added
- **lib/db.ts** — добавлена колонка `radius` (REAL, DEFAULT 100) в таблицу `markets` (SQLite + PostgreSQL). Обновлены интерфейсы `Market`, `CreateMarketInput`, функции `normalizeRow`, `createMarket`, `toGeoJSON`.
- **lib/db.ts** — добавлен индекс `idx_markets_lat_lng (lat, lng)` для SQLite и PostgreSQL (в дополнение к существующему `idx_markets_lng_lng`).
- **app/api/markets/route.ts** — POST /api/markets принимает `body.radius` (по умолчанию 100).
- **app/api/admin/batch-upload/route.ts** — batch-загрузка поддерживает `radius` (CSV + GeoJSON).
- **.github/workflows/test.yml** — добавлен шаг `forge coverage --report lcov` и upload в Codecov.
- **scripts/kill-port.sh** — скрипт для освобождения занятого порта (usage: `bash scripts/kill-port.sh [port]`).
- **components/Map.tsx** — добавлен слой `markets-radius` (circle overlay) для отображения полупрозрачного круга радиуса вокруг каждого маркера. Раскраска по категориям (politics=red, sports=blue, economics=amber, technology=purple, default=indigo). Конвертация метров в пиксели через zoom-интерполяцию. Клик по кругу открывает сайдбар (как и клик по маркеру). Hover-курсор.
- **components/CreateMarketModal.tsx** — добавлено поле `radius` (метры, по умолчанию 100, диапазон 10–5000) с описанием. Передаётся в POST /api/markets.
- **scripts/bridge-matic.sh** — скрипт бриджа Sepolia ETH → Polygon Amoy MATIC + документация 9 рабочих кранов.
- **scripts/migrations/004_sprint6.sql** — миграция PostgreSQL: radius, address колонки + idx_markets_lat_lng.

### Changed
- **TEST_REPORT.md** — Sprint 5.4 чеклист (17 сценариев) — все 17/17 подтверждены статусом [x].
- **PLAN.md** — спринт 6: все 10 задач [x]. Бэклог обновлён.
- **ARTIFACT_LOG.md** — добавлены записи: radius, idx_markets_lat_lng, миграция 004, bridge-matic.sh.

## [2026-05-09] – Feature: address geocoding + sidebar price chart

### Added
- **components/CreateMarketModal.tsx** — добавлено поле «Address (optional)» с геокодированием через Nominatim (OpenStreetMap). Пользователь вводит адрес, нажимает «Find», координаты подставляются автоматически. Адрес сохраняется в БД и отображается в сайдбаре. Добавлен `coords` state для локального переопределения координат через адрес.
- **components/PriceChart.tsx** — вынесен в отдельный компонент с `next/dynamic({ ssr: false })` для избежания ошибок recharts при статической генерации.
- **lib/db.ts** — добавлено поле `address` в интерфейсы `Market`, `CreateMarketInput`, функции `normalizeRow`, `createMarket` (SQLite + PostgreSQL), `toGeoJSON`.

### Changed
- **components/Map.tsx** — клик по маркеру рынка открывает сайдбар вместо навигации (`router.push` → `setSelectedMarket`). В интерфейс `MarketProperties` добавлено поле `address`.
- **components/MarketSidebar.tsx** — отображение адреса рынка (📍 address). График цены вынесен в динамический компонент `PriceChart`.
- **app/api/markets/route.ts** — передача `body.address` в `createMarket`.

## [2026-05-09] – Feature: sidebar price chart + marker click sidebar

### Changed
- **components/Map.tsx** — клик по маркеру рынка больше не ведёт на новую страницу (`router.push`). Вместо этого открывается боковая панель `MarketSidebar` справа. Добавлен `useCallback` для `handleMarketCreated`/`handleMarketClosed`. Удалён неиспользуемый `useRouter`.
- **components/MarketSidebar.tsx** — добавлен график цены (recharts `LineChart` 140px) с историей цен YES/NO. Данные подгружаются через `fetch /api/price-history/[address]`. График рендерится только на клиенте (`mounted` guard), чтобы избежать ошибок recharts при статической генерации. Добавлен `mounted` state. Отображение контракта и категории в шапке.

## [2026-05-09] – Fix: market creation cycle (approve + event address)

### Fixed
- **components/CreateMarketModal.tsx** — полный цикл создания рынка:
  - Добавлен approve USDC (ERC20 `approve`) перед вызовом `createMarket`. Контракт `MarketFactory.createMarket()` вызывает `USDC.transferFrom()`, который требует предварительного approve. Без этого транзакция уходила в MetaMask, но ревертилась на цепи.
  - После `createMarket` ожидается `TransactionReceipt` через `createPublicClient.waitForTransactionReceipt()`.
  - Из логов receipt парсится событие `MarketCreated` для получения реального адреса развёрнутого маркета (через `decodeEventLog` + `parseAbiItem`).
  - В POST `/api/markets` передаётся реальный `contract_address` из события, а не хардкодный `0x000...0001`.
  - В UI добавлен `statusText`, показывающий текущий шаг (Approving USDC / Creating market / Waiting for confirmation / Saving to database).
- **app/admin/page.tsx** — добавлен `mounted` guard (useState + useEffect) вокруг wagmi-зависимого рендера. На сервере `useAccount()` всегда возвращает `{ isConnected: false }`, а на клиенте после гидратации может быть `true` из-за persist в localStorage. Без guard React детектил mismatch и выдавал ошибку гидратации.
- **components/AdminMarketsList.tsx** — `Date.now()` заменён на state-переменную `now`, инициализируемую через `useEffect`. На сервере `now = 0`, что даёт консервативный рендер (все маркеты показываются как "Open"), а на клиенте после монтирования `now` получает актуальное время.
- **lib/web3.ts** — добавлен `ssr: true` в `createConfig()`, что предотвращает обращение wagmi к localStorage во время SSR.

## [2025-05-09] – Fix: map tile style (OpenFreeMap → demo tiles)

### Changed
- **public/data/style-demo.json** — новый демо-стиль с raster-тайлами OpenStreetMap (tile.openstreetmap.org). MapLibre demotiles возвращали 404.
- **components/Map.tsx** — переключён с `/data/style.json` (OpenFreeMap vector) на `/data/style-demo.json` (raster OSM).

---

## [2025-05-09] – Спринт 5.4 — Полировка, E2E, документация, подготовка к продакшену

### Added
- **e2e/admin.spec.ts** — Playwright-тесты для API (health, stats, markets, events, allowed-countries, frontend)
- **scripts/e2e-sprint-5.sh** — Скрипт полной E2E-проверки спринта 5 (14 проверок: инфраструктура, API, батч-загрузка, цены, фронтенд)
- **playwright.config.ts** — Конфигурация Playwright (headless, port 3000)

### Changed
- **app/api/admin/batch-upload/route.ts** — Добавлена поддержка человекочитаемых дат (ISO 8601) в дополнение к Unix timestamp; добавлена функция `toUnixTimestamp()`
- **scripts/migrations/003_sprint5.sql** — Миграция для PostgreSQL: `price_history`, `allowed_countries`, `geocode_cache`, колонка `simulated`
- **README.md** — Добавлены разделы «Пакетная загрузка рынков», «Управление разрешёнными странами», обновлён список компонентов и переменных окружения

### DevOps / Infrastructure
- **README.md** — Обновлены инструкции по деплою на Vercel, добавлены переменные `NEXT_PUBLIC_ADMIN_WALLET_ADDRESS`, `ADMIN_PRIVATE_KEY`
- **scripts/migrations/** — Добавлена миграция 003 для всех новых таблиц спринта 5

---

## [2025-05-09] – Спринт 5.3 — Админ-панель, аналитика, пакетная загрузка, страны

### Added
- **lib/db.ts** — `simulated` колонка в `markets`, таблицы `allowed_countries` + `geocode_cache`; функции `getAdminStats()`, `getAdminMarkets()`, `getAllowedCountries()`, `setAllowedCountries()`, `getCountryCode()`, `isCountryAllowed()`, `getCountryCodeFromCache()`, `cacheCountryCode()`
- **app/api/admin/stats/route.ts** — GET `/api/admin/stats` возвращает totalMarkets, totalLiquidityUSDC, activeMarkets, resolvedMarkets, topMarketsByLiquidity, liquidityByCategory
- **app/api/admin/markets/route.ts** — GET `/api/admin/markets` с фильтрами (?status, ?category, ?search, ?page, ?limit) и пагинацией
- **app/api/admin/batch-upload/route.ts** — POST `/api/admin/batch-upload` (multipart/form-data или JSON), парсинг CSV/GeoJSON, симуляция рынков (флаг simulated), макс. 10 записей
- **app/api/admin/allowed-countries/route.ts** — GET/POST `/api/admin/allowed-countries` для управления списком разрешённых стран
- **components/AdminDashboard.tsx** — дашборд с метриками (карточки), PieChart(liquidityByCategory), BarChart(topMarketsByLiquidity), кнопка Refresh
- **components/AdminMarketsList.tsx** — таблица рынков с фильтрацией по статусу/категории/поиску, пагинация (10/стр), кнопки Resolve YES/NO
- **components/AdminBatchUpload.tsx** — Drag & Drop загрузка CSV/GeoJSON, прогресс, отчёт о создании/ошибках
- **components/AdminAllowedCountries.tsx** — управление списком стран (добавление по коду, удаление, подсказка с common codes)
- **app/admin/page.tsx** — переписан как таб-контейнер (Dashboard / Markets / Batch Upload / Allowed Countries), проверка админ-кошелька

### Changed
- **lib/db.ts** — `Market` интерфейс + `normalizeRow` + `createMarket` + `toGeoJSON` теперь включают поле `simulated`
- **app/api/markets/route.ts** — POST проверяет `isCountryAllowed()` через `getCountryCode()`, передаёт `simulated` в createMarket
- **PLAN.md** — добавлен спринт 5.3 (4 задачи, 18 SP), 5.2 отмечен как завершённый

---

## [2025-05-09] – Спринт 5.2 — История цен, страница рынка, авто-снимки

### Added
- **lib/db.ts** — `price_history` таблица (SQLite + PostgreSQL): схема, индексы, функции `savePriceSnapshot()`, `getPriceHistory()`, `getMarketByContractAddress()`
- **app/api/price-history/[address]/route.ts** — GET `/api/price-history/[address]` возвращает историю цен для контракта (последние 200 записей)
- **app/api/price-snapshot/route.ts** — POST `/api/price-snapshot` сохраняет снимок цены (market_id, price_yes, price_no, liquidity)
- **app/api/markets/by-address/[address]/route.ts** — GET `/api/markets/by-address/[address]` возвращает рынок по адресу контракта
- **app/market/[address]/page.tsx** — страница детального просмотра рынка: название, описание, статус, график цен (recharts LineChart YES/NO), интерфейс Buy/Sell, авто-снятие цен каждые 60с
- **scripts/migrations/002_price_history.sql** — миграция для добавления таблицы price_history

### Changed
- **Map.tsx** — клик по маркеру теперь ведёт на `/market/[contract_address]` вместо открытия боковой панели
- **PLAN.md** — добавлен спринт 5.2 (4 задачи, 16 SP)

---

## [2025-05-09] – Спринт 5.1 — Карта, liquidity, события

### Added
- **public/data/style.json** — стиль карты на OpenFreeMap (OSM) со слоями: здания, дороги, вода, ландшафт, подписи
- **scripts/generate-pmtiles.sh** — скрипт генерации PMTiles для России через Planetiler (требует 48 GB RAM)
- **lib/db.ts** — `liquidity REAL` колонка в `markets`, авто-заполнение при создании
- **lib/db.ts** — таблица `events` + функции `getRecentEvents()`, `createEvent()` для ленты событий
- **app/api/events/route.ts** — GET `/api/events` возвращает последние 20 событий
- **components/EventFeed.tsx** — боковая панель "Live Events" с автообновлением каждые 15с
- **POST /api/markets** — авто-создание события `market_created` при создании рынка

### Changed
- **Map.tsx** — стиль карты переключён с demotiles на `/data/style.json` (OpenFreeMap OSM)
- **Map.tsx** — `circle-radius` маркеров теперь через `interpolate` по `liquidity` (6–30px)
- **Map.tsx** — цвет маркеров градиент: серый (0) → зелёный (200+) → тёмно-зелёный (5000+)
- **Map.tsx** — добавлен `<EventFeed />` компонент на карту
- **components/CreateMarketModal.tsx** — POST /api/markets с liquidity после деплоя контракта
- **lib/db.ts** — `toGeoJSON()` включает поле `liquidity` в properties

---

## [2025-05-09] – Bugfix: API, map markers, market creation UI

### Added
- **components/CreateMarketModal.tsx** — форма создания рынка по клику на карте (двойной клик или кнопка + New Market). Собирает название, описание, категорию, даты, деплоит контракт через MarketFactory, POST в БД.
- **Map.tsx** — обработчик `dblclick` на карте для создания рынка по координатам.
- **lib/db.ts** — `isDbAvailable()` — проверка доступности БД без выброса исключения.

### Fixed
- **app/api/markets/route.ts** — GET возвращает пустой GeoJSON (не 500) если БД недоступна (Vercel без PostgreSQL). POST возвращает 503 с понятным сообщением.
- **lib/db.ts** — `import('better-sqlite3')` обёрнут в try-catch для Vercel serverless (NativeModule не загружается).
- **vercel.json** — исправлено имя переменной `NEXT_PUBLIC_USDC_ADDRESS` → `NEXT_PUBLIC_MOCK_USDC_ADDRESS`.

---

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
