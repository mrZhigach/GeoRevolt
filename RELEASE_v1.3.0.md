# GeoRevolt v1.3.0 — Dashboard Redesign

## 🚀 Новые возможности

### 🌐 Глобальная навигация
- Полностью переработанный Header: гамбургер-меню (Sheet), глобальный поиск, переключатель темы (тёмная/светлая), выбор языка (заглушка), профиль/кошелёк с балансом
- Desktop-навигация: Map, Markets List, Admin
- Мобильное адаптивное меню

### 🔄 Переключение между картой и списком
- Компонент **ViewToggle** — две кнопки "Map" / "List" с состоянием в URL (`?view=map` или `?view=list`)
- Режим **List**: грид карточек рынков (3 колонки → 1 на мобильном), категорийный фильтр, поиск, пагинация "Load More"
- Каждая карточка: категория, название, локация, ликвидность, прогресс-бар цен YES/NO, кнопки быстрой покупки
- API пагинации: GET `/api/markets` с параметрами `page`, `limit`, `category`, `search`

### 💬 Система комментариев
- Новая таблица `comments` в БД (SQLite + PostgreSQL)
- API: GET/POST `/api/markets/by-address/[address]/comments`, DELETE `/api/comments/[id]`
- Древовидные комментарии с вложенными ответами на странице `/market/[address]` (вкладка "Discussions")
- Аватар (shadcn/Avatar), обрезанный адрес кошелька, форма нового комментария, кнопки Reply/Delete

### 👑 Админ-панель нового поколения
- **Dashboard**: 4 метрические карточки (Total Markets, Total Liquidity, Active, Resolved), PieChart (Liquidity by Category), BarChart (Top Markets), LineChart (Daily Activity), Category Summary с прогресс-барами
- **Batch Upload**: прогресс-бар загрузки, улучшенный отчёт с визуализацией успехов/ошибок
- **Allowed Countries**: стильные badges, кликабельные коды стран, сообщения об успехе/ошибке

### 📱 Мобильная адаптация
- Адаптивный дизайн 320px–1280px
- Карта на всю ширину экрана на мобильных
- Одна колонка в списке рынков
- EventFeed скрыт на мобильных

## 🧪 Тестирование
- 15 новых Playwright E2E-тестов
- Все 49 Foundry-тестов PASS
- Все 12 Jest API-тестов PASS
- `next build` — PASS

## 📦 Установленные shadcn/ui компоненты
dropdown-menu, tabs, avatar, progress, separator, badge, switch, scroll-area

## 🛠 Технические детали
- **Ветка**: `feature/dashboard-redesign`
- **Спринт**: 8 (40 Story Points)
- **Изменено файлов**: 36 (3251 добавлено, 430 удалено)
