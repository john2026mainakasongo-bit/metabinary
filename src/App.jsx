import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const STORE = {
  user: "mb_user",
  account: "mb_account",
  balances: "mb_balances",
  tx: "mb_transactions",
  positions: "mb_positions",
  closed: "mb_closed_positions",
};

const MARKETS = ["EUR/USD", "GBP/USD", "XAU/USD", "BTC/USD", "USD/JPY"];

const BOT_TEMPLATES = [
  {
    id: "bot-1",
    code: "NE",
    name: "Neon Eclipse",
    type: "Even/Odd",
    market: "Volatility 100 (1s) Index",
    stake: 10,
    duration: 5,
    status: "Running",
    profit: 250.75,
    winRate: 72.5,
    trades: 36,
  },
  {
    id: "bot-2",
    code: "QS",
    name: "Quantum Surge",
    type: "Rise/Fall",
    market: "Volatility 75 Index",
    stake: 15,
    duration: 5,
    status: "Stopped",
    profit: 180.4,
    winRate: 68,
    trades: 34,
  },
  {
    id: "bot-3",
    code: "AO",
    name: "Alpha OverUnder",
    type: "Over/Under",
    market: "Volatility 100 Index",
    stake: 10,
    duration: 5,
    status: "Stopped",
    profit: -45,
    winRate: 45,
    trades: 23,
  },
  {
    id: "bot-4",
    code: "MD",
    name: "Matrix Differ",
    type: "Matches/Differs",
    market: "Volatility 50 Index",
    stake: 20,
    duration: 5,
    status: "Stopped",
    profit: -120,
    winRate: 40,
    trades: 20,
  },
];

function readStore(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveStore(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function money(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function initials(name = "JM") {
  return (
    String(name)
      .replace("@gmail.com", "")
      .split(/[ ._-]/)
      .filter(Boolean)
      .slice(0, 2)
      .map((x) => x[0]?.toUpperCase())
      .join("") || "JM"
  );
}

function makePrices(start = 1.08564) {
  let value = start;
  return Array.from({ length: 110 }, (_, i) => {
    value += (Math.random() - 0.48) * 0.00045 + Math.sin(i / 8) * 0.00005;
    return Number(value.toFixed(5));
  });
}

export default function App() {
  const [user, setUser] = useState(() => readStore(STORE.user, null));
  const [authMode, setAuthMode] = useState("login");

  const [activePage, setActivePage] = useState("home");
  const [account, setAccount] = useState(() => readStore(STORE.account, "demo"));
  const [balances, setBalances] = useState(() =>
    readStore(STORE.balances, { demo: 10000, real: 0 })
  );

  const [prices, setPrices] = useState(() => makePrices());
  const [positions, setPositions] = useState(() => readStore(STORE.positions, []));
  const [closedPositions, setClosedPositions] = useState(() => readStore(STORE.closed, []));
  const [transactions, setTransactions] = useState(() => readStore(STORE.tx, []));

  const [menuOpen, setMenuOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const [tradeType, setTradeType] = useState("Even/Odd");
  const [stake, setStake] = useState(10);
  const [duration, setDuration] = useState(5);
  const [prediction, setPrediction] = useState(2);
  const [lastDigit, setLastDigit] = useState(0);
  const [digitStats, setDigitStats] = useState(() =>
    Array.from({ length: 10 }, () => 7 + Math.random() * 6)
  );

  const [selectedBot, setSelectedBot] = useState(null);
  const [botRunning, setBotRunning] = useState(false);
  const [botTab, setBotTab] = useState("summary");
  const [botTrades, setBotTrades] = useState([]);

  const livePrice = prices[prices.length - 1] || 1.08564;
  const balance = balances[account] || 0;

  useEffect(() => saveStore(STORE.user, user), [user]);
  useEffect(() => saveStore(STORE.account, account), [account]);
  useEffect(() => saveStore(STORE.balances, balances), [balances]);
  useEffect(() => saveStore(STORE.positions, positions), [positions]);
  useEffect(() => saveStore(STORE.closed, closedPositions), [closedPositions]);
  useEffect(() => saveStore(STORE.tx, transactions), [transactions]);

  useEffect(() => {
    const timer = setInterval(() => {
      setPrices((old) => {
        const last = old[old.length - 1] || 1.08564;
        const next = Number(
          (last + (Math.random() - 0.5) * 0.0006 + Math.sin(Date.now() / 7000) * 0.00006).toFixed(5)
        );
        return [...old.slice(-109), next];
      });

      setLastDigit(Math.floor(Math.random() * 10));
      setDigitStats(Array.from({ length: 10 }, () => 7 + Math.random() * 6));
    }, 900);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setPositions((old) =>
      old.map((p) => {
        const pl =
          p.side === "Buy"
            ? (livePrice - p.openPrice) * 100000 * p.volume
            : (p.openPrice - livePrice) * 100000 * p.volume;

        return {
          ...p,
          currentPrice: livePrice,
          pl: Number(pl.toFixed(2)),
          plPercent: Number(((pl / 1000) * 100).toFixed(2)),
        };
      })
    );
  }, [livePrice]);

  useEffect(() => {
    if (!user?.email) return;
    refreshUser();

    const timer = setInterval(refreshUser, 8000);
    return () => clearInterval(timer);
  }, [user?.email]);

  useEffect(() => {
    if (!botRunning || !selectedBot) return;

    const timer = setInterval(() => {
      runBotTrade(selectedBot);
    }, 6500);

    return () => clearInterval(timer);
  }, [botRunning, selectedBot, balances, account]);

  async function refreshUser() {
    try {
      const res = await fetch(`${API_URL}/api/user/${encodeURIComponent(user.email)}`);
      if (!res.ok) return;

      const data = await res.json();

      setBalances((old) => ({
        demo: Number(data.demoBalance ?? old.demo ?? 10000),
        real: Number(data.realBalance ?? old.real ?? 0),
      }));
    } catch {
      return;
    }
  }

  function notify(type, title, message) {
    setToast({ type, title, message });
    setTimeout(() => setToast(null), 3200);
  }

  function addTx(tx) {
    setTransactions((old) => [
      {
        id: uid(),
        time: new Date().toLocaleString(),
        ...tx,
      },
      ...old,
    ]);
  }

  function updateBalance(targetAccount, amount) {
    setBalances((old) => ({
      ...old,
      [targetAccount]: Number((Number(old[targetAccount] || 0) + Number(amount)).toFixed(2)),
    }));
  }

  function login(data) {
    if (!data.email || !data.password) {
      notify("loss", "Login failed", "Enter email and password.");
      return;
    }

    const logged = {
      name: data.email.split("@")[0],
      email: data.email,
      initials: initials(data.email),
      brokerId: "MB" + Math.floor(100000 + Math.random() * 900000),
      verified: true,
    };

    setUser(logged);
    setActivePage("home");
    notify("win", "Welcome back", "Login successful.");
  }

  function register(data) {
    if (!data.firstName || !data.lastName || !data.email || !data.password) {
      notify("loss", "Register failed", "Fill all required fields.");
      return;
    }

    if (data.password !== data.confirmPassword) {
      notify("loss", "Password error", "Passwords do not match.");
      return;
    }

    const created = {
      name: `${data.firstName} ${data.lastName}`,
      email: data.email,
      phone: data.phone,
      initials: initials(`${data.firstName} ${data.lastName}`),
      brokerId: "MB" + Math.floor(100000 + Math.random() * 900000),
      verified: true,
    };

    setUser(created);
    setBalances({ demo: 10000, real: 0 });
    setActivePage("home");
    notify("win", "Account created", "Your demo account is ready.");
  }

  function logout() {
    localStorage.removeItem(STORE.user);
    setUser(null);
    setMenuOpen(false);
    setActivePage("home");
    setAuthMode("login");
  }

  function placeForexOrder({ side, symbol, volume, leverage, stopLoss, takeProfit }) {
    const openPrice =
      side === "Buy"
        ? Number((livePrice + 0.00002).toFixed(5))
        : Number((livePrice - 0.00002).toFixed(5));

    const position = {
      id: uid(),
      account,
      instrument: symbol,
      side,
      volume: Number(volume || 0.01),
      leverage,
      openPrice,
      currentPrice: livePrice,
      stopLoss: Number(stopLoss || (side === "Buy" ? livePrice - 0.002 : livePrice + 0.002)),
      takeProfit: Number(takeProfit || (side === "Buy" ? livePrice + 0.002 : livePrice - 0.002)),
      pl: 0,
      plPercent: 0,
      openedAt: new Date().toLocaleTimeString(),
    };

    setPositions((old) => [position, ...old].slice(0, 20));

    addTx({
      type: `${side} ${symbol}`,
      method: "Forex",
      account,
      amount: 0,
      status: "Open",
      details: `${position.volume} lot`,
    });

    notify("open", `${side} order placed`, `${symbol} · ${position.volume} lot`);
  }

  function updatePosition(id, patch) {
    setPositions((old) => old.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function closePosition(id) {
    const item = positions.find((p) => p.id === id);
    if (!item) return;

    updateBalance(item.account, item.pl);

    setClosedPositions((old) => [
      {
        ...item,
        status: "Closed",
        closedAt: new Date().toLocaleTimeString(),
      },
      ...old,
    ]);

    setPositions((old) => old.filter((p) => p.id !== id));

    addTx({
      type: `Closed ${item.side} ${item.instrument}`,
      method: "Forex",
      account: item.account,
      amount: item.pl,
      status: "Closed",
      details: `${item.volume} lot`,
    });

    notify(
      item.pl >= 0 ? "win" : "loss",
      "Trade closed",
      `${item.pl >= 0 ? "+" : ""}${money(item.pl)} USD`
    );
  }

  function closeAllPositions() {
    positions.forEach((p) => closePosition(p.id));
  }

  function actionsFor(type) {
    if (type === "Even/Odd") return ["Even", "Odd"];
    if (type === "Matches/Differs") return ["Matches", "Differs"];
    if (type === "Over/Under") return ["Over", "Under"];
    if (type === "Rise/Fall") return ["Rise", "Fall"];
    return ["Touch", "No Touch"];
  }

  function payoutRate(type, action) {
    if (type === "Matches/Differs" && action === "Matches") return 8.333;
    if (type === "Matches/Differs" && action === "Differs") return 1.087;
    if (type === "Even/Odd") return 1.818;
    return 1.9;
  }

  function runBinaryTrade(type, action) {
    const usedStake = Number(stake);

    if (usedStake < 0.3) {
      notify("loss", "Minimum stake", "Minimum stake is 0.30 USD.");
      return;
    }

    if (balance < usedStake) {
      notify("loss", "Low balance", `Your ${account} balance is low.`);
      return;
    }

    updateBalance(account, -usedStake);

    const openTrade = {
      id: uid(),
      account,
      type,
      action,
      stake: usedStake,
      prediction,
      payout: Number((usedStake * payoutRate(type, action)).toFixed(2)),
      openedAt: new Date().toLocaleTimeString(),
      status: "RUNNING",
    };

    notify("open", "Contract bought", `${type} · ${action}`);

    setTimeout(() => {
      const digit = Math.floor(Math.random() * 10);

      let won = false;

      if (type === "Even/Odd") won = action === "Even" ? digit % 2 === 0 : digit % 2 !== 0;
      else if (type === "Matches/Differs")
        won = action === "Matches" ? digit === prediction : digit !== prediction;
      else if (type === "Over/Under") won = action === "Over" ? digit > prediction : digit < prediction;
      else won = Math.random() > 0.54;

      const profit = Number((openTrade.payout - usedStake).toFixed(2));

      if (won) updateBalance(account, openTrade.payout);

      addTx({
        type: won ? "Profit amount" : "Loss amount",
        method: "Manual",
        account,
        amount: won ? profit : -usedStake,
        status: won ? "WON" : "LOST",
        details: `${type} · ${action} · digit ${digit}`,
      });

      notify(
        won ? "win" : "loss",
        won ? "Trade won" : "Trade lost",
        `${won ? "+" : "-"}${money(won ? profit : usedStake)} USD`
      );
    }, duration * 1000);
  }

  function runBotTrade(bot) {
    const usedStake = Number(bot.stake || 1);

    if (balance < usedStake) {
      notify("loss", "Bot stopped", "Low balance.");
      setBotRunning(false);
      return;
    }

    updateBalance(account, -usedStake);

    const won = Math.random() > 0.48;
    const payout = Number((usedStake * 1.82).toFixed(2));
    const profit = Number((payout - usedStake).toFixed(2));

    const row = {
      id: uid(),
      botName: bot.name,
      type: bot.type,
      action: bot.type === "Rise/Fall" ? "Rise" : "Even",
      stake: usedStake,
      payout,
      profit,
      won,
      status: won ? "WON" : "LOST",
      time: new Date().toLocaleTimeString(),
    };

    setBotTrades((old) => [row, ...old].slice(0, 50));

    if (won) updateBalance(account, payout);

    addTx({
      type: won ? "Bot profit" : "Bot loss",
      method: "Bot",
      account,
      amount: won ? profit : -usedStake,
      status: row.status,
      details: `${bot.name} · ${bot.type}`,
    });
  }

  function startBot(bot) {
    setSelectedBot(bot);
    setBotRunning(true);
    setBotTab("summary");
    setActivePage("botLive");
    runBotTrade(bot);
    notify("open", "Bot started", bot.name);
  }

  function stopBot() {
    setBotRunning(false);
    notify("open", "Bot stopped", "No new contracts will be bought.");
  }

  async function submitDeposit(data) {
    try {
      const res = await fetch(`${API_URL}/api/deposit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, email: user.email }),
      });

      const json = await res.json();

      if (!res.ok || json.ok === false) throw new Error(json.message || "Deposit failed.");

      setDepositOpen(false);
      setAccount("real");

      addTx({
        type: "Deposit pending",
        method: data.method,
        account: "real",
        amount: Number(data.amountUsd),
        status: "Pending",
        details: data.phone || data.method,
      });

      notify("open", "Deposit started", "Check your phone for STK push.");
      setTimeout(refreshUser, 5000);
    } catch (error) {
      notify("loss", "Deposit error", error.message || "Backend not connected.");
    }
  }

  async function submitWithdraw(data) {
    const amount = Number(data.amountUsd);

    if (amount < 5) {
      notify("loss", "Minimum withdrawal", "Minimum withdrawal is 5 USD.");
      return;
    }

    if (balances.real < amount) {
      notify("loss", "Low real balance", "You do not have enough real balance.");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/withdraw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, email: user.email }),
      });

      const json = await res.json();

      if (!res.ok || json.ok === false) throw new Error(json.message || "Withdrawal failed.");

      updateBalance("real", -amount);
      setWithdrawOpen(false);

      addTx({
        type: "Withdrawal request",
        method: "M-Pesa",
        account: "real",
        amount: -amount,
        status: "Processing",
        details: data.phone,
      });

      notify("open", "Withdrawal requested", "Your withdrawal is processing.");
    } catch (error) {
      notify("loss", "Withdrawal error", error.message || "Backend not connected.");
    }
  }

  if (!user) {
    return (
      <>
        <AuthScreen mode={authMode} setMode={setAuthMode} login={login} register={register} />
        {toast && <Toast toast={toast} />}
      </>
    );
  }

  return (
    <div className="app">
      <Header
        user={user}
        account={account}
        setAccount={setAccount}
        balance={balance}
        setActivePage={setActivePage}
        openMenu={() => setMenuOpen(true)}
        openDeposit={() => setDepositOpen(true)}
      />

      <main className="mainScreen">
        {activePage === "home" && (
          <HomePage
            livePrice={livePrice}
            prices={prices}
            setActivePage={setActivePage}
            openDeposit={() => setDepositOpen(true)}
          />
        )}

        {activePage === "forex" && (
          <ForexPage
            livePrice={livePrice}
            prices={prices}
            positions={positions}
            closedPositions={closedPositions}
            placeForexOrder={placeForexOrder}
            updatePosition={updatePosition}
            closePosition={closePosition}
            closeAllPositions={closeAllPositions}
            setActivePage={setActivePage}
            openDeposit={() => setDepositOpen(true)}
          />
        )}

        {activePage === "trade" && (
          <TradePage
            prices={prices}
            livePrice={livePrice}
            tradeType={tradeType}
            setTradeType={setTradeType}
            stake={stake}
            setStake={setStake}
            duration={duration}
            setDuration={setDuration}
            prediction={prediction}
            setPrediction={setPrediction}
            lastDigit={lastDigit}
            digitStats={digitStats}
            actionsFor={actionsFor}
            payoutRate={payoutRate}
            runBinaryTrade={runBinaryTrade}
          />
        )}

        {activePage === "bots" && <BotsPage bots={BOT_TEMPLATES} startBot={startBot} />}

        {activePage === "botLive" && (
          <BotLivePage
            bot={selectedBot}
            running={botRunning}
            stopBot={stopBot}
            startBot={startBot}
            trades={botTrades}
            botTab={botTab}
            setBotTab={setBotTab}
            back={() => setActivePage("bots")}
          />
        )}

        {activePage === "profile" && (
          <ProfilePage
            user={user}
            balances={balances}
            transactions={transactions}
            logout={logout}
            setActivePage={setActivePage}
          />
        )}

        {activePage === "settings" && (
          <SettingsPage
            account={account}
            setAccount={setAccount}
            tradeType={tradeType}
            setTradeType={setTradeType}
            stake={stake}
            setStake={setStake}
          />
        )}

        {activePage === "history" && <HistoryPage transactions={transactions} />}

        {activePage === "reports" && (
          <ReportsPage
            transactions={transactions}
            closedPositions={closedPositions}
            botTrades={botTrades}
          />
        )}
      </main>

      <BottomNav activePage={activePage} setActivePage={setActivePage} />

      {menuOpen && (
        <SideMenu
          user={user}
          account={account}
          setAccount={setAccount}
          balance={balance}
          close={() => setMenuOpen(false)}
          setActivePage={setActivePage}
          openDeposit={() => setDepositOpen(true)}
          openWithdraw={() => setWithdrawOpen(true)}
          logout={logout}
        />
      )}

      {depositOpen && <DepositModal close={() => setDepositOpen(false)} submit={submitDeposit} />}

      {withdrawOpen && <WithdrawModal close={() => setWithdrawOpen(false)} submit={submitWithdraw} />}

      {toast && <Toast toast={toast} />}
    </div>
  );
}

function Logo() {
  return (
    <div className="logo">
      <div>M</div>
      <strong>
        Meta<span>Binary</span>
      </strong>
    </div>
  );
}

function AuthScreen({ mode, setMode, login, register }) {
  const [loginData, setLoginData] = useState({ email: "", password: "" });

  const [regData, setRegData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  return (
    <div className="authPage">
      {mode === "login" ? (
        <section className="authCard loginCard">
          <Logo />

          <h1>Welcome Back</h1>
          <p>Login to your account and continue trading.</p>

          <label>Email Address</label>
          <input
            placeholder="Enter your email"
            value={loginData.email}
            onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
          />

          <label>Password</label>
          <input
            type="password"
            placeholder="Enter your password"
            value={loginData.password}
            onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
          />

          <button className="primaryBtn" onClick={() => login(loginData)}>
            Login →
          </button>

          <small>
            Don’t have an account?{" "}
            <button onClick={() => setMode("register")}>Create Account</button>
          </small>
        </section>
      ) : (
        <section className="authCard registerCard">
          <Logo />

          <h1>Create Your Account</h1>
          <p>Join MetaBinary and start your trading journey.</p>

          <div className="registerGrid">
            <input
              placeholder="First name"
              value={regData.firstName}
              onChange={(e) => setRegData({ ...regData, firstName: e.target.value })}
            />
            <input
              placeholder="Last name"
              value={regData.lastName}
              onChange={(e) => setRegData({ ...regData, lastName: e.target.value })}
            />
            <input
              placeholder="Email address"
              value={regData.email}
              onChange={(e) => setRegData({ ...regData, email: e.target.value })}
            />
            <input
              placeholder="+254 phone number"
              value={regData.phone}
              onChange={(e) => setRegData({ ...regData, phone: e.target.value })}
            />
            <input
              type="password"
              placeholder="Password"
              value={regData.password}
              onChange={(e) => setRegData({ ...regData, password: e.target.value })}
            />
            <input
              type="password"
              placeholder="Confirm password"
              value={regData.confirmPassword}
              onChange={(e) => setRegData({ ...regData, confirmPassword: e.target.value })}
            />
          </div>

          <button className="primaryBtn" onClick={() => register(regData)}>
            Create Account
          </button>

          <small>
            Already have an account? <button onClick={() => setMode("login")}>Login</button>
          </small>
        </section>
      )}
    </div>
  );
}

function Header({ user, account, setAccount, balance, setActivePage, openMenu, openDeposit }) {
  return (
    <header className="topHeader">
      <button className="menuBtn" onClick={openMenu}>
        ☰
      </button>

      <Logo />

      <button className="walletBox" onClick={() => setActivePage("profile")}>
        <small>{account === "demo" ? "DEMO ACCOUNT" : "REAL ACCOUNT"}</small>
        <strong>{money(balance)} USD</strong>
        <span>⌄</span>
      </button>

      <div className="accountSwitch">
        <button className={account === "demo" ? "active" : ""} onClick={() => setAccount("demo")}>
          Demo
        </button>
        <button className={account === "real" ? "active" : ""} onClick={() => setAccount("real")}>
          Real
        </button>
      </div>

      <button className="depositTop" onClick={openDeposit}>
        Deposit
      </button>

      <button className="bellBtn">
        🔔
        <b>3</b>
      </button>

      <button className="avatarBtn" onClick={() => setActivePage("profile")}>
        {user.initials}
        <i></i>
      </button>
    </header>
  );
}

function HubNav({ active, setActivePage, openDeposit }) {
  const items = [
    ["Trader’s Hub", "⌂", "home"],
    ["Reports", "▤", "reports"],
    ["History", "↺", "history"],
    ["Forex", "▥", "forex"],
    ["Settings", "⚙", "settings"],
    ["Cashier", "▱", "deposit"],
  ];

  return (
    <nav className="hubNav">
      {items.map(([label, icon, page]) => (
        <button
          key={label}
          className={active === label ? "active" : ""}
          onClick={() => {
            if (page === "deposit") openDeposit();
            else setActivePage(page);
          }}
        >
          <span>{icon}</span>
          <small>{label}</small>
        </button>
      ))}
    </nav>
  );
}

function HomePage({ livePrice, prices, setActivePage, openDeposit }) {
  return (
    <div className="page homePage">
      <HubNav active="Trader’s Hub" setActivePage={setActivePage} openDeposit={openDeposit} />

      <section className="proHero">
        <div className="heroText">
          <h1>
            Trade Smarter.
            <span>Earn Consistently.</span>
          </h1>

          <p>AI-powered trading, binary options, forex and bots in one intelligent platform.</p>

          <button onClick={() => setActivePage("trade")}>Start Trading →</button>

          <div className="heroFeatureRow">
            <HeroFeature icon="🧠" title="AI-Powered" text="Smart market insights" />
            <HeroFeature icon="🛡" title="Secure & Reliable" text="Bank-grade protection" />
            <HeroFeature icon="⚡" title="Fast Execution" text="Lightning-fast trades" />
          </div>
        </div>

        <div className="heroChartGlow">
          <CandleGlow />
        </div>

        <div className="livePairCard">
          <div className="pairHead">
            <strong>🇺🇸 EUR/USD</strong>
            <span>● LIVE</span>
          </div>

          <h2>{livePrice.toFixed(5)}</h2>
          <p>+0.00254 (+0.23%) ▲</p>

          <LineMini prices={prices} />

          <div className="pairTimes">
            <button className="active">1M</button>
            <button>5M</button>
            <button>15M</button>
            <button>1H</button>
            <button>1D</button>
          </div>

          <div className="pairActions">
            <button onClick={() => setActivePage("trade")}>↗ CALL</button>
            <button onClick={() => setActivePage("trade")}>↘ PUT</button>
          </div>
        </div>
      </section>

      <section className="homeStats">
        <Stat icon="📈" value="$2,456,789" label="Total Trades" spark="blue" />
        <Stat icon="👥" value="15,342" label="Active Traders" spark="purple" />
        <Stat icon="💵" value="$892,456" label="Payouts" spark="green" />
        <Stat icon="🏆" value="98.62%" label="Success Rate" spark="yellow" />
      </section>

      <section className="marketTicker">
        <TickerItem icon="🇪🇺" pair="EUR/USD" price="1.08564" change="+0.23%" good />
        <TickerItem icon="🇬🇧" pair="GBP/USD" price="1.26543" change="-0.11%" />
        <TickerItem icon="🥇" pair="XAU/USD" price="2,345.67" change="+0.24%" good />
        <TickerItem icon="₿" pair="BTC/USD" price="63,245.12" change="+0.24%" good />
      </section>

      <section className="homeLowerGrid">
        <div className="aiTradingCard">
          <div className="aiChip">AI</div>
          <div>
            <h3>
              AI-Powered Trading <b>NEW</b>
            </h3>
            <p>Advanced algorithms analyze market patterns in real-time to deliver smarter trade signals and higher accuracy.</p>
            <button onClick={() => setActivePage("bots")}>Explore AI Tools →</button>
          </div>
        </div>

        <div className="quickActions">
          <h3>Quick Actions</h3>

          <div>
            <button onClick={() => setActivePage("trade")}>📉<span>New Trade</span></button>
            <button onClick={() => setActivePage("bots")}>🧠<span>AI Signals</span></button>
            <button onClick={() => setActivePage("reports")}>📄<span>Market News</span></button>
            <button onClick={() => setActivePage("history")}>🗓<span>Calendar</span></button>
          </div>
        </div>

        <div className="topMarkets">
          <h3>
            Top Markets <button onClick={() => setActivePage("forex")}>View All</button>
          </h3>

          {[
            ["🇪🇺", "EUR/USD", "1.08564", "+0.23%", true],
            ["🇬🇧", "GBP/USD", "1.26543", "-0.11%", false],
            ["🥇", "XAU/USD", "2,345.67", "+0.24%", true],
            ["₿", "BTC/USD", "63,245.12", "+0.24%", true],
          ].map(([icon, pair, price, change, good]) => (
            <p key={pair}>
              <span>{icon} {pair}</span>
              <b>{price}</b>
              <em className={good ? "green" : "red"}>{change}</em>
            </p>
          ))}
        </div>

        <div className="featureList">
          <h3>Platform Features</h3>
          <FeatureLine icon="🔁" title="Binary Options" text="High returns with low risk" />
          <FeatureLine icon="🧠" title="Forex Trading" text="Trade major currency pairs" />
          <FeatureLine icon="🤖" title="Automated Bots" text="24/7 algorithmic trading" />
          <FeatureLine icon="💰" title="Risk Management" text="Advanced risk controls" />
        </div>
      </section>

      <section className="homeFooter">
        <span>🛡 Your funds are secure with us</span>
        <span>🏦 Licensed & Regulated Broker</span>
        <span>🎧 24/7 Customer Support</span>
        <span>✉ support@metabinary.com</span>
      </section>
    </div>
  );
}

function HeroFeature({ icon, title, text }) {
  return (
    <div className="heroFeature">
      <b>{icon}</b>
      <span>
        <strong>{title}</strong>
        <small>{text}</small>
      </span>
    </div>
  );
}

function TickerItem({ icon, pair, price, change, good }) {
  return (
    <div className="tickerItem">
      <span>{icon}</span>
      <b>{pair}</b>
      <strong>{price}</strong>
      <em className={good ? "green" : "red"}>{change}</em>
      <MiniSpark type={good ? "green" : "red"} />
    </div>
  );
}

function FeatureLine({ icon, title, text }) {
  return (
    <p>
      <b>{icon}</b>
      <span>
        <strong>{title}</strong>
        <small>{text}</small>
      </span>
    </p>
  );
}

function Stat({ icon, value, label, spark }) {
  return (
    <div className="statCard">
      {icon && <b>{icon}</b>}
      <div>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
      {spark && <MiniSpark type={spark} />}
    </div>
  );
}

function CandleGlow() {
  const bars = Array.from({ length: 18 }, (_, i) => {
    const h = 30 + Math.random() * 80;
    return { x: 18 + i * 4, h, up: i % 3 !== 0 };
  });

  return (
    <svg viewBox="0 0 100 80" preserveAspectRatio="none">
      <defs>
        <linearGradient id="blueGlow" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#00a3ff" stopOpacity="1" />
          <stop offset="1" stopColor="#0048ff" stopOpacity=".1" />
        </linearGradient>
      </defs>

      <path d="M5 62 C22 46 35 58 48 40 S72 28 94 12" fill="none" stroke="#006dff" strokeWidth=".7" />
      {bars.map((bar, i) => (
        <g key={i}>
          <line x1={bar.x} x2={bar.x} y1={65 - bar.h / 2} y2={68} stroke="#0077ff" strokeWidth=".4" opacity=".7" />
          <rect
            x={bar.x - 0.9}
            y={65 - bar.h / 2}
            width="1.8"
            height={bar.h / 2}
            fill={bar.up ? "url(#blueGlow)" : "rgba(0,70,180,.45)"}
          />
        </g>
      ))}
    </svg>
  );
}

function LineMini({ prices }) {
  const data = prices.slice(-32);
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const path = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = 38 - ((value - min) / range) * 32;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg className="lineMini" viewBox="0 0 100 42" preserveAspectRatio="none">
      <path d={path} />
    </svg>
  );
}

function MiniSpark({ type = "blue" }) {
  const color =
    type === "green" ? "#00e884" : type === "purple" ? "#a855f7" : type === "yellow" ? "#ffa800" : type === "red" ? "#ff4057" : "#008cff";

  const points =
    type === "red"
      ? "2,22 12,17 25,20 36,15 49,19 60,16 71,23 86,20 98,26"
      : "2,28 12,22 25,24 36,18 49,21 60,13 71,17 86,9 98,14";

  return (
    <svg className="miniSpark" viewBox="0 0 100 34">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ForexPage({
  livePrice,
  prices,
  positions,
  closedPositions,
  placeForexOrder,
  updatePosition,
  closePosition,
  closeAllPositions,
  setActivePage,
  openDeposit,
}) {
  const [symbol, setSymbol] = useState("EUR/USD");
  const [volume, setVolume] = useState(0.01);
  const [leverage, setLeverage] = useState("1:100");
  const [stopLoss, setStopLoss] = useState(1.08312);
  const [takeProfit, setTakeProfit] = useState(1.08789);
  const [tab, setTab] = useState("open");
  const [showLines, setShowLines] = useState(true);

  const visiblePositions = positions.filter((p) => p.instrument === symbol);

  const rows =
    tab === "profit"
      ? visiblePositions.filter((p) => p.pl >= 0)
      : tab === "loss"
      ? visiblePositions.filter((p) => p.pl < 0)
      : tab === "closed"
      ? closedPositions.filter((p) => p.instrument === symbol)
      : visiblePositions;

  function order(side) {
    placeForexOrder({
      side,
      symbol,
      volume,
      leverage,
      stopLoss,
      takeProfit,
    });
  }

  return (
    <div className="page forexPage">
      <HubNav active="Forex" setActivePage={setActivePage} openDeposit={openDeposit} />

      <section className="forexSymbolBar">
        <button>‹</button>

        <select value={symbol} onChange={(e) => setSymbol(e.target.value)}>
          {MARKETS.map((market) => (
            <option key={market}>{market}</option>
          ))}
        </select>

        <div>
          <strong>{symbol}</strong>
          <small>Live TradingView market</small>
        </div>

        <div>
          <strong className="green">{livePrice.toFixed(5)}</strong>
          <small className="green">+0.00231 ▲</small>
        </div>

        <div>
          <small>24H High</small>
          <strong>1.08789</strong>
        </div>

        <div>
          <small>24H Low</small>
          <strong className="red">1.08312</strong>
        </div>

        <button>☆</button>
        <button>⋮</button>
      </section>

      <section className="forexToolbar">
        {["1m", "5m", "15m", "1h", "4h", "1D"].map((item, index) => (
          <button key={item} className={index === 0 ? "active" : ""}>
            {item}
          </button>
        ))}
        <button>⌄</button>
        <button>ƒx</button>
        <button>Indicators</button>
        <span></span>
        <button>↶</button>
        <button>↷</button>
        <button>⛶</button>
      </section>

      <section className="proChartPanel">
        <CandleChart
          symbol={symbol}
          prices={prices}
          livePrice={livePrice}
          positions={visiblePositions}
          showLines={showLines}
        />
      </section>

      <section className="proOrderPanel">
        <div className="orderForm">
          <div className="orderTabs">
            <button className="active">Market Order</button>
            <button>Pending Order</button>
          </div>

          <div className="orderInputs">
            <OrderInput label="Volume (Lots)" value={volume} setValue={setVolume} step={0.01} min={0.01} />
            <label className="orderInput">
              <span>Leverage</span>
              <select value={leverage} onChange={(e) => setLeverage(e.target.value)}>
                <option>1:100</option>
                <option>1:200</option>
                <option>1:500</option>
              </select>
            </label>
            <OrderInput label="Stop Loss" value={stopLoss} setValue={setStopLoss} step={0.0001} min={0} />
            <OrderInput label="Take Profit" value={takeProfit} setValue={setTakeProfit} step={0.0001} min={0} />
          </div>
        </div>

        <div className="buySellBox">
          <button className="buyLarge" onClick={() => order("Buy")}>
            <b>Buy ↗</b>
            <strong>{livePrice.toFixed(5)}</strong>
          </button>

          <button className="sellLarge" onClick={() => order("Sell")}>
            <b>Sell ↘</b>
            <strong>{(livePrice - 0.00012).toFixed(5)}</strong>
          </button>
        </div>

        <div className="spreadStats">
          <p><span>Spread</span><b>1.2 Pips</b></p>
          <p><span>High</span><b className="green">1.08789</b></p>
          <p><span>Low</span><b className="red">1.08312</b></p>
          <p><span>Change</span><b className="green">+0.01%</b></p>
        </div>
      </section>

      <section className="tradeManager">
        <div className="managerTabs">
          <button className={tab === "open" ? "active" : ""} onClick={() => setTab("open")}>
            Open Trades <b>{visiblePositions.length}</b>
          </button>
          <button className={tab === "profit" ? "active" : ""} onClick={() => setTab("profit")}>
            Profit <b>{visiblePositions.filter((p) => p.pl >= 0).length}</b>
          </button>
          <button className={tab === "loss" ? "active" : ""} onClick={() => setTab("loss")}>
            Loss <b>{visiblePositions.filter((p) => p.pl < 0).length}</b>
          </button>
          <button className={tab === "closed" ? "active" : ""} onClick={() => setTab("closed")}>
            History
          </button>

          <label>
            <input checked={showLines} onChange={(e) => setShowLines(e.target.checked)} type="checkbox" />
            Show lines
          </label>

          <button className="closeAll" onClick={closeAllPositions}>Close All</button>
        </div>

        <div className="tradeTable">
          <div className="tradeHead">
            <span>Instrument</span>
            <span>Type</span>
            <span>Volume</span>
            <span>Open Price</span>
            <span>Current Price</span>
            <span>SL</span>
            <span>TP</span>
            <span>P/L</span>
            <span>Action</span>
          </div>

          {rows.length === 0 && <div className="emptyRow">No open trades yet. Place Buy or Sell order.</div>}

          {rows.map((p) => (
            <div className="tradeRow" key={p.id}>
              <strong>{p.instrument}</strong>
              <b className={p.side === "Buy" ? "buyTag" : "sellTag"}>{p.side}</b>
              <span>{p.volume}</span>
              <span>{Number(p.openPrice).toFixed(5)}</span>
              <span>{Number(p.currentPrice || p.openPrice).toFixed(5)}</span>

              {tab === "closed" ? (
                <>
                  <span>{Number(p.stopLoss).toFixed(5)}</span>
                  <span>{Number(p.takeProfit).toFixed(5)}</span>
                </>
              ) : (
                <>
                  <input
                    value={p.stopLoss}
                    onChange={(e) => updatePosition(p.id, { stopLoss: Number(e.target.value) })}
                  />
                  <input
                    value={p.takeProfit}
                    onChange={(e) => updatePosition(p.id, { takeProfit: Number(e.target.value) })}
                  />
                </>
              )}

              <em className={p.pl >= 0 ? "green" : "red"}>
                {p.pl >= 0 ? "+" : ""}
                {money(p.pl)}
              </em>

              {tab === "closed" ? (
                <span>Closed</span>
              ) : (
                <button onClick={() => closePosition(p.id)}>Close</button>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function OrderInput({ label, value, setValue, step, min }) {
  function dec() {
    setValue(Number(Math.max(min, Number(value) - Number(step)).toFixed(5)));
  }

  function inc() {
    setValue(Number((Number(value) + Number(step)).toFixed(5)));
  }

  return (
    <label className="orderInput">
      <span>{label}</span>
      <div>
        <input value={value} onChange={(e) => setValue(Number(e.target.value))} />
        <button type="button" onClick={dec}>−</button>
        <button type="button" onClick={inc}>+</button>
      </div>
    </label>
  );
}

function CandleChart({ symbol, prices, livePrice, positions, showLines }) {
  const candles = useMemo(() => {
    return prices.slice(-90).map((close, index, arr) => {
      const open = arr[index - 1] || close;
      const high = Math.max(open, close) + Math.random() * 0.0004;
      const low = Math.min(open, close) - Math.random() * 0.0004;
      return { open, close, high, low };
    });
  }, [prices]);

  const levels = [
    livePrice,
    ...positions.flatMap((p) => [p.openPrice, p.stopLoss, p.takeProfit]),
  ].filter(Boolean);

  const min = Math.min(...candles.map((c) => c.low), ...levels) - 0.00025;
  const max = Math.max(...candles.map((c) => c.high), ...levels) + 0.00025;
  const range = max - min || 1;

  function y(value) {
    return 248 - ((value - min) / range) * 210;
  }

  const step = 100 / candles.length;

  return (
    <div className="chartShell">
      <div className="chartTopStrip">
        <strong>🔎 {symbol}</strong>
        <small>1m</small>
        <small>30m</small>
        <small>1h</small>
        <small>Indicators</small>
      </div>

      <div className="chartTools">
        {["＋", "⌁", "☰", "⌘", "T", "◎", "▱", "⌕", "👁", "🗑"].map((tool) => (
          <button key={tool}>{tool}</button>
        ))}
      </div>

      <svg viewBox="0 0 100 260" preserveAspectRatio="none">
        <defs>
          <pattern id="grid" width="8" height="32" patternUnits="userSpaceOnUse">
            <path d="M8 0 L0 0 0 32" fill="none" stroke="rgba(255,255,255,.055)" strokeWidth=".15" />
          </pattern>
        </defs>

        <rect width="100" height="260" fill="url(#grid)" />

        <line
          x1="0"
          x2="100"
          y1={y(livePrice)}
          y2={y(livePrice)}
          stroke="#00d3a0"
          strokeDasharray="1 1.5"
          strokeWidth=".16"
        />

        {showLines &&
          positions.map((p) => (
            <g key={p.id}>
              <line x1="0" x2="100" y1={y(p.openPrice)} y2={y(p.openPrice)} stroke="#00e884" strokeDasharray="1 1.5" strokeWidth=".16" />
              <line x1="60" x2="100" y1={y(p.takeProfit)} y2={y(p.takeProfit)} stroke="#00e884" strokeDasharray="1 1.5" strokeWidth=".2" />
              <line x1="60" x2="100" y1={y(p.stopLoss)} y2={y(p.stopLoss)} stroke="#ff4057" strokeDasharray="1 1.5" strokeWidth=".2" />
            </g>
          ))}

        {candles.map((c, i) => {
          const x = i * step + step / 2;
          const up = c.close >= c.open;
          const top = y(Math.max(c.open, c.close));
          const bottom = y(Math.min(c.open, c.close));
          const color = up ? "#00d3a0" : "#ff4057";

          return (
            <g key={i}>
              <line x1={x} x2={x} y1={y(c.high)} y2={y(c.low)} stroke={color} strokeWidth=".16" />
              <rect
                x={x - step * 0.23}
                y={top}
                width={step * 0.46}
                height={Math.max(1.2, bottom - top)}
                fill={color}
              />
              <rect
                x={x - step * 0.18}
                y={224 + Math.random() * 10}
                width={step * 0.36}
                height={12 + Math.random() * 22}
                fill={up ? "rgba(0,211,160,.42)" : "rgba(255,64,87,.42)"}
              />
            </g>
          );
        })}
      </svg>

      <div className="priceTag" style={{ top: `${(y(livePrice) / 260) * 100}%` }}>
        {livePrice.toFixed(5)}
      </div>

      <div className="volumeTag">126</div>
    </div>
  );
}

function TradePage({
  prices,
  livePrice,
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
  actionsFor,
  payoutRate,
  runBinaryTrade,
}) {
  const actions = actionsFor(tradeType);

  return (
    <div className="page tradePage">
      <section className="tradeTypeRow">
        <span>Trade Type</span>
        {["Even/Odd", "Matches/Differs", "Over/Under", "Rise/Fall", "Touch/No Touch"].map((type) => (
          <button key={type} className={tradeType === type ? "active" : ""} onClick={() => setTradeType(type)}>
            {type}
          </button>
        ))}
      </section>

      <section className="binaryBox">
        <div className="binaryTop">
          <div>
            <strong>Volatility 100 (1s) Index</strong>
            <small>{(livePrice * 800).toFixed(2)} · LIVE</small>
          </div>
          <button>1s⌄</button>
        </div>

        <LineChart data={prices.map((x) => x * 800)} />

        <h3>Last Digits</h3>

        <div className="digitGrid">
          {digitStats.map((percent, digit) => (
            <button
              key={digit}
              onClick={() => setPrediction(digit)}
              className={`${digit === lastDigit ? "hot" : ""} ${digit === prediction ? "picked" : ""}`}
            >
              <strong>{digit}</strong>
              <span>{percent.toFixed(1)}%</span>
            </button>
          ))}
        </div>
      </section>

      <section className="binaryOrderPanel">
        <label>
          Ticks
          <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
            <option value={5}>5 ticks</option>
            <option value={10}>10 ticks</option>
            <option value={30}>30 ticks</option>
          </select>
        </label>

        <label>
          Stake
          <div className="stakeBox">
            <button onClick={() => setStake((x) => Math.max(0.3, Number(x) - 1))}>−</button>
            <strong>{money(stake)}</strong>
            <button onClick={() => setStake((x) => Number(x) + 1)}>+</button>
          </div>
        </label>

        <div className="tradeButtons">
          {actions.map((action, index) => (
            <button
              key={action}
              className={index === 0 ? "greenTrade" : "redTrade"}
              onClick={() => runBinaryTrade(tradeType, action)}
            >
              <strong>{action}</strong>
              <span>Payout {money(stake * payoutRate(tradeType, action))} USD</span>
            </button>
          ))}
        </div>
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
        const y = 62 - ((value - min) / range) * 55;
        return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ");
  }, [data]);

  return (
    <div className="lineChart">
      <svg viewBox="0 0 100 65" preserveAspectRatio="none">
        <path d={`${path} L100,65 L0,65 Z`} className="areaPath" />
        <path d={path} className="linePath" />
      </svg>
    </div>
  );
}

function BotsPage({ bots, startBot }) {
  const running = bots.filter((x) => x.status === "Running").length;
  const stopped = bots.filter((x) => x.status === "Stopped").length;
  const completed = 4;

  return (
    <div className="page botsPage">
      <div className="botsTitleRow">
        <div>
          <h1>My Bots</h1>
          <p>Create, manage and monitor your trading bots.</p>
        </div>
        <button>+ New Bot</button>
      </div>

      <section className="botStats">
        <Stat icon="🤖" value={bots.length} label="Total Bots" spark="blue" />
        <Stat icon="▶" value={running} label="Running" spark="green" />
        <Stat icon="Ⅱ" value={stopped} label="Stopped" spark="yellow" />
        <Stat icon="✓" value={completed} label="Completed" spark="purple" />
      </section>

      <section className="botFilters">
        <input placeholder="Search bots..." />
        <button>All Status</button>
        <button>Performance</button>
        <button>Strategy Type</button>
      </section>

      <section className="botGrid">
        {bots.map((bot, index) => (
          <article className="botCard" key={bot.id}>
            <div className={`botIcon botIcon${index + 1}`}>{bot.code}</div>

            <div>
              <h2>{bot.name}</h2>
              <p>{bot.type} · {bot.market}</p>
              <small>Stake: {money(bot.stake)} USD · Duration: {bot.duration}s</small>
            </div>

            <b className={bot.status === "Running" ? "botStatus running" : "botStatus stopped"}>
              {bot.status}
            </b>

            <div className="botGraph">
              <BotLine positive={bot.profit >= 0} />
            </div>

            <div className="botMetrics">
              <p><span>Total Profit</span><strong className={bot.profit >= 0 ? "green" : "red"}>{bot.profit >= 0 ? "+" : ""}{money(bot.profit)} USD</strong></p>
              <p><span>Win Rate</span><strong>{bot.winRate}%</strong></p>
              <p><span>Trades</span><strong>{bot.trades}</strong></p>
            </div>

            <button className="botAction" onClick={() => startBot(bot)}>
              {bot.status === "Running" ? "View Details" : "Start Bot"}
            </button>
          </article>
        ))}
      </section>
    </div>
  );
}

function BotLine({ positive }) {
  const points = positive
    ? "2,52 16,47 32,38 48,41 65,28 82,22 99,26 118,16 138,20 156,12"
    : "2,20 18,25 33,22 51,34 70,37 86,43 105,39 124,51 145,48 158,57";

  return (
    <svg viewBox="0 0 160 70" preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke={positive ? "#00e884" : "#ff4057"}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BotLivePage({ bot, running, stopBot, startBot, trades, botTab, setBotTab, back }) {
  const profitLoss = trades.reduce((sum, trade) => sum + (trade.won ? trade.profit : -trade.stake), 0);
  const last = trades[0];

  if (!bot) {
    return (
      <div className="page emptyPage">
        <button onClick={back}>‹ Back to Bots</button>
        <h2>Select a bot first.</h2>
      </div>
    );
  }

  return (
    <div className="page botLivePage">
      <div className="botLiveTop">
        <button onClick={back}>‹ Back to Bot</button>
        <strong>{bot.name}</strong>
      </div>

      <section className="runnerBox">
        <button className={running ? "stopRunner" : "startRunner"} onClick={running ? stopBot : () => startBot(bot)}>
          {running ? "■ Stop" : "▶ Run"}
        </button>

        <div>
          <strong>{running ? "Contract bought" : "Bot is not running"}</strong>
          <span><i></i></span>
        </div>
      </section>

      <section className="runnerTabs">
        {["summary", "transactions", "journal"].map((tab) => (
          <button key={tab} className={botTab === tab ? "active" : ""} onClick={() => setBotTab(tab)}>
            {tab}
          </button>
        ))}
      </section>

      <section className="runnerBody">
        {botTab === "summary" && (
          <div className={last?.won ? "runnerResult won" : last ? "runnerResult lost" : "runnerResult"}>
            <strong>{last ? "Closed" : "Ready"}</strong>
            <h2>{last ? `${last.won ? "+" : "-"}${money(last.won ? last.profit : last.stake)} USD` : "Hit Run"}</h2>
          </div>
        )}

        {botTab === "transactions" && (
          <div className="runnerList">
            {trades.slice(0, 8).map((trade) => (
              <p key={trade.id}>
                <span>{trade.type} · {trade.action}</span>
                <b className={trade.won ? "green" : "red"}>{trade.won ? "+" : "-"}{money(trade.won ? trade.profit : trade.stake)}</b>
              </p>
            ))}
          </div>
        )}

        {botTab === "journal" && (
          <div className="runnerList">
            {trades.slice(0, 8).map((trade) => (
              <p key={trade.id}>
                <span>{trade.won ? "Profit amount" : "Loss amount"}</span>
                <small>{trade.time}</small>
              </p>
            ))}
          </div>
        )}
      </section>

      <section className="runnerStats">
        <Stat value={trades.length} label="Runs" />
        <Stat value={trades.filter((x) => x.won).length} label="Won" />
        <Stat value={trades.filter((x) => !x.won).length} label="Lost" />
        <Stat value={`${profitLoss >= 0 ? "+" : ""}${money(profitLoss)}`} label="P/L" />
      </section>
    </div>
  );
}

function ProfilePage({ user, balances, transactions, logout, setActivePage }) {
  return (
    <div className="page profilePage">
      <section className="profileHero">
        <div className="profileAvatar">{user.initials}</div>

        <div>
          <h2>{user.name} ✓</h2>
          <p>{user.email}</p>
          <b>Verified</b>
          <small>Account ID: {user.brokerId}</small>
        </div>
      </section>

      <section className="profileStats">
        <Stat value={`${money(balances.real)} USD`} label="Real Balance" />
        <Stat value={`${money(balances.demo)} USD`} label="Demo Balance" />
        <Stat value="+2,450.75" label="Total Profit" />
        <Stat value="63.25%" label="Win Rate" />
      </section>

      <section className="profileActions">
        <button onClick={() => setActivePage("settings")}>⚙<b>Settings</b><span>Preferences</span></button>
        <button onClick={() => setActivePage("history")}>↺<b>History</b><span>{transactions.length} records</span></button>
        <button>🛡<b>KYC</b><span>Verified</span></button>
        <button>👥<b>Referral</b><span>Earn 30%</span></button>
      </section>

      <button className="logoutWide" onClick={logout}>⇥ Logout</button>
    </div>
  );
}

function SettingsPage({ account, setAccount, tradeType, setTradeType, stake, setStake }) {
  return (
    <div className="page settingsPage">
      <section className="settingsHero">
        <h1>Settings</h1>
        <p>Manage your account preferences and platform settings.</p>
      </section>

      <section className="settingsPanel">
        <h2>Platform Preferences</h2>

        <label>
          <span>Default Account</span>
          <select value={account} onChange={(e) => setAccount(e.target.value)}>
            <option value="demo">Demo Account</option>
            <option value="real">Real Account</option>
          </select>
        </label>

        <label>
          <span>Default Trade Type</span>
          <select value={tradeType} onChange={(e) => setTradeType(e.target.value)}>
            <option>Even/Odd</option>
            <option>Matches/Differs</option>
            <option>Over/Under</option>
            <option>Rise/Fall</option>
            <option>Touch/No Touch</option>
          </select>
        </label>

        <label>
          <span>Default Stake</span>
          <div className="stakeBox">
            <button onClick={() => setStake((x) => Math.max(0.3, Number(x) - 1))}>−</button>
            <strong>{money(stake)}</strong>
            <button onClick={() => setStake((x) => Number(x) + 1)}>+</button>
          </div>
        </label>

        <div className="toggleGrid">
          {["Confirm before trading", "Quick Trade", "Sound Alerts", "Compact Mode"].map((item) => (
            <p key={item}><span>{item}</span><b></b></p>
          ))}
        </div>
      </section>
    </div>
  );
}

function HistoryPage({ transactions }) {
  return (
    <div className="page listPage">
      <h1>History</h1>

      <section className="listPanel">
        {transactions.length === 0 && <p>No history yet.</p>}

        {transactions.slice(0, 14).map((tx) => (
          <div key={tx.id}>
            <span>
              <strong>{tx.type}</strong>
              <small>{tx.time}</small>
            </span>
            <b className={tx.amount >= 0 ? "green" : "red"}>
              {tx.amount >= 0 ? "+" : ""}
              {money(tx.amount)} USD
            </b>
          </div>
        ))}
      </section>
    </div>
  );
}

function ReportsPage({ transactions, closedPositions, botTrades }) {
  return (
    <div className="page reportsPage">
      <h1>Reports</h1>

      <section className="homeStats">
        <Stat value={transactions.length} label="Transactions" spark="blue" />
        <Stat value={closedPositions.length} label="Forex Closed" spark="green" />
        <Stat value={botTrades.filter((x) => x.won).length} label="Bot Wins" spark="purple" />
        <Stat value={botTrades.filter((x) => !x.won).length} label="Bot Losses" spark="yellow" />
      </section>
    </div>
  );
}

function BottomNav({ activePage, setActivePage }) {
  const items = [
    ["home", "Home", "⌂"],
    ["forex", "Markets", "▥"],
    ["trade", "Trade", "↕"],
    ["bots", "Bots", "🤖"],
    ["profile", "Profile", "♙"],
  ];

  return (
    <nav className="bottomNav">
      {items.map(([key, label, icon]) => (
        <button
          key={key}
          className={activePage === key || (key === "bots" && activePage === "botLive") ? "active" : ""}
          onClick={() => setActivePage(key)}
        >
          <span>{icon}</span>
          <small>{label}</small>
        </button>
      ))}
    </nav>
  );
}

function SideMenu({
  user,
  account,
  setAccount,
  balance,
  close,
  setActivePage,
  openDeposit,
  openWithdraw,
  logout,
}) {
  function go(page) {
    setActivePage(page);
    close();
  }

  return (
    <div className="menuLayer">
      <button className="menuShade" onClick={close}></button>

      <aside className="sideDrawer">
        <div className="drawerTop">
          <Logo />
          <button onClick={close}>×</button>
        </div>

        <section className="drawerAccount">
          <div className="drawerUser">
            <div>M</div>
            <section>
              <small>{account === "demo" ? "Demo Account" : "Real Account"}</small>
              <strong>{money(balance)} USD</strong>
              <span>Account ID: {user.brokerId} ⧉</span>
            </section>
          </div>

          <div className="drawerSwitch">
            <button className={account === "demo" ? "active" : ""} onClick={() => setAccount("demo")}>Demo</button>
            <button className={account === "real" ? "active" : ""} onClick={() => setAccount("real")}>Real</button>
          </div>
        </section>

        <div className="drawerGrid">
          <DrawerBlock title="TRADING">
            <DrawerButton icon="⌂" label="Trader’s Hub" onClick={() => go("home")} />
            <DrawerButton icon="▥" label="Markets" onClick={() => go("forex")} />
            <DrawerButton icon="↕" label="Trade" onClick={() => go("trade")} />
          </DrawerBlock>

          <DrawerBlock title="FUNDS">
            <DrawerButton icon="▱" label="Cashier / Deposit" onClick={() => { openDeposit(); close(); }} />
            <DrawerButton icon="⇧" label="Withdraw" onClick={() => { openWithdraw(); close(); }} />
            <DrawerButton icon="↺" label="History" onClick={() => go("history")} />
          </DrawerBlock>

          <DrawerBlock title="AUTOMATION">
            <DrawerButton icon="🤖" label="My Bots" onClick={() => go("bots")} />
            <DrawerButton icon="▶" label="Running Bots" onClick={() => go("botLive")} />
            <DrawerButton icon="▣" label="Reports" onClick={() => go("reports")} />
          </DrawerBlock>

          <DrawerBlock title="ACCOUNT">
            <DrawerButton icon="♙" label="Profile" onClick={() => go("profile")} />
            <DrawerButton icon="⚙" label="Settings" onClick={() => go("settings")} />
            <DrawerButton icon="🔔" label="Notifications" badge="3" onClick={() => go("settings")} />
          </DrawerBlock>
        </div>

        <button className="drawerLogout" onClick={logout}>⇥ Logout</button>
      </aside>
    </div>
  );
}

function DrawerBlock({ title, children }) {
  return (
    <section className="drawerBlock">
      <h4>{title}</h4>
      {children}
    </section>
  );
}

function DrawerButton({ icon, label, badge, onClick }) {
  return (
    <button className="drawerButton" onClick={onClick}>
      <span>{icon}</span>
      <strong>{label}</strong>
      {badge && <b>{badge}</b>}
      <em>›</em>
    </button>
  );
}

function DepositModal({ close, submit }) {
  const [method, setMethod] = useState("");
  const [amountUsd, setAmountUsd] = useState(10);
  const [phone, setPhone] = useState("");

  return (
    <div className="modalLayer">
      <div className="depositModal">
        <button className="closeModal" onClick={close}>×</button>

        {!method ? (
          <>
            <h2>Deposit Funds</h2>
            <p>Choose payment method</p>

            <PaymentButton icon="📱" title="M-Pesa" text="Instant mobile money" onClick={() => setMethod("mpesa")} />
            <PaymentButton icon="💳" title="Credit/Debit Card" text="Visa, Mastercard" onClick={() => setMethod("card")} />
            <PaymentButton icon="₿" title="USDT (TRC20)" text="Cryptocurrency" onClick={() => setMethod("usdt")} />
          </>
        ) : (
          <>
            <button className="modalBack" onClick={() => setMethod("")}>‹ Back</button>

            <h2>{method === "mpesa" ? "M-Pesa Deposit" : method === "card" ? "Card Deposit" : "USDT Deposit"}</h2>
            <p>Funds go to your real account.</p>

            <label>Amount USD</label>
            <input type="number" min="1" value={amountUsd} onChange={(e) => setAmountUsd(e.target.value)} />

            {method !== "usdt" && (
              <>
                <label>Phone Number</label>
                <input placeholder="07XXXXXXXX or 2547XXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </>
            )}

            <button className="modalPrimary" onClick={() => submit({ method, amountUsd, phone })}>
              {method === "mpesa" ? "Send STK Push" : "Continue"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function PaymentButton({ icon, title, text, onClick }) {
  return (
    <button className="paymentButton" onClick={onClick}>
      <span>{icon}</span>
      <div>
        <strong>{title}</strong>
        <small>{text}</small>
      </div>
      <b>›</b>
    </button>
  );
}

function WithdrawModal({ close, submit }) {
  const [amountUsd, setAmountUsd] = useState(5);
  const [phone, setPhone] = useState("");

  return (
    <div className="modalLayer">
      <div className="depositModal">
        <button className="closeModal" onClick={close}>×</button>

        <h2>Withdraw Funds</h2>
        <p>Minimum withdrawal is 5 USD.</p>

        <label>Amount USD</label>
        <input type="number" min="5" value={amountUsd} onChange={(e) => setAmountUsd(e.target.value)} />

        <label>M-Pesa Phone</label>
        <input placeholder="07XXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} />

        <button className="modalPrimary" onClick={() => submit({ amountUsd, phone })}>
          Request Withdrawal
        </button>
      </div>
    </div>
  );
}

function Toast({ toast }) {
  return (
    <div className={`toast ${toast.type}`}>
      <strong>{toast.title}</strong>
      <span>{toast.message}</span>
    </div>
  );
}