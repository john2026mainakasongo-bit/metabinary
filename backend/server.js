import crypto from "node:crypto";
import { createRequire } from "node:module";

import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { MongoClient, ObjectId } from "mongodb";

const require = createRequire(import.meta.url);
const IntaSend = require("intasend-node");

dotenv.config();

const PORT = Number(process.env.PORT || 5000);
const USD_RATE = Number(process.env.USD_RATE || 130);
const MIN_DEPOSIT_USD = Number(process.env.MIN_DEPOSIT_USD || 1);
const MIN_WITHDRAW_USD = Number(process.env.MIN_WITHDRAW_USD || 5);
const MAX_WITHDRAW_USD = Number(process.env.MAX_WITHDRAW_USD || 150000);
const REFERRAL_COMMISSION_PERCENT = Math.max(
  0,
  Math.min(100, Number(process.env.REFERRAL_COMMISSION_PERCENT || 5))
);
const BACKEND_BUILD = "metabinary-thin-rings-selector-referral-tickfix-2026-07-12";
const TRADE_TICK_MS = Number(process.env.TRADE_TICK_MS || 1000);
const BOT_TRADE_TICK_MS = Number(process.env.BOT_TRADE_TICK_MS || 650);
const TEST_MODE = String(process.env.INTASEND_TEST_MODE || "true").toLowerCase() === "true";
const MONGODB_DB = String(process.env.MONGODB_DB || "metabinary").trim();
const MONGODB_URI = String(process.env.MONGODB_URI || "").trim();
const TOKEN_SECRET = String(process.env.JWT_SECRET || process.env.ADMIN_SECRET || "").trim();
const ADMIN_EMAIL = cleanEmail(process.env.ADMIN_EMAIL || "");
const ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD || "");
const FRONTEND_URLS = String(process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map((value) => value.trim().replace(/\/$/, ""))
  .filter(Boolean);
const PUBLIC_KEY = String(process.env.INTASEND_PUBLIC_KEY || "").trim();
const SECRET_KEY = String(process.env.INTASEND_SECRET_KEY || "").trim();
const TWELVE_DATA_API_KEY = String(
  process.env.TWELVE_DATA_API_KEY || process.env.VITE_TWELVE_DATA_API_KEY || ""
).trim();

const PASSWORD_ITERATIONS = 120000;
const PASSWORD_KEY_LENGTH = 32;
const PASSWORD_DIGEST = "sha256";
const PAID_STATUSES = new Set(["COMPLETE", "COMPLETED", "PAID", "SUCCESS", "SUCCESSFUL"]);
const FAILED_STATUSES = new Set(["FAILED", "FAILURE", "CANCELLED", "CANCELED", "REVERSED", "EXPIRED"]);

const FOREX_MARKETS = {
  "XAU/USD": {
    label: "Gold",
    apiSymbol: "XAU/USD",
    decimals: 2,
    spread: 0.2,
    contractSize: 100,
    alwaysOpen: false,
  },
  "BTC/USD": {
    label: "Bitcoin",
    apiSymbol: "BTC/USD",
    decimals: 2,
    spread: 10,
    contractSize: 1,
    alwaysOpen: true,
  },
  "EUR/USD": {
    label: "Euro / US Dollar",
    apiSymbol: "EUR/USD",
    decimals: 5,
    spread: 0.00012,
    contractSize: 100000,
    alwaysOpen: false,
  },
  "GBP/USD": {
    label: "British Pound / US Dollar",
    apiSymbol: "GBP/USD",
    decimals: 5,
    spread: 0.00015,
    contractSize: 100000,
    alwaysOpen: false,
  },
  "USD/JPY": {
    label: "US Dollar / Japanese Yen",
    apiSymbol: "USD/JPY",
    decimals: 3,
    spread: 0.015,
    contractSize: 100000,
    alwaysOpen: false,
  },
};

const marketQuoteCache = new Map();

const app = express();
app.disable("x-powered-by");
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || FRONTEND_URLS.includes(origin)) return callback(null, true);
      return callback(new Error("Origin is not allowed by CORS."));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));

let mongoClientPromise;

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
}

function createAccountId() {
  return `MB${Date.now().toString().slice(-8)}${Math.floor(100 + Math.random() * 900)}`;
}

function createReferralCode(user = {}) {
  const base = cleanText(user.fullName || user.name || cleanEmail(user.email).split("@")[0], 40)
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 8)
    .toUpperCase() || "TRADER";
  const suffix = String(user.accountId || user.brokerId || crypto.randomBytes(3).toString("hex"))
    .replace(/[^a-z0-9]/gi, "")
    .slice(-6)
    .toUpperCase();
  return `MB-${base}-${suffix}`;
}

function roundMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

function cleanEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function cleanText(value, max = 180) {
  return String(value || "").trim().slice(0, max);
}

function normalizeKenyanPhone(value) {
  let phone = String(value || "").replace(/\D/g, "");
  if (phone.startsWith("0") && phone.length === 10) phone = `254${phone.slice(1)}`;
  else if ((phone.startsWith("7") || phone.startsWith("1")) && phone.length === 9) phone = `254${phone}`;
  else if (phone.startsWith("00254")) phone = phone.slice(2);

  if (!/^254[17]\d{8}$/.test(phone)) {
    throw httpError(400, "Enter a valid Kenyan phone number, for example 07XXXXXXXX.");
  }
  return phone;
}

function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function getDb() {
  if (!MONGODB_URI) throw httpError(503, "MONGODB_URI is not configured on the backend.");
  if (!mongoClientPromise) {
    const client = new MongoClient(MONGODB_URI, {
      maxPoolSize: 10,
      family: 4,
      connectTimeoutMS: 20000,
      serverSelectionTimeoutMS: 45000,
    });
    mongoClientPromise = client.connect();
  }
  const client = await mongoClientPromise;
  return client.db(MONGODB_DB);
}

async function ensurePartialRequestIndex(collection, indexName) {
  const indexes = await collection.indexes();
  const legacyIndex = indexes.find((index) => index.name === "email_1_requestId_1");

  if (legacyIndex) {
    await collection.dropIndex(legacyIndex.name);
  }

  await collection.createIndex(
    { email: 1, requestId: 1 },
    {
      name: indexName,
      unique: true,
      partialFilterExpression: {
        requestId: { $type: "string" },
      },
    }
  );
}

async function ensureIndexes() {
  const db = await getDb();
  const deposits = db.collection("deposits");
  const withdrawals = db.collection("withdrawals");

  await Promise.all([
    db.collection("users").createIndex({ email: 1 }, { unique: true }),
    db.collection("users").createIndex({ accountId: 1 }, { unique: true, sparse: true }),
    db.collection("users").createIndex({ referralCode: 1 }, { unique: true, sparse: true }),
    deposits.createIndex({ id: 1 }, { unique: true }),
    deposits.createIndex({ invoiceId: 1 }, { sparse: true }),
    deposits.createIndex({ apiRef: 1 }, { sparse: true }),
    withdrawals.createIndex({ id: 1 }, { unique: true }),
    db.collection("processedInvoices").createIndex({ invoiceKey: 1 }, { unique: true }),
    db.collection("transactions").createIndex({ email: 1, createdAt: -1 }),
    db.collection("trades").createIndex({ id: 1 }, { unique: true }),
    db.collection("trades").createIndex({ email: 1, createdAt: -1 }),
    db.collection("forexPositions").createIndex({ id: 1 }, { unique: true }),
    db.collection("forexPositions").createIndex({ email: 1, status: 1, createdAt: -1 }),
    db.collection("adminAudit").createIndex({ createdAt: -1 }),
  ]);

  await ensurePartialRequestIndex(deposits, "uniq_deposit_email_requestId");
  await ensurePartialRequestIndex(withdrawals, "uniq_withdrawal_email_requestId");
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(String(password), salt, PASSWORD_ITERATIONS, PASSWORD_KEY_LENGTH, PASSWORD_DIGEST)
    .toString("hex");
  return `${PASSWORD_ITERATIONS}:${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [savedIterations, salt, savedHash] = String(stored || "").split(":");
  if (!savedIterations || !salt || !savedHash) return false;
  const calculated = crypto
    .pbkdf2Sync(String(password), salt, Number(savedIterations), PASSWORD_KEY_LENGTH, PASSWORD_DIGEST)
    .toString("hex");
  if (calculated.length !== savedHash.length) return false;
  return crypto.timingSafeEqual(Buffer.from(calculated, "hex"), Buffer.from(savedHash, "hex"));
}

function assertTokenSecret() {
  if (!TOKEN_SECRET || TOKEN_SECRET.length < 24) {
    throw httpError(503, "JWT_SECRET must be configured with at least 24 characters.");
  }
}

function signToken(payload, ttlSeconds) {
  assertTokenSecret();
  const body = Buffer.from(
    JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds })
  ).toString("base64url");
  const signature = crypto.createHmac("sha256", TOKEN_SECRET).update(body).digest("base64url");
  return `${body}.${signature}`;
}

function verifyToken(token) {
  assertTokenSecret();
  const [body, signature] = String(token || "").split(".");
  if (!body || !signature) throw httpError(401, "Authentication is required.");
  const expected = crypto.createHmac("sha256", TOKEN_SECRET).update(body).digest("base64url");
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) {
    throw httpError(401, "Authentication token is invalid.");
  }
  const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
    throw httpError(401, "Authentication token has expired. Login again.");
  }
  return payload;
}

function bearerToken(req) {
  const header = String(req.headers.authorization || "");
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

async function requireUser(req, _res, next) {
  try {
    const payload = verifyToken(bearerToken(req));
    if (payload.role !== "user") throw httpError(403, "A user account is required.");
    const db = await getDb();
    const user = await db.collection("users").findOne({ email: cleanEmail(payload.email) });
    if (!user) throw httpError(401, "Account no longer exists.");
    const status = String(user.status || "active").toLowerCase();
    if (status === "banned") throw httpError(403, "This account has been banned. Contact support.");
    if (status === "suspended") throw httpError(403, "This account is suspended. Contact support.");
    req.auth = payload;
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

function requireAdmin(req, _res, next) {
  try {
    const payload = verifyToken(bearerToken(req));
    if (payload.role !== "admin") throw httpError(403, "Administrator access is required.");
    req.admin = payload;
    next();
  } catch (error) {
    next(error);
  }
}

function publicUser(user) {
  const fullName = user.fullName || user.name || cleanEmail(user.email).split("@")[0];
  const accountId = user.accountId || user.brokerId || "";
  return {
    id: String(user._id || ""),
    accountId,
    brokerId: accountId,
    fullName,
    name: fullName,
    email: cleanEmail(user.email),
    phone: user.phone || "",
    country: user.country || "Kenya",
    documentType: user.documentType || "National ID",
    verified: Boolean(user.emailVerified ?? user.verified ?? false),
    emailVerified: Boolean(user.emailVerified ?? user.verified ?? false),
    demoBalance: roundMoney(user.demoBalance ?? 10000),
    realBalance: roundMoney(user.realBalance ?? 0),
    partnerBalance: roundMoney(user.partnerBalance ?? 0),
    referralCode: user.referralCode || "",
    referralCommissionRate: Number(user.referralCommissionRate ?? REFERRAL_COMMISSION_PERCENT),
    referralCount: Number(user.referralCount || 0),
    referredBy: user.referredByEmail || "",
    referralCodeUsed: user.referralCodeUsed || "",
    referralAppliedAt: user.referralAppliedAt || "",
    status: String(user.status || "active").toLowerCase(),
    role: user.role || "user",
    createdAt: user.createdAt || "",
    updatedAt: user.updatedAt || "",
    lastLoginAt: user.lastLoginAt || "",
  };
}

function normalizeTradeType(value) {
  const type = cleanText(value, 40);
  const allowed = new Set([
    "Even/Odd",
    "Matches/Differs",
    "Over/Under",
    "Rise/Fall",
    "Touch/No Touch",
  ]);
  if (!allowed.has(type)) throw httpError(400, "Choose a valid trade type.");
  return type;
}

function allowedTradeActions(type) {
  if (type === "Even/Odd") return ["Even", "Odd"];
  if (type === "Matches/Differs") return ["Matches", "Differs"];
  if (type === "Over/Under") return ["Over", "Under"];
  if (type === "Rise/Fall") return ["Rise", "Fall"];
  return ["Touch", "No Touch"];
}

function winningDigitCount(type, action, prediction) {
  const digit = Math.max(0, Math.min(9, Number(prediction || 0)));
  if (type === "Even/Odd" || type === "Rise/Fall") return 5;
  if (type === "Matches/Differs" || type === "Touch/No Touch") {
    return action === "Matches" || action === "Touch" ? 1 : 9;
  }
  if (type === "Over/Under") {
    return action === "Over" ? Math.max(0, 9 - digit) : Math.max(0, digit);
  }
  return 0;
}

function tradeMultiplier(type, action, prediction) {
  const winningDigits = winningDigitCount(type, action, prediction);
  if (winningDigits <= 0) return 0;
  return Number(Math.max(1.02, Math.min(8.3, (10 / winningDigits) * 0.91)).toFixed(3));
}

function tradeWins(type, action, prediction, resultDigit) {
  if (type === "Even/Odd") return action === "Even" ? resultDigit % 2 === 0 : resultDigit % 2 !== 0;
  if (type === "Matches/Differs") return action === "Matches" ? resultDigit === prediction : resultDigit !== prediction;
  if (type === "Over/Under") return action === "Over" ? resultDigit > prediction : resultDigit < prediction;
  if (type === "Touch/No Touch") return action === "Touch" ? resultDigit === prediction : resultDigit !== prediction;
  if (type === "Rise/Fall") return action === "Rise" ? resultDigit >= 5 : resultDigit < 5;
  return false;
}

function publicTrade(trade) {
  return {
    id: trade.id,
    email: trade.email,
    account: trade.account,
    type: trade.type,
    action: trade.action,
    stake: roundMoney(trade.stake),
    prediction: Number(trade.prediction),
    ticks: Number(trade.ticks),
    multiplier: Number(trade.multiplier),
    payout: roundMoney(trade.payout),
    entryPrice: Number(trade.entryPrice || 0),
    market: trade.market || "Volatility 100 (1s) Index",
    source: trade.source || "manual",
    strategy: trade.strategy || "",
    resultDigit: Number.isInteger(trade.resultDigit) ? trade.resultDigit : null,
    lastTickDigit: Number.isInteger(trade.lastTickDigit) ? trade.lastTickDigit : null,
    ticksConsumed: Math.max(0, Number(trade.ticksConsumed || 0)),
    remainingTicks: Math.max(0, Number(trade.ticks || 0) - Number(trade.ticksConsumed || 0)),
    tickMs: Math.max(1, Number(trade.tickMs || TRADE_TICK_MS)),
    won: typeof trade.won === "boolean" ? trade.won : null,
    profit: Number.isFinite(Number(trade.profit)) ? roundMoney(trade.profit) : null,
    status: trade.status,
    createdAt: trade.createdAt,
    settleAt: trade.settleAt,
    settledAt: trade.settledAt || "",
  };
}


async function finalizeTradeWithDigit(db, user, trade, requestedDigit) {
  if (!trade) throw httpError(404, "Trade was not found.");

  if (trade.status === "SETTLED") {
    const currentUser = await db.collection("users").findOne({ _id: user._id });
    const balanceField = trade.account === "real" ? "realBalance" : "demoBalance";
    return {
      trade,
      resultDigit: trade.resultDigit,
      won: trade.won,
      user: currentUser,
      balance: roundMoney(currentUser?.[balanceField]),
      alreadySettled: true,
    };
  }

  const resultDigit = Math.max(0, Math.min(9, Math.floor(Number(requestedDigit))));
  const won = tradeWins(trade.type, trade.action, Number(trade.prediction), resultDigit);
  const profit = won ? roundMoney(trade.payout - trade.stake) : -roundMoney(trade.stake);
  const settledAt = nowIso();

  const claimed = await db.collection("trades").findOneAndUpdate(
    { _id: trade._id, status: "RUNNING" },
    {
      $set: {
        status: "SETTLED",
        resultDigit,
        lastTickDigit: resultDigit,
        ticksConsumed: Math.max(Number(trade.ticks || 1), Number(trade.ticksConsumed || 0)),
        won,
        profit,
        settledAt,
        updatedAt: settledAt,
      },
    },
    { returnDocument: "after" }
  );

  if (!claimed) {
    const existing = await db.collection("trades").findOne({ _id: trade._id });
    return finalizeTradeWithDigit(db, user, existing, existing?.resultDigit ?? resultDigit);
  }

  const balanceField = claimed.account === "real" ? "realBalance" : "demoBalance";
  if (won) {
    await db.collection("users").updateOne(
      { _id: user._id },
      { $inc: { [balanceField]: roundMoney(claimed.payout) }, $set: { updatedAt: settledAt } }
    );
  }

  await db.collection("transactions").insertOne({
    id: makeId("tx"),
    email: user.email,
    type: won ? "trade-profit" : "trade-loss",
    method: claimed.source === "bot" ? "bot" : "manual",
    account: claimed.account,
    amount: profit,
    stake: roundMoney(claimed.stake),
    payout: roundMoney(claimed.payout),
    status: won ? "WON" : "LOST",
    reference: claimed.id,
    details: `${claimed.strategy ? `${claimed.strategy} · ` : ""}${claimed.market || "Volatility"} · ${claimed.type} · ${claimed.action} · digit ${resultDigit}`,
    createdAt: settledAt,
  });

  const updatedUser = await db.collection("users").findOne({ _id: user._id });
  const settledTrade = await db.collection("trades").findOne({ _id: claimed._id });

  return {
    trade: settledTrade,
    resultDigit,
    won,
    user: updatedUser,
    balance: roundMoney(updatedUser?.[balanceField]),
    alreadySettled: false,
  };
}

function normalizeMarketSymbol(value) {
  const symbol = cleanText(value, 20).toUpperCase();
  if (!FOREX_MARKETS[symbol]) throw httpError(400, "Choose a supported forex or crypto market.");
  return symbol;
}

function marketIsOpen(market, date = new Date()) {
  if (market.alwaysOpen) return true;
  const day = date.getUTCDay();
  const hour = date.getUTCHours();
  if (day === 6) return false;
  if (day === 5 && hour >= 22) return false;
  if (day === 0 && hour < 22) return false;
  return true;
}

async function fetchTrustedMarketQuote(symbol, options = {}) {
  const market = FOREX_MARKETS[symbol];
  if (!market) throw httpError(400, "Unsupported market.");

  const cached = marketQuoteCache.get(symbol);
  if (cached && Date.now() - cached.cachedAt < 8000) return cached;

  if (symbol === "BTC/USD") {
    const response = await fetch("https://api.coinbase.com/v2/prices/BTC-USD/spot", {
      headers: { Accept: "application/json", "User-Agent": "MetaBinary/2.0" },
      signal: AbortSignal.timeout(10000),
    });
    const data = await response.json();
    const price = Number(data?.data?.amount);
    if (!response.ok || !Number.isFinite(price) || price <= 0) {
      throw httpError(502, "Bitcoin live price is temporarily unavailable.");
    }
    const quote = {
      symbol,
      price,
      previousClose: price,
      open: price,
      high: price,
      low: price,
      change: 0,
      percentChange: 0,
      isMarketOpen: true,
      is_market_open: true,
      datetime: nowIso(),
      source: "coinbase",
      cachedAt: Date.now(),
    };
    marketQuoteCache.set(symbol, quote);
    return quote;
  }

  if (TWELVE_DATA_API_KEY) {
    const url = new URL("https://api.twelvedata.com/quote");
    url.searchParams.set("symbol", market.apiSymbol);
    url.searchParams.set("apikey", TWELVE_DATA_API_KEY);
    const response = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": "MetaBinary/2.0" },
      signal: AbortSignal.timeout(10000),
    });
    const data = await response.json();
    const price = Number(data?.close ?? data?.price);
    if (!response.ok || data?.status === "error" || data?.code || !Number.isFinite(price) || price <= 0) {
      throw httpError(502, data?.message || `${market.label} live price is temporarily unavailable.`);
    }
    const previousClose = Number(data?.previous_close ?? data?.open ?? price);
    const change = Number(data?.change ?? price - previousClose);
    const percentChange = Number(
      data?.percent_change ?? (previousClose ? ((price - previousClose) / previousClose) * 100 : 0)
    );
    const isOpen = typeof data?.is_market_open === "boolean"
      ? data.is_market_open
      : marketIsOpen(market);
    const quote = {
      symbol,
      price,
      previousClose,
      open: Number(data?.open || price),
      high: Number(data?.high || price),
      low: Number(data?.low || price),
      change: Number.isFinite(change) ? change : 0,
      percentChange: Number.isFinite(percentChange) ? percentChange : 0,
      isMarketOpen: isOpen,
      is_market_open: isOpen,
      datetime: data?.datetime || nowIso(),
      source: "twelve-data",
      cachedAt: Date.now(),
    };
    marketQuoteCache.set(symbol, quote);
    return quote;
  }

  const fallback = Number(options.clientPrice || 0);
  if (options.allowClientFallback && Number.isFinite(fallback) && fallback > 0) {
    return {
      symbol,
      price: fallback,
      previousClose: fallback,
      open: fallback,
      high: fallback,
      low: fallback,
      change: 0,
      percentChange: 0,
      isMarketOpen: marketIsOpen(market),
      is_market_open: marketIsOpen(market),
      datetime: nowIso(),
      source: "demo-client-quote",
      cachedAt: Date.now(),
    };
  }

  throw httpError(
    503,
    `${market.label} live server pricing requires TWELVE_DATA_API_KEY on the backend.`
  );
}

function publicForexPosition(position) {
  return {
    id: position.id,
    account: position.account,
    instrument: position.instrument,
    marketLabel: position.marketLabel,
    side: position.side,
    volume: Number(position.volume),
    leverage: position.leverage,
    leverageValue: Number(position.leverageValue),
    margin: roundMoney(position.margin),
    contractSize: Number(position.contractSize),
    openPrice: Number(position.openPrice),
    currentPrice: Number(position.currentPrice ?? position.openPrice),
    stopLoss: Number(position.stopLoss),
    takeProfit: Number(position.takeProfit),
    pl: roundMoney(position.pl || 0),
    plPercent: Number(position.plPercent || 0),
    status: position.status,
    openedAt: position.openedAt || position.createdAt,
    createdAt: position.createdAt,
    closedAt: position.closedAt || "",
  };
}

function ensurePaymentKeys() {
  if (!PUBLIC_KEY || !SECRET_KEY) {
    throw httpError(503, "IntaSend keys are not configured on the backend.");
  }
}

function intasendClient() {
  ensurePaymentKeys();
  return new IntaSend(PUBLIC_KEY, SECRET_KEY, TEST_MODE);
}

function providerErrorMessage(error) {
  if (!error) return "Payment provider request failed.";
  let raw;
  if (Buffer.isBuffer(error)) raw = error.toString("utf8");
  else if (typeof error === "string") raw = error;
  else if (error?.message) raw = error.message;
  else {
    try {
      raw = JSON.stringify(error);
    } catch {
      raw = String(error);
    }
  }

  try {
    const parsed = JSON.parse(raw);
    const nested = parsed?.errors?.[0]?.detail || parsed?.errors?.[0]?.message;
    return parsed.message || parsed.detail || parsed.error || nested || raw;
  } catch {
    return String(raw).slice(0, 500);
  }
}

function pickFirst(...values) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== "");
}

function extractInvoiceId(payload = {}) {
  return String(
    pickFirst(
      payload.invoice_id,
      payload.invoiceId,
      payload.invoice?.invoice_id,
      payload.invoice?.id,
      payload.data?.invoice_id,
      payload.data?.invoice?.invoice_id,
      payload.result?.invoice_id,
      payload.id
    ) || ""
  );
}

function extractApiRef(payload = {}) {
  return String(
    pickFirst(
      payload.api_ref,
      payload.apiRef,
      payload.invoice?.api_ref,
      payload.data?.api_ref,
      payload.data?.invoice?.api_ref
    ) || ""
  );
}

function extractCheckoutUrl(payload = {}) {
  return String(
    pickFirst(
      payload.url,
      payload.checkout_url,
      payload.checkoutUrl,
      payload.payment_url,
      payload.data?.url,
      payload.data?.checkout_url,
      payload.invoice?.url
    ) || ""
  );
}

function extractTrackingId(payload = {}) {
  return String(
    pickFirst(
      payload.tracking_id,
      payload.trackingId,
      payload.id,
      payload.data?.tracking_id,
      payload.transactions?.[0]?.tracking_id,
      payload.data?.transactions?.[0]?.tracking_id
    ) || ""
  );
}

function normalizeStatus(payload = {}) {
  const raw = pickFirst(
    payload.state,
    payload.status,
    payload.invoice?.state,
    payload.invoice?.status,
    payload.data?.state,
    payload.data?.status,
    payload.data?.invoice?.state,
    payload.data?.invoice?.status,
    payload.transactions?.[0]?.status,
    payload.data?.transactions?.[0]?.status
  );
  return String(raw || "PENDING").trim().toUpperCase().replace(/\s+/g, "_");
}

async function findDepositByProviderReference(db, invoiceId, apiRef) {
  const clauses = [];
  if (invoiceId) clauses.push({ invoiceId });
  if (apiRef) clauses.push({ apiRef });
  return clauses.length ? db.collection("deposits").findOne({ $or: clauses }) : null;
}

async function creditDepositOnce(db, deposit, verifiedStatus) {
  if (!deposit || deposit.credited || !PAID_STATUSES.has(verifiedStatus)) return deposit;
  const invoiceKey = deposit.invoiceId || deposit.id;

  try {
    await db.collection("processedInvoices").insertOne({
      invoiceKey,
      depositId: deposit.id,
      processedAt: nowIso(),
    });
  } catch (error) {
    if (error?.code === 11000) {
      await db.collection("deposits").updateOne(
        { id: deposit.id },
        { $set: { credited: true, status: "COMPLETED", updatedAt: nowIso() } }
      );
      return db.collection("deposits").findOne({ id: deposit.id });
    }
    throw error;
  }

  const completedAt = nowIso();
  await db.collection("users").updateOne(
    { email: deposit.email },
    { $inc: { realBalance: Number(deposit.amountUsd) }, $set: { updatedAt: completedAt } }
  );

  const depositor = await db.collection("users").findOne({ email: deposit.email });
  let referralCommissionAmount = 0;
  let referralCommissionRate = 0;
  let referralPartnerEmail = "";

  if (depositor?.referredByEmail && depositor.referredByEmail !== deposit.email) {
    const partner = await db.collection("users").findOne({ email: depositor.referredByEmail });
    if (partner) {
      referralCommissionRate = Math.max(
        0,
        Math.min(100, Number(partner.referralCommissionRate ?? REFERRAL_COMMISSION_PERCENT))
      );
      referralCommissionAmount = roundMoney(
        Number(deposit.amountUsd) * (referralCommissionRate / 100)
      );
      referralPartnerEmail = partner.email;

      if (referralCommissionAmount > 0) {
        await db.collection("users").updateOne(
          { _id: partner._id },
          {
            $inc: { partnerBalance: referralCommissionAmount },
            $set: { updatedAt: completedAt },
          }
        );
        await db.collection("transactions").insertOne({
          id: makeId("tx"),
          email: partner.email,
          type: "referral-commission",
          method: "Referral",
          amount: referralCommissionAmount,
          status: "COMPLETED",
          reference: deposit.invoiceId || deposit.apiRef || deposit.id,
          details: `${referralCommissionRate}% commission from ${deposit.email}`,
          createdAt: completedAt,
        });
      }
    }
  }

  await db.collection("deposits").updateOne(
    { id: deposit.id },
    {
      $set: {
        credited: true,
        status: "COMPLETED",
        completedAt,
        referralCommissionAmount,
        referralCommissionRate,
        referralPartnerEmail,
        updatedAt: completedAt,
      },
    }
  );
  await db.collection("transactions").insertOne({
    id: makeId("tx"),
    email: deposit.email,
    type: "deposit",
    method: deposit.method,
    amount: Number(deposit.amountUsd),
    amountKes: Number(deposit.amountKes),
    status: "COMPLETED",
    reference: deposit.invoiceId || deposit.apiRef || deposit.id,
    createdAt: completedAt,
  });
  return db.collection("deposits").findOne({ id: deposit.id });
}

async function reconcileDeposit(db, deposit) {
  if (!deposit?.invoiceId || deposit.credited || FAILED_STATUSES.has(deposit.status)) return deposit;
  try {
    const providerResponse = await intasendClient().collection().status(deposit.invoiceId);
    const status = normalizeStatus(providerResponse);
    await db.collection("deposits").updateOne(
      { id: deposit.id },
      { $set: { providerStatusResponse: providerResponse, status, updatedAt: nowIso() } }
    );
    const updated = { ...deposit, providerStatusResponse: providerResponse, status };
    return PAID_STATUSES.has(status) ? creditDepositOnce(db, updated, status) : updated;
  } catch (error) {
    await db.collection("deposits").updateOne(
      { id: deposit.id },
      { $set: { lastStatusError: providerErrorMessage(error), updatedAt: nowIso() } }
    );
    return db.collection("deposits").findOne({ id: deposit.id });
  }
}

async function responseForDeposit(db, deposit) {
  const user = await db.collection("users").findOne({ email: deposit.email });
  return {
    ok: true,
    depositId: deposit.id,
    invoiceId: deposit.invoiceId,
    status: deposit.status,
    method: deposit.method,
    phone: deposit.phone,
    amountUsd: deposit.amountUsd,
    amountKes: deposit.amountKes,
    realBalance: roundMoney(user?.realBalance),
    credited: Boolean(deposit.credited),
    message:
      deposit.status === "COMPLETED"
        ? "Deposit completed successfully."
        : FAILED_STATUSES.has(deposit.status)
          ? `Deposit ${String(deposit.status).toLowerCase()}.`
          : "Payment is still pending.",
  };
}

async function auditAdmin(db, req, action, target, details = {}) {
  await db.collection("adminAudit").insertOne({
    id: makeId("audit"),
    adminEmail: req.admin?.email || ADMIN_EMAIL,
    action,
    target,
    details,
    ip: req.ip,
    createdAt: nowIso(),
  });
}

app.get("/", async (_req, res, next) => {
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    res.json({
      ok: true,
      service: "MetaBinary MongoDB payments and account backend",
      mode: TEST_MODE ? "sandbox" : "live",
      database: MONGODB_DB,
      time: nowIso(),
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/health", async (_req, res) => {
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    res.json({
      ok: true,
      build: BACKEND_BUILD,
      mode: TEST_MODE ? "sandbox" : "live",
      mongo: "connected",
      database: MONGODB_DB,
      referralCommissionPercent: REFERRAL_COMMISSION_PERCENT,
      tradeTickMs: TRADE_TICK_MS,
    });
  } catch (error) {
    res.status(503).json({ ok: false, mode: TEST_MODE ? "sandbox" : "live", mongo: "disconnected", message: error.message });
  }
});

app.post("/api/auth/register", async (req, res, next) => {
  try {
    const body = req.body || {};
    const fullName = cleanText(body.fullName || `${body.firstName || ""} ${body.lastName || ""}`, 120);
    const email = cleanEmail(body.email);
    const rawPhone = cleanText(body.phone, 30);
    const phone = rawPhone ? normalizeKenyanPhone(rawPhone) : "";
    const password = String(body.password || "");
    const country = cleanText(body.country || "Kenya", 80);
    const documentType = cleanText(body.documentType || "National ID", 80);
    const suppliedReferralCode = cleanText(body.referralCode || "", 80).toUpperCase();

    if (!fullName || !email || !email.includes("@") || !phone || !password) {
      throw httpError(400, "Fill in your name, email, phone number and password.");
    }
    if (password.length < 6) throw httpError(400, "Password must be at least 6 characters.");

    const db = await getDb();
    const referrer = suppliedReferralCode
      ? await db.collection("users").findOne({ referralCode: suppliedReferralCode })
      : null;
    if (suppliedReferralCode && !referrer) {
      throw httpError(400, "The referral code is not valid.");
    }

    const clauses = [{ email }];
    if (phone) clauses.push({ phone });
    const existing = await db.collection("users").findOne({ $or: clauses });
    if (existing) {
      throw httpError(409, existing.email === email ? "This email already has an account. Login instead." : "This phone number already has an account.");
    }

    const createdAt = nowIso();
    const accountId = createAccountId();
    const user = {
      accountId,
      brokerId: accountId,
      fullName,
      name: fullName,
      email,
      phone,
      country,
      documentType,
      passwordHash: hashPassword(password),
      demoBalance: 10000,
      realBalance: 0,
      partnerBalance: 0,
      referralCode: "",
      referralCommissionRate: REFERRAL_COMMISSION_PERCENT,
      referralCount: 0,
      referredByEmail: referrer?.email || "",
      referralCodeUsed: referrer?.referralCode || "",
      emailVerified: false,
      verified: false,
      status: "active",
      role: "user",
      createdAt,
      updatedAt: createdAt,
    };
    await db.collection("users").insertOne(user);
    if (referrer?.email) {
      await db.collection("users").updateOne(
        { email: referrer.email },
        { $inc: { referralCount: 1 }, $set: { updatedAt: createdAt } }
      );
    }
    await db.collection("transactions").insertOne({
      id: makeId("tx"),
      email,
      type: "account-created",
      status: "COMPLETED",
      amount: 0,
      createdAt,
    });

    const token = signToken({ role: "user", email }, 60 * 60 * 24 * 7);
    res.status(201).json({ ok: true, token, user: publicUser(user), message: `Account ${accountId} created successfully.` });
  } catch (error) {
    if (error?.code === 11000) error = httpError(409, "This email or phone number already has an account.");
    next(error);
  }
});

app.post("/api/auth/login", async (req, res, next) => {
  try {
    const email = cleanEmail(req.body?.email);
    const password = String(req.body?.password || "");
    if (!email || !password) throw httpError(400, "Enter your email and password.");

    const db = await getDb();
    const user = await db.collection("users").findOne({ email });
    if (!user || !verifyPassword(password, user.passwordHash)) {
      throw httpError(401, "Email or password is not correct.");
    }
    const status = String(user.status || "active").toLowerCase();
    if (status === "banned") throw httpError(403, "This account has been banned. Contact support.");
    if (status === "suspended") throw httpError(403, "This account is suspended. Contact support.");

    const lastLoginAt = nowIso();
    await db.collection("users").updateOne({ _id: user._id }, { $set: { lastLoginAt, updatedAt: lastLoginAt } });
    const token = signToken({ role: "user", email }, 60 * 60 * 24 * 7);
    res.json({ ok: true, token, user: publicUser({ ...user, lastLoginAt }), message: `Logged in as ${user.accountId || user.brokerId || email}.` });
  } catch (error) {
    next(error);
  }
});

app.get("/api/auth/me", requireUser, (req, res) => {
  res.json({ ok: true, user: publicUser(req.user) });
});

app.post("/api/referrals/apply", requireUser, async (req, res, next) => {
  try {
    const db = await getDb();
    let code = req.user.referralCode || createReferralCode(req.user);

    if (!req.user.referralCode) {
      let suffix = 0;
      while (await db.collection("users").findOne({ referralCode: code })) {
        suffix += 1;
        code = `${createReferralCode(req.user)}-${suffix}`.slice(0, 80);
      }
    }

    const appliedAt = req.user.referralAppliedAt || nowIso();
    await db.collection("users").updateOne(
      { _id: req.user._id },
      {
        $set: {
          referralCode: code,
          referralCommissionRate: REFERRAL_COMMISSION_PERCENT,
          referralAppliedAt: appliedAt,
          updatedAt: nowIso(),
        },
      }
    );

    const updatedUser = await db.collection("users").findOne({ _id: req.user._id });
    const origin = FRONTEND_URLS[0] || "https://metabinary.com";
    res.json({
      ok: true,
      referral: {
        code,
        link: `${origin}/ref/${code}`,
        commissionRate: Number(updatedUser.referralCommissionRate ?? REFERRAL_COMMISSION_PERCENT),
        totalEarned: roundMoney(updatedUser.partnerBalance || 0),
        totalReferrals: Number(updatedUser.referralCount || 0),
        appliedAt,
      },
      user: publicUser(updatedUser),
      message: `Referral account active at ${REFERRAL_COMMISSION_PERCENT}% commission.`,
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/user/:email", requireUser, async (req, res, next) => {
  try {
    const requested = cleanEmail(req.params.email);
    if (requested !== cleanEmail(req.user.email)) throw httpError(403, "You cannot view another account.");
    res.json({ ok: true, ...publicUser(req.user) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/deposit", requireUser, async (req, res, next) => {
  try {
    const db = await getDb();
    const user = req.user;
    const email = cleanEmail(user.email);
    const name = cleanText(user.fullName || user.name || req.body.name || "MetaBinary User", 120);
    const method = String(req.body.method || "mpesa").trim().toLowerCase();
    const amountUsd = Number(req.body.amountUsd);
    const requestId = cleanText(req.body.requestId || makeId("client"), 120);

    if (!Number.isFinite(amountUsd) || amountUsd < MIN_DEPOSIT_USD) {
      throw httpError(400, `Minimum deposit is ${MIN_DEPOSIT_USD} USD.`);
    }

    const existing = await db.collection("deposits").findOne({ email, requestId });
    if (existing) return res.json(await responseForDeposit(db, existing));

    const amountKes = Math.max(1, Math.round(amountUsd * USD_RATE));
    const depositId = makeId("dep");
    const apiRef = `MB-${depositId}`.slice(0, 64);

    if (method === "card") {
      const providerResponse = await intasendClient().collection().charge({
        first_name: String(name.split(/\s+/)[0] || "MetaBinary"),
        last_name: String(name.split(/\s+/).slice(1).join(" ") || "User"),
        email,
        host: FRONTEND_URLS[0] || "http://localhost:5173",
        amount: roundMoney(amountUsd),
        currency: "USD",
        api_ref: apiRef,
      });
      const deposit = {
        id: depositId,
        requestId,
        apiRef,
        invoiceId: extractInvoiceId(providerResponse),
        email,
        method: "card",
        phone: "",
        amountUsd: roundMoney(amountUsd),
        amountKes,
        status: normalizeStatus(providerResponse),
        credited: false,
        providerResponse,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      await db.collection("deposits").insertOne(deposit);
      return res.status(201).json({
        ok: true,
        depositId,
        invoiceId: deposit.invoiceId,
        checkoutUrl: extractCheckoutUrl(providerResponse),
        status: deposit.status,
        message: "Continue to the secure card checkout.",
      });
    }

    if (method !== "mpesa") throw httpError(400, "Choose M-Pesa or card deposit.");
    const phone = normalizeKenyanPhone(req.body.phone || user.phone);
    const payload = { phone_number: phone, name, email, amount: amountKes, api_ref: apiRef };
    if (process.env.INTASEND_CALLBACK_URL) payload.callback_url = process.env.INTASEND_CALLBACK_URL;

    const providerResponse = await intasendClient().collection().mpesaStkPush(payload);
    const deposit = {
      id: depositId,
      requestId,
      apiRef,
      invoiceId: extractInvoiceId(providerResponse),
      email,
      method: "mpesa",
      phone,
      amountUsd: roundMoney(amountUsd),
      amountKes,
      status: normalizeStatus(providerResponse),
      credited: false,
      providerResponse,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    await db.collection("deposits").insertOne(deposit);

    res.status(201).json({
      ok: true,
      depositId,
      invoiceId: deposit.invoiceId,
      status: deposit.status,
      amountUsd: deposit.amountUsd,
      amountKes,
      message: "M-Pesa request sent. Complete it on your phone.",
    });
  } catch (error) {
    if (!error.status) error.status = 502;
    error.message = providerErrorMessage(error);
    next(error);
  }
});

app.get("/api/deposit/:depositId/status", requireUser, async (req, res, next) => {
  try {
    const db = await getDb();
    let deposit = await db.collection("deposits").findOne({ id: req.params.depositId, email: req.user.email });
    if (!deposit) throw httpError(404, "Deposit was not found.");
    deposit = await reconcileDeposit(db, deposit);
    res.json(await responseForDeposit(db, deposit));
  } catch (error) {
    next(error);
  }
});

async function paymentCallback(req, res, next) {
  try {
    const db = await getDb();
    const invoiceId = extractInvoiceId(req.body);
    const apiRef = extractApiRef(req.body);
    let deposit = await findDepositByProviderReference(db, invoiceId, apiRef);
    if (!deposit) return res.status(202).json({ ok: true, message: "Callback received; no matching local deposit yet." });
    if (invoiceId && !deposit.invoiceId) {
      await db.collection("deposits").updateOne({ id: deposit.id }, { $set: { invoiceId, updatedAt: nowIso() } });
      deposit = { ...deposit, invoiceId };
    }
    deposit = await reconcileDeposit(db, deposit);
    res.json(await responseForDeposit(db, deposit));
  } catch (error) {
    next(error);
  }
}

app.post("/api/payment/callback", paymentCallback);
app.post("/api/intasend/callback", paymentCallback);

app.post("/api/withdraw", requireUser, async (req, res, next) => {
  try {
    const db = await getDb();
    const email = cleanEmail(req.user.email);
    const name = cleanText(req.user.fullName || req.user.name || "MetaBinary User", 120);
    const amountUsd = Number(req.body.amountUsd);
    const requestId = cleanText(req.body.requestId || makeId("client"), 120);
    const phone = normalizeKenyanPhone(req.body.phone || req.user.phone);

    if (!Number.isFinite(amountUsd) || amountUsd < MIN_WITHDRAW_USD) {
      throw httpError(400, `Minimum withdrawal is ${MIN_WITHDRAW_USD} USD.`);
    }
    if (amountUsd > MAX_WITHDRAW_USD) throw httpError(400, `Maximum withdrawal is ${MAX_WITHDRAW_USD} USD.`);

    const existing = await db.collection("withdrawals").findOne({ email, requestId });
    if (existing) {
      const current = await db.collection("users").findOne({ email });
      return res.json({
        ok: existing.status !== "FAILED",
        withdrawalId: existing.id,
        status: existing.status,
        realBalance: roundMoney(current?.realBalance),
        message: existing.message || "Withdrawal already submitted.",
      });
    }

    ensurePaymentKeys();
    const updatedUser = await db.collection("users").findOneAndUpdate(
      { email, status: { $nin: ["banned", "suspended"] }, realBalance: { $gte: amountUsd } },
      { $inc: { realBalance: -amountUsd }, $set: { updatedAt: nowIso() } },
      { returnDocument: "after" }
    );
    const userAfterDebit = updatedUser?.value || updatedUser;
    if (!userAfterDebit) throw httpError(400, "Insufficient real-account balance.");

    const withdrawalId = makeId("wd");
    const amountKes = Math.max(1, Math.round(amountUsd * USD_RATE));
    const withdrawal = {
      id: withdrawalId,
      requestId,
      email,
      phone,
      amountUsd: roundMoney(amountUsd),
      amountKes,
      status: "SUBMITTING",
      refunded: false,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    await db.collection("withdrawals").insertOne(withdrawal);

    try {
      const providerResponse = await intasendClient().payouts().mpesa({
        currency: "KES",
        requires_approval: String(process.env.INTASEND_PAYOUT_REQUIRES_APPROVAL || "YES").toUpperCase(),
        transactions: [{ name, account: phone, amount: String(amountKes), narrative: `MetaBinary withdrawal ${withdrawalId}` }],
      });
      const providerStatus = normalizeStatus(providerResponse);
      const status = FAILED_STATUSES.has(providerStatus) ? "FAILED" : providerStatus === "PENDING" ? "PROCESSING" : providerStatus;
      const trackingId = extractTrackingId(providerResponse);
      let message = status === "FAILED" ? "The payout was rejected and the balance was restored." : "Withdrawal submitted to M-Pesa.";

      if (status === "FAILED") {
        await db.collection("users").updateOne({ email }, { $inc: { realBalance: amountUsd }, $set: { updatedAt: nowIso() } });
      }
      await db.collection("withdrawals").updateOne(
        { id: withdrawalId },
        { $set: { status, trackingId, providerResponse, refunded: status === "FAILED", message, updatedAt: nowIso() } }
      );
      await db.collection("transactions").insertOne({
        id: makeId("tx"),
        email,
        type: "withdrawal",
        method: "mpesa",
        amount: -amountUsd,
        amountKes: -amountKes,
        status,
        reference: trackingId || withdrawalId,
        createdAt: nowIso(),
      });
      const current = await db.collection("users").findOne({ email });
      return res.status(201).json({
        ok: status !== "FAILED",
        withdrawalId,
        trackingId,
        status,
        amountUsd,
        amountKes,
        realBalance: roundMoney(current?.realBalance),
        message,
      });
    } catch (providerError) {
      await db.collection("users").updateOne({ email }, { $inc: { realBalance: amountUsd }, $set: { updatedAt: nowIso() } });
      const message = providerErrorMessage(providerError);
      await db.collection("withdrawals").updateOne(
        { id: withdrawalId },
        { $set: { status: "FAILED", refunded: true, message, updatedAt: nowIso() } }
      );
      const restoredUser = await db.collection("users").findOne({ email });
      return res.status(502).json({ ok: false, status: "FAILED", realBalance: roundMoney(restoredUser?.realBalance), message });
    }
  } catch (error) {
    next(error);
  }
});

app.get("/api/markets/quote", async (req, res, next) => {
  try {
    const symbol = normalizeMarketSymbol(req.query.symbol);
    const quote = await fetchTrustedMarketQuote(symbol);
    res.set("Cache-Control", "public, max-age=5, stale-while-revalidate=10");
    res.json({ ok: true, quote });
  } catch (error) {
    next(error);
  }
});

app.get("/api/forex/positions", requireUser, async (req, res, next) => {
  try {
    const db = await getDb();
    const positions = await db.collection("forexPositions")
      .find({ email: req.user.email, status: "OPEN" })
      .sort({ createdAt: -1 })
      .limit(40)
      .toArray();
    res.json({ ok: true, positions: positions.map(publicForexPosition) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/forex/open", requireUser, async (req, res, next) => {
  try {
    const db = await getDb();
    const account = String(req.body?.account || "demo").toLowerCase() === "real" ? "real" : "demo";
    const instrument = normalizeMarketSymbol(req.body?.symbol);
    const market = FOREX_MARKETS[instrument];
    const side = cleanText(req.body?.side, 10);
    const volume = Number(req.body?.volume);
    const leverageText = cleanText(req.body?.leverage || "1:100", 20);
    const leverageValue = Number(leverageText.split(":")[1] || 100);
    const stopLoss = Number(req.body?.stopLoss);
    const takeProfit = Number(req.body?.takeProfit);
    const clientPrice = Number(req.body?.marketPrice || 0);

    if (!["Buy", "Sell"].includes(side)) throw httpError(400, "Choose Buy or Sell.");
    if (!Number.isFinite(volume) || volume < 0.01 || volume > 10) throw httpError(400, "Volume must be between 0.01 and 10 lots.");
    if (!Number.isFinite(leverageValue) || leverageValue < 10 || leverageValue > 1000) throw httpError(400, "Leverage must be between 1:10 and 1:1000.");

    const quote = await fetchTrustedMarketQuote(instrument, {
      allowClientFallback: account === "demo",
      clientPrice,
    });
    if (!quote.isMarketOpen) throw httpError(400, `${market.label} is currently closed.`);

    const halfSpread = Number(market.spread || 0) / 2;
    const openPrice = Number((side === "Buy" ? quote.price + halfSpread : quote.price - halfSpread).toFixed(market.decimals));
    if (!Number.isFinite(stopLoss) || !Number.isFinite(takeProfit) || stopLoss <= 0 || takeProfit <= 0) {
      throw httpError(400, "Enter valid Stop Loss and Take Profit prices.");
    }
    const protectionOk = side === "Buy"
      ? stopLoss < openPrice && takeProfit > openPrice
      : stopLoss > openPrice && takeProfit < openPrice;
    if (!protectionOk) throw httpError(400, "Stop Loss and Take Profit are on the wrong side of the market price.");

    const openPositions = await db.collection("forexPositions")
      .find({ email: req.user.email, account, status: "OPEN" })
      .toArray();
    if (openPositions.length >= 10) throw httpError(400, "Close an open position before placing another order.");

    const margin = roundMoney((openPrice * market.contractSize * volume) / leverageValue);
    const usedMargin = roundMoney(openPositions.reduce((sum, position) => sum + Number(position.margin || 0), 0));
    const balanceField = account === "real" ? "realBalance" : "demoBalance";
    const currentBalance = roundMoney(req.user[balanceField]);
    if (margin > currentBalance - usedMargin) {
      throw httpError(400, `Insufficient free margin. Required ${margin.toFixed(2)} USD.`);
    }

    const id = makeId("fx");
    const createdAt = nowIso();
    const position = {
      id,
      email: req.user.email,
      account,
      instrument,
      marketLabel: market.label,
      side,
      volume,
      leverage: leverageText,
      leverageValue,
      margin,
      contractSize: market.contractSize,
      openPrice,
      currentPrice: quote.price,
      stopLoss,
      takeProfit,
      pl: 0,
      plPercent: 0,
      status: "OPEN",
      openedAt: createdAt,
      createdAt,
      updatedAt: createdAt,
      quoteSource: quote.source,
    };
    await db.collection("forexPositions").insertOne(position);
    await db.collection("transactions").insertOne({
      id: makeId("tx"),
      email: req.user.email,
      type: "forex-open",
      method: "forex",
      account,
      amount: 0,
      status: "OPEN",
      reference: id,
      details: `${side} ${instrument} · ${volume} lot · margin ${margin.toFixed(2)} USD`,
      createdAt,
    });

    const currentUser = await db.collection("users").findOne({ _id: req.user._id });
    res.status(201).json({
      ok: true,
      position: publicForexPosition(position),
      user: publicUser(currentUser),
      message: `${side} position opened.`,
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/forex/:id/close", requireUser, async (req, res, next) => {
  try {
    const db = await getDb();
    const id = cleanText(req.params.id, 100);
    const position = await db.collection("forexPositions").findOne({ id, email: req.user.email });
    if (!position) throw httpError(404, "Forex position was not found.");

    if (position.status === "CLOSED") {
      const currentUser = await db.collection("users").findOne({ _id: req.user._id });
      return res.json({ ok: true, position: publicForexPosition(position), user: publicUser(currentUser), message: "Position already closed." });
    }

    const quote = await fetchTrustedMarketQuote(position.instrument, {
      allowClientFallback: position.account === "demo",
      clientPrice: Number(req.body?.marketPrice || 0),
    });
    const closePrice = Number(quote.price.toFixed(FOREX_MARKETS[position.instrument].decimals));
    const rawPl = position.side === "Buy"
      ? (closePrice - position.openPrice) * position.contractSize * position.volume
      : (position.openPrice - closePrice) * position.contractSize * position.volume;
    const balanceField = position.account === "real" ? "realBalance" : "demoBalance";
    const latestUser = await db.collection("users").findOne({ _id: req.user._id });
    const availableBalance = roundMoney(latestUser?.[balanceField]);
    const pl = roundMoney(Math.max(-availableBalance, rawPl));
    const closedAt = nowIso();

    const claimed = await db.collection("forexPositions").findOneAndUpdate(
      { _id: position._id, status: "OPEN" },
      { $set: { status: "CLOSED", currentPrice: closePrice, closePrice, pl, closedAt, updatedAt: closedAt, quoteSource: quote.source } },
      { returnDocument: "after" }
    );
    const closed = claimed?.value || claimed;
    if (!closed) throw httpError(409, "Position is already being closed.");

    if (pl !== 0) {
      if (pl > 0) {
        await db.collection("users").updateOne(
          { _id: req.user._id },
          { $inc: { [balanceField]: pl }, $set: { updatedAt: closedAt } }
        );
      } else {
        await db.collection("users").updateOne(
          { _id: req.user._id },
          [{ $set: { [balanceField]: { $max: [0, { $add: [`$${balanceField}`, pl] }] }, updatedAt: closedAt } }]
        );
      }
    }

    await db.collection("transactions").insertOne({
      id: makeId("tx"),
      email: req.user.email,
      type: "forex-close",
      method: "forex",
      account: position.account,
      amount: pl,
      status: "CLOSED",
      reference: position.id,
      details: `${position.side} ${position.instrument} · ${position.volume} lot`,
      createdAt: closedAt,
    });

    const updatedUser = await db.collection("users").findOne({ _id: req.user._id });
    res.json({
      ok: true,
      position: publicForexPosition(closed),
      user: publicUser(updatedUser),
      message: "Forex position closed.",
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/trades/open", requireUser, async (req, res, next) => {
  try {
    const db = await getDb();
    const account = String(req.body?.account || "demo").toLowerCase() === "real" ? "real" : "demo";
    const type = normalizeTradeType(req.body?.type);
    const action = cleanText(req.body?.action, 30);
    const prediction = Math.max(0, Math.min(9, Number(req.body?.prediction ?? 0)));
    const ticks = Math.min(10, Math.max(1, Math.floor(Number(req.body?.ticks || 5))));
    const stake = roundMoney(req.body?.stake);
    const entryPrice = Number(req.body?.entryPrice || 0);
    const market = cleanText(req.body?.market || "Volatility 100 (1s) Index", 100);
    const source = String(req.body?.source || "manual").toLowerCase() === "bot" ? "bot" : "manual";
    const strategy = cleanText(req.body?.strategy || "", 100);

    if (!allowedTradeActions(type).includes(action)) throw httpError(400, "Choose a valid trade action.");
    if (!Number.isFinite(stake) || stake < 0.3) throw httpError(400, "Minimum stake is 0.30 USD.");

    const multiplier = tradeMultiplier(type, action, prediction);
    if (!multiplier) throw httpError(400, "This contract has no possible winning digit. Choose another prediction.");

    const balanceField = account === "real" ? "realBalance" : "demoBalance";
    const debit = await db.collection("users").findOneAndUpdate(
      { _id: req.user._id, [balanceField]: { $gte: stake } },
      { $inc: { [balanceField]: -stake }, $set: { updatedAt: nowIso() } },
      { returnDocument: "after" }
    );

    if (!debit) throw httpError(400, `Your ${account} balance is too low for this trade.`);

    const id = makeId("trade");
    const createdAt = nowIso();
    const tradeTickMs = source === "bot" ? BOT_TRADE_TICK_MS : TRADE_TICK_MS;
    const settleAt = new Date(Date.now() + ticks * tradeTickMs).toISOString();
    const trade = {
      id,
      email: req.user.email,
      account,
      type,
      action,
      prediction,
      ticks,
      stake,
      multiplier,
      payout: roundMoney(stake * multiplier),
      entryPrice,
      market,
      source,
      strategy,
      status: "RUNNING",
      createdAt,
      settleAt,
      tickMs: tradeTickMs,
      ticksConsumed: 0,
      lastTickDigit: null,
      settledAt: "",
    };

    try {
      await db.collection("trades").insertOne(trade);
    } catch (error) {
      await db.collection("users").updateOne(
        { _id: req.user._id },
        { $inc: { [balanceField]: stake }, $set: { updatedAt: nowIso() } }
      );
      throw error;
    }

    res.status(201).json({
      ok: true,
      trade: publicTrade(trade),
      user: publicUser(debit),
      balance: roundMoney(debit[balanceField]),
      message: "Trade opened.",
    });
  } catch (error) {
    next(error);
  }
});

async function handleTradeTick(req, res, next) {
  try {
    const db = await getDb();
    const id = cleanText(req.params.id, 100);
    let trade = await db.collection("trades").findOne({ id, email: req.user.email });
    if (!trade) throw httpError(404, "Trade was not found.");

    if (trade.status === "SETTLED") {
      const final = await finalizeTradeWithDigit(db, req.user, trade, trade.resultDigit);
      return res.json({
        ok: true,
        settled: true,
        digit: final.resultDigit,
        resultDigit: final.resultDigit,
        won: final.won,
        remainingTicks: 0,
        trade: publicTrade(final.trade),
        user: publicUser(final.user),
        balance: final.balance,
        message: final.won ? "Trade won." : "Trade lost.",
      });
    }

    const totalTicks = Math.min(10, Math.max(1, Number(trade.ticks || 1)));
    const digit = crypto.randomInt(0, 10);
    const advanced = await db.collection("trades").findOneAndUpdate(
      {
        _id: trade._id,
        status: "RUNNING",
        $or: [
          { ticksConsumed: { $exists: false } },
          { ticksConsumed: { $lt: totalTicks } },
        ],
      },
      {
        $inc: { ticksConsumed: 1 },
        $set: { lastTickDigit: digit, updatedAt: nowIso() },
      },
      { returnDocument: "after" }
    );

    if (!advanced) {
      trade = await db.collection("trades").findOne({ _id: trade._id });
      if (trade?.status === "SETTLED") {
        const final = await finalizeTradeWithDigit(db, req.user, trade, trade.resultDigit);
        return res.json({
          ok: true,
          settled: true,
          digit: final.resultDigit,
          resultDigit: final.resultDigit,
          won: final.won,
          remainingTicks: 0,
          trade: publicTrade(final.trade),
          user: publicUser(final.user),
          balance: final.balance,
        });
      }
      throw httpError(409, "This tick has already been counted.");
    }

    const consumed = Math.max(0, Number(advanced.ticksConsumed || 0));
    const remainingTicks = Math.max(0, totalTicks - consumed);

    if (remainingTicks > 0) {
      return res.json({
        ok: true,
        settled: false,
        digit,
        remainingTicks,
        totalTicks,
        trade: publicTrade(advanced),
        message: `${remainingTicks} tick${remainingTicks === 1 ? "" : "s"} remaining.`,
      });
    }

    const final = await finalizeTradeWithDigit(db, req.user, advanced, digit);
    return res.json({
      ok: true,
      settled: true,
      digit: final.resultDigit,
      resultDigit: final.resultDigit,
      won: final.won,
      remainingTicks: 0,
      totalTicks,
      trade: publicTrade(final.trade),
      user: publicUser(final.user),
      balance: final.balance,
      message: final.won ? "Trade won." : "Trade lost.",
    });
  } catch (error) {
    next(error);
  }
}

app.post("/api/trades/:id/tick", requireUser, handleTradeTick);
app.post("/api/trades/:id", requireUser, handleTradeTick);

app.post("/api/trades/:id/settle", requireUser, async (req, res, next) => {
  try {
    const db = await getDb();
    const id = cleanText(req.params.id, 100);
    const trade = await db.collection("trades").findOne({ id, email: req.user.email });
    if (!trade) throw httpError(404, "Trade was not found.");

    const forceTickSettlement = req.body?.forceTickSettlement === true;
    if (trade.status !== "SETTLED") {
      const remainingMs = new Date(trade.settleAt).getTime() - Date.now();
      if (remainingMs > 0 && !forceTickSettlement) {
        return res.status(409).json({
          ok: false,
          remainingMs,
          message: "Trade is still running.",
        });
      }
    }

    const resultDigit = Number.isInteger(trade.lastTickDigit)
      ? trade.lastTickDigit
      : Number.isInteger(trade.resultDigit)
      ? trade.resultDigit
      : crypto.randomInt(0, 10);
    const final = await finalizeTradeWithDigit(db, req.user, trade, resultDigit);

    return res.json({
      ok: true,
      trade: publicTrade(final.trade),
      resultDigit: final.resultDigit,
      digit: final.resultDigit,
      won: final.won,
      user: publicUser(final.user),
      balance: final.balance,
      message: final.won ? "Trade won." : "Trade lost.",
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/transactions/:email", requireUser, async (req, res, next) => {
  try {
    const email = cleanEmail(req.params.email);
    if (email !== req.user.email) throw httpError(403, "You cannot view another account's transactions.");
    const db = await getDb();
    const transactions = await db.collection("transactions").find({ email }).sort({ createdAt: -1 }).limit(250).toArray();
    res.json({ ok: true, transactions });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/login", async (req, res, next) => {
  try {
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) throw httpError(503, "ADMIN_EMAIL and ADMIN_PASSWORD are not configured.");
    const email = cleanEmail(req.body?.email);
    const password = String(req.body?.password || "");
    const emailOk = email === ADMIN_EMAIL;
    const passwordOk = password.length === ADMIN_PASSWORD.length && crypto.timingSafeEqual(Buffer.from(password), Buffer.from(ADMIN_PASSWORD));
    if (!emailOk || !passwordOk) throw httpError(401, "Admin email or password is incorrect.");
    const token = signToken({ role: "admin", email: ADMIN_EMAIL }, 60 * 60 * 8);
    res.json({ ok: true, token, admin: { email: ADMIN_EMAIL }, message: "Admin login successful." });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/stats", requireAdmin, async (_req, res, next) => {
  try {
    const db = await getDb();
    const [totalUsers, activeUsers, bannedUsers, deposits, withdrawals] = await Promise.all([
      db.collection("users").countDocuments({}),
      db.collection("users").countDocuments({ status: { $nin: ["banned", "suspended"] } }),
      db.collection("users").countDocuments({ status: "banned" }),
      db.collection("deposits").aggregate([{ $match: { credited: true } }, { $group: { _id: null, total: { $sum: "$amountUsd" } } }]).toArray(),
      db.collection("withdrawals").aggregate([{ $match: { status: { $nin: ["FAILED", "CANCELLED"] } } }, { $group: { _id: null, total: { $sum: "$amountUsd" } } }]).toArray(),
    ]);
    res.json({
      ok: true,
      stats: {
        totalUsers,
        activeUsers,
        bannedUsers,
        totalDeposits: roundMoney(deposits[0]?.total),
        totalWithdrawals: roundMoney(withdrawals[0]?.total),
      },
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/users", requireAdmin, async (req, res, next) => {
  try {
    const db = await getDb();
    const search = cleanText(req.query.search, 100);
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(5, Number(req.query.limit || 50)));
    const query = search
      ? {
          $or: [
            { email: { $regex: search, $options: "i" } },
            { fullName: { $regex: search, $options: "i" } },
            { name: { $regex: search, $options: "i" } },
            { accountId: { $regex: search, $options: "i" } },
            { brokerId: { $regex: search, $options: "i" } },
            { phone: { $regex: search, $options: "i" } },
          ],
        }
      : {};
    const [items, total] = await Promise.all([
      db.collection("users").find(query).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).toArray(),
      db.collection("users").countDocuments(query),
    ]);
    res.json({ ok: true, users: items.map(publicUser), total, page, pages: Math.max(1, Math.ceil(total / limit)) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/users/:id", requireAdmin, async (req, res, next) => {
  try {
    const db = await getDb();
    const id = req.params.id;
    const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { $or: [{ email: cleanEmail(id) }, { accountId: id }, { brokerId: id }] };
    const user = await db.collection("users").findOne(query);
    if (!user) throw httpError(404, "User was not found.");
    const transactions = await db.collection("transactions").find({ email: user.email }).sort({ createdAt: -1 }).limit(100).toArray();
    res.json({ ok: true, user: publicUser(user), transactions });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/users/:id/adjust-balance", requireAdmin, async (req, res, next) => {
  try {
    const db = await getDb();
    const id = req.params.id;
    const account = String(req.body?.account || "real").toLowerCase() === "demo" ? "demo" : "real";
    const adjustment = Number(req.body?.adjustment);
    const reason = cleanText(req.body?.reason, 240);
    if (!Number.isFinite(adjustment) || adjustment === 0) throw httpError(400, "Enter a positive or negative adjustment amount.");
    if (!reason) throw httpError(400, "Enter a reason for this balance adjustment.");

    const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { $or: [{ email: cleanEmail(id) }, { accountId: id }, { brokerId: id }] };
    const user = await db.collection("users").findOne(query);
    if (!user) throw httpError(404, "User was not found.");
    const field = account === "demo" ? "demoBalance" : "realBalance";
    const oldBalance = roundMoney(user[field]);
    const newBalance = roundMoney(oldBalance + adjustment);
    if (newBalance < 0) throw httpError(400, "The adjustment would make the balance negative.");

    await db.collection("users").updateOne({ _id: user._id }, { $set: { [field]: newBalance, updatedAt: nowIso() } });
    const transaction = {
      id: makeId("tx"),
      email: user.email,
      type: "admin-balance-adjustment",
      account,
      amount: roundMoney(adjustment),
      oldBalance,
      balanceAfter: newBalance,
      status: "COMPLETED",
      reason,
      adminEmail: req.admin.email,
      createdAt: nowIso(),
    };
    await db.collection("transactions").insertOne(transaction);
    await auditAdmin(db, req, "adjust-balance", user.email, { account, adjustment, oldBalance, newBalance, reason });
    const updated = await db.collection("users").findOne({ _id: user._id });
    res.json({ ok: true, user: publicUser(updated), transaction, message: `${account === "demo" ? "Demo" : "Real"} balance updated.` });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/admin/users/:id/status", requireAdmin, async (req, res, next) => {
  try {
    const db = await getDb();
    const id = req.params.id;
    const status = String(req.body?.status || "").toLowerCase();
    const reason = cleanText(req.body?.reason, 240);
    if (!["active", "suspended", "banned"].includes(status)) throw httpError(400, "Choose active, suspended or banned.");
    if (status !== "active" && !reason) throw httpError(400, "Enter a reason for suspending or banning this account.");

    const query = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { $or: [{ email: cleanEmail(id) }, { accountId: id }, { brokerId: id }] };
    const user = await db.collection("users").findOne(query);
    if (!user) throw httpError(404, "User was not found.");
    await db.collection("users").updateOne(
      { _id: user._id },
      { $set: { status, statusReason: reason, statusChangedAt: nowIso(), statusChangedBy: req.admin.email, updatedAt: nowIso() } }
    );
    await auditAdmin(db, req, "change-status", user.email, { previousStatus: user.status || "active", status, reason });
    const updated = await db.collection("users").findOne({ _id: user._id });
    res.json({ ok: true, user: publicUser(updated), message: `Account is now ${status}.` });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/audit-log", requireAdmin, async (req, res, next) => {
  try {
    const db = await getDb();
    const limit = Math.min(250, Math.max(10, Number(req.query.limit || 100)));
    const audit = await db.collection("adminAudit").find({}).sort({ createdAt: -1 }).limit(limit).toArray();
    res.json({ ok: true, audit });
  } catch (error) {
    next(error);
  }
});

app.use((req, res) => {
  res.status(404).json({ ok: false, message: `Route not found: ${req.method} ${req.path}` });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  const status = Number(error.status || 500);
  res.status(status).json({ ok: false, message: providerErrorMessage(error) || "Unexpected server error." });
});

await ensureIndexes();
app.listen(PORT, () => {
  console.log(`MetaBinary backend running on port ${PORT} (${TEST_MODE ? "sandbox" : "live"}, MongoDB: ${MONGODB_DB})`);
});
