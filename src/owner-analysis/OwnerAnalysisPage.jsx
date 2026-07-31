import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import "./OwnerAnalysisPage.css";
import { buildValidatedSignals } from "./backtestEngine";
import { buildEntryTiming } from "./entryTimingEngine";
import OwnerAutoBotDock from "../owner-bot/OwnerAutoBotDock";
import { analyzeMarket } from "./analysisEngine";

const LIVE_BACKEND = "https://metabinary-backend.onrender.com";

const MARKETS = [
  ["vol10", "V10"],
  ["vol10-1s", "V10 1s"],
  ["vol25", "V25"],
  ["vol25-1s", "V25 1s"],
  ["vol50", "V50"],
  ["vol50-1s", "V50 1s"],
  ["vol75", "V75"],
  ["vol75-1s", "V75 1s"],
  ["vol100", "V100"],
  ["vol100-1s", "V100 1s"],
];

function apiBase() {
  const envUrl = String(import.meta.env.VITE_API_URL || "").trim();

  if (envUrl) {
    return envUrl.replace(/\/+$/, "");
  }

  if (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  ) {
    return "http://localhost:5000";
  }

  return LIVE_BACKEND;
}

function Stat({ label, value, accent = "" }) {
  return (
    <div className={`ownerAnalysisStat ${accent ? `oa-${accent}` : ""}`}>
      <div className="ownerAnalysisStatLabel">{label}</div>
      <div className="ownerAnalysisStatValue">{value}</div>
    </div>
  );
}

function SignalCard({ title, signal, confidence, detail, tone = "" }) {
  const safeSignal = signal || "WAIT";
  const active = safeSignal !== "WAIT";

  return (
    <div className={`ownerAnalysisSignalCard ${active ? "active" : ""} ${tone}`}>
      <div className="ownerAnalysisSignalTop">
        <span>{title}</span>
        <strong>{active ? `${Math.round(confidence || 0)}%` : "WAIT"}</strong>
      </div>
      <div className="ownerAnalysisSignalValue">{safeSignal}</div>
      <div className="ownerAnalysisSignalDetail">{detail}</div>
    </div>
  );
}



function EntryTimingPanel({ timing, validated }) {
  if (!timing) return null;

  const bestAction = validated?.best?.action || "—";
  const isEnter = timing.state === "ENTER_NOW";
  const isWait = timing.state === "WAIT";

  return (
    <section className={`entryTimingV9 ${timing.state.toLowerCase()}`}>
      <div className="entryTimingV9Main">
        <div>
          <small>ENTRY TIMING</small>
          <strong>{timing.label}</strong>
        </div>

        <div className="entryTimingV9Setup">
          <span>Setup</span>
          <b>{bestAction}</b>
        </div>

        <div className="entryTimingV9Setup">
          <span>Trade duration</span>
          <b>{timing.tradeTicks} ticks</b>
        </div>

        <div className="entryTimingV9Setup">
          <span>Timing score</span>
          <b>{Number(timing.timingScore || 0).toFixed(0)}%</b>
        </div>
      </div>

      <div className="entryTimingV9Message">
        {isEnter && (
          <>
            Enter on the current/next tick only. Re-check if one tick passes before entry.
          </>
        )}

        {isWait && (
          <>
            Re-check after {timing.waitTicks} tick{timing.waitTicks === 1 ? "" : "s"}
            {Number.isFinite(timing.approxSeconds)
              ? ` (~${timing.approxSeconds.toFixed(1)}s at the current feed rate)`
              : ""}.
          </>
        )}

        {timing.state === "SKIP" && <>Do not enter this setup now.</>}
      </div>
    </section>
  );
}

function ValidatedSignalPanel({ data }) {
  if (!data) return null;
  return (
    <section className="validatedSignalsV8">
      <div className="validatedSignalsV8Head">
        <div>
          <strong>Validated Signals</strong>
          <span>Walk-forward backtest · no look-ahead</span>
        </div>
        <div className="validatedSignalsV8Count">{data.approvedCount} validated</div>
      </div>
      <div className="validatedSignalsV8Grid">
        {data.signals.map((signal) => (
          <div key={signal.name} className={`validatedSignalV8 ${signal.approved ? "approved" : "wait"}`}>
            <div className="validatedSignalV8Top"><span>{signal.name}</span><b>{signal.approved ? "VALIDATED" : "WAIT"}</b></div>
            <div className="validatedSignalV8Action">{signal.approved ? signal.action : "WAIT"}</div>
            <div className="validatedSignalV8Stats">
              <span>Hit rate <b>{signal.hitRate.toFixed(1)}%</b></span>
              <span>Baseline <b>{signal.baseline.toFixed(1)}%</b></span>
              <span>Edge <b>{signal.edge >= 0 ? "+" : ""}{signal.edge.toFixed(1)}%</b></span>
              <span>Samples <b>{signal.samples}</b></span>
            </div>
            <div className="validatedSignalV8Reason">{signal.reason}</div>
          </div>
        ))}
      </div>
      <div className="validatedSignalsV8Foot">
        {data.best
          ? `Best validated setup now: ${data.best.action} · historical hit rate ${data.best.hitRate.toFixed(1)}% · ${data.best.samples} samples.`
          : "No setup has enough evidence right now. WAIT is the signal."}
      </div>
    </section>
  );
}

export default function OwnerAnalysisPage() {
  const [marketId, setMarketId] = useState("vol75");
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("CONNECTING");
  const [updatedAt, setUpdatedAt] = useState(0);

  const requestRef = useRef(null);
  const snapshotRef = useRef(null);

  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  const analysis = useMemo(() => {
    if (!snapshot) return null;

    try {
      return analyzeMarket(snapshot);
    } catch (err) {
      console.error("Owner analysis error:", err);
      
  const validatedSignals = useMemo(
    () => (snapshot ? buildValidatedSignals(snapshot) : null),
    [snapshot]
  );

  const entryTiming = useMemo(
    () =>
      snapshot && validatedSignals
        ? buildEntryTiming(validatedSignals, snapshot, { tradeTicks: 5 })
        : null,
    [snapshot, validatedSignals]
  );
return null;
    }
  }, [snapshot]);

  const loadMarket = useCallback(async () => {
    if (requestRef.current) {
      requestRef.current.abort();
    }

    const controller = new AbortController();
    requestRef.current = controller;

    try {
      setError("");

      if (!snapshotRef.current) {
        setStatus("CONNECTING");
      }

      const url =
        `${apiBase()}/api/synthetic/market/` +
        `${encodeURIComponent(marketId)}?history=600`;

      const response = await fetch(url, {
        method: "GET",
        cache: "no-store",
        credentials: "omit",
        headers: {
          Accept: "application/json",
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Market feed HTTP ${response.status}`);
      }

      const payload = await response.json();

      if (!payload?.ok || !payload?.market) {
        throw new Error(
          payload?.message || "Market snapshot was not returned"
        );
      }

      const market = payload.market;

      if (
        !Array.isArray(market.prices) ||
        !Array.isArray(market.digitHistory)
      ) {
        throw new Error("Invalid market snapshot");
      }

      setSnapshot(market);
      setUpdatedAt(
        Number(
          market.updatedAt ||
            payload.serverTime ||
            Date.now()
        )
      );

      setStatus("LIVE");
    } catch (err) {
      if (err?.name === "AbortError") {
        return;
      }

      console.error("Owner market feed:", err);
      setError(err?.message || "Unable to connect to market feed");
      setStatus("OFFLINE");
    }
  }, [marketId]);

  useEffect(() => {
    setSnapshot(null);
    snapshotRef.current = null;
    setUpdatedAt(0);
    setError("");
    setStatus("CONNECTING");

    void loadMarket();

    const timer = window.setInterval(() => {
      void loadMarket();
    }, 1000);

    return () => {
      window.clearInterval(timer);
      if (requestRef.current) {
        requestRef.current.abort();
      }
    };
  }, [marketId, loadMarket]);

  const emptyDistribution = useMemo(
    () =>
      Array.from({ length: 10 }, (_, digit) => ({
        digit,
        count: 0,
        percent: 0,
      })),
    []
  );

  const distribution =
    analysis?.distribution || emptyDistribution;

  const price =
    Number.isFinite(Number(analysis?.currentPrice)) &&
    Number(analysis?.currentPrice) !== 0
      ? Number(analysis.currentPrice).toFixed(6)
      : "—";

  return (
    <div className="ownerAnalysisRoot">
      <div className="ownerAnalysisShell">
        <header className="ownerAnalysisHeader">
          <div className="ownerAnalysisBrand">
            <div className="ownerAnalysisLogo">M</div>

            <div>
              <h1 className="ownerAnalysisTitle">
                MetaBinary Owner Analysis
              </h1>

              <div className="ownerAnalysisSub">
                Read-only market statistics and high-confidence setup scoring
              </div>
            </div>
          </div>

          <div>
            <div
              className={`ownerAnalysisLive ${
                status === "OFFLINE" ? "offline" : ""
              }`}
            >
              <span className="ownerAnalysisLiveDot" />
              {status}
            </div>

            <button
              type="button"
              className="ownerAnalysisRefresh"
              onClick={() => void loadMarket()}
            >
              Refresh
            </button>
          </div>
        </header>

        <div className="ownerAnalysisMarkets">
          {MARKETS.map(([id, label]) => (
            <button
              type="button"
              key={id}
              className={`ownerAnalysisMarketButton ${
                marketId === id ? "active" : ""
              }`}
              onClick={() => setMarketId(id)}
            >
              {label}
            </button>
          ))}
        </div>

        {error && (
          <div className="ownerAnalysisError">
            {error}
          </div>
        )}

        <div className="ownerAnalysisSignalGrid">
          <SignalCard
            title="Even / Odd"
            signal={analysis?.signals?.parity?.signal}
            confidence={analysis?.signals?.parity?.confidence}
            detail={analysis?.signals?.parity?.detail || "Waiting for enough data"}
            tone="parity"
          />

          <SignalCard
            title="Over / Under 2"
            signal={analysis?.signals?.threshold?.signal}
            confidence={analysis?.signals?.threshold?.confidence}
            detail={analysis?.signals?.threshold?.detail || "Waiting for enough data"}
            tone="threshold"
          />

          <SignalCard
            title="Matches / Differs"
            signal={analysis?.signals?.matchDiff?.signal}
            confidence={analysis?.signals?.matchDiff?.confidence}
            detail={analysis?.signals?.matchDiff?.detail || "Waiting for enough data"}
            tone="match"
          />

          <SignalCard
            title="Rise / Fall"
            signal={analysis?.signals?.riseFall?.signal}
            confidence={analysis?.signals?.riseFall?.confidence}
            detail={analysis?.signals?.riseFall?.detail || "Waiting for enough data"}
            tone="direction"
          />
        </div>
      <ValidatedSignalPanel data={validatedSignals} />
      <EntryTimingPanel timing={entryTiming} validated={validatedSignals} />
<div className="ownerAnalysisGrid">
          <section className="ownerAnalysisCard">
            <div className="ownerAnalysisCardTitle">
              {snapshot?.label || marketId.toUpperCase()}
            </div>

            <div className="ownerAnalysisPriceRow">
              <div>
                <div className="ownerAnalysisPrice">
                  {price}
                </div>

                <div className="ownerAnalysisSub">
                  Updated{" "}
                  {updatedAt
                    ? new Date(updatedAt).toLocaleTimeString()
                    : "—"}
                </div>
              </div>

              <div className="ownerAnalysisDigit">
                {analysis?.lastDigit ?? "—"}
              </div>
            </div>

            <div className="ownerAnalysisDigits">
              {distribution.map((item) => (
                <div
                  className="ownerAnalysisDigitCell"
                  key={item.digit}
                >
                  <div className="ownerAnalysisDigitNumber">
                    {item.digit}
                  </div>

                  <div className="ownerAnalysisDigitPercent">
                    {Number(item.percent || 0).toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="ownerAnalysisCard">
            <div className="ownerAnalysisCardTitle">
              Analysis
            </div>

            <div className="ownerAnalysisStats">
              <Stat
                label="Even / Odd"
                value={
                  analysis
                    ? `${analysis.parity.evenPercent.toFixed(1)}% / ${analysis.parity.oddPercent.toFixed(1)}%`
                    : "—"
                }
              />

              <Stat
                label="Parity bias"
                value={analysis?.parityBias || "—"}
              />

              <Stat
                label="Over 2"
                value={
                  analysis
                    ? `${analysis.threshold2.overPercent.toFixed(1)}%`
                    : "—"
                }
              />

              <Stat
                label="Under 2"
                value={
                  analysis
                    ? `${analysis.threshold2.underPercent.toFixed(1)}%`
                    : "—"
                }
              />

              <Stat
                label="Momentum"
                value={analysis?.momentum?.direction || "—"}
              />

              <Stat
                label="Trend strength"
                value={analysis?.direction?.strengthLabel || "—"}
              />

              <Stat
                label="Volatility"
                value={analysis?.volatility?.label || "—"}
              />

              <Stat
                label="Highest digit"
                value={
                  analysis?.bestDigit
                    ? `${analysis.bestDigit.digit} (${analysis.bestDigit.percent.toFixed(1)}%)`
                    : "—"
                }
              />

              <Stat
                label="Lowest digit"
                value={
                  analysis?.coldDigit
                    ? `${analysis.coldDigit.digit} (${analysis.coldDigit.percent.toFixed(1)}%)`
                    : "—"
                }
              />

              <Stat
                label="Match candidate"
                value={
                  analysis?.matchDiff
                    ? `${analysis.matchDiff.bestDigit} (${analysis.matchDiff.bestDigitPercent.toFixed(1)}%)`
                    : "—"
                }
              />

              <Stat
                label="Differs estimate"
                value={
                  analysis?.matchDiff
                    ? `${analysis.matchDiff.differsEstimate.toFixed(1)}%`
                    : "—"
                }
              />

              <Stat
                label="Rise / Fall"
                value={
                  analysis?.direction
                    ? `${analysis.direction.riseEstimate.toFixed(0)}% / ${analysis.direction.fallEstimate.toFixed(0)}%`
                    : "—"
                }
              />

              <Stat
                label="Confidence"
                value={
                  analysis
                    ? `${analysis.confidence.toFixed(0)}% ${analysis.confidenceLabel}`
                    : "—"
                }
              />

              <Stat
                label="Samples"
                value={analysis?.sampleSize ?? "—"}
              />
            </div>

            <div
              className={`ownerAnalysisSetup ${
                analysis?.setup === "POSSIBLE SETUP"
                  ? "ready"
                  : ""
              }`}
            >
              {analysis?.setup || "WAIT"}
            </div>

            <div className="ownerAnalysisFootnote">
              High-confidence means the current statistics pass strict filters.
              It is not a guaranteed win and does not alter market outcomes.
            </div>
      </section>
      <OwnerAutoBotDock analysis={analysis} marketId={marketId} />
    </div>
  </div>
</div>
);
}