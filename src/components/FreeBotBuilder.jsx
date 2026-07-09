import { useMemo, useState } from "react";

export default function FreeBotBuilder({ freeBotRunning, startFreeBot }) {
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
  const selectedBot = bots.find((bot) => bot.name === selectedName) || bots[0];

  return (
    <aside className="botBuilderPanel">
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

          <button
            onClick={() => startFreeBot(selectedBot)}
            disabled={freeBotRunning}
          >
            {freeBotRunning ? "Running..." : "Run This Bot"}
          </button>
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
              <select value={selectedBot.market} readOnly>
                <option>{selectedBot.market}</option>
              </select>
            </div>

            <div className="blockRow">
              <span>Trade Type</span>
              <select value={selectedBot.contract} readOnly>
                <option>{selectedBot.contract}</option>
              </select>
            </div>

            <div className="blockRow">
              <span>Contract</span>
              <select value={selectedBot.choice} readOnly>
                <option>{selectedBot.choice}</option>
              </select>
            </div>

            <div className="blockGroup">
              <strong>Run once at start</strong>

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
              if <b>Bot is selected</b> and <b>Balance is enough</b> then
            </div>

            <div className="blockLine successLine">
              Purchase <b>{selectedBot.choice}</b>
            </div>
          </div>

          <div className="botBlock restartBlock">
            <div className="blockTitle">4. Restart trading conditions</div>

            <div className="logicLine">
              if <b>Total profit/loss</b> ≥ <b>Take Profit</b> then
            </div>

            <div className="blockLine">
              print <b>{selectedBot.name} target profit reached</b>
            </div>

            <div className="logicLine">
              else if <b>Total profit/loss</b> ≤ <b>Stop Loss</b> then
            </div>

            <div className="blockLine">
              print <b>{selectedBot.name} maximum loss reached</b>
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

      <div className="botRunPanel">
        <div className="runTop">
          <button
            className="runBotBtn"
            onClick={() => startFreeBot(selectedBot)}
            disabled={freeBotRunning}
          >
            ▶ Run
          </button>

          <div className="botRunStatus">
            <strong>{freeBotRunning ? "Bot is running" : "Bot is not running"}</strong>
            <div className="runProgress">
              <span className={freeBotRunning ? "runningProgress" : ""}></span>
            </div>
          </div>
        </div>

        <div className="selectedRunCard">
          <strong>Selected bot</strong>
          <span>{selectedBot.name}</span>
          <small>{selectedBot.description}</small>
        </div>

        <div className="athenaRow">
          <span>Athena</span>
          <div className={freeBotRunning ? "toggle active" : "toggle"}></div>
        </div>

        <div className="botTabs">
          <button className="active">Summary</button>
          <button>Transactions</button>
          <button>Journal</button>
        </div>

        <div className="summaryBox">
          <p>
            Selected: <b>{selectedBot.name}</b>
            <br />
            Click <b>Run</b> to start this bot.
          </p>
        </div>

        <div className="botStats">
          <div>
            <strong>${selectedBot.stake}</strong>
            <span>Stake</span>
          </div>

          <div>
            <strong>${selectedBot.takeProfit}</strong>
            <span>Take profit</span>
          </div>

          <div>
            <strong>${selectedBot.stopLoss}</strong>
            <span>Stop loss</span>
          </div>

          <div>
            <strong>{selectedBot.duration}</strong>
            <span>Ticks</span>
          </div>

          <div>
            <strong>{selectedBot.choice}</strong>
            <span>Contract</span>
          </div>

          <div>
            <strong>{selectedBot.prediction}</strong>
            <span>Prediction</span>
          </div>
        </div>

        <button className="resetBotBtn">Reset</button>
      </div>
    </aside>
  );
}