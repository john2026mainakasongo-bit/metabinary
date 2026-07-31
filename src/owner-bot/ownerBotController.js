
import {
  createOwnerBotRuntime,
  evaluateOwnerBotGate,
  ownerBotAfterResult,
  normalizeOwnerBotConfig,
} from "./ownerBotEngine";

/**
 * Thin controller for wiring Owner Analysis to the EXISTING MetaBinary trade engine.
 *
 * executeTrade(request) must be supplied by App.jsx and must use the normal
 * /api/trades/open + settle flow. This controller never changes results.
 *
 * request:
 * {
 *   type, action, prediction, stake, ticks, marketId, confidence, signal
 * }
 */
export function createOwnerBotController({
  getAnalysis,
  getConfig,
  setConfig,
  getRuntime,
  setRuntime,
  executeTrade,
  scanEveryMs = 1000,
}) {
  let timer = null;
  let stopped = true;

  const updateRuntime = (patch) => {
    const next = {
      ...createOwnerBotRuntime(),
      ...(getRuntime?.() || {}),
      ...(patch || {}),
    };
    setRuntime?.(next);
    return next;
  };

  const stop = (reason = "Stopped by owner") => {
    stopped = true;
    if (timer) {
      clearInterval(timer);
      timer = null;
    }

    updateRuntime({
      running: false,
      inFlight: false,
      status: "Stopped",
      stoppedBy: reason,
      lastReason: reason,
    });
  };

  const scan = async () => {
    if (stopped) return;

    const config = normalizeOwnerBotConfig(getConfig?.() || {});
    const runtime = getRuntime?.() || createOwnerBotRuntime();
    const analysis = getAnalysis?.();

    const gate = evaluateOwnerBotGate({
      analysis,
      config,
      runtime,
    });

    if (gate.stop) {
      stop(gate.reason);
      return;
    }

    updateRuntime({
      status: gate.allowed ? "Entry ready" : "Scanning",
      lastSignal: gate.signal || "WAIT",
      lastConfidence: Number(gate.confidence || 0),
      lastReason: gate.reason || "",
      currentStake: Number(gate.stake || runtime.currentStake || config.baseStake),
    });

    if (!gate.allowed) return;

    updateRuntime({
      inFlight: true,
      status: "Trade open",
      lastTradeAt: Date.now(),
    });

    try {
      const result = await executeTrade({
        type: gate.trade.type,
        action: gate.trade.action,
        prediction: gate.trade.prediction,
        stake: gate.stake,
        ticks: gate.ticks,
        marketId: gate.marketId,
        confidence: gate.confidence,
        signal: gate.signal,
      });

      if (!result || typeof result.won !== "boolean") {
        throw new Error(
          "executeTrade must resolve after settlement with { won, net }"
        );
      }

      const next = ownerBotAfterResult({
        config,
        runtime: {
          ...(getRuntime?.() || {}),
          inFlight: true,
          lastTradeAt: Date.now(),
        },
        won: result.won,
        net: Number(result.net || 0),
      });

      setRuntime?.(next);
    } catch (error) {
      updateRuntime({
        inFlight: false,
        status: "Execution error",
        lastReason:
          error instanceof Error
            ? error.message
            : "Trade execution failed",
      });
    }
  };

  const start = () => {
    const config = normalizeOwnerBotConfig(getConfig?.() || {});
    setConfig?.({ ...config, enabled: true });

    stopped = false;

    updateRuntime({
      running: true,
      status: "Scanning",
      stoppedBy: "",
      currentStake: config.baseStake,
      lastReason: "Waiting for a qualifying Owner Analysis signal",
    });

    void scan();

    if (timer) clearInterval(timer);
    timer = setInterval(() => void scan(), Math.max(500, scanEveryMs));
  };

  return {
    start,
    stop,
    scan,
    destroy: () => stop("Controller destroyed"),
  };
}
