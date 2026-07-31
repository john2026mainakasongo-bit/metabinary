function num(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function lastDigitFromSnapshot(snapshot) {
  const history = Array.isArray(snapshot?.digitHistory) ? snapshot.digitHistory : [];
  if (history.length) {
    const d = Number(history[history.length - 1]);
    if (Number.isInteger(d) && d >= 0 && d <= 9) return d;
  }

  const price = Number(snapshot?.currentPrice ?? snapshot?.price);
  if (Number.isFinite(price)) {
    const text = String(price).replace(/[^0-9]/g, "");
    if (text) return Number(text[text.length - 1]);
  }

  return null;
}

function normalizeAction(signal) {
  return String(signal?.action || signal?.candidate || "WAIT").trim().toUpperCase();
}

function findBest(validated) {
  if (!validated) return null;
  if (validated.best?.approved) return validated.best;

  const signals = Array.isArray(validated.signals) ? validated.signals : [];
  return (
    signals
      .filter((s) => s?.approved && String(s.action || "").toUpperCase() !== "WAIT")
      .sort(
        (a, b) =>
          num(b.lowerBound) - num(a.lowerBound) ||
          num(b.edge) - num(a.edge) ||
          num(b.samples) - num(a.samples)
      )[0] || null
  );
}

function triggerForSignal(signal, snapshot) {
  const action = normalizeAction(signal);
  const currentDigit = lastDigitFromSnapshot(snapshot);

  if (!signal || !signal.approved || action === "WAIT") {
    return {
      state: "SKIP",
      setup: "—",
      trigger: "No validated setup yet",
      triggerDigit: null,
      currentDigit,
      readyNow: false,
      instruction: "WAIT. Do not enter until a validated setup appears.",
    };
  }

  if (action === "OVER 2") {
    // For an OVER 2 setup, use a reset/touch trigger near the barrier:
    // enter only after a 0/1/2 print, with 2 being the preferred touch.
    const triggerDigit = 2;
    const readyNow = currentDigit === 2;
    return {
      state: readyNow ? "ENTER NOW" : "WAIT FOR TOUCH",
      setup: "OVER 2",
      trigger: "Wait for last digit to touch 2",
      triggerDigit,
      currentDigit,
      readyNow,
      instruction: readyNow
        ? "Digit 2 touched. Enter OVER 2 on the next tick."
        : "Do not chase. Wait until the last digit prints 2, then enter OVER 2 on the next tick.",
    };
  }

  if (action === "UNDER 2") {
    // Under 2 wins only on 0/1; require a high reset before entry.
    const triggerDigit = 7;
    const readyNow = currentDigit === triggerDigit;
    return {
      state: readyNow ? "ENTER NOW" : "WAIT FOR TOUCH",
      setup: "UNDER 2",
      trigger: "Wait for last digit to touch 7",
      triggerDigit,
      currentDigit,
      readyNow,
      instruction: readyNow
        ? "Digit 7 touched. Enter UNDER 2 on the next tick."
        : "Wait for a high reset at digit 7, then enter UNDER 2 on the next tick.",
    };
  }

  if (action.startsWith("MATCH ")) {
    const target = Number(action.split(/s+/)[1]);
    const readyNow = Number.isInteger(target) && currentDigit === target;
    return {
      state: readyNow ? "ENTER NOW" : "WAIT FOR TOUCH",
      setup: action,
      trigger: Number.isInteger(target)
        ? `Wait for last digit to touch ${target}`
        : "Wait for target digit touch",
      triggerDigit: Number.isInteger(target) ? target : null,
      currentDigit,
      readyNow,
      instruction: Number.isInteger(target)
        ? readyNow
          ? `Digit ${target} touched. Enter MATCH ${target} on the next tick.`
          : `Wait until digit ${target} prints, then enter MATCH ${target} on the next tick.`
        : "Wait for the selected match digit before entry.",
    };
  }

  if (action.startsWith("DIFFERS ")) {
    const target = Number(action.split(/s+/)[1]);
    const readyNow = Number.isInteger(target) && currentDigit === target;
    return {
      state: readyNow ? "ENTER NOW" : "WAIT FOR TOUCH",
      setup: action,
      trigger: Number.isInteger(target)
        ? `Wait for last digit to touch ${target}`
        : "Wait for target digit touch",
      triggerDigit: Number.isInteger(target) ? target : null,
      currentDigit,
      readyNow,
      instruction: Number.isInteger(target)
        ? readyNow
          ? `Digit ${target} touched. Enter DIFFERS ${target} on the next tick.`
          : `Wait until digit ${target} prints, then enter DIFFERS ${target} on the next tick.`
        : "Wait for the selected differs digit before entry.",
    };
  }

  if (action === "EVEN" || action === "ODD") {
    // Require opposite parity touch before entering the validated side.
    const wantsEven = action === "EVEN";
    const currentParity =
      currentDigit == null ? null : currentDigit % 2 === 0 ? "EVEN" : "ODD";
    const opposite = wantsEven ? "ODD" : "EVEN";
    const readyNow = currentParity === opposite;

    return {
      state: readyNow ? "ENTER NOW" : "WAIT FOR RESET",
      setup: action,
      trigger: `Wait for an ${opposite} digit first`,
      triggerDigit: null,
      currentDigit,
      readyNow,
      instruction: readyNow
        ? `${opposite} reset printed. Enter ${action} on the next tick.`
        : `Wait for one ${opposite} digit, then enter ${action} on the next tick.`,
    };
  }

  if (action === "RISE" || action === "FALL") {
    // Rise/Fall is price direction, so use timing instead of a digit barrier.
    return {
      state: "ENTER ON NEXT TICK",
      setup: action,
      trigger: "Enter on the next confirmed feed tick",
      triggerDigit: null,
      currentDigit,
      readyNow: true,
      instruction: `Validated ${action}. Enter on the next confirmed tick; duration follows the selected tick duration.`,
    };
  }

  return {
    state: "WAIT",
    setup: action,
    trigger: "Wait for the configured confirmation",
    triggerDigit: null,
    currentDigit,
    readyNow: false,
    instruction: "Wait for confirmation before entry.",
  };
}

export function buildEntryTiming(validatedSignals, snapshot, options = {}) {
  const tradeTicks = Math.max(1, Math.min(10, Math.floor(num(options.tradeTicks, 5))));
  const best = findBest(validatedSignals);
  const trigger = triggerForSignal(best, snapshot);

  return {
    ...trigger,
    tradeTicks,
    tradeDuration: `${tradeTicks} tick${tradeTicks === 1 ? "" : "s"}`,
    validForTicks: trigger.readyNow ? 1 : 0,
    timingScore: trigger.readyNow ? 100 : 0,
    // Deliberately no fake seconds countdown: synthetic ticks are event based.
    countdownLabel: trigger.readyNow ? "NEXT TICK" : "WAIT",
  };
}
