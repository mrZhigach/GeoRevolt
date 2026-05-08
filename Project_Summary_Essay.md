## Интеграция платформы предсказаний (Polymarket‑like) с интерактивной картой (WorldMonitor‑style)

Вы формулируете задачу синтеза двух систем:
1. **Рынки предсказаний** – децентрализованная биржа ставок на бинарные исходы (Да/Нет) с использованием USDC и AMM‑пулов.
2. **Геопространственная карта** – полностью автономная карта с детализацией до зданий и адресов, на которой отображаются пользовательские объекты.

**Интеграционная идея:** каждый объект на карте является **рынком предсказаний**. Пользователь может кликнуть на точку, увидеть текущие цены исходов (YES/NO) и сделать ставку (купить токен исхода). Создание нового рынка происходит через клик по карте – форма создания привязывается к координатам, после деплоя смарт‑контракта объект появляется на карте.

Ниже представлена **модифицированная архитектура** и **план реализации MVP**, объединяющий лучшие практики из обеих спецификаций.

---

## 1. Общая концепция MVP

- **Пользователь** подключает кошелёк (MetaMask, сеть Polygon Amoy).
- **Карта** (MapLibre GL JS + PMTiles) показывает фоновую подложку мира / России с детализацией до адресов.
- На карте отображаются **маркеры рынков** – точки, созданные пользователями. Каждый маркер = смарт‑контракт `Market`.
- При клике на маркер открывается попап или боковая панель с:
  - названием рынка, описанием, датами,
  - текущей ценой YES и NO (из резервов AMM‑пула),
  - формой покупки токенов (ввести сумму USDC, выбрать исход),
  - информацией о вашей позиции (баланс токенов),
  - кнопкой "Продать" (обменять токены обратно на USDC через пул).
- **Создание рынка**: пользователь кликает на карте → появляется форма с полями: название, описание, дата окончания ставок, дата разрешения, категория (цвет маркера), начальная ликвидность (опционально). После отправки:
  - фронт вызывает `MarketFactory.createMarket(...)` – деплоится новый `Market` контракт с двумя токенами (YES/NO) и внутренним Uniswap V2‑подобным пулом.
  - бэкенд сохраняет в БД запись: `{ marketId, contractAddress, lat, lng, name, description, category }`.
- **Разрешение рынка**: только владелец платформы (админ) через админ‑панель выбирает рынок на карте или из списка и вызывает `resolveMarket(marketId, outcome)` на контракте.
- **Выплата выигрышей**: пользователи вызывают `redeem()` в своём кошельке после разрешения.

---

## 2. Технический стек (объединённый)

| Компонент            | Выбор                          | Причина                                                                 |
|----------------------|--------------------------------|-------------------------------------------------------------------------|
| **Фронтенд**         | Next.js 14 (App Router)        | Серверный рендеринг списка рынков, API routes, простое развёртывание    |
| **Картографический движок** | MapLibre GL JS v4 + `pmtiles` | Полностью открытый, поддерживает векторные тайлы, не требует API‑ключей |
| **Стиль карты**      | Dark theme (кастомный style.json на базе OpenMapTiles Dark Matter) | Цель – аналитическая "тёмная" эстетика, как в worldmonitor.app          |
| **Блокчейн**         | Polygon Amoy (тестнет) → мейннет | Низкие комиссии, USDC нативен                                           |
| **Смарт‑контракты**  | Solidity + Foundry              | OpenZeppelin, Uniswap V2‑подобный AMM внутри каждого рынка              |
| **Бэкенд**           | Next.js API Routes + SQLite     | Хранение гео‑метаданных, списка рынков, без внешних зависимостей        |
| **Взаимодействие с web3** | wagmi v2 + viem              | Хуки чтения/записи, управление транзакциями                              |
| **UI библиотека**    | shadcn/ui + TailwindCSS         | Быстрая сборка компонентов (попапы, формы, админ‑панель)                |

**Отказ от ненужного:** книга ордеров, децентрализованный оракул, условные токены ERC‑1155, AI‑генерация.

---

## 3. Модификация смарт‑контрактов (под AMM и рынок)

Используем упрощённую модель **Uniswap V2 внутри каждого рынка** – пул из трёх активов: `USDC`, `YES`, `NO`.  
Пользователь покупает YES – отправляет USDC в пул, получает YES по текущей цене (формула `x*y=k`). Продажа – обратный обмен.  
При разрешении выигравший токен становится "погашаемым" (можно обменять на долю USDC из пула).

### Контракт `Market.sol` (основные функции)

```solidity
contract Market {
    IERC20 public usdc;          // USDC адрес (Polygon)
    string public name;
    string public description;
    uint256 public endTime;      // время окончания приёма ставок
    uint256 public resolutionTime;
    bool public resolved;
    bool public outcome;         // true = YES выиграл, false = NO выиграл

    // Uniswap V2 стиль: резервы
    uint256 public reserveUSDC;
    uint256 public reserveYES;
    uint256 public reserveNO;

    uint256 public constant FEE = 30; // 0.3% (30 / 10000)
    address public feeTo;        // казначейский кошелёк

    mapping(address => uint256) public balanceYES;
    mapping(address => uint256) public balanceNO;

    event Bought(address indexed buyer, bool isYes, uint256 usdcIn, uint256 tokensOut);
    event Sold(address indexed seller, bool isYes, uint256 tokensIn, uint256 usdcOut);
    event Resolved(bool outcome);

    constructor(address _usdc, string memory _name, string memory _desc, 
                uint256 _endTime, uint256 _resolutionTime, address _feeTo) {
        usdc = IERC20(_usdc);
        name = _name;
        description = _desc;
        endTime = _endTime;
        resolutionTime = _resolutionTime;
        feeTo = _feeTo;
        // Начальная ликвидность может быть добавлена создателем через отдельную функцию
    }

    // Покупка токена (YES или NO) за USDC
    function buy(bool isYes, uint256 usdcAmount) external {
        require(block.timestamp < endTime, "Betting closed");
        require(!resolved, "Already resolved");
        usdc.transferFrom(msg.sender, address(this), usdcAmount);

        uint256 reserveSrc = isYes ? reserveYES : reserveNO;
        uint256 reserveDst = isYes ? reserveNO : reserveYES;

        uint256 tokensOut = getAmountOut(usdcAmount, reserveUSDC, reserveSrc);
        require(tokensOut > 0, "Insufficient liquidity");

        // Обновляем резервы (с комиссией)
        uint256 feeAmount = (usdcAmount * FEE) / 10000;
        uint256 usdcAfterFee = usdcAmount - feeAmount;
        reserveUSDC += usdcAfterFee;
        if (isYes) {
            reserveYES += tokensOut;
            balanceYES[msg.sender] += tokensOut;
        } else {
            reserveNO += tokensOut;
            balanceNO[msg.sender] += tokensOut;
        }
        // Отправляем комиссию на feeTo
        usdc.transfer(feeTo, feeAmount);

        emit Bought(msg.sender, isYes, usdcAmount, tokensOut);
    }

    // Продажа токена обратно в пул
    function sell(bool isYes, uint256 tokenAmount) external {
        require(!resolved, "Market resolved, use redeem()");
        uint256 userBalance = isYes ? balanceYES[msg.sender] : balanceNO[msg.sender];
        require(userBalance >= tokenAmount, "Insufficient balance");

        uint256 reserveSrc = isYes ? reserveYES : reserveNO;
        uint256 usdcOut = getAmountOut(tokenAmount, reserveSrc, reserveUSDC);
        require(usdcOut > 0, "Slippage too high");

        // Уменьшаем баланс пользователя, сжигаем токены (упрощённо – просто уменьшаем баланс)
        if (isYes) {
            balanceYES[msg.sender] -= tokenAmount;
            reserveYES -= tokenAmount;
        } else {
            balanceNO[msg.sender] -= tokenAmount;
            reserveNO -= tokenAmount;
        }
        reserveUSDC -= usdcOut;
        usdc.transfer(msg.sender, usdcOut);

        emit Sold(msg.sender, isYes, tokenAmount, usdcOut);
    }

    // Разрешение рынка (только owner фабрики или владелец платформы)
    function resolve(bool _outcome) external onlyOwner {
        require(block.timestamp >= resolutionTime, "Too early");
        require(!resolved, "Already resolved");
        resolved = true;
        outcome = _outcome;
        emit Resolved(_outcome);
    }

    // Получение выигрыша после разрешения
    function redeem() external {
        require(resolved, "Not resolved yet");
        uint256 winningBalance = outcome ? balanceYES[msg.sender] : balanceNO[msg.sender];
        require(winningBalance > 0, "No winning tokens");

        // Доля пользователя в пуле USDC пропорциональна его доле в выигравшем резерве
        uint256 winningReserve = outcome ? reserveYES : reserveNO;
        uint256 totalWinningSupply = winningReserve; // упрощённо: токены не сжигаем, но можно
        uint256 userShare = (winningBalance * reserveUSDC) / totalWinningSupply;

        // Обнуляем баланс, сжигаем токены (или просто обнуляем)
        if (outcome) {
            balanceYES[msg.sender] = 0;
            // уменьшаем резерв YES (необязательно)
        } else {
            balanceNO[msg.sender] = 0;
        }
        reserveUSDC -= userShare;
        usdc.transfer(msg.sender, userShare);
    }

    // Вспомогательная функция расчёта (x*y=k)
    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) internal pure returns (uint256) {
        uint256 amountInWithFee = amountIn * (10000 - FEE) / 10000;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = reserveIn + amountInWithFee;
        return numerator / denominator;
    }
}
```

**Фабрика `MarketFactory.sol`** – деплоит новые рынки, хранит список адресов.

---

## 4. Бэкенд: хранение геоданных рынков

**API endpoints (Next.js, папка `app/api/`):**

- `GET /api/markets` – возвращает GeoJSON FeatureCollection всех рынков с полями: `id`, `contractAddress`, `lng`, `lat`, `name`, `category`, `status` (open/closed/resolved).
- `POST /api/markets` – создаёт новый рынок в БД (после успешного деплоя контракта на клиенте). Тело: `{ contractAddress, lng, lat, name, description, category, endTime, resolutionTime }`.
- (опционально) `GET /api/markets/:id` – детали.
- Админские эндпоинты для разрешения (можно напрямую через контракт, но для списка удобно хранить resolved статус).

**База данных (SQLite) – таблица `markets`:**
```sql
CREATE TABLE markets (
    id INTEGER PRIMARY KEY,
    contract_address TEXT UNIQUE,
    name TEXT,
    description TEXT,
    category TEXT,
    lng REAL,
    lat REAL,
    end_time INTEGER,
    resolution_time INTEGER,
    resolved BOOLEAN DEFAULT 0,
    outcome BOOLEAN
);
```

При разрешении контракта админ также обновляет `resolved/outcome` в БД для быстрой фильтрации на карте.

---

## 5. Фронтенд: интеграция карты и рынков

### 5.1. Картографическая подложка (PMTiles)

- Генерация файла `russia-detail.pmtiles` (или мир) через Planetiler.
- Размещение в `public/data/russia-detail.pmtiles`.
- Создание `public/style.json` (тёмный стиль), указывающего источник `pmtiles:///data/russia-detail.pmtiles`.
- Инициализация MapLibre с протоколом `pmtiles`.

```typescript
// app/components/Map.tsx
import maplibregl from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import { useEffect, useRef } from 'react';

const protocol = new Protocol();
maplibregl.addProtocol('pmtiles', protocol.tile);

export function Map({ onMapClick, onMarketClick }) {
  const mapContainer = useRef(null);
  const map = useRef(null);

  useEffect(() => {
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: '/style.json',
      center: [95, 62],
      zoom: 3,
    });
    map.current.on('load', () => {
      // слой с маркерами рынков будет добавлен динамически
    });
    map.current.on('click', (e) => onMapClick(e.lngLat));
    return () => map.current.remove();
  }, []);

  // Добавление слоя GeoJSON с рынками
  const updateMarkers = (geoJson) => {
    const mapIns = map.current;
    if (mapIns.getSource('markets')) mapIns.removeSource('markets');
    mapIns.addSource('markets', { type: 'geojson', data: geoJson });
    if (!mapIns.getLayer('markets-layer')) {
      mapIns.addLayer({
        id: 'markets-layer',
        type: 'circle',
        source: 'markets',
        paint: {
          'circle-radius': 8,
          'circle-color': ['match', ['get', 'category'],
            'sport', '#0EA5E9',
            'politics', '#A855F7',
            'crypto', '#14B8A6',
            '#F97316'
          ],
          'circle-opacity': 0.85,
        },
      });
      mapIns.on('click', 'markets-layer', (e) => onMarketClick(e.features[0].properties));
    }
  };

  return <div ref={mapContainer} style={{ width: '100%', height: '100vh' }} />;
}
```

### 5.2. Загрузка рынков и отображение на карте

При загрузке страницы вызываем `fetch('/api/markets')`, получаем GeoJSON и передаём в `updateMarkers`.

```typescript
useEffect(() => {
  fetch('/api/markets')
    .then(res => res.json())
    .then(geojson => updateMarkers(geojson));
}, []);
```

### 5.3. Создание нового рынка через клик на карте

- При клике на карту открывается модальное окно с формой.
- Пользователь вводит: название, описание, даты, категорию.
- После подтверждения:
  - Фронт вызывает `useContractWrite` на `MarketFactory.createMarket(...)` с параметрами (название, описание, endTime, resolutionTime).
  - После получения `tx.wait()` и адреса нового контракта (из события `MarketCreated`), отправляем `POST /api/markets` с адресом контракта и координатами клика.
  - Обновляем слой карты (перезагружаем GeoJSON).

### 5.4. Торговля (ставки) через боковую панель

При клике на маркер открывается `Sheet` (shadcn/ui) или `Sidebar`, в которой отображаются данные рынка:

- Название, описание.
- Текущие цены YES/NO: вычисляются как `priceYES = reserveUSDC / reserveYES`, `priceNO = reserveUSDC / reserveNO` (в USDC за токен).
- Кнопки "Купить YES", "Купить NO" с полем ввода суммы USDC.
- Кнопка "Продать" для каждого токена (если баланс > 0).

Все операции через wagmi хуки `useWriteContract` с контрактом `Market`.

```typescript
const { writeContract: buy } = useWriteContract();
const handleBuy = (isYes, usdcAmount) => {
  // Предварительно approve USDC
  buy({
    address: marketContractAddress,
    abi: marketAbi,
    functionName: 'buy',
    args: [isYes, parseUnits(usdcAmount, 6)], // USDC имеет 6 decimals
  });
};
```

Обновление цен и балансов через `useReadContract` каждые 10 секунд или через WebSocket (опционально).

### 5.5. Админ-панель (разрешение)

- Отдельная страница `/admin` (защищена: проверка `useAccount` на админский кошелёк).
- Список всех рынков с кнопкой "Resolve" для неразрешённых.
- При нажатии: вызывается `resolveMarket(marketId, outcome)` на контракте, затем обновляется БД.

---

## 6. Генерация картографических данных (PMTiles) – кратко

Для обеспечения полной автономности без API‑ключей:

```bash
# Установка Planetiler
git clone https://github.com/onthegomap/planetiler.git
cd planetiler
./planetiler assembly

# Скачать данные OpenStreetMap для региона Россия (или всю планету)
# Используем --area=russia (специальная опция planetiler)
java -jar planetiler.jar --download --area=russia --output=russia-detail.pmtiles
```

Полученный файл `russia-detail.pmtiles` (≈30–50 GB) кладём в `public/data/`. В `style.json` указываем источник:

```json
"sources": {
  "openmaptiles": {
    "type": "vector",
    "url": "pmtiles:///data/russia-detail.pmtiles"
  }
}
```

**Важно:** Nginx должен корректно отдавать большие файлы с поддержкой `Range` (по умолчанию включено).

---

## 7. Пользовательские сценарии (последовательность)

1. Пользователь заходит на сайт, подключает кошелёк.
2. Видит карту с точками существующих рынков (например, "Будет ли биткоин > $70k к 1 июня?" – точка в Москве).
3. Кликает на точку, видит текущие цены: YES = 0.65 USDC, NO = 0.35 USDC. Покупает YES на 10 USDC → получает ~15.38 YES токенов.
4. Если цена YES выросла до 0.8, продает обратно в пул за USDC (фиксирует прибыль).
5. Когда наступает дата разрешения, админ нажимает "Resolve" в админке, выбирает исход YES. Контракт переводит все USDC из пула держателям YES пропорционально.
6. Пользователь заходит на страницу рынка и вызывает `redeem`, получая USDC.

**Создание нового рынка:**
- Кликает на карте (например, вблизи Екатеринбурга). Заполняет форму: "Завершится ли строительство завода 'ХимПром' до конца 2025?".
- После деплоя контракта точка появляется на карте для всех.

---

## 8. Файловая структура проекта (Next.js)

```
app/
  (map)/page.tsx          # карта со списком рынков
  create/page.tsx         (альтернативно – модалка)
  admin/page.tsx          # админ-панель
  api/
    markets/
      route.ts            # GET (список GeoJSON), POST
      [id]/route.ts       # GET (детали)
components/
  Map.tsx
  MarketSidebar.tsx
  CreateMarketForm.tsx
  AdminPanel.tsx
contracts/
  src/
    Market.sol
    MarketFactory.sol
  script/
    Deploy.s.sol
public/
  data/
    russia-detail.pmtiles
  style.json
  fonts/
  sprites/
```

---

## 9. Этапы реализации (для команды AI)

1. **Подготовка среды** – Next.js + Foundry + локальный тестнет Anvil.
2. **Написание контрактов** `Market.sol` и `MarketFactory.sol`, покрытие тестами.
3. **Деплой на Polygon Amoy**, запись адресов в `.env.local`.
4. **Бэкенд** – API маршруты `/api/markets`, SQLite модель.
5. **Фронт: карта** – инициализация MapLibre + PMTiles, слой маркеров.
6. **Фронт: подключение к контрактам** – wagmi hooks для покупки/продажи, создания рынка.
7. **Интеграция создания рынка** – клик на карте → форма → деплой → запись в БД.
8. **Админ-панель** – разрешение рынков, обновление БД.
9. **UI/UX** – стилизация под тёмную тему (shadcn/ui + tailwind).
10. **Тестирование end‑to‑end** – покупка, продажа, разрешение, клейм.

---

## 10. Безопасность и ограничения MVP

- **Только администратор** может разрешать рынки – централизованный оракул.
- **AMM пул** требует начальной ликвидности. Если создатель не добавляет ликвидность, первый покупатель должен сделать swap (но пул будет пуст). Решение: при создании рынка создатель обязательно вносит минимальную ликвидность (например, 100 USDC + 100 YES + 100 NO). Это можно зашить в фабрику.
- **Риск реентранси** – в `redeem()` используется `transfer` после обнуления баланса, защита есть.
- **Разрешение дат** – проверяем `endTime` и `resolutionTime` на уровне контракта.
- **Комиссия платформы** – 0.3% от each swap отправляется на `feeTo`.

---

**Финальный продукт:** пользователь видит карту мира с высокой детализацией, на которой разбросаны "рынки предсказаний". Кликая на любой, он может купить или продать токены исхода, как в Polymarket, но в привязке к геолокации события. Создание нового рынка интуитивно – просто ткните в место на карте, заполните описание события. Вся система работает без внешних картографических сервисов и полностью автономна.

Именно такой синтез двух идей был запрошен.
