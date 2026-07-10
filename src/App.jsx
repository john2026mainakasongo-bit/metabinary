import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function money(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function id() {
  return Date.now() + Math.random();
}

function readSaved(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [user, setUser] = useState(() =>
    readSaved("metabinary_user", {
      name: "John Maina",
      email: "johnmaina@gmail.com",
      initials: "JM",
      verified: true,
    })
  );

  const [activePage, setActivePage] = useState("trade");
  const [account, setAccount] = useState("demo");

  const [balances, setBalances] = useState(() =>
    readSaved("metabinary_balances", {
      demo: 10000,
      real: 0,
    })
  );

  const [menuOpen, setMenuOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  const [tradeType, setTradeType] = useState("Even/Odd");
  const [stake, setStake] = useState(10);
  const [duration, setDuration] = useState(5);
  const [prediction, setPrediction] = useState(2);

  const [priceData, setPriceData] = useState(() =>
    Array.from({ length: 48 }, (_, i) => 867 + Math.sin(i / 5) * 0.7 + Math.random() * 0.5)
  );

  const [lastDigit, setLastDigit] = useState(0);
  const [digitStats, setDigitStats] = useState(() =>
    Array.from({ length: 10 }, () => 7 + Math.random() * 6)
  );

  const [openTrades, setOpenTrades] = useState([]);
  const [closedTrades, setClosedTrades] = useState(() =>
    readSaved("metabinary_closed_trades", [])
  );
  const [transactions, setTransactions] = useState(() =>
    readSaved("metabinary_transactions", [])
  );
  const [toasts, setToasts] = useState([]);

  const [botRunner, setBotRunner] = useState(null);
  const [botRunning, setBotRunning] = useState(false);

  const balance = balances[account] || 0;
  const livePrice = priceData[priceData.length - 1] || 867;

  useEffect(() => {
    localStorage.setItem("metabinary_user", JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    localStorage.setItem("metabinary_balances", JSON.stringify(balances));
  }, [balances]);

  useEffect(() => {
    localStorage.setItem("metabinary_closed_trades", JSON.stringify(closedTrades));
  }, [closedTrades]);

  useEffect(() => {
    localStorage.setItem("metabinary_transactions", JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    const timer = setInterval(() => {
      setPriceData((old) => {
        const last = old[old.length - 1] || 867;
        const next = Number((last + (Math.random() - 0.47) * 0.55).toFixed(2));
        return [...old.slice(-47), next];
      });

      setLastDigit(Math.floor(Math.random() * 10));
      setDigitStats(Array.from({ length: 10 }, () => 7 + Math.random() * 6));
    }, 900);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    refreshUserBalance();
    const timer = setInterval(refreshUserBalance, 7000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  async function refreshUserBalance() {
    if (!user?.email) return;

    try {
      const res = await fetch(`${API_URL}/api/user/${encodeURIComponent(user.email)}`);
      if (!res.ok) return;

      const data = await res.json();

      setBalances((old) => ({
        demo: Number(data.demoBalance ?? data.demo ?? old.demo ?? 10000),
        real: Number(data.realBalance ?? data.real ?? old.real ?? 0),
      }));
    } catch {
      // Keep local balances when backend is offline.
    }
  }

  function showToast(type, title, message) {
    const toast = { id: id(), type, title, message };
    setToasts((old) => [toast, ...old].slice(0, 3));

    setTimeout(() => {
      setToasts((old) => old.filter((item) => item.id !== toast.id));
    }, 3600);
  }

  function addTransaction(item) {
    setTransactions((old) => [
      {
        id: id(),
        time: new Date().toLocaleString(),
        ...item,
      },
      ...old,
    ]);
  }

  function changeBalance(targetAccount, amount) {
    setBalances((old) => ({
      ...old,
      [targetAccount]: Number((Number(old[targetAccount] || 0) + amount).toFixed(2)),
    }));
  }

  function payoutRate(contract, choice) {
    if (contract === "Matches/Differs" && choice === "Matches") return 8.333;
    if (contract === "Matches/Differs" && choice === "Differs") return 1.087;
    if (contract === "Even/Odd") return 1.818;
    if (contract === "Over/Under") return 1.85;
    return 1.9;
  }

  function getActions(contract) {
    if (contract === "Even/Odd") {
      return [
        { label: "Even", kind: "buy", icon: "▦" },
        { label: "Odd", kind: "sell", icon: "▵" },
      ];
    }

    if (contract === "Rise/Fall") {
      return [
        { label: "Rise", kind: "buy", icon: "↗" },
        { label: "Fall", kind: "sell", icon: "↘" },
      ];
    }

    if (contract === "Over/Under") {
      return [
        { label: "Over", kind: "buy", icon: "↑" },
        { label: "Under", kind: "sell", icon: "↓" },
      ];
    }

    if (contract === "Matches/Differs") {
      return [
        { label: "Matches", kind: "buy", icon: "◎" },
        { label: "Differs", kind: "sell", icon: "◇" },
      ];
    }

    return [
      { label: "Touch", kind: "buy", icon: "●" },
      { label: "No Touch", kind: "sell", icon: "○" },
    ];
  }

  function settleTrade(trade) {
    const digit = Math.floor(Math.random() * 10);
    const entry = Number((livePrice + (Math.random() - 0.5) * 2).toFixed(3));
    const exit = Number((entry + (Math.random() - 0.47) * 1.5).toFixed(3));

    let won = false;

    if (trade.contract === "Even/Odd") {
      won = trade.choice === "Even" ? digit % 2 === 0 : digit % 2 !== 0;
    }

    if (trade.contract === "Rise/Fall") {
      won = trade.choice === "Rise" ? exit > entry : exit < entry;
    }

    if (trade.contract === "Over/Under") {
      won = trade.choice === "Over" ? digit > trade.prediction : digit < trade.prediction;
    }

    if (trade.contract === "Matches/Differs") {
      won = trade.choice === "Matches" ? digit === trade.prediction : digit !== trade.prediction;
    }

    if (trade.contract === "Touch/No Touch") {
      const touched = Math.random() > 0.55;
      won = trade.choice === "Touch" ? touched : !touched;
    }

    return {
      ...trade,
      won,
      status: won ? "WON" : "LOST",
      resultDigit: digit,
      entry,
      exit,
      settledAt: new Date().toLocaleTimeString(),
    };
  }

  function placeTrade(choice, botName = "") {
    const cleanStake = Math.max(0.3, Number(stake || 0.3));
    const cleanDuration = Math.max(1, Number(duration || 5));
    const rate = payoutRate(tradeType, choice);
    const payout = Number((cleanStake * rate).toFixed(2));
    const profit = Number((payout - cleanStake).toFixed(2));

    if (balance < cleanStake) {
      showToast("loss", "Insufficient balance", `Your ${account} balance is too low.`);
      return;
    }

    const trade = {
      id: id(),
      account,
      contract: tradeType,
      choice,
      stake: cleanStake,
      duration: cleanDuration,
      prediction,
      payout,
      profit,
      status: "RUNNING",
      botName,
      openedAt: new Date().toLocaleTimeString(),
    };

    changeBalance(account, -cleanStake);
    setOpenTrades((old) => [trade, ...old]);

    addTransaction({
      type: botName ? `${botName} contract bought` : "Contract bought",
      method: botName ? "Bot" : "Manual",
      account,
      amount: cleanStake,
      status: "Running",
      details: `${tradeType} · ${choice}`,
    });

    showToast("open", "Trade placed", `${tradeType} · ${choice} · $${money(cleanStake)}`);

    setTimeout(() => {
      const settled = settleTrade(trade);

      setOpenTrades((old) => old.filter((item) => item.id !== trade.id));
      setClosedTrades((old) => [settled, ...old].slice(0, 100));

      if (settled.won) {
        changeBalance(settled.account, settled.payout);
      }

      addTransaction({
        type: settled.won ? "Profit amount" : "Loss amount",
        method: botName ? "Bot" : "Manual",
        account: settled.account,
        amount: settled.won ? settled.profit : -settled.stake,
        status: settled.status,
        details: `${settled.contract} · ${settled.choice} · digit ${settled.resultDigit}`,
      });

      showToast(
        settled.won ? "win" : "loss",
        settled.won ? "Trade won" : "Trade lost",
        `${settled.choice} · digit ${settled.resultDigit} · ${
          settled.won ? "+" : "-"
        }$${money(settled.won ? settled.profit : settled.stake)}`
      );
    }, cleanDuration * 1000);
  }

  async function submitDeposit(payload) {
    try {
      const body = {
        email: user.email,
        amount: Number(payload.amountUsd),
        amountUsd: Number(payload.amountUsd),
        phone: payload.phone,
        method: payload.method,
      };

      let res = await fetch(`${API_URL}/api/deposit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        res = await fetch(`${API_URL}/api/deposit/mpesa`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
      }

      const data = await res.json();

      if (!res.ok || data.ok === false) {
        throw new Error(data.message || "Deposit failed");
      }

      addTransaction({
        type: "Deposit pending",
        method: payload.method,
        account: "real",
        amount: Number(payload.amountUsd),
        status: "Pending",
        details: payload.phone || user.email,
      });

      setDepositOpen(false);
      setAccount("real");
      showToast("open", "Deposit started", "Check your phone for STK Push.");
      setTimeout(refreshUserBalance, 5000);
    } catch (error) {
      showToast("loss", "Deposit error", error.message || "Backend not connected.");
    }
  }

  async function submitWithdraw(payload) {
    try {
      const amount = Number(payload.amountUsd);

      if (amount < 5) {
        showToast("loss", "Minimum withdrawal", "Minimum withdrawal is $5.");
        return;
      }

      if (balances.real < amount) {
        showToast("loss", "Low real balance", "You do not have enough real balance.");
        return;
      }

      const res = await fetch(`${API_URL}/api/withdraw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          amount,
          amountUsd: amount,
          phone: payload.phone,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.ok === false) {
        throw new Error(data.message || "Withdrawal failed");
      }

      changeBalance("real", -amount);

      addTransaction({
        type: "Withdrawal request",
        method: "M-Pesa",
        account: "real",
        amount: -amount,
        status: "Processing",
        details: payload.phone,
      });

      setWithdrawOpen(false);
      setAccount("real");
      showToast("open", "Withdrawal requested", "Your withdrawal request is processing.");
      setTimeout(refreshUserBalance, 5000);
    } catch (error) {
      showToast("loss", "Withdrawal error", error.message || "Backend not connected.");
    }
  }

  function startBot(bot) {
    setBotRunner(bot);
    setBotRunning(true);
    showToast("open", `${bot.name} started`, "Bot is now buying contracts.");

    setTradeType(bot.contract);
    setStake(bot.stake);
    setDuration(bot.duration);
    setPrediction(bot.prediction || 2);

    let runs = 0;

    const runOnce = () => {
      if (runs >= 12) {
        setBotRunning(false);
        return;
      }

      runs += 1;

      setTimeout(() => {
        placeTrade(bot.choice, bot.name);
      }, 80);
    };

    runOnce();

    const timer = setInterval(() => {
      if (!botRunning && runs > 0) {
        clearInterval(timer);
        return;
      }

      if (runs >= 12) {
        clearInterval(timer);
        setBotRunning(false);
        return;
      }

      runOnce();
    }, (bot.duration + 2) * 1000);
  }

  function logout() {
    localStorage.removeItem("metabinary_user");
    setUser(null);
  }

  if (!user) {
    return <LandingPage onStart={() => window.location.reload()} />;
  }

  return (
    <div className="app">
      <AppHeader
        user={user}
        account={account}
        setAccount={setAccount}
        balance={balance}
        setActivePage={setActivePage}
        onDeposit={() => setDepositOpen(true)}
        onWithdraw={() => setWithdrawOpen(true)}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        logout={logout}
      />

      <main className="screen">
        {activePage === "home" && (
          <HomePage setActivePage={setActivePage} onDeposit={() => setDepositOpen(true)} />
        )}

        {activePage === "markets" && <MarketsPage />}

        {activePage === "trade" && (
          <TradePage
            balance={balance}
            balances={balances}
            account={account}
            setAccount={setAccount}
            onDeposit={() => setDepositOpen(true)}
            tradeType={tradeType}
            setTradeType={setTradeType}
            stake={stake}
            setStake={setStake}
            duration={duration}
            setDuration={setDuration}
            prediction={prediction}
            setPrediction={setPrediction}
            priceData={priceData}
            livePrice={livePrice}
            digitStats={digitStats}
            lastDigit={lastDigit}
            getActions={getActions}
            payoutRate={payoutRate}
            placeTrade={placeTrade}
            openTrades={openTrades}
            closedTrades={closedTrades}
          />
        )}

        {activePage === "bots" && (
          <BotsPage
            startBot={startBot}
            setBotRunner={setBotRunner}
            setActivePage={setActivePage}
          />
        )}

        {activePage === "profile" && (
          <ProfilePage
            user={user}
            balances={balances}
            transactions={transactions}
            logout={logout}
            onDeposit={() => setDepositOpen(true)}
          />
        )}
      </main>

      <BottomNav activePage={activePage} setActivePage={setActivePage} />

      <ToastList items={toasts} />

      {depositOpen && (
        <DepositModal
          user={user}
          onClose={() => setDepositOpen(false)}
          onSubmit={submitDeposit}
        />
      )}

      {withdrawOpen && (
        <WithdrawModal
          onClose={() => setWithdrawOpen(false)}
          onSubmit={submitWithdraw}
        />
      )}

      {botRunner && (
        <BotRunnerOverlay
          bot={botRunner}
          botRunning={botRunning}
          setBotRunning={setBotRunning}
          onClose={() => setBotRunner(null)}
          onStart={() => startBot(botRunner)}
          onStop={() => setBotRunning(false)}
          openTrades={openTrades.filter((trade) => trade.botName)}
          closedTrades={closedTrades.filter((trade) => trade.botName)}
          transactions={transactions.filter((tx) => tx.method === "Bot")}
        />
      )}
    </div>
  );
}

function Logo() {
  return (
    <div className="brandLogo">
      <div className="mark">M</div>
      <strong>
        Meta<span>Binary</span>
      </strong>
    </div>
  );
}

function AppHeader({
  user,
  account,
  setAccount,
  balance,
  setActivePage,
  onDeposit,
  onWithdraw,
  menuOpen,
  setMenuOpen,
  logout,
}) {
  return (
    <header className="appHeader">
      <div className="headerLine">
        <button className="menuBtn" onClick={() => setMenuOpen((old) => !old)}>
          ☰
        </button>

        <Logo />

        <div className="headerRight">
          <button className="bell">
            🔔<span>3</span>
          </button>
          <button className="avatar">
            {user.initials}
            <i></i>
          </button>
        </div>
      </div>

      <div className="walletLine">
        <div className="accountToggle">
          <button
            className={account === "demo" ? "active" : ""}
            onClick={() => setAccount("demo")}
          >
            Demo
          </button>
          <button
            className={account === "real" ? "active" : ""}
            onClick={() => setAccount("real")}
          >
            Real
          </button>
        </div>

        <div className="walletBox">
          <small>{account === "demo" ? "Demo Account" : "Real Account"}</small>
          <strong>{money(balance)} USD</strong>
        </div>

        <button className="depositBig" onClick={onDeposit}>
          Deposit
        </button>
      </div>

      {menuOpen && (
        <div className="drawerMenu">
          <button onClick={() => setActivePage("trade")}>Trader’s Hub</button>
          <button onClick={onDeposit}>Cashier / Deposit</button>
          <button onClick={onWithdraw}>Withdraw</button>
          <button onClick={() => setActivePage("bots")}>My Bots</button>
          <button onClick={() => setActivePage("profile")}>Profile</button>
          <button onClick={logout}>Logout</button>
        </div>
      )}
    </header>
  );
}

function BottomNav({ activePage, setActivePage }) {
  const items = [
    { key: "home", label: "Home", icon: "⌂" },
    { key: "markets", label: "Markets", icon: "▥" },
    { key: "trade", label: "Trade", icon: "↕" },
    { key: "bots", label: "Bots", icon: "🤖" },
    { key: "profile", label: "Profile", icon: "♙" },
  ];

  return (
    <nav className="bottomNav">
      {items.map((item) => (
        <button
          key={item.key}
          className={activePage === item.key ? "active" : ""}
          onClick={() => setActivePage(item.key)}
        >
          <span>{item.icon}</span>
          <small>{item.label}</small>
        </button>
      ))}
    </nav>
  );
}

function HomePage({ setActivePage, onDeposit }) {
  return (
    <div className="homePage">
      <section className="homeHero">
        <h1>
          Trade Smarter.
          <span>Earn Consistently.</span>
        </h1>
        <p>AI trading, binary options and forex inside one broker-style platform.</p>
        <button onClick={() => setActivePage("trade")}>Start Trading →</button>
      </section>

      <MarketTicker />

      <div className="featureGrid">
        <Feature icon="🧠" label="AI Trading" />
        <Feature icon="👥" label="Copy Trading" />
        <Feature icon="↕" label="Binary Options" />
        <Feature icon="▥" label="Forex Trading" />
      </div>

      <div className="aiCard">
        <div className="aiFace">AI</div>
        <div>
          <strong>AI-Powered Trading</strong>
          <span>Let our AI scan markets and detect strong setups.</span>
        </div>
        <button onClick={() => setActivePage("bots")}>Explore AI →</button>
      </div>

      <StatsCard />
      <TopMarkets />

      <button className="widePrimary" onClick={onDeposit}>
        Deposit Funds
      </button>
    </div>
  );
}

function LandingPage({ onStart }) {
  return (
    <div className="landing">
      <div className="landingTop">
        <button className="menuBtn">☰</button>
        <Logo />
        <div className="landingAuth">
          <button onClick={onStart}>Login</button>
          <button onClick={onStart}>Register</button>
        </div>
      </div>

      <section className="landingHero">
        <h1>
          Trade Smarter.
          <span>Earn Consistently.</span>
        </h1>
        <p>AI-Powered Trading, Copy Trading, Binary Options & Forex — all in one platform.</p>
        <button onClick={onStart}>Start Trading →</button>
      </section>
    </div>
  );
}

function TradePage({
  balance,
  balances,
  account,
  setAccount,
  onDeposit,
  tradeType,
  setTradeType,
  stake,
  setStake,
  duration,
  setDuration,
  prediction,
  setPrediction,
  priceData,
  livePrice,
  digitStats,
  lastDigit,
  getActions,
  payoutRate,
  placeTrade,
  openTrades,
  closedTrades,
}) {
  const actions = getActions(tradeType);

  return (
    <div className="tradePage">
      <section className="accountSummary">
        <div>
          <small>Balance</small>
          <strong>{money(balance)} USD</strong>
          <span>Available</span>
        </div>

        <div>
          <small>Profit / Loss Today</small>
          <strong className="green">+250.00 USD</strong>
          <span>⌁</span>
        </div>

        <div>
          <small>Account Currency</small>
          <strong>USD⌄</strong>
        </div>

        <button onClick={onDeposit}>Deposit</button>
      </section>

      <section className="hubRow">
        {[
          { label: "Trader’s Hub", icon: "▣" },
          { label: "Reports", icon: "▤" },
          { label: "Cashier", icon: "▱" },
          { label: "History", icon: "↺" },
          { label: "Forex", icon: "▥" },
          { label: "Settings", icon: "⚙" },
        ].map((item) => (
          <button key={item.label} className={item.label === "Forex" ? "active" : ""}>
            <span>{item.icon}</span>
            <small>{item.label}</small>
          </button>
        ))}
      </section>

      <section className="typeRow">
        <span>Trade Type</span>
        {["Even/Odd", "Matches/Differs", "Over/Under", "Rise/Fall", "Touch/No Touch"].map(
          (type) => (
            <button
              key={type}
              className={tradeType === type ? "active" : ""}
              onClick={() => setTradeType(type)}
            >
              {type}
            </button>
          )
        )}
      </section>

      <section className="chartCard">
        <div className="chartHeader">
          <div>
            <strong>Volatility 100 (1s) Index</strong>
            <span>{money(livePrice)} · 0.00 (0.00%)</span>
          </div>

          <button>1s⌄</button>
        </div>

        <LineChart data={priceData} />

        <div className="lastDigitsTitle">Last Digits</div>

        <div className="darkDigits">
          {digitStats.map((pct, digit) => (
            <button
              key={digit}
              className={`darkDigit ${
                digit === lastDigit ? "active" : digit === prediction ? "selected" : ""
              }`}
              onClick={() => setPrediction(digit)}
            >
              <strong>{digit}</strong>
              <span>{pct.toFixed(1)}%</span>
            </button>
          ))}
        </div>
      </section>

      <section className="orderBox">
        <div className="orderInputs">
          <label>
            Ticks
            <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
              <option value={1}>1 tick</option>
              <option value={3}>3 ticks</option>
              <option value={5}>5 ticks</option>
              <option value={10}>10 ticks</option>
            </select>
          </label>

          <label>
            Stake (USD)
            <div className="stakeControl">
              <button onClick={() => setStake((old) => Math.max(0.3, Number(old) - 1))}>
                −
              </button>
              <strong>{money(stake)}</strong>
              <button onClick={() => setStake((old) => Number(old) + 1)}>+</button>
            </div>
          </label>

          <label>
            Duration
            <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
              <option value={5}>5s</option>
              <option value={10}>10s</option>
              <option value={30}>30s</option>
            </select>
          </label>
        </div>

        {(tradeType === "Over/Under" ||
          tradeType === "Matches/Differs" ||
          tradeType === "Touch/No Touch") && (
          <label className="predictionSelect">
            Prediction digit
            <select value={prediction} onChange={(e) => setPrediction(Number(e.target.value))}>
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                <option value={digit} key={digit}>
                  {digit}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="actionGrid">
          {actions.map((action) => (
            <button
              key={action.label}
              className={action.kind === "buy" ? "buyButton" : "sellButton"}
              onClick={() => placeTrade(action.label)}
            >
              <div>
                <span>{action.icon}</span>
                <strong>{action.label}</strong>
              </div>
              <small>
                Payout <b>{money(stake * payoutRate(tradeType, action.label))} USD</b>
              </small>
            </button>
          ))}
        </div>
      </section>

      <section className="openTable">
        <div className="tableTabs">
          <strong>
            Open Trades <span>{openTrades.length}</span>
          </strong>
          <strong>
            Profit Trades <span>{closedTrades.filter((t) => t.won).length}</span>
          </strong>
          <strong>
            Loss Trades <span>{closedTrades.filter((t) => !t.won).length}</span>
          </strong>
        </div>

        {openTrades.length === 0 ? (
          <p className="emptyText">No open trades yet.</p>
        ) : (
          openTrades.slice(0, 3).map((trade) => (
            <div className="tradeRow" key={trade.id}>
              <strong>{trade.contract}</strong>
              <span>{trade.choice}</span>
              <span>{money(trade.stake)} USD</span>
              <em>Running</em>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

function LineChart({ data }) {
  const path = useMemo(() => {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    return data
      .map((value, index) => {
        const x = (index / (data.length - 1)) * 100;
        const y = 60 - ((value - min) / range) * 54 - 3;
        return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(" ");
  }, [data]);

  return (
    <div className="chartBox">
      <svg viewBox="0 0 100 60" preserveAspectRatio="none">
        <defs>
          <linearGradient id="greenFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00ff88" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#00ff88" stopOpacity="0" />
          </linearGradient>
        </defs>

        <path d={`${path} L 100 60 L 0 60 Z`} className="chartFill" />
        <path d={path} className="linePath" />
      </svg>
    </div>
  );
}

function MarketTicker() {
  const markets = [
    ["EUR/USD", "1.08564", "+0.24%"],
    ["GBP/USD", "1.26542", "-0.11%"],
    ["XAU/USD", "2,345.67", "+0.37%"],
    ["BTC/USD", "67,890.12", "+1.02%"],
  ];

  return (
    <div className="ticker">
      {markets.map(([name, price, change]) => (
        <div key={name}>
          <strong>{name}</strong>
          <span>{price}</span>
          <em className={change.startsWith("+") ? "green" : "red"}>{change}</em>
        </div>
      ))}
    </div>
  );
}

function Feature({ icon, label }) {
  return (
    <div className="feature">
      <span>{icon}</span>
      <strong>{label}</strong>
    </div>
  );
}

function StatsCard() {
  return (
    <section className="statPanel">
      <div className="panelTitle">
        <strong>Live Trading Statistics</strong>
        <span>● Live</span>
      </div>

      <div className="statsGrid">
        <Stat value="$2,456,789" label="Total Trades" />
        <Stat value="15,342" label="Active Traders" />
        <Stat value="$892,456" label="Total Payouts" />
        <Stat value="98.62%" label="Success Rate" />
      </div>
    </section>
  );
}

function Stat({ value, label }) {
  return (
    <div className="statBox">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function TopMarkets() {
  const list = [
    ["🇪🇺🇺🇸", "EUR/USD", "Euro / US Dollar", "1.08564", "+0.24%"],
    ["🇬🇧🇺🇸", "GBP/USD", "British Pound", "1.26542", "-0.11%"],
    ["₿", "BTC/USD", "Bitcoin", "67,890.12", "+1.02%"],
  ];

  return (
    <section className="marketPanel">
      <div className="panelTitle">
        <strong>Top Markets</strong>
        <a>View All</a>
      </div>

      {list.map((item) => (
        <div className="marketRow" key={item[1]}>
          <span>{item[0]}</span>
          <div>
            <strong>{item[1]}</strong>
            <small>{item[2]}</small>
          </div>
          <MiniSpark />
          <div className="marketPrice">
            <strong>{item[3]}</strong>
            <small className={item[4].startsWith("+") ? "green" : "red"}>{item[4]}</small>
          </div>
          <button>☆</button>
        </div>
      ))}
    </section>
  );
}

function MiniSpark() {
  return (
    <svg viewBox="0 0 100 40" className="miniSpark">
      <path d="M3 30 L15 22 L28 25 L38 14 L50 18 L62 8 L74 13 L88 10 L98 16" />
    </svg>
  );
}

function MarketsPage() {
  return (
    <div className="marketsPage pageScroll">
      <div className="pageHead">
        <h2>Markets</h2>
        <p>Choose forex, crypto, commodities, and volatility markets.</p>
      </div>
      <TopMarkets />
      <MarketTicker />
      <TopMarkets />
    </div>
  );
}

function BotsPage({ startBot, setBotRunner }) {
  const bots = [
    {
      name: "Neon Eclipse",
      code: "EO",
      status: "Running",
      contract: "Even/Odd",
      market: "Volatility 100 (1s) Index",
      stake: 10,
      duration: 5,
      prediction: 2,
      choice: "Even",
      profit: 250.75,
      winRate: "72.50%",
      trades: 25,
      balance: 10250.75,
    },
    {
      name: "Quantum Surge",
      code: "RF",
      status: "Running",
      contract: "Rise/Fall",
      market: "Volatility 75 Index",
      stake: 15,
      duration: 5,
      prediction: 2,
      choice: "Rise",
      profit: 180.4,
      winRate: "68.00%",
      trades: 18,
      balance: 10180.4,
    },
    {
      name: "Alpha OverUnder",
      code: "OU",
      status: "Stopped",
      contract: "Over/Under",
      market: "Volatility 100 (1s) Index",
      stake: 10,
      duration: 5,
      prediction: 2,
      choice: "Over",
      profit: -45,
      winRate: "45.00%",
      trades: 10,
      balance: 9955,
    },
    {
      name: "Matrix Differ",
      code: "MD",
      status: "Stopped",
      contract: "Matches/Differs",
      market: "Volatility 50 Index",
      stake: 20,
      duration: 5,
      prediction: 2,
      choice: "Differs",
      profit: -120,
      winRate: "40.00%",
      trades: 15,
      balance: 9880,
    },
  ];

  return (
    <div className="botsPage pageScroll">
      <div className="botTabsTop">
        {["Bot Builder", "My Bots", "Running Bots", "Bot History", "Strategies"].map(
          (tab, index) => (
            <button className={index === 1 ? "active" : ""} key={tab}>
              {tab}
            </button>
          )
        )}
      </div>

      <div className="pageHead">
        <h2>My Bots</h2>
        <p>Create, manage and monitor your trading bots.</p>
      </div>

      <div className="botStatsCards">
        <BotStat title="Total Bots" value="12" tag="All Time" />
        <BotStat title="Running" value="5" tag="Live Now" />
        <BotStat title="Stopped" value="3" tag="Not running" />
        <BotStat title="Completed" value="4" tag="Finished" />
      </div>

      <div className="botSearchRow">
        <input placeholder="Search bots..." />
        <select>
          <option>All Status</option>
          <option>Running</option>
          <option>Stopped</option>
        </select>
        <button>+ New Bot</button>
      </div>

      <div className="botList">
        {bots.map((bot) => (
          <div className="botCard" key={bot.name}>
            <div className="botTop">
              <div className="botIcon">{bot.code}</div>
              <div>
                <strong>{bot.name}</strong>
                <span>
                  {bot.contract} • {bot.market}
                </span>
                <small>
                  Stake: {money(bot.stake)} USD • Duration: {bot.duration}s
                </small>
              </div>
              <em className={bot.status === "Running" ? "running" : "stopped"}>
                {bot.status}
              </em>
            </div>

            <div className="botMetrics">
              <div>
                <span>Total Profit</span>
                <strong className={bot.profit >= 0 ? "green" : "red"}>
                  {bot.profit >= 0 ? "+" : ""}
                  {money(bot.profit)} USD
                </strong>
              </div>
              <div>
                <span>Win Rate</span>
                <strong>{bot.winRate}</strong>
              </div>
              <div>
                <span>Trades</span>
                <strong>{bot.trades}</strong>
              </div>
              <div>
                <span>Balance</span>
                <strong>{money(bot.balance)} USD</strong>
              </div>
            </div>

            <button
              className="outlineBlue"
              onClick={() => {
                setBotRunner(bot);
                if (bot.status !== "Running") startBot(bot);
              }}
            >
              {bot.status === "Running" ? "View Details" : "Start Bot"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function BotStat({ title, value, tag }) {
  return (
    <div className="botStat">
      <span>{title}</span>
      <strong>{value}</strong>
      <small>{tag}</small>
    </div>
  );
}

function ProfilePage({ user, balances, transactions, logout, onDeposit }) {
  return (
    <div className="profilePage pageScroll">
      <div className="profileHero">
        <div className="profileAvatar">
          {user.initials}
          <span>📷</span>
        </div>

        <div>
          <h2>
            {user.name} <b>✓</b>
          </h2>
          <p>{user.email}</p>
          <em>Verified</em>
          <small>Member since May 10, 2024 • Last login: Today, 09:35</small>
        </div>

        <div className="levelCard">
          <strong>💎 Silver Trader</strong>
          <span>Current Level</span>
          <div>
            <i></i>
          </div>
          <small>Next: Gold Trader</small>
        </div>
      </div>

      <div className="profileStats">
        <Stat value={`${money(balances.real)} USD`} label="Real Balance" />
        <Stat value={`${money(balances.demo)} USD`} label="Demo Balance" />
        <Stat value="+2,450.75 USD" label="Total Profit" />
        <Stat value="63.25%" label="Win Rate" />
      </div>

      <div className="settingsList">
        <Setting title="Personal Information" desc="View and update your personal details" />
        <Setting title="Security" desc="Password, 2FA, login activity and security settings" />
        <Setting
          title="Verification (KYC)"
          desc="Verify your identity to unlock all features"
          badge="Verified"
        />
        <Setting title="Account Preferences" desc="Language, timezone, theme and layout settings" />
        <Setting title="Payment Methods" desc="Manage your deposit and withdrawal methods" onClick={onDeposit} />
        <Setting title="Transaction History" desc={`${transactions.length} deposits, withdrawals and trades`} />
        <Setting title="Referral Program" desc="Invite friends and earn commissions" badge="Earn up to 30%" />
        <Setting title="Notifications" desc="Manage email and push notifications" />
      </div>

      <div className="refCard">
        <strong>Invite friends and earn more!</strong>
        <span>Share your referral link and earn up to 30% commission.</span>
        <code>metabinary.com/ref/johnmaina</code>
      </div>

      <button className="logoutCard" onClick={logout}>
        <strong>Logout</strong>
        <span>Sign out of your MetaBinary account</span>
      </button>
    </div>
  );
}

function Setting({ title, desc, badge, onClick }) {
  return (
    <button className="settingRow" onClick={onClick}>
      <div className="settingIcon">⚙</div>
      <div>
        <strong>{title}</strong>
        <span>{desc}</span>
      </div>
      {badge && <em>{badge}</em>}
      <b>›</b>
    </button>
  );
}

function DepositModal({ user, onClose, onSubmit }) {
  const [method, setMethod] = useState("");
  const [amountUsd, setAmountUsd] = useState(10);
  const [phone, setPhone] = useState("");

  return (
    <div className="modalOverlay">
      <div className="darkModal">
        <button className="modalX" onClick={onClose}>
          ×
        </button>

        {!method ? (
          <>
            <h2>Deposit Funds</h2>
            <p>Choose payment method</p>

            <button className="paymentChoice" onClick={() => setMethod("mpesa")}>
              <span>📱</span>
              <div>
                <strong>M-Pesa</strong>
                <small>Instant mobile money</small>
              </div>
              <b>›</b>
            </button>

            <button className="paymentChoice" onClick={() => setMethod("card")}>
              <span>💳</span>
              <div>
                <strong>Credit/Debit Card</strong>
                <small>Visa, Mastercard</small>
              </div>
              <b>›</b>
            </button>

            <button className="paymentChoice" onClick={() => setMethod("usdt")}>
              <span>₿</span>
              <div>
                <strong>USDT (TRC20)</strong>
                <small>Cryptocurrency</small>
              </div>
              <b>›</b>
            </button>
          </>
        ) : (
          <>
            <button className="backBtn" onClick={() => setMethod("")}>
              ‹ Back
            </button>

            <h2>
              {method === "mpesa"
                ? "M-Pesa Deposit"
                : method === "card"
                ? "Card Deposit"
                : "USDT Deposit"}
            </h2>
            <p>Funds go to your real account.</p>

            <label>Amount USD</label>
            <input
              type="number"
              min="1"
              value={amountUsd}
              onChange={(e) => setAmountUsd(e.target.value)}
            />

            {method !== "usdt" && (
              <>
                <label>{method === "mpesa" ? "M-Pesa phone" : "Phone number"}</label>
                <input
                  placeholder="07XXXXXXXX or 2547XXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </>
            )}

            <button
              className="modalPrimary"
              onClick={() =>
                onSubmit({
                  email: user.email,
                  amountUsd: Number(amountUsd),
                  phone,
                  method,
                })
              }
            >
              {method === "mpesa" ? "Send STK Push" : "Continue"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function WithdrawModal({ onClose, onSubmit }) {
  const [amountUsd, setAmountUsd] = useState(5);
  const [phone, setPhone] = useState("");

  return (
    <div className="modalOverlay">
      <div className="darkModal">
        <button className="modalX" onClick={onClose}>
          ×
        </button>

        <h2>Withdraw Funds</h2>
        <p>Minimum withdrawal is $5.</p>

        <label>Amount USD</label>
        <input
          type="number"
          min="5"
          value={amountUsd}
          onChange={(e) => setAmountUsd(e.target.value)}
        />

        <label>M-Pesa phone</label>
        <input placeholder="07XXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} />

        <button
          className="modalPrimary"
          onClick={() =>
            onSubmit({
              amountUsd: Number(amountUsd),
              phone,
            })
          }
        >
          Request Withdrawal
        </button>
      </div>
    </div>
  );
}

function BotRunnerOverlay({
  bot,
  botRunning,
  onClose,
  onStart,
  onStop,
  openTrades,
  closedTrades,
  transactions,
}) {
  const [tab, setTab] = useState("summary");

  const totalStake = [...openTrades, ...closedTrades].reduce(
    (sum, trade) => sum + Number(trade.stake || 0),
    0
  );
  const totalPayout = closedTrades.reduce(
    (sum, trade) => sum + Number(trade.won ? trade.payout : 0),
    0
  );
  const won = closedTrades.filter((trade) => trade.won).length;
  const lost = closedTrades.filter((trade) => !trade.won).length;
  const pl = closedTrades.reduce(
    (sum, trade) => sum + (trade.won ? trade.profit : -trade.stake),
    0
  );
  const last = closedTrades[0];

  return (
    <div className="botRunner">
      <div className="runnerTop">
        <button onClick={onClose}>‹ Back to Bot</button>
        <strong>{bot.name}</strong>
      </div>

      <div className="runnerStatus">
        <div className="athena">
          Athena <span className={botRunning ? "on" : ""}></span>
        </div>
        <div className="statusBox">
          <strong>STATUS</strong>
          <small>Latest strategy update shows here when the bot runs.</small>
        </div>
        <a>Full log</a>
      </div>

      <div className="runnerTabs">
        {["summary", "transactions", "journal"].map((item) => (
          <button className={tab === item ? "active" : ""} key={item} onClick={() => setTab(item)}>
            {item[0].toUpperCase() + item.slice(1)}
          </button>
        ))}
      </div>

      <div className="runnerBody">
        {tab === "summary" && (
          <>
            {openTrades[0] ? (
              <div className="contractLive">
                <strong>Contract bought</strong>
                <span>
                  {openTrades[0].contract} · {openTrades[0].choice}
                </span>
                <div>
                  <i></i>
                </div>
              </div>
            ) : last ? (
              <div className={last.won ? "closedWin" : "closedLoss"}>
                <strong>⚑ Closed</strong>
                <h2>
                  {last.won ? "+" : "-"}
                  {money(last.won ? last.profit : last.stake)} USD
                </h2>
              </div>
            ) : (
              <div className="emptyRunner">When you’re ready to trade, hit Run.</div>
            )}
          </>
        )}

        {tab === "transactions" && (
          <div className="runnerTable">
            <div className="runnerTableHead">
              <strong>TYPE</strong>
              <strong>ENTRY/EXIT</strong>
              <strong>P/L</strong>
            </div>

            {[...openTrades, ...closedTrades].slice(0, 12).map((trade) => (
              <div className="runnerTableRow" key={trade.id}>
                <span>▥ ↗</span>
                <div>
                  <strong>{trade.entry || "—"}</strong>
                  <small>{trade.exit || "—"}</small>
                </div>
                <div>
                  <strong>{money(trade.stake)} USD</strong>
                  {trade.status !== "RUNNING" && (
                    <small className={trade.won ? "green" : "red"}>
                      {trade.won ? "+" : "-"}
                      {money(trade.won ? trade.profit : trade.stake)} USD
                    </small>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "journal" && (
          <div className="journal">
            {transactions.slice(0, 10).map((tx) => (
              <div key={tx.id}>
                <strong>{tx.type}</strong>
                <span>{tx.time}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="runnerStats">
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
          <span>{openTrades.length + closedTrades.length}</span>
        </div>
        <div>
          <strong>Lost</strong>
          <span>{lost}</span>
        </div>
        <div>
          <strong>Won</strong>
          <span>{won}</span>
        </div>
        <div>
          <strong>P/L</strong>
          <span className={pl >= 0 ? "green" : "red"}>
            {pl >= 0 ? "+" : ""}
            {money(pl)} USD
          </span>
        </div>
      </div>

      <div className="runnerBottom">
        {botRunning ? (
          <button className="stopRun" onClick={onStop}>
            ■ Stop
          </button>
        ) : (
          <button className="startRun" onClick={onStart}>
            ▶ Run
          </button>
        )}
        <div>
          <strong>{botRunning ? "Contract bought" : "Bot is not running"}</strong>
          <span>
            <i></i>
          </span>
        </div>
      </div>
    </div>
  );
}

function ToastList({ items }) {
  return (
    <div className="toastWrap">
      {items.map((toast) => (
        <div className={`toast ${toast.type}`} key={toast.id}>
          <strong>{toast.title}</strong>
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  );
}