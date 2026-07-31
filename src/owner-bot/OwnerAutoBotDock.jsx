import { useEffect, useMemo, useRef, useState } from "react";
import "./OwnerAutoBotDock.css";

function clamp(value, fallback, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function pickSignal(analysis) {
  if (!analysis) return null;

  const confidence = Number(analysis.confidence || 0);
  if (confidence < 80) return null;

  if (analysis.parityBias === "EVEN" || analysis.parityBias === "ODD") {
    return {
      type: "Even/Odd",
      action: analysis.parityBias,
      prediction: 0,
      confidence,
      label: analysis.parityBias,
    };
  }

  if (analysis.thresholdBias === "OVER 2" || analysis.thresholdBias === "UNDER 2") {
    return {
      type: "Over/Under",
      action: analysis.thresholdBias === "OVER 2" ? "Over" : "Under",
      prediction: 2,
      confidence,
      label: analysis.thresholdBias,
    };
  }

  const momentum = String(analysis?.momentum?.direction || "").toUpperCase();
  if (momentum === "UP" || momentum === "DOWN") {
    return {
      type: "Rise/Fall",
      action: momentum === "UP" ? "Rise" : "Fall",
      prediction: 0,
      confidence,
      label: momentum === "UP" ? "RISE" : "FALL",
    };
  }

  return null;
}

export default function OwnerAutoBotDock({ analysis, marketId }) {
  const [enabled, setEnabled] = useState(false);
  const [stake, setStake] = useState(10);
  const [ticks, setTicks] = useState(5);
  const [martingale, setMartingale] = useState(false);
  const [multiplier, setMultiplier] = useState(2);
  const [maxLevel, setMaxLevel] = useState(3);
  const [level, setLevel] = useState(0);
  const [status, setStatus] = useState("IDLE");
  const [message, setMessage] = useState("Waiting for a high-confidence setup.");
  const busyRef = useRef(false);

  const signal = useMemo(() => pickSignal(analysis), [analysis]);
  const currentStake = useMemo(
    () => Number(stake) * (martingale ? Math.pow(Number(multiplier), level) : 1),
    [stake, martingale, multiplier, level]
  );

  useEffect(() => {
    if (!enabled || !signal || busyRef.current) return;

    const run = async () => {
      const executeTrade = window.__metabinaryOwnerRunBinaryTrade;

      if (typeof executeTrade !== "function") {
        setStatus("WAIT");
        setMessage("Trading bridge is not ready.");
        return;
      }

      busyRef.current = true;
      setStatus("OPENING");
      setMessage(
        signal.type +
          " · " +
          signal.label +
          " · " +
          Number(signal.confidence).toFixed(0) +
          "% confidence"
      );

      try {
        const opened = await executeTrade(signal.type, signal.action, {
          stake: Number(currentStake),
          prediction: Number(signal.prediction || 0),
          durationTicks: Number(ticks),
          durationUnit: signal.type === "Rise/Fall" ? "seconds" : "ticks",
          durationValue: Number(ticks),
          source: "owner-analysis-bot",
          marketId,
        });

        if (!opened) {
          setStatus("WAIT");
          setMessage("Trade was not opened.");
          return;
        }

        setStatus("RUNNING");
        setMessage(
          "Trade opened with stake " +
            Number(currentStake).toFixed(2) +
            " USD."
        );
      } catch (error) {
        setStatus("ERROR");
        setMessage(error instanceof Error ? error.message : "Owner bot trade failed.");
      } finally {
        busyRef.current = false;
      }
    };

    void run();
  }, [enabled, signal, currentStake, ticks, marketId]);

  return (
    <section className="ownerAutoBotDock">
      <div className="ownerAutoBotTop">
        <div>
          <div className="ownerAutoBotTitle">Owner Auto Bot</div>
          <div className="ownerAutoBotSub">
            High-confidence entries only. Platform settlement remains unchanged.
          </div>
        </div>

        <button
          className={enabled ? "ownerAutoBotToggle on" : "ownerAutoBotToggle"}
          onClick={() => setEnabled((v) => !v)}
        >
          {enabled ? "STOP BOT" : "START BOT"}
        </button>
      </div>

      <div className="ownerAutoBotGrid">
        <label>
          <span>Base stake</span>
          <input
            type="number"
            min="0.3"
            step="0.1"
            value={stake}
            onChange={(e) => {
              setStake(clamp(e.target.value, 10, 0.3, 150000));
              setLevel(0);
            }}
          />
        </label>

        <label>
          <span>Ticks / seconds</span>
          <input
            type="number"
            min="1"
            max="10"
            value={ticks}
            onChange={(e) => setTicks(clamp(e.target.value, 5, 1, 10))}
          />
        </label>

        <label>
          <span>Martingale</span>
          <select
            value={martingale ? "on" : "off"}
            onChange={(e) => {
              setMartingale(e.target.value === "on");
              setLevel(0);
            }}
          >
            <option value="off">OFF</option>
            <option value="on">ON</option>
          </select>
        </label>

        <label>
          <span>Multiplier</span>
          <input
            type="number"
            min="1"
            max="10"
            step="0.1"
            disabled={!martingale}
            value={multiplier}
            onChange={(e) => setMultiplier(clamp(e.target.value, 2, 1, 10))}
          />
        </label>

        <label>
          <span>Max level</span>
          <input
            type="number"
            min="0"
            max="10"
            disabled={!martingale}
            value={maxLevel}
            onChange={(e) => setMaxLevel(clamp(e.target.value, 3, 0, 10))}
          />
        </label>
      </div>

      <div className="ownerAutoBotStatus">
        <div><span>Status</span><b>{status}</b></div>
        <div><span>Signal</span><b>{signal ? signal.label : "WAIT"}</b></div>
        <div><span>Next stake</span><b>{Number(currentStake).toFixed(2)} USD</b></div>
        <div><span>Level</span><b>{level}/{maxLevel}</b></div>
      </div>

      <div className="ownerAutoBotMessage">{message}</div>
    </section>
  );
}
