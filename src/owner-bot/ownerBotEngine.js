
const clamp = (value, min, max) =>
  Math.max(min, Math.min(max, Number(value) || 0));

export const OWNER_BOT_TYPES = Object.freeze([
  "Even/Odd",
  "Over/Under",
  "Matches/Differs",
  "Rise/Fall",
]);

export const DEFAULT_OWNER_BOT_CONFIG = Object.freeze({
  enabled: false,
  marketId: "vol75",
  contractType: "Even/Odd",

  // This is the exact BASE stake selected by the owner.
  baseStake: 10,

  ticks: 5,
  minConfidence: 85,

  martingaleEnabled: false,
  martingaleMultiplier: 2,
  martingaleMaxSteps: 3,

  cooldownMs: 3500,
  takeProfit: 50,
  stopLoss: 30,

  // Matches/Differs needs the signal digit returned by Owner Analysis.
  prediction: 2,
});

export function normalizeOwnerBotConfig(value = {}) {
  const next = {
    ...DEFAULT_OWNER_BOT_CONFIG,
    ...(value && typeof value === "object" ? value : {}),
  };

  next.enabled = Boolean(next.enabled);
  next.marketId = String(next.marketId || "vol75");
  next.contractType = OWNER_BOT_TYPES.includes(next.contractType)
    ? next.contractType
    : "Even/Odd";

  next.baseStake = Math.max(0.3, Number(next.baseStake || 10));
  next.ticks = Math.min(10, Math.max(1, Math.round(Number(next.ticks || 5))));
  next.minConfidence = clamp(next.minConfidence, 50, 99);

  next.martingaleEnabled = Boolean(next.martingaleEnabled);
  next.martingaleMultiplier = clamp(next.martingaleMultiplier, 1, 10);
  next.martingaleMaxSteps = Math.min(
    10,
    Math.max(0, Math.round(Number(next.martingaleMaxSteps || 0)))
  );

  next.cooldownMs = Math.max(1000, Number(next.cooldownMs || 3500));
  next.takeProfit = Math.max(0, Number(next.takeProfit || 0));
  next.stopLoss = Math.max(0, Number(next.stopLoss || 0));
  next.prediction = Math.min(9, Math.max(0, Math.round(Number(next.prediction || 0))));

  return next;
}

export function createOwnerBotRuntime(overrides = {}) {
  return {
    running: false,
    status: "Idle",

    trades: 0,
    wins: 0,
    losses: 0,

    pnl: 0,
    martingaleStep: 0,
    currentStake: 0,

    lastSignal: "WAIT",
    lastConfidence: 0,
    lastReason: "",
    lastTradeAt: 0,
    lastResultAt: 0,

    inFlight: false,
    stoppedBy: "",

    ...overrides,
  };
}

function selectSignal(analysis, contractType) {
  const signals = analysis?.signals || {};

  if (contractType === "Even/Odd") {
    return signals.parity || null;
  }

  if (contractType === "Over/Under") {
    return signals.threshold || null;
  }

  if (contractType === "Matches/Differs") {
    return signals.matchDiff || null;
  }

  if (contractType === "Rise/Fall") {
    return signals.riseFall || null;
  }

  return null;
}

export function computeOwnerBotStake(config, runtime) {
  const cfg = normalizeOwnerBotConfig(config);
  const step = Math.max(0, Number(runtime?.martingaleStep || 0));

  if (!cfg.martingaleEnabled || step <= 0) {
    return Number(cfg.baseStake.toFixed(2));
  }

  // Martingale only applies when the owner explicitly enabled it.
  // The base stake itself is never chosen by the bot.
  const amount =
    cfg.baseStake * Math.pow(cfg.martingaleMultiplier, step);

  return Number(amount.toFixed(2));
}

export function mapSignalToTrade(signal, config, analysis) {
  const cfg = normalizeOwnerBotConfig(config);
  const raw = String(signal?.signal || "WAIT").trim().toUpperCase();

  if (!raw || raw === "WAIT") return null;

  if (cfg.contractType === "Even/Odd") {
    if (raw === "EVEN" || raw === "ODD") {
      return {
        type: "Even/Odd",
        action: raw === "EVEN" ? "Even" : "Odd",
        prediction: cfg.prediction,
      };
    }
  }

  if (cfg.contractType === "Over/Under") {
    if (raw.startsWith("OVER")) {
      return {
        type: "Over/Under",
        action: "Over",
        prediction: 2,
      };
    }

    if (raw.startsWith("UNDER")) {
      return {
        type: "Over/Under",
        action: "Under",
        prediction: 2,
      };
    }
  }

  if (cfg.contractType === "Matches/Differs") {
    const signalDigit =
      Number.isInteger(Number(signal?.digit))
        ? Number(signal.digit)
        : Number.isInteger(Number(analysis?.matchDiff?.bestDigit))
        ? Number(analysis.matchDiff.bestDigit)
        : cfg.prediction;

    if (raw.startsWith("MATCH")) {
      return {
        type: "Matches/Differs",
        action: "Matches",
        prediction: signalDigit,
      };
    }

    if (raw.startsWith("DIFFERS")) {
      return {
        type: "Matches/Differs",
        action: "Differs",
        prediction: signalDigit,
      };
    }
  }

  if (cfg.contractType === "Rise/Fall") {
    if (raw === "RISE" || raw === "FALL") {
      return {
        type: "Rise/Fall",
        action: raw === "RISE" ? "Rise" : "Fall",
        prediction: cfg.prediction,
      };
    }
  }

  return null;
}

export function evaluateOwnerBotGate({
  analysis,
  config,
  runtime,
  now = Date.now(),
}) {
  const cfg = normalizeOwnerBotConfig(config);
  const rt = runtime || createOwnerBotRuntime();

  if (!cfg.enabled || !rt.running) {
    return {
      allowed: false,
      reason: "Bot is stopped",
      signal: "WAIT",
      confidence: 0,
    };
  }

  if (rt.inFlight) {
    return {
      allowed: false,
      reason: "Trade already in progress",
      signal: "WAIT",
      confidence: 0,
    };
  }

  if (
    cfg.takeProfit > 0 &&
    Number(rt.pnl || 0) >= cfg.takeProfit
  ) {
    return {
      allowed: false,
      stop: true,
      reason: "Take profit reached",
      signal: "WAIT",
      confidence: 0,
    };
  }

  if (
    cfg.stopLoss > 0 &&
    Number(rt.pnl || 0) <= -Math.abs(cfg.stopLoss)
  ) {
    return {
      allowed: false,
      stop: true,
      reason: "Stop loss reached",
      signal: "WAIT",
      confidence: 0,
    };
  }

  const sinceLast =
    now - Number(rt.lastTradeAt || 0);

  if (
    Number(rt.lastTradeAt || 0) > 0 &&
    sinceLast < cfg.cooldownMs
  ) {
    return {
      allowed: false,
      reason: "Cooldown",
      signal: "WAIT",
      confidence: 0,
    };
  }

  const selected = selectSignal(
    analysis,
    cfg.contractType
  );

  const signal = String(selected?.signal || "WAIT");
  const confidence = Number(selected?.confidence || 0);

  if (signal === "WAIT") {
    return {
      allowed: false,
      reason: selected?.detail || "Owner Analysis says WAIT",
      signal,
      confidence,
    };
  }

  if (confidence < cfg.minConfidence) {
    return {
      allowed: false,
      reason: `Confidence ${confidence.toFixed(0)}% is below ${cfg.minConfidence}%`,
      signal,
      confidence,
    };
  }

  const trade = mapSignalToTrade(
    selected,
    cfg,
    analysis
  );

  if (!trade) {
    return {
      allowed: false,
      reason: "Signal could not be mapped to a contract",
      signal,
      confidence,
    };
  }

  const stake = computeOwnerBotStake(cfg, rt);

  return {
    allowed: true,
    reason: selected?.detail || "High-confidence setup",
    signal,
    confidence,
    stake,
    ticks: cfg.ticks,
    marketId: cfg.marketId,
    trade,
  };
}

export function ownerBotAfterResult({
  config,
  runtime,
  won,
  net,
}) {
  const cfg = normalizeOwnerBotConfig(config);
  const rt = {
    ...createOwnerBotRuntime(),
    ...(runtime || {}),
  };

  const isWin = Boolean(won);
  const nextPnl = Number(rt.pnl || 0) + Number(net || 0);

  let nextStep = Number(rt.martingaleStep || 0);

  if (isWin) {
    nextStep = 0;
  } else if (
    cfg.martingaleEnabled &&
    nextStep < cfg.martingaleMaxSteps
  ) {
    nextStep += 1;
  } else {
    nextStep = 0;
  }

  return {
    ...rt,
    inFlight: false,
    status: "Scanning",
    trades: Number(rt.trades || 0) + 1,
    wins: Number(rt.wins || 0) + (isWin ? 1 : 0),
    losses: Number(rt.losses || 0) + (isWin ? 0 : 1),
    pnl: Number(nextPnl.toFixed(2)),
    martingaleStep: nextStep,
    currentStake: computeOwnerBotStake(cfg, {
      ...rt,
      martingaleStep: nextStep,
    }),
    lastResultAt: Date.now(),
  };
}
