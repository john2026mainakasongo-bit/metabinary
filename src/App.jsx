
import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

const API_URL = String(
  import.meta.env.VITE_API_URL ||
    (import.meta.env.DEV ? "http://localhost:5000" : "")
).replace(/\/+$/, "");

const FRONTEND_BUILD = "metabinary-deposit-fix-2026-07-11-v2";

if (typeof window !== "undefined") {
  window.__METABINARY_BUILD__ = FRONTEND_BUILD;
  console.info(`MetaBinary frontend build: ${FRONTEND_BUILD}`);
}

const STORE = {
  user: "mb_user",
  account: "mb_account",
  balances: "mb_balances",
  tx: "mb_transactions",
  positions: "mb_positions",
  closed: "mb_closed_positions",
  referral: "mb_referral_profile",
  notifications: "mb_notifications",
};

const MARKET_API_KEY =
  import.meta.env.VITE_TWELVE_DATA_API_KEY ||
  import.meta.env.VITE_TWELVE_DATA_KEY ||
  "";

const MARKET_CACHE_KEY = "mb_real_market_feed_v1";

const MARKET_OPTIONS = [
  {
    symbol: "XAU/USD",
    label: "Gold",
    category: "Metals",
    apiSymbol: "XAU/USD",
    tradingViewSymbol: "OANDA:XAUUSD",
    decimals: 2,
    priceStep: 0.1,
    spread: 0.2,
    contractSize: 100,
    defaultPrice: 2350,
    slDistance: 8,
    tpDistance: 12,
    alwaysOpen: false,
  },
  {
    symbol: "BTC/USD",
    label: "Bitcoin",
    category: "Crypto",
    apiSymbol: "BTC/USD",
    tradingViewSymbol: "COINBASE:BTCUSD",
    decimals: 2,
    priceStep: 1,
    spread: 10,
    contractSize: 1,
    defaultPrice: 60000,
    slDistance: 500,
    tpDistance: 750,
    alwaysOpen: true,
  },
  {
    symbol: "EUR/USD",
    label: "Euro / US Dollar",
    category: "Forex",
    apiSymbol: "EUR/USD",
    tradingViewSymbol: "OANDA:EURUSD",
    decimals: 5,
    priceStep: 0.0001,
    spread: 0.00012,
    contractSize: 100000,
    defaultPrice: 1.08564,
    slDistance: 0.002,
    tpDistance: 0.003,
    alwaysOpen: false,
  },
  {
    symbol: "GBP/USD",
    label: "British Pound / US Dollar",
    category: "Forex",
    apiSymbol: "GBP/USD",
    tradingViewSymbol: "OANDA:GBPUSD",
    decimals: 5,
    priceStep: 0.0001,
    spread: 0.00015,
    contractSize: 100000,
    defaultPrice: 1.2725,
    slDistance: 0.0025,
    tpDistance: 0.0035,
    alwaysOpen: false,
  },
  {
    symbol: "USD/JPY",
    label: "US Dollar / Japanese Yen",
    category: "Forex",
    apiSymbol: "USD/JPY",
    tradingViewSymbol: "OANDA:USDJPY",
    decimals: 3,
    priceStep: 0.01,
    spread: 0.015,
    contractSize: 100000,
    defaultPrice: 156.2,
    slDistance: 0.3,
    tpDistance: 0.45,
    alwaysOpen: false,
  },
];

const MARKET_BY_SYMBOL = Object.fromEntries(
  MARKET_OPTIONS.map((market) => [market.symbol, market])
);

const MARKETS = MARKET_OPTIONS.map((market) => market.symbol);

const MARKET_TIMEFRAMES = [
  { value: "1min", label: "1 minute", short: "1m", tradingView: "1" },
  { value: "5min", label: "5 minutes", short: "5m", tradingView: "5" },
  { value: "15min", label: "15 minutes", short: "15m", tradingView: "15" },
  { value: "1h", label: "1 hour", short: "1h", tradingView: "60" },
  { value: "4h", label: "4 hours", short: "4h", tradingView: "240" },
  { value: "1day", label: "1 day", short: "1D", tradingView: "D" },
];

const DEFAULT_NOTIFICATIONS = [
  {
    id: "welcome-notification",
    type: "info",
    title: "Welcome to MetaBinary",
    message: "Your trading dashboard is ready.",
    time: "Just now",
    read: false,
    page: "home",
  },
  {
    id: "security-notification",
    type: "security",
    title: "Keep your account secure",
    message: "Review your password and notification settings.",
    time: "Today",
    read: false,
    page: "settings",
  },
  {
    id: "cashier-notification",
    type: "wallet",
    title: "Cashier available",
    message: "Deposit and withdrawal services are available from your wallet.",
    time: "Today",
    read: false,
    page: "history",
  },
];

const BOT_TEMPLATES = [
  {
    id: "bot-1",
    code: "NE",
    name: "Neon Eclipse",
    type: "Even/Odd",
    market: "Volatility 100 (1s) Index",
    stake: 10,
    duration: 5,
    status: "Running",
    profit: 250.75,
    winRate: 72.5,
    trades: 36,
  },
  {
    id: "bot-2",
    code: "QS",
    name: "Quantum Surge",
    type: "Rise/Fall",
    market: "Volatility 75 Index",
    stake: 15,
    duration: 5,
    status: "Stopped",
    profit: 180.4,
    winRate: 68,
    trades: 34,
  },
  {
    id: "bot-3",
    code: "AO",
    name: "Alpha OverUnder",
    type: "Over/Under",
    market: "Volatility 100 Index",
    stake: 10,
    duration: 5,
    status: "Stopped",
    profit: -45,
    winRate: 45,
    trades: 23,
  },
  {
    id: "bot-4",
    code: "MD",
    name: "Matrix Differ",
    type: "Matches/Differs",
    market: "Volatility 50 Index",
    stake: 20,
    duration: 5,
    status: "Stopped",
    profit: -120,
    winRate: 40,
    trades: 20,
  },
];

function readStore(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveStore(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function money(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function readApiResponse(response) {
  const text = await response.text();
  const contentType = response.headers.get("content-type") || "";

  if (!text.trim()) {
    throw new Error(
      `Backend returned an empty response (HTTP ${response.status}).`
    );
  }

  try {
    return JSON.parse(text);
  } catch {
    const preview = text
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 180);

    throw new Error(
      contentType.includes("text/html")
        ? `Backend returned an HTML page instead of JSON (HTTP ${response.status}). Check VITE_API_URL.`
        : `Backend returned invalid JSON (HTTP ${response.status}): ${preview}`
    );
  }
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function initials(name = "JM") {
  return (
    String(name)
      .replace("@gmail.com", "")
      .split(/[ ._-]/)
      .filter(Boolean)
      .slice(0, 2)
      .map((x) => x[0]?.toUpperCase())
      .join("") || "JM"
  );
}

function makePrices(start = 1.08564) {
  let value = start;

  return Array.from({ length: 120 }, (_, i) => {
    value += (Math.random() - 0.48) * 0.00045 + Math.sin(i / 8) * 0.00005;
    return Number(value.toFixed(5));
  });
}

const DIGIT_MIN_PERCENT = 8.5;
const DIGIT_MAX_PERCENT = 13;

function makeInitialDigitStats() {
  return [10.5, 9.8, 11.2, 8.9, 10.1, 9.4, 10.8, 9.7, 10.4, 9.2];
}

function driftDigitStats(values) {
  const next = values.map((value) => Number(Number(value).toFixed(1)));
  const donors = next.map((value, index) => ({ value, index })).filter((item) => item.value > DIGIT_MIN_PERCENT);
  const receivers = next.map((value, index) => ({ value, index })).filter((item) => item.value < DIGIT_MAX_PERCENT);
  if (!donors.length || !receivers.length) return next;
  const donor = donors[Math.floor(Math.random() * donors.length)].index;
  const choices = receivers.filter((item) => item.index !== donor);
  if (!choices.length) return next;
  const receiver = choices[Math.floor(Math.random() * choices.length)].index;
  next[donor] = Number(Math.max(DIGIT_MIN_PERCENT, next[donor] - 0.1).toFixed(1));
  next[receiver] = Number(Math.min(DIGIT_MAX_PERCENT, next[receiver] + 0.1).toFixed(1));
  return next;
}

function digitWinsTrade(trade, digit, closingPrice = 0) {
  if (!trade) return false;
  if (trade.type === "Even/Odd") return trade.action === "Even" ? digit % 2 === 0 : digit % 2 !== 0;
  if (trade.type === "Matches/Differs") return trade.action === "Matches" ? digit === Number(trade.prediction) : digit !== Number(trade.prediction);
  if (trade.type === "Over/Under") return trade.action === "Over" ? digit > Number(trade.prediction) : digit < Number(trade.prediction);
  if (trade.type === "Touch/No Touch") return trade.action === "Touch" ? digit === Number(trade.prediction) : digit !== Number(trade.prediction);
  if (trade.type === "Rise/Fall") return trade.action === "Rise" ? Number(closingPrice) > Number(trade.entryPrice) : Number(closingPrice) < Number(trade.entryPrice);
  return false;
}

function formatMarketPrice(value, marketOrSymbol = "EUR/USD") {
  const market =
    typeof marketOrSymbol === "string"
      ? MARKET_BY_SYMBOL[marketOrSymbol]
      : marketOrSymbol;

  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return "—";

  return number.toLocaleString(undefined, {
    minimumFractionDigits: market?.decimals ?? 5,
    maximumFractionDigits: market?.decimals ?? 5,
  });
}

function parseMarketOpen(value, fallback) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }
  return fallback;
}

function likelyMarketOpen(market, date = new Date()) {
  if (market?.alwaysOpen) return true;

  const day = date.getUTCDay();
  const hour = date.getUTCHours();

  if (day === 6) return false;
  if (day === 5 && hour >= 22) return false;
  if (day === 0 && hour < 22) return false;

  return true;
}

function normalizeMarketQuote(raw, market) {
  const price = Number(raw?.close ?? raw?.price ?? raw?.last ?? raw?.previous_close);
  const previousClose = Number(raw?.previous_close ?? raw?.open ?? price);
  const change = Number(raw?.change ?? (price - previousClose));
  const percentChange = Number(
    raw?.percent_change ??
      (previousClose ? ((price - previousClose) / previousClose) * 100 : 0)
  );

  return {
    price: Number.isFinite(price) ? price : 0,
    previousClose: Number.isFinite(previousClose) ? previousClose : 0,
    open: Number(raw?.open || 0),
    high: Number(raw?.high || 0),
    low: Number(raw?.low || 0),
    change: Number.isFinite(change) ? change : 0,
    percentChange: Number.isFinite(percentChange) ? percentChange : 0,
    isOpen: parseMarketOpen(raw?.is_market_open, likelyMarketOpen(market)),
    updatedAt: raw?.datetime || new Date().toISOString(),
    status: "live",
    error: "",
  };
}

async function fetchMarketQuote(market, signal) {
  if (!MARKET_API_KEY) {
    throw new Error("Live quote key is not configured.");
  }

  const url = new URL("https://api.twelvedata.com/quote");
  url.searchParams.set("symbol", market.apiSymbol);
  url.searchParams.set("apikey", MARKET_API_KEY);

  const response = await fetch(url, { signal });
  const data = await response.json();

  if (!response.ok || data?.status === "error" || data?.code) {
    throw new Error(data?.message || "Unable to load live market quote.");
  }

  return normalizeMarketQuote(data, market);
}

async function fetchMarketCandles(market, timeframe, signal) {
  if (!MARKET_API_KEY) {
    throw new Error("Live candle key is not configured.");
  }

  const url = new URL("https://api.twelvedata.com/time_series");
  url.searchParams.set("symbol", market.apiSymbol);
  url.searchParams.set("interval", timeframe);
  url.searchParams.set("outputsize", "180");
  url.searchParams.set("format", "JSON");
  url.searchParams.set("timezone", "UTC");
  url.searchParams.set("apikey", MARKET_API_KEY);

  const response = await fetch(url, { signal });
  const data = await response.json();

  if (!response.ok || data?.status === "error" || data?.code || !Array.isArray(data?.values)) {
    throw new Error(data?.message || "Unable to load live market candles.");
  }

  return data.values
    .slice()
    .reverse()
    .map((item) => ({
      time: item.datetime,
      open: Number(item.open),
      high: Number(item.high),
      low: Number(item.low),
      close: Number(item.close),
      volume: Number(item.volume || 0),
    }))
    .filter(
      (item) =>
        Number.isFinite(item.open) &&
        Number.isFinite(item.high) &&
        Number.isFinite(item.low) &&
        Number.isFinite(item.close)
    );
}

export default function App() {
  const [user, setUser] = useState(() => readStore(STORE.user, null));
  const [authMode, setAuthMode] = useState("login");

  const [activePage, setActivePage] = useState("home");
  const [account, setAccount] = useState(() => readStore(STORE.account, "demo"));
  const [balances, setBalances] = useState(() =>
    readStore(STORE.balances, { demo: 10000, real: 0 })
  );

  const [prices, setPrices] = useState(() => makePrices());
  const [marketSymbol, setMarketSymbol] = useState("XAU/USD");
  const [marketTimeframe, setMarketTimeframe] = useState("1min");
  const [marketFeed, setMarketFeed] = useState(() => readStore(MARKET_CACHE_KEY, {}));
  const [positions, setPositions] = useState(() => readStore(STORE.positions, []));
  const [closedPositions, setClosedPositions] = useState(() => readStore(STORE.closed, []));
  const [transactions, setTransactions] = useState(() => readStore(STORE.tx, []));

  const [menuOpen, setMenuOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [notifications, setNotifications] = useState(() =>
    readStore(STORE.notifications, DEFAULT_NOTIFICATIONS)
  );

  const [tradeType, setTradeType] = useState("Even/Odd");
  const [stake, setStake] = useState(10);
  const [duration, setDuration] = useState(5);
  const [prediction, setPrediction] = useState(2);
  const [lastDigit, setLastDigit] = useState(0);
  const [digitStats, setDigitStats] = useState(makeInitialDigitStats);
  const [activeBinaryTrade, setActiveBinaryTrade] = useState(null);
  const [binaryResultFlash, setBinaryResultFlash] = useState(null);
  const lastDigitRef = useRef(0);
  const toastTimerRef = useRef(null);
  const resultFlashTimerRef = useRef(null);

  const [selectedBot, setSelectedBot] = useState(null);
  const [botRunning, setBotRunning] = useState(false);
  const [botTab, setBotTab] = useState("summary");
  const [botTrades, setBotTrades] = useState([]);
  const [referral, setReferral] = useState(() => readStore(STORE.referral, null));

  const livePrice = prices[prices.length - 1] || 1.08564;
  const livePriceRef = useRef(livePrice);
  livePriceRef.current = livePrice;
  const activeMarket = MARKET_BY_SYMBOL[marketSymbol] || MARKET_OPTIONS[0];
  const activeMarketFeed = marketFeed[marketSymbol] || {};
  const marketPrice = Number(
    activeMarketFeed.price ||
      activeMarketFeed.candles?.[activeMarketFeed.candles.length - 1]?.close ||
      0
  );
  const marketCandles = Array.isArray(activeMarketFeed.candles)
    ? activeMarketFeed.candles
    : [];
  const quotedMarketSymbols = useMemo(
    () =>
      Array.from(
        new Set([
          marketSymbol,
          ...positions.map((position) => position.instrument).filter(Boolean),
        ])
      ).filter((symbol) => MARKET_BY_SYMBOL[symbol]),
    [marketSymbol, positions]
  );
  const quotedMarketSymbolsKey = quotedMarketSymbols.join("|");
  const balance = balances[account] || 0;

  useEffect(() => saveStore(STORE.user, user), [user]);
  useEffect(() => saveStore(STORE.account, account), [account]);
  useEffect(() => saveStore(STORE.balances, balances), [balances]);
  useEffect(() => saveStore(STORE.positions, positions), [positions]);
  useEffect(() => saveStore(STORE.closed, closedPositions), [closedPositions]);
  useEffect(() => saveStore(STORE.tx, transactions), [transactions]);
  useEffect(() => saveStore(STORE.referral, referral), [referral]);
  useEffect(() => saveStore(STORE.notifications, notifications), [notifications]);
  useEffect(() => saveStore(MARKET_CACHE_KEY, marketFeed), [marketFeed]);

  useEffect(() => {
    const timer = setInterval(() => {
      setPrices((old) => {
        const last = old[old.length - 1] || 1.08564;
        const next = Number(
          (
            last +
            (Math.random() - 0.5) * 0.0006 +
            Math.sin(Date.now() / 7000) * 0.00006
          ).toFixed(5)
        );
        return [...old.slice(-119), next];
      });

      const nextDigit = Math.floor(Math.random() * 10);
      lastDigitRef.current = nextDigit;
      setLastDigit(nextDigit);
      setDigitStats((old) => driftDigitStats(old));
    }, 900);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!activeBinaryTrade?.id) return undefined;
    const timer = setInterval(() => {
      setActiveBinaryTrade((current) => {
        if (!current) return null;
        const remainingTicks = Number(current.remainingTicks || 0) - 1;
        if (remainingTicks > 0) return { ...current, remainingTicks };
        const finishedTrade = { ...current, remainingTicks: 0 };
        window.setTimeout(() => settleBinaryTrade(finishedTrade, lastDigitRef.current), 0);
        return null;
      });
    }, 900);
    return () => clearInterval(timer);
  }, [activeBinaryTrade?.id]);

  useEffect(() => () => {
    window.clearTimeout(toastTimerRef.current);
    window.clearTimeout(resultFlashTimerRef.current);
  }, []);

  useEffect(() => {
    setPositions((old) =>
      old.map((position) => {
        const market = MARKET_BY_SYMBOL[position.instrument] || MARKET_BY_SYMBOL["EUR/USD"];
        const quote = Number(marketFeed[position.instrument]?.price);

        if (!Number.isFinite(quote) || quote <= 0) return position;

        const contractSize = Number(position.contractSize || market.contractSize || 100000);
        const pl =
          position.side === "Buy"
            ? (quote - position.openPrice) * contractSize * position.volume
            : (position.openPrice - quote) * contractSize * position.volume;

        const marginBase = Number(position.margin || 0);

        return {
          ...position,
          currentPrice: quote,
          contractSize,
          pl: Number(pl.toFixed(2)),
          plPercent: Number(
            (marginBase > 0 ? (pl / marginBase) * 100 : 0).toFixed(2)
          ),
        };
      })
    );
  }, [marketFeed]);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    async function refreshQuotes() {
      if (!quotedMarketSymbols.length) return;

      if (!MARKET_API_KEY) {
        setMarketFeed((old) => {
          const next = { ...old };

          quotedMarketSymbols.forEach((symbol) => {
            const market = MARKET_BY_SYMBOL[symbol];
            const previous = next[symbol] || {};

            next[symbol] = {
              ...previous,
              isOpen: likelyMarketOpen(market),
              status: previous.price ? "cached" : "chart-only",
              error: previous.price
                ? ""
                : "Add VITE_TWELVE_DATA_API_KEY to enable live Buy/Sell prices.",
            };
          });

          return next;
        });
        return;
      }

      const results = await Promise.allSettled(
        quotedMarketSymbols.map(async (symbol) => {
          const market = MARKET_BY_SYMBOL[symbol];
          const quote = await fetchMarketQuote(market, controller.signal);
          return { symbol, quote };
        })
      );

      if (cancelled) return;

      setMarketFeed((old) => {
        const next = { ...old };

        results.forEach((result, index) => {
          const symbol = quotedMarketSymbols[index];
          const market = MARKET_BY_SYMBOL[symbol];

          if (result.status === "fulfilled") {
            next[symbol] = {
              ...(next[symbol] || {}),
              ...result.value.quote,
            };
          } else if (result.reason?.name !== "AbortError") {
            const previous = next[symbol] || {};
            next[symbol] = {
              ...previous,
              isOpen: parseMarketOpen(previous.isOpen, likelyMarketOpen(market)),
              status: previous.price ? "cached" : "error",
              error: result.reason?.message || "Live quote temporarily unavailable.",
            };
          }
        });

        return next;
      });
    }

    refreshQuotes();
    const timer = window.setInterval(refreshQuotes, 15000);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearInterval(timer);
    };
  }, [quotedMarketSymbolsKey]);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    async function refreshCandles() {
      if (!MARKET_API_KEY) return;

      try {
        const candles = await fetchMarketCandles(
          activeMarket,
          marketTimeframe,
          controller.signal
        );

        if (cancelled) return;

        const last = candles[candles.length - 1];

        setMarketFeed((old) => ({
          ...old,
          [marketSymbol]: {
            ...(old[marketSymbol] || {}),
            candles,
            price: Number(old[marketSymbol]?.price || last?.close || 0),
            status: old[marketSymbol]?.status || "live",
            error: "",
          },
        }));
      } catch (error) {
        if (cancelled || error?.name === "AbortError") return;

        setMarketFeed((old) => ({
          ...old,
          [marketSymbol]: {
            ...(old[marketSymbol] || {}),
            status: old[marketSymbol]?.price ? "cached" : "error",
            error: error?.message || "Unable to load live candles.",
          },
        }));
      }
    }

    refreshCandles();
    const timer = window.setInterval(refreshCandles, 60000);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearInterval(timer);
    };
  }, [marketSymbol, marketTimeframe]);

  useEffect(() => {
    if (!user?.email) return;

    refreshUser();

    const timer = setInterval(refreshUser, 8000);
    return () => clearInterval(timer);
  }, [user?.email]);

  useEffect(() => {
    if (!botRunning || !selectedBot) return;

    const timer = setInterval(() => {
      runBotTrade(selectedBot);
    }, 6500);

    return () => clearInterval(timer);
  }, [botRunning, selectedBot, account, balances]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const main = document.querySelector(".mainScreen");
      const page = main?.querySelector(".page");
      main?.scrollTo({ top: 0, left: 0, behavior: "auto" });
      page?.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [activePage]);

  async function refreshUser() {
    try {
      const res = await fetch(`${API_URL}/api/user/${encodeURIComponent(user.email)}`);
      const data = await readApiResponse(res);
      if (!res.ok || data.ok === false) return;

      setBalances((old) => ({
        demo: Number(data.demoBalance ?? old.demo ?? 10000),
        real: Number(data.realBalance ?? old.real ?? 0),
      }));
    } catch {
      return;
    }
  }

  function notify(type, title, message, durationMs = 2200) {
    window.clearTimeout(toastTimerRef.current);
    const notificationId = uid();
    const nextToast = { id: notificationId, type, title, message };
    setToast(nextToast);

    setNotifications((old) => [
      {
        id: notificationId,
        type,
        title,
        message,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        read: false,
        page:
          /bot/i.test(title) ? "bots" :
          /deposit|withdraw/i.test(title) ? "history" :
          /trade|contract/i.test(title) ? "trade" :
          "history",
      },
      ...old,
    ].slice(0, 30));

    toastTimerRef.current = window.setTimeout(() => {
      setToast((current) => (current?.id === nextToast.id ? null : current));
    }, durationMs);
  }

  function markNotificationRead(id) {
    setNotifications((old) =>
      old.map((item) => (item.id === id ? { ...item, read: true } : item))
    );
  }

  function markAllNotificationsRead() {
    setNotifications((old) => old.map((item) => ({ ...item, read: true })));
  }

  function clearNotifications() {
    setNotifications([]);
  }

  function addTx(tx) {
    setTransactions((old) => [
      {
        id: uid(),
        time: new Date().toLocaleString(),
        ...tx,
      },
      ...old,
    ]);
  }

  function updateBalance(targetAccount, amount) {
    setBalances((old) => ({
      ...old,
      [targetAccount]: Number((Number(old[targetAccount] || 0) + Number(amount)).toFixed(2)),
    }));
  }

  function applyReferralProgram() {
    const baseName = String(user?.name || user?.email || "metabinary")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 12);

    const code = `MB-${baseName || "user"}-${String(user?.brokerId || "000000").slice(-4)}`.toUpperCase();

    const profile = {
      status: "approved",
      code,
      link: `https://metabinary.com/ref/${code}`,
      commissionRate: 30,
      totalEarned: referral?.totalEarned || 0,
      totalReferrals: referral?.totalReferrals || 0,
      appliedAt: new Date().toLocaleString(),
    };

    setReferral(profile);

    addTx({
      type: "Referral application approved",
      method: "Referral",
      account,
      amount: 0,
      status: "Approved",
      details: code,
    });

    notify("win", "Referral link created", "You can now invite traders and earn commissions.");
  }

  function login(data) {
    if (!data.email || !data.password) {
      notify("loss", "Login failed", "Enter email and password.");
      return;
    }

    const logged = {
      name: data.email.split("@")[0],
      email: data.email,
      initials: initials(data.email),
      brokerId: "MB" + Math.floor(100000 + Math.random() * 900000),
      verified: true,
    };

    setUser(logged);
    setActivePage("home");
    notify("win", "Welcome back", "Login successful.");
  }

  function register(data) {
    if (!data.firstName || !data.lastName || !data.email || !data.password) {
      notify("loss", "Register failed", "Fill all required fields.");
      return;
    }

    if (data.password !== data.confirmPassword) {
      notify("loss", "Password error", "Passwords do not match.");
      return;
    }

    const created = {
      name: `${data.firstName} ${data.lastName}`,
      email: data.email,
      phone: data.phone,
      initials: initials(`${data.firstName} ${data.lastName}`),
      brokerId: "MB" + Math.floor(100000 + Math.random() * 900000),
      verified: true,
    };

    setUser(created);
    setBalances({ demo: 10000, real: 0 });
    setActivePage("home");
    notify("win", "Account created", "Your demo account is ready.");
  }

  function logout() {
    localStorage.removeItem(STORE.user);
    setUser(null);
    setMenuOpen(false);
    setActivePage("home");
    setAuthMode("login");
  }

  function placeForexOrder({
    side,
    symbol,
    volume,
    leverage,
    stopLoss,
    takeProfit,
    marketPrice: submittedMarketPrice,
    marketOpen,
  }) {
    const market = MARKET_BY_SYMBOL[symbol] || MARKET_BY_SYMBOL["EUR/USD"];
    const lots = Number(volume);
    const leverageValue = Number(String(leverage).split(":")[1] || 100);
    const quote = Number(submittedMarketPrice || marketFeed[symbol]?.price || 0);

    if (!Number.isFinite(quote) || quote <= 0) {
      notify(
        "loss",
        "Live price unavailable",
        "Connect the live quote feed before placing a market order."
      );
      return false;
    }

    if (marketOpen === false || marketFeed[symbol]?.isOpen === false) {
      notify(
        "loss",
        "Market closed",
        `${market.label} is closed. The live chart will stay visible, but orders are disabled.`
      );
      return false;
    }

    const halfSpread = Number(market.spread || 0) / 2;
    const openPrice = Number(
      (
        side === "Buy"
          ? quote + halfSpread
          : quote - halfSpread
      ).toFixed(market.decimals)
    );

    if (!Number.isFinite(lots) || lots < 0.01 || lots > 10) {
      notify("loss", "Invalid volume", "Volume must be between 0.01 and 10 lots.");
      return false;
    }

    const accountPositions = positions.filter((position) => position.account === account);
    if (accountPositions.length >= 10) {
      notify("loss", "Position limit", "Close an open position before placing another order.");
      return false;
    }

    const floatingPl = accountPositions.reduce(
      (sum, position) => sum + Number(position.pl || 0),
      0
    );
    const usedMargin = accountPositions.reduce(
      (sum, position) => sum + Number(position.margin || 0),
      0
    );
    const requiredMargin = Number(
      (
        (openPrice * Number(market.contractSize || 100000) * lots) /
        leverageValue
      ).toFixed(2)
    );
    const freeMargin = Number((balance + floatingPl - usedMargin).toFixed(2));

    if (requiredMargin > freeMargin) {
      notify(
        "loss",
        "Insufficient margin",
        `Required ${money(requiredMargin)} USD · Free ${money(Math.max(0, freeMargin))} USD`
      );
      return false;
    }

    const sl = Number(stopLoss);
    const tp = Number(takeProfit);

    if (!Number.isFinite(sl) || !Number.isFinite(tp) || sl <= 0 || tp <= 0) {
      notify("loss", "Invalid protection", "Enter valid Stop Loss and Take Profit prices.");
      return false;
    }

    const validProtection =
      side === "Buy" ? sl < openPrice && tp > openPrice : sl > openPrice && tp < openPrice;

    if (!validProtection) {
      notify(
        "loss",
        "Check SL and TP",
        side === "Buy"
          ? "For Buy: Stop Loss must be below price and Take Profit above price."
          : "For Sell: Stop Loss must be above price and Take Profit below price."
      );
      return false;
    }

    const position = {
      id: uid(),
      account,
      instrument: symbol,
      marketLabel: market.label,
      side,
      volume: lots,
      leverage,
      margin: requiredMargin,
      contractSize: market.contractSize,
      openPrice,
      currentPrice: quote,
      stopLoss: sl,
      takeProfit: tp,
      pl: 0,
      plPercent: 0,
      openedAt: new Date().toLocaleTimeString(),
    };

    setPositions((old) => [position, ...old].slice(0, 40));

    addTx({
      type: `${side} ${symbol}`,
      method: "Forex",
      account,
      amount: 0,
      status: "Open",
      details: `${position.volume} lot · Margin ${money(requiredMargin)} USD`,
    });

    notify(
      "open",
      `${side} order placed`,
      `${market.label} · ${position.volume} lot · ${money(requiredMargin)} USD margin`
    );

    return true;
  }

  function updatePosition(id, patch) {
    setPositions((old) => old.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function closePosition(id) {
    const item = positions.find((p) => p.id === id);
    if (!item) return;

    updateBalance(item.account, item.pl);

    setClosedPositions((old) => [
      {
        ...item,
        status: "Closed",
        closedAt: new Date().toLocaleTimeString(),
      },
      ...old,
    ]);

    setPositions((old) => old.filter((p) => p.id !== id));

    addTx({
      type: `Closed ${item.side} ${item.instrument}`,
      method: "Forex",
      account: item.account,
      amount: item.pl,
      status: "Closed",
      details: `${item.volume} lot`,
    });

    notify(
      item.pl >= 0 ? "win" : "loss",
      "Trade closed",
      `${item.pl >= 0 ? "+" : ""}${money(item.pl)} USD`
    );
  }

  function closeAllPositions(filter = {}) {
    positions
      .filter((p) => {
        if (filter.account && p.account !== filter.account) return false;
        if (filter.instrument && p.instrument !== filter.instrument) return false;
        return true;
      })
      .forEach((p) => closePosition(p.id));
  }

  function actionsFor(type) {
    if (type === "Even/Odd") return ["Even", "Odd"];
    if (type === "Matches/Differs") return ["Matches", "Differs"];
    if (type === "Over/Under") return ["Over", "Under"];
    if (type === "Rise/Fall") return ["Rise", "Fall"];
    return ["Touch", "No Touch"];
  }

  function payoutRate(type, action) {
    if (type === "Matches/Differs" && action === "Matches") return 8.333;
    if (type === "Matches/Differs" && action === "Differs") return 1.087;
    if (type === "Even/Odd") return 1.818;
    return 1.9;
  }

  function settleBinaryTrade(openTrade, digit) {
    const won = digitWinsTrade(openTrade, digit, livePriceRef.current);
    const profit = Number((openTrade.payout - openTrade.stake).toFixed(2));

    if (won) updateBalance(openTrade.account, openTrade.payout);

    addTx({
      type: won ? "Profit amount" : "Loss amount",
      method: "Manual",
      account: openTrade.account,
      amount: won ? profit : -openTrade.stake,
      status: won ? "WON" : "LOST",
      details: `${openTrade.type} · ${openTrade.action} · digit ${digit}`,
    });

    window.clearTimeout(resultFlashTimerRef.current);
    setBinaryResultFlash({ id: uid(), digit, result: won ? "win" : "loss" });
    resultFlashTimerRef.current = window.setTimeout(() => setBinaryResultFlash(null), 1800);

    notify(
      won ? "win" : "loss",
      won ? "Trade won" : "Trade lost",
      `${openTrade.type} · ${openTrade.action} · digit ${digit} · ${won ? "+" : "-"}${money(
        won ? profit : openTrade.stake
      )} USD`,
      2600
    );
  }

  function runBinaryTrade(type, action) {
    const usedStake = Number(stake);
    const usedTicks = Math.max(1, Number(duration || 5));

    if (activeBinaryTrade) {
      notify(
        "open",
        "Trade already open",
        `${activeBinaryTrade.type} · ${activeBinaryTrade.action} · ${activeBinaryTrade.remainingTicks} ticks remaining`
      );
      return;
    }

    if (usedStake < 0.3) {
      notify("loss", "Minimum stake", "Minimum stake is 0.30 USD.");
      return;
    }

    if (balance < usedStake) {
      notify("loss", "Low balance", `Your ${account} balance is low.`);
      return;
    }

    updateBalance(account, -usedStake);

    const openTrade = {
      id: uid(),
      account,
      type,
      action,
      stake: usedStake,
      prediction,
      payout: Number((usedStake * payoutRate(type, action)).toFixed(2)),
      entryPrice: livePrice,
      totalTicks: usedTicks,
      remainingTicks: usedTicks,
      openedAt: new Date().toLocaleTimeString(),
      status: "RUNNING",
    };

    setBinaryResultFlash(null);
    setActiveBinaryTrade(openTrade);
    notify("open", "Open trade", `${type} · ${action} · ${usedTicks} ticks`, 1700);
  }

  function runBotTrade(bot) {
    const usedStake = Number(bot.stake || 1);

    if (balance < usedStake) {
      notify("loss", "Bot stopped", "Low balance.");
      setBotRunning(false);
      return;
    }

    updateBalance(account, -usedStake);

    const won = Math.random() > 0.48;
    const payout = Number((usedStake * 1.82).toFixed(2));
    const profit = Number((payout - usedStake).toFixed(2));

    const row = {
      id: uid(),
      botName: bot.name,
      type: bot.type,
      action: bot.type === "Rise/Fall" ? "Rise" : "Even",
      stake: usedStake,
      payout,
      profit,
      won,
      status: won ? "WON" : "LOST",
      time: new Date().toLocaleTimeString(),
    };

    setBotTrades((old) => [row, ...old].slice(0, 50));

    if (won) updateBalance(account, payout);

    addTx({
      type: won ? "Bot profit" : "Bot loss",
      method: "Bot",
      account,
      amount: won ? profit : -usedStake,
      status: row.status,
      details: `${bot.name} · ${bot.type}`,
    });
  }

  function startBot(bot) {
    setSelectedBot(bot);
    setBotRunning(true);
    setBotTab("summary");
    setActivePage("botLive");
    runBotTrade(bot);
    notify("open", "Bot started", bot.name);
  }

  function stopBot() {
    setBotRunning(false);
    notify("open", "Bot stopped", "No new contracts will be bought.");
  }

  async function pollDepositStatus(depositId) {
    if (!depositId || !API_URL) return;

    for (let attempt = 0; attempt < 18; attempt += 1) {
      await wait(5000);

      try {
        const res = await fetch(
          `${API_URL}/api/deposit/${encodeURIComponent(depositId)}/status`,
          {
            method: "GET",
            headers: { Accept: "application/json" },
            cache: "no-store",
          }
        );
        const data = await readApiResponse(res);

        if (!res.ok || data.ok === false) continue;

        const status = String(data.status || "").toUpperCase();

        if (["COMPLETE", "COMPLETED", "PAID", "SUCCESS", "SUCCESSFUL"].includes(status)) {
          if (Number.isFinite(Number(data.realBalance))) {
            setBalances((old) => ({ ...old, real: Number(data.realBalance) }));
          } else {
            await refreshUser();
          }

          addTx({
            type: "Deposit completed",
            method: "M-Pesa",
            account: "real",
            amount: Number(data.amountUsd || 0),
            status: "Completed",
            details: data.phone || "M-Pesa",
          });

          notify("win", "Deposit completed", `${money(data.amountUsd)} USD added to your real account.`);
          return;
        }

        if (["FAILED", "CANCELLED", "CANCELED", "REVERSED", "EXPIRED"].includes(status)) {
          notify("loss", "Deposit not completed", data.message || `Payment status: ${status}.`);
          return;
        }
      } catch (error) {
        console.warn("Deposit status check failed:", error);
        // Keep polling. A temporary network error should not lose a successful payment.
      }
    }

    notify("open", "Deposit still pending", "Open History later to confirm the final payment status.");
  }

  async function submitDeposit(data) {
    const amountUsd = Number(data.amountUsd);
    const method = String(data.method || "mpesa").toLowerCase();
    const phone = String(data.phone || "").trim();

    if (!API_URL) {
      notify(
        "loss",
        "Backend not configured",
        "VITE_API_URL is missing from the frontend environment."
      );
      return false;
    }

    if (!Number.isFinite(amountUsd) || amountUsd < 1) {
      notify("loss", "Invalid amount", "Minimum deposit is 1 USD.");
      return false;
    }

    if (method === "mpesa" && !phone) {
      notify("loss", "Phone required", "Enter the M-Pesa phone number.");
      return false;
    }

    try {
      const response = await fetch(`${API_URL}/api/deposit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          method,
          amountUsd,
          phone,
          email: user.email,
          name: user.name || user.email,
          requestId: uid(),
        }),
      });

      const result = await readApiResponse(response);

      if (!response.ok || result.ok === false) {
        throw new Error(
          result.message || `Deposit failed with HTTP ${response.status}.`
        );
      }

      if (result.checkoutUrl) {
        window.location.assign(result.checkoutUrl);
        return true;
      }

      if (!result.depositId) {
        throw new Error(
          result.message || "The backend did not return a deposit reference."
        );
      }

      setDepositOpen(false);
      setAccount("real");

      addTx({
        type: "Deposit pending",
        method: method === "mpesa" ? "M-Pesa" : "Card",
        account: "real",
        amount: amountUsd,
        status: "Pending",
        details: phone || method,
      });

      notify(
        "open",
        "Deposit started",
        result.message || "Check your phone for the M-Pesa prompt."
      );

      void pollDepositStatus(result.depositId);
      return true;
    } catch (error) {
      console.error("Deposit request failed:", error);

      const message =
        error instanceof Error ? error.message : "Backend connection failed.";

      notify("loss", "Deposit error", message);
      return false;
    }
  }

  async function submitWithdraw(data) {
    const amount = Number(data.amountUsd);
    const phone = String(data.phone || "").trim();

    if (!API_URL) {
      notify(
        "loss",
        "Backend not configured",
        "VITE_API_URL is missing from the frontend environment."
      );
      return false;
    }

    if (!Number.isFinite(amount) || amount < 5) {
      notify("loss", "Minimum withdrawal", "Minimum withdrawal is 5 USD.");
      return false;
    }

    if (!phone) {
      notify("loss", "Phone required", "Enter the M-Pesa phone number.");
      return false;
    }

    if (balances.real < amount) {
      notify("loss", "Low real balance", "You do not have enough real balance.");
      return false;
    }

    try {
      const response = await fetch(`${API_URL}/api/withdraw`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          ...data,
          phone,
          amountUsd: amount,
          email: user.email,
          name: user.name || user.email,
          requestId: uid(),
        }),
      });

      const result = await readApiResponse(response);

      if (!response.ok || result.ok === false) {
        throw new Error(
          result.message || `Withdrawal failed with HTTP ${response.status}.`
        );
      }

      if (Number.isFinite(Number(result.realBalance))) {
        setBalances((old) => ({ ...old, real: Number(result.realBalance) }));
      } else {
        await refreshUser();
      }

      setWithdrawOpen(false);

      addTx({
        type: "Withdrawal request",
        method: "M-Pesa",
        account: "real",
        amount: -amount,
        status: result.status || "Processing",
        details: phone,
      });

      notify(
        "open",
        "Withdrawal requested",
        result.message || "Your withdrawal is processing."
      );
      return true;
    } catch (error) {
      console.error("Withdrawal request failed:", error);

      const message =
        error instanceof Error ? error.message : "Backend connection failed.";

      notify("loss", "Withdrawal error", message);
      return false;
    }
  }

  if (!user) {
    return (
      <>
        <AuthScreen mode={authMode} setMode={setAuthMode} login={login} register={register} />
        {toast && <Toast toast={toast} />}
      </>
    );
  }

  return (
    <div className="app">
      <Header
        user={user}
        account={account}
        setAccount={setAccount}
        balance={balance}
        balances={balances}
        setActivePage={setActivePage}
        openMenu={() => setMenuOpen(true)}
        openDeposit={() => setDepositOpen(true)}
        notifications={notifications}
        markNotificationRead={markNotificationRead}
        markAllNotificationsRead={markAllNotificationsRead}
        clearNotifications={clearNotifications}
      />

      <main className="mainScreen">
        {activePage === "home" && (
          <HomePage
            livePrice={livePrice}
            prices={prices}
            setActivePage={setActivePage}
            openDeposit={() => setDepositOpen(true)}
          />
        )}

        {activePage === "forex" && (
          <ForexPage
            account={account}
            balance={balance}
            symbol={marketSymbol}
            setSymbol={setMarketSymbol}
            timeframe={marketTimeframe}
            setTimeframe={setMarketTimeframe}
            market={activeMarket}
            marketFeed={activeMarketFeed}
            livePrice={marketPrice}
            candles={marketCandles}
            positions={positions}
            placeForexOrder={placeForexOrder}
            setActivePage={setActivePage}
            openDeposit={() => setDepositOpen(true)}
          />
        )}

        {activePage === "openTrades" && (
          <OpenTradesPage
            account={account}
            balance={balance}
            positions={positions}
            closedPositions={closedPositions}
            updatePosition={updatePosition}
            closePosition={closePosition}
            closeAllPositions={closeAllPositions}
            back={() => setActivePage("forex")}
          />
        )}

        {activePage === "trade" && (
          <TradePage
            prices={prices}
            livePrice={livePrice}
            tradeType={tradeType}
            setTradeType={setTradeType}
            stake={stake}
            setStake={setStake}
            duration={duration}
            setDuration={setDuration}
            prediction={prediction}
            setPrediction={setPrediction}
            lastDigit={lastDigit}
            digitStats={digitStats}
            activeBinaryTrade={activeBinaryTrade}
            binaryResultFlash={binaryResultFlash}
            actionsFor={actionsFor}
            payoutRate={payoutRate}
            runBinaryTrade={runBinaryTrade}
          />
        )}

        {activePage === "bots" && <BotsPage bots={BOT_TEMPLATES} startBot={startBot} />}

        {activePage === "botLive" && (
          <BotLivePage
            bot={selectedBot}
            running={botRunning}
            stopBot={stopBot}
            startBot={startBot}
            trades={botTrades}
            botTab={botTab}
            setBotTab={setBotTab}
            back={() => setActivePage("bots")}
          />
        )}

        {activePage === "profile" && (
          <ProfilePage
            user={user}
            account={account}
            balances={balances}
            transactions={transactions}
            referral={referral}
            applyReferralProgram={applyReferralProgram}
            logout={logout}
            setActivePage={setActivePage}
          />
        )}

        {activePage === "settings" && (
          <SettingsPage
            account={account}
            setAccount={setAccount}
            tradeType={tradeType}
            setTradeType={setTradeType}
            stake={stake}
            setStake={setStake}
          />
        )}

        {activePage === "history" && <HistoryPage transactions={transactions} />}

        {activePage === "reports" && (
          <ReportsPage
            transactions={transactions}
            closedPositions={closedPositions}
            botTrades={botTrades}
          />
        )}
      </main>

      <BottomNav activePage={activePage} setActivePage={setActivePage} />

      {menuOpen && (
        <SideMenu
          user={user}
          account={account}
          setAccount={setAccount}
          balance={balance}
          close={() => setMenuOpen(false)}
          setActivePage={setActivePage}
          openDeposit={() => setDepositOpen(true)}
          openWithdraw={() => setWithdrawOpen(true)}
          logout={logout}
        />
      )}

      {depositOpen && <DepositModal close={() => setDepositOpen(false)} submit={submitDeposit} />}

      {withdrawOpen && <WithdrawModal close={() => setWithdrawOpen(false)} submit={submitWithdraw} />}

      {toast && <Toast toast={toast} />}
    </div>
  );
}

function Logo() {
  return (
    <div className="logo brokerLogo">
      <div className="brokerLogoMark">
        <span>M</span>
      </div>

      <strong>
        Meta<span>Binary</span>
      </strong>
    </div>
  );
}

function AuthScreen({ mode, setMode, login, register }) {
  const [loginData, setLoginData] = useState({ email: "", password: "" });

  const [regData, setRegData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  return (
    <div className="authPage">
      {mode === "login" ? (
        <section className="authCard loginCard">
          <Logo />

          <h1>Welcome Back</h1>
          <p>Login to your account and continue trading.</p>

          <label>Email Address</label>
          <input
            placeholder="Enter your email"
            value={loginData.email}
            onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
          />

          <label>Password</label>
          <input
            type="password"
            placeholder="Enter your password"
            value={loginData.password}
            onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
          />

          <button className="primaryBtn" onClick={() => login(loginData)}>
            Login →
          </button>

          <small>
            Don’t have an account?{" "}
            <button onClick={() => setMode("register")}>Create Account</button>
          </small>
        </section>
      ) : (
        <section className="authCard registerCard">
          <Logo />

          <h1>Create Your Account</h1>
          <p>Join MetaBinary and start your trading journey.</p>

          <div className="registerGrid">
            <input
              placeholder="First name"
              value={regData.firstName}
              onChange={(e) => setRegData({ ...regData, firstName: e.target.value })}
            />

            <input
              placeholder="Last name"
              value={regData.lastName}
              onChange={(e) => setRegData({ ...regData, lastName: e.target.value })}
            />

            <input
              placeholder="Email address"
              value={regData.email}
              onChange={(e) => setRegData({ ...regData, email: e.target.value })}
            />

            <input
              placeholder="+254 phone number"
              value={regData.phone}
              onChange={(e) => setRegData({ ...regData, phone: e.target.value })}
            />

            <input
              type="password"
              placeholder="Password"
              value={regData.password}
              onChange={(e) => setRegData({ ...regData, password: e.target.value })}
            />

            <input
              type="password"
              placeholder="Confirm password"
              value={regData.confirmPassword}
              onChange={(e) => setRegData({ ...regData, confirmPassword: e.target.value })}
            />
          </div>

          <button className="primaryBtn" onClick={() => register(regData)}>
            Create Account
          </button>

          <small>
            Already have an account? <button onClick={() => setMode("login")}>Login</button>
          </small>
        </section>
      )}
    </div>
  );
}

function Header({
  user,
  account,
  setAccount,
  balance,
  balances,
  setActivePage,
  openMenu,
  openDeposit,
  notifications,
  markNotificationRead,
  markAllNotificationsRead,
  clearNotifications,
}) {
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const isReal = account === "real";
  const safeNotifications = Array.isArray(notifications) ? notifications : [];
  const unreadCount = safeNotifications.filter((item) => !item.read).length;

  function chooseAccount(nextAccount) {
    setAccount(nextAccount);
    setAccountMenuOpen(false);
  }

  function openNotification(item) {
    markNotificationRead(item.id);
    setNotificationOpen(false);
    if (item.page) setActivePage(item.page);
  }

  return (
    <header className="topHeader brokerTopHeader cleanBrokerHeader">
      <button className="menuBtn brokerMenuBtn" onClick={openMenu} aria-label="Open menu">
        <span></span>
        <span></span>
        <span></span>
      </button>

      <Logo />

      <button
        type="button"
        className={`walletBox brokerWallet accountSelectorButton ${accountMenuOpen ? "menuOpen" : ""}`}
        onClick={() => {
          setAccountMenuOpen((open) => !open);
          setNotificationOpen(false);
        }}
        aria-haspopup="listbox"
        aria-expanded={accountMenuOpen}
        aria-label={`Selected ${isReal ? "real" : "demo"} account. Balance ${money(balance)} USD`}
      >
        <span className="accountSelectorText">
          <small>
            {isReal ? "LIVE ACCOUNT" : "DEMO ACCOUNT"}
            {isReal && <i aria-label="Live account online"></i>}
          </small>
          <strong>
            {money(balance)} <em>USD</em>
          </strong>
        </span>

        <span className="accountSelectorChevron" aria-hidden="true">⌄</span>
      </button>

      <button
        type="button"
        className="depositTop brokerDepositBtn compactDepositButton"
        onClick={openDeposit}
        aria-label="Deposit funds"
      >
        <span>Deposit</span>
        <b>＋</b>
      </button>

      <button
        type="button"
        className={`bellBtn brokerBellBtn workingBellButton ${notificationOpen ? "active" : ""}`}
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={notificationOpen}
        onClick={() => {
          setNotificationOpen((open) => !open);
          setAccountMenuOpen(false);
        }}
      >
        <i aria-hidden="true">🔔</i>
        {unreadCount > 0 && <b>{unreadCount > 9 ? "9+" : unreadCount}</b>}
      </button>

      <button className="avatarBtn brokerAvatarBtn" onClick={() => setActivePage("profile")} aria-label="Open profile">
        {user.initials}
        <i></i>
      </button>

      {accountMenuOpen && (
        <div className="accountPickerPanel" role="listbox" aria-label="Choose account">
          <div className="accountPickerHeading">
            <strong>Select account</strong>
            <small>Choose the balance you want to use</small>
          </div>

          <button
            type="button"
            role="option"
            aria-selected={account === "demo"}
            className={account === "demo" ? "selected" : ""}
            onClick={() => chooseAccount("demo")}
          >
            <span>
              <strong>Demo Account</strong>
              <small>{money(balances.demo)} USD</small>
            </span>
            <i>{account === "demo" ? "✓" : ""}</i>
          </button>

          <button
            type="button"
            role="option"
            aria-selected={account === "real"}
            className={account === "real" ? "selected" : ""}
            onClick={() => chooseAccount("real")}
          >
            <span>
              <strong>Real Account</strong>
              <small>{money(balances.real)} USD · ID {user.brokerId}</small>
            </span>
            <i>{account === "real" ? "✓" : ""}</i>
          </button>
        </div>
      )}

      {notificationOpen && (
        <section className="notificationPanel" aria-label="Notifications">
          <header>
            <div>
              <strong>Notifications</strong>
              <small>{unreadCount} unread</small>
            </div>
            {unreadCount > 0 && (
              <button type="button" onClick={markAllNotificationsRead}>Mark all read</button>
            )}
          </header>

          <div className="notificationList">
            {safeNotifications.length === 0 ? (
              <div className="notificationEmpty">
                <span>🔔</span>
                <strong>You are all caught up</strong>
                <small>New account and trading updates will appear here.</small>
              </div>
            ) : (
              safeNotifications.slice(0, 8).map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={`notificationItem ${item.read ? "read" : "unread"} ${item.type || "info"}`}
                  onClick={() => openNotification(item)}
                >
                  <span className="notificationTypeIcon">
                    {item.type === "win" ? "✓" : item.type === "loss" ? "!" : item.type === "wallet" ? "$" : item.type === "security" ? "◆" : "↗"}
                  </span>
                  <span className="notificationCopy">
                    <strong>{item.title}</strong>
                    <small>{item.message}</small>
                    <em>{item.time}</em>
                  </span>
                  {!item.read && <i aria-label="Unread"></i>}
                </button>
              ))
            )}
          </div>

          <footer>
            <button type="button" onClick={() => { setNotificationOpen(false); setActivePage("history"); }}>
              View activity
            </button>
            {safeNotifications.length > 0 && (
              <button type="button" className="clearNotifications" onClick={clearNotifications}>
                Clear
              </button>
            )}
          </footer>
        </section>
      )}
    </header>
  );
}

function HubNav({ active, setActivePage, openDeposit }) {
  const items = [
    ["Trader’s Hub", "⌂", "home"],
    ["Reports", "▤", "reports"],
    ["History", "↺", "history"],
    ["Forex", "▥", "forex"],
    ["Settings", "⚙", "settings"],
    ["Cashier", "▱", "deposit"],
  ];

  return (
    <nav className="hubNav">
      {items.map(([label, icon, page]) => (
        <button
          key={label}
          className={active === label ? "active" : ""}
          onClick={() => {
            if (page === "deposit") openDeposit();
            else setActivePage(page);
          }}
        >
          <span>{icon}</span>
          <small>{label}</small>
        </button>
      ))}
    </nav>
  );
}

function HomePage({ livePrice, prices, setActivePage, openDeposit }) {
  return (
    <div className="page homePage">
      <HubNav active="Trader’s Hub" setActivePage={setActivePage} openDeposit={openDeposit} />

      <section className="proHero">
        <div className="heroText">
          <h1>
            Trade Smarter.
            <span>Earn Consistently.</span>
          </h1>

          <p>AI-powered trading, binary options, forex and bots in one intelligent platform.</p>

          <button onClick={() => setActivePage("trade")}>Start Trading →</button>

          <div className="heroFeatureRow">
            <HeroFeature icon="🧠" title="AI-Powered" text="Smart market insights" />
            <HeroFeature icon="🛡" title="Secure & Reliable" text="Bank-grade protection" />
            <HeroFeature icon="⚡" title="Fast Execution" text="Lightning-fast trades" />
          </div>
        </div>

        <div className="heroChartGlow">
          <CandleGlow />
        </div>

        <div className="livePairCard">
          <div className="pairHead">
            <strong>🇺🇸 EUR/USD</strong>
            <span>● LIVE</span>
          </div>

          <h2>{livePrice.toFixed(5)}</h2>
          <p>+0.00254 (+0.23%) ▲</p>

          <LineMini prices={prices} />

          <div className="pairTimes">
            <button className="active">1M</button>
            <button>5M</button>
            <button>15M</button>
            <button>1H</button>
            <button>1D</button>
          </div>

          <div className="pairActions">
            <button onClick={() => setActivePage("trade")}>↗ CALL</button>
            <button onClick={() => setActivePage("trade")}>↘ PUT</button>
          </div>
        </div>
      </section>

      <section className="homeStats">
        <Stat icon="📈" value="$2,456,789" label="Total Trades" spark="blue" />
        <Stat icon="👥" value="15,342" label="Active Traders" spark="purple" />
        <Stat icon="💵" value="$892,456" label="Payouts" spark="green" />
        <Stat icon="🏆" value="98.62%" label="Success Rate" spark="yellow" />
      </section>

      <section className="marketTicker">
        <TickerItem icon="🇪🇺" pair="EUR/USD" price="1.08564" change="+0.23%" good />
        <TickerItem icon="🇬🇧" pair="GBP/USD" price="1.26543" change="-0.11%" />
        <TickerItem icon="🥇" pair="XAU/USD" price="2,345.67" change="+0.24%" good />
        <TickerItem icon="₿" pair="BTC/USD" price="63,245.12" change="+0.24%" good />
      </section>

      <section className="homeLowerGrid">
        <div className="aiTradingCard">
          <div className="aiChip">AI</div>

          <div>
            <h3>
              AI-Powered Trading <b>NEW</b>
            </h3>

            <p>Advanced algorithms analyze market patterns in real-time to deliver smarter trade signals.</p>

            <button onClick={() => setActivePage("bots")}>Explore AI Tools →</button>
          </div>
        </div>

        <div className="quickActions">
          <h3>Quick Actions</h3>

          <div>
            <button onClick={() => setActivePage("trade")}>
              📉<span>New Trade</span>
            </button>

            <button onClick={() => setActivePage("bots")}>
              🧠<span>AI Signals</span>
            </button>

            <button onClick={() => setActivePage("reports")}>
              📄<span>Reports</span>
            </button>

            <button onClick={() => setActivePage("history")}>
              🗓<span>History</span>
            </button>
          </div>
        </div>

        <div className="topMarkets">
          <h3>
            Top Markets <button onClick={() => setActivePage("forex")}>View All</button>
          </h3>

          {[
            ["🇪🇺", "EUR/USD", "1.08564", "+0.23%", true],
            ["🇬🇧", "GBP/USD", "1.26543", "-0.11%", false],
            ["🥇", "XAU/USD", "2,345.67", "+0.24%", true],
            ["₿", "BTC/USD", "63,245.12", "+0.24%", true],
          ].map(([icon, pair, price, change, good]) => (
            <p key={pair}>
              <span>
                {icon} {pair}
              </span>
              <b>{price}</b>
              <em className={good ? "green" : "red"}>{change}</em>
            </p>
          ))}
        </div>

        <div className="featureList">
          <h3>Platform Features</h3>
          <FeatureLine icon="🔁" title="Binary Options" text="High returns with low risk" />
          <FeatureLine icon="🧠" title="Forex Trading" text="Trade major currency pairs" />
          <FeatureLine icon="🤖" title="Automated Bots" text="24/7 algorithmic trading" />
          <FeatureLine icon="💰" title="Risk Management" text="Advanced risk controls" />
        </div>
      </section>

      <section className="homeFooter">
        <span>🛡 Your funds are secure with us</span>
        <span>🏦 Licensed & Regulated Broker</span>
        <span>🎧 24/7 Customer Support</span>
        <span>✉ support@metabinary.com</span>
      </section>
    </div>
  );
}

function HeroFeature({ icon, title, text }) {
  return (
    <div className="heroFeature">
      <b>{icon}</b>
      <span>
        <strong>{title}</strong>
        <small>{text}</small>
      </span>
    </div>
  );
}

function TickerItem({ icon, pair, price, change, good }) {
  return (
    <div className="tickerItem">
      <span>{icon}</span>
      <b>{pair}</b>
      <strong>{price}</strong>
      <em className={good ? "green" : "red"}>{change}</em>
      <MiniSpark type={good ? "green" : "red"} />
    </div>
  );
}

function FeatureLine({ icon, title, text }) {
  return (
    <p>
      <b>{icon}</b>
      <span>
        <strong>{title}</strong>
        <small>{text}</small>
      </span>
    </p>
  );
}

function Stat({ icon, value, label, spark }) {
  return (
    <div className="statCard">
      {icon && <b>{icon}</b>}

      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>

      {spark && <MiniSpark type={spark} />}
    </div>
  );
}

function CandleGlow() {
  const bars = Array.from({ length: 18 }, (_, i) => {
    const h = 30 + Math.random() * 80;
    return { x: 18 + i * 4, h, up: i % 3 !== 0 };
  });

  return (
    <svg viewBox="0 0 100 80" preserveAspectRatio="none">
      <defs>
        <linearGradient id="blueGlow" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#00a3ff" stopOpacity="1" />
          <stop offset="1" stopColor="#0048ff" stopOpacity=".1" />
        </linearGradient>
      </defs>

      <path d="M5 62 C22 46 35 58 48 40 S72 28 94 12" fill="none" stroke="#006dff" strokeWidth=".7" />

      {bars.map((bar, i) => (
        <g key={i}>
          <line x1={bar.x} x2={bar.x} y1={65 - bar.h / 2} y2={68} stroke="#0077ff" strokeWidth=".4" opacity=".7" />

          <rect
            x={bar.x - 0.9}
            y={65 - bar.h / 2}
            width="1.8"
            height={bar.h / 2}
            fill={bar.up ? "url(#blueGlow)" : "rgba(0,70,180,.45)"}
          />
        </g>
      ))}
    </svg>
  );
}

function LineMini({ prices }) {
  const data = prices.slice(-32);
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const path = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = 38 - ((value - min) / range) * 32;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg className="lineMini" viewBox="0 0 100 42" preserveAspectRatio="none">
      <path d={path} />
    </svg>
  );
}

function MiniSpark({ type = "blue" }) {
  const color =
    type === "green"
      ? "#00e884"
      : type === "purple"
      ? "#a855f7"
      : type === "yellow"
      ? "#ffa800"
      : type === "red"
      ? "#ff4057"
      : "#008cff";

  const points =
    type === "red"
      ? "2,22 12,17 25,20 36,15 49,19 60,16 71,23 86,20 98,26"
      : "2,28 12,22 25,24 36,18 49,21 60,13 71,17 86,9 98,14";

  return (
    <svg className="miniSpark" viewBox="0 0 100 34">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ForexPage({
  account,
  balance,
  symbol,
  setSymbol,
  timeframe,
  setTimeframe,
  market,
  marketFeed,
  livePrice,
  candles,
  positions,
  placeForexOrder,
  setActivePage,
  openDeposit,
}) {
  const [volume, setVolume] = useState(0.01);
  const [leverage, setLeverage] = useState("1:100");
  const [stopLoss, setStopLoss] = useState(0);
  const [takeProfit, setTakeProfit] = useState(0);
  const [orderBusy, setOrderBusy] = useState(false);
  const seededSymbolRef = useRef("");

  const accountPositions = positions.filter((position) => position.account === account);
  const visiblePositions = accountPositions.filter(
    (position) => position.instrument === symbol
  );
  const floatingPl = accountPositions.reduce(
    (sum, position) => sum + Number(position.pl || 0),
    0
  );
  const usedMargin = accountPositions.reduce(
    (sum, position) => sum + Number(position.margin || 0),
    0
  );
  const freeMargin = Math.max(
    0,
    Number(balance || 0) + floatingPl - usedMargin
  );

  const marketOpen = parseMarketOpen(
    marketFeed?.isOpen,
    likelyMarketOpen(market)
  );
  const priceReady = Number.isFinite(Number(livePrice)) && Number(livePrice) > 0;
  const feedStatus = marketFeed?.status || (MARKET_API_KEY ? "connecting" : "chart-only");
  const change = Number(marketFeed?.change || 0);
  const percentChange = Number(marketFeed?.percentChange || 0);
  const positiveChange = change >= 0;
  const currentTimeframe =
    MARKET_TIMEFRAMES.find((item) => item.value === timeframe) ||
    MARKET_TIMEFRAMES[0];

  useEffect(() => {
    if (!priceReady || seededSymbolRef.current === symbol) return;

    setStopLoss(
      Number(
        (Number(livePrice) - Number(market.slDistance || market.priceStep)).toFixed(
          market.decimals
        )
      )
    );
    setTakeProfit(
      Number(
        (Number(livePrice) + Number(market.tpDistance || market.priceStep)).toFixed(
          market.decimals
        )
      )
    );
    seededSymbolRef.current = symbol;
  }, [symbol, livePrice, priceReady, market]);

  function order(side) {
    if (orderBusy || !priceReady || !marketOpen) return;

    const gap = Number(market.priceStep || 0.0001);
    const normalizedStopLoss =
      side === "Buy"
        ? Math.min(Number(stopLoss), Number(livePrice) - gap)
        : Math.max(Number(stopLoss), Number(livePrice) + gap);

    const normalizedTakeProfit =
      side === "Buy"
        ? Math.max(Number(takeProfit), Number(livePrice) + gap)
        : Math.min(Number(takeProfit), Number(livePrice) - gap);

    const fixedStopLoss = Number(
      normalizedStopLoss.toFixed(market.decimals)
    );
    const fixedTakeProfit = Number(
      normalizedTakeProfit.toFixed(market.decimals)
    );

    setStopLoss(fixedStopLoss);
    setTakeProfit(fixedTakeProfit);
    setOrderBusy(true);

    const placed = placeForexOrder({
      side,
      symbol,
      volume,
      leverage,
      stopLoss: fixedStopLoss,
      takeProfit: fixedTakeProfit,
      marketPrice: livePrice,
      marketOpen,
    });

    window.setTimeout(() => setOrderBusy(false), placed ? 700 : 350);
  }

  const buyPrice = priceReady
    ? Number(livePrice) + Number(market.spread || 0) / 2
    : 0;
  const sellPrice = priceReady
    ? Number(livePrice) - Number(market.spread || 0) / 2
    : 0;

  const statusLabel =
    feedStatus === "live"
      ? marketOpen
        ? "Market open"
        : "Market closed"
      : feedStatus === "cached"
      ? "Last price"
      : feedStatus === "error"
      ? "Feed unavailable"
      : feedStatus === "connecting"
      ? "Connecting"
      : "Chart live";

  return (
    <div className="page forexPage forexPublishPage realMarketPublishPage">
      <HubNav
        active="Forex"
        setActivePage={setActivePage}
        openDeposit={openDeposit}
      />

      <section className="forexSymbolBar forexMarketCard realMarketHeaderCard">
        <button
          className="marketBack"
          aria-label="Back to markets"
          onClick={() => setActivePage("home")}
        >
          ‹
        </button>

        <label className="symbolPicker realSymbolPicker">
          <span>★</span>
          <select
            value={symbol}
            onChange={(event) => {
              seededSymbolRef.current = "";
              setSymbol(event.target.value);
            }}
            aria-label="Choose market"
          >
            {MARKET_OPTIONS.map((option) => (
              <option key={option.symbol} value={option.symbol}>
                {option.label} · {option.symbol}
              </option>
            ))}
          </select>
        </label>

        <div className="marketNameBlock">
          <strong>{market.label}</strong>
          <small>
            {market.category} · {symbol}
          </small>
        </div>

        <div className="marketPriceBlock">
          <strong>{formatMarketPrice(livePrice, market)}</strong>
          <small className={positiveChange ? "green" : "red"}>
            {positiveChange ? "+" : ""}
            {formatMarketPrice(change, market)} ({positiveChange ? "+" : ""}
            {percentChange.toFixed(2)}%)
          </small>
        </div>

        <div className="marketHighLow">
          <p>
            <span>High</span>
            <b>{formatMarketPrice(marketFeed?.high, market)}</b>
          </p>
          <p>
            <span>Low</span>
            <b>{formatMarketPrice(marketFeed?.low, market)}</b>
          </p>
        </div>

        <span
          className={`marketStatusPill ${
            marketOpen ? "open" : "closed"
          } ${feedStatus}`}
        >
          <i />
          {statusLabel}
        </span>
      </section>

      <section className="singleTimeframeBar">
        <div className="timeframeSummary">
          <small>Chart timeframe</small>
          <strong>{currentTimeframe.label}</strong>
        </div>

        <label className="timeframeSelect">
          <span>{currentTimeframe.short}</span>
          <select
            value={timeframe}
            onChange={(event) => setTimeframe(event.target.value)}
            aria-label="Choose chart timeframe"
          >
            {MARKET_TIMEFRAMES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <b>⌄</b>
        </label>

        <div className="marketFeedMessage">
          <span>{marketOpen ? "Live market data" : "Last market session"}</span>
          <small>
            {MARKET_API_KEY
              ? "Quotes refresh automatically"
              : "Add your Twelve Data key for order prices"}
          </small>
        </div>
      </section>

      <section className="proChartPanel forexBigChart realMarketChartPanel">
        <TradingViewMarketChart
          market={market}
          timeframe={timeframe}
          marketOpen={marketOpen}
        />
      </section>

      <section className="proOrderPanel forexOrderCard marketOrderStack">
        <div className="tradeActionColumn marketActionColumn">
          <div className="buySellBox buySellProBox">
            <button
              type="button"
              className="buyLarge"
              onClick={() => order("Buy")}
              disabled={orderBusy || !priceReady || !marketOpen}
            >
              <b>
                {!marketOpen
                  ? "Closed"
                  : orderBusy
                  ? "Placing…"
                  : "Buy ↗"}
              </b>
              <strong>{formatMarketPrice(buyPrice, market)}</strong>
              <MiniSpark type="green" />
            </button>

            <button
              type="button"
              className="sellLarge"
              onClick={() => order("Sell")}
              disabled={orderBusy || !priceReady || !marketOpen}
            >
              <b>
                {!marketOpen
                  ? "Closed"
                  : orderBusy
                  ? "Placing…"
                  : "Sell ↘"}
              </b>
              <strong>{formatMarketPrice(sellPrice, market)}</strong>
              <MiniSpark type="red" />
            </button>
          </div>
        </div>

        <div className="orderForm realMarketOrderForm">
          <div className="orderTabs">
            <button className="active">Market Order</button>
            <button type="button">Pending Order</button>
          </div>

          <div className="orderInputs">
            <OrderInput
              label="Volume (Lots)"
              value={volume}
              setValue={setVolume}
              step={0.01}
              min={0.01}
              decimals={2}
            />

            <label className="orderInput">
              <span>Leverage</span>
              <select
                value={leverage}
                onChange={(event) => setLeverage(event.target.value)}
              >
                <option>1:100</option>
                <option>1:200</option>
                <option>1:500</option>
              </select>
            </label>

            <OrderInput
              label="Stop Loss"
              value={stopLoss}
              setValue={setStopLoss}
              step={market.priceStep}
              min={0}
              decimals={market.decimals}
            />

            <OrderInput
              label="Take Profit"
              value={takeProfit}
              setValue={setTakeProfit}
              step={market.priceStep}
              min={0}
              decimals={market.decimals}
            />
          </div>
        </div>

        <button
          type="button"
          className="viewOpenTradesBtn"
          onClick={() => setActivePage("openTrades")}
        >
          <span>View Open Trades</span>
          <b>{accountPositions.length}</b>
          <em>›</em>
        </button>

        <div className="spreadStats compactSpreadStats realMarketStats">
          <p>
            <span>Balance</span>
            <b>{money(balance)} USD</b>
          </p>
          <p>
            <span>Free margin</span>
            <b>{money(freeMargin)} USD</b>
          </p>
          <p>
            <span>Used margin</span>
            <b>{money(usedMargin)} USD</b>
          </p>
          <p>
            <span>Floating P/L</span>
            <b className={floatingPl >= 0 ? "green" : "red"}>
              {floatingPl >= 0 ? "+" : ""}
              {money(floatingPl)} USD
            </b>
          </p>
        </div>

        {!MARKET_API_KEY && (
          <div className="marketKeyNotice">
            <b>Real chart connected</b>
            <span>
              Add <code>VITE_TWELVE_DATA_API_KEY</code> to enable live Buy,
              Sell, margin and profit calculations.
            </span>
          </div>
        )}

        {MARKET_API_KEY && marketFeed?.error && (
          <div className="marketKeyNotice error">
            <b>Quote feed notice</b>
            <span>{marketFeed.error}</span>
          </div>
        )}
      </section>
    </div>
  );
}

function OpenTradesPage({
  account,
  balance,
  positions,
  closedPositions,
  updatePosition,
  closePosition,
  closeAllPositions,
  back,
}) {
  const [tab, setTab] = useState("open");
  const [market, setMarket] = useState("All markets");

  const open = positions.filter((p) => p.account === account);
  const closed = closedPositions.filter((p) => p.account === account);
  const winning = open.filter((p) => Number(p.pl || 0) >= 0);
  const losing = open.filter((p) => Number(p.pl || 0) < 0);

  const selectedRows =
    tab === "winning" ? winning :
    tab === "losing" ? losing :
    tab === "history" ? closed : open;

  const rows = market === "All markets"
    ? selectedRows
    : selectedRows.filter((p) => p.instrument === market);

  const markets = Array.from(new Set([...open, ...closed].map((p) => p.instrument))).filter(Boolean);
  const floatingPl = open.reduce((sum, p) => sum + Number(p.pl || 0), 0);
  const usedMargin = open.reduce((sum, p) => sum + Number(p.margin || 0), 0);
  const equity = Number(balance || 0) + floatingPl;
  const freeMargin = Math.max(0, equity - usedMargin);
  const isHistory = tab === "history";

  return (
    <div className="page openTradesFullPage">
      <header className="openTradesHeader">
        <button type="button" onClick={back} aria-label="Back to market">‹</button>
        <div>
          <small>Markets</small>
          <h1>{isHistory ? "Trade History" : "Open Trades"}</h1>
        </div>
        <span className={`accountPill ${account}`}>{account === "real" ? "Real" : "Demo"}</span>
      </header>

      <section className="tradeOverviewCards">
        <article><span>Balance</span><strong>{money(balance)}</strong><small>USD</small></article>
        <article><span>Equity</span><strong>{money(equity)}</strong><small>USD</small></article>
        <article><span>Free margin</span><strong>{money(freeMargin)}</strong><small>USD</small></article>
        <article><span>Floating P/L</span><strong className={floatingPl >= 0 ? "green" : "red"}>{floatingPl >= 0 ? "+" : ""}{money(floatingPl)}</strong><small>USD</small></article>
      </section>

      <nav className="openTradeTabs" aria-label="Trade filters">
        <button className={tab === "open" ? "active" : ""} onClick={() => setTab("open")}>Open <b>{open.length}</b></button>
        <button className={tab === "winning" ? "active" : ""} onClick={() => setTab("winning")}>Winning <b>{winning.length}</b></button>
        <button className={tab === "losing" ? "active" : ""} onClick={() => setTab("losing")}>Losing <b>{losing.length}</b></button>
        <button className={tab === "history" ? "active" : ""} onClick={() => setTab("history")}>History <b>{closed.length}</b></button>
      </nav>

      <section className="openTradesControls">
        <label>
          <span>Market</span>
          <select value={market} onChange={(e) => setMarket(e.target.value)}>
            <option>All markets</option>
            {markets.map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>

        {!isHistory && (
          <button
            type="button"
            className="closeAllTradesBtn"
            disabled={open.length === 0}
            onClick={() => closeAllPositions({ account })}
          >
            Close all
          </button>
        )}
      </section>

      <section className="openTradeCardList">
        {rows.length === 0 && (
          <div className="openTradesEmpty">
            <b>{isHistory ? "No closed trades yet" : "No open trades"}</b>
            <span>{isHistory ? "Your completed positions will appear here." : "Go back to Markets and place a Buy or Sell order."}</span>
            {!isHistory && <button type="button" onClick={back}>Go to market</button>}
          </div>
        )}

        {rows.map((p) => (
          <article className="fullTradeCard" key={p.id}>
            <div className="fullTradeTop">
              <div>
                <small>{p.instrument}</small>
                <strong className={p.side === "Buy" ? "green" : "red"}>{p.side} · {p.volume} lot</strong>
              </div>
              <div className="fullTradeProfit">
                <span>Profit / Loss</span>
                <b className={Number(p.pl || 0) >= 0 ? "green" : "red"}>
                  {Number(p.pl || 0) >= 0 ? "+" : ""}{money(p.pl)} USD
                </b>
              </div>
            </div>

            <div className="fullTradeGrid">
              <p><span>Open price</span><b>{Number(p.openPrice || 0).toFixed(5)}</b></p>
              <p><span>Current price</span><b>{Number(p.currentPrice || p.openPrice || 0).toFixed(5)}</b></p>
              <p><span>Leverage</span><b>{p.leverage || "1:100"}</b></p>
              <p><span>Margin</span><b>{money(p.margin)} USD</b></p>
              <p><span>Opened</span><b>{p.openedAt || "—"}</b></p>
              <p><span>Status</span><b>{isHistory ? "Closed" : "Live"}</b></p>
            </div>

            <div className="tradeProtectionGrid">
              <label>
                <span>Stop Loss</span>
                {isHistory ? (
                  <b>{Number(p.stopLoss || 0).toFixed(5)}</b>
                ) : (
                  <input
                    type="number"
                    step="0.00001"
                    value={p.stopLoss ?? ""}
                    onChange={(e) => updatePosition(p.id, { stopLoss: e.target.value })}
                  />
                )}
              </label>

              <label>
                <span>Take Profit</span>
                {isHistory ? (
                  <b>{Number(p.takeProfit || 0).toFixed(5)}</b>
                ) : (
                  <input
                    type="number"
                    step="0.00001"
                    value={p.takeProfit ?? ""}
                    onChange={(e) => updatePosition(p.id, { takeProfit: e.target.value })}
                  />
                )}
              </label>
            </div>

            <div className="fullTradeFooter">
              <small>Ticket {String(p.id).slice(-8)} {isHistory && p.closedAt ? `· Closed ${p.closedAt}` : "· Updating live"}</small>
              {!isHistory && <button type="button" onClick={() => closePosition(p.id)}>Close trade</button>}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

function OrderInput({
  label,
  value,
  setValue,
  step,
  min,
  decimals = 5,
}) {
  function dec() {
    setValue(
      Number(
        Math.max(min, Number(value || 0) - Number(step || 0)).toFixed(decimals)
      )
    );
  }

  function inc() {
    setValue(
      Number(
        (Number(value || 0) + Number(step || 0)).toFixed(decimals)
      )
    );
  }

  return (
    <label className="orderInput">
      <span>{label}</span>

      <div>
        <input
          type="number"
          inputMode="decimal"
          value={value}
          min={min}
          step={step}
          onChange={(event) => setValue(Number(event.target.value))}
        />
        <button type="button" onClick={dec} aria-label={`Decrease ${label}`}>
          −
        </button>
        <button type="button" onClick={inc} aria-label={`Increase ${label}`}>
          +
        </button>
      </div>
    </label>
  );
}

function TradingViewMarketChart({ market, timeframe, marketOpen }) {
  const containerRef = useRef(null);
  const timeframeConfig =
    MARKET_TIMEFRAMES.find((item) => item.value === timeframe) ||
    MARKET_TIMEFRAMES[0];

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    container.innerHTML =
      '<div class="tradingview-widget-container__widget"></div>';

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: market.tradingViewSymbol,
      interval: timeframeConfig.tradingView,
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      backgroundColor: "rgba(2, 7, 13, 1)",
      gridColor: "rgba(35, 55, 78, 0.35)",
      hide_top_toolbar: true,
      hide_legend: false,
      allow_symbol_change: false,
      save_image: false,
      calendar: false,
      details: false,
      hotlist: false,
      withdateranges: false,
      support_host: "https://www.tradingview.com",
    });

    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
  }, [market.tradingViewSymbol, timeframeConfig.tradingView]);

  return (
    <div className="realChartShell">
      <div className="realChartCaption">
        <div>
          <span>{market.label}</span>
          <b>{market.symbol}</b>
        </div>

        <strong className={marketOpen ? "open" : "closed"}>
          <i />
          {marketOpen ? "OPEN" : "CLOSED"}
        </strong>
      </div>

      <div
        className="tradingview-widget-container realTradingViewWidget"
        ref={containerRef}
      />

      <div className="chartGestureHint">
        Drag to move · Pinch to zoom · Scroll through history
      </div>
    </div>
  );
}

function CandleChart({ symbol, prices, livePrice, positions, showLines }) {
  const candles = useMemo(() => {
    return prices.slice(-90).map((close, index, arr) => {
      const open = arr[index - 1] || close;
      const high = Math.max(open, close) + Math.random() * 0.0004;
      const low = Math.min(open, close) - Math.random() * 0.0004;
      return { open, close, high, low };
    });
  }, [prices]);

  const levels = [livePrice, ...positions.flatMap((p) => [p.openPrice, p.stopLoss, p.takeProfit])].filter(Boolean);

  const min = Math.min(...candles.map((c) => c.low), ...levels) - 0.00025;
  const max = Math.max(...candles.map((c) => c.high), ...levels) + 0.00025;
  const range = max - min || 1;

  function y(value) {
    return 248 - ((value - min) / range) * 210;
  }

  const step = 100 / candles.length;

  return (
    <div className="chartShell">
      <div className="chartTopStrip">
        <strong>🔎 {symbol}</strong>
        <small>1m</small>
        <small>30m</small>
        <small>1h</small>
        <small>Indicators</small>
      </div>

      <div className="chartTools">
        {["＋", "⌁", "☰", "⌘", "T", "◎", "▱", "⌕", "👁", "🗑"].map((tool) => (
          <button key={tool}>{tool}</button>
        ))}
      </div>

      <svg viewBox="0 0 100 260" preserveAspectRatio="none">
        <defs>
          <pattern id="grid" width="8" height="32" patternUnits="userSpaceOnUse">
            <path d="M8 0 L0 0 0 32" fill="none" stroke="rgba(255,255,255,.055)" strokeWidth=".15" />
          </pattern>
        </defs>

        <rect width="100" height="260" fill="url(#grid)" />

        <line x1="0" x2="100" y1={y(livePrice)} y2={y(livePrice)} stroke="#00d3a0" strokeDasharray="1 1.5" strokeWidth=".16" />

        {showLines &&
          positions.map((p) => (
            <g key={p.id}>
              <line x1="0" x2="100" y1={y(p.openPrice)} y2={y(p.openPrice)} stroke="#00e884" strokeDasharray="1 1.5" strokeWidth=".16" />
              <line x1="60" x2="100" y1={y(p.takeProfit)} y2={y(p.takeProfit)} stroke="#00e884" strokeDasharray="1 1.5" strokeWidth=".2" />
              <line x1="60" x2="100" y1={y(p.stopLoss)} y2={y(p.stopLoss)} stroke="#ff4057" strokeDasharray="1 1.5" strokeWidth=".2" />
            </g>
          ))}

        {candles.map((c, i) => {
          const x = i * step + step / 2;
          const up = c.close >= c.open;
          const top = y(Math.max(c.open, c.close));
          const bottom = y(Math.min(c.open, c.close));
          const color = up ? "#00d3a0" : "#ff4057";

          return (
            <g key={i}>
              <line x1={x} x2={x} y1={y(c.high)} y2={y(c.low)} stroke={color} strokeWidth=".16" />

              <rect x={x - step * 0.23} y={top} width={step * 0.46} height={Math.max(1.2, bottom - top)} fill={color} />

              <rect x={x - step * 0.18} y={224 + Math.random() * 10} width={step * 0.36} height={12 + Math.random() * 22} fill={up ? "rgba(0,211,160,.42)" : "rgba(255,64,87,.42)"} />
            </g>
          );
        })}
      </svg>

      <div className="priceTag" style={{ top: `${(y(livePrice) / 260) * 100}%` }}>
        {livePrice.toFixed(5)}
      </div>

      <div className="volumeTag">126</div>
    </div>
  );
}


function LineChart({ data = [] }) {
  const values = Array.isArray(data)
    ? data.map(Number).filter(Number.isFinite)
    : [];

  const safeValues =
    values.length >= 2
      ? values
      : values.length === 1
      ? [values[0], values[0]]
      : [0, 0];

  const min = Math.min(...safeValues);
  const max = Math.max(...safeValues);
  const range = max - min || 1;

  const points = safeValues.map((value, index) => {
    const x = (index / Math.max(1, safeValues.length - 1)) * 100;
    const y = 88 - ((value - min) / range) * 70;
    return [x, y];
  });

  const linePath = points
    .map(([x, y], index) =>
      `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`
    )
    .join(" ");

  const areaPath = `${linePath} L100,100 L0,100 Z`;

  return (
    <div className="lineChart" aria-hidden="true">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none">
        <path className="areaPath" d={areaPath} />
        <path
          className="linePath"
          d={linePath}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function TradePage({
  prices,
  livePrice,
  tradeType,
  setTradeType,
  stake,
  setStake,
  duration,
  setDuration,
  prediction,
  setPrediction,
  lastDigit,
  digitStats,
  activeBinaryTrade,
  binaryResultFlash,
  actionsFor,
  payoutRate,
  runBinaryTrade,
}) {
  const actions = actionsFor(tradeType);
  const indexValue = livePrice * 800;
  const payoutOne = money(stake * payoutRate(tradeType, actions[0]));
  const payoutTwo = money(stake * payoutRate(tradeType, actions[1]));
  const highestPercent = Math.max(...digitStats);
  const lowestPercent = Math.min(...digitStats);

  return (
    <div className="page tradePage tradePagePro">
      <section className="proTradeTypeRow">
        <span>Trade Type</span>

        {["Even/Odd", "Matches/Differs", "Over/Under", "Rise/Fall", "Touch/No Touch"].map((type) => (
          <button
            key={type}
            className={tradeType === type ? "active" : ""}
            onClick={() => setTradeType(type)}
            disabled={Boolean(activeBinaryTrade)}
          >
            {type}
          </button>
        ))}
      </section>

      <section className="proTradeChartCard binaryChartWithDigits">
        <div className="proChartTitle">
          <div>
            <h2>Volatility 100 (1s) Index</h2>
            <p>{indexValue.toFixed(2)} · LIVE</p>
          </div>

          <strong>▲ 12.42 (1.45%)</strong>
          <button>{duration} ticks⌄</button>
          <button>⛶</button>
        </div>

        <div className="proChartArea">
          <div className="priceScale">
            <span>{(indexValue + 1.37).toFixed(2)}</span>
            <span>{(indexValue - 0.63).toFixed(2)}</span>
            <span>{(indexValue - 2.63).toFixed(2)}</span>
            <span>{(indexValue - 4.63).toFixed(2)}</span>
            <span>{(indexValue - 6.63).toFixed(2)}</span>
          </div>

          <div className="proChartCanvas">
            <LineChart data={prices.map((x) => x * 800)} />
            <div className="worldMapGlow"></div>
            <div className="chartLivePrice">● {indexValue.toFixed(2)}</div>

            {activeBinaryTrade && (
              <div className="binaryTradeStatus" role="status">
                <span className="binaryTradePulse"></span>
                <strong>{activeBinaryTrade.action}</strong>
                <small>
                  {activeBinaryTrade.remainingTicks} of {activeBinaryTrade.totalTicks} ticks remaining
                </small>
              </div>
            )}

            <div className="chartDigitsOverlay" aria-label="Digit percentages">
              {digitStats.map((percent, digit) => {
                const isHighest = Math.abs(percent - highestPercent) < 0.01;
                const isLowest = Math.abs(percent - lowestPercent) < 0.01;
                const isPicked = digit === prediction;
                const isCurrent = digit === lastDigit;
                const isWaitingWinner =
                  Boolean(activeBinaryTrade) && digitWinsTrade(activeBinaryTrade, digit, livePrice);
                const isResultDigit = binaryResultFlash?.digit === digit;

                return (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => setPrediction(digit)}
                    disabled={Boolean(activeBinaryTrade)}
                    className={[
                      "chartDigit",
                      isHighest ? "highestDigit" : "",
                      isLowest ? "lowestDigit" : "",
                      isPicked ? "picked" : "",
                      isCurrent ? "currentDigit" : "",
                      isWaitingWinner ? "waitingWinner" : "",
                      isResultDigit && binaryResultFlash?.result === "win" ? "resultWin" : "",
                      isResultDigit && binaryResultFlash?.result === "loss" ? "resultLoss" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <strong>{digit}</strong>
                    <span className="digitPercent">{Number(percent).toFixed(1)}%</span>
                    <i className="movingDigitCursor" aria-hidden="true"></i>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="chartTimeRow">
          <span>10:45:30</span>
          <span>10:47:00</span>
          <span>10:48:30</span>
          <span>10:50:00</span>
          <span>10:51:30</span>
        </div>

        <div className="chartToolRow">
          <button>⌁</button>
          <button>▥</button>
          <button>▱</button>
          <button>⛶</button>
        </div>
      </section>

      <section className="proBinaryOrderCard">
        <div className="orderInputsTop">
          <label>
            Ticks
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              disabled={Boolean(activeBinaryTrade)}
            >
              <option value={5}>5 ticks</option>
              <option value={10}>10 ticks</option>
              <option value={30}>30 ticks</option>
            </select>
          </label>

          <label>
            Stake
            <div className="proStakeBox">
              <button
                onClick={() => setStake((x) => Math.max(0.3, Number(x) - 1))}
                disabled={Boolean(activeBinaryTrade)}
              >
                −
              </button>
              <strong>{money(stake)}</strong>
              <button
                onClick={() => setStake((x) => Number(x) + 1)}
                disabled={Boolean(activeBinaryTrade)}
              >
                +
              </button>
            </div>
          </label>
        </div>

        <div className="proTradeButtons">
          <button
            className="proGreenTrade"
            onClick={() => runBinaryTrade(tradeType, actions[0])}
            disabled={Boolean(activeBinaryTrade)}
          >
            <span>{actions[0] === "Even" ? "⌂" : "↗"}</span>
            <div>
              <strong>{actions[0]}</strong>
              <small>
                {activeBinaryTrade
                  ? `${activeBinaryTrade.remainingTicks} ticks remaining`
                  : `Payout ${payoutOne} USD`}
              </small>
            </div>
          </button>

          <button
            className="proRedTrade"
            onClick={() => runBinaryTrade(tradeType, actions[1])}
            disabled={Boolean(activeBinaryTrade)}
          >
            <span>{actions[1] === "Odd" ? "↓" : "↘"}</span>
            <div>
              <strong>{actions[1]}</strong>
              <small>
                {activeBinaryTrade
                  ? `${activeBinaryTrade.remainingTicks} ticks remaining`
                  : `Payout ${payoutTwo} USD`}
              </small>
            </div>
          </button>
        </div>
      </section>
    </div>
  );
}

function BotsPage({ bots, startBot }) {
  const running = bots.filter((x) => x.status === "Running").length;
  const stopped = bots.filter((x) => x.status === "Stopped").length;
  const completed = 4;

  return (
    <div className="page botsPage">
      <header className="botsTopBar">
        <div>
          <small>AI trading</small>
          <h1>My Bots</h1>
        </div>
        <span><b>{running}</b> running</span>
      </header>

      <section className="botStats">
        <Stat icon="🤖" value={bots.length} label="Total Bots" spark="blue" />
        <Stat icon="▶" value={running} label="Running" spark="green" />
        <Stat icon="Ⅱ" value={stopped} label="Stopped" spark="yellow" />
        <Stat icon="✓" value={completed} label="Completed" spark="purple" />
      </section>

      <section className="botFilters">
        <input placeholder="Search bots..." />
        <button>All Status</button>
        <button>Performance</button>
        <button>Strategy Type</button>
      </section>

      <section className="botGrid">
        {bots.map((bot, index) => (
          <article className="botCard" key={bot.id}>
            <div className={`botIcon botIcon${index + 1}`}>{bot.code}</div>

            <div>
              <h2>{bot.name}</h2>
              <p>
                {bot.type} · {bot.market}
              </p>
              <small>
                Stake: {money(bot.stake)} USD · Duration: {bot.duration}s
              </small>
            </div>

            <b className={bot.status === "Running" ? "botStatus running" : "botStatus stopped"}>{bot.status}</b>

            <div className="botGraph">
              <BotLine positive={bot.profit >= 0} />
            </div>

            <div className="botMetrics">
              <p>
                <span>Total Profit</span>
                <strong className={bot.profit >= 0 ? "green" : "red"}>
                  {bot.profit >= 0 ? "+" : ""}
                  {money(bot.profit)} USD
                </strong>
              </p>

              <p>
                <span>Win Rate</span>
                <strong>{bot.winRate}%</strong>
              </p>

              <p>
                <span>Trades</span>
                <strong>{bot.trades}</strong>
              </p>
            </div>

            <button className="botAction" onClick={() => startBot(bot)}>
              {bot.status === "Running" ? "View Details" : "Start Bot"}
            </button>
          </article>
        ))}
      </section>
    </div>
  );
}

function BotLine({ positive }) {
  const points = positive
    ? "2,52 16,47 32,38 48,41 65,28 82,22 99,26 118,16 138,20 156,12"
    : "2,20 18,25 33,22 51,34 70,37 86,43 105,39 124,51 145,48 158,57";

  return (
    <svg viewBox="0 0 160 70" preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke={positive ? "#00e884" : "#ff4057"}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BotLivePage({ bot, running, stopBot, startBot, trades, botTab, setBotTab, back }) {
  const profitLoss = trades.reduce((sum, trade) => sum + (trade.won ? trade.profit : -trade.stake), 0);
  const last = trades[0];

  if (!bot) {
    return (
      <div className="page emptyPage">
        <button onClick={back}>‹ Back to Bots</button>
        <h2>Select a bot first.</h2>
      </div>
    );
  }

  return (
    <div className="page botLivePage">
      <div className="botLiveTop">
        <button onClick={back}>‹ Back to Bot</button>
        <strong>{bot.name}</strong>
      </div>

      <section className="runnerBox">
        <button className={running ? "stopRunner" : "startRunner"} onClick={running ? stopBot : () => startBot(bot)}>
          {running ? "■ Stop" : "▶ Run"}
        </button>

        <div>
          <strong>{running ? "Contract bought" : "Bot is not running"}</strong>
          <span>
            <i></i>
          </span>
        </div>
      </section>

      <section className="runnerTabs">
        {["summary", "transactions", "journal"].map((tab) => (
          <button key={tab} className={botTab === tab ? "active" : ""} onClick={() => setBotTab(tab)}>
            {tab}
          </button>
        ))}
      </section>

      <section className="runnerBody">
        {botTab === "summary" && (
          <div className={last?.won ? "runnerResult won" : last ? "runnerResult lost" : "runnerResult"}>
            <strong>{last ? "Closed" : "Ready"}</strong>
            <h2>{last ? `${last.won ? "+" : "-"}${money(last.won ? last.profit : last.stake)} USD` : "Hit Run"}</h2>
          </div>
        )}

        {botTab === "transactions" && (
          <div className="runnerList">
            {trades.slice(0, 8).map((trade) => (
              <p key={trade.id}>
                <span>
                  {trade.type} · {trade.action}
                </span>

                <b className={trade.won ? "green" : "red"}>
                  {trade.won ? "+" : "-"}
                  {money(trade.won ? trade.profit : trade.stake)}
                </b>
              </p>
            ))}
          </div>
        )}

        {botTab === "journal" && (
          <div className="runnerList">
            {trades.slice(0, 8).map((trade) => (
              <p key={trade.id}>
                <span>{trade.won ? "Profit amount" : "Loss amount"}</span>
                <small>{trade.time}</small>
              </p>
            ))}
          </div>
        )}
      </section>

      <section className="runnerStats">
        <Stat value={trades.length} label="Runs" />
        <Stat value={trades.filter((x) => x.won).length} label="Won" />
        <Stat value={trades.filter((x) => !x.won).length} label="Lost" />
        <Stat value={`${profitLoss >= 0 ? "+" : ""}${money(profitLoss)}`} label="P/L" />
      </section>
    </div>
  );
}

function ProfilePage({ user, account, balances, transactions, referral, applyReferralProgram, logout, setActivePage }) {
  const realBalance = balances?.real || 0;
  const demoBalance = balances?.demo || 10000;
  const accountId = user?.brokerId || "MB168844";
  const userName = user?.name || user?.email?.split("@")[0] || "captionfitness";
  const userEmail = user?.email || "captionfitness@gmail.com";
  const userInitial = user?.initials || initials(userName);
  const referralCode = referral?.code || "";
  const referralLink = referral?.link || "";
  const referralApproved = referral?.status === "approved";
  const referralEarned = referral?.totalEarned || 0;
  const referralCount = referral?.totalReferrals || 0;
  const accountLabel = account === "real" ? "Real Account" : "Demo Account";
  const tradeTransactions = (transactions || []).filter(
    (tx) => ["Manual", "Bot", "Forex"].includes(tx.method) && Number(tx.amount) !== 0
  );
  const totalProfit = tradeTransactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const winningTrades = tradeTransactions.filter((tx) => Number(tx.amount) > 0).length;
  const winRate = tradeTransactions.length
    ? (winningTrades / tradeTransactions.length) * 100
    : 0;

  const profileCards = [
    {
      icon: "⚙",
      title: "Settings",
      text: "Manage your preferences and platform settings",
      button: "Customize",
      color: "blue",
      action: () => setActivePage("settings"),
    },
    {
      icon: "↺",
      title: "Transaction History",
      text: "View deposits, withdrawals and trading history",
      button: "View History",
      color: "purple",
      action: () => setActivePage("history"),
    },
    {
      icon: "🛡",
      title: "KYC Verification",
      text: "Verify your identity to unlock all platform features",
      button: user?.verified ? "Verified ✓" : "Start Verification",
      color: "green",
      action: () => {},
    },
    {
      icon: "💳",
      title: "Payment Methods",
      text: "Manage your deposit and withdrawal methods",
      button: "Manage Methods",
      color: "blue",
      action: () => setActivePage("history"),
    },
    {
      icon: "🔒",
      title: "Security",
      text: "Password, 2FA and account security settings",
      button: "Security Center",
      color: "green",
      action: () => setActivePage("settings"),
    },
    {
      icon: "🔔",
      title: "Notifications",
      text: "Manage email, SMS and push notifications",
      button: "Manage Alerts",
      color: "yellow",
      action: () => setActivePage("settings"),
    },
  ];

  return (
    <div className="page profilePage proProfilePage">
      <section className="proProfileHero">
        <div className="proProfileAvatarWrap">
          <div className="proProfileAvatar">{userInitial}</div>
          <span className="profileOnlineBadge">✓</span>
        </div>

        <div className="proProfileIdentity">
          <h1>
            {userName}
            <span>✓</span>
          </h1>

          <p>{userEmail}</p>

          <div className="profileVerifiedRow">
            <b>Verified</b>
          </div>

          <div className="profileMetaRow">
            <span>
              Account ID
              <strong>{accountId}</strong>
            </span>

            <i></i>

            <span>
              Status
              <strong className="activeStatus">● Active — {accountLabel}</strong>
            </span>
          </div>
        </div>

        <div className="profileHeroArt">
          <div className="profileArtLine"></div>
          <div className="profileArtBadge">MB</div>
        </div>
      </section>

      <section className="proProfileStats">
        <ProfileBalanceCard icon="💼" label="REAL BALANCE" value={`${money(realBalance)} USD`} color="blue" />
        <ProfileBalanceCard icon="▮▮▮" label="DEMO BALANCE" value={`${money(demoBalance)} USD`} color="purple" />
        <ProfileBalanceCard icon="📈" label="TOTAL PROFIT" value={`${totalProfit >= 0 ? "+" : ""}${money(totalProfit)} USD`} color={totalProfit >= 0 ? "green" : "red"} />
        <ProfileBalanceCard icon="◎" label="WIN RATE" value={`${winRate.toFixed(1)}%`} color="yellow" />
      </section>

      <section className="proProfileMain">
        <div className="profileCardsGrid">
          {profileCards.map((card) => (
            <button className="profileActionCard" key={card.title} onClick={card.action}>
              <div className={`profileActionIcon ${card.color}`}>{card.icon}</div>

              <div>
                <h3>{card.title}</h3>
                <p>{card.text}</p>

                <span className={card.title === "KYC Verification" ? "verifiedMiniBtn" : ""}>
                  {card.button} <em>›</em>
                </span>
              </div>
            </button>
          ))}

          <div className="supportWideCard">
            <div className="profileActionIcon blue">🎧</div>

            <div>
              <h3>Support Center</h3>
              <p>Get help from our support team 24/7</p>
            </div>

            <div className="responseTime">
              <small>Support Availability</small>
              <strong>● Online</strong>
            </div>

            <button>Contact Support ›</button>
          </div>
        </div>

        <aside className="referralPanel">
          <div className="profileActionIcon purple">👥</div>

          <h2>Referral Program</h2>
          <p>
            {referralApproved
              ? "Your referral account is active. Invite traders and earn up to 30% commission from referred deposits."
              : "Apply once to receive your personal referral link and start earning commissions."}
          </p>

          <div className={referralApproved ? "referralStatus approved" : "referralStatus pending"}>
            <b>{referralApproved ? "Approved Partner" : "Not Applied Yet"}</b>
            <span>{referralApproved ? `Code: ${referralCode}` : "Create your link in one click"}</span>
          </div>

          {referralApproved ? (
            <>
              <label>YOUR REFERRAL LINK</label>

              <div className="referralLinkBox">
                <span>{referralLink}</span>

                <button onClick={() => navigator.clipboard?.writeText(referralLink)}>⧉</button>
              </div>

              <div className="referralStatsBox">
                <div>
                  <small>TOTAL EARNED</small>
                  <strong>{money(referralEarned)} USD</strong>
                </div>

                <div>
                  <small>TOTAL REFERRALS</small>
                  <strong>{referralCount}</strong>
                </div>
              </div>

              <button className="referralDashboardBtn">View Referral Dashboard ›</button>
            </>
          ) : (
            <button className="referralApplyBtn" onClick={applyReferralProgram}>
              Apply & Get Referral Link →
            </button>
          )}
        </aside>
      </section>

      <button className="proLogoutButton" onClick={logout}>
        <span>⇥</span>

        <div>
          <strong>Logout</strong>
          <small>Sign out of your account</small>
        </div>

        <em>›</em>
      </button>
    </div>
  );
}

function ProfileBalanceCard({ icon, label, value, color }) {
  return (
    <button className="profileBalanceCard">
      <div className={`profileBalanceIcon ${color}`}>{icon}</div>

      <div>
        <span>{label}</span>
        <strong className={color === "green" ? "green" : color === "red" ? "red" : ""}>{value}</strong>
      </div>

      <em>›</em>
    </button>
  );
}

function SettingsPage({ account, setAccount, tradeType, setTradeType, stake, setStake }) {
  return (
    <div className="page settingsPage">
      <section className="settingsHero">
        <h1>Settings</h1>
        <p>Manage your account preferences and platform settings.</p>
      </section>

      <section className="settingsPanel">
        <h2>Platform Preferences</h2>

        <label>
          <span>Default Account</span>
          <select value={account} onChange={(e) => setAccount(e.target.value)}>
            <option value="demo">Demo Account</option>
            <option value="real">Real Account</option>
          </select>
        </label>

        <label>
          <span>Default Trade Type</span>
          <select value={tradeType} onChange={(e) => setTradeType(e.target.value)}>
            <option>Even/Odd</option>
            <option>Matches/Differs</option>
            <option>Over/Under</option>
            <option>Rise/Fall</option>
            <option>Touch/No Touch</option>
          </select>
        </label>

        <label>
          <span>Default Stake</span>

          <div className="stakeBox">
            <button onClick={() => setStake((x) => Math.max(0.3, Number(x) - 1))}>−</button>
            <strong>{money(stake)}</strong>
            <button onClick={() => setStake((x) => Number(x) + 1)}>+</button>
          </div>
        </label>

        <div className="toggleGrid">
          {["Confirm before trading", "Quick Trade", "Sound Alerts", "Compact Mode"].map((item) => (
            <p key={item}>
              <span>{item}</span>
              <b></b>
            </p>
          ))}
        </div>
      </section>
    </div>
  );
}

function HistoryPage({ transactions }) {
  return (
    <div className="page listPage">
      <h1>History</h1>

      <section className="listPanel">
        {transactions.length === 0 && <p>No history yet.</p>}

        {transactions.slice(0, 14).map((tx) => (
          <div key={tx.id}>
            <span>
              <strong>{tx.type}</strong>
              <small>{tx.time}</small>
            </span>

            <b className={tx.amount >= 0 ? "green" : "red"}>
              {tx.amount >= 0 ? "+" : ""}
              {money(tx.amount)} USD
            </b>
          </div>
        ))}
      </section>
    </div>
  );
}

function ReportsPage({ transactions, closedPositions, botTrades }) {
  return (
    <div className="page reportsPage">
      <h1>Reports</h1>

      <section className="homeStats">
        <Stat value={transactions.length} label="Transactions" spark="blue" />
        <Stat value={closedPositions.length} label="Forex Closed" spark="green" />
        <Stat value={botTrades.filter((x) => x.won).length} label="Bot Wins" spark="purple" />
        <Stat value={botTrades.filter((x) => !x.won).length} label="Bot Losses" spark="yellow" />
      </section>
    </div>
  );
}

function BottomNav({ activePage, setActivePage }) {
  const items = [
    ["home", "Home", "⌂"],
    ["forex", "Markets", "▥"],
    ["trade", "Trade", "↕"],
    ["bots", "Bots", "🤖"],
    ["profile", "Profile", "♙"],
  ];

  return (
    <nav className="bottomNav" aria-label="Primary navigation">
      {items.map(([key, label, icon]) => (
        <button
          key={key}
          className={
            activePage === key ||
            (key === "bots" && activePage === "botLive") ||
            (key === "forex" && activePage === "openTrades")
              ? "active"
              : ""
          }
          onClick={() => setActivePage(key)}
          aria-label={label}
          aria-current={
            activePage === key || (key === "forex" && activePage === "openTrades")
              ? "page"
              : undefined
          }
        >
          <span>{icon}</span>
          <small>{label}</small>
        </button>
      ))}
    </nav>
  );
}

function SideMenu({ user, account, setAccount, balance, close, setActivePage, openDeposit, openWithdraw, logout }) {
  function go(page) {
    setActivePage(page);
    close();
  }

  return (
    <div className="menuLayer">
      <button className="menuShade" onClick={close} aria-label="Close menu"></button>

      <aside className="sideDrawer" role="dialog" aria-modal="true" aria-label="Main menu">
        <div className="drawerTop">
          <Logo />
          <button onClick={close}>×</button>
        </div>

        <section className="drawerAccount">
          <div className="drawerUser">
            <div>{user.initials || initials(user.name || user.email)}</div>

            <section>
              <small>{account === "demo" ? "Demo Account" : "Real Account"}</small>
              <strong>{money(balance)} USD</strong>
              {account === "real" && <span>Account ID: {user.brokerId} ⧉</span>}
            </section>
          </div>

          <div className="drawerSwitch">
            <button className={account === "demo" ? "active" : ""} onClick={() => setAccount("demo")}>
              Demo
            </button>

            <button className={account === "real" ? "active" : ""} onClick={() => setAccount("real")}>
              Real
            </button>
          </div>
        </section>

        <div className="drawerGrid">
          <DrawerBlock title="TRADING">
            <DrawerButton icon="⌂" label="Trader’s Hub" onClick={() => go("home")} />
            <DrawerButton icon="▥" label="Markets" onClick={() => go("forex")} />
            <DrawerButton icon="↕" label="Trade" onClick={() => go("trade")} />
          </DrawerBlock>

          <DrawerBlock title="FUNDS">
            <DrawerButton
              icon="▱"
              label="Cashier / Deposit"
              onClick={() => {
                openDeposit();
                close();
              }}
            />

            <DrawerButton
              icon="⇧"
              label="Withdraw"
              onClick={() => {
                openWithdraw();
                close();
              }}
            />

            <DrawerButton icon="↺" label="History" onClick={() => go("history")} />
          </DrawerBlock>

          <DrawerBlock title="AUTOMATION">
            <DrawerButton icon="🤖" label="My Bots" onClick={() => go("bots")} />
            <DrawerButton icon="▶" label="Running Bots" onClick={() => go("botLive")} />
            <DrawerButton icon="▣" label="Reports" onClick={() => go("reports")} />
          </DrawerBlock>

          <DrawerBlock title="ACCOUNT">
            <DrawerButton icon="♙" label="Profile" onClick={() => go("profile")} />
            <DrawerButton icon="⚙" label="Settings" onClick={() => go("settings")} />
            <DrawerButton icon="🔔" label="Notifications" badge="3" onClick={() => go("settings")} />
          </DrawerBlock>
        </div>

        <button className="drawerLogout" onClick={logout}>
          ⇥ Logout
        </button>
      </aside>
    </div>
  );
}

function DrawerBlock({ title, children }) {
  return (
    <section className="drawerBlock">
      <h4>{title}</h4>
      {children}
    </section>
  );
}

function DrawerButton({ icon, label, badge, onClick }) {
  return (
    <button className="drawerButton" onClick={onClick}>
      <span>{icon}</span>
      <strong>{label}</strong>
      {badge && <b>{badge}</b>}
      <em>›</em>
    </button>
  );
}

function DepositModal({ close, submit }) {
  const [method, setMethod] = useState("");
  const [amountUsd, setAmountUsd] = useState(10);
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);
    const completed = await submit({ method, amountUsd, phone });
    if (!completed) setSubmitting(false);
  }

  return (
    <div className="modalLayer">
      <div className="depositModal" role="dialog" aria-modal="true" aria-label="Deposit funds">
        <button className="closeModal" onClick={close} aria-label="Close dialog" disabled={submitting}>
          ×
        </button>

        {!method ? (
          <>
            <h2>Deposit Funds</h2>
            <p>Choose payment method</p>

            <PaymentButton icon="📱" title="M-Pesa" text="Instant mobile money" onClick={() => setMethod("mpesa")} />
            <PaymentButton icon="💳" title="Credit/Debit Card" text="Secure hosted checkout" onClick={() => setMethod("card")} />
          </>
        ) : (
          <>
            <button className="modalBack" onClick={() => setMethod("")} disabled={submitting}>
              ‹ Back
            </button>

            <h2>{method === "mpesa" ? "M-Pesa Deposit" : "Card Deposit"}</h2>
            <p>Funds go to your real account.</p>

            <label>Amount USD</label>
            <input type="number" min="1" value={amountUsd} onChange={(e) => setAmountUsd(e.target.value)} disabled={submitting} />

            {method === "mpesa" && (
              <>
                <label>Phone Number</label>
                <input placeholder="07XXXXXXXX or 2547XXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={submitting} />
              </>
            )}

            <button className="modalPrimary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? "Please wait…" : method === "mpesa" ? "Send STK Push" : "Continue to secure checkout"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function PaymentButton({ icon, title, text, onClick }) {
  return (
    <button className="paymentButton" onClick={onClick}>
      <span>{icon}</span>

      <div>
        <strong>{title}</strong>
        <small>{text}</small>
      </div>

      <b>›</b>
    </button>
  );
}

function WithdrawModal({ close, submit }) {
  const [amountUsd, setAmountUsd] = useState(5);
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);
    const completed = await submit({ amountUsd, phone });
    if (!completed) setSubmitting(false);
  }

  return (
    <div className="modalLayer">
      <div className="depositModal" role="dialog" aria-modal="true" aria-label="Withdraw funds">
        <button className="closeModal" onClick={close} aria-label="Close dialog" disabled={submitting}>
          ×
        </button>

        <h2>Withdraw Funds</h2>
        <p>Minimum withdrawal is 5 USD.</p>

        <label>Amount USD</label>
        <input type="number" min="5" value={amountUsd} onChange={(e) => setAmountUsd(e.target.value)} disabled={submitting} />

        <label>M-Pesa Phone</label>
        <input placeholder="07XXXXXXXX or 2547XXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={submitting} />

        <button className="modalPrimary" onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Submitting…" : "Request Withdrawal"}
        </button>
      </div>
    </div>
  );
}

function Toast({ toast }) {
  const icon = toast.type === "win" ? "✓" : toast.type === "loss" ? "×" : "↗";

  return (
    <div className={`toast compactTradeToast ${toast.type}`} role="status" aria-live="polite">
      <i>{icon}</i>
      <div>
        <strong>{toast.title}</strong>
        <span>{toast.message}</span>
      </div>
    </div>
  );
}
