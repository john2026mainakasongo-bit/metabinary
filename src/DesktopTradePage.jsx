import React from "react";

/**
 * Desktop-only MetaBinary trade workspace.
 *
 * This component is intentionally isolated from the existing mobile/tablet
 * TradePage markup. App.jsx renders it only when the viewport is >= 1024px.
 * The trading state and actions still come from the same parent logic, so the
 * desktop and mobile layouts share balances, market data and trade execution
 * without sharing their DOM structure.
 */
export default function DesktopTradePage({
  prices,
  indexValue,
  priceStep,
  tradeType,
  setTradeType,
  stake,
  setStake,
  duration,
  setDuration,
  prediction,
  setPrediction,
  lastDigit,
  digitStats,
  activeBinaryTrade,
  binaryResultFlash,
  binaryMarket,
  binaryMarketId,
  setBinaryMarketId,
  volatilityOptions,
  leftAction,
  rightAction,
  leftLabel,
  rightLabel,
  leftRate,
  rightRate,
  leftPayout,
  rightPayout,
  activeTradeEntry,
  highestDigit,
  lowestDigit,
  closedPositions,
  account,
  placeContract,
  formatMoney,
  LineChartComponent,
}) {
  const money = typeof formatMoney === "function"
    ? formatMoney
    : (value) => Number(value || 0).toFixed(2);
  const safeStake = Math.max(0.3, Number(stake) || 0.3);
  const quickStakes = [10, 25, 50, 100, 250, 500];
  const recentTrades = (Array.isArray(closedPositions) ? closedPositions : [])
    .filter((item) => !item?.account || item.account === account)
    .slice(-7)
    .reverse();

  const changeStake = (difference) => {
    setStake((current) =>
      Number(Math.max(0.3, (Number(current) || 0) + difference).toFixed(2))
    );
  };

  const openAiScanner = () => {
    const launcher = document.querySelector(".floatingAiButton.aiPage-trade");
    if (launcher) launcher.click();
  };

  const scale = Number(binaryMarket?.scale || 800);
  const chartData = prices.map((value) => value * scale);
  const chartAnchor = activeBinaryTrade && tradeType === "Rise/Fall"
    ? activeTradeEntry * scale
    : null;

  return (
    <div className="page mbDesktopTradeV81 mbDesktopTradeSplitV83">
      <aside className="mbDeskActivityV81">
        <div className="mbDeskActivityTabsV81">
          <button className="active">Open {activeBinaryTrade ? "(1)" : "(0)"}</button>
          <button type="button">Closed</button>
        </div>

        <div className="mbDeskActivityTitleV81">Recent activity</div>

        <div className="mbDeskActivityListV81">
          {activeBinaryTrade && (
            <article className="activeTrade">
              <span className="mbDeskTradeDigitV81">{lastDigit}</span>
              <div>
                <strong>{String(activeBinaryTrade.action || tradeType).toUpperCase()}</strong>
                <small>Stake {money(activeBinaryTrade.stake || safeStake)} USD</small>
              </div>
              <b>{activeBinaryTrade.remainingTicks}t</b>
            </article>
          )}

          {recentTrades.length ? (
            recentTrades.map((item, index) => {
              const itemProfit = Number(item.profit ?? item.pnl ?? item.net ?? 0);
              const won = Boolean(item.won ?? (item.result === "win") ?? itemProfit > 0);
              const label = String(item.action || item.type || (won ? "WIN" : "LOSS")).toUpperCase();
              const amount = Number(item.profit ?? item.pnl ?? item.net ?? item.payout ?? 0);
              const resultDigit = Number(item.resultDigit ?? item.digit ?? index) % 10;

              return (
                <article key={item.id || `${label}-${index}`}>
                  <span className={`mbDeskTradeDigitV81 ${won ? "won" : "lost"}`}>
                    {Number.isFinite(resultDigit) ? resultDigit : "•"}
                  </span>
                  <div>
                    <strong className={won ? "green" : "red"}>{label}</strong>
                    <small>Stake {money(item.stake || safeStake)} USD</small>
                  </div>
                  <b className={won ? "green" : "red"}>
                    {won ? "+" : "-"}{money(Math.abs(amount || Number(item.stake || safeStake)))} USD
                  </b>
                </article>
              );
            })
          ) : !activeBinaryTrade ? (
            <div className="mbDeskEmptyActivityV81">
              <span>◎</span>
              <strong>No recent trades</strong>
              <small>Your completed trades will appear here.</small>
            </div>
          ) : null}
        </div>

        <button
          className="mbDeskHistoryBtnV81"
          type="button"
          onClick={() => {
            window.location.hash = "history";
          }}
        >
          ◷ View all history
        </button>
      </aside>

      <main className="mbDeskCenterV81">
        <section className="mbDeskMarketHeaderV81">
          <div className="mbDeskMarketIdentityV81">
            <span>{binaryMarket?.short || "V50"}</span>
            <div>
              <small>VOLATILITY MARKET</small>
              <strong>{binaryMarket?.label || "Volatility 50 Index"}</strong>
            </div>
            <i>● LIVE</i>
          </div>
          <div className="mbDeskMarketStatV81"><strong>{indexValue.toFixed(2)}</strong><small>Index</small></div>
          <div className="mbDeskMarketStatV81 negative"><strong>-0.07%</strong><small>24h Change</small></div>
          <div className="mbDeskMarketStatV81"><strong>{(indexValue + priceStep * 2.2).toFixed(2)}</strong><small>24h High</small></div>
          <div className="mbDeskMarketStatV81"><strong>{(indexValue - priceStep * 4.1).toFixed(2)}</strong><small>24h Low</small></div>
        </section>

        <section className="mbDeskChartPanelV81">
          <div className="mbDeskChartToolbarV81">
            <button type="button">1S⌄</button>
            <button type="button">⌁</button>
            <button type="button">▥</button>
            <button type="button">Indicators⌄</button>
            <button type="button">↶</button>
            <button type="button">↷</button>
          </div>

          <div className="mbDeskChartCanvasV81">
            {LineChartComponent ? (
              <LineChartComponent data={chartData} anchorValue={chartAnchor} />
            ) : null}
            <div className="mbDeskChartPriceV81">{indexValue.toFixed(2)}</div>
            <div className="mbDeskChartAxisV81">
              <span>{(indexValue + priceStep * 2).toFixed(2)}</span>
              <span>{(indexValue + priceStep).toFixed(2)}</span>
              <span>{indexValue.toFixed(2)}</span>
              <span>{(indexValue - priceStep).toFixed(2)}</span>
              <span>{(indexValue - priceStep * 2).toFixed(2)}</span>
            </div>
            {activeBinaryTrade && (
              <div className="mbDeskActiveTradeBadgeV81">
                <i></i>
                <strong>{activeBinaryTrade.action}</strong>
                <small>{activeBinaryTrade.remainingTicks} ticks remaining</small>
              </div>
            )}
          </div>

          <div className="mbDeskTimeAxisV81">
            <span>18:38:05</span><span>18:38:20</span><span>18:38:35</span><span>18:38:50</span>
            <span>18:39:05</span><span>18:39:20</span><span>18:39:35</span><span>18:39:50</span>
          </div>

          <div className="mbDeskDigitsV81">
            {digitStats.map((percent, digit) => {
              const isHighest = digit === highestDigit;
              const isLowest = digit === lowestDigit;
              const isPicked = ["Matches/Differs", "Over/Under"].includes(tradeType) && digit === prediction;
              const isCurrent = digit === lastDigit;
              const isResult = binaryResultFlash?.digit === digit;

              return (
                <button
                  key={digit}
                  type="button"
                  disabled={Boolean(activeBinaryTrade)}
                  onClick={() => setPrediction(digit)}
                  className={[
                    isHighest ? "highest" : "",
                    isLowest ? "lowest" : "",
                    isPicked ? "picked" : "",
                    isCurrent ? "current" : "",
                    isResult ? binaryResultFlash?.result : "",
                  ].filter(Boolean).join(" ")}
                >
                  <strong>{digit}</strong>
                  <small>{Number(percent).toFixed(1)}%</small>
                </button>
              );
            })}
          </div>
        </section>
      </main>

      <aside className="mbDeskTradePanelV81">
        <div className="mbDeskPanelHeadV81"><strong>Trade Type</strong><small>Manual trading</small></div>

        <div className="mbDeskTradeTabsV81">
          {["Even/Odd", "Matches/Differs", "Over/Under", "Rise/Fall"].map((type) => (
            <button
              key={type}
              type="button"
              className={tradeType === type ? "active" : ""}
              onClick={() => setTradeType(type)}
              disabled={Boolean(activeBinaryTrade)}
            >
              {type}
            </button>
          ))}
        </div>

        <label className="mbDeskMarketSelectV81">
          <span>{binaryMarket?.short || "V50"}</span>
          <select
            value={binaryMarketId}
            onChange={(event) => setBinaryMarketId(event.target.value)}
            disabled={Boolean(activeBinaryTrade)}
          >
            {volatilityOptions.map((market) => (
              <option key={market.id} value={market.id}>{market.label}</option>
            ))}
          </select>
          <i>● LIVE</i>
        </label>

        <div className="mbDeskStakeHeadV81"><span>Stake Amount</span><small>(USD)</small></div>
        <div className="mbDeskStakeControlV81">
          <button type="button" onClick={() => changeStake(-1)} disabled={Boolean(activeBinaryTrade)}>−</button>
          <input
            type="number"
            min="0.3"
            step="0.1"
            value={stake}
            onChange={(event) => setStake(event.target.value === "" ? "" : Number(event.target.value))}
            disabled={Boolean(activeBinaryTrade)}
          />
          <button type="button" onClick={() => changeStake(1)} disabled={Boolean(activeBinaryTrade)}>+</button>
        </div>

        <div className="mbDeskQuickStakeV81">
          {quickStakes.map((value) => (
            <button
              key={value}
              type="button"
              className={Number(stake) === value ? "active" : ""}
              onClick={() => setStake(value)}
              disabled={Boolean(activeBinaryTrade)}
            >
              {value}
            </button>
          ))}
        </div>

        <div className="mbDeskDurationV81">
          <span>Duration</span>
          <div>
            <button type="button" onClick={() => setDuration(Math.max(1, Number(duration) - 1))} disabled={Boolean(activeBinaryTrade)}>−</button>
            <strong>{duration} tick{Number(duration) === 1 ? "" : "s"}</strong>
            <button type="button" onClick={() => setDuration(Math.min(10, Number(duration) + 1))} disabled={Boolean(activeBinaryTrade)}>+</button>
          </div>
        </div>

        <div className="mbDeskPayoutLineV81">
          <span>Estimated payout</span>
          <strong>{Math.max(leftRate, rightRate).toFixed(2)}×</strong>
        </div>

        <button className="mbDeskActionV81 even" type="button" onClick={() => placeContract(rightAction)} disabled={Boolean(activeBinaryTrade) || rightRate <= 0}>
          <strong>{rightLabel}</strong>
          <span>Payout {rightPayout} USD</span>
          <small>Profit {rightRate > 0 ? money(safeStake * rightRate - safeStake) : "—"} USD</small>
        </button>

        <button className="mbDeskActionV81 odd" type="button" onClick={() => placeContract(leftAction)} disabled={Boolean(activeBinaryTrade) || leftRate <= 0}>
          <strong>{leftLabel}</strong>
          <span>Payout {leftPayout} USD</span>
          <small>Profit {leftRate > 0 ? money(safeStake * leftRate - safeStake) : "—"} USD</small>
        </button>

        <button className="mbDeskAiCardV81" type="button" onClick={openAiScanner}>
          <span>AI</span>
          <div><strong>AI Scanner</strong><small>Analyze market & get smart insights</small></div>
          <b>Scan Now</b>
        </button>
      </aside>

      <footer className="mbDeskFooterV81">
        <span><i></i> Connected</span>
        <small>Server Time: {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })} (UTC+3)</small>
        <strong>◈ Secured by MetaBinary</strong>
        <button type="button" onClick={() => { window.location.hash = "settings"; }}>⚙</button>
      </footer>
    </div>
  );
}
