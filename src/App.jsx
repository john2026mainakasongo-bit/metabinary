
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
  referral: "mb_referral_profile",
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

  return Array.from({ length: 120 }, (_, i) => {
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
  const [referral, setReferral] = useState(() => readStore(STORE.referral, null));

  const livePrice = prices[prices.length - 1] || 1.08564;
  const balance = balances[account] || 0;

  useEffect(() => saveStore(STORE.user, user), [user]);
  useEffect(() => saveStore(STORE.account, account), [account]);
  useEffect(() => saveStore(STORE.balances, balances), [balances]);
  useEffect(() => saveStore(STORE.positions, positions), [positions]);
  useEffect(() => saveStore(STORE.closed, closedPositions), [closedPositions]);
  useEffect(() => saveStore(STORE.tx, transactions), [transactions]);
  useEffect(() => saveStore(STORE.referral, referral), [referral]);

  useEffect(() => {
    const timer = setInterval(() => {
      setPrices((old) => {
        const last = old[old.length - 1] || 1.08564;
        const next = Number(
          (
            last +
            (Math.random() - 0.5) * 0.0006 +
            Math.sin(Date.now() / 7000) * 0.00006
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
  }, [botRunning, selectedBot, account, balances]);

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

  function applyReferralProgram() {
    const baseName = String(user?.name || user?.email || "metabinary")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 12);

    const code = `MB-${baseName || "user"}-${String(user?.brokerId || "000000").slice(-4)}`.toUpperCase();

    const profile = {
      status: "approved",
      code,
      link: `https://metabinary.com/ref/${code}`,
      commissionRate: 30,
      totalEarned: referral?.totalEarned || 0,
      totalReferrals: referral?.totalReferrals || 0,
      appliedAt: new Date().toLocaleString(),
    };

    setReferral(profile);

    addTx({
      type: "Referral application approved",
      method: "Referral",
      account,
      amount: 0,
      status: "Approved",
      details: code,
    });

    notify("win", "Referral link created", "You can now invite traders and earn commissions.");
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
    const lots = Number(volume);
    const leverageValue = Number(String(leverage).split(":")[1] || 100);
    const openPrice =
      side === "Buy"
        ? Number((livePrice + 0.00002).toFixed(5))
        : Number((livePrice - 0.00002).toFixed(5));

    if (!Number.isFinite(lots) || lots < 0.01 || lots > 10) {
      notify("loss", "Invalid volume", "Volume must be between 0.01 and 10 lots.");
      return false;
    }

    const accountPositions = positions.filter((p) => p.account === account);
    if (accountPositions.length >= 10) {
      notify("loss", "Position limit", "Close an open position before placing another order.");
      return false;
    }

    const floatingPl = accountPositions.reduce((sum, p) => sum + Number(p.pl || 0), 0);
    const usedMargin = accountPositions.reduce((sum, p) => sum + Number(p.margin || 0), 0);
    const requiredMargin = Number(((openPrice * 100000 * lots) / leverageValue).toFixed(2));
    const freeMargin = Number((balance + floatingPl - usedMargin).toFixed(2));

    if (requiredMargin > freeMargin) {
      notify(
        "loss",
        "Insufficient margin",
        `Required ${money(requiredMargin)} USD · Free ${money(Math.max(0, freeMargin))} USD`
      );
      return false;
    }

    const sl = Number(stopLoss);
    const tp = Number(takeProfit);

    if (!Number.isFinite(sl) || !Number.isFinite(tp) || sl <= 0 || tp <= 0) {
      notify("loss", "Invalid protection", "Enter valid Stop Loss and Take Profit prices.");
      return false;
    }

    const validProtection =
      side === "Buy" ? sl < openPrice && tp > openPrice : sl > openPrice && tp < openPrice;

    if (!validProtection) {
      notify(
        "loss",
        "Check SL and TP",
        side === "Buy"
          ? "For Buy: Stop Loss must be below price and Take Profit above price."
          : "For Sell: Stop Loss must be above price and Take Profit below price."
      );
      return false;
    }

    const position = {
      id: uid(),
      account,
      instrument: symbol,
      side,
      volume: lots,
      leverage,
      margin: requiredMargin,
      openPrice,
      currentPrice: livePrice,
      stopLoss: sl,
      takeProfit: tp,
      pl: 0,
      plPercent: 0,
      openedAt: new Date().toLocaleTimeString(),
    };

    setPositions((old) => [position, ...old].slice(0, 40));

    addTx({
      type: `${side} ${symbol}`,
      method: "Forex",
      account,
      amount: 0,
      status: "Open",
      details: `${position.volume} lot · Margin ${money(requiredMargin)} USD`,
    });

    notify(
      "open",
      `${side} order placed`,
      `${symbol} · ${position.volume} lot · ${money(requiredMargin)} USD margin`
    );

    return true;
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

  function closeAllPositions(filter = {}) {
    positions
      .filter((p) => {
        if (filter.account && p.account !== filter.account) return false;
        if (filter.instrument && p.instrument !== filter.instrument) return false;
        return true;
      })
      .forEach((p) => closePosition(p.id));
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
            account={account}
            balance={balance}
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
            account={account}
            balances={balances}
            transactions={transactions}
            referral={referral}
            applyReferralProgram={applyReferralProgram}
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
    <div className="logo brokerLogo">
      <div className="brokerLogoMark">
        <span>M</span>
      </div>

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
  const isReal = account === "real";

  return (
    <header className="topHeader brokerTopHeader">
      <button className="menuBtn brokerMenuBtn" onClick={openMenu} aria-label="Open menu">
        <span></span>
        <span></span>
        <span></span>
      </button>

      <Logo />

      <div className="brokerHeaderDivider"></div>

      <button className="walletBox brokerWallet" onClick={() => setActivePage("profile")}>
        <small>
          {isReal ? "LIVE ACCOUNT" : "DEMO ACCOUNT"}
          <i></i>
        </small>

        <strong>
          {isReal && <span className="usdFlag">USD</span>}
          {money(balance)} <em>USD</em>
        </strong>
      </button>

      <div className="accountSwitch brokerAccountSwitch" aria-label="Account type">
        <button
          type="button"
          className={account === "demo" ? "active demoActive" : ""}
          onClick={() => setAccount("demo")}
          aria-pressed={account === "demo"}
        >
          Demo
        </button>

        <button
          type="button"
          className={account === "real" ? "active realActive" : ""}
          onClick={() => setAccount("real")}
          aria-pressed={account === "real"}
        >
          <span>🛡</span> Real
        </button>
      </div>

      <button
        type="button"
        className="depositTop brokerDepositBtn"
        onClick={openDeposit}
        aria-label="Deposit funds"
      >
        <span>Deposit</span>
        <b>＋</b>
      </button>

      <button type="button" className="bellBtn brokerBellBtn" aria-label="Notifications">
        <i>🔔</i>
        <b>3</b>
      </button>

      <button className="avatarBtn brokerAvatarBtn" onClick={() => setActivePage("profile")}>
        {user.initials}
        <i></i>
        <span>⌄</span>
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

            <p>Advanced algorithms analyze market patterns in real-time to deliver smarter trade signals.</p>

            <button onClick={() => setActivePage("bots")}>Explore AI Tools →</button>
          </div>
        </div>

        <div className="quickActions">
          <h3>Quick Actions</h3>

          <div>
            <button onClick={() => setActivePage("trade")}>
              📉<span>New Trade</span>
            </button>

            <button onClick={() => setActivePage("bots")}>
              🧠<span>AI Signals</span>
            </button>

            <button onClick={() => setActivePage("reports")}>
              📄<span>Reports</span>
            </button>

            <button onClick={() => setActivePage("history")}>
              🗓<span>History</span>
            </button>
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
              <span>
                {icon} {pair}
              </span>
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
    type === "green"
      ? "#00e884"
      : type === "purple"
      ? "#a855f7"
      : type === "yellow"
      ? "#ffa800"
      : type === "red"
      ? "#ff4057"
      : "#008cff";

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
  account,
  balance,
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
  const [tradesOpen, setTradesOpen] = useState(false);
  const [orderBusy, setOrderBusy] = useState(false);

  const visiblePositions = positions.filter(
    (p) => p.instrument === symbol && p.account === account
  );
  const profitCount = visiblePositions.filter((p) => p.pl >= 0).length;
  const lossCount = visiblePositions.filter((p) => p.pl < 0).length;

  const rows =
    tab === "profit"
      ? visiblePositions.filter((p) => p.pl >= 0)
      : tab === "loss"
      ? visiblePositions.filter((p) => p.pl < 0)
      : tab === "closed"
      ? closedPositions.filter((p) => p.instrument === symbol && p.account === account)
      : visiblePositions;

  const floatingPl = visiblePositions.reduce((sum, p) => sum + Number(p.pl || 0), 0);
  const usedMargin = visiblePositions.reduce((sum, p) => sum + Number(p.margin || 0), 0);
  const freeMargin = Math.max(0, Number(balance || 0) + floatingPl - usedMargin);

  function order(side) {
    if (orderBusy) return;

    const normalizedStopLoss =
      side === "Buy"
        ? Math.min(Number(stopLoss), livePrice - 0.0001)
        : Math.max(Number(stopLoss), livePrice + 0.0001);

    const normalizedTakeProfit =
      side === "Buy"
        ? Math.max(Number(takeProfit), livePrice + 0.0001)
        : Math.min(Number(takeProfit), livePrice - 0.0001);

    setStopLoss(Number(normalizedStopLoss.toFixed(5)));
    setTakeProfit(Number(normalizedTakeProfit.toFixed(5)));
    setOrderBusy(true);

    const placed = placeForexOrder({
      side,
      symbol,
      volume,
      leverage,
      stopLoss: normalizedStopLoss,
      takeProfit: normalizedTakeProfit,
    });

    if (placed) setTradesOpen(true);
    window.setTimeout(() => setOrderBusy(false), 700);
  }

  return (
    <div className="page forexPage forexPublishPage">
      <HubNav active="Forex" setActivePage={setActivePage} openDeposit={openDeposit} />

      <section className="forexSymbolBar forexMarketCard">
        <button className="marketBack">‹</button>

        <label className="symbolPicker">
          <span>★</span>
          <select value={symbol} onChange={(e) => setSymbol(e.target.value)}>
            {MARKETS.map((market) => (
              <option key={market}>{market}</option>
            ))}
          </select>
        </label>

        <div className="marketNameBlock">
          <strong>{symbol}</strong>
          <small>Live TradingView market</small>
        </div>

        <div className="marketPriceBlock">
          <strong>{livePrice.toFixed(5)}</strong>
          <small>+0.00231 (+0.21%) ▲</small>
        </div>

        <div className="marketHighLow">
          <p><span>High</span><b>1.09143</b></p>
          <p><span>Low</span><b>1.08612</b></p>
        </div>

        <button className="marketInfoBtn">ⓘ Market Info</button>
      </section>

      <section className="forexToolbar forexProToolbar">
        {['1m', '5m', '15m', '1h', '4h', '1D'].map((item, index) => (
          <button key={item} className={index === 0 ? 'active' : ''}>{item}</button>
        ))}
        <button>⌄</button>
        <button>↗ Indicators</button>
        <button>⌗</button>
        <button>▥</button>
        <button>ƒx</button>
        <button>⛶</button>
      </section>

      <section className="proChartPanel forexBigChart">
        <CandleChart
          symbol={symbol}
          prices={prices}
          livePrice={livePrice}
          positions={visiblePositions}
          showLines={showLines}
        />
      </section>

      <button className="openTradesFloatingBtn" onClick={() => setTradesOpen((x) => !x)}>
        <span>Open Trades</span>
        <b>{visiblePositions.length}</b>
        <em>{tradesOpen ? '⌄' : '⌃'}</em>
      </button>

      <section className="proOrderPanel forexOrderCard">
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

        <div className="buySellBox buySellProBox">
          <button
            type="button"
            className="buyLarge"
            onClick={() => order("Buy")}
            disabled={orderBusy}
          >
            <b>{orderBusy ? "Placing…" : "Buy ↗"}</b>
            <strong>{livePrice.toFixed(5)}</strong>
            <MiniSpark type="green" />
          </button>

          <button
            type="button"
            className="sellLarge"
            onClick={() => order("Sell")}
            disabled={orderBusy}
          >
            <b>{orderBusy ? "Placing…" : "Sell ↘"}</b>
            <strong>{(livePrice - 0.00012).toFixed(5)}</strong>
            <MiniSpark type="red" />
          </button>
        </div>

        <div className="spreadStats compactSpreadStats">
          <p><span>Balance</span><b>{money(balance)} USD</b></p>
          <p><span>Free margin</span><b>{money(freeMargin)} USD</b></p>
          <p><span>Used margin</span><b>{money(usedMargin)} USD</b></p>
          <p><span>Floating P/L</span><b className={floatingPl >= 0 ? "green" : "red"}>{floatingPl >= 0 ? "+" : ""}{money(floatingPl)} USD</b></p>
        </div>
      </section>

      <section className={`tradeManager openTradesPanel ${tradesOpen ? 'open' : ''}`}>
        <div className="managerTabs">
          <button className={tab === 'open' ? 'active' : ''} onClick={() => setTab('open')}>
            Open Trades <b>{visiblePositions.length}</b>
          </button>

          <button className={tab === 'profit' ? 'active' : ''} onClick={() => setTab('profit')}>
            Winning <b>{profitCount}</b>
          </button>

          <button className={tab === 'loss' ? 'active' : ''} onClick={() => setTab('loss')}>
            Losing <b>{lossCount}</b>
          </button>

          <button className={tab === 'closed' ? 'active' : ''} onClick={() => setTab('closed')}>
            History
          </button>

          <label>
            <input checked={showLines} onChange={(e) => setShowLines(e.target.checked)} type="checkbox" />
            Lines
          </label>

          <button className="closeAll" onClick={() => closeAllPositions({ account, instrument: symbol })}>Close All</button>
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
              <strong className="tradeCell tradeInstrument" data-label="Instrument">{p.instrument}</strong>
              <b className={`tradeCell ${p.side === "Buy" ? "buyTag" : "sellTag"}`} data-label="Type">{p.side}</b>
              <span className="tradeCell" data-label="Volume">{p.volume}</span>
              <span className="tradeCell" data-label="Open Price">{Number(p.openPrice).toFixed(5)}</span>
              <span className="tradeCell" data-label="Current Price">{Number(p.currentPrice || p.openPrice).toFixed(5)}</span>

              <span className="tradeCell editableTradeCell" data-label="Stop Loss">
                {tab === "closed" ? (
                  Number(p.stopLoss).toFixed(5)
                ) : (
                  <input
                    aria-label="Stop Loss"
                    value={p.stopLoss}
                    onChange={(e) => updatePosition(p.id, { stopLoss: Number(e.target.value) })}
                  />
                )}
              </span>

              <span className="tradeCell editableTradeCell" data-label="Take Profit">
                {tab === "closed" ? (
                  Number(p.takeProfit).toFixed(5)
                ) : (
                  <input
                    aria-label="Take Profit"
                    value={p.takeProfit}
                    onChange={(e) => updatePosition(p.id, { takeProfit: Number(e.target.value) })}
                  />
                )}
              </span>

              <em className={`tradeCell ${p.pl >= 0 ? "green" : "red"}`} data-label="P/L">
                {p.pl >= 0 ? "+" : ""}{money(p.pl)} USD
              </em>

              <span className="tradeCell tradeAction" data-label="Action">
                {tab === "closed" ? <span>Closed</span> : <button onClick={() => closePosition(p.id)}>Close</button>}
              </span>
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
        <button type="button" onClick={dec}>
          −
        </button>
        <button type="button" onClick={inc}>
          +
        </button>
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

  const levels = [livePrice, ...positions.flatMap((p) => [p.openPrice, p.stopLoss, p.takeProfit])].filter(Boolean);

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

        <line x1="0" x2="100" y1={y(livePrice)} y2={y(livePrice)} stroke="#00d3a0" strokeDasharray="1 1.5" strokeWidth=".16" />

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

              <rect x={x - step * 0.23} y={top} width={step * 0.46} height={Math.max(1.2, bottom - top)} fill={color} />

              <rect x={x - step * 0.18} y={224 + Math.random() * 10} width={step * 0.36} height={12 + Math.random() * 22} fill={up ? "rgba(0,211,160,.42)" : "rgba(255,64,87,.42)"} />
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
  const indexValue = livePrice * 800;
  const payoutOne = money(stake * payoutRate(tradeType, actions[0]));
  const payoutTwo = money(stake * payoutRate(tradeType, actions[1]));

  const marketStats = [
    {
      title: "Market Status",
      value: "Open",
      text: "Trading is active",
      icon: "●",
      className: "statusGreen",
    },
    {
      title: "Current Index",
      value: indexValue.toFixed(2),
      text: "Volatility 100 (1s) Index",
      icon: "▥",
      className: "statusBlue",
    },
    {
      title: "24h High",
      value: (indexValue + 4.79).toFixed(2),
      text: "Highest index today",
      icon: "↗",
      className: "statusGreen",
    },
    {
      title: "24h Low",
      value: (indexValue - 8.46).toFixed(2),
      text: "Lowest index today",
      icon: "↘",
      className: "statusRed",
    },
    {
      title: "24h Change",
      value: "+1.45%",
      text: "+12.42 points",
      icon: "▮▮▮",
      className: "statusBlue",
    },
    {
      title: "Trend",
      value: "Bullish",
      text: "Strong uptrend",
      icon: "⬟",
      className: "statusGreen",
    },
  ];

  return (
    <div className="page tradePage tradePagePro">
      <section className="proTradeTypeRow">
        <span>Trade Type</span>

        {["Even/Odd", "Matches/Differs", "Over/Under", "Rise/Fall", "Touch/No Touch"].map((type) => (
          <button key={type} className={tradeType === type ? "active" : ""} onClick={() => setTradeType(type)}>
            {type}
          </button>
        ))}
      </section>

      <section className="proTradeChartCard">
        <div className="proChartTitle">
          <div>
            <h2>Volatility 100 (1s) Index</h2>
            <p>{indexValue.toFixed(2)} · LIVE</p>
          </div>

          <strong>▲ 12.42 (1.45%)</strong>

          <button>{duration}s⌄</button>
          <button>⛶</button>
        </div>

        <div className="proChartArea">
          <div className="priceScale">
            <span>{(indexValue + 1.37).toFixed(2)}</span>
            <span>{(indexValue - 0.63).toFixed(2)}</span>
            <span>{(indexValue - 2.63).toFixed(2)}</span>
            <span>{(indexValue - 4.63).toFixed(2)}</span>
            <span>{(indexValue - 6.63).toFixed(2)}</span>
          </div>

          <div className="proChartCanvas">
            <LineChart data={prices.map((x) => x * 800)} />

            <div className="worldMapGlow"></div>

            <div className="chartLivePrice">● {indexValue.toFixed(2)}</div>
          </div>
        </div>

        <div className="chartTimeRow">
          <span>10:45:30</span>
          <span>10:47:00</span>
          <span>10:48:30</span>
          <span>10:50:00</span>
          <span>10:51:30</span>
        </div>

        <div className="chartToolRow">
          <button>⌁</button>
          <button>▥</button>
          <button>▱</button>
          <button>⛶</button>
        </div>
      </section>

      <section className="proDigitsCard">
        <h3>Last Digits</h3>

        <div className="proDigitsGrid">
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

      <section className="proBinaryOrderCard">
        <div className="orderInputsTop">
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
            <div className="proStakeBox">
              <button onClick={() => setStake((x) => Math.max(0.3, Number(x) - 1))}>−</button>
              <strong>{money(stake)}</strong>
              <button onClick={() => setStake((x) => Number(x) + 1)}>+</button>
            </div>
          </label>
        </div>

        <div className="proTradeButtons">
          <button className="proGreenTrade" onClick={() => runBinaryTrade(tradeType, actions[0])}>
            <span>{actions[0] === "Even" ? "⌂" : "↗"}</span>

            <div>
              <strong>{actions[0]}</strong>
              <small>Payout {payoutOne} USD</small>
            </div>
          </button>

          <button className="proRedTrade" onClick={() => runBinaryTrade(tradeType, actions[1])}>
            <span>{actions[1] === "Odd" ? "↓" : "↘"}</span>

            <div>
              <strong>{actions[1]}</strong>
              <small>Payout {payoutTwo} USD</small>
            </div>
          </button>
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
              <p>
                {bot.type} · {bot.market}
              </p>
              <small>
                Stake: {money(bot.stake)} USD · Duration: {bot.duration}s
              </small>
            </div>

            <b className={bot.status === "Running" ? "botStatus running" : "botStatus stopped"}>{bot.status}</b>

            <div className="botGraph">
              <BotLine positive={bot.profit >= 0} />
            </div>

            <div className="botMetrics">
              <p>
                <span>Total Profit</span>
                <strong className={bot.profit >= 0 ? "green" : "red"}>
                  {bot.profit >= 0 ? "+" : ""}
                  {money(bot.profit)} USD
                </strong>
              </p>

              <p>
                <span>Win Rate</span>
                <strong>{bot.winRate}%</strong>
              </p>

              <p>
                <span>Trades</span>
                <strong>{bot.trades}</strong>
              </p>
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
          <span>
            <i></i>
          </span>
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
                <span>
                  {trade.type} · {trade.action}
                </span>

                <b className={trade.won ? "green" : "red"}>
                  {trade.won ? "+" : "-"}
                  {money(trade.won ? trade.profit : trade.stake)}
                </b>
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

function ProfilePage({ user, account, balances, transactions, referral, applyReferralProgram, logout, setActivePage }) {
  const realBalance = balances?.real || 0;
  const demoBalance = balances?.demo || 10000;
  const accountId = user?.brokerId || "MB168844";
  const userName = user?.name || user?.email?.split("@")[0] || "captionfitness";
  const userEmail = user?.email || "captionfitness@gmail.com";
  const userInitial = user?.initials || initials(userName);
  const referralCode = referral?.code || "";
  const referralLink = referral?.link || "";
  const referralApproved = referral?.status === "approved";
  const referralEarned = referral?.totalEarned || 0;
  const referralCount = referral?.totalReferrals || 0;
  const accountLabel = account === "real" ? "Real Account" : "Demo Account";
  const tradeTransactions = (transactions || []).filter(
    (tx) => ["Manual", "Bot", "Forex"].includes(tx.method) && Number(tx.amount) !== 0
  );
  const totalProfit = tradeTransactions.reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const winningTrades = tradeTransactions.filter((tx) => Number(tx.amount) > 0).length;
  const winRate = tradeTransactions.length
    ? (winningTrades / tradeTransactions.length) * 100
    : 0;

  const profileCards = [
    {
      icon: "⚙",
      title: "Settings",
      text: "Manage your preferences and platform settings",
      button: "Customize",
      color: "blue",
      action: () => setActivePage("settings"),
    },
    {
      icon: "↺",
      title: "Transaction History",
      text: "View deposits, withdrawals and trading history",
      button: "View History",
      color: "purple",
      action: () => setActivePage("history"),
    },
    {
      icon: "🛡",
      title: "KYC Verification",
      text: "Verify your identity to unlock all platform features",
      button: user?.verified ? "Verified ✓" : "Start Verification",
      color: "green",
      action: () => {},
    },
    {
      icon: "💳",
      title: "Payment Methods",
      text: "Manage your deposit and withdrawal methods",
      button: "Manage Methods",
      color: "blue",
      action: () => setActivePage("history"),
    },
    {
      icon: "🔒",
      title: "Security",
      text: "Password, 2FA and account security settings",
      button: "Security Center",
      color: "green",
      action: () => setActivePage("settings"),
    },
    {
      icon: "🔔",
      title: "Notifications",
      text: "Manage email, SMS and push notifications",
      button: "Manage Alerts",
      color: "yellow",
      action: () => setActivePage("settings"),
    },
  ];

  return (
    <div className="page profilePage proProfilePage">
      <section className="proProfileHero">
        <div className="proProfileAvatarWrap">
          <div className="proProfileAvatar">{userInitial}</div>
          <span className="profileOnlineBadge">✓</span>
        </div>

        <div className="proProfileIdentity">
          <h1>
            {userName}
            <span>✓</span>
          </h1>

          <p>{userEmail}</p>

          <div className="profileVerifiedRow">
            <b>Verified</b>
          </div>

          <div className="profileMetaRow">
            <span>
              Account ID
              <strong>{accountId}</strong>
            </span>

            <i></i>

            <span>
              Status
              <strong className="activeStatus">● Active — {accountLabel}</strong>
            </span>
          </div>
        </div>

        <div className="profileHeroArt">
          <div className="profileArtLine"></div>
          <div className="profileArtBadge">MB</div>
        </div>
      </section>

      <section className="proProfileStats">
        <ProfileBalanceCard icon="💼" label="REAL BALANCE" value={`${money(realBalance)} USD`} color="blue" />
        <ProfileBalanceCard icon="▮▮▮" label="DEMO BALANCE" value={`${money(demoBalance)} USD`} color="purple" />
        <ProfileBalanceCard icon="📈" label="TOTAL PROFIT" value={`${totalProfit >= 0 ? "+" : ""}${money(totalProfit)} USD`} color={totalProfit >= 0 ? "green" : "red"} />
        <ProfileBalanceCard icon="◎" label="WIN RATE" value={`${winRate.toFixed(1)}%`} color="yellow" />
      </section>

      <section className="proProfileMain">
        <div className="profileCardsGrid">
          {profileCards.map((card) => (
            <button className="profileActionCard" key={card.title} onClick={card.action}>
              <div className={`profileActionIcon ${card.color}`}>{card.icon}</div>

              <div>
                <h3>{card.title}</h3>
                <p>{card.text}</p>

                <span className={card.title === "KYC Verification" ? "verifiedMiniBtn" : ""}>
                  {card.button} <em>›</em>
                </span>
              </div>
            </button>
          ))}

          <div className="supportWideCard">
            <div className="profileActionIcon blue">🎧</div>

            <div>
              <h3>Support Center</h3>
              <p>Get help from our support team 24/7</p>
            </div>

            <div className="responseTime">
              <small>Support Availability</small>
              <strong>● Online</strong>
            </div>

            <button>Contact Support ›</button>
          </div>
        </div>

        <aside className="referralPanel">
          <div className="profileActionIcon purple">👥</div>

          <h2>Referral Program</h2>
          <p>
            {referralApproved
              ? "Your referral account is active. Invite traders and earn up to 30% commission from referred deposits."
              : "Apply once to receive your personal referral link and start earning commissions."}
          </p>

          <div className={referralApproved ? "referralStatus approved" : "referralStatus pending"}>
            <b>{referralApproved ? "Approved Partner" : "Not Applied Yet"}</b>
            <span>{referralApproved ? `Code: ${referralCode}` : "Create your link in one click"}</span>
          </div>

          {referralApproved ? (
            <>
              <label>YOUR REFERRAL LINK</label>

              <div className="referralLinkBox">
                <span>{referralLink}</span>

                <button onClick={() => navigator.clipboard?.writeText(referralLink)}>⧉</button>
              </div>

              <div className="referralStatsBox">
                <div>
                  <small>TOTAL EARNED</small>
                  <strong>{money(referralEarned)} USD</strong>
                </div>

                <div>
                  <small>TOTAL REFERRALS</small>
                  <strong>{referralCount}</strong>
                </div>
              </div>

              <button className="referralDashboardBtn">View Referral Dashboard ›</button>
            </>
          ) : (
            <button className="referralApplyBtn" onClick={applyReferralProgram}>
              Apply & Get Referral Link →
            </button>
          )}
        </aside>
      </section>

      <button className="proLogoutButton" onClick={logout}>
        <span>⇥</span>

        <div>
          <strong>Logout</strong>
          <small>Sign out of your account</small>
        </div>

        <em>›</em>
      </button>
    </div>
  );
}

function ProfileBalanceCard({ icon, label, value, color }) {
  return (
    <button className="profileBalanceCard">
      <div className={`profileBalanceIcon ${color}`}>{icon}</div>

      <div>
        <span>{label}</span>
        <strong className={color === "green" ? "green" : color === "red" ? "red" : ""}>{value}</strong>
      </div>

      <em>›</em>
    </button>
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
            <p key={item}>
              <span>{item}</span>
              <b></b>
            </p>
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
    <nav className="bottomNav" aria-label="Primary navigation">
      {items.map(([key, label, icon]) => (
        <button
          key={key}
          className={activePage === key || (key === "bots" && activePage === "botLive") ? "active" : ""}
          onClick={() => setActivePage(key)}
          aria-label={label}
          aria-current={activePage === key ? "page" : undefined}
        >
          <span>{icon}</span>
          <small>{label}</small>
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
      <button className="menuShade" onClick={close} aria-label="Close menu"></button>

      <aside className="sideDrawer" role="dialog" aria-modal="true" aria-label="Main menu">
        <div className="drawerTop">
          <Logo />
          <button onClick={close}>×</button>
        </div>

        <section className="drawerAccount">
          <div className="drawerUser">
            <div>{user.initials || initials(user.name || user.email)}</div>

            <section>
              <small>{account === "demo" ? "Demo Account" : "Real Account"}</small>
              <strong>{money(balance)} USD</strong>
              <span>Account ID: {user.brokerId} ⧉</span>
            </section>
          </div>

          <div className="drawerSwitch">
            <button className={account === "demo" ? "active" : ""} onClick={() => setAccount("demo")}>
              Demo
            </button>

            <button className={account === "real" ? "active" : ""} onClick={() => setAccount("real")}>
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
      <div className="depositModal" role="dialog" aria-modal="true" aria-label="Deposit funds">
        <button className="closeModal" onClick={close} aria-label="Close dialog">
          ×
        </button>

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
            <button className="modalBack" onClick={() => setMethod("")}>
              ‹ Back
            </button>

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
      <div className="depositModal" role="dialog" aria-modal="true" aria-label="Withdraw funds">
        <button className="closeModal" onClick={close} aria-label="Close dialog">
          ×
        </button>

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