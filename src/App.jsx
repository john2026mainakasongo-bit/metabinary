import { useState } from "react";
import Chart from "./components/Chart.jsx";
import DigitBar from "./components/DigitBar.jsx";
import TradePanel from "./components/TradePanel.jsx";
import AIAssistant from "./components/AIAssistant.jsx";

const DEFAULT_BALANCES = {
  demo: 10000,
  real: 0,
};

function getSavedBalances() {
  try {
    return JSON.parse(localStorage.getItem("metabinary_balances")) || DEFAULT_BALANCES;
  } catch {
    return DEFAULT_BALANCES;
  }
}

function money(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function App() {
  const savedUser = JSON.parse(localStorage.getItem("metabinary_user") || "null");

  const [user, setUser] = useState(savedUser);
  const [authMode, setAuthMode] = useState("login");
  const [activePage, setActivePage] = useState("manual");
  const [account, setAccount] = useState("demo");

  const [balances, setBalances] = useState(getSavedBalances);
  const [openTrades, setOpenTrades] = useState([]);
  const [closedTrades, setClosedTrades] = useState([]);
  const [transactions, setTransactions] = useState([]);

  const [modal, setModal] = useState(null);
  const [depositAmount, setDepositAmount] = useState(10);
  const [depositPhone, setDepositPhone] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState(5);
  const [withdrawPhone, setWithdrawPhone] = useState("");

  const [freeBotRunning, setFreeBotRunning] = useState(false);
  const [bulkCount, setBulkCount] = useState(5);

  const saveBalances = (nextBalances) => {
    localStorage.setItem("metabinary_balances", JSON.stringify(nextBalances));
    return nextBalances;
  };

  const login = (email, password) => {
    if (!email || !password) {
      alert("Enter email and password");
      return;
    }

    const loggedUser = {
      email,
      name: email.split("@")[0],
      brokerId: "MB-" + Math.floor(100000 + Math.random() * 900000),
    };

    localStorage.setItem("metabinary_user", JSON.stringify(loggedUser));
    setUser(loggedUser);
  };

  const register = (email, password) => {
    if (!email || !password) {
      alert("Enter email and password");
      return;
    }

    const newUser = {
      email,
      name: email.split("@")[0],
      brokerId: "MB-" + Math.floor(100000 + Math.random() * 900000),
    };

    localStorage.setItem("metabinary_user", JSON.stringify(newUser));
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem("metabinary_user");
    setUser(null);
    setAuthMode("login");
  };

  const addTransaction = (item) => {
    const tx = {
      id: Date.now() + Math.random(),
      time: new Date().toLocaleString(),
      ...item,
    };

    setTransactions((old) => [tx, ...old].slice(0, 50));
  };

  const handleDeposit = () => {
    const amount = Number(depositAmount);

    if (!amount || amount < 1) {
      alert("Minimum deposit is $1");
      return;
    }

    if (!depositPhone.trim()) {
      alert("Enter phone number");
      return;
    }

    setBalances((old) => {
      const next = {
        ...old,
        real: Number((old.real + amount).toFixed(2)),
      };

      return saveBalances(next);
    });

    addTransaction({
      type: "Deposit",
      account: "real",
      amount,
      status: "Completed",
      method: "M-Pesa",
      phone: depositPhone,
    });

    setAccount("real");
    setModal(null);
    alert(`Deposit successful. Real balance updated by $${money(amount)}.`);
  };

  const handleWithdraw = () => {
    const amount = Number(withdrawAmount);

    if (!amount || amount < 5) {
      alert("Minimum withdrawal is $5");
      return;
    }

    if (amount > 150000) {
      alert("Maximum withdrawal is $150,000");
      return;
    }

    if (!withdrawPhone.trim()) {
      alert("Enter withdrawal phone number");
      return;
    }

    if (balances.real < amount) {
      alert("Insufficient real balance");
      return;
    }

    setBalances((old) => {
      const next = {
        ...old,
        real: Number((old.real - amount).toFixed(2)),
      };

      return saveBalances(next);
    });

    addTransaction({
      type: "Withdrawal",
      account: "real",
      amount,
      status: "Processing",
      method: "M-Pesa",
      phone: withdrawPhone,
    });

    setAccount("real");
    setModal(null);
    alert(`Withdrawal request created for $${money(amount)}.`);
  };

  const decideTradeResult = (trade) => {
    const lastDigit = Math.floor(Math.random() * 10);
    const startPrice = 1000 + Math.random() * 20;
    const endPrice = startPrice + (Math.random() - 0.55) * 8;

    let won = false;

    if (trade.contract === "Rise/Fall") {
      if (trade.choice === "Rise") won = endPrice > startPrice;
      if (trade.choice === "Fall") won = endPrice < startPrice;
    }

    if (trade.contract === "Even/Odd") {
      if (trade.choice === "Even") won = lastDigit % 2 === 0;
      if (trade.choice === "Odd") won = lastDigit % 2 !== 0;
    }

    if (trade.contract === "Matches/Differs") {
      if (trade.choice === "Matches") won = lastDigit === trade.prediction;
      if (trade.choice === "Differs") won = lastDigit !== trade.prediction;
    }

    if (trade.contract === "Over/Under") {
      if (trade.choice === "Over") won = lastDigit > trade.prediction;
      if (trade.choice === "Under") won = lastDigit < trade.prediction;
    }

    if (trade.contract === "Touch/No Touch") {
      const touched = Math.random() > 0.62;
      if (trade.choice === "Touch") won = touched;
      if (trade.choice === "No Touch") won = !touched;
    }

    return {
      ...trade,
      resultDigit: lastDigit,
      startPrice,
      endPrice,
      won,
      status: won ? "WON" : "LOST",
      settledAt: new Date().toLocaleTimeString(),
      returnAmount: won ? trade.payout : 0,
    };
  };

  const placeTrade = (tradeData) => {
    if (balances[account] < tradeData.stake) {
      alert(`Insufficient ${account} balance`);
      return;
    }

    const trade = {
      id: Date.now() + Math.random(),
      account,
      ...tradeData,
      status: "RUNNING",
      openedAt: new Date().toLocaleTimeString(),
    };

    setBalances((old) => {
      const next = {
        ...old,
        [account]: Number((old[account] - tradeData.stake).toFixed(2)),
      };

      return saveBalances(next);
    });

    setOpenTrades((old) => [trade, ...old]);

    addTransaction({
      type: "Trade Opened",
      account,
      amount: tradeData.stake,
      status: "Running",
      method: tradeData.contract,
      phone: tradeData.choice,
    });

    setTimeout(() => {
      const settled = decideTradeResult(trade);

      setOpenTrades((old) => old.filter((item) => item.id !== trade.id));
      setClosedTrades((old) => [settled, ...old].slice(0, 30));

      if (settled.won) {
        setBalances((old) => {
          const next = {
            ...old,
            [trade.account]: Number(
              (old[trade.account] + settled.returnAmount).toFixed(2)
            ),
          };

          return saveBalances(next);
        });
      }

      addTransaction({
        type: settled.won ? "Trade Won" : "Trade Lost",
        account: trade.account,
        amount: settled.won ? settled.profit : settled.stake,
        status: settled.status,
        method: settled.contract,
        phone: `${settled.choice} · digit ${settled.resultDigit}`,
      });
    }, trade.duration * 1000);
  };

  const startFreeBot = () => {
    setFreeBotRunning(true);

    const botTrades = [
      {
        contract: "Over/Under",
        choice: "Over",
        stake: 1,
        duration: 5,
        prediction: 2,
        payoutRate: 1.85,
        payout: 1.85,
        profit: 0.85,
      },
      {
        contract: "Even/Odd",
        choice: "Even",
        stake: 1,
        duration: 5,
        prediction: 5,
        payoutRate: 1.9,
        payout: 1.9,
        profit: 0.9,
      },
    ];

    botTrades.forEach((trade, index) => {
      setTimeout(() => placeTrade(trade), index * 1200);
    });

    setTimeout(() => {
      setFreeBotRunning(false);
    }, 8000);
  };

  const runBulkTrades = () => {
    const count = Math.min(20, Math.max(1, Number(bulkCount)));

    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        placeTrade({
          contract: "Rise/Fall",
          choice: i % 2 === 0 ? "Rise" : "Fall",
          stake: 1,
          duration: 5,
          prediction: 5,
          payoutRate: 1.9,
          payout: 1.9,
          profit: 0.9,
        });
      }, i * 250);
    }
  };

  if (!user) {
    return (
      <AuthScreen
        mode={authMode}
        setMode={setAuthMode}
        login={login}
        register={register}
      />
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="logo">M</div>
          <span>Meta</span>
          <strong>Binary</strong>
        </div>

        <nav className="mainTabs">
          <button
            className={activePage === "manual" ? "active" : ""}
            onClick={() => setActivePage("manual")}
          >
            Manual Trader
          </button>

          <button
            className={activePage === "freebot" ? "active" : ""}
            onClick={() => setActivePage("freebot")}
          >
            Free Bot
          </button>

          <button
            className={activePage === "bulk" ? "active" : ""}
            onClick={() => setActivePage("bulk")}
          >
            Bulk Trader
          </button>

          <button
            className={activePage === "tradingview" ? "active" : ""}
            onClick={() => setActivePage("tradingview")}
          >
            Trading View
          </button>

          <button
            className={activePage === "analysis" ? "active" : ""}
            onClick={() => setActivePage("analysis")}
          >
            Market Analyse
          </button>
        </nav>

        <div className="topActions">
          <select>
            <option>USD</option>
          </select>

          <div className="accountSwitch">
            <button
              className={account === "demo" ? "selected" : ""}
              onClick={() => setAccount("demo")}
            >
              Demo
            </button>

            <button
              className={account === "real" ? "selected" : ""}
              onClick={() => setAccount("real")}
            >
              Real
            </button>
          </div>

          <div className="balanceBox">
            <small>{account === "demo" ? "Demo Account" : "Real Account"}</small>
            <strong>${money(balances[account])}</strong>
          </div>

          <button className="depositBtn" onClick={() => setModal("deposit")}>
            Deposit
          </button>

          <button className="topMiniBtn" onClick={() => setModal("withdraw")}>
            Withdraw
          </button>

          <button className="topMiniBtn" onClick={() => setModal("history")}>
            History
          </button>

          <button className="iconBtn" onClick={logout} title="Logout">
            ☰
          </button>
        </div>
      </header>

      <main className="layout">
        <aside className="leftPanel">
          <h3>Open Positions</h3>

          {openTrades.length === 0 ? (
            <p>No open trades</p>
          ) : (
            openTrades.map((trade) => (
              <div className="positionCard" key={trade.id}>
                <strong>{trade.choice}</strong>
                <small>
                  {trade.contract} · ${money(trade.stake)} · {trade.duration}s
                </small>
                <span>Running</span>
              </div>
            ))
          )}

          <h3>Closed Positions</h3>

          {closedTrades.length === 0 ? (
            <p>No trades yet</p>
          ) : (
            closedTrades.map((trade) => (
              <div
                className={`positionCard ${trade.won ? "winTrade" : "loseTrade"}`}
                key={trade.id}
              >
                <strong>{trade.status}</strong>
                <small>{trade.choice}</small>
                <small>{trade.contract}</small>
                <small>Result digit: {trade.resultDigit}</small>
                <span>
                  {trade.won
                    ? `+$${money(trade.profit)}`
                    : `-$${money(trade.stake)}`}
                </span>
              </div>
            ))
          )}
        </aside>

        <section className="chartArea">
          {activePage === "tradingview" ? (
            <TradingViewScreen />
          ) : activePage === "analysis" ? (
            <MarketAnalyseScreen />
          ) : (
            <>
              <Chart activePage={activePage} />
              <DigitBar />
            </>
          )}
        </section>

        {activePage === "manual" && <TradePanel onPlaceTrade={placeTrade} />}

        {activePage === "freebot" && (
          <FreeBotPanel freeBotRunning={freeBotRunning} startFreeBot={startFreeBot} />
        )}

        {activePage === "bulk" && (
          <BulkPanel
            bulkCount={bulkCount}
            setBulkCount={setBulkCount}
            runBulkTrades={runBulkTrades}
          />
        )}

        {activePage === "tradingview" && <TradingViewSidePanel />}

        {activePage === "analysis" && <AnalysisSidePanel />}
      </main>

      <AIAssistant />

      {modal === "deposit" && (
        <Modal title="Deposit funds" close={() => setModal(null)}>
          <p className="modalInfo">
            Deposit updates the Real account balance immediately for testing.
          </p>

          <label>Amount USD</label>
          <input
            type="number"
            min="1"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
          />

          <label>M-Pesa phone number</label>
          <input
            placeholder="07XXXXXXXX"
            value={depositPhone}
            onChange={(e) => setDepositPhone(e.target.value)}
          />

          <button className="modalPrimary" onClick={handleDeposit}>
            Confirm Deposit
          </button>
        </Modal>
      )}

      {modal === "withdraw" && (
        <Modal title="Withdraw funds" close={() => setModal(null)}>
          <p className="modalInfo">
            Minimum withdrawal is $5. Maximum withdrawal is $150,000.
          </p>

          <label>Amount USD</label>
          <input
            type="number"
            min="5"
            max="150000"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
          />

          <label>M-Pesa withdrawal phone</label>
          <input
            placeholder="07XXXXXXXX"
            value={withdrawPhone}
            onChange={(e) => setWithdrawPhone(e.target.value)}
          />

          <button className="modalPrimary" onClick={handleWithdraw}>
            Request Withdrawal
          </button>
        </Modal>
      )}

      {modal === "history" && (
        <Modal title="Transaction history" close={() => setModal(null)} wide>
          {transactions.length === 0 ? (
            <p className="modalInfo">No transactions yet.</p>
          ) : (
            <div className="historyList">
              {transactions.map((tx) => (
                <div className="historyItem" key={tx.id}>
                  <div>
                    <strong>{tx.type}</strong>
                    <small>
                      {tx.method} · {tx.phone}
                    </small>
                    <small>{tx.time}</small>
                  </div>

                  <div className="historyRight">
                    <strong>${money(tx.amount)}</strong>
                    <span>{tx.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

function FreeBotPanel({ freeBotRunning, startFreeBot }) {
  return (
    <aside className="tradePanel">
      <div className="learnBox">Free Bot</div>

      <div className="botStatusCard">
        <strong>Over 2 Recovery Bot</strong>
        <small>Free demo bot using small stake and simple recovery logic.</small>
      </div>

      <label>Strategy</label>
      <select defaultValue="Over 2 Recovery">
        <option>Over 2 Recovery</option>
        <option>Even/Odd Recovery</option>
        <option>Rise/Fall Trend</option>
      </select>

      <label>Base stake</label>
      <div className="stakeBox">
        <button>-</button>
        <strong>$1.00</strong>
        <button>+</button>
      </div>

      <label>Martingale</label>
      <select defaultValue="6 levels x2">
        <option>6 levels x2</option>
        <option>4 levels x2</option>
        <option>No martingale</option>
      </select>

      <label>Take profit</label>
      <input className="panelInput" defaultValue="20" />

      <label>Stop loss</label>
      <input className="panelInput" defaultValue="10" />

      <div className="payoutBox">
        <span>AI scan</span>
        <strong>Ready</strong>
      </div>

      <button className="riseBtn" onClick={startFreeBot} disabled={freeBotRunning}>
        {freeBotRunning ? "Bot Running..." : "Start Free Bot"}
      </button>

      <button className="fallBtn">Stop Bot</button>
    </aside>
  );
}

function BulkPanel({ bulkCount, setBulkCount, runBulkTrades }) {
  return (
    <aside className="tradePanel">
      <div className="learnBox">Bulk trader</div>

      <label>Number of trades</label>
      <input
        className="panelInput"
        type="number"
        min="1"
        max="20"
        value={bulkCount}
        onChange={(e) => setBulkCount(e.target.value)}
      />

      <label>Contract</label>
      <select defaultValue="Rise/Fall">
        <option>Rise/Fall</option>
        <option>Even/Odd</option>
      </select>

      <label>Stake per trade</label>
      <div className="stakeBox">
        <button>-</button>
        <strong>$1.00</strong>
        <button>+</button>
      </div>

      <div className="payoutBox">
        <span>Max trades</span>
        <strong>20</strong>
      </div>

      <button className="riseBtn" onClick={runBulkTrades}>
        Run Bulk Trades
      </button>

      <button className="fallBtn">Clear Queue</button>
    </aside>
  );
}

function TradingViewScreen() {
  return (
    <div className="tradingViewScreen">
      <div className="tvHeader">
        <div>
          <strong>Trading View</strong>
          <small>Advanced market chart workspace</small>
        </div>

        <div className="tvSymbols">
          <button className="active">BTCUSD</button>
          <button>ETHUSD</button>
          <button>XAUUSD</button>
          <button>EURUSD</button>
        </div>
      </div>

      <div className="tvChartBox">
        <div className="tvCandles">
          {Array.from({ length: 48 }, (_, i) => (
            <div
              className={i % 3 === 0 ? "candle red" : "candle green"}
              key={i}
              style={{
                height: `${45 + Math.random() * 210}px`,
              }}
            />
          ))}
        </div>

        <div className="tvPriceAxis">
          <span>72,410</span>
          <span>71,980</span>
          <span>71,550</span>
          <span>71,120</span>
        </div>
      </div>
    </div>
  );
}

function TradingViewSidePanel() {
  return (
    <aside className="tradePanel">
      <div className="learnBox">Trading View Tools</div>

      <div className="analysisCard">
        <strong>Market</strong>
        <span>BTCUSD</span>
      </div>

      <div className="analysisCard">
        <strong>Trend</strong>
        <span className="greenText">Bullish</span>
      </div>

      <div className="analysisCard">
        <strong>Volatility</strong>
        <span>High</span>
      </div>

      <button className="riseBtn">Open Buy Setup</button>
      <button className="fallBtn">Open Sell Setup</button>
    </aside>
  );
}

function MarketAnalyseScreen() {
  return (
    <div className="marketAnalyseScreen">
      <div className="analysisHero">
        <strong>Market Analyse</strong>
        <span>AI-assisted scan for volatility, trend, and trade setup quality.</span>
      </div>

      <div className="analysisGrid">
        <div className="analysisBigCard">
          <small>Current trend</small>
          <strong>Bullish pressure</strong>
          <p>Price movement is pushing upward with medium volatility.</p>
        </div>

        <div className="analysisBigCard">
          <small>Best contract</small>
          <strong>Over 2</strong>
          <p>Digits above 2 appear more frequent in this demo scan.</p>
        </div>

        <div className="analysisBigCard">
          <small>Risk level</small>
          <strong>Medium</strong>
          <p>Use small stake and avoid increasing too fast.</p>
        </div>

        <div className="analysisBigCard">
          <small>AI recommendation</small>
          <strong>Wait for pullback</strong>
          <p>Better entry appears after two lower ticks.</p>
        </div>
      </div>

      <div className="signalStrip">
        <div>
          <strong>67%</strong>
          <span>Trend strength</span>
        </div>

        <div>
          <strong>74%</strong>
          <span>Volatility</span>
        </div>

        <div>
          <strong>58%</strong>
          <span>Entry quality</span>
        </div>

        <div>
          <strong>42%</strong>
          <span>Risk</span>
        </div>
      </div>
    </div>
  );
}

function AnalysisSidePanel() {
  return (
    <aside className="tradePanel">
      <div className="learnBox">Market analysis</div>

      <div className="analysisCard">
        <strong>Best market</strong>
        <span>Volatility 100</span>
      </div>

      <div className="analysisCard">
        <strong>Best setup</strong>
        <span className="greenText">Over 2</span>
      </div>

      <div className="analysisCard">
        <strong>Confidence</strong>
        <span>67%</span>
      </div>

      <div className="analysisCard">
        <strong>Warning</strong>
        <span className="redText">Do not over-stake</span>
      </div>

      <button className="riseBtn">Use Suggested Setup</button>
      <button className="fallBtn">Reject Signal</button>
    </aside>
  );
}

function Modal({ title, close, children, wide }) {
  return (
    <div className="modalOverlay">
      <div className={wide ? "modalCard wideModal" : "modalCard"}>
        <button className="modalClose" onClick={close}>
          ×
        </button>

        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}

function AuthScreen({ mode, setMode, login, register }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = () => {
    if (mode === "login") {
      login(email, password);
    } else {
      register(email, password);
    }
  };

  return (
    <div className="authPage">
      <div className="authCard">
        <div className="brand authBrand">
          <div className="logo">M</div>
          <span>Meta</span>
          <strong>Binary</strong>
        </div>

        <h1>{mode === "login" ? "Login" : "Create account"}</h1>
        <p>Access your MetaBinary trading dashboard.</p>

        <input
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button onClick={submit}>
          {mode === "login" ? "Login" : "Register"}
        </button>

        <small>
          {mode === "login" ? "No account?" : "Already have an account?"}{" "}
          <span onClick={() => setMode(mode === "login" ? "register" : "login")}>
            {mode === "login" ? "Register" : "Login"}
          </span>
        </small>
      </div>
    </div>
  );
}