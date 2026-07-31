import {
  digitDistribution,
  parityStats,
  thresholdStats,
  lastDigitStreak,
  digitEntropy,
  recentVsBaseline,
} from "./digitAnalysis";

import {
  priceMomentum,
  volatilityScore,
  confidenceScore,
  confidenceLabel,
} from "./marketScore";

export function analyzeMarket(snapshot = {}) {
  const digitHistory = Array.isArray(snapshot.digitHistory)
    ? snapshot.digitHistory
        .map((value) => Number(value))
        .filter(
          (value) =>
            Number.isInteger(value) &&
            value >= 0 &&
            value <= 9
        )
    : [];

  const prices = Array.isArray(snapshot.prices)
    ? snapshot.prices
        .map((value) => Number(value))
        .filter(Number.isFinite)
    : [];

  const distribution = digitDistribution(digitHistory);
  const parity = parityStats(digitHistory);

  const threshold2 = thresholdStats(
    digitHistory,
    2
  );

  const streak = lastDigitStreak(digitHistory);
  const entropy = digitEntropy(digitHistory);

  const recency = recentVsBaseline(
    digitHistory,
    20
  );

  const momentum = priceMomentum(
    prices,
    35
  );

  const volatility = volatilityScore(
    prices.slice(-180)
  );

  const parityEdge =
    Number(parity.evenPercent || 0) -
    Number(parity.oddPercent || 0);

  const thresholdEdge =
    Number(threshold2.overPercent || 0) -
    Number(threshold2.underPercent || 0);

  const confidence = confidenceScore({
    parityEdge,
    thresholdEdge,
    entropyNormalized: Number(
      entropy.normalized || 0
    ),
    volatility: Number(
      volatility.score || 0
    ),
    momentumPercent: Number(
      momentum.percent || 0
    ),
  });

  const sortedHot = [...distribution].sort(
    (a, b) =>
      Number(b.percent || 0) -
        Number(a.percent || 0) ||
      a.digit - b.digit
  );

  const sortedCold = [...distribution].sort(
    (a, b) =>
      Number(a.percent || 0) -
        Number(b.percent || 0) ||
      a.digit - b.digit
  );

  const bestDigit = sortedHot[0] || null;
  const coldDigit = sortedCold[0] || null;

  const parityBias =
    parityEdge >= 6
      ? "EVEN"
      : parityEdge <= -6
      ? "ODD"
      : "BALANCED";

  const thresholdBias =
    thresholdEdge >= 10
      ? "OVER 2"
      : thresholdEdge <= -10
      ? "UNDER 2"
      : "BALANCED";

  const label = confidenceLabel(confidence);

  const setup =
    digitHistory.length >= 50 &&
    label !== "LOW" &&
    (
      parityBias !== "BALANCED" ||
      thresholdBias !== "BALANCED"
    )
      ? "POSSIBLE SETUP"
      : "WAIT";

  const suppliedLastDigit =
    Number(snapshot.lastDigit);

  const lastDigit =
    Number.isInteger(suppliedLastDigit) &&
    suppliedLastDigit >= 0 &&
    suppliedLastDigit <= 9
      ? suppliedLastDigit
      : digitHistory.length
      ? digitHistory[digitHistory.length - 1]
      : null;

  const suppliedPrice =
    Number(snapshot.currentPrice);

  const currentPrice =
    Number.isFinite(suppliedPrice)
      ? suppliedPrice
      : prices.length
      ? prices[prices.length - 1]
      : 0;

  return {
    sampleSize: digitHistory.length,

    currentPrice,
    lastDigit,

    distribution,
    parity,
    threshold2,

    streak,
    entropy,
    recency,
    momentum,
    volatility,

    bestDigit,
    coldDigit,

    parityBias,
    thresholdBias,

    confidence,
    confidenceLabel: label,

    setup,
  };
}