import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import "./OwnerAnalysisPage.css";
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

function Stat({ label, value }) {
  return (
    <div className="ownerAnalysisStat">
      <div className="ownerAnalysisStatLabel">{label}</div>
      <div className="ownerAnalysisStatValue">{value}</div>
    </div>
  );
}

export default function OwnerAnalysisPage() {
  const [marketId, setMarketId] = useState("vol75");
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("CONNECTING");
  const [updatedAt, setUpdatedAt] = useState(0);

  const requestRef = useRef(null);

  const analysis = useMemo(() => {
    if (!snapshot) return null;

    try {
      return analyzeMarket(snapshot);
    } catch (err) {
      console.error("Owner analysis error:", err);
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

      if (!snapshot) {
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

      setError(
        err?.message || "Unable to connect to market feed"
      );

      setStatus("OFFLINE");
    }
  }, [marketId, snapshot]);

  useEffect(() => {
    setSnapshot(null);
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
  }, [marketId]); // deliberately reload only when market changes

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
                Read-only market statistics and setup scoring
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
                    ? `${analysis.parity.evenPercent.toFixed(
                        1
                      )}% / ${analysis.parity.oddPercent.toFixed(
                        1
                      )}%`
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
                    ? `${analysis.threshold2.overPercent.toFixed(
                        1
                      )}%`
                    : "—"
                }
              />

              <Stat
                label="Under 2"
                value={
                  analysis
                    ? `${analysis.threshold2.underPercent.toFixed(
                        1
                      )}%`
                    : "—"
                }
              />

              <Stat
                label="Momentum"
                value={analysis?.momentum?.direction || "—"}
              />

              <Stat
                label="Volatility"
                value={analysis?.volatility?.label || "—"}
              />

              <Stat
                label="Highest digit"
                value={
                  analysis?.bestDigit
                    ? `${analysis.bestDigit.digit} (${analysis.bestDigit.percent.toFixed(
                        1
                      )}%)`
                    : "—"
                }
              />

              <Stat
                label="Lowest digit"
                value={
                  analysis?.coldDigit
                    ? `${analysis.coldDigit.digit} (${analysis.coldDigit.percent.toFixed(
                        1
                      )}%)`
                    : "—"
                }
              />

              <Stat
                label="Confidence"
                value={
                  analysis
                    ? `${analysis.confidence.toFixed(0)}% ${
                        analysis.confidenceLabel
                      }`
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
              Read-only statistical analysis. A setup is not
              a guaranteed winning trade.
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}