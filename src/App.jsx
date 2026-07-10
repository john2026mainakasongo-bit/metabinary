import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function money(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function randomId() {
  return Date.now() + Math.random();
}

function savedJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [user, setUser] = useState(() =>
    savedJson("metabinary_user", {
      name: "John Maina",
      email: "johnmaina@gmail.com",
      initials: "JM",
      verified: true,
      brokerId: "MB-2026",
    })
  );

  const [activePage, setActivePage] = useState("home");
  const [account, setAccount] = useState("real");
  const [balances, setBalances] = useState(() =>
    savedJson("metabinary_balances", {
      demo: 10000,
      real: 10250,
    })
  );

  const [priceData, setPriceData] = useState(() =>
    Array.from({ length: 55 }, (_, i) => 867 + Math.sin(i / 4) * 0.7 + Math.random() * 0.7)
  );

  const [lastDigit, setLastDigit] = useState(0);
  const [digitStats, setDigitStats] = useState(() =>
    Array.from({ length: 10 }, () => 7 + Math.random() * 6)
  );

  const [tradeType, setTradeType] = useState("Even/Odd");
  const [stake, setStake] = useState(10);
  const [duration, setDuration] = useState(5);
  const [prediction, setPrediction] = useState(2);
  const [openTrades, setOpenTrades] = useState([]);
  const [closedTrades, setClosedTrades] = useState(() =>
    savedJson("metabinary_closed_trades", [])
  );
  const [transactions, setTransactions] = useState(() =>
    savedJson("metabinary_transactions", [])
  );

  const [toastList, setToastList] = useState([]);
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [botRunner, setBotRunner] = useState(null);
  const [botRunning, setBotRunning] = useState(false);

  const livePrice = priceData[priceData.length - 1] || 867;
  const balance = balances[account] || 0;

  useEffect(() => {
    localStorage.setItem("metabinary_user", JSON.stringify(user));
  }, [user]);

  useEffect(() => {
    localStorage.setItem("metabinary_balances", JSON.stringify(balances));
  }, [balances]);

  useEffect(() => {
    localStorage.setItem("metabinary_transactions", JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem("metabinary_closed_trades", JSON.stringify(closedTrades));
  }, [closedTrades]);

  useEffect(() => {
    const timer = setInterval(() => {
      setPriceData((old) => {
        const last = old[old.length - 1] || 867;
        const next = Number((last + (Math.random() - 0.48) * 0.55).toFixed(2));
        return [...old.slice(-54), next];
      });

      setLastDigit(Math.floor(Math.random() * 10));
      setDigitStats(Array.from({ length: 10 }, () => 7 + Math.random() * 6));
    }, 900);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    refreshBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.email]);

  async function refreshBalance() {
    try {
      const res = await fetch(`${API_URL}/api/user/${encodeURIComponent(user.email)}`);
      if (!res.ok) return;

      const data = await res.json();

      setBalances((old) => ({
        demo: Number(data.demoBalance ?? data.demo ?? old.demo ?? 10000),
        real: Number(data.realBalance ?? data.real ?? old.real ?? 0),
      }));
    } catch {
      // Keep local balance if backend is offline.
    }
  }

  function showToast(type, title, message) {
    const item = {
      id: randomId(),
      type,
      title,
      message,
    };

    setToastList((old) => [item, ...old].slice(0, 3));

    setTimeout(() => {
      setToastList((old) => old.filter((toast) => toast.id !== item.id));
    }, 3500);
  }

  function addTransaction(item) {
    setTransactions((old) => [
      {
        id: randomId(),
        time: new Date().toLocaleString(),
        ...item,
      },
      ...old,
    ]);
  }

  function updateBalance(targetAccount, amount) {
    setBalances((old) => ({
      ...old,
      [targetAccount]: Number((Number(old[targetAccount] || 0) + amount).toFixed(2)),
    }));
  }

  function getActions(type) {
    if (type === "Even/Odd") {
      return [
        { label: "Even", kind: "buy", icon: "▦" },
        { label: "Odd", kind: "sell", icon: "▵" },
      ];
    }

    if (type === "Rise/Fall") {
      return [
        { label: "Rise", kind: "buy", icon: "↗" },
        { label: "Fall", kind: "sell", icon: "↘" },
      ];
    }

    if (type === "Over/Under") {
      return [
        { label: "Over", kind: "buy", icon: "↑" },
        { label: "Under", kind: "sell", icon: "↓" },
      ];
    }

    if (type === "Matches/Differs") {
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

  function payoutRate(type, choice) {
    if (type === "Matches/Differs" && choice === "Matches") return 8.333;
    if (type === "Matches/Differs" && choice === "Differs") return 1.087;
    if (type === "Even/Odd") return 1.818;
    if (type === "Over/Under") return 1.85;
    return 1.9;
  }

  function decideResult(trade) {
    const digit = Math.floor(Math.random() * 10);
    const start = Number((livePrice + (Math.random() - 0.5) * 2).toFixed(3));
    const end = Number((start + (Math.random() - 0.48) * 1.5).toFixed(3));

    let won = false;

    if (trade.contract === "Even/Odd") {
      won = trade.choice === "Even" ? digit % 2 === 0 : digit % 2 !== 0;
    }

    if (trade.contract === "Rise/Fall") {
      won = trade.choice === "Rise" ? end > start : end < start;
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
      entry: start,
      exit: end,
      settledAt: new Date().toLocaleTimeString(),
    };
  }

  function placeTrade(choice, customBotName = "") {
    const cleanStake = Math.max(0.3, Number(stake || 0.3));
    const cleanDuration = Math.max(1, Number(duration || 5));
    const rate = payoutRate(tradeType, choice);
    const payout = Number((cleanStake * rate).toFixed(2));
    const profit = Number((payout - cleanStake).toFixed(2));

    if (balance < cleanStake) {
      showToast("loss", "Insufficient balance", `Your ${account} account has low balance.`);
      return;
    }

    const trade = {
      id: randomId(),
      account,
      contract: tradeType,
      choice,
      stake: cleanStake,
      duration: cleanDuration,
      prediction,
      payout,
      profit,
      status: "RUNNING",
      botName: customBotName,
      openedAt: new Date().toLocaleTimeString(),
    };

    updateBalance(account, -cleanStake);
    setOpenTrades((old) => [trade, ...old]);

    addTransaction({
      type: customBotName ? `${customBotName} contract bought` : "Contract bought",
      method: customBotName ? "Bot" : "Manual",
      account,
      amount: cleanStake,
      status: "Running",
      details: `${tradeType} · ${choice}`,
    });

    showToast(
      "open",
      "Trade placed",
      `${tradeType} · ${choice} · $${money(cleanStake)}`
    );

    setTimeout(() => {
      const settled = decideResult(trade);

      setOpenTrades((old) => old.filter((item) => item.id !== trade.id));
      setClosedTrades((old) => [settled, ...old].slice(0, 80));

      if (settled.won) {
        updateBalance(settled.account, settled.payout);
      }

      addTransaction({
        type: settled.won ? "Profit amount" : "Loss amount",
        method: customBotName ? "Bot" : "Manual",
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

  async function startDeposit(payload) {
    try {
      const res = await fetch(`${API_URL}/api/deposit/mpesa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || data.ok === false) {
        throw new Error(data.message || "Deposit failed");
      }

      addTransaction({
        type: "Deposit pending",
        method: payload.method || "M-Pesa",
        account: "real",
        amount: payload.amountUsd,
        status: "Pending",
        details: payload.phone || user.email,
      });

      showToast("open", "STK Push sent", "Check your phone and enter M-Pesa PIN.");
      setAccount("real");
      setDepositOpen(false);
      setTimeout(refreshBalance, 5000);
    } catch (error) {
      showToast("loss", "Deposit error", error.message || "Backend not connected.");
    }
  }

  async function requestWithdraw(payload) {
    try {
      if (Number(payload.amountUsd) < 5) {
        showToast("loss", "Minimum withdrawal", "Minimum withdrawal is $5.");
        return;
      }

      const res = await fetch(`${API_URL}/api/withdraw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || data.ok === false) {
        throw new Error(data.message || "Withdrawal failed");
      }

      updateBalance("real", -Number(payload.amountUsd));

      addTransaction({
        type: "Withdrawal request",
        method: "M-Pesa",
        account: "real",
        amount: -Number(payload.amountUsd),
        status: "Processing",
        details: payload.phone,
      });

      showToast("open", "Withdrawal requested", "Your request is processing.");
      setWithdrawOpen(false);
      setAccount("real");
      setTimeout(refreshBalance, 5000);
    } catch (error) {
      showToast("loss", "Withdrawal error", error.message || "Backend not connected.");
    }
  }

  function startBot(bot) {
    setBotRunner(bot);
    setBotRunning(true);
    showToast("open", `${bot.name} started`, "Bot is now buying contracts.");

    let runs = 0;

    const runTrade = () => {
      if (runs >= 8) return;
      runs += 1;

      setTradeType(bot.contract);
      setStake(bot.stake);
      setDuration(bot.duration);
      setPrediction(bot.prediction || 2);

      setTimeout(() => {
        placeTrade(bot.choice, bot.name);
      }, 50);
    };

    runTrade();

    const timer = setInterval(() => {
      if (runs >= 8) {
        clearInterval(timer);
        setBotRunning(false);
        return;
      }

      runTrade();
    }, (bot.duration + 2) * 1000);
  }

  function logout() {
    localStorage.removeItem("metabinary_user");
    setUser(null);
  }

  if (!user) {
    return (
      <LandingPage
        onStart={() =>
          setUser({
            name: "John Maina",
            email: "johnmaina@gmail.com",
            initials: "JM",
            verified: true,
            brokerId: "MB-2026",
          })
        }
      />
    );
  }

  return (
    <div className="app">
      <AppHeader
        user={user}
        account={account}
        setAccount={setAccount}
        balance={balance}
        onDeposit={() => setDepositOpen(true)}
        onWithdraw={() => setWithdrawOpen(true)}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        setActivePage={setActivePage}
        logout={logout}
      />

      <main className="screen">
        {activePage === "home" && (
          <HomePage setActivePage={setActivePage} onDeposit={() => setDepositOpen(true)} />
        )}

        {activePage === "markets" && <MarketsPage />}

        {activePage === "trade" && (
          <TradePage
            account={account}
            setAccount={setAccount}
            balance={balance}
            balances={balances}
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
            placeTrade={placeTrade}
            getActions={getActions}
            payoutRate={payoutRate}
            openTrades={openTrades}
            closedTrades={closedTrades}
          />
        )}

        {activePage === "bots" && (
          <BotsPage startBot={startBot} setBotRunner={setBotRunner} />
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

      <ToastList items={toastList} />

      {depositOpen && (
        <DepositModal
          user={user}
          onClose={() => setDepositOpen(false)}
          onSubmit={startDeposit}
        />
      )}

      {withdrawOpen && (
        <WithdrawModal
          user={user}
          onClose={() => setWithdrawOpen(false)}
          onSubmit={requestWithdraw}
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
          openTrades={openTrades.filter((t) => t.botName)}
          closedTrades={closedTrades.filter((t) => t.botName)}
          transactions={transactions.filter((t) => t.method === "Bot")}
        />
      )}
    </div>
  );
}

function LandingPage({ onStart }) {
  return (
    <div className="landing">
      <div className="landingTop">
        <button className="hamb">☰</button>
        <Logo />
        <div className="landingAuth">
          <button className="ghostBtn" onClick={onStart}>Login</button>
          <button className="blueBtn" onClick={onStart}>Register</button>
        </div>
      </div>

      <section className="hero">
        <div className="heroText">
          <h1>
            Trade Smarter.
            <span>Earn Consistently.</span>
          </h1>
          <p>AI-Powered Trading, Copy Trading, Binary Options & Forex — All in One Platform.</p>
          <button onClick={onStart}>Start Trading →</button>
          <a onClick={onStart}>Try Free Demo ›</a>
        </div>

        <div className="heroPhone">
          <div className="miniChart">
            <span>EUR/USD</span>
            <strong>1.08564</strong>
            <i></i>
          </div>
          <div className="callPut">
            <button>▲ CALL</button>
            <button>▼ PUT</button>
          </div>
        </div>
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
          <span>Let our AI analyze the market and trade for you 24/7.</span>
        </div>
        <button>Explore AI →</button>
      </div>

      <StatsCard />

      <TopMarkets />
    </div>
  );
}

function AppHeader({
  user,
  account,
  setAccount,
  balance,
  onDeposit,
  onWithdraw,
  menuOpen,
  setMenuOpen,
  setActivePage,
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
          <button className="bell">🔔<span>3</span></button>
          <button className="avatar">{user.initials}<i></i></button>
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
          <small>{account === "real" ? "Real Account" : "Demo Account"}</small>
          <strong>{money(balance)} USD</strong>
        </div>

        <button className="depositBig" onClick={onDeposit}>Deposit</button>
      </div>

      {menuOpen && (
        <div className="drawerMenu">
          <button onClick={() => setActivePage("trade")}>Trader’s Hub</button>
          <button onClick={onDeposit}>Cashier</button>
          <button onClick={onWithdraw}>Withdraw</button>
          <button onClick={() => setActivePage("bots")}>My Bots</button>
          <button onClick={() => setActivePage("profile")}>Profile</button>
          <button onClick={logout}>Logout</button>
        </div>
      )}
    </header>
  );
}

function Logo() {
  return (
    <div className="brandLogo">
      <div className="mark">M</div>
      <strong>Meta<span>Binary</span></strong>
    </div>
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
        <h1>Trade Smarter.<span>Earn Consistently.</span></h1>
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

      <button className="widePrimary" onClick={onDeposit}>Deposit Funds</button>
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
      {markets.map(([name, price, chg]) => (
        <div key={name}>
          <strong>{name}</strong>
          <span>{price}</span>
          <em className={chg.startsWith("+") ? "green" : "red"}>{chg}</em>
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

function TradePage({
  account,
  setAccount,
  balance,
  balances,
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
  placeTrade,
  getActions,
  payoutRate,
  openTrades,
  closedTrades,
}) {
  const actions = getActions(tradeType);

  return (
    <div className="tradePage">
      <div className="accountSummary">
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
      </div>

      <div className="hubRow">
        {["Trader’s Hub", "Reports", "Cashier", "History", "Forex", "Settings"].map((item) => (
          <button key={item} className={item === "Trader’s Hub" ? "active" : ""}>
            <span>{item === "Forex" ? "▥" : item === "Cashier" ? "▣" : "▤"}</span>
            {item}
          </button>
        ))}
      </div>

      <div className="typeRow">
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
      </div>

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
            <div
              className={`darkDigit ${
                digit === lastDigit ? "active" : digit === prediction ? "selected" : ""
              }`}
              key={digit}
              onClick={() => setPrediction(digit)}
            >
              <strong>{digit}</strong>
              <span>{pct.toFixed(1)}%</span>
            </div>
          ))}
        </div>
      </section>

      <section className="oddsStats">
        <div>
          <strong>Even Hits</strong>
          <span className="green">52%</span>
          <small>(260)</small>
        </div>

        <div className="donut">1040<small>Total</small></div>

        <div>
          <strong>Odd Hits</strong>
          <span className="red">48%</span>
          <small>(240)</small>
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
              <button onClick={() => setStake((old) => Math.max(0.3, old - 1))}>−</button>
              <strong>{money(stake)}</strong>
              <button onClick={() => setStake((old) => old + 1)}>+</button>
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
                <option value={digit} key={digit}>{digit}</option>
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
          <strong>Open Trades <span>{openTrades.length}</span></strong>
          <strong>Profit Trades <span>{closedTrades.filter((t) => t.won).length}</span></strong>
          <strong>Loss Trades <span>{closedTrades.filter((t) => !t.won).length}</span></strong>
        </div>

        {openTrades.slice(0, 3).map((trade) => (
          <div className="tradeRow" key={trade.id}>
            <strong>{trade.contract}</strong>
            <span>{trade.choice}</span>
            <span>{money(trade.stake)} USD</span>
            <em>Running</em>
          </div>
        ))}

        {openTrades.length === 0 && <p className="emptyText">No open trades yet.</p>}
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

function MarketsPage() {
  return (
    <div className="marketsPage">
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
    <div className="botsPage">
      <div className="botTabsTop">
        {["Bot Builder", "My Bots", "Running Bots", "Bot History", "Strategies"].map((tab, i) => (
          <button className={i === 1 ? "active" : ""} key={tab}>{tab}</button>
        ))}
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
                <span>{bot.contract} • {bot.market}</span>
                <small>Stake: {money(bot.stake)} USD • Duration: {bot.duration}s</small>
              </div>
              <em className={bot.status === "Running" ? "running" : "stopped"}>{bot.status}</em>
            </div>

            <div className="botMetrics">
              <div><span>Total Profit</span><strong className={bot.profit >= 0 ? "green" : "red"}>{bot.profit >= 0 ? "+" : ""}{money(bot.profit)} USD</strong></div>
              <div><span>Win Rate</span><strong>{bot.winRate}</strong></div>
              <div><span>Trades</span><strong>{bot.trades}</strong></div>
              <div><span>Balance</span><strong>{money(bot.balance)} USD</strong></div>
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
    <div className="profilePage">
      <div className="profileHero">
        <div className="profileAvatar">{user.initials}<span>📷</span></div>
        <div>
          <h2>{user.name} <b>✓</b></h2>
          <p>{user.email}</p>
          <em>Verified</em>
          <small>Member since May 10, 2024 • Last login: Today, 09:35</small>
        </div>

        <div className="levelCard">
          <strong>💎 Silver Trader</strong>
          <span>Current Level</span>
          <div><i></i></div>
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
        <Setting title="Verification (KYC)" desc="Verify your identity to unlock all features" badge="Verified" />
        <Setting title="Account Preferences" desc="Language, timezone, theme and layout settings" />
        <Setting title="Payment Methods" desc="Manage your deposit and withdrawal methods" onClick={onDeposit} />
        <Setting title="Transaction History" desc={`${transactions.length} deposits, withdrawals and trades`} />
        <Setting title="Referral Program" desc="Invite friends and earn commissions" badge="Earn up to 30%" />
        <Setting title="Notifications" desc="Manage your email and push notifications" />
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
        <button className="modalX" onClick={onClose}>×</button>

        {!method ? (
          <>
            <h2>Deposit Funds</h2>
            <p>Choose payment method</p>

            <button className="paymentChoice" onClick={() => setMethod("mpesa")}>
              <span>📱</span>
              <div><strong>M-Pesa</strong><small>Instant mobile money</small></div>
              <b>›</b>
            </button>

            <button className="paymentChoice" onClick={() => setMethod("card")}>
              <span>💳</span>
              <div><strong>Credit/Debit Card</strong><small>Visa, Mastercard</small></div>
              <b>›</b>
            </button>

            <button className="paymentChoice" onClick={() => setMethod("usdt")}>
              <span>₿</span>
              <div><strong>USDT (TRC20)</strong><small>Cryptocurrency</small></div>
              <b>›</b>
            </button>
          </>
        ) : (
          <>
            <button className="backBtn" onClick={() => setMethod("")}>‹ Back</button>
            <h2>{method === "mpesa" ? "M-Pesa Deposit" : method === "card" ? "Card Deposit" : "USDT Deposit"}</h2>
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
                <label>{method === "mpesa" ? "M-Pesa phone" : "Phone optional"}</label>
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

function WithdrawModal({ user, onClose, onSubmit }) {
  const [amountUsd, setAmountUsd] = useState(5);
  const [phone, setPhone] = useState("");

  return (
    <div className="modalOverlay">
      <div className="darkModal">
        <button className="modalX" onClick={onClose}>×</button>
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
        <input
          placeholder="07XXXXXXXX"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <button
          className="modalPrimary"
          onClick={() =>
            onSubmit({
              email: user.email,
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

  const totalStake = [...openTrades, ...closedTrades].reduce((s, t) => s + Number(t.stake || 0), 0);
  const totalPayout = closedTrades.reduce((s, t) => s + Number(t.won ? t.payout : 0), 0);
  const won = closedTrades.filter((t) => t.won).length;
  const lost = closedTrades.filter((t) => !t.won).length;
  const pl = closedTrades.reduce((s, t) => s + (t.won ? t.profit : -t.stake), 0);
  const last = closedTrades[0];

  return (
    <div className="botRunner">
      <div className="runnerTop">
        <button onClick={onClose}>‹ Back to Bot</button>
        <strong>{bot.name}</strong>
      </div>

      <div className="runnerStatus">
        <div className="athena">Athena <span className={botRunning ? "on" : ""}></span></div>
        <div className="statusBox">
          <strong>STATUS</strong>
          <small>Latest strategy update shows here when the bot runs.</small>
        </div>
        <a>Full log</a>
      </div>

      <div className="runnerTabs">
        {["summary", "transactions", "journal"].map((item) => (
          <button
            className={tab === item ? "active" : ""}
            key={item}
            onClick={() => setTab(item)}
          >
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
                <span>{openTrades[0].contract} · {openTrades[0].choice}</span>
                <div><i></i></div>
              </div>
            ) : last ? (
              <div className={last.won ? "closedWin" : "closedLoss"}>
                <strong>⚑ Closed</strong>
                <h2>{last.won ? "+" : "-"}{money(last.won ? last.profit : last.stake)} USD</h2>
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
                      {trade.won ? "+" : "-"}{money(trade.won ? trade.profit : trade.stake)} USD
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
        <div><strong>Stake</strong><span>{money(totalStake)} USD</span></div>
        <div><strong>Payout</strong><span>{money(totalPayout)} USD</span></div>
        <div><strong>Runs</strong><span>{openTrades.length + closedTrades.length}</span></div>
        <div><strong>Lost</strong><span>{lost}</span></div>
        <div><strong>Won</strong><span>{won}</span></div>
        <div><strong>P/L</strong><span className={pl >= 0 ? "green" : "red"}>{pl >= 0 ? "+" : ""}{money(pl)} USD</span></div>
      </div>

      <div className="runnerBottom">
        {botRunning ? (
          <button className="stopRun" onClick={onStop}>■ Stop</button>
        ) : (
          <button className="startRun" onClick={onStart}>▶ Run</button>
        )}
        <div>
          <strong>{botRunning ? "Contract bought" : "Bot is not running"}</strong>
          <span><i></i></span>
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