import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const BOT_TEMPLATES = [
  ["Neon Eclipse", "EO", "Even/Odd", "Even", "Volatility 100 (1s)", 10, 5, 72.5, "Running"],
  ["Quantum Surge", "QS", "Rise/Fall", "Rise", "Volatility 75", 15, 5, 68.0, "Stopped"],
  ["Alpha Over", "AO", "Over/Under", "Over", "Volatility 100", 10, 5, 45.0, "Stopped"],
  ["Matrix Differ", "MD", "Matches/Differs", "Differs", "Volatility 50", 20, 5, 40.0, "Stopped"],
  ["Turbo Touch", "TT", "Touch/No Touch", "Touch", "Volatility 100", 10, 5, 77.5, "Completed"],
  ["Binary Striker", "BS", "Even/Odd", "Odd", "Volatility 25", 25, 10, 75.2, "Running"],
].map(([name, code, contract, choice, market, stake, duration, winRate, status], i) => ({
  id: i + 1,
  name,
  code,
  contract,
  choice,
  market,
  stake,
  duration,
  winRate,
  status,
  profit: [250.75, 180.4, -45, -120, 310.5, 375.6][i],
}));

function storage(key, fallback) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : fallback;
  } catch {
    return fallback;
  }
}

function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function money(v) {
  return Number(v || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function id() {
  return Date.now() + Math.random();
}

function userInitials(value) {
  return String(value || "JM")
    .replace("@gmail.com", "")
    .split(/[ ._-]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0]?.toUpperCase())
    .join("") || "JM";
}

function buildPrices() {
  let start = 1.0856;
  return Array.from({ length: 90 }, (_, i) => {
    start += (Math.random() - 0.48) * 0.00032 + Math.sin(i / 8) * 0.00006;
    return Number(start.toFixed(5));
  });
}

export default function App() {
  const [user, setUser] = useState(() => storage("mb_user", null));
  const [authMode, setAuthMode] = useState("login");

  const [activePage, setActivePage] = useState("forex");
  const [account, setAccount] = useState(() => storage("mb_account", "demo"));
  const [balances, setBalances] = useState(() =>
    storage("mb_balances", { demo: 10000, real: 0 })
  );

  const [prices, setPrices] = useState(buildPrices);
  const [lastDigit, setLastDigit] = useState(0);
  const [digitStats, setDigitStats] = useState(() =>
    Array.from({ length: 10 }, () => 7 + Math.random() * 6)
  );

  const [menuOpen, setMenuOpen] = useState(false);
  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  const [tradeType, setTradeType] = useState("Even/Odd");
  const [stake, setStake] = useState(10);
  const [duration, setDuration] = useState(5);
  const [prediction, setPrediction] = useState(2);

  const [openTrades, setOpenTrades] = useState([]);
  const [closedTrades, setClosedTrades] = useState(() => storage("mb_closed", []));
  const [transactions, setTransactions] = useState(() => storage("mb_transactions", []));
  const [positions, setPositions] = useState(() => storage("mb_positions", []));
  const [toast, setToast] = useState(null);

  const [botRunning, setBotRunning] = useState(false);
  const [runningBot, setRunningBot] = useState(null);
  const [botTab, setBotTab] = useState("summary");

  const live = prices[prices.length - 1] || 1.08668;
  const balance = balances[account] || 0;

  useEffect(() => save("mb_user", user), [user]);
  useEffect(() => save("mb_account", account), [account]);
  useEffect(() => save("mb_balances", balances), [balances]);
  useEffect(() => save("mb_closed", closedTrades), [closedTrades]);
  useEffect(() => save("mb_transactions", transactions), [transactions]);
  useEffect(() => save("mb_positions", positions), [positions]);

  useEffect(() => {
    const timer = setInterval(() => {
      setPrices((old) => {
        const last = old[old.length - 1] || 1.08668;
        const next = Number(
          (last + (Math.random() - 0.48) * 0.0005 + Math.sin(Date.now() / 9000) * 0.00005).toFixed(5)
        );
        return [...old.slice(-89), next];
      });

      setLastDigit(Math.floor(Math.random() * 10));
      setDigitStats(Array.from({ length: 10 }, () => 7 + Math.random() * 6));
    }, 850);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setPositions((old) =>
      old.map((p) => {
        const pl =
          p.side === "Buy"
            ? (live - p.entry) * 100000 * p.lot
            : (p.entry - live) * 100000 * p.lot;

        return { ...p, current: live, pl: Number(pl.toFixed(2)) };
      })
    );
  }, [live]);

  useEffect(() => {
    if (!user?.email) return;

    refreshUser();
    const timer = setInterval(refreshUser, 7000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  useEffect(() => {
    if (!botRunning || !runningBot) return;

    const timer = setInterval(() => {
      buyBinary(runningBot.choice, runningBot);
    }, (runningBot.duration + 2) * 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botRunning, runningBot]);

  function notify(type, title, message) {
    setToast({ type, title, message });
    setTimeout(() => setToast(null), 3200);
  }

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
      // Backend offline: app still works for demo UI.
    }
  }

  function addMoney(target, amount) {
    setBalances((old) => ({
      ...old,
      [target]: Number((Number(old[target] || 0) + Number(amount)).toFixed(2)),
    }));
  }

  function addTransaction(tx) {
    setTransactions((old) => [
      { id: id(), time: new Date().toLocaleString(), ...tx },
      ...old,
    ]);
  }

  function login(data) {
    if (!data.email || !data.password) {
      notify("loss", "Login failed", "Enter email and password.");
      return;
    }

    setUser({
      name: data.email.split("@")[0],
      email: data.email,
      initials: userInitials(data.email),
      brokerId: "MB" + Math.floor(100000 + Math.random() * 900000),
      verified: true,
    });

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

    setUser({
      name: `${data.firstName} ${data.lastName}`,
      email: data.email,
      phone: data.phone,
      initials: userInitials(`${data.firstName} ${data.lastName}`),
      brokerId: "MB" + Math.floor(100000 + Math.random() * 900000),
      verified: true,
    });

    setBalances({ demo: 10000, real: 0 });
    setActivePage("forex");
    notify("win", "Account created", "Your demo balance is ready.");
  }

  function logout() {
    localStorage.removeItem("mb_user");
    setUser(null);
    setMenuOpen(false);
    setAuthMode("login");
  }

  function contractActions(type) {
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
    if (type === "Over/Under") return 1.85;
    return 1.9;
  }

  function settle(type, action, pred, entry, exit) {
    const digit = Math.floor(Math.random() * 10);

    if (type === "Even/Odd") {
      return { digit, won: action === "Even" ? digit % 2 === 0 : digit % 2 !== 0 };
    }

    if (type === "Matches/Differs") {
      return { digit, won: action === "Matches" ? digit === pred : digit !== pred };
    }

    if (type === "Over/Under") {
      return { digit, won: action === "Over" ? digit > pred : digit < pred };
    }

    if (type === "Rise/Fall") {
      return { digit, won: action === "Rise" ? exit > entry : exit < entry };
    }

    const touched = Math.random() > 0.5;
    return { digit, won: action === "Touch" ? touched : !touched };
  }

  function buyBinary(action, bot = null) {
    const usedType = bot?.contract || tradeType;
    const usedStake = Number(bot?.stake || stake);
    const usedDuration = Number(bot?.duration || duration);
    const pred = Number(prediction);

    if (usedStake < 0.3) {
      notify("loss", "Minimum stake", "Minimum stake is $0.30.");
      return;
    }

    if (balances[account] < usedStake) {
      notify("loss", "Low balance", `Your ${account} account has insufficient balance.`);
      return;
    }

    const rate = payoutRate(usedType, action);
    const payout = Number((usedStake * rate).toFixed(2));
    const profit = Number((payout - usedStake).toFixed(2));

    const trade = {
      id: id(),
      account,
      botName: bot?.name || "",
      contract: usedType,
      action,
      prediction: pred,
      stake: usedStake,
      payout,
      profit,
      entry: live,
      status: "RUNNING",
      openedAt: new Date().toLocaleTimeString(),
    };

    addMoney(account, -usedStake);
    setOpenTrades((old) => [trade, ...old]);

    addTransaction({
      type: bot ? `${bot.name} bought contract` : "Manual contract bought",
      method: bot ? "Bot" : "Manual",
      account,
      amount: -usedStake,
      status: "Running",
      details: `${usedType} · ${action}`,
    });

    notify("open", "Contract bought", `${usedType} · ${action} · $${money(usedStake)}`);

    setTimeout(() => {
      const exit = Number((trade.entry + (Math.random() - 0.5) * 0.0012).toFixed(5));
      const result = settle(usedType, action, pred, trade.entry, exit);

      const done = {
        ...trade,
        exit,
        resultDigit: result.digit,
        won: result.won,
        status: result.won ? "WON" : "LOST",
        closedAt: new Date().toLocaleTimeString(),
      };

      setOpenTrades((old) => old.filter((x) => x.id !== trade.id));
      setClosedTrades((old) => [done, ...old].slice(0, 100));

      if (done.won) addMoney(done.account, done.payout);

      addTransaction({
        type: done.won ? "Profit amount" : "Loss amount",
        method: bot ? "Bot" : "Manual",
        account: done.account,
        amount: done.won ? done.profit : -done.stake,
        status: done.status,
        details: `${done.contract} · digit ${done.resultDigit}`,
      });

      notify(
        done.won ? "win" : "loss",
        done.won ? "Trade won" : "Trade lost",
        `${done.action} · digit ${done.resultDigit} · ${
          done.won ? "+" : "-"
        }$${money(done.won ? done.profit : done.stake)}`
      );
    }, usedDuration * 1000);
  }

  function forexOrder(side, symbol = "EUR/USD") {
    const lot = 0.01;
    const entry = Number((side === "Buy" ? live + 0.00006 : live - 0.00006).toFixed(5));

    const position = {
      id: id(),
      instrument: symbol,
      side,
      lot,
      entry,
      current: live,
      pl: 0,
      time: new Date().toLocaleTimeString(),
    };

    setPositions((old) => [position, ...old].slice(0, 8));
    notify("open", `${side} order placed`, `${symbol} · ${lot} lot`);
  }

  function closePosition(pid) {
    const p = positions.find((x) => x.id === pid);
    if (!p) return;

    addTransaction({
      type: `${p.side} ${p.instrument} closed`,
      method: "Forex",
      account,
      amount: p.pl,
      status: "Closed",
      details: `${p.lot} lot`,
    });

    addMoney(account, p.pl);
    setPositions((old) => old.filter((x) => x.id !== pid));
    notify(p.pl >= 0 ? "win" : "loss", "Position closed", `${p.pl >= 0 ? "+" : ""}${money(p.pl)} USD`);
  }

  function startBot(bot) {
    setRunningBot(bot);
    setBotRunning(true);
    setBotTab("summary");
    setActivePage("botLive");
    buyBinary(bot.choice, bot);
  }

  function stopBot() {
    setBotRunning(false);
    notify("open", "Bot stopped", "No new bot contracts will be bought.");
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

      setAccount("real");
      setDepositOpen(false);

      addTransaction({
        type: "Deposit pending",
        method: data.method,
        account: "real",
        amount: Number(data.amountUsd),
        status: "Pending",
        details: data.phone || data.method,
      });

      notify("open", "Deposit started", data.method === "mpesa" ? "Check your phone for STK Push." : "Continue payment.");
      setTimeout(refreshUser, 5000);
    } catch (e) {
      notify("loss", "Deposit error", e.message || "Backend not connected.");
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
        body: JSON.stringify({ email: user.email, ...data }),
      });

      const json = await res.json();

      if (!res.ok || json.ok === false) {
        throw new Error(json.message || "Withdrawal failed.");
      }

      addMoney("real", -amount);
      setWithdrawOpen(false);

      addTransaction({
        type: "Withdrawal request",
        method: "M-Pesa",
        account: "real",
        amount: -amount,
        status: "Processing",
        details: data.phone,
      });

      notify("open", "Withdrawal requested", "Your request is processing.");
    } catch (e) {
      notify("loss", "Withdrawal error", e.message || "Backend not connected.");
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
        setMenuOpen={setMenuOpen}
        setActivePage={setActivePage}
        openDeposit={() => setDepositOpen(true)}
      />

      <main className="mainScreen">
        {activePage === "home" && (
          <HomePage setActivePage={setActivePage} openDeposit={() => setDepositOpen(true)} />
        )}

        {activePage === "forex" && (
          <ForexPage
            live={live}
            prices={prices}
            positions={positions}
            forexOrder={forexOrder}
            closePosition={closePosition}
            setActivePage={setActivePage}
            openDeposit={() => setDepositOpen(true)}
          />
        )}

        {activePage === "trade" && (
          <TradePage
            prices={prices}
            live={live}
            lastDigit={lastDigit}
            digitStats={digitStats}
            tradeType={tradeType}
            setTradeType={setTradeType}
            stake={stake}
            setStake={setStake}
            duration={duration}
            setDuration={setDuration}
            prediction={prediction}
            setPrediction={setPrediction}
            contractActions={contractActions}
            payoutRate={payoutRate}
            buyBinary={buyBinary}
          />
        )}

        {activePage === "bots" && <BotsPage bots={BOT_TEMPLATES} startBot={startBot} />}

        {activePage === "botLive" && (
          <BotLivePage
            bot={runningBot}
            botRunning={botRunning}
            startBot={startBot}
            stopBot={stopBot}
            botTab={botTab}
            setBotTab={setBotTab}
            openTrades={openTrades.filter((t) => t.botName)}
            closedTrades={closedTrades.filter((t) => t.botName)}
            transactions={transactions.filter((t) => t.method === "Bot")}
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

        {activePage === "history" && (
          <HistoryPage transactions={transactions} closedTrades={closedTrades} />
        )}

        {activePage === "reports" && (
          <ReportsPage transactions={transactions} closedTrades={closedTrades} />
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
  const [l, setL] = useState({ email: "", password: "" });
  const [r, setR] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    terms: false,
  });

  return (
    <div className="authPage">
      {mode === "login" ? (
        <section className="authCard loginCard">
          <Logo />
          <h1>Welcome Back</h1>
          <p>Login to your account and continue trading.</p>

          <label>Email Address</label>
          <input value={l.email} onChange={(e) => setL({ ...l, email: e.target.value })} placeholder="Enter your email" />

          <label>Password</label>
          <input type="password" value={l.password} onChange={(e) => setL({ ...l, password: e.target.value })} placeholder="Enter your password" />

          <button className="primary" onClick={() => login(l)}>Login →</button>

          <small>
            Don’t have an account? <button onClick={() => setMode("register")}>Create Account</button>
          </small>
        </section>
      ) : (
        <section className="authCard registerCard">
          <Logo />
          <h1>Create Your Account</h1>
          <p>Join MetaBinary and start your trading journey.</p>

          <div className="regGrid">
            <input placeholder="First name" value={r.firstName} onChange={(e) => setR({ ...r, firstName: e.target.value })} />
            <input placeholder="Last name" value={r.lastName} onChange={(e) => setR({ ...r, lastName: e.target.value })} />
            <input placeholder="Email address" value={r.email} onChange={(e) => setR({ ...r, email: e.target.value })} />
            <input placeholder="+254 phone number" value={r.phone} onChange={(e) => setR({ ...r, phone: e.target.value })} />
            <input type="password" placeholder="Password" value={r.password} onChange={(e) => setR({ ...r, password: e.target.value })} />
            <input type="password" placeholder="Confirm password" value={r.confirmPassword} onChange={(e) => setR({ ...r, confirmPassword: e.target.value })} />
          </div>

          <label className="check">
            <input type="checkbox" checked={r.terms} onChange={(e) => setR({ ...r, terms: e.target.checked })} />
            I agree to the terms and confirm I am over 18.
          </label>

          <button className="primary" onClick={() => register(r)}>Create Account</button>

          <small>
            Already have an account? <button onClick={() => setMode("login")}>Login</button>
          </small>
        </section>
      )}
    </div>
  );
}

function Header({ user, account, setAccount, balance, setMenuOpen, setActivePage, openDeposit }) {
  return (
    <header className="header">
      <button className="hamb" onClick={() => setMenuOpen(true)}>☰</button>
      <Logo />

      <button className="wallet" onClick={() => setActivePage("profile")}>
        <small>{account === "demo" ? "DEMO ACCOUNT" : "REAL ACCOUNT"}</small>
        <strong>{money(balance)} USD</strong>
        <span>⌄</span>
      </button>

      <div className="switch">
        <button className={account === "demo" ? "active" : ""} onClick={() => setAccount("demo")}>Demo</button>
        <button className={account === "real" ? "active" : ""} onClick={() => setAccount("real")}>Real</button>
      </div>

      <button className="depositBtn" onClick={openDeposit}>Deposit</button>

      <button className="bell">🔔<b>3</b></button>

      <button className="avatar" onClick={() => setActivePage("profile")}>
        {user.initials}
        <i></i>
      </button>
    </header>
  );
}

function HubNav({ active, setActivePage, openDeposit }) {
  const links = [
    ["Trader’s Hub", "▣", "home"],
    ["Reports", "▤", "reports"],
    ["History", "↺", "history"],
    ["Forex", "▥", "forex"],
    ["Settings", "⚙", "settings"],
  ];

  return (
    <nav className="hub">
      {links.map(([name, icon, page]) => (
        <button key={name} className={active === name ? "active" : ""} onClick={() => setActivePage(page)}>
          <span>{icon}</span>
          <small>{name}</small>
        </button>
      ))}
      <button onClick={openDeposit}>
        <span>▱</span>
        <small>Cashier</small>
      </button>
    </nav>
  );
}

function HomePage({ setActivePage, openDeposit }) {
  return (
    <div className="page homePage">
      <HubNav active="Trader’s Hub" setActivePage={setActivePage} openDeposit={openDeposit} />

      <section className="hero">
        <div>
          <h1>Trade Smarter. Earn Consistently.</h1>
          <p>AI-powered trading, binary options, forex and bots in one platform.</p>
          <button onClick={() => setActivePage("trade")}>Start Trading →</button>
        </div>

        <div className="heroCard">
          <span>EUR/USD</span>
          <strong>1.08564</strong>
          <button>CALL</button>
          <button>PUT</button>
        </div>
      </section>

      <section className="stats">
        <Stat title="$2,456,789" text="Total Trades" />
        <Stat title="15,342" text="Active Traders" />
        <Stat title="$892,456" text="Payouts" />
        <Stat title="98.62%" text="Success" />
      </section>

      <section className="marketStrip">
        <p><b>EUR/USD</b><span className="green">+0.24%</span></p>
        <p><b>GBP/USD</b><span className="red">-0.11%</span></p>
        <p><b>XAU/USD</b><span className="green">+0.24%</span></p>
        <p><b>BTC/USD</b><span className="green">+0.24%</span></p>
      </section>
    </div>
  );
}

function ForexPage({ live, prices, positions, forexOrder, closePosition, setActivePage, openDeposit }) {
  const [symbol, setSymbol] = useState("EUR/USD");

  return (
    <div className="page forexPage">
      <HubNav active="Forex" setActivePage={setActivePage} openDeposit={openDeposit} />

      <section className="symbolBar">
        <button>‹</button>
        <select value={symbol} onChange={(e) => setSymbol(e.target.value)}>
          <option>EUR/USD</option>
          <option>GBP/USD</option>
          <option>USD/JPY</option>
          <option>XAU/USD</option>
          <option>BTC/USD</option>
        </select>

        <div>
          <strong>{symbol}</strong>
          <small>Live TradingView market</small>
        </div>

        <div>
          <strong className="green">{live.toFixed(5)}</strong>
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

      <section className="toolbar">
        {["1m", "5m", "15m", "1h", "4h", "1D"].map((x, i) => (
          <button key={x} className={i === 0 ? "active" : ""}>{x}</button>
        ))}
        <button>⌄</button>
        <button>ƒx</button>
        <button>Indicators</button>
        <button>↶</button>
        <button>↷</button>
        <button>⛶</button>
      </section>

      <section className="tvBox">
        <Candles prices={prices} live={live} symbol={symbol} />
      </section>

      <section className="orderBox">
        <div className="orderInputs">
          <div className="orderTabs">
            <button className="active">Market Order</button>
            <button>Pending Order</button>
          </div>

          <div className="inputsGrid">
            <MtInput label="Volume (Lots)" value="0.01" />
            <MtInput label="Leverage" value="1:100" />
            <MtInput label="Stop Loss" value="0.00000" />
            <MtInput label="Take Profit" value="0.00000" />
          </div>
        </div>

        <div className="buySell">
          <button className="buy" onClick={() => forexOrder("Buy", symbol)}>
            <strong>Buy ↗</strong>
            <span>{live.toFixed(5)}</span>
          </button>
          <button className="sell" onClick={() => forexOrder("Sell", symbol)}>
            <strong>Sell ↓</strong>
            <span>{(live - 0.00012).toFixed(5)}</span>
          </button>
        </div>

        <div className="spread">
          <p><span>Spread</span><b>1.2 Pips</b></p>
          <p><span>High</span><b className="green">1.08789</b></p>
          <p><span>Low</span><b className="red">1.08312</b></p>
          <p><span>Change</span><b className="green">+0.01%</b></p>
        </div>
      </section>

      <section className="positions">
        <div className="posTabs">
          <button className="active">Open Trades <b>{Math.max(positions.length, 2)}</b></button>
          <button>Profit <b>1</b></button>
          <button>Loss <b>1</b></button>
          <button>History</button>
          <button>Close All</button>
        </div>

        <div className="posHead">
          <span>Instrument</span><span>Type</span><span>Volume</span><span>Open Price</span><span>P/L</span><span>Action</span>
        </div>

        {(positions.length ? positions : [
          { id: "x1", instrument: symbol, side: "Buy", lot: 0.01, entry: 1.0854, pl: 1.28 },
          { id: "x2", instrument: symbol, side: "Sell", lot: 0.02, entry: 1.0881, pl: 2.12 },
        ]).slice(0, 3).map((p) => (
          <div className="posRow" key={p.id}>
            <strong>{p.instrument}</strong>
            <b className={p.side === "Buy" ? "green" : "red"}>{p.side}</b>
            <span>{p.lot}</span>
            <span>{Number(p.entry).toFixed(5)}</span>
            <em className={p.pl >= 0 ? "green" : "red"}>{p.pl >= 0 ? "+" : ""}{money(p.pl)} USD</em>
            <button onClick={() => closePosition(p.id)}>Close</button>
          </div>
        ))}
      </section>
    </div>
  );
}

function Candles({ prices, live, symbol }) {
  const candles = useMemo(() => {
    return prices.slice(-70).map((p, i, arr) => {
      const open = arr[i - 1] || p;
      const close = p;
      const high = Math.max(open, close) + Math.random() * 0.00042;
      const low = Math.min(open, close) - Math.random() * 0.00042;
      return { open, close, high, low };
    });
  }, [prices]);

  const min = Math.min(...candles.map((c) => c.low));
  const max = Math.max(...candles.map((c) => c.high));
  const range = max - min || 1;

  const y = (v) => 220 - ((v - min) / range) * 180;
  const cw = 100 / candles.length;

  return (
    <div className="chartInner">
      <div className="chartTop">
        <strong>🔎 {symbol.replace("/", "")}</strong>
        <button>＋</button>
        <button>1m</button>
        <button>30m</button>
        <button>1h</button>
        <button>Indicators</button>
      </div>

      <div className="leftTools">
        {["＋", "⌁", "☰", "⌘", "T", "☺", "▱", "⌕", "👁", "🗑"].map((x) => <button key={x}>{x}</button>)}
      </div>

      <svg viewBox="0 0 100 235" preserveAspectRatio="none">
        <defs>
          <pattern id="grid" width="8" height="26" patternUnits="userSpaceOnUse">
            <path d="M 8 0 L 0 0 0 26" fill="none" stroke="rgba(255,255,255,.055)" strokeWidth=".12" />
          </pattern>
        </defs>

        <rect width="100" height="235" fill="url(#grid)" />

        <line x1="0" x2="100" y1={y(live)} y2={y(live)} stroke="#00c987" strokeDasharray="1 1" strokeWidth=".15" />

        {candles.map((c, i) => {
          const x = i * cw + cw / 2;
          const up = c.close >= c.open;
          const top = y(Math.max(c.open, c.close));
          const bottom = y(Math.min(c.open, c.close));
          return (
            <g key={i}>
              <line x1={x} x2={x} y1={y(c.high)} y2={y(c.low)} stroke={up ? "#00d3a0" : "#ff4057"} strokeWidth=".16" />
              <rect
                x={x - cw * 0.24}
                y={top}
                width={cw * 0.48}
                height={Math.max(1.2, bottom - top)}
                fill={up ? "#00d3a0" : "#ff4057"}
              />
              <rect
                x={x - cw * 0.35}
                y={210 - Math.random() * 35}
                width={cw * 0.2}
                height={20 + Math.random() * 20}
                fill={up ? "rgba(0,211,160,.45)" : "rgba(255,64,87,.45)"}
              />
            </g>
          );
        })}
      </svg>

      <div className="priceTag">{live.toFixed(5)}</div>
      <div className="volumeTag">126</div>
    </div>
  );
}

function MtInput({ label, value }) {
  return (
    <label className="mtInput">
      <span>{label}</span>
      <div>
        <strong>{value}</strong>
        <button>−</button>
        <button>+</button>
      </div>
    </label>
  );
}

function TradePage({
  prices,
  live,
  lastDigit,
  digitStats,
  tradeType,
  setTradeType,
  stake,
  setStake,
  duration,
  setDuration,
  prediction,
  setPrediction,
  contractActions,
  payoutRate,
  buyBinary,
}) {
  const actions = contractActions(tradeType);

  return (
    <div className="page tradePage">
      <section className="tradeTypes">
        <span>Trade Type</span>
        {["Even/Odd", "Matches/Differs", "Over/Under", "Rise/Fall", "Touch/No Touch"].map((x) => (
          <button key={x} className={tradeType === x ? "active" : ""} onClick={() => setTradeType(x)}>{x}</button>
        ))}
      </section>

      <section className="binaryPanel">
        <div className="binaryHeader">
          <div>
            <strong>Volatility 100 (1s) Index</strong>
            <small>{(live * 800).toFixed(2)} · LIVE</small>
          </div>
          <button>1s⌄</button>
        </div>

        <LineChart data={prices.map((x) => x * 800)} />

        <h3>Last Digits</h3>

        <div className="digits">
          {digitStats.map((p, d) => (
            <button
              key={d}
              className={`${d === lastDigit ? "hot" : ""} ${d === prediction ? "picked" : ""}`}
              onClick={() => setPrediction(d)}
            >
              <strong>{d}</strong>
              <span>{p.toFixed(1)}%</span>
            </button>
          ))}
        </div>
      </section>

      <section className="binaryOrder">
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

        <div className="binaryButtons">
          {actions.map((a, i) => (
            <button key={a} className={i === 0 ? "greenButton" : "redButton"} onClick={() => buyBinary(a)}>
              <strong>{a}</strong>
              <span>Payout {money(stake * payoutRate(tradeType, a))} USD</span>
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
      .map((v, i) => {
        const x = (i / (data.length - 1)) * 100;
        const y = 62 - ((v - min) / range) * 55;
        return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ");
  }, [data]);

  return (
    <div className="lineChart">
      <svg viewBox="0 0 100 65" preserveAspectRatio="none">
        <path d={`${path} L100,65 L0,65 Z`} className="area" />
        <path d={path} className="line" />
      </svg>
    </div>
  );
}

function BotsPage({ bots, startBot }) {
  return (
    <div className="page botsPage">
      <section className="botsTop">
        <div>
          <h2>My Bots</h2>
          <p>Create, manage and monitor your trading bots.</p>
        </div>
        <button>+ New Bot</button>
      </section>

      <section className="botStats">
        <Stat title="12" text="Total Bots" />
        <Stat title="5" text="Running" />
        <Stat title="3" text="Stopped" />
        <Stat title="4" text="Completed" />
      </section>

      <section className="botList">
        {bots.map((b) => (
          <div className="botCard" key={b.id}>
            <div className="botMain">
              <div>{b.code}</div>
              <section>
                <strong>{b.name}</strong>
                <span>{b.contract} · {b.market}</span>
                <small>Stake: {money(b.stake)} USD · Duration: {b.duration}s</small>
              </section>
              <em className={b.status === "Running" ? "greenBg" : b.status === "Completed" ? "blueBg" : "orangeBg"}>{b.status}</em>
            </div>

            <div className="botData">
              <p><span>Total Profit</span><b className={b.profit >= 0 ? "green" : "red"}>{b.profit >= 0 ? "+" : ""}{money(b.profit)}</b></p>
              <p><span>Win Rate</span><b>{b.winRate}%</b></p>
              <p><span>Trades</span><b>{Math.round(b.winRate / 2)}</b></p>
              <button onClick={() => startBot(b)}>{b.status === "Running" ? "View Details" : "Start Bot"}</button>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

function BotLivePage({ bot, botRunning, startBot, stopBot, botTab, setBotTab, openTrades, closedTrades, transactions, back }) {
  const pl = closedTrades.reduce((s, t) => s + (t.won ? t.profit : -t.stake), 0);
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
    <div className="page botLive">
      <div className="botLiveTop">
        <button onClick={back}>‹ Back to Bot</button>
        <strong>{bot.name}</strong>
      </div>

      <section className="runner">
        <button className={botRunning ? "stopRun" : "startRun"} onClick={botRunning ? stopBot : () => startBot(bot)}>
          {botRunning ? "■ Stop" : "▶ Run"}
        </button>
        <div>
          <strong>{botRunning ? "Contract bought" : "Bot is not running"}</strong>
          <span><i></i></span>
        </div>
      </section>

      <section className="runnerTabs">
        {["summary", "transactions", "journal"].map((x) => (
          <button key={x} className={botTab === x ? "active" : ""} onClick={() => setBotTab(x)}>{x}</button>
        ))}
      </section>

      <section className="runnerBody">
        {botTab === "summary" && (
          <div className={last?.won ? "result won" : last ? "result lost" : "result"}>
            <strong>{openTrades[0] ? "Contract bought" : last ? "Closed" : "Ready"}</strong>
            <h2>
              {last ? `${last.won ? "+" : "-"}${money(last.won ? last.profit : last.stake)} USD` : "Hit Run"}
            </h2>
          </div>
        )}

        {botTab === "transactions" && (
          <div className="runnerTable">
            {[...openTrades, ...closedTrades].slice(0, 6).map((t) => (
              <p key={t.id}>
                <span>{t.contract} · {t.action}</span>
                <b className={t.won ? "green" : t.status === "RUNNING" ? "" : "red"}>
                  {t.status === "RUNNING" ? "Running" : `${t.won ? "+" : "-"}${money(t.won ? t.profit : t.stake)}`}
                </b>
              </p>
            ))}
          </div>
        )}

        {botTab === "journal" && (
          <div className="runnerTable">
            {transactions.slice(0, 6).map((t) => (
              <p key={t.id}>
                <span>{t.type}</span>
                <small>{t.time}</small>
              </p>
            ))}
          </div>
        )}
      </section>

      <section className="botLiveStats">
        <Stat title={closedTrades.length} text="Runs" />
        <Stat title={closedTrades.filter((x) => x.won).length} text="Won" />
        <Stat title={closedTrades.filter((x) => !x.won).length} text="Lost" />
        <Stat title={`${pl >= 0 ? "+" : ""}${money(pl)}`} text="P/L" />
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
          <h2>{user.name} <span>✓</span></h2>
          <p>{user.email}</p>
          <b>Verified</b>
          <small>Account ID: {user.brokerId}</small>
        </div>
      </section>

      <section className="profileStats">
        <Stat title={`${money(balances.real)} USD`} text="Real Balance" />
        <Stat title={`${money(balances.demo)} USD`} text="Demo Balance" />
        <Stat title="+2,450.75" text="Total Profit" />
        <Stat title="63.25%" text="Win Rate" />
      </section>

      <section className="profileGrid">
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

      <section className="settingsCard">
        <h2>Platform Preferences</h2>

        <label>
          Default Account
          <select value={account} onChange={(e) => setAccount(e.target.value)}>
            <option value="demo">Demo Account</option>
            <option value="real">Real Account</option>
          </select>
        </label>

        <label>
          Default Trade Type
          <select value={tradeType} onChange={(e) => setTradeType(e.target.value)}>
            <option>Even/Odd</option>
            <option>Matches/Differs</option>
            <option>Over/Under</option>
            <option>Rise/Fall</option>
            <option>Touch/No Touch</option>
          </select>
        </label>

        <label>
          Default Stake
          <div className="stakeBox">
            <button onClick={() => setStake((x) => Math.max(0.3, Number(x) - 1))}>−</button>
            <strong>{money(stake)}</strong>
            <button onClick={() => setStake((x) => Number(x) + 1)}>+</button>
          </div>
        </label>

        <div className="toggles">
          {["Confirm before trading", "Quick Trade", "Sound Alerts", "Compact Mode"].map((x) => (
            <p key={x}><span>{x}</span><b></b></p>
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
        {transactions.slice(0, 12).map((t) => (
          <div key={t.id}>
            <span><strong>{t.type}</strong><small>{t.time}</small></span>
            <b className={t.amount >= 0 ? "green" : "red"}>{t.amount >= 0 ? "+" : ""}{money(t.amount)} USD</b>
          </div>
        ))}
      </section>
    </div>
  );
}

function ReportsPage({ transactions, closedTrades }) {
  const wins = closedTrades.filter((x) => x.won).length;
  const losses = closedTrades.filter((x) => !x.won).length;

  return (
    <div className="page listPage">
      <h1>Reports</h1>
      <section className="stats">
        <Stat title={transactions.length} text="Transactions" />
        <Stat title={wins} text="Wins" />
        <Stat title={losses} text="Losses" />
        <Stat title={wins + losses ? `${Math.round((wins / (wins + losses)) * 100)}%` : "0%"} text="Win Rate" />
      </section>
    </div>
  );
}

function Stat({ title, text }) {
  return (
    <div className="stat">
      <strong>{title}</strong>
      <span>{text}</span>
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
      {items.map(([key, name, icon]) => (
        <button key={key} className={activePage === key ? "active" : ""} onClick={() => setActivePage(key)}>
          <span>{icon}</span>
          <small>{name}</small>
        </button>
      ))}
    </nav>
  );
}

function SideMenu({ user, account, setAccount, balance, close, setActivePage, openDeposit, openWithdraw, logout }) {
  function go(page) {
    setActivePage(page);
    close();
  }

  return (
    <div className="menuLayer">
      <button className="shade" onClick={close}></button>

      <aside className="drawer">
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
            <DrawerBtn icon="⌂" label="Trader’s Hub" onClick={() => go("home")} />
            <DrawerBtn icon="▥" label="Markets" onClick={() => go("forex")} />
            <DrawerBtn icon="↕" label="Trade" onClick={() => go("trade")} />
          </DrawerBlock>

          <DrawerBlock title="FUNDS">
            <DrawerBtn icon="▱" label="Cashier / Deposit" onClick={() => { openDeposit(); close(); }} />
            <DrawerBtn icon="⇧" label="Withdraw" onClick={() => { openWithdraw(); close(); }} />
            <DrawerBtn icon="↺" label="History" onClick={() => go("history")} />
          </DrawerBlock>

          <DrawerBlock title="AUTOMATION">
            <DrawerBtn icon="🤖" label="My Bots" onClick={() => go("bots")} />
            <DrawerBtn icon="▶" label="Running Bots" onClick={() => go("botLive")} />
            <DrawerBtn icon="▣" label="Reports" onClick={() => go("reports")} />
          </DrawerBlock>

          <DrawerBlock title="ACCOUNT">
            <DrawerBtn icon="♙" label="Profile" onClick={() => go("profile")} />
            <DrawerBtn icon="⚙" label="Settings" onClick={() => go("settings")} />
            <DrawerBtn icon="🔔" label="Notifications" badge="3" onClick={() => go("settings")} />
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

function DrawerBtn({ icon, label, badge, onClick }) {
  return (
    <button className="drawerBtn" onClick={onClick}>
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
        <button className="x" onClick={close}>×</button>

        {!method ? (
          <>
            <h2>Deposit Funds</h2>
            <p>Choose payment method</p>
            <PayBtn icon="📱" title="M-Pesa" text="Instant mobile money" onClick={() => setMethod("mpesa")} />
            <PayBtn icon="💳" title="Credit/Debit Card" text="Visa, Mastercard" onClick={() => setMethod("card")} />
            <PayBtn icon="₿" title="USDT (TRC20)" text="Cryptocurrency" onClick={() => setMethod("usdt")} />
          </>
        ) : (
          <>
            <button className="back" onClick={() => setMethod("")}>‹ Back</button>
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

function PayBtn({ icon, title, text, onClick }) {
  return (
    <button className="payBtn" onClick={onClick}>
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
        <button className="x" onClick={close}>×</button>
        <h2>Withdraw Funds</h2>
        <p>Minimum withdrawal is $5.</p>

        <label>Amount USD</label>
        <input type="number" min="5" value={amountUsd} onChange={(e) => setAmountUsd(e.target.value)} />

        <label>M-Pesa Phone</label>
        <input placeholder="07XXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} />

        <button className="modalPrimary" onClick={() => submit({ amountUsd, phone })}>Request Withdrawal</button>
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