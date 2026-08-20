
import { useMemo } from "react";
import "./OwnerAutoBotPanel.css";
import {
  DEFAULT_OWNER_BOT_CONFIG,
  normalizeOwnerBotConfig,
  computeOwnerBotStake,
} from "./ownerBotEngine";

const TYPES = [
  "Even/Odd",
  "Over/Under",
  "Matches/Differs",
  "Rise/Fall",
];

function NumberInput({ label, value, onChange, min, max, step = 1, disabled = false }) {
  return (
    <label className="ownerBotField">
      <span>{label}</span>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

export default function OwnerAutoBotPanel({
  config = DEFAULT_OWNER_BOT_CONFIG,
  runtime,
  analysis,
  onConfigChange,
  onStart,
  onStop,
}) {
  const cfg = normalizeOwnerBotConfig(config);

  const liveStake = useMemo(
    () => computeOwnerBotStake(cfg, runtime),
    [cfg, runtime]
  );

  const update = (patch) => {
    onConfigChange?.(
      normalizeOwnerBotConfig({
        ...cfg,
        ...patch,
      })
    );
  };

  const running = Boolean(runtime?.running);

  return (
    <section className="ownerBotPanel">
      <div className="ownerBotPanelTop">
        <div>
          <small>OWNER ONLY</small>
          <h2>Analysis Auto Bot</h2>
          <p>
            Trades only when Owner Analysis passes the selected confidence gate.
          </p>
        </div>

        <div className={`ownerBotState ${running ? "running" : ""}`}>
          {running ? "SCANNING" : "STOPPED"}
        </div>
      </div>

      <div className="ownerBotGrid">
        <label className="ownerBotField">
          <span>Contract</span>
          <select
            value={cfg.contractType}
            disabled={running}
            onChange={(event) =>
              update({ contractType: event.target.value })
            }
          >
            {TYPES.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </label>

        <NumberInput
          label="Exact base stake (USD)"
          value={cfg.baseStake}
          min={0.3}
          step={0.1}
          disabled={running}
          onChange={(baseStake) => update({ baseStake })}
        />

        <NumberInput
          label="Ticks"
          value={cfg.ticks}
          min={1}
          max={10}
          disabled={running}
          onChange={(ticks) => update({ ticks })}
        />

        <NumberInput
          label="Minimum confidence %"
          value={cfg.minConfidence}
          min={50}
          max={99}
          disabled={running}
          onChange={(minConfidence) => update({ minConfidence })}
        />

        <label className="ownerBotToggle">
          <span>Martingale</span>
          <input
            type="checkbox"
            checked={cfg.martingaleEnabled}
            disabled={running}
            onChange={(event) =>
              update({
                martingaleEnabled: event.target.checked,
              })
            }
          />
        </label>

        <NumberInput
          label="Multiplier"
          value={cfg.martingaleMultiplier}
          min={1}
          max={10}
          step={0.1}
          disabled={running || !cfg.martingaleEnabled}
          onChange={(martingaleMultiplier) =>
            update({ martingaleMultiplier })
          }
        />

        <NumberInput
          label="Max martingale steps"
          value={cfg.martingaleMaxSteps}
          min={0}
          max={10}
          disabled={running || !cfg.martingaleEnabled}
          onChange={(martingaleMaxSteps) =>
            update({ martingaleMaxSteps })
          }
        />

        <NumberInput
          label="Take profit (USD)"
          value={cfg.takeProfit}
          min={0}
          step={1}
          disabled={running}
          onChange={(takeProfit) => update({ takeProfit })}
        />

        <NumberInput
          label="Stop loss (USD)"
          value={cfg.stopLoss}
          min={0}
          step={1}
          disabled={running}
          onChange={(stopLoss) => update({ stopLoss })}
        />
      </div>

      <div className="ownerBotRuntime">
        <div>
          <span>Base stake</span>
          <strong>{cfg.baseStake.toFixed(2)} USD</strong>
        </div>
        <div>
          <span>Next stake</span>
          <strong>{liveStake.toFixed(2)} USD</strong>
        </div>
        <div>
          <span>P/L</span>
          <strong>{Number(runtime?.pnl || 0).toFixed(2)} USD</strong>
        </div>
        <div>
          <span>W / L</span>
          <strong>
            {Number(runtime?.wins || 0)} / {Number(runtime?.losses || 0)}
          </strong>
        </div>
        <div>
          <span>Last signal</span>
          <strong>{runtime?.lastSignal || "WAIT"}</strong>
        </div>
        <div>
          <span>Confidence</span>
          <strong>{Math.round(Number(runtime?.lastConfidence || 0))}%</strong>
        </div>
      </div>

      <div className="ownerBotMessage">
        {runtime?.lastReason ||
          "Waiting for a high-confidence Owner Analysis setup."}
      </div>

      <div className="ownerBotActions">
        {!running ? (
          <button
            type="button"
            className="ownerBotStart"
            onClick={onStart}
          >
            Start Owner Bot
          </button>
        ) : (
          <button
            type="button"
            className="ownerBotStop"
            onClick={onStop}
          >
            Stop Bot
          </button>
        )}
      </div>

      <div className="ownerBotDisclaimer">
        Real trades remain market-driven. The bot does not inspect other users'
        positions and does not alter trade outcomes.
      </div>
    </section>
  );
}
