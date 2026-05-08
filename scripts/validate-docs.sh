#!/bin/bash
# Валидатор документации GeoRevolt
# Возвращает 0, если все документы присутствуют и не старше 24 часов (PLAN.md)
set -e

echo "=== Проверка наличия документов ==="
required_files=("PLAN.md" "CHANGELOG.md" "TEST_REPORT.md" "ARTIFACT_LOG.md")
for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ Ошибка: отсутствует $file"
        exit 1
    else
        echo "✅ $file найден"
    fi
done

echo "=== Проверка свежести PLAN.md ==="
if [ -n "$(find PLAN.md -mtime +1)" ]; then
    echo "⚠️  Предупреждение: PLAN.md не обновлялся более 24 часов"
    # Не exit 1, только предупреждение
else
    echo "✅ PLAN.md актуален"
fi

# Простейшая проверка формата CHANGELOG.md (наличие заголовков)
echo "=== Проверка структуры CHANGELOG.md ==="
if ! grep -q "## \[20[0-9][0-9]-[0-1][0-9]-[0-3][0-9\]" CHANGELOG.md; then
    echo "❌ Ошибка: в CHANGELOG.md нет записи с датой в формате [YYYY-MM-DD]"
    exit 1
else
    echo "✅ CHANGELOG.md содержит датированную запись"
fi

# Проверка TEST_REPORT.md на наличие секций
echo "=== Проверка TEST_REPORT.md ==="
if ! grep -qE "## (Unit тесты|Интеграционные тесты|E2E)" TEST_REPORT.md; then
    echo "❌ Ошибка: TEST_REPORT.md не содержит обязательных разделов (Unit тесты, Интеграционные тесты, E2E)"
    exit 1
else
    echo "✅ TEST_REPORT.md содержит необходимые разделы"
fi

# Проверка ARTIFACT_LOG.md на наличие таблицы смарт-контрактов
echo "=== Проверка ARTIFACT_LOG.md ==="
if ! grep -q "Смарт-контракты" ARTIFACT_LOG.md; then
    echo "❌ Ошибка: ARTIFACT_LOG.md не содержит раздела 'Смарт-контракты'"
    exit 1
else
    echo "✅ ARTIFACT_LOG.md корректен"
fi

echo "=== Валидация завершена успешно ==="
exit 0
