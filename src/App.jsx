
import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

const API_URL = String(
  import.meta.env.VITE_API_URL ||
    (import.meta.env.DEV ? "http://localhost:5000" : "")
).replace(/\/+$/, "");

const FRONTEND_BUILD = "metabinary-wallet-selector-v11-2026-07-13";
const DIGIT_TICK_MS = 1000;
const BOT_CYCLE_DELAY_MS = 250;
const REFERRAL_COMMISSION_PERCENT = Math.max(
  0,
  Math.min(100, Number(import.meta.env.VITE_REFERRAL_COMMISSION_PERCENT || 5))
);

const VOLATILITY_OPTIONS = [
  {
    id: "vol10",
    label: "Volatility 10 Index",
    short: "V10",
    start: 1.205,
    scale: 800,
    step: 0.00016,
    wave: 0.000025,
    priceStep: 0.75,
    description: "Lower movement",
  },
  {
    id: "vol10-1s",
    label: "Volatility 10 (1s) Index",
    short: "V10 1s",
    start: 1.236,
    scale: 800,
    step: 0.0002,
    wave: 0.00003,
    priceStep: 0.9,
    description: "Lower one-second movement",
  },
  {
    id: "vol25",
    label: "Volatility 25 Index",
    short: "V25",
    start: 1.112,
    scale: 800,
    step: 0.00027,
    wave: 0.000045,
    priceStep: 1.1,
    description: "Moderate movement",
  },
  {
    id: "vol25-1s",
    label: "Volatility 25 (1s) Index",
    short: "V25 1s",
    start: 1.148,
    scale: 800,
    step: 0.00033,
    wave: 0.000055,
    priceStep: 1.25,
    description: "Moderate one-second movement",
  },
  {
    id: "vol50",
    label: "Volatility 50 Index",
    short: "V50",
    start: 1.31,
    scale: 800,
    step: 0.0004,
    wave: 0.000065,
    priceStep: 1.55,
    description: "Balanced movement",
  },
  {
    id: "vol50-1s",
    label: "Volatility 50 (1s) Index",
    short: "V50 1s",
    start: 1.348,
    scale: 800,
    step: 0.00048,
    wave: 0.000075,
    priceStep: 1.75,
    description: "Balanced one-second movement",
  },
  {
    id: "vol75",
    label: "Volatility 75 Index",
    short: "V75",
    start: 1.42,
    scale: 800,
    step: 0.00055,
    wave: 0.00009,
    priceStep: 2.0,
    description: "Higher movement",
  },
  {
    id: "vol75-1s",
    label: "Volatility 75 (1s) Index",
    short: "V75 1s",
    start: 1.46,
    scale: 800,
    step: 0.00064,
    wave: 0.000105,
    priceStep: 2.2,
    description: "Higher one-second movement",
  },
  {
    id: "vol100",
    label: "Volatility 100 Index",
    short: "V100",
    start: 1.018,
    scale: 800,
    step: 0.00072,
    wave: 0.00012,
    priceStep: 2.45,
    description: "Strong movement",
  },
  {
    id: "vol100-1s",
    label: "Volatility 100 (1s) Index",
    short: "V100 1s",
    start: 1.086,
    scale: 800,
    step: 0.00082,
    wave: 0.000135,
    priceStep: 2.7,
    description: "Strong one-second movement",
  },
];

if (typeof window !== "undefined") {
  window.__METABINARY_BUILD__ = FRONTEND_BUILD;
  console.info(`MetaBinary frontend build: ${FRONTEND_BUILD}`);
}

const STORE = {
  user: "mb_user",
  token: "mb_auth_token",
  adminToken: "mb_admin_token",
  account: "mb_account",
  balances: "mb_balances",
  tx: "mb_transactions",
  positions: "mb_positions",
  closed: "mb_closed_positions",
  referral: "mb_referral_profile",
  notifications: "mb_notifications",
  binaryMarket: "mb_binary_market",
  botConfig: "mb_bot_config",
  aiPosition: "mb_ai_position",
  supportTicket: "mb_support_ticket",
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

const TRADING_PAGES = new Set([
  "home",
  "markets",
  "forex",
  "openTrades",
  "trade",
  "bots",
  "botSetup",
  "botLive",
  "profile",
  "settings",
  "referrals",
  "history",
  "reports",
]);

function initialTradingPage() {
  if (typeof window === "undefined") return "home";
  const page = window.location.hash.replace(/^#/, "");
  if (page === "markets") return "forex";
  return TRADING_PAGES.has(page) ? page : "home";
}

function defaultBotAction(type) {
  if (type === "Even/Odd") return "Even";
  if (type === "Matches/Differs") return "Differs";
  if (type === "Over/Under") return "Over";
  if (type === "Rise/Fall") return "Rise";
  return "No Touch";
}

function createBotConfig(bot = BOT_TEMPLATES[0]) {
  const matchedMarket =
    VOLATILITY_OPTIONS.find((market) => market.label === bot?.market) ||
    VOLATILITY_OPTIONS[VOLATILITY_OPTIONS.length - 1];

  return {
    botId: bot?.id || "custom-bot",
    name: bot?.name || "MetaBinary Bot",
    type: bot?.type || "Even/Odd",
    action: defaultBotAction(bot?.type || "Even/Odd"),
    marketId: matchedMarket.id,
    prediction: 2,
    stake: Math.max(0.3, Math.min(1, Number(bot?.stake || 1))),
    ticks: Math.min(10, Math.max(1, Number(bot?.duration || 5))),
    martingaleEnabled: true,
    martingaleMultiplier: 2,
    martingaleSteps: 3,
    takeProfit: 50,
    stopLoss: 30,
  };
}

function createAiAutoSession(overrides = {}) {
  return {
    id: "",
    running: false,
    mode: "",
    status: "Idle",
    pnl: 0,
    lastNet: 0,
    lastResult: "",
    lastResultAt: 0,
    trades: 0,
    wins: 0,
    losses: 0,
    targetProfit: 0,
    stopLoss: 0,
    startedAt: 0,
    completedAt: 0,
    positionId: "",
    signal: null,
    ...overrides,
  };
}

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

function referralCodeFromLocation() {
  if (typeof window === "undefined") return "";

  const queryCode = new URLSearchParams(window.location.search).get("ref") || "";
  const pathMatch = window.location.pathname.match(/\/ref\/([^/?#]+)/i);
  const raw = queryCode || pathMatch?.[1] || "";

  try {
    return decodeURIComponent(raw).trim().toUpperCase().slice(0, 80);
  } catch {
    return String(raw).trim().toUpperCase().slice(0, 80);
  }
}

function ringPoint(angleDegrees, radius = 42, center = 50) {
  const radians = ((Number(angleDegrees) - 90) * Math.PI) / 180;
  return {
    x: center + radius * Math.cos(radians),
    y: center + radius * Math.sin(radians),
  };
}

function ringArcPath(startAngle, endAngle, radius = 42) {
  const safeStart = Number(startAngle);
  const safeEnd = Number(endAngle);
  const start = ringPoint(safeStart, radius);
  const end = ringPoint(safeEnd, radius);
  const sweep = Math.max(0.01, safeEnd - safeStart);
  const largeArcFlag = sweep > 180 ? 1 : 0;

  return [
    "M",
    start.x.toFixed(3),
    start.y.toFixed(3),
    "A",
    radius,
    radius,
    0,
    largeArcFlag,
    1,
    end.x.toFixed(3),
    end.y.toFixed(3),
  ].join(" ");
}

function centeredRingArcPath(centerAngle, sweepAngle, radius = 42) {
  const halfSweep = Math.max(1, Math.min(359, Number(sweepAngle))) / 2;
  return ringArcPath(Number(centerAngle) - halfSweep, Number(centerAngle) + halfSweep, radius);
}


function isDigitContract(type) {
  return ["Even/Odd", "Matches/Differs", "Over/Under"].includes(type);
}

function estimatedTouchProbability({ ticks = 5, barrierDistance = 2 } = {}) {
  const safeTicks = Math.max(1, Math.min(10, Number(ticks || 5)));
  const safeDistance = Math.max(0.5, Number(barrierDistance || 2));
  return Math.max(0.12, Math.min(0.82, safeTicks / (safeTicks + safeDistance * 2.5)));
}

const DIGIT_PAYOUT_BY_WINNING_DIGITS = Object.freeze({
  1: 9.68,
  2: 4.84,
  3: 3.23,
  4: 2.42,
  5: 1.93,
  6: 1.61,
  7: 1.39,
  8: 1.22,
  9: 1.09,
});

function estimatedContractMultiplier(type, action, prediction = 2, options = {}) {
  const digit = Math.max(0, Math.min(9, Number(prediction ?? 0)));

  if (type === "Even/Odd" || type === "Rise/Fall") return 1.9;
  if (type === "Matches/Differs") return action === "Matches" ? 8.33 : 1.09;
  if (type === "Over/Under") {
    const winningDigits = action === "Over" ? Math.max(0, 9 - digit) : Math.max(0, digit);
    return Number(DIGIT_PAYOUT_BY_WINNING_DIGITS[winningDigits] || 0);
  }
  if (type === "Touch/No Touch") {
    const touchProbability = estimatedTouchProbability(options);
    const probability = action === "Touch" ? touchProbability : 1 - touchProbability;
    return Number(Math.max(1.05, Math.min(8, 0.95 / probability)).toFixed(3));
  }
  return 0;
}

function playPlatformTone(kind = "success", preferences = {}) {
  const enabled = preferences.botSounds !== false;
  if (!enabled) return;
  if (kind === "target" && preferences.takeProfitSound === false) return;
  if (kind === "stop" && preferences.stopLossSound === false) return;

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const volume = Math.max(0, Math.min(1, Number(preferences.soundVolume ?? 70) / 100));
    const notes = kind === "target" ? [659, 784, 988] : [392, 294, 220];
    notes.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = context.currentTime + index * 0.16;
      oscillator.type = kind === "target" ? "sine" : "square";
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume * 0.13), start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.14);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.15);
    });
    window.setTimeout(() => context.close().catch(() => {}), 900);
  } catch {
    // Browsers may block sound until the trader has interacted with the page.
  }
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

function normalizeApiUser(raw = {}) {
  const fullName = raw.fullName || raw.name || String(raw.email || "MetaBinary User").split("@")[0];
  const brokerId = raw.brokerId || raw.accountId || "";
  return {
    ...raw,
    name: fullName,
    fullName,
    brokerId,
    accountId: raw.accountId || brokerId,
    initials: initials(fullName),
    verified: Boolean(raw.verified ?? raw.emailVerified ?? false),
  };
}

function currentUserToken() {
  return localStorage.getItem(STORE.token) || "";
}

function currentAdminToken() {
  return localStorage.getItem(STORE.adminToken) || "";
}

function apiHeaders(extra = {}, token = currentUserToken()) {
  return {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
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

function makeInitialDigitStats(seed = 0) {
  const base = [10.5, 9.8, 11.2, 8.9, 10.1, 9.4, 10.8, 9.7, 10.4, 9.2];
  const offset = Math.abs(Number(seed) || 0) % base.length;
  return base.map((_, index) => {
    const value = base[(index + offset) % base.length];
    const adjustment = (((index * 3 + offset) % 5) - 2) * 0.1;
    return Number(Math.max(DIGIT_MIN_PERCENT, Math.min(DIGIT_MAX_PERCENT, value + adjustment)).toFixed(1));
  });
}

function createBinaryMarketState(market, index = 0) {
  const start = Number(market?.start || 1.2) + Number(market?.step || 0.0002) * (index + 1) * 5;
  return {
    prices: makePrices(start),
    digitStats: makeInitialDigitStats(index),
    lastDigit: (index * 3 + 2) % 10,
    updatedAt: Date.now() - index * 1000,
  };
}

function createInitialBinaryMarketStates() {
  return Object.fromEntries(
    VOLATILITY_OPTIONS.map((market, index) => [market.id, createBinaryMarketState(market, index)])
  );
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
  let backendError = null;

  if (API_URL) {
    try {
      const url = new URL(`${API_URL}/api/markets/quote`);
      url.searchParams.set("symbol", market.symbol);
      const response = await fetch(url, { signal, cache: "no-store" });
      const data = await readApiResponse(response);
      if (!response.ok || data?.ok === false) {
        throw new Error(data?.message || "Unable to load the server market quote.");
      }
      return normalizeMarketQuote(data.quote || data, market);
    } catch (error) {
      if (error?.name === "AbortError") throw error;
      backendError = error;
    }
  }

  if (MARKET_API_KEY) {
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

  throw backendError || new Error(
    market.symbol === "BTC/USD"
      ? "Bitcoin live price is temporarily unavailable."
      : "Add TWELVE_DATA_API_KEY to the backend for live forex and metals prices."
  );
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

function TradingApp() {
  const [user, setUser] = useState(() => readStore(STORE.user, null));
  const [authToken, setAuthToken] = useState(() => localStorage.getItem(STORE.token) || "");
  const [authMode, setAuthMode] = useState(() =>
    new URLSearchParams(window.location.search).get("reset_token") ? "reset" : "login"
  );

  const [activePage, setActivePage] = useState(initialTradingPage);
  const [account, setAccount] = useState(() => readStore(STORE.account, "demo"));
  const [balances, setBalances] = useState(() =>
    readStore(STORE.balances, { demo: 10000, real: 0 })
  );

  const [binaryMarketId, setBinaryMarketId] = useState(() =>
    readStore(STORE.binaryMarket, "vol100-1s")
  );
  const activeBinaryMarket =
    VOLATILITY_OPTIONS.find((market) => market.id === binaryMarketId) ||
    VOLATILITY_OPTIONS[VOLATILITY_OPTIONS.length - 1];
  const [binaryMarketStates, setBinaryMarketStates] = useState(createInitialBinaryMarketStates);
  const activeBinaryState =
    binaryMarketStates[binaryMarketId] || createBinaryMarketState(activeBinaryMarket, 0);
  const prices = activeBinaryState.prices;
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
  const lastDigit = Number(activeBinaryState.lastDigit || 0);
  const digitStats = Array.isArray(activeBinaryState.digitStats)
    ? activeBinaryState.digitStats
    : makeInitialDigitStats();
  const [activeBinaryTrade, setActiveBinaryTrade] = useState(null);
  const [binaryResultFlash, setBinaryResultFlash] = useState(null);
  const activeBinaryTradeRef = useRef(null);
  const lastDigitRef = useRef(0);
  const toastTimerRef = useRef(null);
  const resultFlashTimerRef = useRef(null);
  const pullStartYRef = useRef(null);
  const pullDistanceRef = useRef(0);
  const pullTrackingRef = useRef(false);
  const pullRefreshingRef = useRef(false);
  const [pullRefreshDistance, setPullRefreshDistance] = useState(0);
  const [pullRefreshing, setPullRefreshing] = useState(false);

  const [selectedBot, setSelectedBot] = useState(null);
  const [botConfig, setBotConfig] = useState(() =>
    readStore(STORE.botConfig, createBotConfig(BOT_TEMPLATES[0]))
  );
  const [botRunning, setBotRunning] = useState(false);
  const [botTab, setBotTab] = useState("transactions");
  const [botTrades, setBotTrades] = useState([]);
  const [botSessionPnl, setBotSessionPnl] = useState(0);
  const [botMartingaleStep, setBotMartingaleStep] = useState(0);
  const botSessionPnlRef = useRef(0);
  const botMartingaleStepRef = useRef(0);
  const botBusyRef = useRef(false);
  const botRunningRef = useRef(false);
  const botSessionVersionRef = useRef(0);
  const balancesRef = useRef(balances);
  const accountRef = useRef(account);
  const historyPopRef = useRef(false);
  const historyReadyRef = useRef(false);
  const closingForexIdsRef = useRef(new Set());
  const [referral, setReferral] = useState(() => readStore(STORE.referral, null));
  const [referralDashboard, setReferralDashboard] = useState(null);
  const [referralLoading, setReferralLoading] = useState(false);
  const [settingsBusy, setSettingsBusy] = useState("");
  const [aiForexSetup, setAiForexSetup] = useState(null);
  const [aiAutoSession, setAiAutoSession] = useState(() => createAiAutoSession());
  const aiAutoSessionRef = useRef(aiAutoSession);
  const aiAutoTimerRef = useRef(0);
  const binaryMarketStatesRef = useRef(binaryMarketStates);
  const positionsRef = useRef(positions);

  activeBinaryTradeRef.current = activeBinaryTrade;
  lastDigitRef.current = lastDigit;
  aiAutoSessionRef.current = aiAutoSession;
  binaryMarketStatesRef.current = binaryMarketStates;
  positionsRef.current = positions;

  function updateBinaryMarketState(marketId, updater) {
    setBinaryMarketStates((currentStates) => {
      const marketIndex = Math.max(
        0,
        VOLATILITY_OPTIONS.findIndex((market) => market.id === marketId)
      );
      const market = VOLATILITY_OPTIONS[marketIndex] || activeBinaryMarket;
      const current = currentStates[marketId] || createBinaryMarketState(market, marketIndex);
      const updated = typeof updater === "function" ? updater(current) : updater;
      return {
        ...currentStates,
        [marketId]: {
          ...current,
          ...(updated || {}),
          updatedAt: Date.now(),
        },
      };
    });
  }

  const livePrice = prices[prices.length - 1] || activeBinaryMarket.start || 1.08564;
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
  useEffect(() => saveStore(STORE.binaryMarket, binaryMarketId), [binaryMarketId]);
  useEffect(() => saveStore(STORE.botConfig, botConfig), [botConfig]);
  useEffect(() => saveStore(MARKET_CACHE_KEY, marketFeed), [marketFeed]);
  useEffect(() => {
    if (!user?.referralCode) return;

    const origin = typeof window !== "undefined" ? window.location.origin : "https://metabinary.com";
    const nextReferral = {
      status: "approved",
      code: user.referralCode,
      link: `${origin}/?ref=${encodeURIComponent(user.referralCode)}`,
      commissionRate: Number(user.referralCommissionRate ?? REFERRAL_COMMISSION_PERCENT),
      totalEarned: Number(user.partnerBalance ?? 0),
      totalReferrals: Number(user.referralCount ?? 0),
      appliedAt: user.referralAppliedAt || referral?.appliedAt || "",
    };

    setReferral((current) => {
      const currentKey = JSON.stringify(current || {});
      const nextKey = JSON.stringify(nextReferral);
      return currentKey === nextKey ? current : nextReferral;
    });
  }, [
    user?.referralCode,
    user?.referralCommissionRate,
    user?.partnerBalance,
    user?.referralCount,
    user?.referralAppliedAt,
  ]);
  useEffect(() => {
    if (activePage === "referrals" && authToken) {
      void loadReferralDashboard();
    }
  }, [activePage, authToken]);
  useEffect(() => {
    balancesRef.current = balances;
  }, [balances]);
  useEffect(() => {
    accountRef.current = account;
  }, [account]);
  useEffect(() => {
    botRunningRef.current = botRunning;
  }, [botRunning]);

  useEffect(() => {
    aiAutoSessionRef.current = aiAutoSession;
  }, [aiAutoSession]);

  useEffect(() => {
    binaryMarketStatesRef.current = binaryMarketStates;
  }, [binaryMarketStates]);

  useEffect(() => {
    positionsRef.current = positions;
  }, [positions]);

  useEffect(() => () => {
    window.clearTimeout(aiAutoTimerRef.current);
  }, []);

  useEffect(() => {
    if (!positions.length) return;

    setPositions((current) => {
      let changed = false;
      const next = current.map((position) => {
        const quote = Number(marketFeed?.[position.instrument]?.price || 0);
        if (!Number.isFinite(quote) || quote <= 0) return position;
        const contractSize = Math.max(1, Number(position.contractSize || MARKET_BY_SYMBOL[position.instrument]?.contractSize || 1));
        const volume = Math.max(0.01, Number(position.volume || 0.01));
        const rawPl = position.side === "Buy"
          ? (quote - Number(position.openPrice || quote)) * contractSize * volume
          : (Number(position.openPrice || quote) - quote) * contractSize * volume;
        const pl = Number(rawPl.toFixed(2));
        const margin = Math.max(0.01, Number(position.margin || 0.01));
        const plPercent = Number(((pl / margin) * 100).toFixed(2));

        if (
          Number(position.currentPrice) === quote &&
          Number(position.pl || 0) === pl &&
          Number(position.plPercent || 0) === plPercent
        ) return position;

        changed = true;
        return { ...position, currentPrice: quote, pl, plPercent };
      });
      return changed ? next : current;
    });
  }, [marketFeed]);

  useEffect(() => {
    positions.forEach((position) => {
      if (closingForexIdsRef.current.has(position.id)) return;
      const quote = Number(marketFeed?.[position.instrument]?.price || position.currentPrice || 0);
      const stopLoss = Number(position.stopLoss || 0);
      const takeProfit = Number(position.takeProfit || 0);
      if (!Number.isFinite(quote) || quote <= 0) return;

      const takeHit = takeProfit > 0 && (position.side === "Buy" ? quote >= takeProfit : quote <= takeProfit);
      const stopHit = stopLoss > 0 && (position.side === "Buy" ? quote <= stopLoss : quote >= stopLoss);
      if (takeHit || stopHit) void closePosition(position.id);
    });
  }, [positions, marketFeed]);

  useEffect(() => {
    const session = aiAutoSessionRef.current;
    if (!session.running || session.mode !== "forex" || !session.positionId) return;

    const openPosition = positions.find((item) => item.id === session.positionId);
    if (openPosition) {
      const livePnl = Number(Number(openPosition.pl || 0).toFixed(2));
      const targetReached = Number(session.targetProfit || 0) > 0 && livePnl >= Number(session.targetProfit);
      const stopReached = Number(session.stopLoss || 0) > 0 && livePnl <= -Number(session.stopLoss);
      const next = {
        ...session,
        pnl: livePnl,
        status: targetReached
          ? `Target profit reached at +${money(livePnl)} USD · closing position`
          : stopReached
          ? `Stop loss reached at ${money(livePnl)} USD · closing position`
          : `${openPosition.side || "Trade"} ${openPosition.instrument || "position"} running`,
      };
      aiAutoSessionRef.current = next;
      setAiAutoSession(next);
      if (targetReached || stopReached) void closePosition(openPosition.id);
      return;
    }

    if (Date.now() - Number(session.startedAt || 0) > 1800) {
      const next = {
        ...session,
        running: false,
        completedAt: Date.now(),
        status: "Forex position closed at take profit, stop loss, or manual close",
      };
      aiAutoSessionRef.current = next;
      setAiAutoSession(next);
    }
  }, [positions]);

  useEffect(() => {
    const session = aiAutoSessionRef.current;
    if (session.mode !== "bot" || !session.startedAt) return;

    const pnl = Number(Number(botSessionPnl || 0).toFixed(2));
    const targetReached = Number(session.targetProfit || 0) > 0 && pnl >= Number(session.targetProfit);
    const stopReached = Number(session.stopLoss || 0) > 0 && pnl <= -Number(session.stopLoss);
    const justFinished = !botRunning && session.running && Date.now() - session.startedAt > 1000;
    const next = {
      ...session,
      running: Boolean(botRunning),
      pnl,
      trades: botTrades.length,
      wins: botTrades.filter((item) => item.won).length,
      losses: botTrades.filter((item) => !item.won).length,
      status: botRunning
        ? "AI bot is trading until target profit or stop loss"
        : targetReached
        ? `Target profit reached at +${money(pnl)} USD`
        : stopReached
        ? `Stop loss reached at ${money(pnl)} USD`
        : justFinished
        ? "AI bot stopped before another contract was opened"
        : session.status,
      ...(justFinished ? { running: false, completedAt: Date.now() } : {}),
    };

    const changed = JSON.stringify(next) !== JSON.stringify(session);
    if (changed) {
      aiAutoSessionRef.current = next;
      setAiAutoSession(next);
    }
  }, [botRunning, botSessionPnl, botTrades]);

  useEffect(() => {
    const onPopState = (event) => {
      const statePage = event.state?.mbPage;
      const hashPage = window.location.hash.replace(/^#/, "");
      const resolvedPage = TRADING_PAGES.has(statePage)
        ? statePage
        : TRADING_PAGES.has(hashPage)
        ? hashPage
        : "home";
      const nextPage = resolvedPage === "markets" ? "forex" : resolvedPage;
      historyPopRef.current = true;
      setActivePage(nextPage);
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    const url = `${window.location.pathname}${window.location.search}#${activePage}`;

    if (!historyReadyRef.current) {
      window.history.replaceState(
        { ...(window.history.state || {}), mbPage: activePage },
        "",
        url
      );
      historyReadyRef.current = true;
      return;
    }

    if (historyPopRef.current) {
      historyPopRef.current = false;
      return;
    }

    if (window.history.state?.mbPage !== activePage) {
      window.history.pushState(
        { ...(window.history.state || {}), mbPage: activePage },
        "",
        url
      );
    }
  }, [activePage]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const openTrade = activeBinaryTradeRef.current;
      const now = Date.now();

      setBinaryMarketStates((currentStates) => {
        const nextStates = { ...currentStates };

        VOLATILITY_OPTIONS.forEach((market, index) => {
          const current = currentStates[market.id] || createBinaryMarketState(market, index);
          const oldPrices = Array.isArray(current.prices) && current.prices.length
            ? current.prices
            : makePrices(market.start);
          const lastPrice = oldPrices[oldPrices.length - 1] || market.start;
          const phase = now / (7600 + index * 310) + index * 0.87;
          const directionBias = index % 2 === 0 ? 0.015 : -0.015;
          const nextPrice = Number(
            (
              lastPrice +
              (Math.random() - 0.5 + directionBias) * market.step +
              Math.sin(phase) * market.wave
            ).toFixed(6)
          );
          const serverControlsThisMarket = Boolean(
            openTrade && (openTrade.marketId || binaryMarketId) === market.id
          );
          const nextDigit = serverControlsThisMarket
            ? Number(current.lastDigit || 0)
            : Math.floor(Math.random() * 10);

          nextStates[market.id] = {
            ...current,
            prices: [...oldPrices.slice(-119), nextPrice],
            digitStats: serverControlsThisMarket
              ? current.digitStats
              : driftDigitStats(current.digitStats || makeInitialDigitStats(index)),
            lastDigit: nextDigit,
            updatedAt: now,
          };
        });

        return nextStates;
      });
    }, DIGIT_TICK_MS);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!activeBinaryTrade?.id || !authToken) return undefined;

    let cancelled = false;
    let timer = 0;
    let requestBusy = false;
    let localCompatibilityMode = false;
    const openTrade = { ...activeBinaryTrade };
    const tradeTickDelay = Math.max(250, Number(openTrade.tickMs || DIGIT_TICK_MS));
    let localRemainingTicks = Math.max(
      1,
      Number(openTrade.remainingTicks || openTrade.totalTicks || 1)
    );

    const schedule = (delay = tradeTickDelay) => {
      window.clearTimeout(timer);
      if (!cancelled) timer = window.setTimeout(runTick, Math.max(0, delay));
    };

    const showTick = (digit, remainingTicks, tickResult = {}) => {
      const tradeMarketId = openTrade.marketId || binaryMarketId;
      const nextPrice = Number(tickResult.currentPrice || tickResult.trade?.currentPrice || 0);
      updateBinaryMarketState(tradeMarketId, (current) => ({
        ...(Number.isInteger(digit) && digit >= 0 && digit <= 9
          ? {
              lastDigit: digit,
              digitStats: driftDigitStats(current.digitStats || makeInitialDigitStats()),
            }
          : {}),
        ...(Number.isFinite(nextPrice) && nextPrice > 0
          ? { prices: [...(current.prices || []).slice(-119), nextPrice] }
          : {}),
      }));
      if (tradeMarketId === binaryMarketId && Number.isInteger(digit)) lastDigitRef.current = digit;

      setActiveBinaryTrade((current) =>
        current?.id === openTrade.id
          ? {
              ...current,
              remainingTicks: Math.max(0, Number(remainingTicks || 0)),
              currentPrice: nextPrice || current.currentPrice,
              touched: Boolean(tickResult.touched ?? tickResult.trade?.touched ?? current.touched),
            }
          : current
      );
    };

    const requestServerTick = async () => {
      const encodedId = encodeURIComponent(openTrade.id);
      const candidates = [
        `${API_URL}/api/trades/${encodedId}/tick`,
        `${API_URL}/api/trades/${encodedId}`,
      ];

      let lastRouteError = null;

      for (const url of candidates) {
        const response = await fetch(url, {
          method: "POST",
          headers: apiHeaders({ "Content-Type": "application/json" }, authToken),
          cache: "no-store",
          body: JSON.stringify({}),
        });
        const result = await readApiResponse(response);
        const routeMissing =
          response.status === 404 &&
          /route not found|cannot post/i.test(String(result.message || result.error || ""));

        if (routeMissing) {
          lastRouteError = result;
          continue;
        }

        return { response, result };
      }

      return { response: null, result: lastRouteError, routeMissing: true };
    };

    const runCompatibilityTick = async () => {
      const tickDigit = Math.floor(Math.random() * 10);
      localRemainingTicks = Math.max(0, localRemainingTicks - 1);
      showTick(tickDigit, localRemainingTicks);

      if (localRemainingTicks > 0) {
        schedule(tradeTickDelay);
        return;
      }

      activeBinaryTradeRef.current = null;
      setActiveBinaryTrade(null);
      await settleBinaryTrade(openTrade, { forceTickSettlement: true });
    };

    const runTick = async () => {
      if (cancelled || requestBusy) return;
      requestBusy = true;

      try {
        if (localCompatibilityMode) {
          await runCompatibilityTick();
          return;
        }

        const { response, result, routeMissing } = await requestServerTick();

        if (routeMissing || !response) {
          localCompatibilityMode = true;
          await runCompatibilityTick();
          return;
        }

        if (response.status === 409 && Number(result.remainingMs) > 0) {
          schedule(Math.min(tradeTickDelay, Math.max(80, Number(result.remainingMs) + 20)));
          return;
        }

        if (!response.ok || result.ok === false) {
          throw new Error(result.message || "The next trade tick could not be loaded.");
        }

        const tickDigit = Number(result.digit ?? result.resultDigit);
        const remainingTicks = Math.max(0, Number(result.remainingTicks || 0));
        showTick(tickDigit, remainingTicks, result);

        if (result.settled || result.trade?.status === "SETTLED") {
          activeBinaryTradeRef.current = null;
          setActiveBinaryTrade(null);
          await applyBinaryTradeSettlement(openTrade, result);
          return;
        }

        schedule(tradeTickDelay);
      } catch (error) {
        if (cancelled) return;
        console.error("Trade tick failed:", error);
        activeBinaryTradeRef.current = null;
        setActiveBinaryTrade(null);
        notify(
          "loss",
          "Trade tick failed",
          error instanceof Error ? error.message : "The trade could not continue.",
          4500
        );
        await refreshUser();
      } finally {
        requestBusy = false;
      }
    };

    schedule(DIGIT_TICK_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [activeBinaryTrade?.id, authToken]);

  useEffect(() => {
    const pageIsAtTop = () => {
      const main = document.querySelector(".mainScreen");
      return window.scrollY <= 0 && Number(main?.scrollTop || 0) <= 0;
    };

    const touchStart = (event) => {
      if (pullRefreshingRef.current || !pageIsAtTop()) return;
      const touch = event.touches?.[0];
      if (!touch) return;
      // Refresh starts only from the browser/header edge, never from inside the chart or order panel.
      if (touch.clientY > Math.max(86, Number(window.visualViewport?.offsetTop || 0) + 86)) return;
      if (event.target?.closest?.("button, input, select, textarea, [role='dialog'], .volatilitySwitchMenu")) return;
      pullStartYRef.current = touch.clientY;
      pullTrackingRef.current = true;
    };

    const touchMove = (event) => {
      if (!pullTrackingRef.current || pullStartYRef.current == null || !pageIsAtTop()) return;
      const touch = event.touches?.[0];
      if (!touch) return;
      const rawDistance = touch.clientY - pullStartYRef.current;
      if (rawDistance <= 0) {
        pullDistanceRef.current = 0;
        setPullRefreshDistance(0);
        return;
      }

      const easedDistance = Math.min(96, rawDistance * 0.42);
      pullDistanceRef.current = easedDistance;
      setPullRefreshDistance(easedDistance);
      if (rawDistance > 8) event.preventDefault();
    };

    const touchEnd = () => {
      if (!pullTrackingRef.current) return;
      pullTrackingRef.current = false;
      pullStartYRef.current = null;

      if (pullDistanceRef.current >= 62) {
        pullRefreshingRef.current = true;
        setPullRefreshing(true);
        setPullRefreshDistance(68);
        window.setTimeout(() => window.location.reload(), 260);
        return;
      }

      pullDistanceRef.current = 0;
      setPullRefreshDistance(0);
    };

    document.addEventListener("touchstart", touchStart, { passive: true });
    document.addEventListener("touchmove", touchMove, { passive: false });
    document.addEventListener("touchend", touchEnd, { passive: true });
    document.addEventListener("touchcancel", touchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", touchStart);
      document.removeEventListener("touchmove", touchMove);
      document.removeEventListener("touchend", touchEnd);
      document.removeEventListener("touchcancel", touchEnd);
    };
  }, []);

  useEffect(() => {
    if (!user?.email) return;

    refreshUser();
    refreshForexPositions();

    const userTimer = setInterval(refreshUser, 3000);
    const forexTimer = setInterval(refreshForexPositions, 12000);
    return () => {
      clearInterval(userTimer);
      clearInterval(forexTimer);
    };
  }, [user?.email, authToken]);

  useEffect(() => {
    if (!botRunning || !selectedBot || !authToken) return undefined;

    let cancelled = false;
    let timer = 0;

    const cycle = async () => {
      if (cancelled || !botRunningRef.current || botBusyRef.current) return;
      botBusyRef.current = true;

      try {
        await runBotTrade(selectedBot);
      } finally {
        botBusyRef.current = false;
      }

      if (!cancelled && botRunningRef.current) {
        timer = window.setTimeout(cycle, BOT_CYCLE_DELAY_MS);
      }
    };

    void cycle();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [botRunning, selectedBot?.id, selectedBot?.configuredAt, authToken]);

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
    if (!user?.email || !authToken) return;
    try {
      const res = await fetch(`${API_URL}/api/user/${encodeURIComponent(user.email)}`, {
        headers: apiHeaders({}, authToken),
        cache: "no-store",
      });
      const data = await readApiResponse(res);

      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem(STORE.token);
        localStorage.removeItem(STORE.user);
        setAuthToken("");
        setUser(null);
        notify("loss", "Account access blocked", data.message || "Login again to continue.", 5000);
        return;
      }
      if (!res.ok || data.ok === false) return;

      const updatedUser = normalizeApiUser(data.user || data);
      setUser((old) => ({ ...old, ...updatedUser }));
      setBalances((old) => ({
        demo: Number(updatedUser.demoBalance ?? old.demo ?? 10000),
        real: Number(updatedUser.realBalance ?? old.real ?? 0),
      }));
    } catch {
      return;
    }
  }


  async function refreshForexPositions() {
    if (!authToken || !user?.email || !API_URL) return;

    try {
      const response = await fetch(`${API_URL}/api/forex/positions`, {
        headers: apiHeaders({}, authToken),
        cache: "no-store",
      });
      const result = await readApiResponse(response);
      if (!response.ok || result.ok === false) return;
      if (Array.isArray(result.positions)) {
        setPositions((current) => {
          const localDemoPositions = current.filter((position) => String(position.id || "").startsWith("demo-fx-"));
          const serverIds = new Set(result.positions.map((position) => position.id));
          return [...localDemoPositions.filter((position) => !serverIds.has(position.id)), ...result.positions].slice(0, 40);
        });
      }
    } catch (error) {
      console.warn("Unable to refresh forex positions:", error);
    }
  }

  function notify(type, title, message, durationMs = 2200) {
    window.clearTimeout(toastTimerRef.current);
    const notificationId = uid();
    const nextToast = { id: notificationId, type, title, message };
    setToast(nextToast);

    const notificationPrefs = user?.preferences?.notifications || {};
    const notificationText = `${title} ${message}`;
    const isSecurity = /login|password|security|account access|blocked/i.test(notificationText);
    const isWallet = /deposit|withdraw|payment|wallet|cashier/i.test(notificationText);
    const isReferral = /referral|commission|partner/i.test(notificationText);
    const categoryAllowed =
      (!isSecurity || notificationPrefs.security !== false) &&
      (!isWallet || notificationPrefs.wallet !== false) &&
      (!isReferral || notificationPrefs.referrals !== false);

    if (notificationPrefs.push !== false && categoryAllowed) {
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
            /referral|commission|partner/i.test(notificationText) ? "referrals" :
            /deposit|withdraw/i.test(title) ? "history" :
            /trade|contract/i.test(title) ? "trade" :
            "history",
        },
        ...old,
      ].slice(0, 30));
    }

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

  async function applyReferralProgram() {
    if (!authToken) {
      notify("loss", "Login required", "Login again before creating a referral link.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/referrals/apply`, {
        method: "POST",
        headers: apiHeaders({ "Content-Type": "application/json" }, authToken),
        cache: "no-store",
        body: JSON.stringify({}),
      });
      const result = await readApiResponse(response);
      if (!response.ok || result.ok === false) {
        throw new Error(result.message || "Referral link could not be created.");
      }

      const profile = {
        status: "approved",
        code: result.referral?.code || result.user?.referralCode || "",
        link:
          result.referral?.link ||
          `${window.location.origin}/?ref=${encodeURIComponent(result.referral?.code || result.user?.referralCode || "")}`,
        commissionRate: Number(
          result.referral?.commissionRate ??
            result.user?.referralCommissionRate ??
            REFERRAL_COMMISSION_PERCENT
        ),
        totalEarned: Number(result.referral?.totalEarned ?? result.user?.partnerBalance ?? 0),
        totalReferrals: Number(result.referral?.totalReferrals ?? result.user?.referralCount ?? 0),
        appliedAt: result.referral?.appliedAt || new Date().toLocaleString(),
      };

      setReferral(profile);
      if (result.user) {
        const updatedUser = normalizeApiUser(result.user);
        setUser((old) => ({ ...old, ...updatedUser }));
      }

      addTx({
        type: "Referral application approved",
        method: "Referral",
        account,
        amount: 0,
        status: "Approved",
        details: `${profile.code} · ${profile.commissionRate}% commission`,
      });

      notify(
        "win",
        "Referral link created",
        `Your referral commission is ${profile.commissionRate}%.`
      );
      await loadReferralDashboard();
    } catch (error) {
      notify(
        "loss",
        "Referral setup failed",
        error instanceof Error ? error.message : "Unable to create the referral link.",
        4500
      );
    }
  }


  async function loadReferralDashboard() {
    if (!authToken || referralLoading) return null;
    setReferralLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/referrals/dashboard`, {
        headers: apiHeaders({}, authToken),
        cache: "no-store",
      });
      const result = await readApiResponse(response);
      if (!response.ok || result.ok === false) {
        throw new Error(result.message || "Referral dashboard could not be loaded.");
      }
      setReferralDashboard(result);
      if (result.active) {
        setReferral((old) => ({
          ...(old || {}),
          status: "approved",
          code: result.code,
          link: result.link,
          commissionRate: result.commissionRate,
          totalEarned: result.totalEarned,
          totalReferrals: result.totalReferrals,
        }));
      }
      return result;
    } catch (error) {
      notify(
        "loss",
        "Referral dashboard unavailable",
        error instanceof Error ? error.message : "Unable to load referral information.",
        4500
      );
      return null;
    } finally {
      setReferralLoading(false);
    }
  }

  async function saveProfileSettings(profile) {
    if (!authToken) return false;
    setSettingsBusy("profile");
    try {
      const response = await fetch(`${API_URL}/api/settings/profile`, {
        method: "PATCH",
        headers: apiHeaders({ "Content-Type": "application/json" }, authToken),
        cache: "no-store",
        body: JSON.stringify(profile),
      });
      const result = await readApiResponse(response);
      if (!response.ok || result.ok === false) {
        throw new Error(result.message || "Profile settings could not be saved.");
      }
      if (result.user) {
        const updatedUser = normalizeApiUser(result.user);
        setUser((old) => ({ ...old, ...updatedUser }));
      }
      notify("win", "Profile updated", result.message || "Your profile settings were saved.");
      return true;
    } catch (error) {
      notify("loss", "Profile update failed", error instanceof Error ? error.message : "Unable to save your profile.", 4500);
      return false;
    } finally {
      setSettingsBusy("");
    }
  }

  async function saveNotificationSettings(preferences) {
    if (!authToken) return false;
    setSettingsBusy("notifications");
    try {
      const response = await fetch(`${API_URL}/api/settings/preferences`, {
        method: "PATCH",
        headers: apiHeaders({ "Content-Type": "application/json" }, authToken),
        cache: "no-store",
        body: JSON.stringify({ preferences }),
      });
      const result = await readApiResponse(response);
      if (!response.ok || result.ok === false) {
        throw new Error(result.message || "Notification settings could not be saved.");
      }
      setUser((old) => ({ ...old, preferences: result.preferences || preferences }));
      notify("win", "Notifications updated", result.message || "Notification preferences were saved.");
      return true;
    } catch (error) {
      notify("loss", "Settings update failed", error instanceof Error ? error.message : "Unable to save notification preferences.", 4500);
      return false;
    } finally {
      setSettingsBusy("");
    }
  }

  async function changeAccountPassword(passwords) {
    if (!authToken) return false;
    setSettingsBusy("password");
    try {
      const response = await fetch(`${API_URL}/api/settings/password`, {
        method: "POST",
        headers: apiHeaders({ "Content-Type": "application/json" }, authToken),
        cache: "no-store",
        body: JSON.stringify(passwords),
      });
      const result = await readApiResponse(response);
      if (!response.ok || result.ok === false) {
        throw new Error(result.message || "Password could not be changed.");
      }
      if (result.token) {
        localStorage.setItem(STORE.token, result.token);
        setAuthToken(result.token);
      }
      notify("win", "Password changed", result.message || "Your password was changed successfully.");
      return true;
    } catch (error) {
      notify("loss", "Password change failed", error instanceof Error ? error.message : "Unable to change your password.", 4500);
      return false;
    } finally {
      setSettingsBusy("");
    }
  }

  async function requestPasswordReset(email) {
    try {
      const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: apiHeaders({ "Content-Type": "application/json" }, ""),
        cache: "no-store",
        body: JSON.stringify({ email }),
      });
      const result = await readApiResponse(response);
      if (!response.ok || result.ok === false) throw new Error(result.message || "Unable to request a reset link.");
      notify("win", "Check your email", result.message || "If the account exists, a reset link has been sent.", 5000);
      return true;
    } catch (error) {
      notify("loss", "Reset request failed", error instanceof Error ? error.message : "Unable to request a reset link.", 4500);
      return false;
    }
  }

  async function resetPasswordWithEmail({ token, password }) {
    try {
      const response = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: apiHeaders({ "Content-Type": "application/json" }, ""),
        cache: "no-store",
        body: JSON.stringify({ token, password }),
      });
      const result = await readApiResponse(response);
      if (!response.ok || result.ok === false) throw new Error(result.message || "Unable to reset the password.");
      const url = new URL(window.location.href);
      url.searchParams.delete("reset_token");
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}#home`);
      setAuthMode("login");
      notify("win", "Password updated", result.message || "Login with your new password.", 5000);
      return true;
    } catch (error) {
      notify("loss", "Password reset failed", error instanceof Error ? error.message : "Unable to reset the password.", 4500);
      return false;
    }
  }

  async function login(data) {
    if (!data.email || !data.password) {
      notify("loss", "Login failed", "Enter email and password.");
      return false;
    }

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: apiHeaders({ "Content-Type": "application/json" }, ""),
        cache: "no-store",
        body: JSON.stringify({ email: data.email, password: data.password }),
      });
      const result = await readApiResponse(response);
      if (!response.ok || result.ok === false) throw new Error(result.message || "Login failed.");

      const logged = normalizeApiUser(result.user);
      localStorage.setItem(STORE.token, result.token);
      setAuthToken(result.token);
      setUser(logged);
      setBalances({
        demo: Number(logged.demoBalance ?? 10000),
        real: Number(logged.realBalance ?? 0),
      });
      setActivePage("home");
      notify("win", "Welcome back", result.message || "Login successful.");
      return true;
    } catch (error) {
      notify("loss", "Login failed", error instanceof Error ? error.message : "Unable to login.", 4500);
      return false;
    }
  }

  async function register(data) {
    if (!data.firstName || !data.lastName || !data.email || !data.phone || !data.password) {
      notify("loss", "Register failed", "Fill all required fields, including phone number.");
      return false;
    }

    if (data.password !== data.confirmPassword) {
      notify("loss", "Password error", "Passwords do not match.");
      return false;
    }

    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: apiHeaders({ "Content-Type": "application/json" }, ""),
        cache: "no-store",
        body: JSON.stringify({
          firstName: data.firstName,
          lastName: data.lastName,
          fullName: `${data.firstName} ${data.lastName}`,
          email: data.email,
          phone: data.phone,
          password: data.password,
          country: "Kenya",
          documentType: "National ID",
          referralCode: referralCodeFromLocation(),
        }),
      });
      const result = await readApiResponse(response);
      if (!response.ok || result.ok === false) throw new Error(result.message || "Registration failed.");

      const created = normalizeApiUser(result.user);
      localStorage.setItem(STORE.token, result.token);
      setAuthToken(result.token);
      setUser(created);
      setBalances({
        demo: Number(created.demoBalance ?? 10000),
        real: Number(created.realBalance ?? 0),
      });
      setActivePage("home");
      notify("win", "Account created", result.message || "Your MetaBinary account is ready.");
      return true;
    } catch (error) {
      notify("loss", "Register failed", error instanceof Error ? error.message : "Unable to register.", 4500);
      return false;
    }
  }

  function logout() {
    localStorage.removeItem(STORE.user);
    localStorage.removeItem(STORE.token);
    setAuthToken("");
    setUser(null);
    setMenuOpen(false);
    setActivePage("home");
    setAuthMode("login");
  }

  async function placeForexOrder({
    side,
    symbol,
    volume,
    leverage,
    stopLoss,
    takeProfit,
    marketPrice: submittedMarketPrice,
    marketOpen,
    source = "manual",
    strategy = "",
  }) {
    const market = MARKET_BY_SYMBOL[symbol] || MARKET_BY_SYMBOL["EUR/USD"];
    const lots = Number(volume);
    const quote = Number(submittedMarketPrice || marketFeed[symbol]?.price || 0);
    const optionalStopLoss = Number.isFinite(Number(stopLoss)) && Number(stopLoss) > 0 ? Number(stopLoss) : 0;
    const optionalTakeProfit = Number.isFinite(Number(takeProfit)) && Number(takeProfit) > 0 ? Number(takeProfit) : 0;

    if (!Number.isFinite(quote) || quote <= 0) {
      notify("loss", "Live price unavailable", "Wait for the live market quote before placing an order.");
      return false;
    }

    if (account === "real" && (marketOpen === false || marketFeed[symbol]?.isOpen === false)) {
      notify("loss", "Market closed", `${market.label} is closed. Real orders are disabled until the market opens.`);
      return false;
    }

    if (!Number.isFinite(lots) || lots < 0.01 || lots > 10) {
      notify("loss", "Invalid volume", "Volume must be between 0.01 and 10 lots.");
      return false;
    }

    if (!authToken) {
      notify("loss", "Login required", "Login again before placing a forex trade.");
      return false;
    }

    try {
      const response = await fetch(`${API_URL}/api/forex/open`, {
        method: "POST",
        headers: apiHeaders({ "Content-Type": "application/json" }, authToken),
        cache: "no-store",
        body: JSON.stringify({
          account,
          side,
          symbol,
          volume: lots,
          leverage,
          stopLoss: optionalStopLoss,
          takeProfit: optionalTakeProfit,
          marketPrice: quote,
          source,
          strategy,
        }),
      });

      const result = await readApiResponse(response);
      if (!response.ok || result.ok === false) {
        throw new Error(result.message || "Forex order could not be opened.");
      }

      if (result.position) {
        setPositions((old) => [
          result.position,
          ...old.filter((position) => position.id !== result.position.id),
        ].slice(0, 40));
      }

      if (result.user) {
        const updatedUser = normalizeApiUser(result.user);
        setUser((old) => ({ ...old, ...updatedUser }));
        setBalances((old) => ({
          demo: Number(updatedUser.demoBalance ?? old.demo ?? 10000),
          real: Number(updatedUser.realBalance ?? old.real ?? 0),
        }));
      }

      addTx({
        type: `${side} ${symbol}`,
        method: source === "ai" ? "AI Forex" : "Forex",
        account,
        amount: 0,
        status: "Open",
        details: `${lots} lot · Margin ${money(result.position?.margin || 0)} USD`,
      });

      notify(
        "open",
        `${side} order placed`,
        `${market.label} · ${lots} lot · ${money(result.position?.margin || 0)} USD margin`
      );
      return result.position || true;
    } catch (error) {
      if (account === "demo") {
        const leverageValue = Math.max(10, Number(String(leverage || "1:100").split(":")[1] || 100));
        const openPrice = Number((side === "Buy" ? quote + Number(market.spread || 0) / 2 : quote - Number(market.spread || 0) / 2).toFixed(market.decimals));
        const margin = Number(((openPrice * Number(market.contractSize || 1) * lots) / leverageValue).toFixed(2));
        const localPosition = {
          id: `demo-fx-${uid()}`,
          account: "demo",
          instrument: symbol,
          marketLabel: market.label,
          side,
          volume: lots,
          leverage: String(leverage || "1:100"),
          leverageValue,
          margin,
          contractSize: Number(market.contractSize || 1),
          openPrice,
          currentPrice: quote,
          stopLoss: optionalStopLoss,
          takeProfit: optionalTakeProfit,
          pl: 0,
          plPercent: 0,
          source,
          strategy,
          status: "OPEN",
          openedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };
        setPositions((old) => [localPosition, ...old.filter((position) => position.id !== localPosition.id)].slice(0, 40));
        addTx({
          type: `${side} ${symbol}`,
          method: source === "ai" ? "AI Forex" : "Forex",
          account: "demo",
          amount: 0,
          status: "Open",
          details: `${lots} lot · Demo margin ${money(margin)} USD`,
        });
        notify("open", `${side} demo order placed`, `${market.label} · ${lots} lot`, 3400);
        return localPosition;
      }

      notify(
        "loss",
        "Forex order failed",
        error instanceof Error ? error.message : "Unable to open the forex position.",
        4500
      );
      return false;
    }
  }

  function updatePosition(id, patch) {
    setPositions((old) => old.map((position) => (position.id === id ? { ...position, ...patch } : position)));
  }

  async function closePosition(id) {
    const item = positions.find((position) => position.id === id);
    if (!item || !authToken || closingForexIdsRef.current.has(id)) return false;

    if (String(id).startsWith("demo-fx-")) {
      const closed = { ...item, status: "CLOSED", closedAt: new Date().toISOString(), pl: Number(item.pl || 0) };
      setClosedPositions((old) => [closed, ...old.filter((position) => position.id !== id)].slice(0, 100));
      setPositions((old) => old.filter((position) => position.id !== id));
      setBalances((old) => ({ ...old, demo: Number((Number(old.demo || 0) + Number(closed.pl || 0)).toFixed(2)) }));
      setUser((old) => old ? { ...old, demoBalance: Number((Number(old.demoBalance || balancesRef.current.demo || 0) + Number(closed.pl || 0)).toFixed(2)) } : old);
      addTx({
        type: `Closed ${item.side} ${item.instrument}`,
        method: "Forex",
        account: "demo",
        amount: Number(closed.pl || 0),
        status: "Closed",
        details: `${item.volume} lot · Demo`,
      });
      notify(Number(closed.pl || 0) >= 0 ? "win" : "loss", "Demo trade closed", `${Number(closed.pl || 0) >= 0 ? "+" : ""}${money(closed.pl || 0)} USD`);
      return true;
    }

    closingForexIdsRef.current.add(id);
    const quote = Number(marketFeed[item.instrument]?.price || item.currentPrice || 0);

    try {
      const response = await fetch(`${API_URL}/api/forex/${encodeURIComponent(id)}/close`, {
        method: "POST",
        headers: apiHeaders({ "Content-Type": "application/json" }, authToken),
        cache: "no-store",
        body: JSON.stringify({ marketPrice: quote }),
      });
      const result = await readApiResponse(response);
      if (!response.ok || result.ok === false) {
        throw new Error(result.message || "Position could not be closed.");
      }

      const closed = result.position || { ...item, pl: item.pl || 0 };
      setClosedPositions((old) => [closed, ...old.filter((position) => position.id !== closed.id)].slice(0, 100));
      setPositions((old) => old.filter((position) => position.id !== id));

      if (result.user) {
        const updatedUser = normalizeApiUser(result.user);
        setUser((old) => ({ ...old, ...updatedUser }));
        setBalances((old) => ({
          demo: Number(updatedUser.demoBalance ?? old.demo ?? 10000),
          real: Number(updatedUser.realBalance ?? old.real ?? 0),
        }));
      } else {
        await refreshUser();
      }

      addTx({
        type: `Closed ${item.side} ${item.instrument}`,
        method: "Forex",
        account: item.account,
        amount: Number(closed.pl || 0),
        status: "Closed",
        details: `${item.volume} lot`,
      });

      notify(
        Number(closed.pl || 0) >= 0 ? "win" : "loss",
        "Trade closed",
        `${Number(closed.pl || 0) >= 0 ? "+" : ""}${money(closed.pl || 0)} USD`
      );
      return true;
    } catch (error) {
      notify(
        "loss",
        "Close failed",
        error instanceof Error ? error.message : "Unable to close the position.",
        4500
      );
      return false;
    } finally {
      closingForexIdsRef.current.delete(id);
    }
  }

  async function closeAllPositions(filter = {}) {
    const selected = positions.filter((position) => {
      if (filter.account && position.account !== filter.account) return false;
      if (filter.instrument && position.instrument !== filter.instrument) return false;
      return true;
    });

    for (const position of selected) {
      // Close sequentially so every balance update is returned by the server in order.
      // eslint-disable-next-line no-await-in-loop
      await closePosition(position.id);
    }
  }

  function actionsFor(type) {
    if (type === "Even/Odd") return ["Even", "Odd"];
    if (type === "Matches/Differs") return ["Matches", "Differs"];
    if (type === "Over/Under") return ["Over", "Under"];
    if (type === "Rise/Fall") return ["Rise", "Fall"];
    return ["Touch", "No Touch"];
  }

  function payoutRate(type, action, predictionValue = prediction, options = {}) {
    return estimatedContractMultiplier(type, action, predictionValue, options);
  }

  async function applyBinaryTradeSettlement(openTrade, result) {
    const resultDigit = Number(result.resultDigit ?? result.digit);
    const won = Boolean(result.won);
    const settledStake = Number(result.trade?.stake ?? openTrade.stake ?? 0);
    const settledPayout = Number(result.trade?.payout ?? openTrade.payout ?? 0);
    const profit = Number((settledPayout - settledStake).toFixed(2));

    if (Number.isInteger(resultDigit) && resultDigit >= 0 && resultDigit <= 9) {
      const tradeMarketId = openTrade.marketId || binaryMarketId;
      updateBinaryMarketState(tradeMarketId, (current) => ({
        lastDigit: resultDigit,
        digitStats: driftDigitStats(current.digitStats || makeInitialDigitStats()),
      }));
      if (tradeMarketId === binaryMarketId) lastDigitRef.current = resultDigit;
    }

    if (result.user) {
      const updatedUser = normalizeApiUser(result.user);
      setUser((old) => ({ ...old, ...updatedUser }));
      setBalances((old) => ({
        demo: Number(updatedUser.demoBalance ?? old.demo ?? 10000),
        real: Number(updatedUser.realBalance ?? old.real ?? 0),
      }));
    } else if (Number.isFinite(Number(result.balance))) {
      setBalances((old) => ({ ...old, [openTrade.account]: Number(result.balance) }));
    } else {
      await refreshUser();
    }

    const settlementNet = won ? profit : -settledStake;

    addTx({
      type: won ? "Profit amount" : "Loss amount",
      method: openTrade.source === "ai" ? "AI Auto-Trade" : "Manual",
      account: openTrade.account,
      amount: settlementNet,
      status: won ? "WON" : "LOST",
      details: isDigitContract(openTrade.type)
        ? `${openTrade.type} · ${openTrade.action} · digit ${resultDigit}`
        : `${openTrade.type} · ${openTrade.action} · ${Number(result.trade?.currentPrice ?? openTrade.currentPrice ?? openTrade.entryPrice).toFixed(5)}`,
    });

    window.clearTimeout(resultFlashTimerRef.current);
    setBinaryResultFlash({ id: uid(), digit: resultDigit, result: won ? "win" : "loss" });
    resultFlashTimerRef.current = window.setTimeout(
      () => setBinaryResultFlash(null),
      1800
    );

    notify(
      won ? "win" : "loss",
      won ? "Trade won" : "Trade lost",
      `${openTrade.type} · ${openTrade.action}${isDigitContract(openTrade.type) ? ` · digit ${resultDigit}` : ""} · ${
        won ? "+" : "-"
      }${money(won ? profit : settledStake)} USD`,
      2800
    );

    handleAiBinarySettlement(openTrade, {
      won,
      net: settlementNet,
      resultDigit,
    });
  }

  async function settleBinaryTrade(openTrade, options = {}) {
    if (!openTrade?.id || !authToken) return;

    try {
      const response = await fetch(
        `${API_URL}/api/trades/${encodeURIComponent(openTrade.id)}/settle`,
        {
          method: "POST",
          headers: apiHeaders({ "Content-Type": "application/json" }, authToken),
          cache: "no-store",
          body: JSON.stringify({
            forceTickSettlement: Boolean(options.forceTickSettlement),
          }),
        }
      );

      const result = await readApiResponse(response);

      if (response.status === 409 && Number(result.remainingMs) > 0) {
        window.setTimeout(
          () => void settleBinaryTrade(openTrade, options),
          Math.min(1200, Math.max(100, Number(result.remainingMs) + 20))
        );
        return;
      }

      if (!response.ok || result.ok === false) {
        throw new Error(result.message || "Trade could not be settled.");
      }

      await applyBinaryTradeSettlement(openTrade, result);
    } catch (error) {
      console.error("Trade settlement failed:", error);
      notify(
        "loss",
        "Trade settlement delayed",
        error instanceof Error ? error.message : "Refresh the account to check the final result.",
        4500
      );
      await refreshUser();
    }
  }

  async function runBinaryTrade(type, action, options = {}) {
    const usedStake = Number(stake);
    const usedTicks = Math.min(10, Math.max(1, Number(duration || 5)));
    const multiplier = payoutRate(type, action, prediction, {
      ticks: usedTicks,
      barrierDistance: Number(options.barrierDistance || 2),
    });

    if (activeBinaryTrade) {
      notify(
        "open",
        "Trade already open",
        `${activeBinaryTrade.type} · ${activeBinaryTrade.action} · ${activeBinaryTrade.remainingTicks} ticks remaining`
      );
      return;
    }

    if (!Number.isFinite(usedStake) || usedStake < 0.3) {
      notify("loss", "Minimum stake", "Minimum stake is 0.30 USD.");
      return;
    }

    if (!Number.isFinite(multiplier) || multiplier <= 0) {
      notify("loss", "Unavailable contract", "Choose a digit that gives at least one possible winning result.");
      return;
    }

    if (balance < usedStake) {
      notify("loss", "Low balance", `Your ${account} balance is too low for this trade.`);
      return;
    }

    if (!authToken) {
      notify("loss", "Login required", "Login again before placing a trade.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/trades/open`, {
        method: "POST",
        headers: apiHeaders({ "Content-Type": "application/json" }, authToken),
        cache: "no-store",
        body: JSON.stringify({
          account,
          type,
          action,
          stake: usedStake,
          prediction,
          ticks: usedTicks,
          entryPrice: livePrice,
          currentPrice: livePrice,
          barrier: Number(options.barrier || 0),
          barrierDistance: Number(options.barrierDistance || 0),
          marketStep: Number(activeBinaryMarket.step || 0.0002),
          market: activeBinaryMarket.label,
        }),
      });

      const result = await readApiResponse(response);
      if (!response.ok || result.ok === false) {
        throw new Error(result.message || "Trade could not be opened.");
      }

      const opened = result.trade || {};
      const openTrade = {
        id: opened.id,
        account: opened.account || account,
        type: opened.type || type,
        action: opened.action || action,
        stake: Number(opened.stake ?? usedStake),
        prediction: Number(opened.prediction ?? prediction),
        payout: Number(opened.payout ?? usedStake * multiplier),
        multiplier: Number(opened.multiplier ?? multiplier),
        entryPrice: Number(opened.entryPrice ?? livePrice),
        currentPrice: Number(opened.currentPrice ?? opened.entryPrice ?? livePrice),
        barrier: Number(opened.barrier ?? options.barrier ?? 0),
        touched: Boolean(opened.touched),
        market: opened.market || activeBinaryMarket.label,
        marketId: binaryMarketId,
        totalTicks: Number(opened.ticks ?? usedTicks),
        remainingTicks: Number(opened.ticks ?? usedTicks),
        openedAt: opened.createdAt || new Date().toLocaleTimeString(),
        status: "RUNNING",
      };

      if (result.user) {
        const updatedUser = normalizeApiUser(result.user);
        setUser((old) => ({ ...old, ...updatedUser }));
        setBalances((old) => ({
          demo: Number(updatedUser.demoBalance ?? old.demo ?? 10000),
          real: Number(updatedUser.realBalance ?? old.real ?? 0),
        }));
      } else if (Number.isFinite(Number(result.balance))) {
        setBalances((old) => ({ ...old, [account]: Number(result.balance) }));
      }

      setBinaryResultFlash(null);
      setActiveBinaryTrade(openTrade);
      notify(
        "open",
        "Open trade",
        `${activeBinaryMarket.label} · ${type} · ${action} · ${usedTicks} ticks`,
        1700
      );
    } catch (error) {
      console.error("Trade open failed:", error);
      notify(
        "loss",
        "Trade failed",
        error instanceof Error ? error.message : "The trade could not be opened.",
        4500
      );
      await refreshUser();
    }
  }

  function stopAiAutoTrade(reason = "AI Auto-Trade stopped", showMessage = true) {
    window.clearTimeout(aiAutoTimerRef.current);
    const current = aiAutoSessionRef.current;

    if (current.mode === "bot" && botRunningRef.current) {
      botRunningRef.current = false;
      setBotRunning(false);
    }

    if (current.mode === "forex" && current.positionId) {
      const openPosition = positionsRef.current.find((item) => item.id === current.positionId);
      if (openPosition) void closePosition(openPosition.id);
    }

    const next = {
      ...current,
      running: false,
      completedAt: Date.now(),
      status: reason,
    };
    aiAutoSessionRef.current = next;
    setAiAutoSession(next);

    if (showMessage) notify("open", "AI Auto-Trade stopped", reason, 3200);
  }

  function buildAdaptiveAiSignal(previousSignal, won) {
    const currentSession = aiAutoSessionRef.current;
    const previousType = previousSignal?.type || "Over/Under";
    const previousMarketId = previousSignal?.marketId || "";
    const typeRotation = ["Over/Under", "Matches/Differs", "Rise/Fall"];
    const previousTypeIndex = Math.max(0, typeRotation.indexOf(previousType));
    const nextType = won
      ? (Number(currentSession.trades || 0) + 1) % 3 === 0
        ? typeRotation[(previousTypeIndex + 1) % typeRotation.length]
        : previousType
      : typeRotation[(previousTypeIndex + 1) % typeRotation.length];

    const rankedMarkets = VOLATILITY_OPTIONS.map((market, index) => {
      const state = binaryMarketStatesRef.current?.[market.id] || {};
      const prices = Array.isArray(state.prices) ? state.prices : [];
      const recent = prices.slice(-12);
      const trend = recent.length > 1 ? Number(recent[recent.length - 1]) - Number(recent[0]) : 0;
      const stats = Array.isArray(state.digitStats) && state.digitStats.length ? state.digitStats : [10];
      const distribution = Math.max(...stats) - Math.min(...stats);
      const changeBonus = !won && market.id !== previousMarketId ? 4 : 0;
      return { market, trend, score: Math.abs(trend) * 100000 + distribution + changeBonus + index * 0.001 };
    }).sort((a, b) => b.score - a.score);

    const selected = rankedMarkets.find((item) => won || item.market.id !== previousMarketId) || rankedMarkets[0];
    const market = selected?.market || VOLATILITY_OPTIONS[0];
    const trend = Number(selected?.trend || 0);
    const thresholdSequence = [1, 6, 9];
    const threshold = thresholdSequence[(Number(currentSession.losses || 0) + Number(currentSession.trades || 0)) % thresholdSequence.length];

    let action = "Over";
    let prediction = threshold;
    if (nextType === "Matches/Differs") {
      action = "Differs";
      prediction = Math.floor(Math.random() * 10);
    } else if (nextType === "Rise/Fall") {
      action = trend >= 0 ? "Rise" : "Fall";
      prediction = 0;
    } else {
      action = threshold >= 8 ? "Under" : threshold === 6 ? (trend >= 0 ? "Over" : "Under") : "Over";
    }

    return {
      ...previousSignal,
      sessionId: currentSession.id,
      marketId: market.id,
      marketLabel: market.label,
      type: nextType,
      action,
      prediction,
      ticks: Math.min(10, Math.max(2, 3 + Math.floor(Math.random() * 4))),
      stake: Math.max(0.3, Number(previousSignal?.stake || stake || 0.3)),
    };
  }

  async function openAiBinaryTrade(signal) {
    const session = aiAutoSessionRef.current;
    if (!session.running || session.mode !== "trade" || session.id !== signal?.sessionId) return false;
    if (activeBinaryTradeRef.current) return false;

    const market =
      VOLATILITY_OPTIONS.find((item) => item.id === signal.marketId) ||
      VOLATILITY_OPTIONS[VOLATILITY_OPTIONS.length - 1];
    const marketState =
      binaryMarketStatesRef.current?.[market.id] ||
      createBinaryMarketState(market, Math.max(0, VOLATILITY_OPTIONS.findIndex((item) => item.id === market.id)));
    const marketPrices = Array.isArray(marketState.prices) ? marketState.prices : [];
    const entryPrice = Number(marketPrices[marketPrices.length - 1] || market.start || 1);
    const usedStake = Math.max(0.3, Number(signal.stake || 0.3));
    const usedTicks = Math.min(10, Math.max(1, Number(signal.ticks || 5)));
    const usedPrediction = Math.max(0, Math.min(9, Number(signal.prediction ?? 2)));
    const multiplier = estimatedContractMultiplier(signal.type, signal.action, usedPrediction, {
      ticks: usedTicks,
      barrierDistance: Number(signal.barrierDistance || 2),
    });
    const currentAccount = accountRef.current;
    const availableBalance = Number(balancesRef.current?.[currentAccount] || 0);

    if (!authToken) {
      stopAiAutoTrade("Login expired. Sign in again before AI Auto-Trade can continue.", false);
      notify("loss", "AI Auto-Trade stopped", "Login again before continuing.", 4500);
      return false;
    }

    if (!Number.isFinite(multiplier) || multiplier <= 0) {
      stopAiAutoTrade("The recommended contract has no valid payout.", false);
      notify("loss", "AI Auto-Trade stopped", "Scan again for another contract.", 4200);
      return false;
    }

    if (availableBalance < usedStake) {
      stopAiAutoTrade(`Low ${currentAccount} balance for the next ${money(usedStake)} USD trade.`, false);
      notify("loss", "AI Auto-Trade stopped", "The available balance is below the next stake.", 4500);
      return false;
    }

    try {
      setBinaryMarketId(market.id);
      setTradeType(signal.type);
      setPrediction(usedPrediction);
      setDuration(usedTicks);
      setStake(usedStake);
      setActivePage("trade");

      const response = await fetch(`${API_URL}/api/trades/open`, {
        method: "POST",
        headers: apiHeaders({ "Content-Type": "application/json" }, authToken),
        cache: "no-store",
        body: JSON.stringify({
          account: currentAccount,
          type: signal.type,
          action: signal.action,
          stake: usedStake,
          prediction: usedPrediction,
          ticks: usedTicks,
          entryPrice,
          currentPrice: entryPrice,
          barrier: Number(signal.barrier || 0),
          barrierDistance: Number(signal.barrierDistance || 0),
          marketStep: Number(market.step || 0.0002),
          market: market.label,
          source: "ai",
          strategy: "MetaBinary AI Auto-Trade",
        }),
      });

      const result = await readApiResponse(response);
      if (!response.ok || result.ok === false) {
        throw new Error(result.message || "AI trade could not be opened.");
      }

      const opened = result.trade || {};
      const openTrade = {
        id: opened.id,
        account: opened.account || currentAccount,
        type: opened.type || signal.type,
        action: opened.action || signal.action,
        stake: Number(opened.stake ?? usedStake),
        prediction: Number(opened.prediction ?? usedPrediction),
        payout: Number(opened.payout ?? usedStake * multiplier),
        multiplier: Number(opened.multiplier ?? multiplier),
        entryPrice: Number(opened.entryPrice ?? entryPrice),
        currentPrice: Number(opened.currentPrice ?? opened.entryPrice ?? entryPrice),
        barrier: Number(opened.barrier ?? signal.barrier ?? 0),
        touched: Boolean(opened.touched),
        market: opened.market || market.label,
        marketId: market.id,
        totalTicks: Number(opened.ticks ?? usedTicks),
        remainingTicks: Number(opened.ticks ?? usedTicks),
        openedAt: opened.createdAt || new Date().toLocaleTimeString(),
        status: "RUNNING",
        tickMs: Math.max(250, Number(opened.tickMs || 750)),
        source: "ai",
        aiSessionId: session.id,
      };

      if (result.user) {
        const updatedUser = normalizeApiUser(result.user);
        setUser((old) => ({ ...old, ...updatedUser }));
        setBalances((old) => ({
          demo: Number(updatedUser.demoBalance ?? old.demo ?? 10000),
          real: Number(updatedUser.realBalance ?? old.real ?? 0),
        }));
      } else if (Number.isFinite(Number(result.balance))) {
        setBalances((old) => ({ ...old, [currentAccount]: Number(result.balance) }));
      }

      setBinaryResultFlash(null);
      activeBinaryTradeRef.current = openTrade;
      setActiveBinaryTrade(openTrade);

      const next = {
        ...session,
        status: `${market.short} · ${signal.type} · ${signal.action} · trade ${session.trades + 1} running`,
      };
      aiAutoSessionRef.current = next;
      setAiAutoSession(next);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "The AI trade could not be opened.";
      stopAiAutoTrade(message, false);
      notify("loss", "AI Auto-Trade stopped", message, 5000);
      await refreshUser();
      return false;
    }
  }

  function handleAiBinarySettlement(openTrade, outcome) {
    if (openTrade?.source !== "ai" || !openTrade?.aiSessionId) return;

    const current = aiAutoSessionRef.current;
    if (!current.running || current.id !== openTrade.aiSessionId) return;

    const net = Number(Number(outcome.net || 0).toFixed(2));
    const nextPnl = Number((Number(current.pnl || 0) + net).toFixed(2));
    const targetReached = Number(current.targetProfit || 0) > 0 && nextPnl >= Number(current.targetProfit);
    const stopReached = Number(current.stopLoss || 0) > 0 && nextPnl <= -Number(current.stopLoss);
    const nextSignal = targetReached || stopReached ? current.signal : buildAdaptiveAiSignal(current.signal, outcome.won);
    const next = {
      ...current,
      pnl: nextPnl,
      lastNet: net,
      lastResult: outcome.won ? "win" : "loss",
      lastResultAt: Date.now(),
      trades: Number(current.trades || 0) + 1,
      wins: Number(current.wins || 0) + (outcome.won ? 1 : 0),
      losses: Number(current.losses || 0) + (outcome.won ? 0 : 1),
      running: !(targetReached || stopReached),
      completedAt: targetReached || stopReached ? Date.now() : 0,
      signal: nextSignal,
      status: targetReached
        ? `Target profit reached at +${money(nextPnl)} USD`
        : stopReached
        ? `Stop loss reached at ${money(nextPnl)} USD`
        : outcome.won
        ? `Won ${money(Math.abs(net))} USD · validating the next entry`
        : `Lost ${money(Math.abs(net))} USD · changing market and contract before the next entry`,
    };

    aiAutoSessionRef.current = next;
    setAiAutoSession(next);

    if (targetReached || stopReached) {
      playBotAlert(targetReached ? "takeProfit" : "stopLoss", user?.preferences?.notifications);
      notify(
        targetReached ? "win" : "loss",
        targetReached ? "AI target profit reached" : "AI stop loss reached",
        `${next.trades} trades · session P/L ${nextPnl >= 0 ? "+" : ""}${money(nextPnl)} USD`,
        5200
      );
      return;
    }

    window.clearTimeout(aiAutoTimerRef.current);
    const entryDelay = outcome.won
      ? 1400 + Math.floor(Math.random() * 1200)
      : 2800 + Math.floor(Math.random() * 1800);
    aiAutoTimerRef.current = window.setTimeout(() => {
      const latest = aiAutoSessionRef.current;
      if (!latest.running || latest.id !== current.id || latest.mode !== "trade") return;
      void openAiBinaryTrade(latest.signal);
    }, entryDelay);
  }

  async function startAiAutoTrade(result) {
    if (!result || !authToken) {
      notify("loss", "Login required", "Log in before starting AI Auto-Trade.", 4200);
      return false;
    }

    if (activeBinaryTradeRef.current && result.mode === "trade") {
      notify("open", "Trade already open", "Wait for the current contract to finish before starting AI Auto-Trade.", 4200);
      return false;
    }

    window.clearTimeout(aiAutoTimerRef.current);
    if (botRunningRef.current) {
      botRunningRef.current = false;
      setBotRunning(false);
    }

    const targetProfit = Math.max(0.3, Number(result.sessionTakeProfit ?? result.config?.takeProfit ?? result.takeProfit ?? 20));
    const stopLoss = Math.max(0.3, Number(result.sessionStopLoss ?? result.config?.stopLoss ?? result.stopLoss ?? 10));
    const id = uid();
    const baseSession = createAiAutoSession({
      id,
      running: true,
      mode: result.mode,
      status: "Starting AI Auto-Trade…",
      targetProfit,
      stopLoss,
      startedAt: Date.now(),
      signal: null,
    });

    if (result.mode === "trade") {
      const signal = {
        ...result,
        sessionId: id,
        stake: Math.max(0.3, Number(result.stake || stake || 0.3)),
        ticks: Math.min(10, Math.max(1, Number(result.ticks || 5))),
      };
      const next = { ...baseSession, signal, status: "Opening the first AI contract…" };
      aiAutoSessionRef.current = next;
      setAiAutoSession(next);
      setActivePage("trade");
      window.setTimeout(() => void openAiBinaryTrade(signal), 180);
      notify("open", "AI Auto-Trade started", `Runs until +${money(targetProfit)} USD or -${money(stopLoss)} USD.`, 4200);
      return true;
    }

    if (result.mode === "forex") {
      const market = MARKET_BY_SYMBOL[result.symbol] || MARKET_OPTIONS[0];
      const quote = Number(result.entry || marketFeed?.[market.symbol]?.price || market.defaultPrice || 0);
      const next = { ...baseSession, status: `Opening ${result.side} ${market.symbol}…` };
      aiAutoSessionRef.current = next;
      setAiAutoSession(next);
      setMarketSymbol(market.symbol);
      setAiForexSetup({ ...result, preparedAt: Date.now() });
      setActivePage("forex");

      const opened = await placeForexOrder({
        side: result.side || "Buy",
        symbol: market.symbol,
        volume: Math.max(0.01, Number(result.volume || 0.01)),
        leverage: 100,
        stopLoss: Number(result.stopLoss),
        takeProfit: Number(result.takeProfit),
        marketPrice: quote,
        marketOpen: marketFeed?.[market.symbol]?.isOpen !== false,
        source: "ai",
        strategy: "MetaBinary AI Auto-Trade",
      });

      if (!opened) {
        stopAiAutoTrade("The recommended Forex position could not be opened.", false);
        return false;
      }

      const positionId = typeof opened === "object" ? opened.id : "";
      const running = {
        ...aiAutoSessionRef.current,
        positionId,
        status: `${result.side || "Buy"} ${market.symbol} is running until the AI target or stop is reached`,
      };
      aiAutoSessionRef.current = running;
      setAiAutoSession(running);
      notify("open", "AI Forex trade started", `${market.symbol} will remain open until the AI target, AI stop, or manual close.`, 4800);
      return true;
    }

    const template = BOT_TEMPLATES.find((item) => item.id === result.botId) || BOT_TEMPLATES[0];
    const preparedConfig = {
      ...createBotConfig(template),
      ...result.config,
      botId: template.id,
      name: template.name,
      takeProfit: targetProfit,
      stopLoss,
    };
    const next = {
      ...baseSession,
      mode: "bot",
      signal: { ...result, config: preparedConfig },
      status: `${template.name} is starting…`,
    };
    aiAutoSessionRef.current = next;
    setAiAutoSession(next);
    setSelectedBot({ ...template, ...preparedConfig });
    setBotConfig(preparedConfig);
    startBot(preparedConfig);
    notify("open", "AI bot started", `Runs until +${money(targetProfit)} USD or -${money(stopLoss)} USD.`, 4500);
    return true;
  }

  function applyAiSetup(result) {
    if (!result) return;

    if (result.mode === "trade") {
      setBinaryMarketId(result.marketId || binaryMarketId);
      setTradeType(result.type || "Over/Under");
      setPrediction(Number(result.prediction ?? 2));
      setDuration(Number(result.ticks || 5));
      setStake(Number(result.stake || stake || 1));
      setActivePage("trade");
      notify("win", "AI setup prepared", `${result.marketLabel} · ${result.type} · ${result.action}`);
      return;
    }

    if (result.mode === "forex") {
      setMarketSymbol(result.symbol || "EUR/USD");
      setAiForexSetup({ ...result, preparedAt: Date.now() });
      setActivePage("forex");
      notify("win", "Forex setup prepared", `${result.symbol} · ${result.side}`);
      return;
    }

    if (result.mode === "bot") {
      const template = BOT_TEMPLATES.find((item) => item.id === result.botId) || BOT_TEMPLATES[0];
      const prepared = {
        ...createBotConfig(template),
        ...result.config,
        botId: template.id,
        name: template.name,
      };
      setSelectedBot({ ...template, ...prepared });
      setBotConfig(prepared);
      setBotRunning(false);
      setActivePage("botSetup");
      notify("win", "AI bot prepared", `${template.name} is ready for your confirmation.`);
    }
  }

  function configureBot(bot) {
    const nextConfig = createBotConfig(bot);
    setSelectedBot({ ...bot, ...nextConfig });
    setBotConfig(nextConfig);
    setBotRunning(false);
    setBotTab("transactions");
    setActivePage("botSetup");
  }

  async function runBotTrade(bot) {
    if (!bot || !authToken || !botRunningRef.current) return null;

    const sessionVersion = botSessionVersionRef.current;
    const market =
      VOLATILITY_OPTIONS.find((item) => item.id === bot.marketId) ||
      VOLATILITY_OPTIONS[VOLATILITY_OPTIONS.length - 1];
    const step = botMartingaleStepRef.current;
    const baseStake = Math.max(0.3, Number(bot.stake || 1));
    const multiplier = bot.martingaleEnabled
      ? Math.max(1, Math.min(3, Number(bot.martingaleMultiplier || 2)))
      : 1;
    const usedStake = Number((baseStake * Math.pow(multiplier, step)).toFixed(2));
    const botAccount = accountRef.current;
    const availableBalance = Number(balancesRef.current?.[botAccount] || 0);

    if (availableBalance < usedStake) {
      botRunningRef.current = false;
      setBotRunning(false);
      notify("loss", "Bot stopped", `Low ${botAccount} balance for ${money(usedStake)} USD stake.`);
      return null;
    }

    try {
      const openResponse = await fetch(`${API_URL}/api/trades/open`, {
        method: "POST",
        headers: apiHeaders({ "Content-Type": "application/json" }, authToken),
        cache: "no-store",
        body: JSON.stringify({
          account: botAccount,
          type: bot.type,
          action: bot.action,
          stake: usedStake,
          prediction: Number(bot.prediction || 0),
          ticks: Math.min(10, Math.max(1, Number(bot.ticks || 5))),
          entryPrice: livePriceRef.current,
          currentPrice: livePriceRef.current,
          barrier:
            bot.type === "Touch/No Touch"
              ? Number((livePriceRef.current + Number(market.step || 0.0002) * 8).toFixed(6))
              : 0,
          barrierDistance: 3,
          marketStep: Number(market.step || 0.0002),
          market: market.label,
          source: "bot",
          strategy: bot.name,
        }),
      });
      const opened = await readApiResponse(openResponse);
      if (!openResponse.ok || opened.ok === false) {
        throw new Error(opened.message || "Bot trade could not be opened.");
      }

      if (opened.user) {
        const updatedUser = normalizeApiUser(opened.user);
        setUser((old) => ({ ...old, ...updatedUser }));
        const nextBalances = {
          demo: Number(updatedUser.demoBalance ?? balancesRef.current.demo ?? 10000),
          real: Number(updatedUser.realBalance ?? balancesRef.current.real ?? 0),
        };
        balancesRef.current = nextBalances;
        setBalances(nextBalances);
      }

      const trade = opened.trade;
      const waitMs = Math.max(350, new Date(trade.settleAt).getTime() - Date.now() + 160);
      await wait(waitMs);

      const settleResponse = await fetch(`${API_URL}/api/trades/${encodeURIComponent(trade.id)}/settle`, {
        method: "POST",
        headers: apiHeaders({ "Content-Type": "application/json" }, authToken),
        cache: "no-store",
        body: JSON.stringify({}),
      });
      const settled = await readApiResponse(settleResponse);
      if (!settleResponse.ok || settled.ok === false) {
        throw new Error(settled.message || "Bot trade could not be settled.");
      }

      if (sessionVersion !== botSessionVersionRef.current) {
        await refreshUser();
        return null;
      }

      const won = Boolean(settled.won);
      const settledStake = Number(settled.trade?.stake ?? usedStake);
      const settledPayout = Number(settled.trade?.payout ?? 0);
      const net = Number((won ? settledPayout - settledStake : -settledStake).toFixed(2));
      const nextPnl = Number((botSessionPnlRef.current + net).toFixed(2));
      botSessionPnlRef.current = nextPnl;
      setBotSessionPnl(nextPnl);

      if (settled.user) {
        const updatedUser = normalizeApiUser(settled.user);
        setUser((old) => ({ ...old, ...updatedUser }));
        const nextBalances = {
          demo: Number(updatedUser.demoBalance ?? balancesRef.current.demo ?? 10000),
          real: Number(updatedUser.realBalance ?? balancesRef.current.real ?? 0),
        };
        balancesRef.current = nextBalances;
        setBalances(nextBalances);
      } else {
        await refreshUser();
      }

      const row = {
        id: trade.id,
        botName: bot.name,
        type: bot.type,
        action: bot.action,
        market: market.label,
        stake: settledStake,
        payout: settledPayout,
        profit: Number((settledPayout - settledStake).toFixed(2)),
        net,
        won,
        resultDigit: Number(settled.resultDigit),
        martingaleStep: step,
        status: won ? "WON" : "LOST",
        time: new Date().toLocaleTimeString(),
      };
      setBotTrades((old) => [row, ...old].slice(0, 80));

      addTx({
        type: won ? "Bot profit" : "Bot loss",
        method: "Bot",
        account: botAccount,
        amount: net,
        status: row.status,
        details: `${bot.name} · ${market.short} · ${bot.type} · step ${step}`,
      });

      const maxSteps = Math.max(0, Math.min(6, Number(bot.martingaleSteps || 0)));
      const nextStep = won ? 0 : Math.min(maxSteps, step + 1);
      botMartingaleStepRef.current = nextStep;
      setBotMartingaleStep(nextStep);

      const takeProfit = Math.max(0, Number(bot.takeProfit || 0));
      const stopLoss = Math.max(0, Number(bot.stopLoss || 0));
      if ((takeProfit > 0 && nextPnl >= takeProfit) || (stopLoss > 0 && nextPnl <= -stopLoss)) {
        botRunningRef.current = false;
        setBotRunning(false);
        const targetReached = nextPnl >= 0;
        playPlatformTone(
          targetReached ? "target" : "stop",
          user?.preferences?.notifications || {}
        );
        notify(
          targetReached ? "win" : "loss",
          targetReached ? "Bot take profit reached" : "Bot stop loss reached",
          `${nextPnl >= 0 ? "+" : ""}${money(nextPnl)} USD`
        );
      }

      return row;
    } catch (error) {
      console.error("Bot cycle failed:", error);
      botRunningRef.current = false;
      setBotRunning(false);
      notify(
        "loss",
        "Bot stopped",
        error instanceof Error ? error.message : "The bot could not complete its trade.",
        5000
      );
      await refreshUser();
      return null;
    }
  }

  function startBot(config = botConfig) {
    if (!authToken) {
      notify("loss", "Login required", "Log in before starting a trading bot.");
      return;
    }

    const currentAccount = accountRef.current;
    const availableBalance = Math.max(0, Number(balancesRef.current?.[currentAccount] || 0));
    if (availableBalance < 0.3) {
      notify("loss", "Bot cannot start", `Your ${currentAccount} balance must be at least 0.30 USD.`);
      return;
    }

    const recoverySteps = config.martingaleEnabled
      ? Math.max(0, Math.min(6, Number(config.martingaleSteps || 0)))
      : 0;
    const recoveryMultiplier = config.martingaleEnabled
      ? Math.max(1, Math.min(3, Number(config.martingaleMultiplier || 2)))
      : 1;
    const recoveryReserve = Array.from({ length: recoverySteps + 1 }, (_, index) => Math.pow(recoveryMultiplier, index))
      .reduce((sum, value) => sum + value, 0);
    const maxSafeBaseStake = Math.max(0.3, Math.floor((availableBalance / Math.max(1, recoveryReserve)) * 100) / 100);
    const requestedStake = Math.max(0.3, Number(config.stake || 1));
    const effectiveStake = Number(Math.min(requestedStake, maxSafeBaseStake).toFixed(2));
    const preparedConfig = { ...config, stake: effectiveStake };

    const market =
      VOLATILITY_OPTIONS.find((item) => item.id === preparedConfig.marketId) ||
      VOLATILITY_OPTIONS[VOLATILITY_OPTIONS.length - 1];
    const prepared = {
      ...(selectedBot || BOT_TEMPLATES[0]),
      ...preparedConfig,
      market: market.label,
      configuredAt: Date.now(),
    };

    if (effectiveStake < requestedStake) {
      notify(
        "open",
        "Bot stake adjusted",
        `${money(requestedStake)} USD was reduced to ${money(effectiveStake)} USD so recovery can run within your ${currentAccount} balance.`,
        5200
      );
    }

    setSelectedBot(prepared);
    setBotConfig(preparedConfig);
    botSessionVersionRef.current += 1;
    botSessionPnlRef.current = 0;
    botMartingaleStepRef.current = 0;
    setBotSessionPnl(0);
    setBotMartingaleStep(0);
    botRunningRef.current = true;
    setBotRunning(true);
    setBotTab("transactions");
    setActivePage("botLive");
    notify("open", "Bot started", `${prepared.name} · ${market.short} · ${money(effectiveStake)} USD`);
  }

  function stopBot() {
    botRunningRef.current = false;
    setBotRunning(false);
    notify("open", "Bot stopped", "No new contracts will be bought.");
  }

  function resetBotSession() {
    botSessionVersionRef.current += 1;
    botRunningRef.current = false;
    setBotRunning(false);
    setBotTrades([]);
    botSessionPnlRef.current = 0;
    botMartingaleStepRef.current = 0;
    setBotSessionPnl(0);
    setBotMartingaleStep(0);
    setBotTab("transactions");
    notify(
      "open",
      "Bot session reset",
      "Transactions, summary and journal were cleared."
    );
  }

  async function pollDepositStatus(depositId) {
    if (!depositId || !API_URL) return;

    const successful = new Set(["COMPLETE", "COMPLETED", "PAID", "SUCCESS", "SUCCESSFUL"]);
    const failed = new Set(["FAILED", "CANCELLED", "CANCELED", "REVERSED", "EXPIRED"]);

    // Check immediately, then every second. The server callback remains the source of truth.
    for (let attempt = 0; attempt < 90; attempt += 1) {
      if (attempt > 0) await wait(1000);

      try {
        const res = await fetch(
          `${API_URL}/api/deposit/${encodeURIComponent(depositId)}/status`,
          {
            method: "GET",
            headers: apiHeaders({}, authToken),
            cache: "no-store",
          }
        );
        const data = await readApiResponse(res);

        if (!res.ok || data.ok === false) continue;

        const status = String(data.status || "").toUpperCase();
        if (successful.has(status) && data.credited !== false) {
          if (Number.isFinite(Number(data.realBalance))) {
            const nextRealBalance = Number(data.realBalance);
            balancesRef.current = { ...balancesRef.current, real: nextRealBalance };
            setBalances((old) => ({ ...old, real: nextRealBalance }));
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

          notify(
            "win",
            "Deposit successful",
            `${money(data.amountUsd)} USD has been added to your Real Account.`
          );
          return;
        }

        if (failed.has(status)) {
          notify("loss", "Deposit not completed", data.message || `Payment status: ${status}.`);
          return;
        }
      } catch (error) {
        console.warn("Deposit status check failed:", error);
      }
    }

    await refreshUser();
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
        headers: apiHeaders({ "Content-Type": "application/json" }, authToken),
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
        headers: apiHeaders({ "Content-Type": "application/json" }, authToken),
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

  if (!user || !authToken) {
    return (
      <>
        <AuthScreen
          mode={authMode}
          setMode={setAuthMode}
          login={login}
          register={register}
          requestPasswordReset={requestPasswordReset}
          resetPassword={resetPasswordWithEmail}
        />
        {toast && <Toast toast={toast} />}
      </>
    );
  }

  return (
    <div className="app">
      <div
        className={`pullRefreshIndicator ${pullRefreshing ? "refreshing" : ""} ${pullRefreshDistance > 0 ? "visible" : ""}`}
        style={{ transform: `translate(-50%, ${Math.max(-52, pullRefreshDistance - 52)}px)` }}
        aria-hidden="true"
      >
        <span>{pullRefreshing ? "↻" : pullRefreshDistance >= 62 ? "↑" : "↓"}</span>
        <small>{pullRefreshing ? "Refreshing…" : pullRefreshDistance >= 62 ? "Release to refresh" : "Pull to refresh"}</small>
      </div>

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
        autoSession={aiAutoSession}
      />

      <main className="mainScreen">
        {["settings", "history", "reports"].includes(activePage) && (
          <button
            type="button"
            className="globalPageBack"
            onClick={() => window.history.back()}
            aria-label="Go back"
          >
            ‹ Back
          </button>
        )}
        {activePage === "home" && (
          <HomePage
            livePrice={livePrice}
            prices={prices}
            setActivePage={setActivePage}
            openDeposit={() => setDepositOpen(true)}
          />
        )}

        {activePage === "markets" && (
          <MarketsPage
            marketStates={binaryMarketStates}
            volatilityOptions={VOLATILITY_OPTIONS}
            marketFeed={marketFeed}
            setBinaryMarketId={setBinaryMarketId}
            setMarketSymbol={setMarketSymbol}
            setActivePage={setActivePage}
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
            preparedSetup={aiForexSetup}
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
            binaryMarket={activeBinaryMarket}
            binaryMarketId={binaryMarketId}
            setBinaryMarketId={setBinaryMarketId}
            volatilityOptions={VOLATILITY_OPTIONS}
          />
        )}

        {activePage === "bots" && <BotsPage bots={BOT_TEMPLATES} configureBot={configureBot} />}

        {activePage === "botSetup" && (
          <BotSetupPage
            bot={selectedBot}
            config={botConfig}
            setConfig={setBotConfig}
            volatilityOptions={VOLATILITY_OPTIONS}
            actionsFor={actionsFor}
            startBot={startBot}
            back={() => window.history.back()}
          />
        )}

        {activePage === "botLive" && (
          <BotLivePage
            bot={selectedBot}
            running={botRunning}
            stopBot={stopBot}
            startBot={() => startBot(botConfig)}
            trades={botTrades}
            botTab={botTab}
            setBotTab={setBotTab}
            sessionPnl={botSessionPnl}
            martingaleStep={botMartingaleStep}
            resetSession={resetBotSession}
            edit={() => {
              setBotRunning(false);
              setActivePage("botSetup");
            }}
            back={() => window.history.back()}
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
            user={user}
            busy={settingsBusy}
            saveProfile={saveProfileSettings}
            saveNotifications={saveNotificationSettings}
            changePassword={changeAccountPassword}
          />
        )}

        {activePage === "referrals" && (
          <ReferralDashboardPage
            dashboard={referralDashboard}
            loading={referralLoading}
            applyReferralProgram={applyReferralProgram}
            refresh={loadReferralDashboard}
            setActivePage={setActivePage}
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

      <DraggableAIAssistant
        activePage={activePage}
        account={account}
        binaryMarketStates={binaryMarketStates}
        volatilityOptions={VOLATILITY_OPTIONS}
        marketFeed={marketFeed}
        forexMarkets={MARKET_OPTIONS}
        botTemplates={BOT_TEMPLATES}
        currentStake={Number(stake || 1)}
        onApply={applyAiSetup}
        onAutoTrade={startAiAutoTrade}
        onStopAutoTrade={stopAiAutoTrade}
        autoSession={aiAutoSession}
      />

      <SupportChat
        user={user}
        activePage={activePage}
        account={account}
      />

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

export default function App() {
  const params = new URLSearchParams(window.location.search);
  const adminMode = window.location.pathname.startsWith("/admin") || params.get("admin") === "1";
  return adminMode ? <AdminPortal /> : <TradingApp />;
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

function PasswordField({ value, onChange, placeholder, autoComplete, minLength, required = true }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="passwordFieldWrap">
      <input
        type={visible ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        minLength={minLength}
        required={required}
      />
      <button type="button" onClick={() => setVisible((shown) => !shown)} aria-label={visible ? "Hide password" : "Show password"}>
        {visible ? "◉" : "◎"}
      </button>
    </div>
  );
}

function AuthScreen({ mode, setMode, login, register, requestPasswordReset, resetPassword }) {
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [resetEmail, setResetEmail] = useState("");
  const [resetData, setResetData] = useState({ password: "", confirmPassword: "" });
  const [busy, setBusy] = useState(false);
  const resetToken = new URLSearchParams(window.location.search).get("reset_token") || "";

  const [regData, setRegData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  async function submitLogin() {
    if (busy) return;
    setBusy(true);
    await login(loginData);
    setBusy(false);
  }

  async function submitRegister() {
    if (busy) return;
    setBusy(true);
    await register(regData);
    setBusy(false);
  }

  async function submitResetRequest() {
    if (!resetEmail || busy) return;
    setBusy(true);
    await requestPasswordReset(resetEmail);
    setBusy(false);
  }

  async function submitNewPassword() {
    if (!resetToken || resetData.password !== resetData.confirmPassword || busy) return;
    setBusy(true);
    await resetPassword({ token: resetToken, password: resetData.password });
    setBusy(false);
  }

  return (
    <div className="authPage">
      {mode === "forgot" ? (
        <section className="authCard loginCard">
          <Logo />
          <h1>Reset Password</h1>
          <p>Enter the email connected to your MetaBinary account.</p>
          <label>Email Address</label>
          <input type="email" placeholder="Enter your registered email" value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} />
          <button className="primaryBtn" onClick={submitResetRequest} disabled={busy}>{busy ? "Sending…" : "Send Reset Link"}</button>
          <small><button onClick={() => setMode("login")}>‹ Back to Login</button></small>
        </section>
      ) : mode === "reset" ? (
        <section className="authCard loginCard">
          <Logo />
          <h1>Create New Password</h1>
          <p>Choose a secure password with at least eight characters.</p>
          <label>New Password</label>
          <PasswordField value={resetData.password} onChange={(e) => setResetData((old) => ({ ...old, password: e.target.value }))} placeholder="New password" autoComplete="new-password" minLength="8" />
          <label>Confirm Password</label>
          <PasswordField value={resetData.confirmPassword} onChange={(e) => setResetData((old) => ({ ...old, confirmPassword: e.target.value }))} placeholder="Confirm password" autoComplete="new-password" minLength="8" />
          {resetData.confirmPassword && resetData.password !== resetData.confirmPassword && <small className="authErrorText">Passwords do not match.</small>}
          <button className="primaryBtn" onClick={submitNewPassword} disabled={busy || !resetToken || resetData.password !== resetData.confirmPassword}>{busy ? "Updating…" : "Update Password"}</button>
        </section>
      ) : mode === "login" ? (
        <section className="authCard loginCard">
          <Logo />
          <h1>Welcome Back</h1>
          <p>Login to your account and continue trading.</p>
          <label>Email Address</label>
          <input type="email" placeholder="Enter your email" value={loginData.email} onChange={(e) => setLoginData({ ...loginData, email: e.target.value })} />
          <label>Password</label>
          <PasswordField value={loginData.password} onChange={(e) => setLoginData({ ...loginData, password: e.target.value })} placeholder="Enter your password" autoComplete="current-password" />
          <button type="button" className="forgotPasswordLink" onClick={() => setMode("forgot")}>Forgot password?</button>
          <button className="primaryBtn" onClick={submitLogin} disabled={busy}>{busy ? "Signing in…" : "Login →"}</button>
          <small>Don’t have an account? <button onClick={() => setMode("register")}>Create Account</button></small>
        </section>
      ) : (
        <section className="authCard registerCard">
          <Logo />
          <h1>Create Your Account</h1>
          <p>Join MetaBinary and start your trading journey.</p>
          <div className="registerGrid">
            <input placeholder="First name" value={regData.firstName} onChange={(e) => setRegData({ ...regData, firstName: e.target.value })} />
            <input placeholder="Last name" value={regData.lastName} onChange={(e) => setRegData({ ...regData, lastName: e.target.value })} />
            <input type="email" placeholder="Email address" value={regData.email} onChange={(e) => setRegData({ ...regData, email: e.target.value })} />
            <input placeholder="+254 phone number" value={regData.phone} onChange={(e) => setRegData({ ...regData, phone: e.target.value })} />
            <PasswordField value={regData.password} onChange={(e) => setRegData({ ...regData, password: e.target.value })} placeholder="Password" autoComplete="new-password" minLength="8" />
            <PasswordField value={regData.confirmPassword} onChange={(e) => setRegData({ ...regData, confirmPassword: e.target.value })} placeholder="Confirm password" autoComplete="new-password" minLength="8" />
          </div>
          <button className="primaryBtn" onClick={submitRegister} disabled={busy}>{busy ? "Creating account…" : "Create Account"}</button>
          <small>Already have an account? <button onClick={() => setMode("login")}>Login</button></small>
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
  autoSession,
}) {
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const isReal = account === "real";
  const safeNotifications = Array.isArray(notifications) ? notifications : [];
  const unreadCount = safeNotifications.filter((item) => !item.read).length;
  const aiLastNet = Number(autoSession?.lastNet || 0);
  const aiBalanceClass = aiLastNet > 0 ? "aiBalanceWin" : aiLastNet < 0 ? "aiBalanceLoss" : "";

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
        className={`walletBox brokerWallet accountSelectorButton ${accountMenuOpen ? "menuOpen" : ""} ${autoSession?.running ? "aiTradingBalance" : ""} ${aiBalanceClass}`}
        onClick={() => {
          setAccountMenuOpen((open) => !open);
          setNotificationOpen(false);
        }}
        aria-haspopup="listbox"
        aria-expanded={accountMenuOpen}
        aria-label={`Selected ${isReal ? "real" : "demo"} account. Balance ${money(balance)} USD`}
      >
        {isReal ? (
          <div className="usdWalletSelectorV12">
            <span className="usdFlagCircleV12" aria-hidden="true">
              <span className="usdFlagStarsV12"></span>
            </span>
            <span className="usdWalletInlineV12">{money(balance)} USD</span>
          </div>
        ) : (
          <div className="demoWalletSelectorV12">
            <span className="demoWalletBadgeV12">DEMO</span>
            <span className="demoWalletInlineV12">{money(balance)} USD</span>
          </div>
        )}

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
            <span>Trade With Clarity.</span>
          </h1>

          <p>Trading tools, market views, risk controls and automation in one platform.</p>

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
        <Stat icon="📈" value="10" label="Volatility Markets" spark="blue" />
        <Stat icon="↕" value="5" label="Contract Types" spark="purple" />
        <Stat icon="🤖" value="4" label="Bot Templates" spark="green" />
        <Stat icon="🛡" value="24/7" label="Risk Controls" spark="yellow" />
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
          <FeatureLine icon="🔁" title="Binary Options" text="Flexible digit contracts" />
          <FeatureLine icon="🧠" title="Forex Trading" text="Trade major currency pairs" />
          <FeatureLine icon="🤖" title="Automated Bots" text="24/7 algorithmic trading" />
          <FeatureLine icon="💰" title="Risk Management" text="Advanced risk controls" />
        </div>
      </section>

      <section className="homeFooter">
        <span>🛡 Account security controls</span>
        <span>⚠ Trading involves financial risk</span>
        <span>🎧 Customer support</span>
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

function MarketsPage({ marketFeed, setMarketSymbol, setActivePage }) {
  function openForex(market) {
    setMarketSymbol(market.symbol);
    setActivePage("forex");
  }

  return (
    <div className="page marketsPage professionalMarketsPage forexOnlyMarketsPage">
      <header className="marketsPageHero">
        <div>
          <small>FOREX, METALS & CRYPTO</small>
          <h1>Markets</h1>
          <p>Select a market to open its live chart and Buy/Sell controls.</p>
        </div>
        <span>Live global markets</span>
      </header>

      <section className="marketCategoryPanel forexOnlyMarketPanel">
        <header>
          <div><small>GLOBAL MARKETS</small><h2>Forex, Metals & Crypto</h2></div>
          <span>{MARKET_OPTIONS.length} markets</span>
        </header>
        <div className="forexMarketGrid">
          {MARKET_OPTIONS.map((market) => {
            const feed = marketFeed?.[market.symbol] || {};
            return (
              <button key={market.symbol} type="button" className="forexMarketCard" onClick={() => openForex(market)}>
                <span>{market.category === "Crypto" ? "₿" : market.category === "Metals" ? "◆" : "FX"}</span>
                <div><strong>{market.label}</strong><small>{market.symbol} · {feed.isOpen === false ? "CLOSED" : "OPEN"}</small></div>
                <b>{formatMarketPrice(feed.price || market.defaultPrice, market)}</b>
                <i>›</i>
              </button>
            );
          })}
        </div>
      </section>
    </div>
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
  preparedSetup,
}) {
  const [volume, setVolume] = useState(0.01);
  const [leverage, setLeverage] = useState("1:100");
  const [stopLoss, setStopLoss] = useState(0);
  const [takeProfit, setTakeProfit] = useState(0);
  const [orderBusy, setOrderBusy] = useState(false);
  const [expandedLiveTradeId, setExpandedLiveTradeId] = useState("");
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
  const tradingAllowed = account === "demo" ? true : marketOpen;
  const priceReady = Number.isFinite(Number(livePrice)) && Number(livePrice) > 0;
  const feedStatus = marketFeed?.status || "connecting";
  const change = Number(marketFeed?.change || 0);
  const percentChange = Number(marketFeed?.percentChange || 0);
  const positiveChange = change >= 0;
  const currentTimeframe =
    MARKET_TIMEFRAMES.find((item) => item.value === timeframe) ||
    MARKET_TIMEFRAMES[0];

  useEffect(() => {
    if (!preparedSetup?.preparedAt || preparedSetup.symbol !== symbol) return;
    if (Number.isFinite(Number(preparedSetup.volume))) setVolume(Number(preparedSetup.volume));
    if (Number.isFinite(Number(preparedSetup.stopLoss))) setStopLoss(Number(preparedSetup.stopLoss));
    if (Number.isFinite(Number(preparedSetup.takeProfit))) setTakeProfit(Number(preparedSetup.takeProfit));
  }, [preparedSetup?.preparedAt, preparedSetup?.symbol, symbol]);

  useEffect(() => {
    if (seededSymbolRef.current === symbol) return;
    if (preparedSetup?.preparedAt && preparedSetup.symbol === symbol) {
      seededSymbolRef.current = symbol;
      return;
    }
    setStopLoss(0);
    setTakeProfit(0);
    seededSymbolRef.current = symbol;
  }, [symbol, preparedSetup?.preparedAt, preparedSetup?.symbol]);

  async function order(side) {
    if (orderBusy || !priceReady || !tradingAllowed) return;

    const gap = Number(market.priceStep || 0.0001);
    const stopValue = Number(stopLoss);
    const takeValue = Number(takeProfit);
    const hasStopLoss = Number.isFinite(stopValue) && stopValue > 0;
    const hasTakeProfit = Number.isFinite(takeValue) && takeValue > 0;

    const fixedStopLoss = hasStopLoss
      ? Number((side === "Buy" ? Math.min(stopValue, Number(livePrice) - gap) : Math.max(stopValue, Number(livePrice) + gap)).toFixed(market.decimals))
      : 0;
    const fixedTakeProfit = hasTakeProfit
      ? Number((side === "Buy" ? Math.max(takeValue, Number(livePrice) + gap) : Math.min(takeValue, Number(livePrice) - gap)).toFixed(market.decimals))
      : 0;

    if (hasStopLoss) setStopLoss(fixedStopLoss);
    if (hasTakeProfit) setTakeProfit(fixedTakeProfit);
    setOrderBusy(true);

    try {
      await placeForexOrder({
        side,
        symbol,
        volume,
        leverage,
        stopLoss: fixedStopLoss,
        takeProfit: fixedTakeProfit,
        marketPrice: livePrice,
        marketOpen: tradingAllowed,
      });
    } finally {
      window.setTimeout(() => setOrderBusy(false), 350);
    }
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
              setStopLoss(0);
              setTakeProfit(0);
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
            {market.symbol === "BTC/USD"
              ? "Bitcoin quote refreshes automatically"
              : "Live forex pricing is verified by the backend"}
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

      {visiblePositions.length > 0 && (
        <section className="forexLiveTradeLines" aria-label="Open positions on this market">
          <header>
            <div><small>OPEN POSITION{visiblePositions.length === 1 ? "" : "S"}</small><strong>{symbol}</strong></div>
            <button type="button" onClick={() => setActivePage("openTrades")}>View all ({accountPositions.length})</button>
          </header>
          {visiblePositions.map((position) => {
            const expanded = expandedLiveTradeId === position.id;
            const positive = Number(position.pl || 0) >= 0;
            return (
              <article className={`forexLiveTradeLine ${expanded ? "expanded" : ""}`} key={position.id}>
                <button type="button" className="forexLiveTradeSummary" onClick={() => setExpandedLiveTradeId(expanded ? "" : position.id)}>
                  <span><strong>{position.instrument}</strong><small className={position.side === "Buy" ? "green" : "red"}>{position.side}</small></span>
                  <span><small>Volume</small><b>{position.volume} lot</b></span>
                  <span><small>Entry</small><b>{formatMarketPrice(position.openPrice, position.instrument)}</b></span>
                  <span><small>Live P/L</small><b className={positive ? "green" : "red"}>{positive ? "+" : ""}{money(position.pl)} USD</b></span>
                  <i>{expanded ? "⌃" : "⌄"}</i>
                </button>
                {expanded && (
                  <div className="forexLiveTradeDetails">
                    <p><span>Current price</span><b>{formatMarketPrice(position.currentPrice || position.openPrice, position.instrument)}</b></p>
                    <p><span>Stop loss</span><b>{Number(position.stopLoss || 0) > 0 ? formatMarketPrice(position.stopLoss, position.instrument) : "Not set"}</b></p>
                    <p><span>Take profit</span><b>{Number(position.takeProfit || 0) > 0 ? formatMarketPrice(position.takeProfit, position.instrument) : "Not set"}</b></p>
                    <p><span>Leverage</span><b>{position.leverage || "1:100"}</b></p>
                  </div>
                )}
              </article>
            );
          })}
        </section>
      )}

      <section className="proOrderPanel forexOrderCard marketOrderStack">
        <div className="tradeActionColumn marketActionColumn">
          <div className="buySellBox buySellProBox">
            <button
              type="button"
              className="buyLarge"
              onClick={() => order("Buy")}
              disabled={orderBusy || !priceReady || !tradingAllowed}
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
              disabled={orderBusy || !priceReady || !tradingAllowed}
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
              label="Stop Loss (optional)"
              value={stopLoss}
              setValue={setStopLoss}
              step={market.priceStep}
              min={0}
              decimals={market.decimals}
            />

            <OrderInput
              label="Take Profit (optional)"
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
  const [expandedId, setExpandedId] = useState("");

  const open = positions.filter((p) => p.account === account);
  const closed = closedPositions.filter((p) => p.account === account);
  const winning = open.filter((p) => Number(p.pl || 0) >= 0);
  const losing = open.filter((p) => Number(p.pl || 0) < 0);
  const selectedRows = tab === "winning" ? winning : tab === "losing" ? losing : tab === "history" ? closed : open;
  const rows = market === "All markets" ? selectedRows : selectedRows.filter((p) => p.instrument === market);
  const markets = Array.from(new Set([...open, ...closed].map((p) => p.instrument))).filter(Boolean);
  const floatingPl = open.reduce((sum, p) => sum + Number(p.pl || 0), 0);
  const usedMargin = open.reduce((sum, p) => sum + Number(p.margin || 0), 0);
  const equity = Number(balance || 0) + floatingPl;
  const freeMargin = Math.max(0, equity - usedMargin);
  const isHistory = tab === "history";

  async function confirmClose(position) {
    const approved = window.confirm(`Close ${position.side} ${position.instrument} position?`);
    if (approved) await closePosition(position.id);
  }

  return (
    <div className="page openTradesFullPage compactOpenTradesPage">
      <header className="openTradesHeader">
        <button type="button" onClick={back} aria-label="Back to market">‹</button>
        <div><small>Markets</small><h1>{isHistory ? "Trade History" : "Open Trades"}</h1></div>
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
        <label><span>Market</span><select value={market} onChange={(e) => setMarket(e.target.value)}><option>All markets</option>{markets.map((item) => <option key={item}>{item}</option>)}</select></label>
        {!isHistory && <button type="button" className="closeAllTradesBtn" disabled={open.length === 0} onClick={() => window.confirm("Close all open positions?") && closeAllPositions({ account })}>Close all</button>}
      </section>

      <section className="openTradeCardList compactTradeLineList">
        {rows.length === 0 && <div className="openTradesEmpty"><b>{isHistory ? "No closed trades yet" : "No open trades"}</b><span>{isHistory ? "Your completed positions will appear here." : "Go back to Markets and place a Buy or Sell order."}</span>{!isHistory && <button type="button" onClick={back}>Go to market</button>}</div>}
        {rows.map((p) => {
          const expanded = expandedId === p.id;
          return (
            <article className={`compactTradePosition ${expanded ? "expanded" : ""}`} key={p.id}>
              <button type="button" className="compactTradeSummary" onClick={() => setExpandedId(expanded ? "" : p.id)}>
                <span><strong>{p.instrument}</strong><small className={p.side === "Buy" ? "green" : "red"}>{p.side}</small></span>
                <span><small>Volume</small><b>{p.volume} lot</b></span>
                <span><small>P/L</small><b className={Number(p.pl || 0) >= 0 ? "green" : "red"}>{Number(p.pl || 0) >= 0 ? "+" : ""}{money(p.pl)} USD</b></span>
                <i>{expanded ? "⌃" : "⌄"}</i>
              </button>

              {expanded && (
                <div className="compactTradeDetails">
                  <div className="fullTradeGrid">
                    <p><span>Open price</span><b>{formatMarketPrice(p.openPrice, p.instrument)}</b></p>
                    <p><span>Current price</span><b>{formatMarketPrice(p.currentPrice || p.openPrice, p.instrument)}</b></p>
                    <p><span>Leverage</span><b>{p.leverage || "1:100"}</b></p>
                    <p><span>Margin</span><b>{money(p.margin)} USD</b></p>
                    <p><span>Opened</span><b>{p.openedAt || "—"}</b></p>
                    <p><span>Status</span><b>{isHistory ? "Closed" : "Live"}</b></p>
                  </div>
                  <div className="tradeProtectionGrid">
                    <label><span>Stop Loss</span>{isHistory ? <b>{formatMarketPrice(p.stopLoss, p.instrument)}</b> : <input type="number" step="0.00001" value={p.stopLoss ?? ""} onChange={(e) => updatePosition(p.id, { stopLoss: e.target.value })} />}</label>
                    <label><span>Take Profit</span>{isHistory ? <b>{formatMarketPrice(p.takeProfit, p.instrument)}</b> : <input type="number" step="0.00001" value={p.takeProfit ?? ""} onChange={(e) => updatePosition(p.id, { takeProfit: e.target.value })} />}</label>
                  </div>
                  <div className="fullTradeFooter"><small>Ticket {String(p.id).slice(-8)} {isHistory && p.closedAt ? `· Closed ${p.closedAt}` : "· Updating live"}</small>{!isHistory && <button type="button" onClick={() => confirmClose(p)}>Close Trade</button>}</div>
                </div>
              )}
            </article>
          );
        })}
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
  binaryMarket,
  binaryMarketId,
  setBinaryMarketId,
  volatilityOptions,
}) {
  const [marketMenuOpen, setMarketMenuOpen] = useState(false);
  const [barrierDirection, setBarrierDirection] = useState("above");
  const [barrierDistance, setBarrierDistance] = useState(2);

  useEffect(() => {
    if (activeBinaryTrade) setMarketMenuOpen(false);
  }, [activeBinaryTrade]);

  const actions = actionsFor(tradeType);
  const digitMode = isDigitContract(tradeType);
  const riseMode = tradeType === "Rise/Fall";
  const touchMode = tradeType === "Touch/No Touch";
  const indexValue = livePrice * Number(binaryMarket?.scale || 800);
  const priceStep = Number(binaryMarket?.priceStep || 2);
  const safeStake = Math.max(0, Number(stake) || 0);
  const safeBarrierDistance = Math.max(0.5, Number(barrierDistance || 2));
  const rawBarrier = Number(
    (
      livePrice +
      (barrierDirection === "above" ? 1 : -1) *
        (safeBarrierDistance / Number(binaryMarket?.scale || 800))
    ).toFixed(6)
  );
  const payoutOptions = { ticks: duration, barrierDistance: safeBarrierDistance };
  const rateOne = payoutRate(tradeType, actions[0], prediction, payoutOptions);
  const rateTwo = payoutRate(tradeType, actions[1], prediction, payoutOptions);
  const payoutOne = rateOne > 0 ? money(safeStake * rateOne) : "—";
  const payoutTwo = rateTwo > 0 ? money(safeStake * rateTwo) : "—";
  const activeTradeEntry = Number(activeBinaryTrade?.entryPrice || livePrice || 0);
  const activeTradeCurrent = Number(activeBinaryTrade?.currentPrice || livePrice || activeTradeEntry);
  const activePriceWinning = riseMode && activeBinaryTrade
    ? activeBinaryTrade.action === "Rise"
      ? activeTradeCurrent > activeTradeEntry
      : activeTradeCurrent < activeTradeEntry
    : touchMode && activeBinaryTrade
      ? activeBinaryTrade.action === "Touch"
        ? Boolean(activeBinaryTrade.touched)
        : !activeBinaryTrade.touched
      : false;
  const activePotentialPayout = Number(activeBinaryTrade?.payout || 0);
  const activeStake = Number(activeBinaryTrade?.stake || safeStake || 0);
  const activePreviewNet = activePriceWinning
    ? Number((activePotentialPayout - activeStake).toFixed(2))
    : -activeStake;
    const highestPercent = Math.max(...digitStats);
  const lowestPercent = Math.min(...digitStats);
  const tickOptions = Array.from({ length: 10 }, (_, index) => index + 1);
  const quickStakeValues = [1, 5, 10, 50, 100];

  const actionMeta = Object.fromEntries(
    actions.map((action) => {
      const rate = payoutRate(tradeType, action, prediction, payoutOptions);
      return [
        action,
        {
          rate,
          payout: rate > 0 ? money(safeStake * rate) : "—",
        },
      ];
    })
  );

  const evenAction =
    actions.find((action) => action.toLowerCase() === "even") || actions[0];
  const oddAction =
    actions.find((action) => action.toLowerCase() === "odd") || actions[1];

  const leftAction = tradeType === "Even/Odd" ? oddAction : actions[0];
  const rightAction = tradeType === "Even/Odd" ? evenAction : actions[1];

  const leftLabel = tradeType === "Even/Odd" ? "ODD" : leftAction.toUpperCase();
  const rightLabel = tradeType === "Even/Odd" ? "EVEN" : rightAction.toUpperCase();

  const leftRate = actionMeta[leftAction]?.rate ?? 0;
  const rightRate = actionMeta[rightAction]?.rate ?? 0;

  const leftPayout = actionMeta[leftAction]?.payout ?? "—";
  const rightPayout = actionMeta[rightAction]?.payout ?? "—";

  const changeStake = (difference) => {
    setStake((current) => Number(Math.max(0.3, (Number(current) || 0) + difference).toFixed(2)));
  };

  const placeContract = (action) =>
    runBinaryTrade(tradeType, action, {
      barrier: touchMode ? rawBarrier : 0,
      barrierDistance: safeBarrierDistance,
    });

  return (
    <div className={`page tradePage tradePagePro finalBinaryTradePage ${digitMode ? "digitContractPage" : "priceContractPage"}`}>
      <section className="proTradeTypeRow finalContractTabs">
        <span>Trade Type</span>
        {["Even/Odd", "Matches/Differs", "Over/Under", "Rise/Fall", "Touch/No Touch"].map((type) => (
          <button key={type} type="button" className={tradeType === type ? "active" : ""} onClick={() => setTradeType(type)} disabled={Boolean(activeBinaryTrade)}>{type}</button>
        ))}
      </section>

      <section className={`volatilitySwitchBar ${marketMenuOpen ? "open" : ""}`} aria-label="Select volatility market">
        <button type="button" className="volatilitySwitchButton" onClick={() => setMarketMenuOpen((open) => !open)} disabled={Boolean(activeBinaryTrade)} aria-haspopup="listbox" aria-expanded={marketMenuOpen}>
          <span className="volatilitySwitchBadge">{binaryMarket?.short || "V100 1s"}</span>
          <span className="volatilitySwitchCopy"><small>VOLATILITY MARKET</small><strong>{binaryMarket?.label || "Volatility 100 (1s) Index"}</strong></span>
          <span className="volatilitySwitchLive"><i></i> LIVE</span>
          <span className="volatilitySwitchChevron" aria-hidden="true">⌄</span>
        </button>
        {marketMenuOpen && (
          <div className="volatilitySwitchMenu" role="listbox" aria-label="Volatility markets">
            {volatilityOptions.map((market) => (
              <button type="button" role="option" aria-selected={market.id === binaryMarketId} key={market.id} className={market.id === binaryMarketId ? "active" : ""} onClick={() => { setBinaryMarketId(market.id); setMarketMenuOpen(false); }}>
                <span>{market.short}</span><div><strong>{market.label}</strong><small>{market.description}</small></div><i>{market.id === binaryMarketId ? "✓" : "›"}</i>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="proTradeChartCard binaryChartWithDigits finalBinaryChartCard">
        <div className="proChartTitle finalBinaryChartTitle">
          <div className="binarySelectedMarketMini"><span>{binaryMarket?.short || "V100 1s"}</span><strong>{binaryMarket?.label || "Volatility 100 (1s) Index"}</strong></div>
          <strong className="binaryLivePrice">{indexValue.toFixed(2)} · LIVE</strong>
          <button className="binaryDurationButton" type="button">{duration} ticks⌄</button>
          <button className="binaryFullscreenButton" type="button">⛶</button>
        </div>

        <div className="proChartArea finalBinaryChartArea">
          <div className="priceScale"><span>{(indexValue + priceStep * 2).toFixed(2)}</span><span>{(indexValue + priceStep).toFixed(2)}</span><span>{indexValue.toFixed(2)}</span><span>{(indexValue - priceStep).toFixed(2)}</span><span>{(indexValue - priceStep * 2).toFixed(2)}</span></div>
          <div className="proChartCanvas">
            <LineChart data={prices.map((value) => value * Number(binaryMarket?.scale || 800))} />
            <div className="worldMapGlow"></div>
            <div className="chartLivePrice">● {indexValue.toFixed(2)}</div>
            {riseMode && <div className="entryPriceLine"><span>Entry {Number(activeBinaryTrade?.entryPrice ? activeBinaryTrade.entryPrice * Number(binaryMarket?.scale || 800) : indexValue).toFixed(2)}</span></div>}
            {touchMode && <div className={`barrierPriceLine ${barrierDirection}`} style={{ top: barrierDirection === "above" ? "28%" : "72%" }}><span>Barrier {(rawBarrier * Number(binaryMarket?.scale || 800)).toFixed(2)}</span></div>}
            {activeBinaryTrade && <div className="binaryTradeStatus" role="status"><span className="binaryTradePulse"></span><strong>{activeBinaryTrade.action}</strong><small>{activeBinaryTrade.remainingTicks} of {activeBinaryTrade.totalTicks} ticks remaining</small></div>}
          </div>
        </div>

        <div className="chartTimeRow finalChartTimeRow"><span>10:45:30</span><span>10:47:00</span><span>10:48:30</span><span>10:50:00</span><span>10:51:30</span></div>

        {!digitMode && activeBinaryTrade && (
          <div className={`priceContractLiveLine ${activePriceWinning ? "winning" : "losing"}`} role="status">
            <span><strong>{activeBinaryTrade.action}</strong><small>{binaryMarket?.short || "Volatility"}</small></span>
            <span><small>Entry</small><b>{(activeTradeEntry * Number(binaryMarket?.scale || 800)).toFixed(2)}</b></span>
            <span><small>Current</small><b>{(activeTradeCurrent * Number(binaryMarket?.scale || 800)).toFixed(2)}</b></span>
            <span><small>Live position</small><b>{activePriceWinning ? "Winning" : "Losing"} {activePreviewNet >= 0 ? "+" : ""}{money(activePreviewNet)} USD</b></span>
            <span><small>Time</small><b>{activeBinaryTrade.remainingTicks} tick{activeBinaryTrade.remainingTicks === 1 ? "" : "s"}</b></span>
          </div>
        )}

        {digitMode ? (
          <div className={`mbDigitBoardV7 ${activeBinaryTrade ? "isTrading" : ""}`}>
            <div className="mbDigitGridV7" aria-label="Digit percentages">
              {digitStats.map((percent, digit) => {
                const isHighest = Math.abs(percent - highestPercent) < 0.01;
                const isLowest = Math.abs(percent - lowestPercent) < 0.01;
                const isPicked = digit === prediction;
                const isCurrent = digit === lastDigit;
                const isResultDigit = binaryResultFlash?.digit === digit;
                const isWinningTarget = Boolean(
                  activeBinaryTrade && digitWinsTrade(activeBinaryTrade, digit, livePrice)
                );
                const isLosingTarget = Boolean(activeBinaryTrade && !isWinningTarget);

                const percentageRange = Math.max(0.1, highestPercent - lowestPercent);
                const percentageLevel = Math.max(
                  0,
                  Math.min(1, (Number(percent) - lowestPercent) / percentageRange)
                );

                // Middle rings visibly change with rank: low percentages have a
                // short white bottom arc; higher percentages grow and move upward.
                const whiteSweep = Math.round(64 + percentageLevel * 176);
                const whiteCenter = 180 * (1 - percentageLevel);
                const whiteStart = whiteCenter - whiteSweep / 2;

                return (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => setPrediction(digit)}
                    disabled={Boolean(activeBinaryTrade)}
                    className={[
                      "mbDigitCellV7",
                      isHighest ? "mbDigitHighestV7" : "",
                      isLowest ? "mbDigitLowestV7" : "",
                      isPicked ? "mbDigitPickedV7" : "",
                      isCurrent ? "mbDigitCurrentV7" : "",
                      isWinningTarget ? "mbDigitWinningV7" : "",
                      isLosingTarget ? "mbDigitLosingV8" : "",
                      isResultDigit && binaryResultFlash?.result === "win" ? "mbDigitResultWinV7" : "",
                      isResultDigit && binaryResultFlash?.result === "loss" ? "mbDigitResultLossV7" : "",
                    ].filter(Boolean).join(" ")}
                    style={{
                      "--mb-v7-white-sweep": `${whiteSweep}deg`,
                      "--mb-v7-white-start": `${whiteStart}deg`,
                    }}
                    aria-label={`Digit ${digit}, ${Number(percent).toFixed(1)} percent`}
                  >
                    <span className="mbDigitRingV7" aria-hidden="true" />
                    <span className="mbDigitCoreV7">
                      <strong>{digit}</strong>
                      <span className="mbDigitPercentV7">{Number(percent).toFixed(1)}%</span>
                    </span>
                    <i className="mbDigitCursorV7" aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="priceContractInfoPanel">
            {riseMode ? (
              <><span className="contractInfoIcon">↕</span><div><strong>Rise / Fall price contract</strong><small>The exit price is compared with the entry price after the selected ticks. Digit statistics are not used.</small></div><b>{activeBinaryTrade ? `${activeBinaryTrade.remainingTicks} ticks left` : "Ready"}</b></>
            ) : (
              <><span className="contractInfoIcon">◎</span><div><strong>Touch / No Touch barrier</strong><small>The contract watches whether the live price reaches the barrier before expiry.</small></div><b>{(rawBarrier * Number(binaryMarket?.scale || 800)).toFixed(2)}</b></>
            )}
          </div>
        )}

        <div className="chartToolRow finalChartToolRow"><button type="button">⌁</button><button type="button">▥</button><button type="button">▱</button><button type="button">⛶</button></div>
      </section>

      <section className="proBinaryOrderCard finalBinaryOrderCard">
        {touchMode && (
          <div className="barrierControlRow">
            <label><span>Barrier direction</span><select value={barrierDirection} onChange={(event) => setBarrierDirection(event.target.value)} disabled={Boolean(activeBinaryTrade)}><option value="above">Above current price</option><option value="below">Below current price</option></select></label>
            <label><span>Barrier distance</span><div><button type="button" onClick={() => setBarrierDistance((value) => Math.max(0.5, Number(value) - 0.5))}>−</button><input type="number" min="0.5" step="0.5" value={barrierDistance} onChange={(event) => setBarrierDistance(Number(event.target.value))} /><button type="button" onClick={() => setBarrierDistance((value) => Number(value) + 0.5)}>+</button></div></label>
          </div>
        )}
        <div className="orderInputsTop finalOrderInputs">
          <label className="finalTicksControl"><span>Ticks</span><div className="finalTicksBox"><button type="button" onClick={() => setDuration((current) => Math.max(1, Number(current || 1) - 1))} disabled={Boolean(activeBinaryTrade) || Number(duration) <= 1}>−</button><select value={duration} onChange={(event) => setDuration(Number(event.target.value))} disabled={Boolean(activeBinaryTrade)}>{tickOptions.map((tick) => <option key={tick} value={tick}>{tick} tick{tick === 1 ? "" : "s"}</option>)}</select><button type="button" onClick={() => setDuration((current) => Math.min(10, Number(current || 1) + 1))} disabled={Boolean(activeBinaryTrade) || Number(duration) >= 10}>+</button></div></label>
          <label className="finalStakeControl"><span>Amount to trade</span><div className="proStakeBox finalStakeBox"><button type="button" onClick={() => changeStake(-1)} disabled={Boolean(activeBinaryTrade)}>−</button><div className="finalStakeInputWrap"><input type="number" min="0.30" step="0.10" inputMode="decimal" value={stake} onChange={(event) => { const value = event.target.value; setStake(value === "" ? "" : Number(value)); }} disabled={Boolean(activeBinaryTrade)} /><small>USD</small></div><button type="button" onClick={() => changeStake(1)} disabled={Boolean(activeBinaryTrade)}>+</button></div><div className="quickStakeRow">{quickStakeValues.map((value) => <button key={value} type="button" onClick={() => setStake(value)} disabled={Boolean(activeBinaryTrade)}>{value}</button>)}</div></label>
        </div>
        <div className="proTradeButtons finalTradeButtons">
          <button
            className={tradeType === "Even/Odd" ? "proRedTrade" : "proGreenTrade"}
            onClick={() => placeContract(leftAction)}
            disabled={Boolean(activeBinaryTrade) || leftRate <= 0}
          >
            <span>{tradeType === "Even/Odd" ? "⌄" : "⌃"}</span>
            <div>
              <strong>{leftLabel}</strong>
              <small>
                {activeBinaryTrade
                  ? `${activeBinaryTrade.remainingTicks} ticks remaining`
                  : leftRate > 0
                    ? `Estimated payout ${leftPayout} USD · ${leftRate.toFixed(3)}×`
                    : "Unavailable"}
              </small>
            </div>
          </button>

          <button
            className={tradeType === "Even/Odd" ? "proGreenTrade" : "proRedTrade"}
            onClick={() => placeContract(rightAction)}
            disabled={Boolean(activeBinaryTrade) || rightRate <= 0}
          >
            <span>{tradeType === "Even/Odd" ? "⌃" : "⌄"}</span>
            <div>
              <strong>{rightLabel}</strong>
              <small>
                {activeBinaryTrade
                  ? `${activeBinaryTrade.remainingTicks} ticks remaining`
                  : rightRate > 0
                    ? `Estimated payout ${rightPayout} USD · ${rightRate.toFixed(3)}×`
                    : "Unavailable"}
              </small>
            </div>
          </button>
        </div>
      </section>
    </div>
  );
}

function BotsPage({ bots, configureBot }) {
  const running = bots.filter((item) => item.status === "Running").length;
  const stopped = bots.length - running;

  return (
    <div className="page botsPage finalBotsPage">
      <header className="botsTopBar">
        <div>
          <small>Automated strategies</small>
          <h1>Trading Bots</h1>
        </div>
        <span><b>{running}</b> templates active</span>
      </header>

      <section className="botStats compactBotStats">
        <Stat icon="🤖" value={bots.length} label="Strategies" spark="blue" />
        <Stat icon="▶" value={running} label="Active" spark="green" />
        <Stat icon="Ⅱ" value={stopped} label="Ready" spark="yellow" />
        <Stat icon="✓" value="1–10" label="Ticks" spark="purple" />
      </section>

      <section className="botGrid finalBotGrid">
        {bots.map((bot, index) => (
          <article className="botCard finalBotCard" key={bot.id}>
            <div className={`botIcon botIcon${index + 1}`}>{bot.code}</div>
            <div className="botCardCopy">
              <h2>{bot.name}</h2>
              <p>{bot.type} · {bot.market}</p>
              <small>Configure market, stake, ticks, martingale and limits before starting.</small>
            </div>
            <div className="botMetrics compactBotMetrics">
              <p><span>Example stake</span><strong>{money(bot.stake)} USD</strong></p>
              <p><span>Template score</span><strong>{bot.winRate}/100</strong></p>
              <p><span>Previous runs</span><strong>{bot.trades}</strong></p>
            </div>
            <button className="botAction" onClick={() => configureBot(bot)}>Configure Bot</button>
          </article>
        ))}
      </section>
    </div>
  );
}

function BotSetupPage({ bot, config, setConfig, volatilityOptions, actionsFor, startBot, back }) {
  if (!bot) {
    return (
      <div className="page emptyPage darkEmptyPage">
        <button onClick={back}>‹ Back</button>
        <h2>Select a bot first.</h2>
      </div>
    );
  }

  const actions = actionsFor(config.type);
  const update = (patch) => setConfig((current) => ({ ...current, ...patch }));

  return (
    <div className="page botSetupPage">
      <header className="botSetupTop">
        <button type="button" onClick={back}>‹ Back</button>
        <div><small>Configure strategy</small><strong>{bot.name}</strong></div>
        <span>{config.martingaleEnabled ? `MG ×${config.martingaleMultiplier}` : "Fixed stake"}</span>
      </header>

      <section className="botSetupGrid">
        <label className="botWideField">
          <span>Market</span>
          <select value={config.marketId} onChange={(event) => update({ marketId: event.target.value })}>
            {volatilityOptions.map((market) => <option key={market.id} value={market.id}>{market.label}</option>)}
          </select>
        </label>

        <label>
          <span>Trade type</span>
          <select
            value={config.type}
            onChange={(event) => {
              const type = event.target.value;
              update({ type, action: defaultBotAction(type) });
            }}
          >
            {["Even/Odd", "Matches/Differs", "Over/Under", "Rise/Fall", "Touch/No Touch"].map((type) => <option key={type}>{type}</option>)}
          </select>
        </label>

        <label>
          <span>Action</span>
          <select value={config.action} onChange={(event) => update({ action: event.target.value })}>
            {actions.map((action) => <option key={action}>{action}</option>)}
          </select>
        </label>

        <label>
          <span>Base stake USD</span>
          <input type="number" min="0.3" step="0.1" inputMode="decimal" value={config.stake} onChange={(event) => update({ stake: Number(event.target.value) })} />
        </label>

        <label>
          <span>Ticks</span>
          <select value={config.ticks} onChange={(event) => update({ ticks: Number(event.target.value) })}>
            {Array.from({ length: 10 }, (_, index) => index + 1).map((tick) => <option key={tick} value={tick}>{tick} tick{tick === 1 ? "" : "s"}</option>)}
          </select>
        </label>

        {['Matches/Differs', 'Over/Under'].includes(config.type) && (
          <label>
            <span>Prediction digit</span>
            <select value={config.prediction} onChange={(event) => update({ prediction: Number(event.target.value) })}>
              {Array.from({ length: 10 }, (_, digit) => <option key={digit} value={digit}>{digit}</option>)}
            </select>
          </label>
        )}

        <label className="botToggleField">
          <span>Martingale</span>
          <button type="button" className={config.martingaleEnabled ? "on" : ""} onClick={() => update({ martingaleEnabled: !config.martingaleEnabled })}>
            {config.martingaleEnabled ? "Enabled" : "Disabled"}
          </button>
        </label>

        <label>
          <span>Multiplier</span>
          <select disabled={!config.martingaleEnabled} value={config.martingaleMultiplier} onChange={(event) => update({ martingaleMultiplier: Number(event.target.value) })}>
            {[1.2, 1.5, 1.8, 2, 2.5, 3].map((value) => <option key={value} value={value}>×{value}</option>)}
          </select>
        </label>

        <label>
          <span>Maximum steps</span>
          <select disabled={!config.martingaleEnabled} value={config.martingaleSteps} onChange={(event) => update({ martingaleSteps: Number(event.target.value) })}>
            {Array.from({ length: 7 }, (_, step) => <option key={step} value={step}>{step}</option>)}
          </select>
        </label>

        <label>
          <span>Take profit USD</span>
          <input type="number" min="0" step="1" value={config.takeProfit} onChange={(event) => update({ takeProfit: Number(event.target.value) })} />
        </label>

        <label>
          <span>Stop loss USD</span>
          <input type="number" min="0" step="1" value={config.stopLoss} onChange={(event) => update({ stopLoss: Number(event.target.value) })} />
        </label>
      </section>

      <section className="botRiskPreview">
        <div><span>First stake</span><strong>{money(config.stake)} USD</strong></div>
        <div><span>Maximum recovery</span><strong>{money(Number(config.stake || 0) * Math.pow(config.martingaleEnabled ? Number(config.martingaleMultiplier || 1) : 1, Number(config.martingaleSteps || 0)))} USD</strong></div>
        <div><span>Limits</span><strong>+{money(config.takeProfit)} / -{money(config.stopLoss)}</strong></div>
      </section>

      <button className="startConfiguredBot" type="button" onClick={() => startBot(config)}>▶ Start Bot & Open Transactions</button>
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

function BotLivePage({
  bot,
  running,
  stopBot,
  startBot,
  trades,
  botTab,
  setBotTab,
  sessionPnl,
  martingaleStep,
  resetSession,
  edit,
  back,
}) {
  const last = trades[0];
  const wins = trades.filter((trade) => trade.won).length;
  const losses = trades.length - wins;
  const totalStake = trades.reduce((sum, trade) => sum + Number(trade.stake || 0), 0);
  const totalPayout = trades.reduce((sum, trade) => sum + Number(trade.payout || 0), 0);
  const winRate = trades.length ? (wins / trades.length) * 100 : 0;

  if (!bot) {
    return (
      <div className="page emptyPage darkEmptyPage">
        <button onClick={back}>‹ Back to Bots</button>
        <h2>Select a bot first.</h2>
      </div>
    );
  }

  return (
    <div className="page botLivePage finalBotLivePage">
      <header className="botLiveTop">
        <button type="button" onClick={back}>‹ Bots</button>
        <div><small>Running strategy</small><strong>{bot.name}</strong></div>
        <button type="button" className="editBotButton" onClick={edit}>Edit</button>
      </header>

      <section className="runnerBox finalRunnerBox">
        <button className={running ? "stopRunner" : "startRunner"} onClick={running ? stopBot : startBot}>
          {running ? "■ Stop Bot" : "▶ Run Bot"}
        </button>
        <div className="runnerStatusCopy">
          <strong>{running ? "Watching for the next contract" : "Bot paused"}</strong>
          <small>{bot.market} · {bot.type} · {bot.action} · {bot.ticks} ticks</small>
          <span><i className={running ? "active" : ""}></i></span>
        </div>
      </section>

      <section className="botLiveMetrics">
        <div><span>Session P/L</span><strong className={sessionPnl >= 0 ? "green" : "red"}>{sessionPnl >= 0 ? "+" : ""}{money(sessionPnl)} USD</strong></div>
        <div><span>Current MG step</span><strong>{martingaleStep}/{bot.martingaleSteps || 0}</strong></div>
        <div><span>Next base stake</span><strong>{money(bot.stake)} USD</strong></div>
      </section>

      <section className="runnerTabs runnerTabsWithReset">
        {["transactions", "summary", "journal"].map((tab) => (
          <button
            type="button"
            key={tab}
            className={botTab === tab ? "active" : ""}
            onClick={() => setBotTab(tab)}
          >
            {tab}
          </button>
        ))}
        <button
          type="button"
          className="resetBotSessionBtn"
          onClick={resetSession}
          title="Clear bot transactions, summary and journal"
        >
          ↻ Reset
        </button>
      </section>

      <section className="runnerBody">
        {botTab === "transactions" && (
          <div className="runnerList finalRunnerList">
            {trades.length === 0 && (
              <div className="runnerEmpty">
                {running ? "The bot is buying its first contract…" : "The first transaction will appear here."}
              </div>
            )}
            {trades.slice(0, 30).map((trade) => (
              <p key={trade.id}>
                <span>
                  <b>{trade.market?.replace("Volatility ", "V")}</b>
                  <small>
                    {trade.type} · {trade.action} · digit {trade.resultDigit} · MG {trade.martingaleStep}
                  </small>
                </span>
                <span className="transactionStake">
                  <small>Stake {money(trade.stake)}</small>
                  <b className={trade.won ? "green" : "red"}>
                    {trade.net >= 0 ? "+" : ""}{money(trade.net)}
                  </b>
                </span>
              </p>
            ))}
          </div>
        )}

        {botTab === "summary" && (
          <div className="runnerSummaryPanel">
            <div className={last?.won ? "runnerResult won" : last ? "runnerResult lost" : "runnerResult"}>
              <strong>{last ? last.status : running ? "RUNNING" : "READY"}</strong>
              <h2>{last ? `${last.net >= 0 ? "+" : ""}${money(last.net)} USD` : "Start the bot"}</h2>
              <small>
                {last
                  ? `${last.market} · ${last.type} · ${last.action} · step ${last.martingaleStep}`
                  : "Your complete session totals will update after every contract."}
              </small>
            </div>

            <div className="runnerSummaryGrid">
              <p><span>Total runs</span><strong>{trades.length}</strong></p>
              <p><span>Win rate</span><strong>{winRate.toFixed(1)}%</strong></p>
              <p><span>Total stake</span><strong>{money(totalStake)}</strong></p>
              <p><span>Total payout</span><strong>{money(totalPayout)}</strong></p>
            </div>
          </div>
        )}

        {botTab === "journal" && (
          <div className="runnerList finalRunnerList botJournalList">
            {trades.length === 0 && (
              <div className="runnerEmpty">
                Bot decisions and contract results will be recorded here.
              </div>
            )}
            {trades.slice(0, 30).map((trade, index) => (
              <p className="journalEntry" key={trade.id}>
                <span>
                  <b>{trade.won ? "Winning contract" : "Losing contract"}</b>
                  <small>
                    #{trades.length - index} · {trade.market?.replace("Volatility ", "V")} · {trade.type} · {trade.action}
                  </small>
                </span>
                <span className="journalMeta">
                  <b className={trade.won ? "green" : "red"}>
                    {trade.net >= 0 ? "+" : ""}{money(trade.net)}
                  </b>
                  <small>{trade.time}</small>
                </span>
              </p>
            ))}
          </div>
        )}
      </section>

      <section className="runnerStats">
        <Stat value={trades.length} label="Runs" />
        <Stat value={wins} label="Won" />
        <Stat value={losses} label="Lost" />
        <Stat value={`${sessionPnl >= 0 ? "+" : ""}${money(sessionPnl)}`} label="P/L" />
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
  const referralEarned = Number(referral?.totalEarned ?? user?.partnerBalance ?? 0);
  const referralCount = Number(referral?.totalReferrals ?? user?.referralCount ?? 0);
  const referralRate = Number(
    referral?.commissionRate ?? user?.referralCommissionRate ?? REFERRAL_COMMISSION_PERCENT
  );
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
              ? `Your link is active. Earn ${referralRate}% commission whenever a trader who registered through your link completes a real-money deposit.`
              : "Apply once to receive your personal referral link and start earning commissions."}
          </p>

          <div className={referralApproved ? "referralStatus approved" : "referralStatus pending"}>
            <b>{referralApproved ? "Approved Partner" : "Not Applied Yet"}</b>
            <span>{referralApproved ? `Code: ${referralCode} · ${referralRate}% commission` : "Create your link in one click"}</span>
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

                <div>
                  <small>COMMISSION RATE</small>
                  <strong>{referralRate}%</strong>
                </div>
              </div>

              <button className="referralDashboardBtn" onClick={() => setActivePage("referrals")}>Open Referral Dashboard ›</button>
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

function ToggleSetting({ label, description, checked, onChange }) {
  return (
    <label className="settingsToggleRow">
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <button
        type="button"
        className={checked ? "settingsSwitch on" : "settingsSwitch"}
        onClick={() => onChange(!checked)}
        aria-pressed={checked}
      >
        <i></i>
      </button>
    </label>
  );
}

function SettingsPage({ user, busy, saveProfile, saveNotifications, changePassword }) {
  const defaultNotifications = { push: true, security: true, wallet: true, referrals: true, botSounds: true, takeProfitSound: true, stopLossSound: true, soundVolume: 70 };
  const [section, setSection] = useState("profile");
  const [profile, setProfile] = useState({ fullName: user?.fullName || user?.name || "", phone: user?.phone || "", country: user?.country || "Kenya" });
  const [notificationPrefs, setNotificationPrefs] = useState({ ...defaultNotifications, ...(user?.preferences?.notifications || {}) });
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });

  useEffect(() => {
    setProfile({ fullName: user?.fullName || user?.name || "", phone: user?.phone || "", country: user?.country || "Kenya" });
    setNotificationPrefs({ ...defaultNotifications, ...(user?.preferences?.notifications || {}) });
  }, [user?.fullName, user?.name, user?.phone, user?.country, user?.preferences]);

  async function submitProfile(event) { event.preventDefault(); await saveProfile(profile); }
  async function submitPassword(event) { event.preventDefault(); if (passwords.newPassword !== passwords.confirmPassword) return; const saved = await changePassword({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword }); if (saved) setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" }); }
  async function submitNotifications() { await saveNotifications({ notifications: notificationPrefs }); }
  const passwordMismatch = Boolean(passwords.confirmPassword && passwords.newPassword !== passwords.confirmPassword);

  return (
    <div className="page settingsPage professionalSettingsPage">
      <section className="professionalSettingsHero"><div className="settingsHeroIcon">⚙</div><div><small>ACCOUNT CONTROL CENTER</small><h1>Settings</h1><p>Manage identity, security and important alerts. Trading values are kept on trading screens.</p></div><div className="settingsAccountBadge"><span>{user?.verified ? "Verified account" : "Verification pending"}</span><strong>{user?.accountId || user?.brokerId || "MetaBinary"}</strong></div></section>
      <section className="professionalSettingsLayout">
        <nav className="settingsSectionNav"><button className={section === "profile" ? "active" : ""} onClick={() => setSection("profile")}><b>♙</b><span><strong>Personal details</strong><small>Name, phone and country</small></span></button><button className={section === "security" ? "active" : ""} onClick={() => setSection("security")}><b>◆</b><span><strong>Security</strong><small>Change your password</small></span></button><button className={section === "notifications" ? "active" : ""} onClick={() => setSection("notifications")}><b>🔔</b><span><strong>Notifications & sounds</strong><small>Important alerts only</small></span></button></nav>
        <div className="settingsContentPanel">
          {section === "profile" && <form className="settingsFormCard" onSubmit={submitProfile}><header><div><small>PERSONAL DETAILS</small><h2>Profile information</h2></div><span className="settingsSecurePill">Protected</span></header><div className="settingsReadOnlyGrid"><label><span>Email address</span><strong>{user?.email || "—"}</strong><small>Email changes require support verification.</small></label><label><span>Broker account ID</span><strong>{user?.accountId || user?.brokerId || "—"}</strong><small>Your permanent account number.</small></label></div><div className="settingsInputGrid"><label><span>Full legal name</span><input value={profile.fullName} onChange={(event) => setProfile((old) => ({ ...old, fullName: event.target.value }))} required /></label><label><span>Phone number</span><input value={profile.phone} onChange={(event) => setProfile((old) => ({ ...old, phone: event.target.value }))} placeholder="07XXXXXXXX" inputMode="tel" required /></label><label><span>Country</span><select value={profile.country} onChange={(event) => setProfile((old) => ({ ...old, country: event.target.value }))}><option>Kenya</option></select></label><label><span>Verification</span><div className={user?.verified ? "settingsVerification verified" : "settingsVerification"}>{user?.verified ? "✓ Identity verified" : "Verification pending"}</div></label></div><footer><small>Used for ownership and payment verification.</small><button className="settingsSaveButton" disabled={busy === "profile"}>{busy === "profile" ? "Saving…" : "Save profile"}</button></footer></form>}
          {section === "security" && <form className="settingsFormCard" onSubmit={submitPassword}><header><div><small>ACCOUNT SECURITY</small><h2>Change password</h2></div><span className="settingsSecurePill">Encrypted</span></header><div className="settingsSecurityNotice"><b>Security recommendation</b><span>Use at least 8 characters. Password fields include show/hide controls.</span></div><div className="settingsPasswordGrid"><label><span>Current password</span><PasswordField value={passwords.currentPassword} onChange={(event) => setPasswords((old) => ({ ...old, currentPassword: event.target.value }))} autoComplete="current-password" /></label><label><span>New password</span><PasswordField value={passwords.newPassword} onChange={(event) => setPasswords((old) => ({ ...old, newPassword: event.target.value }))} autoComplete="new-password" minLength="8" /></label><label><span>Confirm new password</span><PasswordField value={passwords.confirmPassword} onChange={(event) => setPasswords((old) => ({ ...old, confirmPassword: event.target.value }))} autoComplete="new-password" minLength="8" />{passwordMismatch && <small className="settingsFieldError">Passwords do not match.</small>}</label></div><footer><small>Forgotten passwords can be reset from the Login page by email.</small><button className="settingsSaveButton" disabled={busy === "password" || passwordMismatch}>{busy === "password" ? "Changing…" : "Change password"}</button></footer></form>}
          {section === "notifications" && <section className="settingsFormCard notificationSettingsCard"><header><div><small>COMMUNICATIONS</small><h2>Notifications and bot sounds</h2></div><span className="settingsSecurePill">Account alerts</span></header><div className="settingsToggleList"><ToggleSetting label="In-app notifications" description="Show account updates in the notification center." checked={notificationPrefs.push} onChange={(value) => setNotificationPrefs((old) => ({ ...old, push: value }))} /><ToggleSetting label="Security alerts" description="Login and password events." checked={notificationPrefs.security} onChange={(value) => setNotificationPrefs((old) => ({ ...old, security: value }))} /><ToggleSetting label="Wallet updates" description="Deposits, withdrawals and reversals." checked={notificationPrefs.wallet} onChange={(value) => setNotificationPrefs((old) => ({ ...old, wallet: value }))} /><ToggleSetting label="Referral updates" description="New traders and earned 5% commissions." checked={notificationPrefs.referrals} onChange={(value) => setNotificationPrefs((old) => ({ ...old, referrals: value }))} /><ToggleSetting label="Bot sounds" description="Allow bot target and stop-loss sounds." checked={notificationPrefs.botSounds} onChange={(value) => setNotificationPrefs((old) => ({ ...old, botSounds: value }))} /><ToggleSetting label="Take-profit sound" description="Positive sound when the target is reached." checked={notificationPrefs.takeProfitSound} onChange={(value) => setNotificationPrefs((old) => ({ ...old, takeProfitSound: value }))} /><ToggleSetting label="Stop-loss warning" description="Warning alarm when stop loss is reached." checked={notificationPrefs.stopLossSound} onChange={(value) => setNotificationPrefs((old) => ({ ...old, stopLossSound: value }))} /><label className="soundVolumeSetting"><span><strong>Sound volume</strong><small>{Number(notificationPrefs.soundVolume || 0)}%</small></span><input type="range" min="0" max="100" value={notificationPrefs.soundVolume} onChange={(event) => setNotificationPrefs((old) => ({ ...old, soundVolume: Number(event.target.value) }))} /></label></div><footer><small>Browser sound begins after your first interaction.</small><button type="button" className="settingsSaveButton" onClick={submitNotifications} disabled={busy === "notifications"}>{busy === "notifications" ? "Saving…" : "Save preferences"}</button></footer></section>}
        </div>
      </section>
    </div>
  );
}

function ReferralDashboardPage({ dashboard, loading, applyReferralProgram, refresh, setActivePage }) {
  const [copied, setCopied] = useState(false);
  const active = Boolean(dashboard?.active);
  const rate = Number(dashboard?.commissionRate ?? REFERRAL_COMMISSION_PERCENT);
  const referrals = Array.isArray(dashboard?.referrals) ? dashboard.referrals : [];
  const commissions = Array.isArray(dashboard?.commissions) ? dashboard.commissions : [];

  async function copyLink() {
    if (!dashboard?.link) return;
    await navigator.clipboard?.writeText(dashboard.link);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  async function shareLink() {
    if (!dashboard?.link) return;
    if (navigator.share) {
      await navigator.share({
        title: "Join MetaBinary",
        text: `Create your MetaBinary account using my referral link.`,
        url: dashboard.link,
      });
    } else {
      await copyLink();
    }
  }

  return (
    <div className="page referralDashboardPage">
      <section className="referralDashboardHero">
        <button className="referralBackButton" onClick={() => setActivePage("profile")}>‹ Profile</button>
        <div className="referralHeroCopy">
          <small>METABINARY PARTNER PROGRAM</small>
          <h1>Invite traders. Earn {rate}%.</h1>
          <p>When someone creates an account through your personal link, their account is connected to you. You receive {rate}% commission on every successful real-money deposit they complete.</p>
        </div>
        <div className="referralRateOrb"><strong>{rate}%</strong><span>commission</span></div>
      </section>

      {!dashboard && loading && (
        <section className="referralActivationCard referralLoadingCard">
          <div className="referralActivationIcon">↻</div>
          <div><small>PARTNER ACCOUNT</small><h2>Loading your referral dashboard</h2><p>Checking your referral link, network and commission journal.</p></div>
        </section>
      )}

      {!loading && !active && (
        <section className="referralActivationCard">
          <div className="referralActivationIcon">👥</div>
          <div><small>PARTNER ACCOUNT</small><h2>Activate your referral link</h2><p>Create one permanent referral link. No trading amount, stake or trade settings are required.</p></div>
          <button onClick={applyReferralProgram}>Activate 5% Referral Program</button>
        </section>
      )}

      {active && (
        <>
          <section className="referralLinkCard">
            <div><small>YOUR PERSONAL REFERRAL LINK</small><strong>{dashboard.link}</strong><span>Referral code: {dashboard.code}</span></div>
            <button onClick={copyLink}>{copied ? "Copied ✓" : "Copy link"}</button>
            <button className="referralShareButton" onClick={shareLink}>Share</button>
            <button className="referralRefreshButton" onClick={refresh} disabled={loading}>{loading ? "…" : "↻"}</button>
          </section>

          <section className="referralMetricGrid">
            <article><span>👥</span><small>Total referrals</small><strong>{Number(dashboard.totalReferrals || 0)}</strong><em>Registered through your link</em></article>
            <article><span>✓</span><small>Active depositors</small><strong>{Number(dashboard.activeDepositors || 0)}</strong><em>Referrals with completed deposits</em></article>
            <article><span>▣</span><small>Referred deposits</small><strong>{money(dashboard.totalReferredDeposits || 0)} USD</strong><em>Total successful deposit volume</em></article>
            <article><span>★</span><small>Total commission</small><strong>{money(dashboard.totalEarned || 0)} USD</strong><em>{rate}% earned from deposits</em></article>
            <article><span>$</span><small>Referral balance</small><strong>{money(dashboard.referralBalance || 0)} USD</strong><em>Separate from trading balances</em></article>
          </section>

          <section className="referralDashboardGrid">
            <article className="referralDataPanel">
              <header><div><small>REFERRED TRADERS</small><h2>Your referral network</h2></div><span>{referrals.length} accounts</span></header>
              <div className="referralTable referralTradersTable">
                <div className="referralTableHead"><span>Trader</span><span>Joined</span><span>Deposits</span><span>Total deposited</span></div>
                {referrals.length === 0 && <div className="referralEmptyState">No one has registered through your link yet.</div>}
                {referrals.map((item) => (
                  <div className="referralTableRow" key={item.id || item.email}>
                    <span><b>{item.name}</b><small>{item.email}</small></span>
                    <span>{item.joinedAt ? new Date(item.joinedAt).toLocaleDateString() : "—"}</span>
                    <span>{item.depositCount}</span>
                    <span>{money(item.totalDeposited)} USD</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="referralDataPanel">
              <header><div><small>COMMISSION JOURNAL</small><h2>Recent earnings</h2></div><span>{rate}% rate</span></header>
              <div className="referralCommissionList">
                {commissions.length === 0 && <div className="referralEmptyState">Commission entries appear after a referred trader completes a deposit.</div>}
                {commissions.slice(0, 20).map((item) => (
                  <div key={item.id}>
                    <span><b>Referral commission</b><small>{item.sourceEmail || "Referred trader"} · {item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}</small></span>
                    <strong>+{money(item.amount)} USD</strong>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="referralRulesCard">
            <div><b>1</b><span><strong>Share your unique link</strong><small>The referral code is recorded when the new trader registers.</small></span></div>
            <div><b>2</b><span><strong>The trader deposits</strong><small>Only completed real-money deposits qualify. Test, cancelled and reversed payments do not.</small></span></div>
            <div><b>3</b><span><strong>You receive {rate}%</strong><small>Commission is credited once per successful deposit into your separate referral balance.</small></span></div>
          </section>
        </>
      )}
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
    ["markets", "Markets", "▥"],
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
            (key === "bots" && ["botSetup", "botLive"].includes(activePage)) ||
            (key === "markets" && ["forex", "openTrades"].includes(activePage))
              ? "active"
              : ""
          }
          onClick={() => setActivePage(key === "markets" ? "forex" : key)}
          aria-label={label}
          aria-current={
            activePage === key || (key === "markets" && ["forex", "openTrades"].includes(activePage))
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
            <DrawerButton icon="👥" label="Referrals" onClick={() => go("referrals")} />
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

function DraggableAIAssistant({ activePage, account, binaryMarketStates, volatilityOptions, marketFeed, forexMarkets, botTemplates, currentStake, onApply, onAutoTrade, onStopAutoTrade, autoSession }) {
  const [open, setOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scanMessage, setScanMessage] = useState("Ready to scan");
  const [result, setResult] = useState(null);
  const [position, setPosition] = useState(() => readStore(STORE.aiPosition, { x: 18, y: 130 }));
  const [config, setConfig] = useState({ stake: Math.max(0.3, Number(currentStake || 1)), takeProfit: 20, stopLoss: 10 });
  const dragRef = useRef({ dragging: false, moved: false, offsetX: 0, offsetY: 0, startX: 0, startY: 0 });

  useEffect(() => saveStore(STORE.aiPosition, position), [position]);

  useEffect(() => {
    const clampToScreen = () => {
      const buttonSize = window.innerWidth <= 760 ? 58 : 66;
      const minY = Math.max(8, Number(window.visualViewport?.offsetTop || 0) + 8);
      const viewportHeight = Number(window.visualViewport?.height || window.innerHeight);
      setPosition((old) => ({
        x: Math.max(8, Math.min(window.innerWidth - buttonSize - 8, Number(old?.x || window.innerWidth - buttonSize - 16))),
        y: Math.max(minY, Math.min(viewportHeight - buttonSize - 8, Number(old?.y || 130))),
      }));
    };
    clampToScreen();
    window.addEventListener("resize", clampToScreen, { passive: true });
    window.visualViewport?.addEventListener("resize", clampToScreen, { passive: true });
    return () => {
      window.removeEventListener("resize", clampToScreen);
      window.visualViewport?.removeEventListener("resize", clampToScreen);
    };
  }, []);

  function pageMode() {
    if (["forex", "openTrades"].includes(activePage)) return "forex";
    if (["bots", "botSetup", "botLive"].includes(activePage)) return "bot";
    return "trade";
  }

  function buildResult() {
    const confidence = 77 + Math.floor(Math.random() * 17);
    const mode = pageMode();
    if (mode === "forex") {
      const openMarkets = forexMarkets.filter((market) => marketFeed?.[market.symbol]?.isOpen !== false);
      const market = openMarkets[Math.floor(Math.random() * Math.max(1, openMarkets.length))] || forexMarkets[2];
      const price = Number(marketFeed?.[market.symbol]?.price || market.defaultPrice);
      const momentum = Number(marketFeed?.[market.symbol]?.change || 0);
      const side = momentum >= 0 ? "Buy" : "Sell";
      const sl = side === "Buy" ? price - market.slDistance : price + market.slDistance;
      const tp = side === "Buy" ? price + market.tpDistance : price - market.tpDistance;
      return { mode, confidence, symbol: market.symbol, marketLabel: market.label, side, volume: 0.01, entry: price, stopLoss: Number(sl.toFixed(market.decimals)), takeProfit: Number(tp.toFixed(market.decimals)), sessionTakeProfit: Math.max(0.3, Number(config.takeProfit || 20)), sessionStopLoss: Math.max(0.3, Number(config.stopLoss || 10)) };
    }
    if (mode === "bot") {
      const template = botTemplates[Math.floor(Math.random() * botTemplates.length)] || botTemplates[0];
      const market = volatilityOptions[Math.floor(Math.random() * volatilityOptions.length)] || volatilityOptions[0];
      const type = template.type === "Rise/Fall" ? "Rise/Fall" : Math.random() > 0.45 ? "Over/Under" : template.type;
      const action = defaultBotAction(type);
      return { mode, confidence, botId: template.id, marketLabel: market.label, config: { marketId: market.id, type, action, prediction: type === "Over/Under" ? 2 : 0, stake: config.stake, ticks: 3 + Math.floor(Math.random() * 3), martingaleEnabled: true, martingaleMultiplier: 2, martingaleSteps: 3, takeProfit: config.takeProfit, stopLoss: config.stopLoss } };
    }
    const scored = volatilityOptions.map((market, index) => {
      const state = binaryMarketStates?.[market.id] || {};
      const values = state.prices || [];
      const recent = values.slice(-10);
      const trend = recent.length > 1 ? recent[recent.length - 1] - recent[0] : 0;
      const stats = state.digitStats || [10];
      const spread = Math.max(...stats) - Math.min(...stats);
      return { market, score: Math.abs(trend) * 100000 + spread + Math.random() * 2 + index * 0.01 };
    }).sort((a, b) => b.score - a.score);
    const market = scored[0]?.market || volatilityOptions[0];
    const typeChoices = ["Over/Under", "Matches/Differs", "Rise/Fall"];
    const type = typeChoices[Math.floor(Math.random() * typeChoices.length)];
    const recentPrices = binaryMarketStates?.[market.id]?.prices || [];
    const recentTrend = recentPrices.length > 2 ? Number(recentPrices[recentPrices.length - 1]) - Number(recentPrices[Math.max(0, recentPrices.length - 8)]) : 0;
    const thresholds = [1, 6, 9];
    const prediction = type === "Over/Under" ? thresholds[Math.floor(Math.random() * thresholds.length)] : Math.floor(Math.random() * 10);
    const action = type === "Matches/Differs"
      ? "Differs"
      : type === "Rise/Fall"
      ? (recentTrend >= 0 ? "Rise" : "Fall")
      : prediction >= 8
      ? "Under"
      : prediction === 6
      ? (recentTrend >= 0 ? "Over" : "Under")
      : "Over";
    return { mode, confidence, marketId: market.id, marketLabel: market.label, type, action, prediction, ticks: 3 + Math.floor(Math.random() * 4), stake: config.stake, takeProfit: config.takeProfit, stopLoss: config.stopLoss };
  }

  function scan() {
    if (scanning) return;
    const scanDurationMs = 30000;
    const startedAt = Date.now();
    setScanning(true);
    setProgress(1);
    setResult(null);
    setScanMessage("Connecting to market feeds…");

    const timer = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const value = Math.min(99, Math.max(1, Math.floor((elapsed / scanDurationMs) * 100)));
      setProgress(value);
      setScanMessage(
        value < 20 ? "Connecting to market feeds…" :
        value < 42 ? "Reading price movement and momentum…" :
        value < 64 ? "Comparing payouts and digit distribution…" :
        value < 84 ? "Checking recovery paths and entry timing…" :
        "Ranking the strongest market setup…"
      );

      if (elapsed >= scanDurationMs) {
        window.clearInterval(timer);
        setProgress(100);
        setScanMessage("Strongest setup found");
        setResult(buildResult());
        setScanning(false);
      }
    }, 300);
  }

  function pointerDown(event) {
    dragRef.current = {
      dragging: true,
      moved: false,
      offsetX: event.clientX - position.x,
      offsetY: event.clientY - position.y,
      startX: event.clientX,
      startY: event.clientY,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function pointerMove(event) {
    if (!dragRef.current.dragging) return;
    const distance = Math.hypot(event.clientX - dragRef.current.startX, event.clientY - dragRef.current.startY);
    if (distance < 5 && !dragRef.current.moved) return;
    dragRef.current.moved = true;
    const buttonSize = window.innerWidth <= 760 ? 58 : 66;
    const minY = Math.max(8, Number(window.visualViewport?.offsetTop || 0) + 8);
    const viewportHeight = Number(window.visualViewport?.height || window.innerHeight);
    setPosition({
      x: Math.max(8, Math.min(window.innerWidth - buttonSize - 8, event.clientX - dragRef.current.offsetX)),
      y: Math.max(minY, Math.min(viewportHeight - buttonSize - 8, event.clientY - dragRef.current.offsetY)),
    });
  }

  function pointerUp() {
    const moved = dragRef.current.moved;
    dragRef.current.dragging = false;
    if (!moved) setOpen((shown) => !shown);
  }

  const mode = pageMode();
  const mobileViewport = typeof window !== "undefined" && window.innerWidth <= 760;
  const buttonStyle = {
    "--ai-x": `${Math.round(position.x)}px`,
    "--ai-y": `${Math.round(position.y)}px`,
  };
  const panelStyle = mobileViewport ? undefined : {
    left: Math.min(position.x, Math.max(8, window.innerWidth - 390)),
    top: Math.min(position.y + 76, Math.max(90, window.innerHeight - 590)),
  };

  return (
    <>
      {!open && (
        <button
          className={`floatingAiButton ${scanning ? "scanning" : ""} ${autoSession?.running ? "autoRunning" : ""}`}
          style={buttonStyle}
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
          aria-label="Open AI market scanner"
        >
          <span className="aiOrbCore">AI</span><i></i><b>{scanning ? `${progress}%` : autoSession?.running ? `${Number(autoSession.pnl || 0) >= 0 ? "+" : ""}${money(autoSession.pnl || 0)}` : "SCAN"}</b>
        </button>
      )}

      {open && (
        <section className="aiScannerPanel" style={panelStyle}>
          <header><div><small>METABINARY INTELLIGENCE</small><h2>AI Market Scanner</h2></div><button onClick={() => setOpen(false)}>×</button></header>
          <div className="aiContextPill">Scanning mode: <strong>{mode === "trade" ? "Volatility contracts" : mode === "forex" ? "Forex markets" : "Trading bots"}</strong></div>
          <div className="aiScannerInputs">
            <label><span>Starting amount</span><input type="number" min="0.3" step="0.1" value={config.stake} onChange={(e) => setConfig((old) => ({ ...old, stake: Number(e.target.value) }))} /><small>USD</small></label>
            <label><span>Target profit</span><input type="number" min="0" value={config.takeProfit} onChange={(e) => setConfig((old) => ({ ...old, takeProfit: Number(e.target.value) }))} /><small>USD</small></label>
            <label><span>Stop loss</span><input type="number" min="0" value={config.stopLoss} onChange={(e) => setConfig((old) => ({ ...old, stopLoss: Number(e.target.value) }))} /><small>USD</small></label>
          </div>

          {scanning && (
            <div className="aiScanningState" aria-live="polite">
              <div className="aiRadarScanner"><span></span><i></i><b>AI</b></div>
              <div className="aiScanProgress"><div><span style={{ width: `${progress}%` }}></span></div><strong>{progress}%</strong><small>{scanMessage}</small></div>
              <ul className="aiDataFindingList">
                <li className={progress >= 20 ? "done" : "active"}>Market feed connected</li>
                <li className={progress >= 45 ? "done" : progress >= 20 ? "active" : ""}>Momentum and distribution analysed</li>
                <li className={progress >= 70 ? "done" : progress >= 45 ? "active" : ""}>Payout and entry timing compared</li>
                <li className={progress >= 94 ? "done" : progress >= 70 ? "active" : ""}>Recommended market selected</li>
              </ul>
            </div>
          )}

          {result && (
            <div className="aiSignalResult">
              <div className="aiConfidenceRing"><strong>{result.confidence}%</strong><small>estimated confidence</small></div>
              <div className="aiSignalCopy">
                <small>RECOMMENDED MARKET</small><h3>{result.marketLabel || result.symbol}</h3>
                {result.mode === "trade" && <p>{result.type} · {result.action}{result.type !== "Even/Odd" ? ` ${result.prediction}` : ""} · {result.ticks} ticks</p>}
                {result.mode === "forex" && <p>{result.side} · Entry {formatMarketPrice(result.entry, result.symbol)} · AI exit levels prepared</p>}
                {result.mode === "bot" && <p>{result.config.type} · {result.config.action} · Recovery ×{result.config.martingaleMultiplier} · {result.config.martingaleSteps} steps</p>}
                <em>Signal confidence is an estimate, not a guaranteed win rate.</em>
              </div>
            </div>
          )}

          {autoSession?.id && (
            <div className={`aiAutoRunCard ${autoSession.running ? "running" : "finished"}`}>
              <div className="aiAutoRunHead"><span><i></i><strong>{autoSession.running ? "AI AUTO-TRADE RUNNING" : "AI AUTO-TRADE SESSION"}</strong></span><b>{Number(autoSession.pnl || 0) >= 0 ? "+" : ""}{money(autoSession.pnl || 0)} USD</b></div>
              <p>{autoSession.status}</p>
              <div className="aiAutoMetrics"><span><small>Trades</small><strong>{autoSession.trades || 0}</strong></span><span><small>Wins</small><strong>{autoSession.wins || 0}</strong></span><span><small>Losses</small><strong>{autoSession.losses || 0}</strong></span><span><small>Target</small><strong>+{money(autoSession.targetProfit || 0)}</strong></span><span><small>Stop</small><strong>-{money(autoSession.stopLoss || 0)}</strong></span></div>
              {autoSession.running && <button type="button" className="aiStopAuto" onClick={() => onStopAutoTrade("Stopped manually by the trader")}>Stop AI Auto-Trade</button>}
            </div>
          )}

          <footer>
            <button className="aiScanAgain" onClick={scan} disabled={scanning || autoSession?.running}>{scanning ? "Scanning…" : result ? "Scan Again" : "Scan Markets"}</button>
            {result && !autoSession?.running && <button className="aiUseSetup" onClick={() => { onApply(result); setOpen(false); }}>Use Setup</button>}
            {result && !autoSession?.running && <button className="aiStartAuto" onClick={() => void onAutoTrade(result)}>Start AI Auto-Trade</button>}
          </footer>
          <small className="aiSafetyNote">Pressing Start AI Auto-Trade is your confirmation. It continues until the target profit, stop loss, insufficient balance, an error, or manual stop. Results are not guaranteed.</small>
        </section>
      )}
    </>
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
              {submitting ? "Confirming deposit…" : method === "mpesa" ? "Deposit Now" : "Continue to secure checkout"}
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


function SupportChat({ user, activePage, account }) {
  const categories = [
    ["wallet", "Deposit or withdrawal"],
    ["trading", "Trading or Forex"],
    ["ai", "AI or bot help"],
    ["account", "Account or password"],
    ["other", "Something else"],
  ];
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState("topic");
  const [category, setCategory] = useState("");
  const [details, setDetails] = useState("");
  const [ticket, setTicket] = useState(() => readStore(STORE.supportTicket, null));
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const messagesEndRef = useRef(null);

  const token = currentUserToken();
  const firstName = String(user?.fullName || user?.name || "Trader").split(" ")[0] || "Trader";

  function supportHeaders(extra = {}) {
    return apiHeaders({ "Content-Type": "application/json", ...extra }, token);
  }

  async function supportRequest(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: supportHeaders(options.headers || {}),
      cache: "no-store",
    });
    const result = await readApiResponse(response);
    if (!response.ok || result.ok === false) {
      throw new Error(result.message || `Support request failed (${response.status}).`);
    }
    return result;
  }

  async function loadCurrentTicket({ quiet = false } = {}) {
    if (!token) return;
    if (!quiet) setBusy(true);
    try {
      const result = await supportRequest("/api/support/current", { method: "GET", headers: {} });
      const nextTicket = result.ticket || null;
      setTicket(nextTicket);
      setMessages(Array.isArray(nextTicket?.messages) ? nextTicket.messages : []);
      if (nextTicket) {
        saveStore(STORE.supportTicket, { id: nextTicket.id, status: nextTicket.status });
        setStage("connected");
      } else {
        localStorage.removeItem(STORE.supportTicket);
        setStage("topic");
      }
    } catch (error) {
      if (!quiet) setNotice(error instanceof Error ? error.message : "Support is temporarily unavailable.");
    } finally {
      if (!quiet) setBusy(false);
    }
  }

  useEffect(() => {
    if (!open || !token) return;
    void loadCurrentTicket();
  }, [open, token]);

  useEffect(() => {
    if (!open || !ticket?.id || !token) return undefined;
    const timer = window.setInterval(() => void loadCurrentTicket({ quiet: true }), 6000);
    return () => window.clearInterval(timer);
  }, [open, ticket?.id, token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView?.({ block: "end", behavior: "smooth" });
  }, [messages.length, open]);

  function chooseCategory(value) {
    setCategory(value);
    setStage("details");
    setNotice("");
  }

  async function createTicket() {
    const body = details.trim();
    if (!category || body.length < 5 || busy) {
      setNotice("Tell the assistant what you need help with.");
      return;
    }
    setBusy(true);
    setNotice("");
    try {
      const result = await supportRequest("/api/support/tickets", {
        method: "POST",
        body: JSON.stringify({
          category,
          message: body,
          page: activePage,
          account,
          metadata: {
            screen: `${window.screen?.width || window.innerWidth}x${window.screen?.height || window.innerHeight}`,
            viewport: `${window.innerWidth}x${window.innerHeight}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "",
            userAgent: navigator.userAgent,
            build: FRONTEND_BUILD,
          },
        }),
      });
      setTicket(result.ticket);
      setMessages(result.ticket?.messages || []);
      saveStore(STORE.supportTicket, { id: result.ticket?.id, status: result.ticket?.status });
      setStage("connected");
      setDetails("");
      setNotice("Your conversation has been sent to an agent.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to start the conversation.");
    } finally {
      setBusy(false);
    }
  }

  async function sendMessage() {
    const body = message.trim();
    if (!ticket?.id || !body || busy) return;
    setBusy(true);
    setNotice("");
    try {
      const result = await supportRequest(`/api/support/tickets/${encodeURIComponent(ticket.id)}/messages`, {
        method: "POST",
        body: JSON.stringify({ message: body }),
      });
      setTicket(result.ticket);
      setMessages(result.ticket?.messages || []);
      setMessage("");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Message could not be sent.");
    } finally {
      setBusy(false);
    }
  }

  function startAnotherConversation() {
    localStorage.removeItem(STORE.supportTicket);
    setTicket(null);
    setMessages([]);
    setCategory("");
    setDetails("");
    setMessage("");
    setNotice("");
    setStage("topic");
  }

  return (
    <>
      {!open && (
        <button type="button" className="supportChatLauncher" onClick={() => setOpen(true)} aria-label="Open help chat">
          <span>?</span><b>Help</b>
        </button>
      )}

      {open && (
        <section className="supportChatPanel" role="dialog" aria-modal="true" aria-label="MetaBinary support chat">
          <header>
            <div><small>METABINARY SUPPORT</small><h2>Help &amp; live agent</h2></div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close support chat">×</button>
          </header>

          <div className="supportAiGreeting">
            <span>AI</span>
            <p>Hi {firstName}. What do you need help with? I’ll collect the details and connect you to an agent.</p>
          </div>

          {stage === "topic" && (
            <div className="supportTopicGrid">
              {categories.map(([value, label]) => (
                <button type="button" key={value} onClick={() => chooseCategory(value)}>{label}<i>›</i></button>
              ))}
            </div>
          )}

          {stage === "details" && (
            <div className="supportDetailsStep">
              <button type="button" className="supportBack" onClick={() => setStage("topic")}>‹ Change topic</button>
              <label>Explain what happened</label>
              <textarea
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                placeholder="Include what you clicked, what you expected and any error message."
                maxLength={1200}
              />
              <small>We attach your account email, current page, device size and app version so the agent can help faster. Never share your password or M-Pesa PIN.</small>
              <button type="button" className="supportPrimary" onClick={createTicket} disabled={busy}>{busy ? "Connecting…" : "Chat with an agent"}</button>
            </div>
          )}

          {stage === "connected" && ticket && (
            <>
              <div className="supportTicketStatus">
                <span><i></i>{ticket.status === "closed" ? "Conversation closed" : ticket.agentRepliedAt ? "Agent replied" : "Waiting for an agent"}</span>
                <small>Ticket {ticket.id}</small>
              </div>
              <div className="supportMessages">
                {(messages || []).map((item) => (
                  <div key={item.id || `${item.createdAt}-${item.sender}`} className={`supportMessage ${item.sender || "user"}`}>
                    <strong>{item.sender === "agent" ? "MetaBinary Agent" : item.sender === "assistant" ? "AI Assistant" : "You"}</strong>
                    <p>{item.body}</p>
                    <time>{item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}</time>
                  </div>
                ))}
                <div ref={messagesEndRef}></div>
              </div>
              {ticket.status !== "closed" ? (
                <div className="supportComposer">
                  <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Write a message…" maxLength={1200} />
                  <button type="button" onClick={sendMessage} disabled={busy || !message.trim()}>{busy ? "…" : "Send"}</button>
                </div>
              ) : (
                <button type="button" className="supportPrimary" onClick={startAnotherConversation}>Start a new conversation</button>
              )}
            </>
          )}

          {notice && <div className="supportNotice">{notice}</div>}
        </section>
      )}
    </>
  );
}

function AdminPortal() {
  const [token, setToken] = useState(() => currentAdminToken());
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [adjustment, setAdjustment] = useState({ account: "real", adjustment: "", reason: "" });
  const [statusReason, setStatusReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [supportTickets, setSupportTickets] = useState([]);
  const [selectedSupport, setSelectedSupport] = useState(null);
  const [supportReply, setSupportReply] = useState("");
  const [supportBusy, setSupportBusy] = useState(false);

  const adminHeaders = (extra = {}) => apiHeaders(extra, token);

  useEffect(() => {
    if (!token) return;
    void loadAdminData();
  }, [token]);

  useEffect(() => {
    if (!token) return undefined;
    const timer = window.setInterval(async () => {
      try {
        const result = await adminRequest("/api/admin/support?status=all");
        const nextTickets = result.tickets || [];
        setSupportTickets(nextTickets);
        setSelectedSupport((current) => {
          if (!current?.id) return current;
          return nextTickets.find((item) => item.id === current.id) || current;
        });
      } catch {
        // The visible Refresh button remains available if polling is interrupted.
      }
    }, 8000);
    return () => window.clearInterval(timer);
  }, [token]);

  async function adminRequest(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: adminHeaders(options.headers || {}),
      cache: "no-store",
    });
    const result = await readApiResponse(response);
    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem(STORE.adminToken);
      setToken("");
    }
    if (!response.ok || result.ok === false) throw new Error(result.message || `Admin request failed (${response.status}).`);
    return result;
  }

  async function loginAdmin(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`${API_URL}/api/admin/login`, {
        method: "POST",
        headers: apiHeaders({ "Content-Type": "application/json" }, ""),
        body: JSON.stringify(credentials),
      });
      const result = await readApiResponse(response);
      if (!response.ok || result.ok === false) throw new Error(result.message || "Admin login failed.");
      localStorage.setItem(STORE.adminToken, result.token);
      setToken(result.token);
      setMessage("Admin login successful.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Admin login failed.");
    } finally {
      setBusy(false);
    }
  }

  async function loadAdminData(query = search) {
    setBusy(true);
    setMessage("");
    try {
      const q = encodeURIComponent(query.trim());
      const [firstUsersResult, statsResult, supportResult] = await Promise.all([
        adminRequest(`/api/admin/users?limit=250&page=1&search=${q}`),
        adminRequest("/api/admin/stats"),
        adminRequest("/api/admin/support?status=all"),
      ]);
      const pageCount = Math.max(1, Number(firstUsersResult.pages || 1));
      const extraPages = pageCount > 1
        ? await Promise.all(
            Array.from({ length: pageCount - 1 }, (_, index) =>
              adminRequest(`/api/admin/users?limit=250&page=${index + 2}&search=${q}`)
            )
          )
        : [];
      const allUsers = [
        ...(firstUsersResult.users || []),
        ...extraPages.flatMap((page) => page.users || []),
      ];
      setUsers(allUsers);
      setStats(statsResult.stats || null);
      setSupportTickets(supportResult.tickets || []);
      if (selectedSupport) {
        const freshTicket = (supportResult.tickets || []).find((item) => item.id === selectedSupport.id);
        if (freshTicket) setSelectedSupport(freshTicket);
      }
      if (selected) {
        const fresh = allUsers.find((item) => item.id === selected.id);
        if (fresh) setSelected(fresh);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load users.");
    } finally {
      setBusy(false);
    }
  }

  async function openUser(user) {
    setBusy(true);
    setMessage("");
    try {
      const result = await adminRequest(`/api/admin/users/${encodeURIComponent(user.id || user.email)}`);
      setSelected(result.user);
      setTransactions(result.transactions || []);
      setStatusReason("");
      setAdjustment({ account: "real", adjustment: "", reason: "" });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to open user.");
    } finally {
      setBusy(false);
    }
  }

  async function adjustBalance(event) {
    event.preventDefault();
    if (!selected) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await adminRequest(
        `/api/admin/users/${encodeURIComponent(selected.id || selected.email)}/adjust-balance`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            account: adjustment.account,
            adjustment: Number(adjustment.adjustment),
            reason: adjustment.reason,
          }),
        }
      );
      setSelected(result.user);
      setTransactions((old) => [result.transaction, ...old]);
      setAdjustment((old) => ({ ...old, adjustment: "", reason: "" }));
      setMessage(result.message || "Balance updated.");
      await loadAdminData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Balance update failed.");
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(status) {
    if (!selected) return;
    if (status !== "active" && !statusReason.trim()) {
      setMessage("Enter a reason before suspending or banning the account.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const result = await adminRequest(
        `/api/admin/users/${encodeURIComponent(selected.id || selected.email)}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, reason: status === "active" ? "Account restored by admin" : statusReason }),
        }
      );
      setSelected(result.user);
      setStatusReason("");
      setMessage(result.message || "Account status updated.");
      await loadAdminData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Status update failed.");
    } finally {
      setBusy(false);
    }
  }

  async function openSupportTicket(ticket) {
    setSupportBusy(true);
    setMessage("");
    try {
      const result = await adminRequest(`/api/admin/support/${encodeURIComponent(ticket.id)}`);
      setSelectedSupport(result.ticket);
      setSupportReply("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to open the support conversation.");
    } finally {
      setSupportBusy(false);
    }
  }

  async function sendSupportReply(event) {
    event.preventDefault();
    if (!selectedSupport?.id || !supportReply.trim() || supportBusy) return;
    setSupportBusy(true);
    setMessage("");
    try {
      const result = await adminRequest(`/api/admin/support/${encodeURIComponent(selectedSupport.id)}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: supportReply.trim() }),
      });
      setSelectedSupport(result.ticket);
      setSupportReply("");
      setMessage("Support reply sent.");
      await loadAdminData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Support reply failed.");
    } finally {
      setSupportBusy(false);
    }
  }

  async function setSupportTicketStatus(status) {
    if (!selectedSupport?.id || supportBusy) return;
    setSupportBusy(true);
    setMessage("");
    try {
      const result = await adminRequest(`/api/admin/support/${encodeURIComponent(selectedSupport.id)}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setSelectedSupport(result.ticket);
      setMessage(result.message || "Support status updated.");
      await loadAdminData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Support status update failed.");
    } finally {
      setSupportBusy(false);
    }
  }

  function logoutAdmin() {
    localStorage.removeItem(STORE.adminToken);
    setToken("");
    setUsers([]);
    setSelected(null);
  }

  if (!token) {
    return (
      <div className="adminShell adminLoginShell">
        <form className="adminLoginCard" onSubmit={loginAdmin}>
          <Logo />
          <span className="adminEyebrow">SECURE ADMIN AREA</span>
          <h1>MetaBinary Admin</h1>
          <p>Sign in with the Admin credentials stored in the Render backend environment.</p>
          <label>Admin email</label>
          <input
            type="email"
            value={credentials.email}
            onChange={(event) => setCredentials((old) => ({ ...old, email: event.target.value }))}
            placeholder="admin@metabinaryfx.com"
            autoComplete="username"
          />
          <label>Admin password</label>
          <input
            type="password"
            value={credentials.password}
            onChange={(event) => setCredentials((old) => ({ ...old, password: event.target.value }))}
            placeholder="Admin password"
            autoComplete="current-password"
          />
          {message && <div className="adminMessage">{message}</div>}
          <button className="adminPrimary" disabled={busy}>{busy ? "Signing in…" : "Sign in as Admin"}</button>
          <a href="/" className="adminBackLink">← Return to trading platform</a>
        </form>
      </div>
    );
  }

  return (
    <div className="adminShell">
      <header className="adminHeader">
        <div>
          <Logo />
          <small>MongoDB account administration</small>
        </div>
        <div className="adminHeaderActions">
          <a href="/">Open platform</a>
          <button onClick={logoutAdmin}>Log out</button>
        </div>
      </header>

      <main className="adminMain">
        <section className="adminStatsGrid">
          <AdminStat title="Registered users" value={stats?.totalUsers ?? "—"} />
          <AdminStat title="Active accounts" value={stats?.activeUsers ?? "—"} />
          <AdminStat title="Banned accounts" value={stats?.bannedUsers ?? "—"} />
          <AdminStat title="Completed deposits" value={`$${money(stats?.totalDeposits || 0)}`} />
          <AdminStat title="Withdrawals" value={`$${money(stats?.totalWithdrawals || 0)}`} />
          <AdminStat title="Open support" value={stats?.openSupportTickets ?? 0} />
        </section>

        {message && <div className="adminMessage adminMessageWide">{message}</div>}

        <section className="adminWorkspace">
          <div className="adminUsersPanel">
            <div className="adminPanelTitle">
              <div>
                <h2>Registered Accounts</h2>
                <p>Accounts stored in MongoDB → {`metabinary.users`}</p>
              </div>
              <button onClick={() => loadAdminData()} disabled={busy}>Refresh</button>
            </div>

            <form className="adminSearch" onSubmit={(event) => { event.preventDefault(); void loadAdminData(search); }}>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search email, name, phone or broker ID"
              />
              <button disabled={busy}>Search</button>
            </form>

            <div className="adminUserList">
              {users.map((item) => (
                <button
                  key={item.id || item.email}
                  className={`adminUserRow ${selected?.id === item.id ? "selected" : ""}`}
                  onClick={() => openUser(item)}
                >
                  <span className="adminUserAvatar">{initials(item.fullName || item.email)}</span>
                  <span className="adminUserIdentity">
                    <strong>{item.fullName || item.name || "Unnamed user"}</strong>
                    <small>{item.email}</small>
                    <em>{item.accountId || item.brokerId || "No broker ID"}</em>
                  </span>
                  <span className="adminUserBalances">
                    <b>${money(item.realBalance)}</b>
                    <small>Demo ${money(item.demoBalance)}</small>
                  </span>
                  <span className={`adminStatus ${item.status || "active"}`}>{item.status || "active"}</span>
                </button>
              ))}
              {!users.length && !busy && <div className="adminEmpty">No registered accounts found.</div>}
              {busy && <div className="adminEmpty">Loading…</div>}
            </div>
          </div>

          <div className="adminUserDetail">
            {!selected ? (
              <div className="adminEmpty adminSelectPrompt">Select an account to manage balances and access.</div>
            ) : (
              <>
                <div className="adminDetailHeader">
                  <span className="adminUserAvatar large">{initials(selected.fullName || selected.email)}</span>
                  <div>
                    <h2>{selected.fullName || selected.name}</h2>
                    <p>{selected.email}</p>
                    <small>{selected.accountId || selected.brokerId}</small>
                  </div>
                  <span className={`adminStatus ${selected.status || "active"}`}>{selected.status || "active"}</span>
                </div>

                <div className="adminBalanceCards">
                  <div><span>Real balance</span><strong>${money(selected.realBalance)}</strong></div>
                  <div><span>Demo balance</span><strong>${money(selected.demoBalance)}</strong></div>
                </div>

                <form className="adminActionCard" onSubmit={adjustBalance}>
                  <h3>Adjust Balance</h3>
                  <p>Use a positive amount to add funds or a negative amount to remove funds. Every change is logged.</p>
                  <div className="adminFormGrid">
                    <label>
                      Account
                      <select value={adjustment.account} onChange={(event) => setAdjustment((old) => ({ ...old, account: event.target.value }))}>
                        <option value="real">Real account</option>
                        <option value="demo">Demo account</option>
                      </select>
                    </label>
                    <label>
                      Adjustment USD
                      <input
                        type="number"
                        step="0.01"
                        value={adjustment.adjustment}
                        onChange={(event) => setAdjustment((old) => ({ ...old, adjustment: event.target.value }))}
                        placeholder="Example: 20 or -10"
                      />
                    </label>
                  </div>
                  <label>
                    Reason
                    <input
                      value={adjustment.reason}
                      onChange={(event) => setAdjustment((old) => ({ ...old, reason: event.target.value }))}
                      placeholder="Example: Verified deposit correction"
                    />
                  </label>
                  <button className="adminPrimary" disabled={busy}>Apply balance adjustment</button>
                </form>

                <div className="adminActionCard">
                  <h3>Account Access</h3>
                  <p>Suspended and banned users are immediately blocked from login, deposits and withdrawals.</p>
                  <label>
                    Reason for suspension or ban
                    <input value={statusReason} onChange={(event) => setStatusReason(event.target.value)} placeholder="Enter the reason" />
                  </label>
                  <div className="adminStatusActions">
                    <button className="restore" onClick={() => changeStatus("active")} disabled={busy}>Activate</button>
                    <button className="suspend" onClick={() => changeStatus("suspended")} disabled={busy}>Suspend</button>
                    <button className="ban" onClick={() => changeStatus("banned")} disabled={busy}>Ban account</button>
                  </div>
                </div>

                <div className="adminActionCard adminTransactionsCard">
                  <h3>Recent Transactions</h3>
                  <div className="adminTransactions">
                    {transactions.slice(0, 30).map((tx) => (
                      <div key={tx.id || tx._id || `${tx.type}-${tx.createdAt}`}>
                        <span><strong>{tx.type || "transaction"}</strong><small>{tx.reason || tx.reference || tx.status}</small></span>
                        <b className={Number(tx.amount) < 0 ? "negative" : "positive"}>{Number(tx.amount) >= 0 ? "+" : ""}${money(tx.amount)}</b>
                        <time>{tx.createdAt ? new Date(tx.createdAt).toLocaleString() : ""}</time>
                      </div>
                    ))}
                    {!transactions.length && <div className="adminEmpty">No transactions yet.</div>}
                  </div>
                </div>
              </>
            )}
          </div>
        </section>
        <section className="adminSupportWorkspace">
          <div className="adminSupportListPanel">
            <div className="adminPanelTitle">
              <div>
                <h2>Support Conversations</h2>
                <p>AI-triaged conversations waiting for an agent.</p>
              </div>
              <button onClick={() => loadAdminData()} disabled={busy || supportBusy}>Refresh</button>
            </div>
            <div className="adminSupportList">
              {supportTickets.map((ticket) => (
                <button
                  type="button"
                  key={ticket.id}
                  className={`adminSupportRow ${selectedSupport?.id === ticket.id ? "selected" : ""}`}
                  onClick={() => openSupportTicket(ticket)}
                >
                  <span className={`adminSupportDot ${ticket.status || "waiting"}`}></span>
                  <span>
                    <strong>{ticket.fullName || ticket.email}</strong>
                    <small>{ticket.category} · {ticket.email}</small>
                    <em>{ticket.updatedAt ? new Date(ticket.updatedAt).toLocaleString() : ""}</em>
                  </span>
                  <b>{ticket.status || "waiting"}</b>
                </button>
              ))}
              {!supportTickets.length && !busy && <div className="adminEmpty">No support conversations yet.</div>}
            </div>
          </div>

          <div className="adminSupportDetailPanel">
            {!selectedSupport ? (
              <div className="adminEmpty adminSelectPrompt">Select a support conversation to reply.</div>
            ) : (
              <>
                <header className="adminSupportDetailHeader">
                  <div>
                    <h2>{selectedSupport.fullName || selectedSupport.email}</h2>
                    <p>{selectedSupport.email} · {selectedSupport.accountId || "No broker ID"}</p>
                    <small>{selectedSupport.category} · page {selectedSupport.page || "unknown"} · {selectedSupport.account || "unknown"} account</small>
                  </div>
                  <span className={`adminStatus ${selectedSupport.status || "waiting"}`}>{selectedSupport.status || "waiting"}</span>
                </header>

                <div className="adminSupportMessages">
                  {(selectedSupport.messages || []).map((item) => (
                    <div key={item.id || `${item.createdAt}-${item.sender}`} className={`adminSupportMessage ${item.sender || "user"}`}>
                      <strong>{item.sender === "agent" ? "Agent" : item.sender === "assistant" ? "AI Assistant" : "User"}</strong>
                      <p>{item.body}</p>
                      <time>{item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}</time>
                    </div>
                  ))}
                </div>

                <form className="adminSupportComposer" onSubmit={sendSupportReply}>
                  <textarea
                    value={supportReply}
                    onChange={(event) => setSupportReply(event.target.value)}
                    placeholder="Reply to the user…"
                    maxLength={1200}
                  />
                  <button className="adminPrimary" disabled={supportBusy || !supportReply.trim()}>{supportBusy ? "Sending…" : "Send reply"}</button>
                </form>

                <div className="adminSupportStatusActions">
                  <button onClick={() => setSupportTicketStatus("waiting")} disabled={supportBusy}>Waiting</button>
                  <button onClick={() => setSupportTicketStatus("agent-replied")} disabled={supportBusy}>Agent replied</button>
                  <button className="close" onClick={() => setSupportTicketStatus("closed")} disabled={supportBusy}>Close conversation</button>
                </div>

                <details className="adminSupportMetadata">
                  <summary>Technical details collected with consent</summary>
                  <pre>{JSON.stringify(selectedSupport.metadata || {}, null, 2)}</pre>
                </details>
              </>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function AdminStat({ title, value }) {
  return (
    <div className="adminStat">
      <span>{title}</span>
      <strong>{value}</strong>
    </div>
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
