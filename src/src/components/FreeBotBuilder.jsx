export default function FreeBotBuilder({ freeBotRunning, startFreeBot }) {
  return (
    <aside className="botBuilderPanel">
      <div className="botLeftMenu">
        <div className="blocksHeader">
          <strong>Blocks menu</strong>
          <span>⌃</span>
        </div>

        <div className="blockSearch">
          <span>⌕</span>
          <input placeholder="Search" />
        </div>

        <div className="blockCategory active">Trade parameters</div>
        <div className="blockCategory">Purchase conditions</div>
        <div className="blockCategory">Sell conditions optional</div>
        <div className="blockCategory">Restart trading conditions</div>
        <div className="blockCategory">Analysis</div>
        <div className="blockCategory">Utility</div>
      </div>

      <div className="botWorkspace">
        <div className="botToolbar">
          <button className="quickStrategy">Quick strategy</button>
          <button>Tools</button>
          <button>Reset</button>
          <button>Import</button>
          <button>Sort</button>
          <button>Undo</button>
          <button>Zoom +</button>
          <button>Zoom -</button>
        </div>

        <div className="blocksCanvas">
          <div className="botBlock tradeParams">
            <div className="blockTitle">1. Trade parameters</div>

            <div className="blockRow">
              <span>Market</span>
              <select defaultValue="Derived">
                <option>Derived</option>
              </select>

              <select defaultValue="Continuous Indices">
                <option>Continuous Indices</option>
              </select>

              <select defaultValue="Volatility 100 Index">
                <option>Volatility 100 Index</option>
              </select>
            </div>

            <div className="blockRow">
              <span>Trade Type</span>
              <select defaultValue="Digits">
                <option>Digits</option>
              </select>

              <select defaultValue="Over/Under">
                <option>Over/Under</option>
                <option>Even/Odd</option>
              </select>
            </div>

            <div className="blockRow">
              <span>Contract Type</span>
              <select defaultValue="Both">
                <option>Both</option>
                <option>Over only</option>
                <option>Under only</option>
              </select>
            </div>

            <div className="blockGroup">
              <strong>Run once at start</strong>

              <div className="blockLine">
                set <b>Search Number</b> to <em>6</em>
              </div>

              <div className="blockLine">
                set <b>Stake</b> to <em>$1.00</em>
              </div>

              <div className="blockLine">
                set <b>Initial Stake</b> to <em>$1.00</em>
              </div>

              <div className="blockLine">
                set <b>Prediction before loss</b> to <em>1</em>
              </div>

              <div className="blockLine">
                set <b>Martingale</b> to <em>1.67</em>
              </div>

              <div className="blockLine">
                set <b>Take Profit</b> to <em>$20</em>
              </div>

              <div className="blockLine">
                set <b>Stop Loss</b> to <em>$10</em>
              </div>

              <div className="blockLine">
                set <b>Martingale Level</b> to <em>6</em>
              </div>
            </div>

            <div className="tradeOptionsBlock">
              <strong>Trade options</strong>
              <div className="optionPill">Duration: 5 ticks</div>
              <div className="optionPill">Stake: $1.00</div>
              <div className="optionPill">Prediction: Over 2</div>
            </div>
          </div>

          <div className="botBlock purchaseBlock">
            <div className="blockTitle">2. Purchase conditions</div>

            <div className="logicLine">
              if <b>Loss Counter</b> &lt; <b>Martingale Level</b> then
            </div>

            <div className="blockLine successLine">
              Purchase <b>Over</b>
            </div>
          </div>

          <div className="botBlock restartBlock">
            <div className="blockTitle">4. Restart trading conditions</div>

            <div className="logicLine">
              if <b>Total profit/loss</b> ≥ <b>Take Profit</b> then
            </div>

            <div className="blockLine">
              print <b>Your target profit has reached</b>
            </div>

            <div className="logicLine">
              else if <b>Total profit/loss</b> ≤ <b>Stop Loss</b> then
            </div>

            <div className="blockLine">
              print <b>Your maximum loss has reached</b>
            </div>

            <div className="logicLine">
              else if <b>Result is Win</b> then
            </div>

            <div className="blockLine">
              set <b>Stake</b> to <b>Initial Stake</b>
            </div>

            <div className="blockLine">
              set <b>Loss Counter</b> to <b>0</b>
            </div>

            <div className="logicLine">
              else
            </div>

            <div className="blockLine warningLine">
              set <b>Stake</b> to Stake × Martingale
            </div>

            <div className="blockLine warningLine">
              set <b>Loss Counter</b> to Loss Counter + 1
            </div>

            <div className="blockLine">
              Trade again
            </div>
          </div>
        </div>
      </div>

      <div className="botRunPanel">
        <div className="runTop">
          <button
            className="runBotBtn"
            onClick={startFreeBot}
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
            When you’re ready to trade, hit <b>Run</b>. You’ll be able to track
            your bot’s performance here.
          </p>
        </div>

        <div className="botStats">
          <div>
            <strong>$0.00</strong>
            <span>Total stake</span>
          </div>

          <div>
            <strong>$0.00</strong>
            <span>Total payout</span>
          </div>

          <div>
            <strong>0</strong>
            <span>No. of runs</span>
          </div>

          <div>
            <strong>0</strong>
            <span>Contracts lost</span>
          </div>

          <div>
            <strong>0</strong>
            <span>Contracts won</span>
          </div>

          <div>
            <strong>$0.00</strong>
            <span>Total profit/loss</span>
          </div>
        </div>

        <button className="resetBotBtn">Reset</button>
      </div>
    </aside>
  );
}