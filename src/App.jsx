import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const STORAGE = {
  user: "mb_user",
  balances: "mb_balances",
  account: "mb_account",
  positions: "mb_positions",
  closedForex: "mb_closed_forex",
  transactions: "mb_transactions",
};

const MARKETS = ["XAU/USD", "EUR/USD", "GBP/USD", "USD/JPY", "BTC/USD"];

const BOTS = [
  {
    id: 1,
    code: "EO",
    name: "Neon Eclipse",
    type: "Even/Odd",
    market: "Volatility 100 (1s)",
    stake: 10,
    duration: 5,
    status: "Running",
    profit: 250.75,
    winRate: 72.5,
  },
  {
    id: 2,
    code: "RF",
    name: "Quantum Surge",
    type: "Rise/Fall",
    market: "Volatility 75 Index",
    stake: 15,
    duration: 5,
    status: "Stopped",
    profit: 180.4,
    winRate: 68,
  },
  {
    id: 3,
    code: "OU",
    name: "Alpha OverUnder",
    type: "Over/Under",
    market: "Volatility 100 Index",
    stake: 10,
    duration: 5,
    status: "Stopped",
    profit: -45,
    winRate: 45,
  },
  {
    id: 4,
    code: "MD",
    name: "Matrix Differ",
    type: "Matches/Differs",
    market: "Volatility 50 Index",
    stake: 20,
    duration: 5,
    status: "Stopped",
    profit: -120,
    winRate: 40,
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

function id() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getInitials(value) {
  return (
    String(value || "JM")
      .replace("@gmail.com", "")
      .split(/[ ._-]/)
      .filter(Boolean)
      .slice(0, 2)
      .map((x) => x[0]?.toUpperCase())
      .join("") || "JM"
  );
}

function createPrices(start = 1.0868) {
  let price = start;

  return Array.from({ length: 120 }, (_, index) => {
    price += (Math.random() - 0.49) * 0.00055 + Math.sin(index / 9) * 0.00005;
    return Number(price.toFixed(5));
  });
}

export default function App() {
  const [user, setUser] = useState(() => readStore(STORAGE.user, null));
  const [authMode, setAuthMode] = useState("login");

  const [activePage, setActivePage] = useState("forex");
  const [account, setAccount] = useState(() =>
    readStore(STORAGE.account, "demo")
  );

  const [balances, setBalances] = useState(() =>
    readStore(STORAGE.balances, { demo: 10000, real: 0 })
  );

  const [prices, setPrices] = useState(() => createPrices());
  const [positions, setPositions] = useState(() =>
    readStore(STORAGE.positions, [])
  );
  const [closedForex, setClosedForex] = useState(() =>
    readStore(STORAGE.closedForex, [])
  );
  const [transactions, setTransactions] = useState(() =>
    readStore(STORAGE.transactions, [])
  );

  const [openBinary, setOpenBinary] = useState([]);
  const [closedBinary, setClosedBinary] = useState([]);
  const [tradeType, setTradeType] = useState("Even/Odd");
  const [stake, setStake] = useState(10);
  const [duration, setDuration] = useState(5);
  const [prediction, setPrediction] = useState(2);
  const [lastDigit, setLastDigit] = useState(0);
  const [digitStats, setDigitStats] = useState(() =>
    Array.from({ length: 10 }, () => 7 + Math.random() * 6)
  );

  const [menuOpen, setMenuOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const [selectedBot, setSelectedBot] = useState(null);
  const [botRunning, setBotRunning] = useState(false);
  const [botTab, setBotTab] = useState("summary");

  const livePrice = prices[prices.length - 1] || 1.0868;
  const currentBalance = balances[account] || 0;

  useEffect(() => saveStore(STORAGE.user, user), [user]);
  useEffect(() => saveStore(STORAGE.account, account), [account]);
  useEffect(() => saveStore(STORAGE.balances, balances), [balances]);
  useEffect(() => saveStore(STORAGE.positions, positions), [positions]);
  useEffect(() => saveStore(STORAGE.closedForex, closedForex), [closedForex]);
  useEffect(() => saveStore(STORAGE.transactions, transactions), [transactions]);

  useEffect(() => {
    const timer = setInterval(() => {
      setPrices((old) => {
        const last = old[old.length - 1] || 1.0868;
        const next = Number(
          (
            last +
            (Math.random() - 0.5) * 0.00062 +
            Math.sin(Date.now() / 9000) * 0.00005
          ).toFixed(5)
        );

        return [...old.slice(-119), next];
      });

      setLastDigit(Math.floor(Math.random() * 10));
      setDigitStats(Array.from({ length: 10 }, () => 7 + Math.random() * 6));
    }, 900);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setPositions((old) =>
      old.map((position) => {
        const pl =
          position.side === "Buy"
            ? (livePrice - position.openPrice) * 100000 * position.volume
            : (position.openPrice - livePrice) * 100000 * position.volume;

        return {
          ...position,
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
      const action = selectedBot.type === "Rise/Fall" ? "Rise" : "Even";
      runBinaryTrade(selectedBot.type, action, selectedBot);
    }, 7000);

    return () => clearInterval(timer);
  }, [botRunning, selectedBot, balances, account]);

  function notify(type, title, message) {
    setToast({ type, title, message });
    setTimeout(() => setToast(null), 3000);
  }

  function addTransaction(tx) {
    setTransactions((old) => [
      {
        id: id(),
        time: new Date().toLocaleString(),
        ...tx,
      },
      ...old,
    ]);
  }

  function updateBalance(target, amount) {
    setBalances((old) => ({
      ...old,
      [target]: Number((Number(old[target] || 0) + Number(amount)).toFixed(2)),
    }));
  }

  async function refreshUser() {
    try {
      const res = await fetch(
        `${API_URL}/api/user/${encodeURIComponent(user.email)}`
      );

      if (!res.ok) return;

      const data = await res.json();

      setBalances((old) => ({
        demo: Number(data.demoBalance ?? old.demo ?? 10000),
        real: Number(data.realBalance ?? old.real ?? 0),
      }));
    } catch {
      // Keep frontend running if backend is offline.
    }
  }

  function login(data) {
    if (!data.email || !data.password) {
      notify("loss", "Login failed", "Enter email and password.");
      return;
    }

    const logged = {
      name: data.email.split("@")[0],
      email: data.email,
      initials: getInitials(data.email),
      brokerId: "MB" + Math.floor(100000 + Math.random() * 900000),
      verified: true,
    };

    setUser(logged);
    setActivePage("forex");
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
      initials: getInitials(`${data.firstName} ${data.lastName}`),
      brokerId: "MB" + Math.floor(100000 + Math.random() * 900000),
      verified: true,
    };

    setUser(created);
    setBalances({ demo: 10000, real: 0 });
    setActivePage("forex");
    notify("win", "Account created", "Your demo account is ready.");
  }

  function logout() {
    localStorage.removeItem(STORAGE.user);
    setUser(null);
    setMenuOpen(false);
    setAuthMode("login");
  }

  function placeForexOrder(order) {
    const openPrice =
      order.side === "Buy"
        ? Number((livePrice + 0.00002).toFixed(5))
        : Number((livePrice - 0.00002).toFixed(5));

    const position = {
      id: id(),
      instrument: order.symbol,
      name:
        order.symbol === "XAU/USD"
          ? "Gold / US Dollar"
          : order.symbol === "EUR/USD"
          ? "Euro / U.S. Dollar"
          : "Live market",
      account,
      side: order.side,
      volume: Number(order.volume || 0.01),
      leverage: order.leverage || "1:100",
      openPrice,
      currentPrice: livePrice,
      stopLoss: Number(
        order.stopLoss || (order.side === "Buy" ? 1.0855 : 1.0885)
      ),
      takeProfit: Number(
        order.takeProfit || (order.side === "Buy" ? 1.0875 : 1.0845)
      ),
      pl: 0,
      plPercent: 0,
      openedAt: new Date().toLocaleTimeString(),
    };

    setPositions((old) => [position, ...old].slice(0, 20));

    addTransaction({
      type: `${order.side} ${order.symbol}`,
      method: "Forex",
      account,
      amount: 0,
      status: "Open",
      details: `${position.volume} lot · SL ${position.stopLoss} · TP ${position.takeProfit}`,
    });

    notify(
      "open",
      `${order.side} order placed`,
      `${order.symbol} · ${position.volume} lot · SL/TP lines added`
    );
  }

  function updatePosition(positionId, patch) {
    setPositions((old) =>
      old.map((position) =>
        position.id === positionId ? { ...position, ...patch } : position
      )
    );
  }

  function closePosition(positionId) {
    const position = positions.find((item) => item.id === positionId);
    if (!position) return;

    updateBalance(position.account || account, position.pl);

    const closed = {
      ...position,
      closedAt: new Date().toLocaleTimeString(),
      status: "Closed",
    };

    setClosedForex((old) => [closed, ...old].slice(0, 50));
    setPositions((old) => old.filter((item) => item.id !== positionId));

    addTransaction({
      type: `Closed ${position.side} ${position.instrument}`,
      method: "Forex",
      account: position.account || account,
      amount: position.pl,
      status: "Closed",
      details: `${position.volume} lot`,
    });

    notify(
      position.pl >= 0 ? "win" : "loss",
      "Trade closed",
      `${position.pl >= 0 ? "+" : ""}${money(position.pl)} USD`
    );
  }

  function closeAllPositions() {
    positions.forEach((position) => closePosition(position.id));
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

  function runBinaryTrade(type, action, bot = null) {
    const usedStake = Number(bot?.stake || stake);
    const usedDuration = Number(bot?.duration || duration);

    if (usedStake < 0.3) {
      notify("loss", "Minimum stake", "Minimum stake is $0.30.");
      return;
    }

    if (currentBalance < usedStake) {
      notify("loss", "Low balance", `Your ${account} balance is low.`);
      return;
    }

    const payout = Number((usedStake * payoutRate(type, action)).toFixed(2));
    const trade = {
      id: id(),
      account,
      botName: bot?.name || "",
      type,
      action,
      stake: usedStake,
      payout,
      profit: Number((payout - usedStake).toFixed(2)),
      prediction,
      status: "RUNNING",
      openedAt: new Date().toLocaleTimeString(),
    };

    updateBalance(account, -usedStake);
    setOpenBinary((old) => [trade, ...old]);

    notify("open", "Contract bought", `${type} · ${action}`);

    setTimeout(() => {
      const digit = Math.floor(Math.random() * 10);

      let won = false;

      if (type === "Even/Odd") {
        won = action === "Even" ? digit % 2 === 0 : digit % 2 !== 0;
      } else if (type === "Matches/Differs") {
        won = action === "Matches" ? digit === prediction : digit !== prediction;
      } else if (type === "Over/Under") {
        won = action === "Over" ? digit > prediction : digit < prediction;
      } else {
        won = Math.random() > 0.54;
      }

      const closed = {
        ...trade,
        resultDigit: digit,
        won,
        status: won ? "WON" : "LOST",
        closedAt: new Date().toLocaleTimeString(),
      };

      setOpenBinary((old) => old.filter((item) => item.id !== trade.id));
      setClosedBinary((old) => [closed, ...old].slice(0, 100));

      if (won) updateBalance(trade.account, payout);

      addTransaction({
        type: won ? "Profit amount" : "Loss amount",
        method: bot ? "Bot" : "Manual",
        account: trade.account,
        amount: won ? trade.profit : -trade.stake,
        status: closed.status,
        details: `${type} · digit ${digit}`,
      });

      notify(
        won ? "win" : "loss",
        won ? "Trade won" : "Trade lost",
        `${won ? "+" : "-"}${money(won ? trade.profit : trade.stake)} USD`
      );
    }, usedDuration * 1000);
  }

  function startBot(bot) {
    setSelectedBot(bot);
    setBotRunning(true);
    setBotTab("summary");
    setActivePage("botLive");

    runBinaryTrade(bot.type, bot.type === "Rise/Fall" ? "Rise" : "Even", bot);
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

      if (!res.ok || json.ok === false) {
        throw new Error(json.message || "Deposit failed.");
      }

      setDepositOpen(false);
      setAccount("real");

      addTransaction({
        type: "Deposit pending",
        method: data.method,
        account: "real",
        amount: Number(data.amountUsd),
        status: "Pending",
        details: data.phone || data.method,
      });

      notify("open", "Deposit started", "Check phone or continue payment.");
      setTimeout(refreshUser, 5000);
    } catch (error) {
      notify("loss", "Deposit error", error.message || "Backend not connected.");
    }
  }

  async function submitWithdraw(data) {
    const amount = Number(data.amountUsd);

    if (amount < 5) {
      notify("loss", "Minimum withdrawal", "Minimum withdrawal is $5.");
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

      if (!res.ok || json.ok === false) {
        throw new Error(json.message || "Withdrawal failed.");
      }

      updateBalance("real", -amount);
      setWithdrawOpen(false);

      addTransaction({
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
        <AuthScreen
          mode={authMode}
          setMode={setAuthMode}
          login={login}
          register={register}
        />
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
        balance={currentBalance}
        openMenu={() => setMenuOpen(true)}
        openDeposit={() => setDepositOpen(true)}
        setActivePage={setActivePage}
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
            closedForex={closedForex}
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

        {activePage === "bots" && <BotsPage bots={BOTS} startBot={startBot} />}

        {activePage === "botLive" && (
          <BotLivePage
            bot={selectedBot}
            botRunning={botRunning}
            startBot={startBot}
            stopBot={stopBot}
            botTab={botTab}
            setBotTab={setBotTab}
            openTrades={openBinary.filter((trade) => trade.botName)}
            closedTrades={closedBinary.filter((trade) => trade.botName)}
            transactions={transactions.filter((tx) => tx.method === "Bot")}
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
            closedForex={closedForex}
            closedBinary={closedBinary}
          />
        )}
      </main>

      <BottomNav activePage={activePage} setActivePage={setActivePage} />

      {menuOpen && (
        <SideMenu
          user={user}
          account={account}
          setAccount={setAccount}
          balance={currentBalance}
          close={() => setMenuOpen(false)}
          setActivePage={setActivePage}
          openDeposit={() => setDepositOpen(true)}
          openWithdraw={() => setWithdrawOpen(true)}
          logout={logout}
        />
      )}

      {depositOpen && (
        <DepositModal close={() => setDepositOpen(false)} submit={submitDeposit} />
      )}

      {withdrawOpen && (
        <WithdrawModal close={() => setWithdrawOpen(false)} submit={submitWithdraw} />
      )}

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
            value={loginData.email}
            onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
            placeholder="Enter your email"
          />

          <label>Password</label>
          <input
            type="password"
            value={loginData.password}
            onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
            placeholder="Enter your password"
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
              onChange={(e) =>
                setRegData({ ...regData, confirmPassword: e.target.value })
              }
            />
          </div>

          <button className="primaryBtn" onClick={() => register(regData)}>
            Create Account
          </button>

          <small>
            Already have an account?{" "}
            <button onClick={() => setMode("login")}>Login</button>
          </small>
        </section>
      )}
    </div>
  );
}

function Header({
  user,
  account,
  setAccount,
  balance,
  openMenu,
  openDeposit,
  setActivePage,
}) {
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
  const links = [
    ["Trader’s Hub", "⌂", "home"],
    ["Reports", "▤", "reports"],
    ["History", "↺", "history"],
    ["Forex", "▥", "forex"],
    ["Settings", "⚙", "settings"],
    ["Cashier", "▱", "deposit"],
  ];

  return (
    <nav className="hubNav">
      {links.map(([label, icon, page]) => (
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
      <HubNav
        active="Trader’s Hub"
        setActivePage={setActivePage}
        openDeposit={openDeposit}
      />

      <section className="homeHero">
        <div>
          <h1>
            Trade Smarter.
            <span>Earn Consistently.</span>
          </h1>
          <p>
            AI-powered trading, binary options, forex and bots in one professional
            MetaBinary platform.
          </p>
          <button onClick={() => setActivePage("trade")}>Start Trading →</button>
        </div>

        <div className="homeCard">
          <strong>EUR/USD</strong>
          <h2>{livePrice.toFixed(5)}</h2>
          <LineMini prices={prices} />
          <button onClick={() => setActivePage("trade")}>CALL</button>
          <button onClick={() => setActivePage("trade")}>PUT</button>
        </div>
      </section>

      <section className="statGrid">
        <Stat value="$2,456,789" label="Total Trades" />
        <Stat value="15,342" label="Active Traders" />
        <Stat value="$892,456" label="Payouts" />
        <Stat value="98.62%" label="Success" />
      </section>

      <section className="marketStrip">
        <p>
          <b>EUR/USD</b>
          <span className="green">+0.24%</span>
        </p>
        <p>
          <b>GBP/USD</b>
          <span className="red">-0.11%</span>
        </p>
        <p>
          <b>XAU/USD</b>
          <span className="green">+0.24%</span>
        </p>
        <p>
          <b>BTC/USD</b>
          <span className="green">+0.24%</span>
        </p>
      </section>
    </div>
  );
}

function ForexPage({
  livePrice,
  prices,
  positions,
  closedForex,
  placeForexOrder,
  updatePosition,
  closePosition,
  closeAllPositions,
  setActivePage,
  openDeposit,
}) {
  const [symbol, setSymbol] = useState("XAU/USD");
  const [volume, setVolume] = useState(0.01);
  const [leverage, setLeverage] = useState("1:100");
  const [stopLoss, setStopLoss] = useState(1.08312);
  const [takeProfit, setTakeProfit] = useState(1.092);
  const [tradeTab, setTradeTab] = useState("open");
  const [showOnChart, setShowOnChart] = useState(true);

  const visiblePositions = positions.filter((position) => position.instrument === symbol);

  const filteredRows =
    tradeTab === "profit"
      ? visiblePositions.filter((x) => x.pl >= 0)
      : tradeTab === "loss"
      ? visiblePositions.filter((x) => x.pl < 0)
      : tradeTab === "closed"
      ? closedForex.filter((x) => x.instrument === symbol)
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

        <div className="symbolSelect">
          <select value={symbol} onChange={(e) => setSymbol(e.target.value)}>
            {MARKETS.map((market) => (
              <option key={market}>{market}</option>
            ))}
          </select>
        </div>

        <div className="symbolName">
          <strong>{symbol}</strong>
          <small>
            {symbol === "XAU/USD"
              ? "Gold / US Dollar"
              : symbol === "EUR/USD"
              ? "Euro / U.S. Dollar"
              : "Live TradingView market"}
          </small>
        </div>

        <div className="marketMetric">
          <small>Last Price</small>
          <strong className="green">{livePrice.toFixed(5)}</strong>
          <span className="green">+0.00231 ▲</span>
        </div>

        <div className="marketMetric">
          <small>24H High</small>
          <strong>1.08789</strong>
        </div>

        <div className="marketMetric">
          <small>24H Low</small>
          <strong className="red">1.08312</strong>
        </div>

        <div className="marketMetric hideSmall">
          <small>24H Volume</small>
          <strong>125.42K</strong>
        </div>

        <button>☆</button>
        <button>⋮</button>
      </section>

      <section className="forexToolbar">
        {["1m", "5m", "15m", "1h", "4h", "1D"].map((item, index) => (
          <button className={index === 0 ? "active" : ""} key={item}>
            {item}
          </button>
        ))}
        <button>⌄</button>
        <button>ƒx Indicators</button>
        <button>Templates</button>
        <span></span>
        <button>↶</button>
        <button>↷</button>
        <button>⛶</button>
        <button>📷</button>
        <button>⚙</button>
      </section>

      <section className="proChartPanel">
        <CandleChart
          symbol={symbol}
          prices={prices}
          livePrice={livePrice}
          positions={visiblePositions}
          showOnChart={showOnChart}
        />
      </section>

      <section className="proOrderPanel">
        <div className="orderForm">
          <div className="orderTabs">
            <button className="active">Market Order</button>
            <button>Pending Order</button>
          </div>

          <div className="orderInputs">
            <OrderInput
              label="Volume (Lots)"
              value={volume}
              setValue={setVolume}
              step={0.01}
              min={0.01}
            />

            <label className="orderInput">
              <span>Leverage</span>
              <select value={leverage} onChange={(e) => setLeverage(e.target.value)}>
                <option>1:100</option>
                <option>1:200</option>
                <option>1:500</option>
              </select>
            </label>

            <OrderInput
              label="Stop Loss"
              value={stopLoss}
              setValue={setStopLoss}
              step={0.0001}
              min={0}
            />

            <OrderInput
              label="Take Profit"
              value={takeProfit}
              setValue={setTakeProfit}
              step={0.0001}
              min={0}
            />
          </div>
        </div>

        <div className="buySellBox">
          <button className="buyLarge" onClick={() => order("Buy")}>
            <b>Buy ↑</b>
            <strong>{livePrice.toFixed(5)}</strong>
          </button>

          <button className="sellLarge" onClick={() => order("Sell")}>
            <b>Sell ↓</b>
            <strong>{(livePrice - 0.00012).toFixed(5)}</strong>
          </button>
        </div>

        <div className="spreadStats">
          <p>
            <span>Spread</span>
            <b>1.2 Pips</b>
          </p>
          <p>
            <span>High</span>
            <b className="green">1.08789</b>
          </p>
          <p>
            <span>Low</span>
            <b className="red">1.08312</b>
          </p>
          <p>
            <span>Change</span>
            <b className="green">+0.02%</b>
          </p>
        </div>
      </section>

      <section className="tradeManager">
        <div className="managerTabs">
          <button
            className={tradeTab === "open" ? "active" : ""}
            onClick={() => setTradeTab("open")}
          >
            Open Trades <b>{visiblePositions.length}</b>
          </button>

          <button
            className={tradeTab === "profit" ? "active" : ""}
            onClick={() => setTradeTab("profit")}
          >
            Profit <b>{visiblePositions.filter((x) => x.pl >= 0).length}</b>
          </button>

          <button
            className={tradeTab === "loss" ? "active" : ""}
            onClick={() => setTradeTab("loss")}
          >
            Loss <b>{visiblePositions.filter((x) => x.pl < 0).length}</b>
          </button>

          <button
            className={tradeTab === "closed" ? "active" : ""}
            onClick={() => setTradeTab("closed")}
          >
            Closed Trades
          </button>

          <label className="showChartToggle">
            <input
              type="checkbox"
              checked={showOnChart}
              onChange={(e) => setShowOnChart(e.target.checked)}
            />
            Show on Chart
          </label>

          <button className="closeAll" onClick={closeAllPositions}>
            Close All
          </button>
        </div>

        <div className="tradeTable">
          <div className="tradeHead">
            <span>Instrument</span>
            <span>Type</span>
            <span>Volume</span>
            <span>Open Price</span>
            <span>Current Price</span>
            <span>Stop Loss</span>
            <span>Take Profit</span>
            <span>P/L</span>
            <span>P/L (%)</span>
            <span>Action</span>
          </div>

          {filteredRows.length === 0 && (
            <div className="emptyTradeRow">No trades yet. Place Buy or Sell order.</div>
          )}

          {filteredRows.map((position) => (
            <div className="tradeRow" key={position.id}>
              <strong>
                {position.instrument}
                <small>{position.name}</small>
              </strong>

              <b className={position.side === "Buy" ? "buyTag" : "sellTag"}>
                {position.side}
              </b>

              <span>{position.volume}</span>
              <span>{Number(position.openPrice).toFixed(5)}</span>
              <span>{Number(position.currentPrice || position.openPrice).toFixed(5)}</span>

              {tradeTab === "closed" ? (
                <>
                  <span>{Number(position.stopLoss).toFixed(5)}</span>
                  <span>{Number(position.takeProfit).toFixed(5)}</span>
                </>
              ) : (
                <>
                  <label className="editPrice">
                    <input
                      value={position.stopLoss}
                      onChange={(e) =>
                        updatePosition(position.id, {
                          stopLoss: Number(e.target.value),
                        })
                      }
                    />
                    <i>✎</i>
                  </label>

                  <label className="editPrice">
                    <input
                      value={position.takeProfit}
                      onChange={(e) =>
                        updatePosition(position.id, {
                          takeProfit: Number(e.target.value),
                        })
                      }
                    />
                    <i>✎</i>
                  </label>
                </>
              )}

              <em className={position.pl >= 0 ? "green" : "red"}>
                {position.pl >= 0 ? "+" : ""}
                {money(position.pl)} USD
              </em>

              <em className={position.pl >= 0 ? "green" : "red"}>
                {position.plPercent >= 0 ? "+" : ""}
                {position.plPercent || 0}%
              </em>

              {tradeTab === "closed" ? (
                <span>Closed</span>
              ) : (
                <div className="rowActions">
                  <button onClick={() => updatePosition(position.id, {})}>
                    Modify
                  </button>
                  <button onClick={() => closePosition(position.id)}>Close</button>
                  <span>⋮</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function OrderInput({ label, value, setValue, step, min }) {
  function minus() {
    const next = Number(value) - Number(step);
    setValue(Number(Math.max(min, next).toFixed(5)));
  }

  function plus() {
    const next = Number(value) + Number(step);
    setValue(Number(next.toFixed(5)));
  }

  return (
    <label className="orderInput">
      <span>{label}</span>
      <div>
        <input value={value} onChange={(e) => setValue(Number(e.target.value))} />
        <button type="button" onClick={minus}>
          −
        </button>
        <button type="button" onClick={plus}>
          +
        </button>
      </div>
    </label>
  );
}

function CandleChart({ symbol, prices, livePrice, positions, showOnChart }) {
  const candles = useMemo(() => {
    return prices.slice(-90).map((close, index, arr) => {
      const open = arr[index - 1] || close;
      const high = Math.max(open, close) + Math.random() * 0.00045;
      const low = Math.min(open, close) - Math.random() * 0.00045;

      return { open, close, high, low };
    });
  }, [prices]);

  const levels = [
    livePrice,
    ...positions.flatMap((position) => [position.stopLoss, position.takeProfit, position.openPrice]),
  ].filter(Boolean);

  const min = Math.min(...candles.map((c) => c.low), ...levels) - 0.00025;
  const max = Math.max(...candles.map((c) => c.high), ...levels) + 0.00025;
  const range = max - min || 1;

  function y(value) {
    return 246 - ((value - min) / range) * 210;
  }

  const widthStep = 100 / candles.length;
  const mainPosition = positions[0];

  return (
    <div className="chartShell">
      <div className="chartTopStrip">
        <strong>{symbol} · 1m</strong>
        <span className="green">●</span>
        <small>
          O {candles.at(-1)?.open.toFixed(5)} H {candles.at(-1)?.high.toFixed(5)} L{" "}
          {candles.at(-1)?.low.toFixed(5)} C {livePrice.toFixed(5)} +0.00023
        </small>
      </div>

      <div className="chartTools">
        {["＋", "⌁", "☰", "⌘", "T", "◎", "▱", "⌕", "◉", "🗑"].map((tool) => (
          <button key={tool}>{tool}</button>
        ))}
      </div>

      <svg viewBox="0 0 100 260" preserveAspectRatio="none">
        <defs>
          <pattern id="chartGrid" width="7.5" height="32" patternUnits="userSpaceOnUse">
            <path
              d="M 7.5 0 L 0 0 0 32"
              fill="none"
              stroke="rgba(255,255,255,.055)"
              strokeWidth=".12"
            />
          </pattern>
        </defs>

        <rect width="100" height="260" fill="url(#chartGrid)" />

        <line
          x1="0"
          x2="100"
          y1={y(livePrice)}
          y2={y(livePrice)}
          stroke="#00c987"
          strokeDasharray="1.2 1.5"
          strokeWidth=".16"
        />

        {showOnChart &&
          positions.map((position) => (
            <g key={position.id}>
              <line
                x1="66"
                x2="96"
                y1={y(position.takeProfit)}
                y2={y(position.takeProfit)}
                stroke="#00e884"
                strokeDasharray="1.2 1.2"
                strokeWidth=".18"
              />

              <line
                x1="66"
                x2="96"
                y1={y(position.stopLoss)}
                y2={y(position.stopLoss)}
                stroke="#ff4057"
                strokeDasharray="1.2 1.2"
                strokeWidth=".18"
              />

              <line
                x1="0"
                x2="100"
                y1={y(position.openPrice)}
                y2={y(position.openPrice)}
                stroke="rgba(0,232,132,.45)"
                strokeDasharray=".8 1.5"
                strokeWidth=".16"
              />
            </g>
          ))}

        {candles.map((candle, index) => {
          const x = index * widthStep + widthStep / 2;
          const isUp = candle.close >= candle.open;
          const top = y(Math.max(candle.open, candle.close));
          const bottom = y(Math.min(candle.open, candle.close));
          const color = isUp ? "#00d3a0" : "#ff4057";

          return (
            <g key={index}>
              <line
                x1={x}
                x2={x}
                y1={y(candle.high)}
                y2={y(candle.low)}
                stroke={color}
                strokeWidth=".17"
              />

              <rect
                x={x - widthStep * 0.23}
                y={top}
                width={widthStep * 0.46}
                height={Math.max(1.3, bottom - top)}
                fill={color}
              />

              <rect
                x={x - widthStep * 0.18}
                y={224 + Math.random() * 10}
                width={widthStep * 0.36}
                height={14 + Math.random() * 24}
                fill={isUp ? "rgba(0,211,160,.42)" : "rgba(255,64,87,.42)"}
              />
            </g>
          );
        })}
      </svg>

      {showOnChart && mainPosition && (
        <>
          <div className="chartOrderTag" style={{ top: `${(y(mainPosition.openPrice) / 260) * 100}%` }}>
            {mainPosition.side === "Buy" ? "↟" : "↡"} {mainPosition.side} {mainPosition.volume}
          </div>

          <div className="tpLabel" style={{ top: `${(y(mainPosition.takeProfit) / 260) * 100}%` }}>
            TP {Number(mainPosition.takeProfit).toFixed(5)}
          </div>

          <div className="slLabel" style={{ top: `${(y(mainPosition.stopLoss) / 260) * 100}%` }}>
            SL {Number(mainPosition.stopLoss).toFixed(5)}
          </div>
        </>
      )}

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
        {["Even/Odd", "Matches/Differs", "Over/Under", "Rise/Fall", "Touch/No Touch"].map(
          (item) => (
            <button
              key={item}
              className={tradeType === item ? "active" : ""}
              onClick={() => setTradeType(item)}
            >
              {item}
            </button>
          )
        )}
      </section>

      <section className="binaryBox">
        <div className="binaryTop">
          <div>
            <strong>Volatility 100 (1s) Index</strong>
            <small>{(livePrice * 800).toFixed(2)} · LIVE</small>
          </div>
          <button>1s⌄</button>
        </div>

        <LineChart data={prices.map((price) => price * 800)} />

        <h3>Last Digits</h3>

        <div className="digitGrid">
          {digitStats.map((percentage, digit) => (
            <button
              key={digit}
              className={`${digit === lastDigit ? "hot" : ""} ${
                digit === prediction ? "picked" : ""
              }`}
              onClick={() => setPrediction(digit)}
            >
              <strong>{digit}</strong>
              <span>{percentage.toFixed(1)}%</span>
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

function LineMini({ prices }) {
  const data = prices.slice(-28);
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const path = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = 34 - ((value - min) / range) * 30;
      return `${index === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");

  return (
    <svg className="lineMini" viewBox="0 0 100 36" preserveAspectRatio="none">
      <path d={path} />
    </svg>
  );
}

function BotsPage({ bots, startBot }) {
  const running = bots.filter((bot) => bot.status === "Running").length;
  const stopped = bots.filter((bot) => bot.status === "Stopped").length;
  const completed = bots.filter((bot) => bot.status === "Completed").length || 4;

  return (
    <div className="page botsPage proBotsPage">
      <aside className="botsSideRail">
        <button>▦<span>Dashboard</span></button>
        <button className="active">🤖<span>Bots</span></button>
        <button>▥<span>Strategies</span></button>
        <button>↺<span>History</span></button>
        <button>▣<span>Reports</span></button>
        <button>⚙<span>Settings</span></button>
      </aside>

      <section className="botsMain">
        <div className="botsTitleRow">
          <div className="botsTitleLeft">
            <div className="botsTitleIcon">🤖</div>
            <div>
              <h1>My Bots</h1>
              <p>Create, manage and monitor your trading bots.</p>
            </div>
          </div>

          <button className="newBotBtn">+ New Bot</button>
        </div>

        <div className="proBotStats">
          <div className="proBotStat blue">
            <div className="statIcon">🤖</div>
            <div>
              <strong>{bots.length}</strong>
              <span>Total Bots</span>
            </div>
            <MiniSpark type="blue" />
          </div>

          <div className="proBotStat green">
            <div className="statIcon">▶</div>
            <div>
              <strong>{running}</strong>
              <span>Running</span>
            </div>
            <MiniSpark type="green" />
          </div>

          <div className="proBotStat yellow">
            <div className="statIcon">Ⅱ</div>
            <div>
              <strong>{stopped}</strong>
              <span>Stopped</span>
            </div>
            <MiniSpark type="yellow" />
          </div>

          <div className="proBotStat purple">
            <div className="statIcon">✓</div>
            <div>
              <strong>{completed}</strong>
              <span>Completed</span>
            </div>
            <MiniSpark type="purple" />
          </div>
        </div>

        <div className="botFilterBar">
          <label className="botSearch">
            🔍
            <input placeholder="Search bots..." />
          </label>

          <button className="active">▦ All Bots</button>
          <button>▶ Active</button>
          <button>Ⅱ Stopped</button>
          <button>✓ Completed</button>

          <select>
            <option>Performance</option>
            <option>Profit</option>
            <option>Win Rate</option>
          </select>

          <select>
            <option>Strategy Type</option>
            <option>Even/Odd</option>
            <option>Rise/Fall</option>
            <option>Over/Under</option>
          </select>

          <select>
            <option>Newest First</option>
            <option>Oldest First</option>
          </select>
        </div>

        <div className="proBotGrid">
          {bots.map((bot, index) => {
            const positive = bot.profit >= 0;
            const isRunning = bot.status === "Running";

            return (
              <article className="proBotCard" key={bot.id}>
                <div className="proBotCardTop">
                  <div className={`botAvatar botColor${index + 1}`}>
                    {bot.code}
                  </div>

                  <div className="botNameBlock">
                    <div>
                      <h2>{bot.name}</h2>
                      <span className={isRunning ? "botStatus running" : "botStatus stopped"}>
                        ● {bot.status}
                      </span>
                    </div>

                    <p>
                      {bot.type} <b>•</b> {bot.market}
                    </p>

                    <small>
                      Stake: {money(bot.stake)} USD <b>•</b> Duration: {bot.duration}s
                    </small>
                  </div>

                  <button className="botDots">⋮</button>
                </div>

                <div className="botPerformanceRow">
                  <div>
                    <span>Total Profit</span>
                    <strong className={positive ? "green" : "red"}>
                      {positive ? "+" : ""}
                      {money(bot.profit)} USD
                    </strong>
                  </div>

                  <div className="sparkArea">
                    <BotPerformanceLine positive={positive} index={index} />
                  </div>

                  <div className="botCardActions">
                    <button className="detailsBtn" onClick={() => startBot(bot)}>
                      ◉ View Details
                    </button>

                    <button
                      className={isRunning ? "stopBotBtn" : "startBotBtn"}
                      onClick={() => startBot(bot)}
                    >
                      {isRunning ? "■ Run Bot" : "▶ Start Bot"}
                    </button>

                    <button className="settingsBotBtn">⚙ Settings</button>
                  </div>
                </div>

                <div className="botMiniStats">
                  <p>
                    <span>Win Rate</span>
                    <b>{bot.winRate}%</b>
                  </p>

                  <p>
                    <span>Trades</span>
                    <b>{Math.round(bot.winRate / 2)}</b>
                  </p>

                  <p>
                    <span>Balance</span>
                    <b>{money(10000 + bot.profit)} USD</b>
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function MiniSpark({ type }) {
  const points =
    type === "green"
      ? "5,42 22,39 38,34 56,28 76,31 96,22 116,31 138,25 160,18"
      : type === "yellow"
      ? "5,45 22,41 38,35 56,28 76,22 96,26 116,20 138,25 160,14"
      : type === "purple"
      ? "5,44 22,39 38,36 56,29 76,25 96,20 116,24 138,18 160,10"
      : "5,44 22,40 38,34 56,29 76,18 96,12 116,19 138,21 160,12";

  return (
    <svg className={`miniSpark ${type}`} viewBox="0 0 165 52">
      <polyline points={points} />
    </svg>
  );
}

function BotPerformanceLine({ positive, index }) {
  const lines = [
    "4,58 20,54 36,44 52,38 68,30 86,20 104,25 122,36 140,31 160,26 178,18",
    "4,54 20,48 36,50 52,42 68,39 86,31 104,16 122,31 140,38 160,27 178,22",
    "4,20 20,24 36,22 52,30 68,27 86,36 104,41 122,48 140,45 160,52 178,58",
    "4,24 20,26 36,24 52,35 68,39 86,37 104,46 122,50 140,49 160,56 178,60",
  ];

  return (
    <svg className={positive ? "botLine positive" : "botLine negative"} viewBox="0 0 185 75">
      <polyline points={lines[index % lines.length]} />
    </svg>
  );
}

function BotLivePage({
  bot,
  botRunning,
  startBot,
  stopBot,
  botTab,
  setBotTab,
  openTrades,
  closedTrades,
  transactions,
  back,
}) {
  const profitLoss = closedTrades.reduce(
    (sum, trade) => sum + (trade.won ? trade.profit : -trade.stake),
    0
  );

  const last = closedTrades[0];

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
        <button
          className={botRunning ? "stopRunner" : "startRunner"}
          onClick={botRunning ? stopBot : () => startBot(bot)}
        >
          {botRunning ? "■ Stop" : "▶ Run"}
        </button>

        <div>
          <strong>{botRunning ? "Contract bought" : "Bot is not running"}</strong>
          <span>
            <i></i>
          </span>
        </div>
      </section>

      <section className="runnerTabs">
        {["summary", "transactions", "journal"].map((tab) => (
          <button
            key={tab}
            className={botTab === tab ? "active" : ""}
            onClick={() => setBotTab(tab)}
          >
            {tab}
          </button>
        ))}
      </section>

      <section className="runnerBody">
        {botTab === "summary" && (
          <div
            className={
              last?.won
                ? "runnerResult won"
                : last
                ? "runnerResult lost"
                : "runnerResult"
            }
          >
            <strong>{openTrades[0] ? "Contract bought" : last ? "Closed" : "Ready"}</strong>
            <h2>
              {last
                ? `${last.won ? "+" : "-"}${money(
                    last.won ? last.profit : last.stake
                  )} USD`
                : "Hit Run"}
            </h2>
          </div>
        )}

        {botTab === "transactions" && (
          <div className="runnerList">
            {[...openTrades, ...closedTrades].slice(0, 7).map((trade) => (
              <p key={trade.id}>
                <span>
                  {trade.type} · {trade.action}
                </span>
                <b className={trade.won ? "green" : trade.status === "RUNNING" ? "" : "red"}>
                  {trade.status === "RUNNING"
                    ? "Running"
                    : `${trade.won ? "+" : "-"}${money(
                        trade.won ? trade.profit : trade.stake
                      )}`}
                </b>
              </p>
            ))}
          </div>
        )}

        {botTab === "journal" && (
          <div className="runnerList">
            {transactions.slice(0, 7).map((tx) => (
              <p key={tx.id}>
                <span>{tx.type}</span>
                <small>{tx.time}</small>
              </p>
            ))}
          </div>
        )}
      </section>

      <section className="runnerStats">
        <Stat value={closedTrades.length} label="Runs" />
        <Stat value={closedTrades.filter((x) => x.won).length} label="Won" />
        <Stat value={closedTrades.filter((x) => !x.won).length} label="Lost" />
        <Stat value={`${profitLoss >= 0 ? "+" : ""}${money(profitLoss)}`} label="P/L" />
      </section>
    </div>
  );
}

function ProfilePage({ user, balances, transactions, logout, setActivePage }) {
  return (
    <div className="page profilePage">
      <section className="profileTop">
        <div className="bigAvatar">{user.initials}</div>
        <div>
          <h2>
            {user.name} <span>✓</span>
          </h2>
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

      <section className="profileGrid">
        <button onClick={() => setActivePage("settings")}>
          ⚙<b>Settings</b>
          <span>Preferences</span>
        </button>
        <button onClick={() => setActivePage("history")}>
          ↺<b>History</b>
          <span>{transactions.length} records</span>
        </button>
        <button>
          🛡<b>KYC</b>
          <span>Verified</span>
        </button>
        <button>
          👥<b>Referral</b>
          <span>Earn 30%</span>
        </button>
      </section>

      <button className="logoutWide" onClick={logout}>
        ⇥ Logout
      </button>
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
          {["Confirm before trading", "Quick Trade", "Sound Alerts", "Compact Mode"].map(
            (item) => (
              <p key={item}>
                <span>{item}</span>
                <b></b>
              </p>
            )
          )}
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

        {transactions.slice(0, 12).map((tx) => (
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

function ReportsPage({ transactions, closedForex, closedBinary }) {
  const wins = closedBinary.filter((x) => x.won).length;
  const losses = closedBinary.filter((x) => !x.won).length;

  return (
    <div className="page listPage">
      <h1>Reports</h1>
      <section className="statGrid">
        <Stat value={transactions.length} label="Transactions" />
        <Stat value={closedForex.length} label="Forex Closed" />
        <Stat value={wins} label="Wins" />
        <Stat value={losses} label="Losses" />
      </section>
    </div>
  );
}

function Stat({ value, label }) {
  return (
    <div className="statCard">
      <strong>{value}</strong>
      <span>{label}</span>
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
          className={
            activePage === key || (key === "bots" && activePage === "botLive")
              ? "active"
              : ""
          }
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
        </section>

        <div className="drawerGrid">
          <DrawerBlock title="TRADING">
            <DrawerButton icon="⌂" label="Trader’s Hub" onClick={() => go("home")} />
            <DrawerButton icon="▥" label="Markets" onClick={() => go("forex")} />
            <DrawerButton icon="↕" label="Trade" onClick={() => go("trade")} />
          </DrawerBlock>

          <DrawerBlock title="FUNDS">
            <DrawerButton
              icon="▱"
              label="Cashier / Deposit"
              onClick={() => {
                openDeposit();
                close();
              }}
            />
            <DrawerButton
              icon="⇧"
              label="Withdraw"
              onClick={() => {
                openWithdraw();
                close();
              }}
            />
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

        <button className="drawerLogout" onClick={logout}>
          ⇥ Logout
        </button>
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
        <button className="closeModal" onClick={close}>
          ×
        </button>

        {!method ? (
          <>
            <h2>Deposit Funds</h2>
            <p>Choose payment method</p>

            <PaymentButton
              icon="📱"
              title="M-Pesa"
              text="Instant mobile money"
              onClick={() => setMethod("mpesa")}
            />

            <PaymentButton
              icon="💳"
              title="Credit/Debit Card"
              text="Visa, Mastercard"
              onClick={() => setMethod("card")}
            />

            <PaymentButton
              icon="₿"
              title="USDT (TRC20)"
              text="Cryptocurrency"
              onClick={() => setMethod("usdt")}
            />
          </>
        ) : (
          <>
            <button className="modalBack" onClick={() => setMethod("")}>
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
                <label>Phone Number</label>
                <input
                  placeholder="07XXXXXXXX or 2547XXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </>
            )}

            <button
              className="modalPrimary"
              onClick={() => submit({ method, amountUsd, phone })}
            >
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
        <button className="closeModal" onClick={close}>
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

        <label>M-Pesa Phone</label>
        <input
          placeholder="07XXXXXXXX"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

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