import { useMemo, useState } from "react";

function money(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function FreeBotBuilder({
  freeBotRunning,
  startFreeBot,
  stopFreeBot,
  openTrades = [],
  closedTrades = [],
  transactions = [],
}) {
  const bots = useMemo(
    () => [
      {
        name: "Over 2 Recovery",
        tag: "Recommended",
        description: "Looks for digits over 2 and uses recovery after loss.",
        market: "Volatility 100 Index",
        contract: "Over/Under",
        choice: "Over",
        prediction: 2,
        stake: 1,
        duration: 5,
        takeProfit: 20,
        stopLoss: 10,
        martingale: "x2 up to 6",
      },
      {
        name: "Even/Odd Hunter",
        tag: "Simple",
        description: "Trades Even/Odd using small stake and quick duration.",
        market: "Volatility 100 Index",
        contract: "Even/Odd",
        choice: "Even",
        prediction: 5,
        stake: 1,
        duration: 5,
        takeProfit: 15,
        stopLoss: 8,
        martingale: "x2 up to 4",
      },
      {
        name: "Rise/Fall Trend",
        tag: "Trend",
        description: "Uses Rise/Fall when the market is moving strongly.",
        market: "Volatility 100 Index",
        contract: "Rise/Fall",
        choice: "Rise",
        prediction: 5,
        stake: 1,
        duration: 5,
        takeProfit: 25,
        stopLoss: 12,
        martingale: "No martingale",
      },
      {
        name: "Low Risk Demo Bot",
        tag: "Safe",
        description: "Lower activity bot for testing with small stake.",
        market: "Volatility 100 Index",
        contract: "Over/Under",
        choice: "Over",
        prediction: 3,
        stake: 0.5,
        duration: 5,
        takeProfit: 10,
        stopLoss: 5,
        martingale: "x1.5 up to 3",
      },
    ],
    []
  );

  const [selectedName, setSelectedName] = useState("Over 2 Recovery");
  const [activeTab, setActiveTab] = useState("summary");
  const [runnerView, setRunnerView] = useState(false);

  const selectedBot = bots.find((bot) => bot.name === selectedName) || bots[0];

  const botOpenTrades = openTrades.filter((trade) => trade.botName);
  const botClosedTrades = closedTrades.filter((trade) => trade.botName);
  const botTransactions = transactions.filter(
    (tx) => tx.method === "Free Bot" || String(tx.type).includes("Bot")
  );

  const currentTrade = botOpenTrades[0];
  const lastClosed = botClosedTrades[0];

  const totalStake = [...botOpenTrades, ...botClosedTrades].reduce(
    (sum, trade) => sum + Number(trade.stake || 0),
    0
  );

  const totalPayout = botClosedTrades.reduce(
    (sum, trade) => sum + Number(trade.won ? trade.returnAmount || trade.payout || 0 : 0),
    0
  );

  const totalWon = botClosedTrades.filter((trade) => trade.won).length;
  const totalLost = botClosedTrades.filter((trade) => !trade.won).length;

  const totalProfitLoss = botClosedTrades.reduce((sum, trade) => {
    if (trade.won) return sum + Number(trade.profit || 0);
    return sum - Number(trade.stake || 0);
  }, 0);

  const noOfRuns = botOpenTrades.length + botClosedTrades.length;

  const statusText = freeBotRunning
    ? currentTrade
      ? "Contract bought"
      : lastClosed?.won
      ? "Won"
      : lastClosed
      ? "Lost"
      : "Bot is running"
    : "Bot is not running";

  const statusClass =
    statusText === "Won" ? "wonStatus" : statusText === "Lost" ? "lostStatus" : "";

  const runSelectedBot = () => {
    startFreeBot(selectedBot);
    setRunnerView(true);
    setActiveTab("summary");
  };

  const stopSelectedBot = () => {
    stopFreeBot();
  };

  return (
    <aside className={runnerView ? "botBuilderPanel runnerMode" : "botBuilderPanel"}>
      {runnerView && (
        <div className="runnerBackTop">
          <button onClick={() => setRunnerView(false)}>‹ Back to Bot</button>
          <strong>{selectedBot.name}</strong>
        </div>
      )}

      <div className="botLeftMenu">
        <div className="blocksHeader">
          <strong>Free Bots</strong>
          <span>⌃</span>
        </div>

        <div className="blockSearch">
          <span>⌕</span>
          <input placeholder="Search bot" />
        </div>

        <div className="botNameList">
          {bots.map((bot) => (
            <button
              key={bot.name}
              className={selectedName === bot.name ? "botName active" : "botName"}
              onClick={() => setSelectedName(bot.name)}
            >
              <strong>{bot.name}</strong>
              <span>{bot.tag}</span>
            </button>
          ))}
        </div>

        <div className="blockCategory active">Trade parameters</div>
        <div className="blockCategory">Purchase conditions</div>
        <div className="blockCategory">Restart conditions</div>
        <div className="blockCategory">Analysis</div>
        <div className="blockCategory">Utility</div>
      </div>

      <div className="botWorkspace">
        <div className="botToolbar">
          <button className="quickStrategy">{selectedBot.name}</button>
          <button>Tools</button>
          <button>Reset</button>
          <button>Import</button>
          <button>Sort</button>
          <button>Undo</button>
          <button>Zoom +</button>
          <button>Zoom -</button>
        </div>

        <div className="selectedBotBanner">
          <div>
            <strong>{selectedBot.name}</strong>
            <span>{selectedBot.description}</span>
          </div>
        </div>

        <div className="blocksCanvas">
          <div className="botBlock tradeParams">
            <div className="blockTitle">1. Trade parameters</div>

            <div className="blockRow">
              <span>Bot Name</span>
              <select
                value={selectedName}
                onChange={(e) => setSelectedName(e.target.value)}
              >
                {bots.map((bot) => (
                  <option key={bot.name}>{bot.name}</option>
                ))}
              </select>
            </div>

            <div className="blockRow">
              <span>Market</span>
              <select value={selectedBot.market} onChange={() => {}}>
                <option>{selectedBot.market}</option>
              </select>
            </div>

            <div className="blockRow">
              <span>Trade Type</span>
              <select value={selectedBot.contract} onChange={() => {}}>
                <option>{selectedBot.contract}</option>
              </select>
            </div>

            <div className="blockRow">
              <span>Contract</span>
              <select value={selectedBot.choice} onChange={() => {}}>
                <option>{selectedBot.choice}</option>
              </select>
            </div>

            <div className="blockGroup">
              <strong>Run continuously until Stop Bot</strong>

              <div className="blockLine">
                set <b>Bot Name</b> to <em>{selectedBot.name}</em>
              </div>

              <div className="blockLine">
                set <b>Stake</b> to <em>${selectedBot.stake}</em>
              </div>

              <div className="blockLine">
                set <b>Duration</b> to <em>{selectedBot.duration} ticks</em>
              </div>

              <div className="blockLine">
                set <b>Prediction</b> to <em>{selectedBot.prediction}</em>
              </div>

              <div className="blockLine">
                set <b>Take Profit</b> to <em>${selectedBot.takeProfit}</em>
              </div>

              <div className="blockLine">
                set <b>Stop Loss</b> to <em>${selectedBot.stopLoss}</em>
              </div>

              <div className="blockLine">
                set <b>Martingale</b> to <em>{selectedBot.martingale}</em>
              </div>
            </div>

            <div className="tradeOptionsBlock">
              <strong>Trade options</strong>
              <div className="optionPill">Duration: {selectedBot.duration} ticks</div>
              <div className="optionPill">Stake: ${selectedBot.stake}</div>
              <div className="optionPill">
                {selectedBot.choice} {selectedBot.prediction}
              </div>
            </div>
          </div>

          <div className="botBlock purchaseBlock">
            <div className="blockTitle">2. Purchase conditions</div>

            <div className="logicLine">
              if <b>Bot is running</b> and <b>Balance is enough</b> then
            </div>

            <div className="blockLine successLine">
              Purchase <b>{selectedBot.choice}</b>
            </div>
          </div>

          <div className="botBlock restartBlock">
            <div className="blockTitle">4. Restart trading conditions</div>

            <div className="logicLine">
              if <b>Stop Bot clicked</b> then
            </div>

            <div className="blockLine">
              stop <b>{selectedBot.name}</b>
            </div>

            <div className="logicLine">
              else if <b>Result is Win</b> then
            </div>

            <div className="blockLine">
              set <b>Stake</b> to <b>Initial Stake</b>
            </div>

            <div className="logicLine">else</div>

            <div className="blockLine warningLine">
              use <b>{selectedBot.martingale}</b>
            </div>

            <div className="blockLine">Trade again</div>
          </div>
        </div>
      </div>

      <div className="botRunPanel derivRunPanel">
        <div className="derivRunHeader">
          {freeBotRunning ? (
            <button className="derivStopBtn" onClick={stopSelectedBot}>
              ■ Stop
            </button>
          ) : (
            <button className="derivRunBtn" onClick={runSelectedBot}>
              ▶ Run
            </button>
          )}

          <div className={`derivStatus ${statusClass}`}>
            <strong>{statusText}</strong>
            <div className="derivProgress">
              <span className={freeBotRunning ? "activeProgress" : ""}></span>
            </div>
          </div>
        </div>

        <div className="athenaStatusRow">
          <div className="athenaPill">
            Athena <span className={freeBotRunning ? "athenaOn" : ""}></span>
          </div>

          <div className="smallStatusBox">
            <strong>STATUS</strong>
            <span>Latest strategy update shows here when the bot runs.</span>
          </div>

          <a>Full log</a>
        </div>

        <div className="botTabs derivTabs">
          <button
            className={activeTab === "summary" ? "active" : ""}
            onClick={() => setActiveTab("summary")}
          >
            Summary
          </button>

          <button
            className={activeTab === "transactions" ? "active" : ""}
            onClick={() => setActiveTab("transactions")}
          >
            Transactions
          </button>

          <button
            className={activeTab === "journal" ? "active" : ""}
            onClick={() => setActiveTab("journal")}
          >
            Journal
          </button>
        </div>

        {activeTab === "summary" && (
          <div className="derivPanelBody">
            <SummaryView
              currentTrade={currentTrade}
              lastClosed={lastClosed}
              freeBotRunning={freeBotRunning}
              selectedBot={selectedBot}
            />
          </div>
        )}

        {activeTab === "transactions" && (
          <div className="derivPanelBody">
            <TransactionsView trades={[...botOpenTrades, ...botClosedTrades]} />
          </div>
        )}

        {activeTab === "journal" && (
          <div className="derivPanelBody">
            <JournalView transactions={botTransactions} trades={botClosedTrades} />
          </div>
        )}

        <div className="derivStats">
          <div>
            <strong>Stake</strong>
            <span>{money(totalStake)} USD</span>
          </div>

          <div>
            <strong>Payout</strong>
            <span>{money(totalPayout)} USD</span>
          </div>

          <div>
            <strong>Runs</strong>
            <span>{noOfRuns}</span>
          </div>

          <div>
            <strong>Lost</strong>
            <span>{totalLost}</span>
          </div>

          <div>
            <strong>Won</strong>
            <span>{totalWon}</span>
          </div>

          <div>
            <strong>P/L</strong>
            <span className={totalProfitLoss >= 0 ? "profitText" : "lossText"}>
              {totalProfitLoss >= 0 ? "+" : ""}
              {money(totalProfitLoss)} USD
            </span>
          </div>
        </div>

        <button className="derivResetBtn">Reset</button>
      </div>
    </aside>
  );
}

function SummaryView({ currentTrade, lastClosed, freeBotRunning, selectedBot }) {
  if (!freeBotRunning && !currentTrade && !lastClosed) {
    return (
      <div className="summaryEmpty">
        <p>
          When you’re ready to trade, hit <b>Run</b>. You’ll be able to track your
          bot’s performance here.
        </p>
      </div>
    );
  }

  if (!currentTrade && lastClosed) {
    return (
      <div className={lastClosed.won ? "closedCard wonClosed" : "closedCard lostClosed"}>
        <strong>⚑ Closed</strong>
        <h2>
          {lastClosed.won ? "+" : "-"}
          {money(lastClosed.won ? lastClosed.profit : lastClosed.stake)} USD
        </h2>
      </div>
    );
  }

  return (
    <div className="contractCard">
      <div className="contractTop">
        <div>
          <small>10</small>
          <strong>{selectedBot.market}</strong>
        </div>

        <div className="contractChoice">↗ {currentTrade?.choice || selectedBot.choice}</div>
      </div>

      <div className="tickLine">
        <span>Tick 1</span>
        <div>
          <i></i>
        </div>
      </div>

      <div className="currencyPill">USD</div>

      <div className="contractGrid">
        <div>
          <span>Total profit/loss:</span>
          <strong className="lossText">0.00</strong>
        </div>

        <div>
          <span>Contract value:</span>
          <strong>0.00</strong>
        </div>

        <div>
          <span>Stake:</span>
          <strong>{money(currentTrade?.stake || selectedBot.stake)}</strong>
        </div>

        <div>
          <span>Potential payout:</span>
          <strong>{money(currentTrade?.payout || selectedBot.stake * 1.85)}</strong>
        </div>
      </div>

      <div className="resaleText">Resale not offered</div>
    </div>
  );
}

function TransactionsView({ trades }) {
  if (trades.length === 0) {
    return (
      <div className="summaryEmpty small">
        <p>No transactions yet.</p>
      </div>
    );
  }

  return (
    <div className="transactionTable">
      <div className="transactionTools">
        <button disabled>Download</button>
        <button>Details</button>
      </div>

      <div className="tableHead">
        <strong>TYPE</strong>
        <strong>ENTRY/EXIT</strong>
        <strong>P/L</strong>
      </div>

      {trades.slice(0, 14).map((trade) => {
        const pl = trade.status === "RUNNING" ? null : trade.won ? trade.profit : -trade.stake;

        return (
          <div className="tableRow" key={trade.id}>
            <div>
              <span className="tinyChart">▥</span>
              <span className="tinyArrow">↗</span>
            </div>

            <div>
              <span className="spotDot redDot"></span>
              <span>{trade.startPrice ? money(trade.startPrice) : "—"}</span>
              <span className="spotDot grayDot"></span>
              <span>{trade.endPrice ? money(trade.endPrice) : "—"}</span>
            </div>

            <div>
              <strong>{money(trade.stake)} USD</strong>
              {pl !== null && (
                <span className={pl >= 0 ? "profitText" : "lossText"}>
                  {pl >= 0 ? "+" : ""}
                  {money(pl)} USD
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function JournalView({ transactions, trades }) {
  const items = [
    ...transactions.map((tx) => ({
      id: tx.id,
      title: tx.type,
      amount: tx.amount,
      status: tx.status,
      time: tx.time,
    })),
    ...trades.map((trade) => ({
      id: trade.id,
      title: trade.won ? "Profit amount" : "Loss amount",
      amount: trade.won ? trade.profit : -trade.stake,
      status: trade.won ? "Profit" : "Loss",
      time: trade.settledAt,
    })),
  ].slice(0, 12);

  if (items.length === 0) {
    return (
      <div className="summaryEmpty small">
        <p>No journal logs yet.</p>
      </div>
    );
  }

  return (
    <div className="journalList">
      <div className="journalTop">
        <button>Download</button>
        <span>Filters ≡</span>
      </div>

      {items.map((item) => (
        <div className="journalItem" key={item.id}>
          <p>
            {String(item.title).includes("Opened") || String(item.title).includes("Started") ? (
              <>
                <b>Bought:</b> Contract purchased
              </>
            ) : (
              <>
                {item.status === "Loss" ? "Loss amount:" : "Profit amount:"}{" "}
                <span className={Number(item.amount) >= 0 ? "profitText" : "lossText"}>
                  {money(item.amount)} USD
                </span>
              </>
            )}
          </p>
          <small>{item.time || new Date().toLocaleString()}</small>
        </div>
      ))}
    </div>
  );
}