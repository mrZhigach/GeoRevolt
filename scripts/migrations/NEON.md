# Применение миграций PostgreSQL на Neon

Neon — serverless PostgreSQL. Поддерживает стандартные SQL-миграции через `psql`.

## Способ 1: через psql (рекомендуется)

```bash
# Установить DATABASE_URL из панели Neon → Connection Details → PSQL
DATABASE_URL="postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/georevolt?sslmode=require"

# Применить все миграции
psql "$DATABASE_URL" -f scripts/migrations/003_sprint5.sql
```

## Способ 2: через скрипт-раннер

```bash
bash scripts/run-migrations.sh "$DATABASE_URL"
```

## Способ 3: через Neon Console

1. Откройте [Neon Console](https://console.neon.tech)
2. Выберите проект → **SQL Editor**
3. Скопируйте содержимое `scripts/migrations/003_sprint5.sql`
4. Вставьте и выполните

## Что делает миграция 003_sprint5.sql

| Объект | Тип | Описание |
|--------|-----|----------|
| `price_history` | таблица | Снимки цен YES/NO с timestamp |
| `allowed_countries` | таблица | ISO-3166-1 alpha-2 коды для geo-fencing |
| `geocode_cache` | таблица | Кэш reverse geocoding (lat, lng → country) |
| `markets.simulated` | колонка | Флаг симулированного рынка (без on-chain) |

## Проверка

```sql
-- Список таблиц
\dt

-- Структура markets (должна быть колонка simulated + liquidity)
\d markets

-- Новые таблицы
SELECT * FROM price_history LIMIT 5;
SELECT * FROM allowed_countries;
SELECT * FROM geocode_cache LIMIT 5;
```
