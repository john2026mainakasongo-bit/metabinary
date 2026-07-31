function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function recentAgreement(values, predicate, size = 6) {
  const recent = Array.isArray(values) ? values.slice(-size) : [];
  if (!recent.length) return 0;
  return recent.filter(predicate).length / recent.length;
}

function priceDirection(prices = [], lookback = 8) {
  const recent = prices.slice(-lookback).map(Number).filter(Number.isFinite);
  if (recent.length < 3) return "NEUTRAL";

  const first = recent[0];
  const last = recent[recent.length - 1];
  if (last > first) return "RISE";
  if (last < first) return "FALL";
  return "NEUTRAL";
}

function signalFreshness(signal, snapshot) {
  const digits = Array.isArray(snapshot?.digitHistory)
    ? snapshot.digitHistory.map(Number).filter(Number.isInteger)
    : [];
  const prices = Array.isArray(snapshot?.prices)
    ? snapshot.prices.map(Number).filter(Number.isFinite)
    : [];

  const action = String(signal?.action || "").toUpperCase();

  if (action === "EVEN") {
    return recentAgreement(digits, (d) => d % 2 === 0, 6);
  }

  if (action === "ODD") {
    return recentAgreement(digits, (d) => d % 2 !== 0, 6);
  }

  if (action === "OVER 2") {
    return recentAgreement(digits, (d) => d > 2, 6);
  }

  if (action === "UNDER 2") {
    return recentAgreement(digits, (d) => d < 2, 6);
  }

  if (action.startsWith("MATCH ")) {
    const digit = Number(action.replace("MATCH ", ""));
    return recentAgreement(digits, (d) => d === digit, 10);
  }

  if (action.startsWith("DIFFERS ")) {
    const digit = Number(action.replace("DIFFERS ", ""));
    return recentAgreement(digits, (d) => d !== digit, 10);
  }

  if (action === "RISE") {
    return priceDirection(prices, 8) === "RISE" ? 1 : 0;
  }

  if (action === "FALL") {
    return priceDirection(prices, 8) === "FALL" ? 1 : 0;
  }

  return 0;
}

export function buildEntryTiming(validated, snapshot = {}, options = {}) {
  const tickMs = Math.max(
    250,
    Number(
      snapshot?.tickMs ??
      options?.tickMs ??
      1000
    )
  );

  const requestedTradeTicks = clamp(
    options?.tradeTicks ?? 5,
    1,
    10
  );

  const best = validated?.best || null;

  if (!best || !best.approved) {
    return {
      state: "SKIP",
      label: "SKIP",
      waitTicks: null,
      approxSeconds: null,
      tradeTicks: requestedTradeTicks,
      validForTicks: 0,
      reason: "No validated setup right now.",
    };
  }

  const freshness = signalFreshness(best, snapshot);
  const sampleScore = clamp((Number(best.samples || 0) - 20) / 60, 0, 1);
  const edgeScore = clamp(Number(best.edge || 0) / 12, 0, 1);
  const lowerBoundScore = clamp(
    (Number(best.lowerBound || 0) - Number(best.baseline || 0)) / 12,
    0,
    1
  );

  const timingScore =
    freshness * 0.45 +
    sampleScore * 0.20 +
    edgeScore * 0.20 +
    lowerBoundScore * 0.15;

  let waitTicks = 0;
  let state = "ENTER_NOW";

  if (timingScore >= 0.74) {
    waitTicks = 0;
    state = "ENTER_NOW";
  } else if (timingScore >= 0.58) {
    waitTicks = 1;
    state = "WAIT";
  } else if (timingScore >= 0.46) {
    waitTicks = 2;
    state = "WAIT";
  } else {
    return {
      state: "SKIP",
      label: "SKIP",
      waitTicks: null,
      approxSeconds: null,
      tradeTicks: requestedTradeTicks,
      validForTicks: 0,
      timingScore: timingScore * 100,
      reason: "Validated historically, but current tick confirmation is weak.",
    };
  }

  const approxSeconds =
    waitTicks === 0 ? 0 : (waitTicks * tickMs) / 1000;

  // Entry window stays deliberately short so stale signals are not reused.
  const validForTicks = state === "ENTER_NOW" ? 1 : 0;

  return {
    state,
    label:
      state === "ENTER_NOW"
        ? "ENTER NOW"
        : `WAIT ${waitTicks} TICK${waitTicks === 1 ? "" : "S"}`,
    waitTicks,
    approxSeconds,
    tradeTicks: requestedTradeTicks,
    validForTicks,
    timingScore: timingScore * 100,
    reason:
      state === "ENTER_NOW"
        ? `${best.action} is validated and current ticks still confirm it.`
        : `Wait ${waitTicks} tick${waitTicks === 1 ? "" : "s"} and re-check before entry.`,
  };
}
