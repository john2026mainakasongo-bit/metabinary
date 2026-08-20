import crypto from "node:crypto";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { MongoClient, ObjectId } from "mongodb";

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
const BACKEND_BUILD = "metabinary-v381-bot-limit-hotfix-2026-08-20";
const TRADE_TICK_MS = Number(process.env.TRADE_TICK_MS || 1000);
const BOT_TRADE_TICK_MS = Number(process.env.BOT_TRADE_TICK_MS || 650);
const AI_TRADE_TICK_MS = Number(process.env.AI_TRADE_TICK_MS || 750);
const PESAPAL_ENV = ["live", "production"].includes(String(process.env.PESAPAL_ENV || "sandbox").trim().toLowerCase())
  ? "live"
  : "sandbox";
const TEST_MODE = PESAPAL_ENV !== "live";
const PESAPAL_BASE_URL = PESAPAL_ENV === "live"
  ? "https://pay.pesapal.com/v3"
  : "https://cybqa.pesapal.com/pesapalv3";
const PESAPAL_CONSUMER_KEY = String(process.env.PESAPAL_CONSUMER_KEY || "").trim();
const PESAPAL_CONSUMER_SECRET = String(process.env.PESAPAL_CONSUMER_SECRET || "").trim();
const PESAPAL_IPN_ID = String(process.env.PESAPAL_IPN_ID || "").trim();
const DARAJA_ENV = ["live", "production"].includes(
  String(process.env.DARAJA_ENV || "production").trim().toLowerCase()
)
  ? "production"
  : "sandbox";
const DARAJA_BASE_URL = String(
  process.env.DARAJA_BASE_URL ||
    (DARAJA_ENV === "production"
      ? "https://api.safaricom.co.ke"
      : "https://sandbox.safaricom.co.ke")
)
  .trim()
  .replace(/\/$/, "");
const DARAJA_CONSUMER_KEY = String(process.env.DARAJA_CONSUMER_KEY || "").trim();
const DARAJA_CONSUMER_SECRET = String(process.env.DARAJA_CONSUMER_SECRET || "").trim();
const DARAJA_PASSKEY = String(process.env.DARAJA_PASSKEY || "").trim();
const DARAJA_SHORTCODE = String(process.env.DARAJA_SHORTCODE || "").trim();
const DARAJA_TILL_NUMBER = String(process.env.DARAJA_TILL_NUMBER || "").trim();
const DARAJA_TRANSACTION_TYPE = String(
  process.env.DARAJA_TRANSACTION_TYPE || "CustomerBuyGoodsOnline"
).trim();
const MONGODB_DB = String(process.env.MONGODB_DB || "metabinary").trim();
const MONGODB_URI = String(process.env.MONGODB_URI || "").trim();
const TOKEN_SECRET = String(process.env.JWT_SECRET || process.env.ADMIN_SECRET || "").trim();
const ADMIN_EMAIL = cleanEmail(process.env.ADMIN_EMAIL || "");
const ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD || "");
const FRONTEND_URLS = String(process.env.FRONTEND_URL || "http://localhost:5173")
  .split(",")
  .map((value) => value.trim().replace(/\/$/, ""))
  .filter(Boolean);
const TWELVE_DATA_API_KEY = String(
  process.env.TWELVE_DATA_API_KEY || process.env.VITE_TWELVE_DATA_API_KEY || ""
).trim();
const PUBLIC_BACKEND_URL = String(process.env.PUBLIC_BACKEND_URL || "").trim().replace(/\/$/, "");
const DARAJA_CALLBACK_URL = String(
  process.env.DARAJA_CALLBACK_URL ||
    (PUBLIC_BACKEND_URL ? `${PUBLIC_BACKEND_URL}/api/mpesa/callback` : "")
).trim();
const FRONTEND_PUBLIC_URL = String(process.env.FRONTEND_PUBLIC_URL || FRONTEND_URLS[0] || "http://localhost:5173").trim().replace(/\/$/, "");
const RESEND_API_KEY = String(process.env.RESEND_API_KEY || "").trim();
const PASSWORD_RESET_FROM_EMAIL = String(process.env.PASSWORD_RESET_FROM_EMAIL || "MetaBinary <noreply@metabinaryfx.com>").trim();
const PASSWORD_RESET_TTL_MINUTES = Math.max(5, Math.min(60, Number(process.env.PASSWORD_RESET_TTL_MINUTES || 15)));
const MAX_REAL_STAKE_USD = Math.max(0.3, Number(process.env.MAX_REAL_STAKE_USD || 25));
const MAX_REAL_DAILY_STAKE_USD = Math.max(MAX_REAL_STAKE_USD, Number(process.env.MAX_REAL_DAILY_STAKE_USD || 1000));
const MAX_OPEN_REAL_TRADES = Math.max(1, Math.min(10, Number(process.env.MAX_OPEN_REAL_TRADES || 3)));
const REAL_TRADE_COOLDOWN_MS = Math.max(1000, Number(process.env.REAL_TRADE_COOLDOWN_MS || 2500));

const PASSWORD_ITERATIONS = 120000;
const PASSWORD_KEY_LENGTH = 32;
const PASSWORD_DIGEST = "sha256";
const PAID_STATUSES = new Set(["COMPLETE", "COMPLETED", "PAID", "SUCCESS", "SUCCESSFUL"]);
const FAILED_STATUSES = new Set(["FAILED", "FAILURE", "CANCELLED", "CANCELED", "REVERSED", "EXPIRED"]);

const DEFAULT_USER_PREFERENCES = Object.freeze({
  notifications: {
    email: true,
    sms: true,
    push: true,
    security: true,
    wallet: true,
    referrals: true,
    botSounds: true,
    takeProfitSound: true,
    stopLossSound: true,
    soundVolume: 70,
  },
});

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


const SYNTHETIC_MARKETS = Object.freeze([
  { id: "vol10", label: "Volatility 10 Index", start: 1.205, step: 0.00016, wave: 0.000025 },
  { id: "vol10-1s", label: "Volatility 10 (1s) Index", start: 1.236, step: 0.0002, wave: 0.00003 },
  { id: "vol25", label: "Volatility 25 Index", start: 1.112, step: 0.00027, wave: 0.000045 },
  { id: "vol25-1s", label: "Volatility 25 (1s) Index", start: 1.148, step: 0.00033, wave: 0.000055 },
  { id: "vol50", label: "Volatility 50 Index", start: 1.31, step: 0.0004, wave: 0.000065 },
  { id: "vol50-1s", label: "Volatility 50 (1s) Index", start: 1.348, step: 0.00048, wave: 0.000075 },
  { id: "vol75", label: "Volatility 75 Index", start: 1.42, step: 0.00055, wave: 0.00009 },
  { id: "vol75-1s", label: "Volatility 75 (1s) Index", start: 1.46, step: 0.00064, wave: 0.000105 },
  { id: "vol100", label: "Volatility 100 Index", start: 1.018, step: 0.00072, wave: 0.00012 },
  { id: "vol100-1s", label: "Volatility 100 (1s) Index", start: 1.086, step: 0.00082, wave: 0.000135 },
]);

const SYNTHETIC_MARKET_BY_ID = new Map(
  SYNTHETIC_MARKETS.map((market) => [market.id, market])
);

const SYNTHETIC_MARKET_BY_LABEL = new Map(
  SYNTHETIC_MARKETS.map((market) => [market.label.toLowerCase(), market])
);

function syntheticSeed(value = "") {
  let hash = 2166136261;
  const text = String(value);
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function syntheticNoise(slot, seed) {
  let value = (Number(slot) ^ Number(seed)) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 2246822507) >>> 0;
  value = Math.imul(value ^ (value >>> 13), 3266489909) >>> 0;
  value ^= value >>> 16;
  return (value >>> 0) / 4294967295;
}

function syntheticSmoothStep(value) {
  const t = Math.max(0, Math.min(1, Number(value) || 0));
  return t * t * (3 - 2 * t);
}

function syntheticValueNoise(slot, seed, span) {
  const safeSpan = Math.max(2, Math.floor(Number(span) || 2));
  const leftIndex = Math.floor(Number(slot) / safeSpan);
  const rightIndex = leftIndex + 1;
  const progress = (Number(slot) - leftIndex * safeSpan) / safeSpan;
  const eased = syntheticSmoothStep(progress);

  const left = syntheticNoise(leftIndex, seed) * 2 - 1;
  const right = syntheticNoise(rightIndex, seed) * 2 - 1;

  return left + (right - left) * eased;
}

function syntheticPriceAt(market, slot) {
  const seed = syntheticSeed(market.id);

  // V364: deterministic multi-scale value noise instead of obvious sine waves.
  // This keeps every device on the same feed while avoiding the repeated
  // "up -> down -> up" rhythm that long 5m / 15m candles were exposing.
  const macro = syntheticValueNoise(slot, seed ^ 0x91e10da5, 1800) * market.step * 92;
  const swing = syntheticValueNoise(slot, seed ^ 0x7f4a7c15, 420) * market.step * 38;
  const trend = syntheticValueNoise(slot, seed ^ 0x5bd1e995, 105) * market.step * 17;
  const shortMove = syntheticValueNoise(slot, seed ^ 0x27d4eb2f, 27) * market.step * 7;
  const micro = (syntheticNoise(slot, seed ^ 0x165667b1) - 0.5) * market.step * 2.2;

  return Number(
    (market.start + macro + swing + trend + shortMove + micro).toFixed(6)
  );
}

function syntheticDigitAt(market, slot) {
  const seed = syntheticSeed(`${market.id}:digit`);
  return Math.floor(syntheticNoise(slot, seed) * 10) % 10;
}

function syntheticMarketAt(market, slot, history = 360) {
  const safeHistory = Math.max(60, Math.min(43200, Math.floor(Number(history || 360))));
  const prices = [];
  const digitHistory = [];

  for (let current = slot - safeHistory + 1; current <= slot; current += 1) {
    prices.push(syntheticPriceAt(market, current));
  }

  for (let current = slot - 99; current <= slot; current += 1) {
    digitHistory.push(syntheticDigitAt(market, current));
  }

  return {
    id: market.id,
    label: market.label,
    prices,
    digitHistory,
    lastDigit: digitHistory[digitHistory.length - 1],
    currentPrice: prices[prices.length - 1],
    startSlot: slot - safeHistory + 1,
    endSlot: slot,
    updatedAt: slot * 1000,
  };
}

function resolveSyntheticMarket(marketId, marketLabel) {
  const byId = SYNTHETIC_MARKET_BY_ID.get(String(marketId || "").trim());
  if (byId) return byId;

  return (
    SYNTHETIC_MARKET_BY_LABEL.get(String(marketLabel || "").trim().toLowerCase()) ||
    SYNTHETIC_MARKET_BY_ID.get("vol100-1s")
  );
}

const marketQuoteCache = new Map();

const app = express();
app.disable("x-powered-by");

const LOCAL_DEVELOPMENT_ORIGIN = /^https?:\/\/(?:localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}):5173$/i;

const ZENTORA_PUBLIC_ORIGINS = new Set([
  "https://zentorakenya.top",
  "https://www.zentorakenya.top",
]);

function corsOriginAllowed(origin) {
  if (!origin) return true;

  const normalizedOrigin = String(origin).trim().replace(/\/$/, "");

  return (
    ZENTORA_PUBLIC_ORIGINS.has(normalizedOrigin) ||
    FRONTEND_URLS.includes(normalizedOrigin) ||
    LOCAL_DEVELOPMENT_ORIGIN.test(normalizedOrigin)
  );
}

app.use(
  cors({
    origin(origin, callback) {
      if (corsOriginAllowed(origin)) {
        callback(null, true);
        return;
      }

      console.warn("CORS blocked request", { origin });
      callback(new Error(`Origin is not allowed by CORS: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
    exposedHeaders: ["Content-Length"],
    optionsSuccessStatus: 204,
  })
);

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: "draft-8", legacyHeaders: false });
const paymentLimiter = rateLimit({ windowMs: 60 * 1000, limit: 10, standardHeaders: "draft-8", legacyHeaders: false });
const tradeLimiter = rateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: "draft-8", legacyHeaders: false });
app.use("/api/auth", authLimiter);
app.use("/api/admin/login", authLimiter);
app.use("/api/deposit", paymentLimiter);
app.use("/api/withdraw", paymentLimiter);
app.use("/api/mpesa/stkpush", paymentLimiter);
app.use("/api/trades", tradeLimiter);

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

function normalizeUserPreferences(value = {}) {
  const notifications = value?.notifications || {};
  return {
    notifications: {
      email: notifications.email !== false,
      sms: notifications.sms !== false,
      push: notifications.push !== false,
      security: notifications.security !== false,
      wallet: notifications.wallet !== false,
      referrals: notifications.referrals !== false,
      botSounds: notifications.botSounds !== false,
      takeProfitSound: notifications.takeProfitSound !== false,
      stopLossSound: notifications.stopLossSound !== false,
      soundVolume: Math.max(0, Math.min(100, Number(notifications.soundVolume ?? 70))),
    },
  };
}

function maskEmail(value) {
  const email = cleanEmail(value);
  const [name = "", domain = ""] = email.split("@");
  if (!domain) return email;
  const visible = name.slice(0, Math.min(2, name.length));
  return `${visible}${"*".repeat(Math.max(2, name.length - visible.length))}@${domain}`;
}

function cleanEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function cleanText(value, max = 180) {
  return String(value || "").trim().slice(0, max);
}

function normalizeKenyanPhone(value) {
  let phone = String(value || "").trim().replace(/[^0-9+]/g, "");
  if (phone.startsWith("+")) phone = phone.slice(1);
  if (phone.startsWith("00254")) phone = phone.slice(2);
  if (phone.startsWith("0") && phone.length === 10) phone = `254${phone.slice(1)}`;
  else if ((phone.startsWith("7") || phone.startsWith("1")) && phone.length === 9) phone = `254${phone}`;

  if (!/^\d{7,15}$/.test(phone)) {
    throw httpError(400, "Enter a valid phone number with country code, for example +2547XXXXXXXX.");
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
      minPoolSize: 1,
      family: 4,
      connectTimeoutMS: 10000,
      serverSelectionTimeoutMS: 12000,
      socketTimeoutMS: 15000,
    });
    mongoClientPromise = client.connect().catch((error) => {
      mongoClientPromise = null;
      throw error;
    });
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

  // Older builds stored referralCode as an empty string on every new user.
  // A unique sparse index still indexes empty strings, which caused a false
  // duplicate-account error for the next person who tried to register.
  await db.collection("users").updateMany(
    { $or: [{ referralCode: "" }, { referralCode: null }] },
    { $unset: { referralCode: "" } }
  );

  await Promise.all([
    db.collection("users").createIndex({ email: 1 }, { unique: true }),
    db.collection("users").createIndex({ accountId: 1 }, { unique: true, sparse: true }),
    db.collection("users").createIndex({ referralCode: 1 }, { unique: true, sparse: true }),
    db.collection("users").createIndex({ referredByEmail: 1, createdAt: -1 }),
    deposits.createIndex({ id: 1 }, { unique: true }),
    deposits.createIndex({ email: 1, status: 1, completedAt: -1 }),
    deposits.createIndex({ invoiceId: 1 }, { sparse: true }),
    deposits.createIndex({ apiRef: 1 }, { sparse: true }),
    deposits.createIndex({ orderTrackingId: 1 }, { unique: true, sparse: true }),
    deposits.createIndex({ merchantReference: 1 }, { unique: true, sparse: true }),
    deposits.createIndex({ checkoutRequestId: 1 }, { unique: true, sparse: true }),
    deposits.createIndex({ merchantRequestId: 1 }, { sparse: true }),
    withdrawals.createIndex({ id: 1 }, { unique: true }),
    db.collection("processedInvoices").createIndex({ invoiceKey: 1 }, { unique: true }),
    db.collection("transactions").createIndex({ email: 1, createdAt: -1 }),
    db.collection("trades").createIndex({ id: 1 }, { unique: true }),
    db.collection("trades").createIndex({ email: 1, createdAt: -1 }),
    db.collection("forexPositions").createIndex({ id: 1 }, { unique: true }),
    db.collection("forexPositions").createIndex({ email: 1, status: 1, createdAt: -1 }),
    db.collection("adminAudit").createIndex({ createdAt: -1 }),
    db.collection("passwordResetTokens").createIndex({ tokenHash: 1 }, { unique: true }),
    db.collection("passwordResetTokens").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection("passwordResetTokens").createIndex({ email: 1, createdAt: -1 }),
    db.collection("supportTickets").createIndex({ id: 1 }, { unique: true }),
    db.collection("supportTickets").createIndex({ email: 1, status: 1, updatedAt: -1 }),
    db.collection("supportTickets").createIndex({ status: 1, updatedAt: -1 }),
  ]);

  await ensurePartialRequestIndex(deposits, "uniq_deposit_email_requestId");
  await ensurePartialRequestIndex(withdrawals, "uniq_withdrawal_email_requestId");
  await ensurePartialRequestIndex(db.collection("trades"), "uniq_trade_email_requestId");
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


function hashResetToken(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

async function sendPasswordResetEmail(email, resetLink) {
  if (!RESEND_API_KEY) {
    console.warn(`Password reset email provider is not configured. Reset requested for ${maskEmail(email)}.`);
    return false;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: PASSWORD_RESET_FROM_EMAIL,
      to: [email],
      subject: "Reset your MetaBinary password",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:28px;color:#0b1726">
          <h2>Reset your MetaBinary password</h2>
          <p>A password reset was requested for your account.</p>
          <p><a href="${resetLink}" style="display:inline-block;padding:13px 22px;background:#087cff;color:white;text-decoration:none;border-radius:9px;font-weight:700">Create new password</a></p>
          <p>This secure link expires in ${PASSWORD_RESET_TTL_MINUTES} minutes and can be used once.</p>
          <p>If you did not request this, you can ignore this email.</p>
        </div>`,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw httpError(502, `Email delivery failed: ${text.slice(0, 160)}`);
  }
  return true;
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
    const tokenSessionVersion = Number(payload.sv || 0);
    const userSessionVersion = Number(user.sessionVersion || 0);
    if (tokenSessionVersion !== userSessionVersion) {
      throw httpError(401, "This session is no longer valid. Login again.");
    }
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
    preferences: normalizeUserPreferences(user.preferences),
    status: String(user.status || "active").toLowerCase(),
    role: user.role || "user",
    createdAt: user.createdAt || "",
    updatedAt: user.updatedAt || "",
    lastLoginAt: user.lastLoginAt || "",
  };
}

function publicSupportTicket(ticket = {}) {
  return {
    id: ticket.id || "",
    email: cleanEmail(ticket.email),
    fullName: ticket.fullName || ticket.name || "",
    accountId: ticket.accountId || ticket.brokerId || "",
    category: ticket.category || "other",
    subject: ticket.subject || "Support request",
    status: ticket.status || "open",
    priority: ticket.priority || "normal",
    page: ticket.page || "",
    account: ticket.account || "",
    metadata: ticket.metadata || {},
    messages: Array.isArray(ticket.messages)
      ? ticket.messages.map((message) => ({
          id: message.id || "",
          sender: message.sender || "user",
          body: message.body || "",
          createdAt: message.createdAt || "",
          senderEmail: message.sender === "agent" ? message.senderEmail || "" : "",
        }))
      : [],
    createdAt: ticket.createdAt || "",
    updatedAt: ticket.updatedAt || "",
    agentRepliedAt: ticket.agentRepliedAt || "",
    closedAt: ticket.closedAt || "",
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

function estimatedTouchProbability(ticks, barrierDistance) {
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

function tradeMultiplier(type, action, prediction, options = {}) {
  const digit = Math.max(0, Math.min(9, Number(prediction || 0)));
  if (type === "Even/Odd" || type === "Rise/Fall") return 1.9;
  if (type === "Matches/Differs") return action === "Matches" ? 8.33 : 1.09;
  if (type === "Over/Under") {
    const winningDigits = action === "Over" ? Math.max(0, 9 - digit) : Math.max(0, digit);
    return Number(DIGIT_PAYOUT_BY_WINNING_DIGITS[winningDigits] || 0);
  }
  if (type === "Touch/No Touch") {
    const touchProbability = estimatedTouchProbability(options.ticks, options.barrierDistance);
    const probability = action === "Touch" ? touchProbability : 1 - touchProbability;
    return Number(Math.max(1.05, Math.min(8, 0.95 / probability)).toFixed(3));
  }
  return 0;
}

function tradeWins(trade, resultDigit, closingPrice, touched) {
  const type = trade.type;
  const action = trade.action;
  const prediction = Number(trade.prediction || 0);
  if (type === "Even/Odd") return action === "Even" ? resultDigit % 2 === 0 : resultDigit % 2 !== 0;
  if (type === "Matches/Differs") return action === "Matches" ? resultDigit === prediction : resultDigit !== prediction;
  if (type === "Over/Under") return action === "Over" ? resultDigit > prediction : resultDigit < prediction;
  if (type === "Touch/No Touch") return action === "Touch" ? Boolean(touched) : !Boolean(touched);
  if (type === "Rise/Fall") {
    return action === "Rise"
      ? Number(closingPrice) > Number(trade.entryPrice)
      : Number(closingPrice) < Number(trade.entryPrice);
  }
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
    currentPrice: Number(trade.currentPrice || trade.entryPrice || 0),
    barrier: Number(trade.barrier || 0),
    barrierDistance: Number(trade.barrierDistance || 0),
    touched: Boolean(trade.touched),
    marketId: trade.marketId || "",
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
  const closingPrice = Number(trade.currentPrice || trade.entryPrice || 0);
  const touched = Boolean(trade.touched);
  const won = tradeWins(trade, resultDigit, closingPrice, touched);
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
        currentPrice: closingPrice,
        touched,
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
    details: `${claimed.strategy ? `${claimed.strategy} Â· ` : ""}${claimed.market || "Volatility"} Â· ${claimed.type} Â· ${claimed.action}${["Even/Odd", "Matches/Differs", "Over/Under"].includes(claimed.type) ? ` Â· digit ${resultDigit}` : ` Â· close ${closingPrice}`}`,
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
    const providerMarketOpen = typeof data?.is_market_open === "boolean"
      ? data.is_market_open
      : null;
    // The provider can return a stale closed flag even while a fresh weekday
    // quote is available. MetaBinary uses its weekday session schedule for
    // order availability and keeps the provider value for diagnostics.
    const isOpen = market.alwaysOpen || marketIsOpen(market);
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
      providerMarketOpen,
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
    source: position.source || "manual",
    strategy: position.strategy || "",
    status: position.status,
    openedAt: position.openedAt || position.createdAt,
    createdAt: position.createdAt,
    closedAt: position.closedAt || "",
  };
}

let darajaTokenCache = { token: "", expiresAt: 0 };

function ensureDarajaKeys() {
  const missing = [];
  if (!DARAJA_CONSUMER_KEY) missing.push("DARAJA_CONSUMER_KEY");
  if (!DARAJA_CONSUMER_SECRET) missing.push("DARAJA_CONSUMER_SECRET");
  if (!DARAJA_PASSKEY) missing.push("DARAJA_PASSKEY");
  if (!DARAJA_SHORTCODE) missing.push("DARAJA_SHORTCODE");
  if (!DARAJA_TILL_NUMBER) missing.push("DARAJA_TILL_NUMBER");
  if (!DARAJA_CALLBACK_URL) missing.push("DARAJA_CALLBACK_URL");

  if (missing.length) {
    throw httpError(
      503,
      `Daraja M-PESA is not fully configured. Missing: ${missing.join(", ")}.`
    );
  }
}

function darajaTimestamp(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value])
  );

  return `${values.year}${values.month}${values.day}${values.hour}${values.minute}${values.second}`;
}

function darajaPassword(timestamp) {
  return Buffer.from(
    `${DARAJA_SHORTCODE}${DARAJA_PASSKEY}${timestamp}`,
    "utf8"
  ).toString("base64");
}

async function getDarajaToken(forceRefresh = false) {
  ensureDarajaKeys();

  if (
    !forceRefresh &&
    darajaTokenCache.token &&
    Date.now() < darajaTokenCache.expiresAt
  ) {
    return darajaTokenCache.token;
  }

  const basicAuth = Buffer.from(
    `${DARAJA_CONSUMER_KEY}:${DARAJA_CONSUMER_SECRET}`,
    "utf8"
  ).toString("base64");

  const response = await fetch(
    `${DARAJA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Basic ${basicAuth}`,
      },
      signal: AbortSignal.timeout(20000),
    }
  );

  const data = await readProviderJson(response);

  if (!response.ok || !data?.access_token) {
    throw httpError(
      response.status || 502,
      providerErrorMessage(data) || "Daraja authentication failed."
    );
  }

  const expiresIn = Math.max(60, Number(data.expires_in || 3599));
  darajaTokenCache = {
    token: String(data.access_token),
    expiresAt: Date.now() + Math.max(30, expiresIn - 60) * 1000,
  };

  return darajaTokenCache.token;
}

async function darajaRequest(path, options = {}) {
  const token = await getDarajaToken(Boolean(options.forceRefresh));

  const response = await fetch(`${DARAJA_BASE_URL}${path}`, {
    method: String(options.method || "POST").toUpperCase(),
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body:
      options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: AbortSignal.timeout(30000),
  });

  if (response.status === 401 && !options._retried) {
    darajaTokenCache = { token: "", expiresAt: 0 };
    return darajaRequest(path, {
      ...options,
      forceRefresh: true,
      _retried: true,
    });
  }

  const data = await readProviderJson(response);

  if (
    !response.ok ||
    data?.errorCode ||
    data?.error_code ||
    (data?.ResponseCode !== undefined && String(data.ResponseCode) !== "0")
  ) {
    throw httpError(
      response.status || 502,
      providerErrorMessage(data) || "Daraja request failed."
    );
  }

  return data;
}

async function startMpesaStkPush({ amountKes, phone, accountReference }) {
  ensureDarajaKeys();

  const timestamp = darajaTimestamp();
  const reference = cleanText(accountReference || "MetaBinary", 12) || "MetaBinary";

  return darajaRequest("/mpesa/stkpush/v1/processrequest", {
    method: "POST",
    body: {
      BusinessShortCode: DARAJA_SHORTCODE,
      Password: darajaPassword(timestamp),
      Timestamp: timestamp,
      TransactionType: DARAJA_TRANSACTION_TYPE,
      Amount: Math.max(1, Math.round(Number(amountKes))),
      PartyA: phone,
      PartyB: DARAJA_TILL_NUMBER,
      PhoneNumber: phone,
      CallBackURL: DARAJA_CALLBACK_URL,
      AccountReference: reference,
      TransactionDesc: "MB Deposit",
    },
  });
}

async function queryMpesaStkPush(checkoutRequestId) {
  if (!checkoutRequestId) {
    throw httpError(400, "M-PESA CheckoutRequestID is missing.");
  }

  const timestamp = darajaTimestamp();

  return darajaRequest("/mpesa/stkpushquery/v1/query", {
    method: "POST",
    body: {
      BusinessShortCode: DARAJA_SHORTCODE,
      Password: darajaPassword(timestamp),
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId,
    },
  });
}

function mpesaCallbackMetadata(stkCallback = {}) {
  const items = Array.isArray(stkCallback?.CallbackMetadata?.Item)
    ? stkCallback.CallbackMetadata.Item
    : [];

  return Object.fromEntries(
    items
      .filter((item) => item && item.Name)
      .map((item) => [String(item.Name), item.Value])
  );
}

function mpesaFailureStatus(resultCode) {
  const code = String(resultCode ?? "");
  if (code === "1032") return "CANCELLED";
  if (code === "1037") return "EXPIRED";
  return "FAILED";
}

function isMpesaStillProcessing(value) {
  const message = String(value || "").trim().toLowerCase();
  return (
    message.includes("still under processing") ||
    message.includes("still processing") ||
    message.includes("being processed") ||
    message.includes("transaction is processing") ||
    message.includes("request is processing") ||
    message.includes("processing the transaction")
  );
}

async function reconcileMpesaDeposit(db, deposit) {
  if (
    !deposit ||
    deposit.provider !== "mpesa" ||
    deposit.credited ||
    FAILED_STATUSES.has(deposit.status) ||
    deposit.status === "PAYMENT_REVIEW"
  ) {
    return deposit;
  }

  const checkoutRequestId = String(
    deposit.checkoutRequestId || deposit.orderTrackingId || ""
  ).trim();

  if (!checkoutRequestId) return deposit;

  const lastCheckMs = Date.parse(deposit.lastProviderStatusCheckAt || "");
  if (Number.isFinite(lastCheckMs) && Date.now() - lastCheckMs < 5000) {
    return deposit;
  }

  const checkedAt = nowIso();

  try {
    const providerResponse = await queryMpesaStkPush(checkoutRequestId);
    const rawResultCode = pickFirst(
      providerResponse?.ResultCode,
      providerResponse?.resultCode,
      providerResponse?.errorCode
    );

    const update = {
      providerStatusResponse: providerResponse,
      lastProviderStatusCheckAt: checkedAt,
      updatedAt: checkedAt,
    };

    if (rawResultCode === undefined || rawResultCode === null || rawResultCode === "") {
      await db.collection("deposits").updateOne({ id: deposit.id }, { $set: update });
      return { ...deposit, ...update };
    }

    const resultCode = String(rawResultCode);
    update.resultCode = resultCode;
    update.resultDesc = String(
      pickFirst(providerResponse?.ResultDesc, providerResponse?.resultDesc) || ""
    );

    // Daraja can return a non-zero query result while the STK request is still
    // awaiting the customer's PIN/callback. That is a pending state, not a failure.
    if (isMpesaStillProcessing(update.resultDesc)) {
      update.status = "PENDING";
      await db.collection("deposits").updateOne({ id: deposit.id }, { $set: update });
      return { ...deposit, ...update };
    }

    if (resultCode === "0") {
      update.status = "COMPLETED";
      await db.collection("deposits").updateOne({ id: deposit.id }, { $set: update });
      return creditDepositOnce(db, { ...deposit, ...update }, "COMPLETED");
    }

    update.status = mpesaFailureStatus(resultCode);
    console.warn("M-PESA STK status returned a final non-success result", {
      depositId: deposit.id,
      resultCode,
      resultDesc: update.resultDesc,
    });
    await db.collection("deposits").updateOne({ id: deposit.id }, { $set: update });
    return { ...deposit, ...update };
  } catch (error) {
    await db.collection("deposits").updateOne(
      { id: deposit.id },
      {
        $set: {
          lastProviderStatusCheckAt: checkedAt,
          lastStatusError: providerErrorMessage(error),
          updatedAt: checkedAt,
        },
      }
    );

    return db.collection("deposits").findOne({ id: deposit.id });
  }
}

let pesapalTokenCache = { token: "", expiresAt: 0 };
let pesapalIpnIdCache = PESAPAL_IPN_ID;

function ensurePaymentKeys() {
  if (!PESAPAL_CONSUMER_KEY || !PESAPAL_CONSUMER_SECRET) {
    throw httpError(503, "Pesapal consumer key and consumer secret are not configured on the backend.");
  }
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
    return parsed.message || parsed.detail || parsed.error?.message || parsed.error || nested || raw;
  } catch {
    return String(raw).slice(0, 500);
  }
}

function pickFirst(...values) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== "");
}

async function readProviderJson(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { message: text.slice(0, 500) };
  }
}

async function getPesapalToken(forceRefresh = false) {
  ensurePaymentKeys();
  if (!forceRefresh && pesapalTokenCache.token && Date.now() < pesapalTokenCache.expiresAt) {
    return pesapalTokenCache.token;
  }

  const response = await fetch(`${PESAPAL_BASE_URL}/api/Auth/RequestToken`, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      consumer_key: PESAPAL_CONSUMER_KEY,
      consumer_secret: PESAPAL_CONSUMER_SECRET,
    }),
    signal: AbortSignal.timeout(20000),
  });
  const data = await readProviderJson(response);
  if (!response.ok || !data?.token || data?.error) {
    throw httpError(response.status || 502, providerErrorMessage(data) || "Pesapal authentication failed.");
  }

  // Pesapal tokens are short lived. Refresh a little before the documented expiry window.
  pesapalTokenCache = { token: data.token, expiresAt: Date.now() + 4 * 60 * 1000 };
  return data.token;
}

async function pesapalRequest(path, options = {}) {
  const method = String(options.method || "GET").toUpperCase();
  const token = await getPesapalToken(Boolean(options.forceRefresh));
  const response = await fetch(`${PESAPAL_BASE_URL}${path}`, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: AbortSignal.timeout(25000),
  });

  if (response.status === 401 && !options._retried) {
    pesapalTokenCache = { token: "", expiresAt: 0 };
    return pesapalRequest(path, { ...options, forceRefresh: true, _retried: true });
  }

  const data = await readProviderJson(response);
  if (!response.ok || data?.error?.message || (data?.status && String(data.status) !== "200" && !data?.redirect_url)) {
    throw httpError(response.status || 502, providerErrorMessage(data) || "Pesapal request failed.");
  }
  return data;
}

function normalizeStatus(payload = {}) {
  const raw = pickFirst(
    payload.payment_status_description,
    payload.paymentStatusDescription,
    payload.state,
    payload.status_description,
    payload.status
  );
  const status = String(raw || "PENDING").trim().toUpperCase().replace(/\s+/g, "_");
  return status === "COMPLETE" ? "COMPLETED" : status;
}

function pesapalNotificationValues(req) {
  const source = { ...(req.query || {}), ...(req.body || {}) };
  return {
    orderTrackingId: String(
      pickFirst(source.OrderTrackingId, source.orderTrackingId, source.order_tracking_id) || ""
    ).trim(),
    merchantReference: String(
      pickFirst(source.OrderMerchantReference, source.orderMerchantReference, source.merchant_reference) || ""
    ).trim(),
    notificationType: String(
      pickFirst(source.OrderNotificationType, source.orderNotificationType, source.order_notification_type) || "IPNCHANGE"
    ).trim(),
  };
}

async function getPesapalIpnId(db) {
  if (pesapalIpnIdCache) return pesapalIpnIdCache;
  if (!PUBLIC_BACKEND_URL) {
    throw httpError(503, "PUBLIC_BACKEND_URL is required before Pesapal payments can be created.");
  }

  const key = `pesapal-ipn-${PESAPAL_ENV}`;
  const ipnUrl = `${PUBLIC_BACKEND_URL}/api/pesapal/ipn`;
  const stored = await db.collection("appSettings").findOne({ key });
  if (stored?.ipnId && stored?.url === ipnUrl) {
    pesapalIpnIdCache = String(stored.ipnId);
    return pesapalIpnIdCache;
  }

  const data = await pesapalRequest("/api/URLSetup/RegisterIPN", {
    method: "POST",
    body: { url: ipnUrl, ipn_notification_type: "POST" },
  });
  const ipnId = String(data?.ipn_id || "").trim();
  if (!ipnId) throw httpError(502, "Pesapal did not return an IPN ID.");

  pesapalIpnIdCache = ipnId;
  await db.collection("appSettings").updateOne(
    { key },
    { $set: { key, provider: "pesapal", environment: PESAPAL_ENV, ipnId, url: ipnUrl, updatedAt: nowIso() } },
    { upsert: true }
  );
  return ipnId;
}

async function getPesapalTransactionStatus(orderTrackingId) {
  if (!orderTrackingId) throw httpError(400, "Pesapal order tracking ID is missing.");
  return pesapalRequest(
    `/api/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(orderTrackingId)}`
  );
}

async function findDepositByProviderReference(db, orderTrackingId, merchantReference) {
  const clauses = [];
  if (orderTrackingId) {
    clauses.push({ orderTrackingId }, { invoiceId: orderTrackingId });
  }
  if (merchantReference) {
    clauses.push({ merchantReference }, { apiRef: merchantReference }, { id: merchantReference });
  }
  return clauses.length ? db.collection("deposits").findOne({ $or: clauses }) : null;
}

async function creditDepositOnce(db, deposit, verifiedStatus) {
  if (!deposit || deposit.credited || !PAID_STATUSES.has(verifiedStatus)) return deposit;
  const invoiceKey = deposit.orderTrackingId || deposit.invoiceId || deposit.merchantReference || deposit.id;

  try {
    await db.collection("processedInvoices").insertOne({
      invoiceKey,
      depositId: deposit.id,
      processedAt: nowIso(),
    });
  } catch (error) {
    if (error?.code === 11000) {
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
          reference: invoiceKey,
          details: `${referralCommissionRate}% commission from ${deposit.email}`,
          sourceEmail: deposit.email,
          depositId: deposit.id,
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
    method: deposit.paymentMethod || deposit.method || (deposit.provider === "mpesa" ? "M-PESA" : "Pesapal"),
    amount: Number(deposit.amountUsd),
    amountKes: Number(deposit.amountKes),
    status: "COMPLETED",
    reference: invoiceKey,
    createdAt: completedAt,
  });
  return db.collection("deposits").findOne({ id: deposit.id });
}

async function reconcileDeposit(db, deposit) {
  if (deposit?.provider === "mpesa" || deposit?.method === "mpesa") {
    return reconcileMpesaDeposit(db, deposit);
  }

  const orderTrackingId = deposit?.orderTrackingId || deposit?.invoiceId;
  if (!orderTrackingId || deposit.credited || FAILED_STATUSES.has(deposit.status)) return deposit;

  try {
    const providerResponse = await getPesapalTransactionStatus(orderTrackingId);
    const status = normalizeStatus(providerResponse);
    const providerReference = String(providerResponse?.merchant_reference || "").trim();
    const expectedReference = String(deposit.merchantReference || deposit.apiRef || deposit.id || "").trim();
    const paidCurrency = String(providerResponse?.currency || "").trim().toUpperCase();
    const paidAmount = Number(providerResponse?.amount);
    const expectedAmountKes = Number(deposit.amountKes);

    let verificationError = "";
    if (providerReference && expectedReference && providerReference !== expectedReference) {
      verificationError = "Pesapal merchant reference did not match this deposit.";
    } else if (status === "COMPLETED" && paidCurrency && paidCurrency !== "KES") {
      verificationError = `Unexpected payment currency ${paidCurrency}.`;
    } else if (
      status === "COMPLETED" &&
      Number.isFinite(paidAmount) &&
      Number.isFinite(expectedAmountKes) &&
      Math.abs(paidAmount - expectedAmountKes) > 0.01
    ) {
      verificationError = "Paid amount did not match the requested deposit amount.";
    }

    const storedStatus = verificationError && status === "COMPLETED" ? "PAYMENT_REVIEW" : status;
    const update = {
      providerStatusResponse: providerResponse,
      status: storedStatus,
      paymentMethod: providerResponse?.payment_method || deposit.paymentMethod || deposit.method,
      confirmationCode: providerResponse?.confirmation_code || deposit.confirmationCode || "",
      paymentAccount: providerResponse?.payment_account || deposit.paymentAccount || "",
      verifiedAmountKes: Number.isFinite(paidAmount) ? paidAmount : null,
      verifiedCurrency: paidCurrency,
      verificationError,
      updatedAt: nowIso(),
    };
    await db.collection("deposits").updateOne({ id: deposit.id }, { $set: update });
    const updated = { ...deposit, ...update };

    return !verificationError && PAID_STATUSES.has(status)
      ? creditDepositOnce(db, updated, status)
      : updated;
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
  const status = String(deposit.status || "PENDING").toUpperCase();
  const providerMessage = cleanText(
    deposit.resultDesc ||
      deposit.lastStatusError ||
      deposit.providerStatusResponse?.ResultDesc ||
      deposit.providerStatusResponse?.errorMessage ||
      deposit.providerResponse?.CustomerMessage ||
      deposit.providerResponse?.ResponseDescription ||
      "",
    300
  );
  const effectiveStatus =
    isMpesaStillProcessing(providerMessage) && FAILED_STATUSES.has(status)
      ? "PENDING"
      : status;

  let message = "Payment is still pending.";
  if (effectiveStatus === "COMPLETED") {
    message = "Deposit completed successfully.";
  } else if (effectiveStatus === "PAYMENT_REVIEW") {
    message =
      deposit.verificationError ||
      "Payment was received but requires review before the balance can be credited.";
  } else if (FAILED_STATUSES.has(effectiveStatus)) {
    message = providerMessage || `Deposit ${status.toLowerCase()}.`;
  } else if (providerMessage) {
    message = providerMessage;
  }

  return {
    ok: true,
    depositId: deposit.id,
    invoiceId: deposit.orderTrackingId || deposit.invoiceId || "",
    orderTrackingId: deposit.orderTrackingId || deposit.invoiceId || "",
    merchantReference: deposit.merchantReference || deposit.apiRef || deposit.id,
    checkoutUrl: deposit.checkoutUrl || "",
    checkoutRequestId: deposit.checkoutRequestId || "",
    merchantRequestId: deposit.merchantRequestId || "",
    provider: deposit.provider || "",
    status: effectiveStatus,
    method: deposit.paymentMethod || deposit.method,
    phone: deposit.phone,
    amountUsd: deposit.amountUsd,
    amountKes: deposit.amountKes,
    realBalance: roundMoney(user?.realBalance),
    credited: Boolean(deposit.credited),
    resultCode: deposit.resultCode || "",
    resultDesc: deposit.resultDesc || "",
    lastStatusError: deposit.lastStatusError || "",
    message,
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
      mode: DARAJA_ENV,
      database: MONGODB_DB,
      time: nowIso(),
    });
  } catch (error) {
    next(error);
  }
});


app.get("/api/synthetic/markets", (req, res) => {
  const history = Math.max(60, Math.min(600, Math.floor(Number(req.query?.history || 360))));
  const serverTime = Date.now();
  const slot = Math.floor(serverTime / 1000);
  const markets = Object.fromEntries(
    SYNTHETIC_MARKETS.map((market) => [
      market.id,
      syntheticMarketAt(market, slot, history),
    ])
  );

  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.json({
    ok: true,
    serverTime,
    tickMs: 1000,
    slot,
    markets,
  });
});

app.get("/api/synthetic/market/:marketId", (req, res) => {
  const market = resolveSyntheticMarket(req.params.marketId, req.params.marketId);
  const history = Math.max(
    600,
    Math.min(43200, Math.floor(Number(req.query?.history || 43200)))
  );
  const serverTime = Date.now();
  const slot = Math.floor(serverTime / 1000);
  const snapshot = syntheticMarketAt(market, slot, history);

  res.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.json({
    ok: true,
    serverTime,
    tickMs: 1000,
    slot,
    market: snapshot,
  });
});

app.get("/api/health", async (_req, res) => {
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    res.json({
      ok: true,
      build: BACKEND_BUILD,
      mode: DARAJA_ENV,
      mongo: "connected",
      database: MONGODB_DB,
      referralCommissionPercent: REFERRAL_COMMISSION_PERCENT,
      tradeTickMs: TRADE_TICK_MS,
      botTradeTickMs: BOT_TRADE_TICK_MS,
      aiTradeTickMs: AI_TRADE_TICK_MS,
      passwordResetEmailConfigured: Boolean(RESEND_API_KEY),
      publicBackendUrlConfigured: Boolean(PUBLIC_BACKEND_URL),
      paymentProvider: "daraja-mpesa",
      paymentConfigured: Boolean(
        DARAJA_CONSUMER_KEY &&
          DARAJA_CONSUMER_SECRET &&
          DARAJA_PASSKEY &&
          DARAJA_SHORTCODE &&
          DARAJA_TILL_NUMBER &&
          DARAJA_CALLBACK_URL
      ),
      darajaEnvironment: DARAJA_ENV,
      darajaShortcodeConfigured: Boolean(DARAJA_SHORTCODE),
      darajaTillConfigured: Boolean(DARAJA_TILL_NUMBER),
      darajaCallbackConfigured: Boolean(DARAJA_CALLBACK_URL),
      pesapalConfigured: Boolean(PESAPAL_CONSUMER_KEY && PESAPAL_CONSUMER_SECRET),
      pesapalIpnConfigured: Boolean(PESAPAL_IPN_ID || PUBLIC_BACKEND_URL),
    });
  } catch (error) {
    res.status(503).json({ ok: false, mode: DARAJA_ENV, mongo: "disconnected", message: error.message });
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
    if (password.length < 8) throw httpError(400, "Password must be at least 8 characters.");

    const db = await getDb();
    const users = db.collection("users");
    const referrer = suppliedReferralCode
      ? await users.findOne({ referralCode: suppliedReferralCode })
      : null;
    if (suppliedReferralCode && !referrer) {
      throw httpError(400, "The referral code is not valid.");
    }

    // Check email and phone separately. When an earlier request created the
    // account but the browser lost the response, the same credentials safely
    // sign the user in instead of showing a false duplicate error.
    const [existingEmail, existingPhone] = await Promise.all([
      users.findOne({ email }),
      users.findOne({ phone }),
    ]);

    const existing = existingEmail || existingPhone;
    const sameStoredAccount =
      !existingEmail ||
      !existingPhone ||
      String(existingEmail._id) === String(existingPhone._id);

    if (
      existing &&
      sameStoredAccount &&
      existing.email === email &&
      existing.phone === phone &&
      verifyPassword(password, existing.passwordHash)
    ) {
      const token = signToken(
        { role: "user", email: existing.email, sv: Number(existing.sessionVersion || 0) },
        60 * 60 * 24 * 7
      );
      return res.status(200).json({
        ok: true,
        token,
        user: publicUser(existing),
        message: "Your account was already created. You have been signed in successfully.",
      });
    }

    if (existingEmail) {
      throw httpError(409, "This email already has an account. Login or reset the password.");
    }
    if (existingPhone) {
      throw httpError(409, "This phone number is already connected to an account. Use the account login or password reset.");
    }

    const createdAt = nowIso();
    let createdUser = null;

    // Retry only an account-ID collision. Do not report it as an email or phone duplicate.
    for (let attempt = 0; attempt < 5 && !createdUser; attempt += 1) {
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
        referralCommissionRate: REFERRAL_COMMISSION_PERCENT,
        referralCount: 0,
        referredByEmail: referrer?.email || "",
        referralCodeUsed: referrer?.referralCode || "",
        preferences: normalizeUserPreferences(),
        emailVerified: false,
        verified: false,
        status: "active",
        role: "user",
        sessionVersion: 0,
        createdAt,
        updatedAt: createdAt,
      };

      try {
        await users.insertOne(user);
        createdUser = user;
      } catch (insertError) {
        const duplicateField = Object.keys(insertError?.keyPattern || insertError?.keyValue || {})[0] || "";
        if (insertError?.code === 11000 && duplicateField === "accountId") continue;
        throw insertError;
      }
    }

    if (!createdUser) {
      throw httpError(503, "Account ID generation was busy. Please press Create Account again.");
    }

    if (referrer?.email) {
      await users.updateOne(
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

    const token = signToken(
      { role: "user", email, sv: Number(createdUser.sessionVersion || 0) },
      60 * 60 * 24 * 7
    );

    return res.status(201).json({
      ok: true,
      token,
      user: publicUser(createdUser),
      message: `Account ${createdUser.accountId} created successfully.`,
    });
  } catch (error) {
    if (error?.code === 11000) {
      const duplicateField = Object.keys(error?.keyPattern || error?.keyValue || {})[0] || "";
      if (duplicateField === "email") {
        error = httpError(409, "This email already has an account. Login or reset the password.");
      } else if (duplicateField === "phone") {
        error = httpError(409, "This phone number is already connected to an account.");
      } else if (duplicateField === "referralCode") {
        error = httpError(409, "Referral setup was busy. Please press Create Account again.");
      } else {
        error = httpError(409, "Account creation conflicted with another request. Please press Create Account again.");
      }
    }
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
    const token = signToken({ role: "user", email, sv: Number(user.sessionVersion || 0) }, 60 * 60 * 24 * 7);
    res.json({ ok: true, token, user: publicUser({ ...user, lastLoginAt }), message: `Logged in as ${user.accountId || user.brokerId || email}.` });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/forgot-password", async (req, res, next) => {
  try {
    const email = cleanEmail(req.body?.email);
    const genericMessage = "If an account exists with this email, a password reset link has been sent.";
    if (!email || !email.includes("@")) return res.json({ ok: true, message: genericMessage });

    const db = await getDb();
    const user = await db.collection("users").findOne({ email });
    if (user) {
      const rawToken = crypto.randomBytes(32).toString("base64url");
      const tokenHash = hashResetToken(rawToken);
      const createdAt = nowIso();
      const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000);
      await db.collection("passwordResetTokens").deleteMany({ email });
      await db.collection("passwordResetTokens").insertOne({ tokenHash, email, createdAt, expiresAt, usedAt: "" });
      const resetLink = `${FRONTEND_PUBLIC_URL}/?reset_token=${encodeURIComponent(rawToken)}`;
      await sendPasswordResetEmail(email, resetLink);
    }
    res.json({ ok: true, message: genericMessage });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/reset-password", async (req, res, next) => {
  try {
    const token = String(req.body?.token || "");
    const password = String(req.body?.password || "");
    if (!token || password.length < 8) throw httpError(400, "Enter a valid reset link and a password with at least 8 characters.");

    const db = await getDb();
    const tokenHash = hashResetToken(token);
    const record = await db.collection("passwordResetTokens").findOne({ tokenHash, usedAt: "", expiresAt: { $gt: new Date() } });
    if (!record) throw httpError(400, "This password reset link is invalid or has expired.");

    const changedAt = nowIso();
    const updated = await db.collection("users").findOneAndUpdate(
      { email: record.email },
      { $set: { passwordHash: hashPassword(password), passwordChangedAt: changedAt, updatedAt: changedAt }, $inc: { sessionVersion: 1 } },
      { returnDocument: "after" }
    );
    if (!updated) throw httpError(404, "Account was not found.");
    await db.collection("passwordResetTokens").updateOne({ _id: record._id }, { $set: { usedAt: changedAt } });
    await db.collection("passwordResetTokens").deleteMany({ email: record.email, _id: { $ne: record._id } });
    res.json({ ok: true, message: "Password updated successfully. You can now log in with your new password." });
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
        link: `${origin}/?ref=${encodeURIComponent(code)}`,
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


app.get("/api/settings", requireUser, (req, res) => {
  res.json({
    ok: true,
    user: publicUser(req.user),
    preferences: normalizeUserPreferences(req.user.preferences),
  });
});

app.patch("/api/settings/profile", requireUser, async (req, res, next) => {
  try {
    const db = await getDb();
    const fullName = cleanText(req.body?.fullName, 120);
    const country = cleanText(req.body?.country || req.user.country || "Kenya", 80);
    const rawPhone = cleanText(req.body?.phone, 30);
    const phone = rawPhone ? normalizeKenyanPhone(rawPhone) : req.user.phone || "";

    if (!fullName || fullName.length < 2) {
      throw httpError(400, "Enter your full legal name.");
    }

    if (phone && phone !== req.user.phone) {
      const existing = await db.collection("users").findOne({ phone, _id: { $ne: req.user._id } });
      if (existing) throw httpError(409, "This phone number is already used by another account.");
    }

    const updatedAt = nowIso();
    await db.collection("users").updateOne(
      { _id: req.user._id },
      {
        $set: {
          fullName,
          name: fullName,
          phone,
          country,
          updatedAt,
        },
      }
    );

    const updatedUser = await db.collection("users").findOne({ _id: req.user._id });
    res.json({ ok: true, user: publicUser(updatedUser), message: "Profile settings saved." });
  } catch (error) {
    next(error);
  }
});

app.post("/api/settings/kyc", requireUser, async (req, res, next) => {
  try {
    const db = await getDb();
    const docType = cleanText(req.body?.docType, 50);
    const docNumber = cleanText(req.body?.docNumber, 50);
    const fullName = cleanText(req.body?.fullName, 120);

    if (!docType || !docNumber) {
      throw httpError(400, "Document type and document number are required.");
    }

    const updatedAt = nowIso();
    await db.collection("users").updateOne(
      { _id: req.user._id },
      {
        $set: {
          verified: true,
          emailVerified: true,
          fullName: fullName || req.user.fullName,
          documentType: docType,
          documentNumber: docNumber,
          updatedAt,
        },
      }
    );

    const updatedUser = await db.collection("users").findOne({ _id: req.user._id });
    res.json({ ok: true, user: publicUser(updatedUser), message: "KYC documents verified successfully!" });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/settings/preferences", requireUser, async (req, res, next) => {
  try {
    const db = await getDb();
    const preferences = normalizeUserPreferences(req.body?.preferences || req.body || {});
    await db.collection("users").updateOne(
      { _id: req.user._id },
      { $set: { preferences, updatedAt: nowIso() } }
    );
    const updatedUser = await db.collection("users").findOne({ _id: req.user._id });
    res.json({
      ok: true,
      preferences,
      user: publicUser(updatedUser),
      message: "Notification preferences saved.",
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/settings/password", requireUser, async (req, res, next) => {
  try {
    const currentPassword = String(req.body?.currentPassword || "");
    const newPassword = String(req.body?.newPassword || "");

    if (!verifyPassword(currentPassword, req.user.passwordHash)) {
      throw httpError(401, "Your current password is not correct.");
    }
    if (newPassword.length < 8) {
      throw httpError(400, "The new password must contain at least 8 characters.");
    }
    if (currentPassword === newPassword) {
      throw httpError(400, "Choose a new password that is different from the current password.");
    }

    const db = await getDb();
    const changedAt = nowIso();
    const updatedUser = await db.collection("users").findOneAndUpdate(
      { _id: req.user._id },
      { $set: { passwordHash: hashPassword(newPassword), passwordChangedAt: changedAt, updatedAt: changedAt }, $inc: { sessionVersion: 1 } },
      { returnDocument: "after" }
    );
    const token = signToken({ role: "user", email: updatedUser.email, sv: Number(updatedUser.sessionVersion || 0) }, 60 * 60 * 24 * 7);
    res.json({ ok: true, token, user: publicUser(updatedUser), message: "Password changed successfully." });
  } catch (error) {
    next(error);
  }
});

app.get("/api/referrals/dashboard", requireUser, async (req, res, next) => {
  try {
    const db = await getDb();
    const partner = await db.collection("users").findOne({ _id: req.user._id });
    const code = partner?.referralCode || "";
    const origin = FRONTEND_URLS[0] || "https://metabinary.com";

    if (!code) {
      return res.json({
        ok: true,
        active: false,
        commissionRate: REFERRAL_COMMISSION_PERCENT,
        totalEarned: 0,
        referralBalance: roundMoney(partner?.partnerBalance || 0),
        totalReferrals: 0,
        activeDepositors: 0,
        totalReferredDeposits: 0,
        referrals: [],
        commissions: [],
      });
    }

    const referredUsers = await db.collection("users")
      .find({ referredByEmail: partner.email })
      .project({ fullName: 1, name: 1, email: 1, createdAt: 1, status: 1 })
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray();

    const referredEmails = referredUsers.map((item) => cleanEmail(item.email)).filter(Boolean);
    const depositTotals = referredEmails.length
      ? await db.collection("deposits").aggregate([
          { $match: { email: { $in: referredEmails }, status: "COMPLETED", credited: true } },
          {
            $group: {
              _id: "$email",
              totalDeposited: { $sum: "$amountUsd" },
              depositCount: { $sum: 1 },
              lastDepositAt: { $max: "$completedAt" },
            },
          },
        ]).toArray()
      : [];

    const depositByEmail = new Map(depositTotals.map((item) => [cleanEmail(item._id), item]));
    const commissions = await db.collection("transactions")
      .find({ email: partner.email, method: "Referral", type: "referral-commission", status: "COMPLETED" })
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    const totalEarned = roundMoney(
      commissions.reduce((sum, item) => sum + Number(item.amount || 0), 0)
    );
    const totalReferredDeposits = roundMoney(
      depositTotals.reduce((sum, item) => sum + Number(item.totalDeposited || 0), 0)
    );

    const referrals = referredUsers.map((item) => {
      const deposits = depositByEmail.get(cleanEmail(item.email)) || {};
      return {
        id: String(item._id || ""),
        name: item.fullName || item.name || "MetaBinary trader",
        email: maskEmail(item.email),
        joinedAt: item.createdAt || "",
        status: String(item.status || "active").toLowerCase(),
        depositCount: Number(deposits.depositCount || 0),
        totalDeposited: roundMoney(deposits.totalDeposited || 0),
        lastDepositAt: deposits.lastDepositAt || "",
      };
    });

    res.json({
      ok: true,
      active: true,
      code,
      link: `${origin}/?ref=${encodeURIComponent(code)}`,
      commissionRate: Number(partner.referralCommissionRate ?? REFERRAL_COMMISSION_PERCENT),
      totalEarned,
      referralBalance: roundMoney(partner.partnerBalance || 0),
      totalReferrals: referredUsers.length,
      activeDepositors: depositTotals.length,
      totalReferredDeposits,
      referrals,
      commissions: commissions.map((item) => ({
        id: item.id || String(item._id || ""),
        amount: roundMoney(item.amount || 0),
        sourceEmail: maskEmail(item.sourceEmail || String(item.details || "").split(" from ")[1] || ""),
        reference: item.reference || "",
        createdAt: item.createdAt || "",
        status: item.status || "COMPLETED",
      })),
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
    const name = cleanText(
      user.fullName || user.name || req.body.name || "MetaBinary User",
      120
    );
    const requestedMethod = String(req.body.method || "mpesa")
      .trim()
      .toLowerCase();
    const method = ["mpesa", "card", "pesapal"].includes(requestedMethod)
      ? requestedMethod
      : "mpesa";
    const amountUsd = Number(req.body.amountUsd);
    const requestId = cleanText(
      req.body.requestId || makeId("client"),
      120
    );

    if (!Number.isFinite(amountUsd) || amountUsd < MIN_DEPOSIT_USD) {
      throw httpError(
        400,
        `Minimum deposit is ${MIN_DEPOSIT_USD} USD.`
      );
    }

    const existing = await db
      .collection("deposits")
      .findOne({ email, requestId });

    if (existing) {
      return res.json(await responseForDeposit(db, existing));
    }

    const amountKes = Math.max(1, Math.round(amountUsd * USD_RATE));
    const depositId = makeId("dep");
    const merchantReference = depositId.slice(0, 50);
    const rawPhone = req.body.phone || user.phone || "";
    const phone = rawPhone ? normalizeKenyanPhone(rawPhone) : "";

    if (
      String(process.env.SIMULATE_PAYMENTS || "false").toLowerCase() ===
      "true"
    ) {
      const deposit = {
        id: depositId,
        requestId,
        apiRef: merchantReference,
        merchantReference,
        invoiceId: `SIM-${depositId}`,
        orderTrackingId: `SIM-${depositId}`,
        email,
        method,
        phone,
        amountUsd: roundMoney(amountUsd),
        amountKes,
        status: "COMPLETED",
        credited: true,
        provider: "simulation",
        providerResponse: { simulated: true },
        createdAt: nowIso(),
        updatedAt: nowIso(),
        completedAt: nowIso(),
      };

      await db.collection("deposits").insertOne(deposit);
      await db.collection("users").updateOne(
        { email },
        {
          $inc: { realBalance: Number(deposit.amountUsd) },
          $set: { updatedAt: nowIso() },
        }
      );
      await db.collection("transactions").insertOne({
        id: makeId("tx"),
        email,
        type: "deposit",
        amount: Number(deposit.amountUsd),
        amountKes,
        method: "Simulation",
        reference: deposit.orderTrackingId,
        status: "COMPLETED",
        createdAt: nowIso(),
      });

      return res
        .status(201)
        .json(await responseForDeposit(db, deposit));
    }

    if (method === "mpesa") {
      if (!phone) {
        throw httpError(
          400,
          "Enter the Safaricom M-PESA phone number that should receive the STK Push."
        );
      }

      const accountReference = cleanText(
        user.accountId || user.brokerId || "MetaBinary",
        12
      );

      const providerResponse = await startMpesaStkPush({
        amountKes,
        phone,
        accountReference,
      });

      const merchantRequestId = String(
        providerResponse?.MerchantRequestID || ""
      ).trim();
      const checkoutRequestId = String(
        providerResponse?.CheckoutRequestID || ""
      ).trim();

      if (!merchantRequestId || !checkoutRequestId) {
        throw httpError(
          502,
          providerErrorMessage(providerResponse) ||
            "Safaricom did not return a valid STK Push request."
        );
      }

      const deposit = {
        id: depositId,
        requestId,
        apiRef: merchantReference,
        merchantReference,
        invoiceId: checkoutRequestId,
        orderTrackingId: checkoutRequestId,
        checkoutRequestId,
        merchantRequestId,
        email,
        method: "mpesa",
        paymentMethod: "M-PESA",
        phone,
        amountUsd: roundMoney(amountUsd),
        amountKes,
        currency: "KES",
        status: "PENDING",
        credited: false,
        provider: "mpesa",
        providerResponse,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };

      await db.collection("deposits").insertOne(deposit);

      return res.status(201).json({
        ...(await responseForDeposit(db, deposit)),
        message:
          "STK Push sent. Check your phone and enter your M-PESA PIN to complete the deposit.",
      });
    }

    // Keep Pesapal available for card payments if its credentials are configured.
    ensurePaymentKeys();
    const notificationId = await getPesapalIpnId(db);
    const [firstName = "MetaBinary", ...restNames] = name
      .split(/\s+/)
      .filter(Boolean);
    const lastName = restNames.join(" ") || "User";
    const callbackUrl = `${PUBLIC_BACKEND_URL}/api/pesapal/callback?embedded=1`;
    const cancellationUrl = `${FRONTEND_PUBLIC_URL}/?payment=cancelled`;

    const providerResponse = await pesapalRequest(
      "/api/Transactions/SubmitOrderRequest",
      {
        method: "POST",
        body: {
          id: merchantReference,
          currency: "KES",
          amount: amountKes,
          description: `MetaBinary account deposit ${depositId}`.slice(
            0,
            100
          ),
          callback_url: callbackUrl,
          cancellation_url: cancellationUrl,
          redirect_mode: "PARENT_WINDOW",
          notification_id: notificationId,
          branch: "MetaBinary",
          billing_address: {
            email_address: email,
            phone_number: phone,
            country_code: "KE",
            first_name: firstName,
            middle_name: "",
            last_name: lastName,
            line_1: "",
            line_2: "",
            city: "",
            state: "",
            postal_code: "",
            zip_code: "",
          },
        },
      }
    );

    const orderTrackingId = String(
      providerResponse?.order_tracking_id || ""
    ).trim();
    const checkoutUrl = String(
      providerResponse?.redirect_url || ""
    ).trim();

    if (!orderTrackingId || !checkoutUrl) {
      throw httpError(
        502,
        "Pesapal did not return a valid checkout session."
      );
    }

    const deposit = {
      id: depositId,
      requestId,
      apiRef: merchantReference,
      merchantReference,
      invoiceId: orderTrackingId,
      orderTrackingId,
      checkoutUrl,
      email,
      method,
      phone,
      amountUsd: roundMoney(amountUsd),
      amountKes,
      currency: "KES",
      status: "PENDING",
      credited: false,
      provider: "pesapal",
      providerResponse,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    await db.collection("deposits").insertOne(deposit);

    return res.status(201).json({
      ...(await responseForDeposit(db, deposit)),
      message:
        "Continue to the secure Pesapal checkout to complete the card payment.",
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


// -----------------------------------------------------------------------------
// Zentora Kenya public M-PESA STK checkout routes
// These routes intentionally do NOT require MetaBinary user/admin authentication.
// They are limited to customer checkout use. COD charges the fixed KSh190 delivery fee.
// -----------------------------------------------------------------------------
app.post("/api/mpesa/order-payment", async (req, res, next) => {
  try {
    const paymentMode = cleanText(req.body?.paymentMode || "cod", 20).toLowerCase();
    const phone = normalizeKenyanPhone(req.body?.phone);
    const customerName = cleanText(req.body?.name || "Zentora Customer", 120);
    const variantId = cleanText(req.body?.variantId || "", 80);
    const quantity = Math.max(1, Math.min(20, Number(req.body?.quantity || 1)));
    const productTitle = cleanText(req.body?.productTitle || "Zentora Order", 120);
    const productHandle = cleanText(req.body?.productHandle || "", 120);

    // COD is the live checkout currently used on Zentora: KSh190 delivery fee now.
    // Full-payment mode requires a verified server-side Shopify total, which this
    // MetaBinary backend does not currently have, so do not trust a browser-supplied total.
    if (paymentMode !== "cod") {
      throw httpError(
        400,
        "Pay Full is temporarily unavailable. Please choose Cash on Delivery and pay the KSh190 delivery fee by M-PESA."
      );
    }

    const amountKes = 190;
    const accountReference = `ZENTORA${Date.now()}`.slice(-12);

    console.info("[ZENTORA STK] request", {
      paymentMode,
      phone: phone.slice(0, 6) + "****" + phone.slice(-2),
      amountKes,
      variantId,
      quantity,
    });

    const providerResponse = await startMpesaStkPush({
      amountKes,
      phone,
      accountReference,
    });

    const merchantRequestId = String(providerResponse?.MerchantRequestID || "").trim();
    const checkoutRequestId = String(providerResponse?.CheckoutRequestID || "").trim();

    if (!checkoutRequestId) {
      throw httpError(
        502,
        providerErrorMessage(providerResponse) ||
          "Safaricom did not return a CheckoutRequestID."
      );
    }

    const db = await getDb();
    await db.collection("zentoraPayments").insertOne({
      checkoutRequestId,
      merchantRequestId,
      phone,
      amountKes,
      paymentMode,
      customerName,
      variantId,
      quantity,
      productTitle,
      productHandle,
      city: cleanText(req.body?.city || "", 100),
      address: cleanText(req.body?.address || "", 240),
      email: cleanEmail(req.body?.email || ""),
      status: "PENDING",
      providerResponse,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });

    console.info("[ZENTORA STK] accepted", {
      checkoutRequestId,
      merchantRequestId,
      amountKes,
    });

    return res.status(201).json({
      ok: true,
      checkoutRequestId,
      merchantRequestId,
      amountKes,
      status: "pending",
      message: "STK Push sent. Check your phone and enter your M-PESA PIN.",
    });
  } catch (error) {
    console.error("[ZENTORA STK] order-payment error", error?.message || error);
    next(error);
  }
});

app.post("/api/mpesa/stkpush", async (req, res, next) => {
  try {
    const phone = normalizeKenyanPhone(req.body?.phone);
    const amountKes = 190;
    const accountReference = cleanText(
      req.body?.orderRef || `ZENTORA${Date.now()}`,
      12
    ) || "ZENTORA";

    console.info("[ZENTORA STK] legacy request", {
      phone: phone.slice(0, 6) + "****" + phone.slice(-2),
      amountKes,
    });

    const providerResponse = await startMpesaStkPush({
      amountKes,
      phone,
      accountReference,
    });

    const merchantRequestId = String(providerResponse?.MerchantRequestID || "").trim();
    const checkoutRequestId = String(providerResponse?.CheckoutRequestID || "").trim();

    if (!checkoutRequestId) {
      throw httpError(
        502,
        providerErrorMessage(providerResponse) ||
          "Safaricom did not return a CheckoutRequestID."
      );
    }

    const db = await getDb();
    await db.collection("zentoraPayments").insertOne({
      checkoutRequestId,
      merchantRequestId,
      phone,
      amountKes,
      paymentMode: "cod",
      status: "PENDING",
      providerResponse,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });

    console.info("[ZENTORA STK] legacy accepted", {
      checkoutRequestId,
      merchantRequestId,
    });

    return res.status(201).json({
      ok: true,
      checkoutRequestId,
      merchantRequestId,
      amountKes,
      status: "pending",
      message: "STK Push sent. Check your phone and enter your M-PESA PIN.",
    });
  } catch (error) {
    console.error("[ZENTORA STK] stkpush error", error?.message || error);
    next(error);
  }
});

app.get("/api/mpesa/status/:checkoutRequestId", async (req, res, next) => {
  try {
    const checkoutRequestId = cleanText(req.params.checkoutRequestId, 120);
    if (!checkoutRequestId) {
      throw httpError(400, "CheckoutRequestID is required.");
    }

    const db = await getDb();
    const payment = await db.collection("zentoraPayments").findOne({ checkoutRequestId });

    // ZENTORA_FAST_DB_STATUS_V18
    // Safaricom callback can arrive before the next STK Query. Return the saved
    // callback result instantly so Shopify changes from "Waiting" without delay.
    if (payment) {
      const savedStatus = String(payment.status || "").toUpperCase();
      if (["PAID", "COMPLETED", "SUCCESS", "SUCCESSFUL"].includes(savedStatus)) {
        return res.json({
          ok: true,
          status: "paid",
          checkoutRequestId,
          receipt:
            payment.confirmationCode ||
            payment.mpesaReceiptNumber ||
            payment.callbackMetadata?.MpesaReceiptNumber ||
            "",
          message: payment.resultDesc || "M-PESA payment confirmed.",
          balanceOnDelivery: payment.paymentMode === "cod" ? null : 0,
        });
      }
      if (["FAILED", "FAILURE", "CANCELLED", "CANCELED", "REVERSED", "EXPIRED"].includes(savedStatus)) {
        return res.json({
          ok: true,
          status: "failed",
          checkoutRequestId,
          message: payment.resultDesc || "M-PESA payment was not completed.",
        });
      }
    }

    let providerResponse;
    try {
      providerResponse = await queryMpesaStkPush(checkoutRequestId);
    } catch (error) {
      const message = providerErrorMessage(error) || error?.message || "M-PESA status check failed.";
      if (isMpesaStillProcessing(message)) {
        return res.json({
          ok: true,
          status: "pending",
          checkoutRequestId,
          message,
        });
      }
      throw error;
    }

    const rawResultCode = pickFirst(
      providerResponse?.ResultCode,
      providerResponse?.resultCode,
      providerResponse?.errorCode
    );
    const resultDesc = String(
      pickFirst(providerResponse?.ResultDesc, providerResponse?.resultDesc) || ""
    );

    let status = "pending";
    if (rawResultCode !== undefined && rawResultCode !== null && rawResultCode !== "") {
      const code = String(rawResultCode);
      if (code === "0") status = "paid";
      else if (!isMpesaStillProcessing(resultDesc)) status = "failed";
    }

    if (payment) {
      await db.collection("zentoraPayments").updateOne(
        { checkoutRequestId },
        {
          $set: {
            status: status.toUpperCase(),
            providerStatusResponse: providerResponse,
            resultCode: rawResultCode === undefined ? "" : String(rawResultCode),
            resultDesc,
            updatedAt: nowIso(),
          },
        }
      );
    }

    return res.json({
      ok: true,
      status,
      checkoutRequestId,
      message: resultDesc || (status === "pending" ? "Waiting for M-PESA confirmation." : ""),
      balanceOnDelivery: payment?.paymentMode === "cod" ? null : 0,
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/mpesa/callback", async (req, res) => {
  const stkCallback =
    req.body?.Body?.stkCallback ||
    req.body?.body?.stkCallback ||
    req.body?.stkCallback ||
    {};

  const merchantRequestId = String(
    stkCallback?.MerchantRequestID || ""
  ).trim();
  const checkoutRequestId = String(
    stkCallback?.CheckoutRequestID || ""
  ).trim();
  const resultCode = String(stkCallback?.ResultCode ?? "");
  const resultDesc = String(stkCallback?.ResultDesc || "");
  const metadata = mpesaCallbackMetadata(stkCallback);

  try {
    if (!checkoutRequestId && !merchantRequestId) {
      console.warn("M-PESA callback received without request IDs.");
      return res.status(200).json({
        ResultCode: 0,
        ResultDesc: "Accepted",
      });
    }

    const db = await getDb();
    const clauses = [];

    if (checkoutRequestId) {
      clauses.push(
        { checkoutRequestId },
        { orderTrackingId: checkoutRequestId },
        { invoiceId: checkoutRequestId }
      );
    }

    if (merchantRequestId) {
      clauses.push({ merchantRequestId });
    }

    let deposit = await db
      .collection("deposits")
      .findOne({ $or: clauses });


if (!deposit) {
      // ZENTORA_FAST_CALLBACK_V18
      // Zentora checkout payments live in their own collection. Process their
      // Daraja callback immediately instead of waiting for repeated STK queries.
      const zentoraPayment = await db
        .collection("zentoraPayments")
        .findOne({ $or: clauses });

      if (zentoraPayment) {
        const paidAmount = Number(metadata.Amount);
        const expectedAmount = Number(zentoraPayment.amountKes);
        const receipt = String(metadata.MpesaReceiptNumber || "").trim();
        const callbackPhone = String(metadata.PhoneNumber || "").trim();
        const transactionDate = String(metadata.TransactionDate || "").trim();

        let zentoraStatus =
          resultCode === "0" ? "PAID" : mpesaFailureStatus(resultCode);
        let verificationError = "";

        if (
          resultCode === "0" &&
          Number.isFinite(paidAmount) &&
          Number.isFinite(expectedAmount) &&
          Math.abs(paidAmount - expectedAmount) > 0.01
        ) {
          zentoraStatus = "PAYMENT_REVIEW";
          verificationError =
            "M-PESA callback amount did not match the requested Zentora amount.";
        }

        await db.collection("zentoraPayments").updateOne(
          { _id: zentoraPayment._id },
          {
            $set: {
              status: zentoraStatus,
              merchantRequestId:
                merchantRequestId || zentoraPayment.merchantRequestId || "",
              checkoutRequestId:
                checkoutRequestId || zentoraPayment.checkoutRequestId || "",
              providerCallback: req.body,
              callbackMetadata: metadata,
              resultCode,
              resultDesc,
              confirmationCode:
                receipt || zentoraPayment.confirmationCode || "",
              mpesaReceiptNumber:
                receipt || zentoraPayment.mpesaReceiptNumber || "",
              paymentAccount:
                callbackPhone || zentoraPayment.phone || "",
              verifiedAmountKes: Number.isFinite(paidAmount)
                ? paidAmount
                : null,
              transactionDate,
              verificationError,
              paidAt:
                resultCode === "0" && !verificationError
                  ? nowIso()
                  : zentoraPayment.paidAt || null,
              updatedAt: nowIso(),
            },
          }
        );

        console.info("[ZENTORA STK] callback", {
          checkoutRequestId,
          resultCode,
          status: zentoraStatus,
          hasReceipt: Boolean(receipt),
        });

        return res.status(200).json({
          ResultCode: 0,
          ResultDesc: "Accepted",
        });
      }

      console.warn(
        `M-PESA callback could not match a deposit: ${checkoutRequestId || merchantRequestId}`
      );
      return res.status(200).json({
        ResultCode: 0,
        ResultDesc: "Accepted",
      });
    }

    const paidAmount = Number(metadata.Amount);
    const expectedAmount = Number(deposit.amountKes);
    const receipt = String(metadata.MpesaReceiptNumber || "").trim();
    const callbackPhone = String(metadata.PhoneNumber || "").trim();
    const transactionDate = String(metadata.TransactionDate || "").trim();

    let status =
      resultCode === "0" ? "COMPLETED" : mpesaFailureStatus(resultCode);
    let verificationError = "";

    if (
      resultCode === "0" &&
      Number.isFinite(paidAmount) &&
      Number.isFinite(expectedAmount) &&
      Math.abs(paidAmount - expectedAmount) > 0.01
    ) {
      status = "PAYMENT_REVIEW";
      verificationError =
        "M-PESA callback amount did not match the requested deposit amount.";
    }

    console.info("M-PESA callback received", {
      depositId: deposit.id,
      resultCode,
      resultDesc,
      hasReceipt: Boolean(receipt),
      paidAmount: Number.isFinite(paidAmount) ? paidAmount : null,
    });

    const update = {
      merchantRequestId:
        merchantRequestId || deposit.merchantRequestId || "",
      checkoutRequestId:
        checkoutRequestId || deposit.checkoutRequestId || "",
      orderTrackingId:
        checkoutRequestId || deposit.orderTrackingId || "",
      invoiceId: checkoutRequestId || deposit.invoiceId || "",
      providerCallback: req.body,
      callbackMetadata: metadata,
      resultCode,
      resultDesc,
      status,
      paymentMethod: "M-PESA",
      confirmationCode: receipt || deposit.confirmationCode || "",
      paymentAccount: callbackPhone || deposit.phone || "",
      verifiedAmountKes: Number.isFinite(paidAmount)
        ? paidAmount
        : null,
      verifiedCurrency: "KES",
      transactionDate,
      verificationError,
      updatedAt: nowIso(),
    };

    await db
      .collection("deposits")
      .updateOne({ id: deposit.id }, { $set: update });

    deposit = { ...deposit, ...update };

    if (
      resultCode === "0" &&
      !verificationError
    ) {
      await creditDepositOnce(db, deposit, "COMPLETED");
    }

    return res.status(200).json({
      ResultCode: 0,
      ResultDesc: "Accepted",
    });
  } catch (error) {
    console.error("M-PESA callback processing error:", error);
    return res.status(500).json({
      ResultCode: 1,
      ResultDesc: "Temporary processing failure",
    });
  }
});

async function pesapalIpn(req, res) {
  const notification = pesapalNotificationValues(req);
  try {
    if (!notification.orderTrackingId && !notification.merchantReference) {
      return res.status(400).json({
        orderNotificationType: notification.notificationType,
        orderTrackingId: notification.orderTrackingId,
        orderMerchantReference: notification.merchantReference,
        status: 500,
      });
    }

    const db = await getDb();
    let deposit = await findDepositByProviderReference(
      db,
      notification.orderTrackingId,
      notification.merchantReference
    );

    if (deposit) {
      if (notification.orderTrackingId && !deposit.orderTrackingId) {
        await db.collection("deposits").updateOne(
          { id: deposit.id },
          {
            $set: {
              orderTrackingId: notification.orderTrackingId,
              invoiceId: notification.orderTrackingId,
              updatedAt: nowIso(),
            },
          }
        );
        deposit = { ...deposit, orderTrackingId: notification.orderTrackingId, invoiceId: notification.orderTrackingId };
      }
      await reconcileDeposit(db, deposit);
    }

    return res.json({
      orderNotificationType: notification.notificationType || "IPNCHANGE",
      orderTrackingId: notification.orderTrackingId,
      orderMerchantReference: notification.merchantReference,
      status: 200,
    });
  } catch (error) {
    console.error("Pesapal IPN error:", error);
    return res.status(500).json({
      orderNotificationType: notification.notificationType || "IPNCHANGE",
      orderTrackingId: notification.orderTrackingId,
      orderMerchantReference: notification.merchantReference,
      status: 500,
    });
  }
}

app.get("/api/pesapal/ipn", pesapalIpn);
app.post("/api/pesapal/ipn", pesapalIpn);
app.post("/api/payment/callback", pesapalIpn);

app.get("/api/pesapal/callback", async (req, res, next) => {
  try {
    const notification = pesapalNotificationValues(req);
    const db = await getDb();
    let deposit = await findDepositByProviderReference(
      db,
      notification.orderTrackingId,
      notification.merchantReference
    );
    if (deposit) deposit = await reconcileDeposit(db, deposit);

    const paymentStatus = String(deposit?.status || "pending").toLowerCase();
    const embedded = String(req.query?.embedded || "") === "1";

    if (embedded) {
      let targetOrigin = "*";
      try {
        targetOrigin = new URL(FRONTEND_PUBLIC_URL).origin;
      } catch {
        // Keep wildcard only as a fallback for a malformed public frontend URL.
      }

      const payload = {
        type: "metabinary:pesapal:return",
        status: paymentStatus,
        depositId: deposit?.id || "",
        orderTrackingId: notification.orderTrackingId || "",
      };
      const safePayload = JSON.stringify(payload).replace(/</g, "\u003c");
      const safeOrigin = JSON.stringify(targetOrigin);

      return res
        .status(200)
        .type("html")
        .send(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>MetaBinary Payment</title>
  <style>
    html,body{margin:0;min-height:100%;font-family:Inter,Arial,sans-serif;background:#0d1625;color:#fff}
    body{display:grid;place-items:center;padding:24px;box-sizing:border-box}
    .card{max-width:460px;text-align:center;padding:34px;border:1px solid rgba(255,255,255,.12);border-radius:20px;background:#101b2e}
    .icon{width:64px;height:64px;margin:0 auto 18px;border-radius:50%;display:grid;place-items:center;background:#0b8f52;font-size:34px;font-weight:900}
    h1{font-size:24px;margin:0 0 10px}.muted{color:#9aabc2;line-height:1.5}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">âœ“</div>
    <h1>Payment received</h1>
    <div class="muted">MetaBinary is confirming your deposit. You can keep this payment window open for a moment.</div>
  </div>
  <script>
    (function(){
      var payload = ${safePayload};
      var targetOrigin = ${safeOrigin};
      try { if (window.parent && window.parent !== window) window.parent.postMessage(payload, targetOrigin); } catch (e) {}
      try { if (window.top && window.top !== window) window.top.postMessage(payload, targetOrigin); } catch (e) {}
    })();
  </script>
</body>
</html>`);
    }

    const redirectUrl = new URL(FRONTEND_PUBLIC_URL);
    redirectUrl.searchParams.set("payment", paymentStatus);
    if (deposit?.id) redirectUrl.searchParams.set("depositId", deposit.id);
    if (notification.orderTrackingId) redirectUrl.searchParams.set("orderTrackingId", notification.orderTrackingId);
    return res.redirect(302, redirectUrl.toString());
  } catch (error) {
    next(error);
  }
});

app.post("/api/withdraw", requireUser, async (req, res, next) => {
  try {
    const db = await getDb();
    const email = cleanEmail(req.user.email);
    const amountUsd = Number(req.body.amountUsd);
    const requestId = cleanText(req.body.requestId || makeId("client"), 120);
    const phone = normalizeKenyanPhone(req.body.phone || req.user.phone);

    if (!Number.isFinite(amountUsd) || amountUsd < MIN_WITHDRAW_USD) {
      throw httpError(400, `Minimum withdrawal is ${MIN_WITHDRAW_USD} USD.`);
    }
    if (amountUsd > MAX_WITHDRAW_USD) {
      throw httpError(400, `Maximum withdrawal is ${MAX_WITHDRAW_USD} USD.`);
    }

    const existing = await db.collection("withdrawals").findOne({ email, requestId });
    if (existing) {
      const current = await db.collection("users").findOne({ email });
      return res.json({
        ok: !["FAILED", "REJECTED", "CANCELLED"].includes(existing.status),
        withdrawalId: existing.id,
        status: existing.status,
        realBalance: roundMoney(current?.realBalance),
        message: existing.message || "Withdrawal already submitted.",
      });
    }

    const updatedUser = await db.collection("users").findOneAndUpdate(
      { email, status: { $nin: ["banned", "suspended"] }, realBalance: { $gte: amountUsd } },
      { $inc: { realBalance: -amountUsd }, $set: { updatedAt: nowIso() } },
      { returnDocument: "after" }
    );
    const userAfterDebit = updatedUser?.value || updatedUser;
    if (!userAfterDebit) throw httpError(400, "Insufficient real-account balance.");

    const withdrawalId = makeId("wd");
    const amountKes = Math.max(1, Math.round(amountUsd * USD_RATE));
    const createdAt = nowIso();
    const withdrawal = {
      id: withdrawalId,
      requestId,
      email,
      phone,
      method: "mpesa",
      amountUsd: roundMoney(amountUsd),
      amountKes,
      status: "PENDING",
      refunded: false,
      provider: "manual-processing",
      message: "Withdrawal request submitted for processing.",
      createdAt,
      updatedAt: createdAt,
    };
    await db.collection("withdrawals").insertOne(withdrawal);
    await db.collection("transactions").insertOne({
      id: makeId("tx"),
      email,
      type: "withdrawal",
      method: "M-Pesa",
      amount: -amountUsd,
      amountKes: -amountKes,
      status: "PENDING",
      reference: withdrawalId,
      createdAt,
    });

    return res.status(201).json({
      ok: true,
      withdrawalId,
      status: "PENDING",
      amountUsd,
      amountKes,
      realBalance: roundMoney(userAfterDebit?.realBalance),
      message: withdrawal.message,
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/withdrawals", requireAdmin, async (req, res, next) => {
  try {
    const db = await getDb();
    const status = cleanText(req.query.status || "", 30).toUpperCase();
    const query = status && status !== "ALL" ? { status } : {};
    const withdrawals = await db.collection("withdrawals").find(query).sort({ createdAt: -1 }).limit(500).toArray();
    res.json({ ok: true, withdrawals });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/withdrawals/:id/complete", requireAdmin, async (req, res, next) => {
  try {
    const db = await getDb();
    const withdrawal = await db.collection("withdrawals").findOneAndUpdate(
      { id: req.params.id, status: "PENDING" },
      { $set: { status: "PROCESSING", updatedAt: nowIso() } },
      { returnDocument: "before" }
    );
    if (!withdrawal) throw httpError(409, "Withdrawal was already processed or was not found.");

    const completedAt = nowIso();
    await db.collection("withdrawals").updateOne(
      { id: withdrawal.id },
      { $set: { status: "COMPLETED", completedAt, message: "Withdrawal completed.", updatedAt: completedAt } }
    );
    await db.collection("transactions").updateOne(
      { email: withdrawal.email, type: "withdrawal", reference: withdrawal.id },
      { $set: { status: "COMPLETED" } }
    );
    await auditAdmin(db, req, "complete-withdrawal", withdrawal.email, { withdrawalId: withdrawal.id, amountUsd: withdrawal.amountUsd });
    res.json({ ok: true, status: "COMPLETED", message: "Withdrawal marked as completed." });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/withdrawals/:id/reject", requireAdmin, async (req, res, next) => {
  try {
    const db = await getDb();
    const rejectedAt = nowIso();
    const withdrawal = await db.collection("withdrawals").findOneAndUpdate(
      { id: req.params.id, status: "PENDING", refunded: { $ne: true } },
      { $set: { status: "REJECTING", refunded: true, updatedAt: rejectedAt } },
      { returnDocument: "before" }
    );
    if (!withdrawal) throw httpError(409, "Withdrawal was already processed or was not found.");
    await db.collection("users").updateOne(
      { email: withdrawal.email },
      { $inc: { realBalance: Number(withdrawal.amountUsd) }, $set: { updatedAt: rejectedAt } }
    );
    await db.collection("transactions").insertOne({
        id: makeId("tx"),
        email: withdrawal.email,
        type: "withdrawal-refund",
        method: "M-Pesa",
        amount: Number(withdrawal.amountUsd),
        amountKes: Number(withdrawal.amountKes),
        status: "COMPLETED",
        reference: withdrawal.id,
        createdAt: rejectedAt,
    });

    await db.collection("withdrawals").updateOne(
      { id: withdrawal.id },
      {
        $set: {
          status: "REJECTED",
          refunded: true,
          rejectedAt,
          rejectionReason: cleanText(req.body?.reason || "Rejected by administrator", 300),
          message: "Withdrawal rejected and balance restored.",
          updatedAt: rejectedAt,
        },
      }
    );
    await db.collection("transactions").updateOne(
      { email: withdrawal.email, type: "withdrawal", reference: withdrawal.id },
      { $set: { status: "REJECTED" } }
    );
    await auditAdmin(db, req, "reject-withdrawal", withdrawal.email, { withdrawalId: withdrawal.id, amountUsd: withdrawal.amountUsd });
    const user = await db.collection("users").findOne({ email: withdrawal.email });
    res.json({ ok: true, status: "REJECTED", realBalance: roundMoney(user?.realBalance), message: "Withdrawal rejected and balance restored." });
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
    const requestedStopLoss = Number(req.body?.stopLoss || 0);
    const requestedTakeProfit = Number(req.body?.takeProfit || 0);
    const stopLoss = Number.isFinite(requestedStopLoss) && requestedStopLoss > 0 ? requestedStopLoss : 0;
    const takeProfit = Number.isFinite(requestedTakeProfit) && requestedTakeProfit > 0 ? requestedTakeProfit : 0;
    const clientPrice = Number(req.body?.marketPrice || 0);
    const requestedSource = String(req.body?.source || "manual").trim().toLowerCase();
    const source = requestedSource === "ai" ? "ai" : "manual";
    const strategy = cleanText(req.body?.strategy || "", 100);

    if (!["Buy", "Sell"].includes(side)) throw httpError(400, "Choose Buy or Sell.");
    if (!Number.isFinite(volume) || volume < 0.001 || volume > 10) throw httpError(400, "Volume must be between 0.001 and 10 lots.");
    if (!Number.isFinite(leverageValue) || leverageValue < 10 || leverageValue > 1000) throw httpError(400, "Leverage must be between 1:10 and 1:1000.");

    const quote = await fetchTrustedMarketQuote(instrument, {
      allowClientFallback: account === "demo",
      clientPrice,
    });
    const providerMarketOpen = quote?.isMarketOpen ?? quote?.is_market_open;
    const sessionOpen = market.alwaysOpen || providerMarketOpen === true || marketIsOpen(market);
    if (!sessionOpen && account === "real") {
      throw httpError(400, `${market.label} is outside the weekday trading session.`);
    }

    const halfSpread = Number(market.spread || 0) / 2;
    const openPrice = Number((side === "Buy" ? quote.price + halfSpread : quote.price - halfSpread).toFixed(market.decimals));
    const stopLossOk = stopLoss <= 0 || (side === "Buy" ? stopLoss < openPrice : stopLoss > openPrice);
    const takeProfitOk = takeProfit <= 0 || (side === "Buy" ? takeProfit > openPrice : takeProfit < openPrice);
    if (!stopLossOk) throw httpError(400, "Stop Loss is on the wrong side of the market price.");
    if (!takeProfitOk) throw httpError(400, "Take Profit is on the wrong side of the market price.");

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
      source,
      strategy,
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
      method: source === "ai" ? "ai-forex" : "forex",
      account,
      amount: 0,
      status: "OPEN",
      reference: id,
      details: `${side} ${instrument} Â· ${volume} lot Â· margin ${margin.toFixed(2)} USD`,
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
      details: `${position.side} ${position.instrument} Â· ${position.volume} lot`,
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
    const requestedTicks = Math.max(1, Math.floor(Number(req.body?.ticks || 5)));
    const ticks = Math.min(type === "Rise/Fall" ? 300 : 10, requestedTicks);
    const stake = roundMoney(req.body?.stake);
    const entryPrice = Number(req.body?.entryPrice || 0);
    const currentPrice = Number(req.body?.currentPrice || entryPrice || 0);
    const barrier = Number(req.body?.barrier || 0);
    const barrierDistance = Math.max(0, Number(req.body?.barrierDistance || 0));
    const marketStep = Math.max(0.000001, Number(req.body?.marketStep || 0.0002));
    const market = cleanText(req.body?.market || "Volatility 100 (1s) Index", 100);
    const syntheticMarket = resolveSyntheticMarket(req.body?.marketId, market);
    const marketId = syntheticMarket.id;
    const requestedSource = String(req.body?.source || "manual").trim().toLowerCase();
    const source = ["bot", "ai"].includes(requestedSource) ? requestedSource : "manual";
    const strategy = cleanText(req.body?.strategy || "", 100);
    const requestId = cleanText(req.body?.requestId || "", 120);

    if (requestId) {
      const existingTrade = await db.collection("trades").findOne({
        email: req.user.email,
        requestId,
      });

      if (existingTrade) {
        const currentUser = await db.collection("users").findOne({ _id: req.user._id });
        const existingBalanceField = existingTrade.account === "real" ? "realBalance" : "demoBalance";
        return res.status(200).json({
          ok: true,
          trade: publicTrade(existingTrade),
          user: publicUser(currentUser || req.user),
          balance: roundMoney((currentUser || req.user)?.[existingBalanceField]),
          restored: true,
          message: "Trade restored.",
        });
      }
    }

    if (!allowedTradeActions(type).includes(action)) throw httpError(400, "Choose a valid trade action.");
    if (!Number.isFinite(stake) || stake < 0.3) throw httpError(400, "Minimum stake is 0.30 USD.");

    if (account === "real") {
      if (stake > MAX_REAL_STAKE_USD) throw httpError(400, `Maximum real-account stake is ${MAX_REAL_STAKE_USD.toFixed(2)} USD.`);
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const [openCount, recentTrade, daily] = await Promise.all([
        db.collection("trades").countDocuments({ email: req.user.email, account: "real", status: "RUNNING" }),
        db.collection("trades").findOne({ email: req.user.email, account: "real" }, { sort: { createdAt: -1 } }),
        db.collection("trades").aggregate([
          { $match: { email: req.user.email, account: "real", createdAt: { $gte: since } } },
          { $group: { _id: null, total: { $sum: "$stake" } } },
        ]).toArray(),
      ]);
      if (openCount >= MAX_OPEN_REAL_TRADES) throw httpError(429, `Only ${MAX_OPEN_REAL_TRADES} real trades may be open at once.`);
      if (recentTrade && Date.now() - Date.parse(recentTrade.createdAt) < REAL_TRADE_COOLDOWN_MS) throw httpError(429, "Wait a moment before opening another real trade.");
      if (Number(daily[0]?.total || 0) + stake > MAX_REAL_DAILY_STAKE_USD) throw httpError(429, "Daily real-account stake limit reached.");
    }

    const multiplier = tradeMultiplier(type, action, prediction, { ticks, barrierDistance });
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
    const tradeTickMs = source === "bot" ? BOT_TRADE_TICK_MS : source === "ai" ? AI_TRADE_TICK_MS : TRADE_TICK_MS;
    const settleAt = new Date(Date.now() + ticks * tradeTickMs).toISOString();
    const trade = {
      id,
      email: req.user.email,
      ...(requestId ? { requestId } : {}),
      account,
      type,
      action,
      prediction,
      ticks,
      stake,
      multiplier,
      payout: roundMoney(stake * multiplier),
      entryPrice,
      currentPrice,
      barrier,
      barrierDistance,
      marketStep,
      touched: false,
      marketId,
      market: syntheticMarket.label,
      source,
      strategy,
      status: "RUNNING",
      createdAt,
      settleAt,
      tickMs: tradeTickMs,
      ticksConsumed: 0,
      lastTickDigit: null,
      settledAt: "",
      nextTickAt: new Date(Date.now() + tradeTickMs).toISOString(),
      serverResultDigit: crypto.randomInt(0, 10),
      serverDirection: crypto.randomInt(0, 2) === 1 ? 1 : -1,
      serverTouched: crypto.randomInt(0, 1_000_000) / 1_000_000 < estimatedTouchProbability(ticks, barrierDistance),
    };

    try {
      await db.collection("trades").insertOne(trade);
    } catch (error) {
      await db.collection("users").updateOne(
        { _id: req.user._id },
        { $inc: { [balanceField]: stake }, $set: { updatedAt: nowIso() } }
      );

      if (error?.code === 11000 && requestId) {
        const existingTrade = await db.collection("trades").findOne({
          email: req.user.email,
          requestId,
        });
        const currentUser = await db.collection("users").findOne({ _id: req.user._id });

        if (existingTrade) {
          const existingBalanceField = existingTrade.account === "real" ? "realBalance" : "demoBalance";
          return res.status(200).json({
            ok: true,
            trade: publicTrade(existingTrade),
            user: publicUser(currentUser || req.user),
            balance: roundMoney((currentUser || req.user)?.[existingBalanceField]),
            restored: true,
            message: "Trade restored.",
          });
        }
      }

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
    const requestId = cleanText(req.body?.requestId || "", 120);
    let trade = await db.collection("trades").findOne({ id, email: req.user.email });
    if (!trade) throw httpError(404, "Trade was not found.");

    if (trade.status === "SETTLED") {
      const final = await finalizeTradeWithDigit(db, req.user, trade, trade.resultDigit);
      return res.json({ ok: true, settled: true, digit: final.resultDigit, resultDigit: final.resultDigit, won: final.won, remainingTicks: 0, currentPrice: Number(final.trade.currentPrice || final.trade.entryPrice), touched: Boolean(final.trade.touched), trade: publicTrade(final.trade), user: publicUser(final.user), balance: final.balance, message: final.won ? "Trade won." : "Trade lost." });
    }

    const totalTicks = Math.min(trade.type === "Rise/Fall" ? 300 : 10, Math.max(1, Number(trade.ticks || 1)));

    const nextTickAtMs = Date.parse(trade.nextTickAt || trade.createdAt) || 0;
    if (Date.now() + 50 < nextTickAtMs) {
      return res.status(429).json({ ok: false, remainingMs: nextTickAtMs - Date.now(), message: "The next server tick is not ready." });
    }

    if (requestId && trade.lastTickRequestId === requestId) {
      const consumed = Math.max(0, Number(trade.ticksConsumed || 0));
      const remainingTicks = Math.max(0, totalTicks - consumed);
      return res.json({
        ok: true,
        settled: false,
        replayed: true,
        digit: Number(trade.lastTickDigit),
        currentPrice: Number(trade.currentPrice || trade.entryPrice || 0),
        touched: Boolean(trade.touched),
        remainingTicks,
        totalTicks,
        trade: publicTrade(trade),
        message: `${remainingTicks} tick${remainingTicks === 1 ? "" : "s"} remaining.`,
      });
    }

    const previousPrice = Number(trade.currentPrice || trade.entryPrice || 1);
    const syntheticMarket = resolveSyntheticMarket(trade.marketId, trade.market);
    const sharedSlot = Math.floor(Date.now() / 1000);
    const isFinalTick = Number(trade.ticksConsumed || 0) + 1 >= totalTicks;
    const publicPrice = syntheticPriceAt(syntheticMarket, sharedSlot);
    const nextPrice = isFinalTick && trade.type === "Rise/Fall"
      ? Number((Number(trade.entryPrice || previousPrice) + Number(trade.serverDirection || 1) * Math.max(Number(trade.marketStep || 0.0002), 0.000001)).toFixed(6))
      : publicPrice;
    const digit = isFinalTick ? Number(trade.serverResultDigit) : syntheticDigitAt(syntheticMarket, sharedSlot);
    const barrier = Number(trade.barrier || 0);
    const crossedBarrier = barrier > 0 && ((previousPrice <= barrier && nextPrice >= barrier) || (previousPrice >= barrier && nextPrice <= barrier));
    const touched = trade.type === "Touch/No Touch" && isFinalTick
      ? Boolean(trade.serverTouched)
      : Boolean(trade.touched || crossedBarrier);

    const tickSet = {
      lastTickDigit: digit,
      currentPrice: nextPrice,
      touched,
      updatedAt: nowIso(),
      nextTickAt: new Date(Date.now() + Math.max(1, Number(trade.tickMs || TRADE_TICK_MS))).toISOString(),
      ...(requestId ? { lastTickRequestId: requestId } : {}),
    };

    const advanced = await db.collection("trades").findOneAndUpdate(
      { _id: trade._id, status: "RUNNING", $or: [{ ticksConsumed: { $exists: false } }, { ticksConsumed: { $lt: totalTicks } }] },
      { $inc: { ticksConsumed: 1 }, $set: tickSet },
      { returnDocument: "after" }
    );

    if (!advanced) throw httpError(409, "This tick has already been counted.");
    const consumed = Math.max(0, Number(advanced.ticksConsumed || 0));
    const remainingTicks = Math.max(0, totalTicks - consumed);
    const touchFinishedEarly = advanced.type === "Touch/No Touch" && touched;

    if (remainingTicks > 0 && !touchFinishedEarly) {
      return res.json({ ok: true, settled: false, digit, currentPrice: nextPrice, touched, remainingTicks, totalTicks, trade: publicTrade(advanced), message: `${remainingTicks} tick${remainingTicks === 1 ? "" : "s"} remaining.` });
    }

    const final = await finalizeTradeWithDigit(db, req.user, advanced, digit);
    return res.json({ ok: true, settled: true, digit: final.resultDigit, resultDigit: final.resultDigit, won: final.won, currentPrice: Number(final.trade.currentPrice || nextPrice), touched: Boolean(final.trade.touched), remainingTicks: 0, totalTicks, trade: publicTrade(final.trade), user: publicUser(final.user), balance: final.balance, message: final.won ? "Trade won." : "Trade lost." });
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

    if (trade.status !== "SETTLED") {
      const remainingMs = new Date(trade.settleAt).getTime() - Date.now();
      if (remainingMs > 0) {
        return res.status(409).json({
          ok: false,
          remainingMs,
          message: "Trade is still running.",
        });
      }
    }

    if (trade.status !== "SETTLED" && Number(trade.ticksConsumed || 0) === 0 && !["Even/Odd", "Matches/Differs", "Over/Under"].includes(trade.type)) {
      const syntheticMarket = resolveSyntheticMarket(trade.marketId, trade.market);
      const sharedSlot = Math.floor(Date.now() / 1000);
      const marketPrice = syntheticPriceAt(syntheticMarket, sharedSlot);
      const sharedPrice = trade.type === "Rise/Fall"
        ? Number((Number(trade.entryPrice || marketPrice) + Number(trade.serverDirection || 1) * Math.max(Number(trade.marketStep || 0.0002), 0.000001)).toFixed(6))
        : marketPrice;
      const previousPrice = Number(trade.currentPrice || trade.entryPrice || sharedPrice);
      const barrier = Number(trade.barrier || 0);
      const sharedTouched = trade.type === "Touch/No Touch"
        ? Boolean(trade.serverTouched)
        : barrier > 0 && ((previousPrice <= barrier && sharedPrice >= barrier) || (previousPrice >= barrier && sharedPrice <= barrier));

      await db.collection("trades").updateOne(
        { _id: trade._id },
        {
          $set: {
            currentPrice: sharedPrice,
            touched: Boolean(trade.touched || sharedTouched),
            updatedAt: nowIso(),
          },
        }
      );
      trade.currentPrice = sharedPrice;
      trade.touched = Boolean(trade.touched || sharedTouched);
    }
    const resultDigit = Number.isInteger(trade.serverResultDigit)
      ? trade.serverResultDigit
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

app.get("/api/support/current", requireUser, async (req, res, next) => {
  try {
    const db = await getDb();
    const ticket = await db.collection("supportTickets")
      .findOne({ email: req.user.email, status: { $in: ["open", "waiting", "agent-replied"] } }, { sort: { updatedAt: -1 } });
    res.json({ ok: true, ticket: ticket ? publicSupportTicket(ticket) : null });
  } catch (error) {
    next(error);
  }
});

app.post("/api/support/tickets", requireUser, async (req, res, next) => {
  try {
    const db = await getDb();
    const existing = await db.collection("supportTickets")
      .findOne({ email: req.user.email, status: { $in: ["open", "waiting", "agent-replied"] } }, { sort: { updatedAt: -1 } });
    if (existing) return res.json({ ok: true, ticket: publicSupportTicket(existing), message: "Your existing support conversation is still open." });

    const category = cleanText(req.body?.category || "other", 40).toLowerCase();
    const body = cleanText(req.body?.message, 1200);
    const page = cleanText(req.body?.page, 80);
    const account = cleanText(req.body?.account, 20);
    const rawMetadata = req.body?.metadata && typeof req.body.metadata === "object" ? req.body.metadata : {};
    if (body.length < 5) throw httpError(400, "Explain what you need help with.");

    const createdAt = nowIso();
    const ticket = {
      id: makeId("support"),
      email: req.user.email,
      fullName: req.user.fullName || req.user.name || "MetaBinary user",
      accountId: req.user.accountId || req.user.brokerId || "",
      category: ["wallet", "trading", "ai", "account", "other"].includes(category) ? category : "other",
      subject: `${category || "Support"} help request`,
      status: "waiting",
      priority: "normal",
      page,
      account,
      metadata: {
        screen: cleanText(rawMetadata.screen, 40),
        viewport: cleanText(rawMetadata.viewport, 40),
        timezone: cleanText(rawMetadata.timezone, 80),
        userAgent: cleanText(rawMetadata.userAgent, 300),
        build: cleanText(rawMetadata.build, 100),
      },
      messages: [
        { id: makeId("msg"), sender: "assistant", body: "I collected your request and connected you to a MetaBinary support agent.", createdAt },
        { id: makeId("msg"), sender: "user", body, createdAt },
      ],
      createdAt,
      updatedAt: createdAt,
      agentRepliedAt: "",
      closedAt: "",
    };
    await db.collection("supportTickets").insertOne(ticket);
    res.status(201).json({ ok: true, ticket: publicSupportTicket(ticket), message: "Support conversation created." });
  } catch (error) {
    next(error);
  }
});

app.post("/api/support/tickets/:id/messages", requireUser, async (req, res, next) => {
  try {
    const db = await getDb();
    const body = cleanText(req.body?.message, 1200);
    if (!body) throw httpError(400, "Write a message first.");
    const ticket = await db.collection("supportTickets").findOne({ id: req.params.id, email: req.user.email });
    if (!ticket) throw httpError(404, "Support conversation was not found.");
    if (ticket.status === "closed") throw httpError(400, "This conversation is closed. Start a new conversation.");
    const createdAt = nowIso();
    const nextMessage = { id: makeId("msg"), sender: "user", body, createdAt };
    await db.collection("supportTickets").updateOne(
      { _id: ticket._id },
      { $push: { messages: nextMessage }, $set: { status: "waiting", updatedAt: createdAt } }
    );
    const updated = await db.collection("supportTickets").findOne({ _id: ticket._id });
    res.json({ ok: true, ticket: publicSupportTicket(updated) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/support", requireAdmin, async (req, res, next) => {
  try {
    const db = await getDb();
    const status = cleanText(req.query.status || "", 30).toLowerCase();
    const query = status && status !== "all" ? { status } : {};
    const tickets = await db.collection("supportTickets").find(query).sort({ updatedAt: -1 }).limit(500).toArray();
    res.json({ ok: true, tickets: tickets.map(publicSupportTicket) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/support/:id", requireAdmin, async (req, res, next) => {
  try {
    const db = await getDb();
    const ticket = await db.collection("supportTickets").findOne({ id: req.params.id });
    if (!ticket) throw httpError(404, "Support conversation was not found.");
    res.json({ ok: true, ticket: publicSupportTicket(ticket) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/admin/support/:id/reply", requireAdmin, async (req, res, next) => {
  try {
    const db = await getDb();
    const body = cleanText(req.body?.message, 1200);
    if (!body) throw httpError(400, "Write a reply first.");
    const ticket = await db.collection("supportTickets").findOne({ id: req.params.id });
    if (!ticket) throw httpError(404, "Support conversation was not found.");
    const createdAt = nowIso();
    const message = { id: makeId("msg"), sender: "agent", senderEmail: req.admin.email, body, createdAt };
    await db.collection("supportTickets").updateOne(
      { _id: ticket._id },
      { $push: { messages: message }, $set: { status: "agent-replied", agentRepliedAt: createdAt, updatedAt: createdAt, assignedTo: req.admin.email } }
    );
    await auditAdmin(db, req, "support-reply", ticket.email, { ticketId: ticket.id });
    const updated = await db.collection("supportTickets").findOne({ _id: ticket._id });
    res.json({ ok: true, ticket: publicSupportTicket(updated), message: "Reply sent." });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/admin/support/:id/status", requireAdmin, async (req, res, next) => {
  try {
    const db = await getDb();
    const status = cleanText(req.body?.status, 30).toLowerCase();
    if (!["open", "waiting", "agent-replied", "closed"].includes(status)) throw httpError(400, "Choose a valid support status.");
    const ticket = await db.collection("supportTickets").findOne({ id: req.params.id });
    if (!ticket) throw httpError(404, "Support conversation was not found.");
    const changedAt = nowIso();
    await db.collection("supportTickets").updateOne(
      { _id: ticket._id },
      { $set: { status, updatedAt: changedAt, closedAt: status === "closed" ? changedAt : "" } }
    );
    await auditAdmin(db, req, "support-status", ticket.email, { ticketId: ticket.id, status });
    const updated = await db.collection("supportTickets").findOne({ _id: ticket._id });
    res.json({ ok: true, ticket: publicSupportTicket(updated), message: `Support conversation marked ${status}.` });
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
    const [totalUsers, activeUsers, bannedUsers, deposits, withdrawals, openSupportTickets] = await Promise.all([
      db.collection("users").countDocuments({}),
      db.collection("users").countDocuments({ status: { $nin: ["banned", "suspended"] } }),
      db.collection("users").countDocuments({ status: "banned" }),
      db.collection("deposits").aggregate([{ $match: { credited: true } }, { $group: { _id: null, total: { $sum: "$amountUsd" } } }]).toArray(),
      db.collection("withdrawals").aggregate([{ $match: { status: { $nin: ["FAILED", "CANCELLED"] } } }, { $group: { _id: null, total: { $sum: "$amountUsd" } } }]).toArray(),
      db.collection("supportTickets").countDocuments({ status: { $ne: "closed" } }),
    ]);
    res.json({
      ok: true,
      stats: {
        totalUsers,
        activeUsers,
        bannedUsers,
        totalDeposits: roundMoney(deposits[0]?.total),
        totalWithdrawals: roundMoney(withdrawals[0]?.total),
        openSupportTickets,
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
    const limit = Math.min(1000, Math.max(5, Number(req.query.limit || 100)));
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
  console.log(`MetaBinary backend running on port ${PORT} (Daraja: ${DARAJA_ENV}, MongoDB: ${MONGODB_DB})`);
});
