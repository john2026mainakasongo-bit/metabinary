import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const BOT_LIST = [
  {
    name: "Neon Eclipse",
    code: "EO",
    contract: "Even/Odd",
    choice: "Even",
    market: "Volatility 100 (1s)",
    stake: 10,
    duration: 5,
    winRate: 72.5,
    profit: 250.75,
    status: "Running",
  },
  {
    name: "Quantum Surge",
    code: "RF",
    contract: "Rise/Fall",
    choice: "Rise",
    market: "Volatility 75",
    stake: 15,
    duration: 5,
    winRate: 68,
    profit: 180.4,
    status: "Stopped",
  },
  {
    name: "Alpha Over",
    code: "OU",
    contract: "Over/Under",
    choice: "Over",
    market: "Volatility 100",
    stake: 10,
    duration: 5,
    winRate: 45,
    profit: -45,
    status: "Stopped",
  },
  {
    name: "Matrix Differ",
    code: "MD",
    contract: "Matches/Differs",
    choice: "Differs",
    market: "Volatility 50",
    stake: 20,
    duration: 5,
    winRate: 40,
    profit: -120,
    status: "Stopped",
  },
];

function readStore(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
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

function makeId() {
  return Date.now() + Math.random();
}

function userInitials(nameOrEmail) {
  const text = nameOrEmail || "JM";
  const parts = text.replace("@gmail.com", "").split(/[ ._-]/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export default function App() {
  const timerRef = useRef(null);

  const [user, setUser] = useState(() => readStore("metabinary_user", null));
  const [authMode, setAuthMode] = useState("login");

  const [activePage, setActivePage] = useState("home");
  const [account, setAccount] = useState(() => readStore("metabinary_account", "demo"));

  const [balances, setBalances] = useState(() =>
    readStore("metabinary_balances", {
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
    Array.from({ length: 54 }, (_, i) => 1.085 + Math.sin(i / 5) * 0.002 + Math.random() * 0.001)
  );

  const [lastDigit, setLastDigit] = useState(0);
  const [digitStats, setDigitStats] = useState(() =>
    Array.from({ length: 10 }, () => 7 + Math.random() * 6)
  );

  const [openTrades, setOpenTrades] = useState([]);
  const [closedTrades, setClosedTrades] = useState(() =>
    readStore("metabinary_closed_trades", [])
  );
  const [transactions, setTransactions] = useState(() =>
    readStore("metabinary_transactions", [])
  );

  const [forexPositions, setForexPositions] = useState(() =>
    readStore("metabinary_forex_positions", [])
  );

  const [toast, setToast] = useState(null);

  const [currentBot, setCurrentBot] = useState(null);
  const [botRunning, setBotRunning] = useState(false);
  const [botTab, setBotTab] = useState("summary");

  const livePrice = priceData[priceData.length - 1] || 1.08564;
  const balance = balances[account] || 0;

  useEffect(() => saveStore("metabinary_user", user), [user]);
  useEffect(() => saveStore("metabinary_account", account), [account]);
  useEffect(() => saveStore("metabinary_balances", balances), [balances]);
  useEffect(() => saveStore("metabinary_closed_trades", closedTrades), [closedTrades]);
  useEffect(() => saveStore("metabinary_transactions", transactions), [transactions]);
  useEffect(() => saveStore("metabinary_forex_positions", forexPositions), [forexPositions]);

  useEffect(() => {
    const timer = setInterval(() => {
      setPriceData((old) => {
        const last = old[old.length - 1] || 1.08564;
        const next = Number((last + (Math.random() - 0.48) * 0.0008).toFixed(5));
        return [...old.slice(-53), next];
      });

      setLastDigit(Math.floor(Math.random() * 10));
      setDigitStats(Array.from({ length: 10 }, () => 7 + Math.random() * 6));
    }, 800);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!user?.email) return;

    refreshBalance();
    const timer = setInterval(refreshBalance, 7000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email]);

  function notify(type, title, message) {
    setToast({ id: makeId(), type, title, message });

    setTimeout(() => {
      setToast(null);
    }, 3200);
  }

  function changeBalance(target, amount) {
    setBalances((old) => ({
      ...old,
      [target]: Number((Number(old[target] || 0) + Number(amount || 0)).toFixed(2)),
    }));
  }

  function addTransaction(item) {
    setTransactions((old) => [
      {
        id: makeId(),
        time: new Date().toLocaleString(),
        ...item,
      },
      ...old,
    ]);
  }

  async function refreshBalance() {
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
      // Backend offline. Local demo still works.
    }
  }

  function doLogin(data) {
    const nextUser = {
      name: data.email.split("@")[0],
      email: data.email,
      phone: data.phone || "",
      country: "Kenya",
      currency: "USD",
      initials: userInitials(data.email),
      brokerId: "MB" + Math.floor(100000 + Math.random() * 900000),
      verified: true,
    };

    setUser(nextUser);
    setActivePage("home");
    notify("win", "Login successful", "Welcome back to MetaBinary.");
  }

  function doRegister(data) {
    const nextUser = {
      name: `${data.firstName || "John"} ${data.lastName || "Maina"}`,
      email: data.email,
      phone: data.phone,
      country: data.country || "Kenya",
      currency: "USD",
      initials: userInitials(`${data.firstName} ${data.lastName}`),
      brokerId: "MB" + Math.floor(100000 + Math.random() * 900000),
      verified: true,
    };

    setUser(nextUser);
    setBalances({ demo: 10000, real: 0 });
    setActivePage("home");

    notify("win", "Account created", "Your demo account has $10,000.");
  }

  function logout() {
    stopBot();
    localStorage.removeItem("metabinary_user");
    setUser(null);
    setAuthMode("login");
    setMenuOpen(false);
  }

  function payoutRate(contract, choice) {
    if (contract === "Matches/Differs" && choice === "Matches") return 8.333;
    if (contract === "Matches/Differs" && choice === "Differs") return 1.087;
    if (contract === "Even/Odd") return 1.818;
    if (contract === "Over/Under") return 1.85;
    return 1.9;
  }

  function actionsFor(contract) {
    if (contract === "Even/Odd") return ["Even", "Odd"];
    if (contract === "Matches/Differs") return ["Matches", "Differs"];
    if (contract === "Over/Under") return ["Over", "Under"];
    if (contract === "Rise/Fall") return ["Rise", "Fall"];
    return ["Touch", "No Touch"];
  }

  function settle(contract, choice, pred, entry, exit) {
    const digit = Math.floor(Math.random() * 10);

    if (contract === "Even/Odd") {
      return {
        digit,
        won: choice === "Even" ? digit % 2 === 0 : digit % 2 !== 0,
      };
    }

    if (contract === "Matches/Differs") {
      return {
        digit,
        won: choice === "Matches" ? digit === pred : digit !== pred,
      };
    }

    if (contract === "Over/Under") {
      return {
        digit,
        won: choice === "Over" ? digit > pred : digit < pred,
      };
    }

    if (contract === "Rise/Fall") {
      return {
        digit,
        won: choice === "Rise" ? exit > entry : exit < entry,
      };
    }

    const touched = Math.random() > 0.5;
    return {
      digit,
      won: choice === "Touch" ? touched : !touched,
    };
  }

  function placeBinaryTrade(choice, bot = null) {
    const usedContract = bot?.contract || tradeType;
    const usedStake = Number(bot?.stake || stake || 0);
    const usedDuration = Number(bot?.duration || duration || 5);
    const usedPrediction = Number(prediction || 2);

    if (usedStake < 0.3) {
      notify("loss", "Minimum stake", "Minimum stake is $0.30.");
      return;
    }

    if (balance < usedStake) {
      notify("loss", "Low balance", `Your ${account} balance is not enough.`);
      return;
    }

    const rate = payoutRate(usedContract, choice);
    const payout = Number((usedStake * rate).toFixed(2));
    const profit = Number((payout - usedStake).toFixed(2));

    const entry = Number(livePrice.toFixed(5));

    const trade = {
      id: makeId(),
      account,
      botName: bot?.name || "",
      contract: usedContract,
      choice,
      stake: usedStake,
      payout,
      profit,
      duration: usedDuration,
      prediction: usedPrediction,
      entry,
      status: "RUNNING",
      openedAt: new Date().toLocaleTimeString(),
    };

    changeBalance(account, -usedStake);
    setOpenTrades((old) => [trade, ...old]);

    addTransaction({
      type: bot ? `${bot.name} contract bought` : "Contract bought",
      method: bot ? "Bot" : "Manual",
      account,
      amount: -usedStake,
      status: "Running",
      details: `${usedContract} · ${choice}`,
    });

    notify("open", "Trade placed", `${usedContract} · ${choice} · $${money(usedStake)}`);

    setTimeout(() => {
      const exit = Number((entry + (Math.random() - 0.48) * 0.002).toFixed(5));
      const result = settle(usedContract, choice, usedPrediction, entry, exit);

      const finished = {
        ...trade,
        exit,
        resultDigit: result.digit,
        won: result.won,
        status: result.won ? "WON" : "LOST",
        closedAt: new Date().toLocaleTimeString(),
      };

      setOpenTrades((old) => old.filter((item) => item.id !== trade.id));
      setClosedTrades((old) => [finished, ...old].slice(0, 80));

      if (finished.won) {
        changeBalance(finished.account, finished.payout);
      }

      addTransaction({
        type: finished.won ? "Profit amount" : "Loss amount",
        method: bot ? "Bot" : "Manual",
        account: finished.account,
        amount: finished.won ? finished.profit : -finished.stake,
        status: finished.status,
        details: `${finished.contract} · ${finished.choice} · digit ${finished.resultDigit}`,
      });

      notify(
        finished.won ? "win" : "loss",
        finished.won ? "Trade won" : "Trade lost",
        `${finished.choice} · digit ${finished.resultDigit} · ${
          finished.won ? "+" : "-"
        }$${money(finished.won ? finished.profit : finished.stake)}`
      );
    }, usedDuration * 1000);
  }

  function startBot(bot) {
    stopBot();

    setCurrentBot(bot);
    setBotRunning(true);
    setBotTab("summary");
    setActivePage("botLive");

    placeBinaryTrade(bot.choice, bot);

    timerRef.current = setInterval(() => {
      placeBinaryTrade(bot.choice, bot);
    }, (bot.duration + 2) * 1000);

    notify("open", `${bot.name} started`, "Bot is now running.");
  }

  function stopBot() {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
    setBotRunning(false);
  }

  function placeForexOrder(side) {
    const lot = 0.01;
    const leverage = 100;
    const contractSize = 100000;
    const price = Number(livePrice.toFixed(5));

    const spread = 0.00006;
    const entry = side === "Buy" ? price + spread : price - spread;

    // MT5-style margin formula:
    // Margin = Lot × Contract Size × Price / Leverage
    const margin = (lot * contractSize * entry) / leverage;

    // Forex pip value estimate:
    // Pip value for EUR/USD = lot × 10 USD
    const pipValue = lot * 10;

    const position = {
      id: makeId(),
      instrument: "EUR/USD",
      side,
      lot,
      leverage: `1:${leverage}`,
      entry: Number(entry.toFixed(5)),
      current: price,
      margin: Number(margin.toFixed(2)),
      pipValue: Number(pipValue.toFixed(2)),
      pl: Number(((Math.random() - 0.35) * 2.5).toFixed(2)),
      time: new Date().toLocaleTimeString(),
    };

    setForexPositions((old) => [position, ...old].slice(0, 6));

    notify("open", `${side} order placed`, `EUR/USD · ${lot} lot · margin $${money(margin)}`);
  }

  async function submitDeposit(data) {
    try {
      const body = {
        email: user.email,
        amount: Number(data.amountUsd),
        amountUsd: Number(data.amountUsd),
        phone: data.phone,
        method: data.method,
      };

      const res = await fetch(`${API_URL}/api/deposit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();

      if (!res.ok || json.ok === false) {
        throw new Error(json.message || "Deposit failed");
      }

      addTransaction({
        type: "Deposit pending",
        method: data.method,
        account: "real",
        amount: Number(data.amountUsd),
        status: "Pending",
        details: data.phone,
      });

      setAccount("real");
      setDepositOpen(false);
      notify("open", "Deposit started", "Check your phone for STK Push.");
      setTimeout(refreshBalance, 5000);
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
      notify("loss", "Low balance", "Your real account balance is not enough.");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/withdraw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user.email,
          amount,
          amountUsd: amount,
          phone: data.phone,
        }),
      });

      const json = await res.json();

      if (!res.ok || json.ok === false) {
        throw new Error(json.message || "Withdrawal failed");
      }

      changeBalance("real", -amount);

      addTransaction({
        type: "Withdrawal request",
        method: "M-Pesa",
        account: "real",
        amount: -amount,
        status: "Processing",
        details: data.phone,
      });

      setWithdrawOpen(false);
      notify("open", "Withdrawal requested", "Your request is processing.");
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
          onLogin={doLogin}
          onRegister={doRegister}
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
        balance={balance}
        setActivePage={setActivePage}
        openMenu={() => setMenuOpen(true)}
        openDeposit={() => setDepositOpen(true)}
      />

      <main className="mainScreen">
        {activePage === "home" && (
          <HomePage
            setActivePage={setActivePage}
            openDeposit={() => setDepositOpen(true)}
          />
        )}

        {activePage === "forex" && (
          <ForexPage
            priceData={priceData}
            livePrice={livePrice}
            positions={forexPositions}
            placeForexOrder={placeForexOrder}
            setActivePage={setActivePage}
            openDeposit={() => setDepositOpen(true)}
          />
        )}

        {activePage === "trade" && (
          <TradePage
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
            actionsFor={actionsFor}
            payoutRate={payoutRate}
            placeBinaryTrade={placeBinaryTrade}
          />
        )}

        {activePage === "bots" && <BotsPage bots={BOT_LIST} startBot={startBot} />}

        {activePage === "botLive" && (
          <BotLivePage
            bot={currentBot}
            botRunning={botRunning}
            stopBot={stopBot}
            startBot={startBot}
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
            setActivePage={setActivePage}
            logout={logout}
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

      {activePage !== "botLive" && (
        <BottomNav activePage={activePage} setActivePage={setActivePage} />
      )}

      {menuOpen && (
        <SideMenu
          user={user}
          account={account}
          setAccount={setAccount}
          balance={balance}
          setActivePage={setActivePage}
          close={() => setMenuOpen(false)}
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
    <div className="logoBox">
      <div className="logoMark">M</div>
      <strong>
        Meta<span>Binary</span>
      </strong>
    </div>
  );
}

function AuthScreen({ mode, setMode, onLogin, onRegister }) {
  const [login, setLogin] = useState({ email: "", password: "" });
  const [reg, setReg] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    country: "Kenya",
    password: "",
    confirmPassword: "",
    referral: "",
    terms: false,
    age: false,
  });

  function submitLogin() {
    if (!login.email || !login.password) {
      alert("Enter email and password");
      return;
    }

    onLogin(login);
  }

  function submitRegister() {
    if (!reg.firstName || !reg.lastName || !reg.email || !reg.password) {
      alert("Fill all required fields");
      return;
    }

    if (reg.password !== reg.confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    if (!reg.terms || !reg.age) {
      alert("Accept terms and confirm age");
      return;
    }

    onRegister(reg);
  }

  return (
    <div className="authShell">
      {mode === "login" ? (
        <section className="authLoginPanel">
          <Logo />

          <div className="authCard">
            <h1>Welcome Back</h1>
            <p>Login to your account and continue trading</p>

            <label>Email Address</label>
            <div className="authInput">
              <span>✉</span>
              <input
                placeholder="Enter your email"
                value={login.email}
                onChange={(e) => setLogin({ ...login, email: e.target.value })}
              />
            </div>

            <label>Password</label>
            <div className="authInput">
              <span>🔒</span>
              <input
                type="password"
                placeholder="Enter your password"
                value={login.password}
                onChange={(e) => setLogin({ ...login, password: e.target.value })}
              />
              <b>◉</b>
            </div>

            <div className="authOptions">
              <label>
                <input type="checkbox" /> Remember Me
              </label>
              <button>Forgot Password?</button>
            </div>

            <button className="authPrimary" onClick={submitLogin}>
              Login <span>→</span>
            </button>

            <div className="authOr">
              <span></span>
              OR
              <span></span>
            </div>

            <button className="googleBtn">
              <b>G</b> Continue with Google
            </button>

            <p className="authSwitch">
              Don’t have an account?{" "}
              <button onClick={() => setMode("register")}>Create Account</button>
            </p>
          </div>
        </section>
      ) : (
        <section className="registerPanel">
          <div className="registerMain">
            <Logo />
            <h1>Create Your Account</h1>
            <p>Join MetaBinary and start your trading journey</p>

            <div className="steps">
              <div className="active">
                <span>1</span>
                <small>Personal Info</small>
              </div>
              <div>
                <span>2</span>
                <small>Security</small>
              </div>
              <div>
                <span>3</span>
                <small>Confirm</small>
              </div>
            </div>

            <h3>Personal Information</h3>

            <div className="regGrid">
              <RegInput
                label="First Name"
                icon="♙"
                placeholder="Enter first name"
                value={reg.firstName}
                onChange={(v) => setReg({ ...reg, firstName: v })}
              />

              <RegInput
                label="Last Name"
                icon="♙"
                placeholder="Enter last name"
                value={reg.lastName}
                onChange={(v) => setReg({ ...reg, lastName: v })}
              />

              <RegInput
                label="Email Address"
                icon="✉"
                placeholder="Enter your email"
                value={reg.email}
                onChange={(v) => setReg({ ...reg, email: v })}
              />

              <RegInput
                label="Mobile Number"
                icon="☎"
                placeholder="+254 700 000 000"
                value={reg.phone}
                onChange={(v) => setReg({ ...reg, phone: v })}
              />

              <label className="regField">
                <span>Country</span>
                <select
                  value={reg.country}
                  onChange={(e) => setReg({ ...reg, country: e.target.value })}
                >
                  <option>Kenya</option>
                  <option>Uganda</option>
                  <option>Tanzania</option>
                  <option>Rwanda</option>
                  <option>Nigeria</option>
                </select>
              </label>

              <label className="regField">
                <span>Currency</span>
                <select>
                  <option>USD - US Dollar</option>
                  <option>KES - Kenyan Shilling</option>
                </select>
              </label>
            </div>

            <h3>Security</h3>

            <div className="regGrid">
              <RegInput
                label="Password"
                type="password"
                icon="🔒"
                placeholder="Create password"
                value={reg.password}
                onChange={(v) => setReg({ ...reg, password: v })}
              />

              <RegInput
                label="Confirm Password"
                type="password"
                icon="🔒"
                placeholder="Confirm password"
                value={reg.confirmPassword}
                onChange={(v) => setReg({ ...reg, confirmPassword: v })}
              />
            </div>

            <RegInput
              label="Referral Code (Optional)"
              icon="▣"
              placeholder="Enter referral code"
              value={reg.referral}
              onChange={(v) => setReg({ ...reg, referral: v })}
            />

            <label className="checkLine">
              <input
                type="checkbox"
                checked={reg.terms}
                onChange={(e) => setReg({ ...reg, terms: e.target.checked })}
              />
              I agree to the Terms & Conditions and Privacy Policy
            </label>

            <label className="checkLine">
              <input
                type="checkbox"
                checked={reg.age}
                onChange={(e) => setReg({ ...reg, age: e.target.checked })}
              />
              I confirm that I am over 18 years old
            </label>

            <button className="authPrimary" onClick={submitRegister}>
              Create Account <span>♙</span>
            </button>

            <p className="authSwitch">
              Already have an account?{" "}
              <button onClick={() => setMode("login")}>Login</button>
            </p>
          </div>

          <aside className="whyJoin">
            <h3>Why Join MetaBinary?</h3>

            {[
              ["↗", "Demo Account", "$10,000 free virtual balance"],
              ["↗", "Real Market", "Trade real volatility markets"],
              ["🛡", "Secure Platform", "Bank-level security"],
              ["▣", "Instant Deposits", "Multiple payment methods"],
              ["☏", "24/7 Support", "We’re here to help"],
            ].map((item) => (
              <div className="whyItem" key={item[1]}>
                <span>{item[0]}</span>
                <div>
                  <strong>{item[1]}</strong>
                  <small>{item[2]}</small>
                </div>
              </div>
            ))}

            <div className="secureBox">
              <strong>🛡 Your data is secure</strong>
              <small>We use 256-bit SSL encryption to protect your information.</small>
            </div>

            <div className="securityArt">🔐</div>
          </aside>
        </section>
      )}
    </div>
  );
}

function RegInput({ label, icon, value, onChange, placeholder, type = "text" }) {
  return (
    <label className="regField">
      <span>{label}</span>
      <div>
        <b>{icon}</b>
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </label>
  );
}

function Header({
  user,
  account,
  setAccount,
  balance,
  setActivePage,
  openMenu,
  openDeposit,
}) {
  return (
    <header className="topHeader">
      <button className="hamburger" onClick={openMenu}>
        ☰
      </button>

      <Logo />

      <button className="walletBox" onClick={() => setActivePage("profile")}>
        <small>{account === "real" ? "REAL ACCOUNT" : "DEMO ACCOUNT"}</small>
        <strong>{money(balance)} USD</strong>
        <span>⌄</span>
      </button>

      <div className="demoReal">
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
        🔔<span>3</span>
      </button>

      <button className="userAvatar" onClick={() => setActivePage("profile")}>
        {user.initials || "JM"}
        <i></i>
      </button>
    </header>
  );
}

function SideMenu({
  user,
  account,
  setAccount,
  balance,
  setActivePage,
  close,
  openDeposit,
  openWithdraw,
  logout,
}) {
  function go(page) {
    setActivePage(page);
    close();
  }

  function action(fn) {
    fn();
    close();
  }

  return (
    <div className="menuLayer">
      <button className="menuShade" onClick={close}></button>

      <aside className="menuPanel">
        <div className="menuTop">
          <Logo />
          <button onClick={close}>×</button>
        </div>

        <div className="menuAccount">
          <div className="menuAccountTop">
            <div className="accountIcon">M</div>
            <div>
              <small>{account === "demo" ? "Demo Account" : "Real Account"}</small>
              <strong>{money(balance)} USD</strong>
              <span>Account ID: {user.brokerId || "MB123456"} ⧉</span>
            </div>
          </div>

          <div className="menuSwitch">
            <button className={account === "demo" ? "active" : ""} onClick={() => setAccount("demo")}>
              Demo
            </button>
            <button className={account === "real" ? "active" : ""} onClick={() => setAccount("real")}>
              Real
            </button>
          </div>
        </div>

        <div className="menuGrid">
          <MenuBlock title="TRADING">
            <MenuBtn icon="⌂" label="Trader’s Hub" onClick={() => go("forex")} />
            <MenuBtn icon="▥" label="Markets" onClick={() => go("home")} />
            <MenuBtn icon="↕" label="Trade" onClick={() => go("trade")} />
          </MenuBlock>

          <MenuBlock title="FUNDS">
            <MenuBtn icon="▱" label="Cashier / Deposit" onClick={() => action(openDeposit)} />
            <MenuBtn icon="⇧" label="Withdraw" onClick={() => action(openWithdraw)} />
            <MenuBtn icon="↺" label="History" onClick={() => go("history")} />
          </MenuBlock>

          <MenuBlock title="AUTOMATION">
            <MenuBtn icon="🤖" label="My Bots" onClick={() => go("bots")} />
            <MenuBtn icon="▶" label="Running Bots" onClick={() => go("botLive")} />
            <MenuBtn icon="▣" label="Reports" onClick={() => go("reports")} />
          </MenuBlock>

          <MenuBlock title="ACCOUNT">
            <MenuBtn icon="♙" label="Profile" onClick={() => go("profile")} />
            <MenuBtn icon="⚙" label="Settings" onClick={() => go("settings")} />
            <MenuBtn icon="🔔" label="Notifications" badge="3" onClick={() => go("settings")} />
          </MenuBlock>
        </div>

        <button className="logoutBtn" onClick={logout}>
          ⇥ Logout
        </button>
      </aside>
    </div>
  );
}

function MenuBlock({ title, children }) {
  return (
    <section className="menuBlock">
      <h4>{title}</h4>
      {children}
    </section>
  );
}

function MenuBtn({ icon, label, badge, onClick }) {
  return (
    <button className="menuBtn2" onClick={onClick}>
      <span>{icon}</span>
      <strong>{label}</strong>
      {badge && <b>{badge}</b>}
      <em>›</em>
    </button>
  );
}

function HubNav({ setActivePage, active, openDeposit }) {
  const items = [
    ["Trader’s Hub", "▣", "forex"],
    ["Reports", "▤", "reports"],
    ["Cashier", "▱", "deposit"],
    ["History", "↺", "history"],
    ["Forex", "▥", "forex"],
    ["Settings", "⚙", "settings"],
  ];

  return (
    <div className="hubNav">
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
    </div>
  );
}

function HomePage({ setActivePage, openDeposit }) {
  return (
    <div className="page homePage">
      <AccountStrip openDeposit={openDeposit} />
      <HubNav setActivePage={setActivePage} active="Trader’s Hub" openDeposit={openDeposit} />

      <section className="homeHero">
        <div>
          <h1>Trade Smarter. Earn Consistently.</h1>
          <p>AI-powered trading, binary options, forex and bots in one platform.</p>
          <button onClick={() => setActivePage("trade")}>Start Trading →</button>
        </div>
        <div className="phoneArt">
          <span>EUR/USD</span>
          <strong>1.08564</strong>
          <button>CALL</button>
          <button>PUT</button>
        </div>
      </section>

      <section className="statsLine">
        <Stat label="Total Trades" value="$2,456,789" />
        <Stat label="Active Traders" value="15,342" />
        <Stat label="Payouts" value="$892,456" />
        <Stat label="Success" value="98.62%" />
      </section>

      <section className="marketsMini">
        {["EUR/USD", "GBP/USD", "XAU/USD", "BTC/USD"].map((m, i) => (
          <button key={m}>
            <strong>{m}</strong>
            <span className={i === 1 ? "red" : "green"}>{i === 1 ? "-0.11%" : "+0.24%"}</span>
          </button>
        ))}
      </section>
    </div>
  );
}

function AccountStrip({ openDeposit }) {
  return (
    <section className="accountStrip">
      <div>
        <small>Balance</small>
        <strong>10,250.00 <em>USD</em></strong>
        <span>Available</span>
      </div>

      <div>
        <small>Profit / Loss Today</small>
        <strong className="green">+250.00 <em>USD</em></strong>
        <span>⌁</span>
      </div>

      <button onClick={openDeposit}>▱ Cashier</button>
    </section>
  );
}

function Stat({ label, value }) {
  return (
    <div className="stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function ForexPage({ priceData, livePrice, positions, placeForexOrder, setActivePage, openDeposit }) {
  return (
    <div className="page forexPage">
      <AccountStrip openDeposit={openDeposit} />
      <HubNav setActivePage={setActivePage} active="Forex" openDeposit={openDeposit} />

      <section className="symbolBar">
        <button>‹</button>
        <div className="flag">🇪🇺🇺🇸</div>
        <div>
          <strong>EUR/USD</strong>
          <small>Euro / US Dollar</small>
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

      <section className="mt5Toolbar">
        {["1m", "5m", "15m", "1h", "4h", "1D"].map((t, i) => (
          <button className={i === 0 ? "active" : ""} key={t}>{t}</button>
        ))}
        <button>⌄</button>
        <button>ƒx</button>
        <button>Indicators</button>
        <button>↶</button>
        <button>↷</button>
        <button>⛶</button>
      </section>

      <section className="mt5ChartWrap">
        <div className="toolRail">
          {["＋", "⌁", "☷", "T", "☻", "▱", "◉", "⌫"].map((x) => (
            <button key={x}>{x}</button>
          ))}
        </div>

        <CandleChart data={priceData} />

        <div className="priceTag">
          {livePrice.toFixed(5)}
          <small>00:18</small>
        </div>
      </section>

      <section className="mt5Order">
        <div className="orderLeft">
          <div className="orderTabs">
            <button className="active">Market Order</button>
            <button>Pending Order</button>
          </div>

          <div className="mt5Inputs">
            <MtInput label="Volume (Lots)" value="0.01" />
            <MtInput label="Leverage" value="1:100" />
            <MtInput label="Stop Loss" value="0.00000" />
            <MtInput label="Take Profit" value="0.00000" />
          </div>
        </div>

        <div className="buySell">
          <button className="buy" onClick={() => placeForexOrder("Buy")}>
            <strong>Buy ↗</strong>
            <span>{livePrice.toFixed(5)}</span>
          </button>

          <button className="sell" onClick={() => placeForexOrder("Sell")}>
            <strong>Sell ↓</strong>
            <span>{(livePrice - 0.00006).toFixed(5)}</span>
          </button>
        </div>

        <div className="spread">
          <p><span>Spread</span><strong>0.6 Pips</strong></p>
          <p><span>High</span><strong className="green">1.08789</strong></p>
          <p><span>Low</span><strong className="red">1.08312</strong></p>
          <p><span>Change</span><strong className="green">+0.21%</strong></p>
        </div>
      </section>

      <section className="positionPanel">
        <div className="positionTabs">
          <button className="active">Open Trades <span>{Math.max(positions.length, 2)}</span></button>
          <button>Profit <span>1</span></button>
          <button>Loss <span>1</span></button>
          <button>History</button>
          <button>Close All</button>
        </div>

        <div className="positionHead">
          <span>Instrument</span><span>Type</span><span>Volume</span><span>Open Price</span><span>P/L</span><span>Action</span>
        </div>

        {(positions.length ? positions : [
          { id: 1, instrument: "EUR/USD", side: "Buy", lot: 0.01, entry: 1.0862, pl: 0.34 },
          { id: 2, instrument: "GBP/USD", side: "Sell", lot: 0.01, entry: 1.2698, pl: -0.01 },
        ]).slice(0, 3).map((p) => (
          <div className="positionRow" key={p.id}>
            <strong>{p.instrument}</strong>
            <b className={p.side === "Buy" ? "green" : "red"}>{p.side}</b>
            <span>{p.lot}</span>
            <span>{p.entry}</span>
            <em className={p.pl >= 0 ? "green" : "red"}>{p.pl >= 0 ? "+" : ""}{p.pl}</em>
            <button>Close</button>
          </div>
        ))}
      </section>
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

function CandleChart({ data }) {
  return (
    <div className="candleChart">
      {data.slice(-42).map((v, i) => {
        const up = i % 3 !== 0;
        const h = 26 + Math.abs(Math.sin(i / 2)) * 70;
        const bottom = 26 + Math.abs(Math.cos(i / 3)) * 120;

        return (
          <i
            key={i}
            className={up ? "up" : "down"}
            style={{
              left: `${3 + i * 2.25}%`,
              height: `${h}px`,
              bottom: `${bottom}px`,
            }}
          />
        );
      })}
    </div>
  );
}

function TradePage({
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
  actionsFor,
  payoutRate,
  placeBinaryTrade,
}) {
  const actions = actionsFor(tradeType);

  return (
    <div className="page binaryPage">
      <section className="tradeTypes">
        <span>Trade Type</span>
        {["Even/Odd", "Matches/Differs", "Over/Under", "Rise/Fall", "Touch/No Touch"].map((t) => (
          <button key={t} className={tradeType === t ? "active" : ""} onClick={() => setTradeType(t)}>
            {t}
          </button>
        ))}
      </section>

      <section className="binaryChart">
        <div className="binaryTop">
          <div>
            <strong>Volatility 100 (1s) Index</strong>
            <small>{money(livePrice * 800)} · LIVE</small>
          </div>
          <button>1s⌄</button>
        </div>

        <LineChart data={priceData.map((p) => p * 800)} />

        <h4>Last Digits</h4>

        <div className="digitGrid">
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
            <button onClick={() => setStake((s) => Math.max(0.3, Number(s) - 1))}>−</button>
            <strong>{money(stake)}</strong>
            <button onClick={() => setStake((s) => Number(s) + 1)}>+</button>
          </div>
        </label>

        <div className="actionButtons">
          {actions.map((action, i) => (
            <button
              key={action}
              className={i === 0 ? "greenBtn" : "redBtn"}
              onClick={() => placeBinaryTrade(action)}
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
      .map((v, i) => {
        const x = (i / (data.length - 1)) * 100;
        const y = 58 - ((v - min) / range) * 52;
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [data]);

  return (
    <div className="lineChart">
      <svg viewBox="0 0 100 60" preserveAspectRatio="none">
        <path d={`${path} L100,60 L0,60 Z`} className="area" />
        <path d={path} className="line" />
      </svg>
    </div>
  );
}

function BotsPage({ bots, startBot }) {
  return (
    <div className="page botsPage">
      <section className="botsHeader">
        <div>
          <h2>My Bots</h2>
          <p>Create, manage and monitor your bots.</p>
        </div>
        <button>+ New Bot</button>
      </section>

      <section className="botSummary">
        <Stat label="Total Bots" value="12" />
        <Stat label="Running" value="5" />
        <Stat label="Stopped" value="3" />
        <Stat label="Completed" value="4" />
      </section>

      <section className="botCards">
        {bots.map((bot) => (
          <div className="botCard" key={bot.name}>
            <div className="botTop">
              <div className="botIcon">{bot.code}</div>
              <div>
                <strong>{bot.name}</strong>
                <span>{bot.contract} · {bot.market}</span>
                <small>Stake: {money(bot.stake)} USD · Duration: {bot.duration}s</small>
              </div>
              <em className={bot.status === "Running" ? "running" : "stopped"}>{bot.status}</em>
            </div>

            <div className="botNums">
              <p><span>Profit</span><b className={bot.profit >= 0 ? "green" : "red"}>{bot.profit >= 0 ? "+" : ""}{money(bot.profit)}</b></p>
              <p><span>Win Rate</span><b>{bot.winRate}%</b></p>
              <p><span>Trades</span><b>{Math.floor(bot.winRate / 3)}</b></p>
            </div>

            <button className="botAction" onClick={() => startBot(bot)}>
              {bot.status === "Running" ? "View / Run" : "Start Bot"}
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}

function BotLivePage({
  bot,
  botRunning,
  stopBot,
  startBot,
  botTab,
  setBotTab,
  openTrades,
  closedTrades,
  transactions,
  back,
}) {
  const runs = openTrades.length + closedTrades.length;
  const won = closedTrades.filter((t) => t.won).length;
  const lost = closedTrades.filter((t) => !t.won).length;
  const totalStake = closedTrades.reduce((s, t) => s + t.stake, 0);
  const totalPayout = closedTrades.reduce((s, t) => s + (t.won ? t.payout : 0), 0);
  const pl = closedTrades.reduce((s, t) => s + (t.won ? t.profit : -t.stake), 0);
  const last = closedTrades[0];

  if (!bot) {
    return (
      <div className="page botLive">
        <button className="backBot" onClick={back}>‹ Back to Bots</button>
        <div className="emptyBot">Choose a bot first.</div>
      </div>
    );
  }

  return (
    <div className="botLive">
      <div className="botLiveTop">
        <button onClick={back}>‹ Back to Bot</button>
        <strong>{bot.name}</strong>
      </div>

      <div className="runnerBar">
        {botRunning ? (
          <button className="stopBtn" onClick={stopBot}>■ Stop</button>
        ) : (
          <button className="runBtn" onClick={() => startBot(bot)}>▶ Run</button>
        )}

        <div>
          <strong>{botRunning ? "Contract bought" : "Bot is not running"}</strong>
          <span><i></i></span>
        </div>
      </div>

      <div className="athenaLine">
        <button>Athena <span className={botRunning ? "on" : ""}></span></button>
        <div>
          <strong>STATUS</strong>
          <small>Latest strategy update shows here when the bot runs.</small>
        </div>
        <a>Full log</a>
      </div>

      <div className="runnerTabs">
        {["summary", "transactions", "journal"].map((t) => (
          <button key={t} className={botTab === t ? "active" : ""} onClick={() => setBotTab(t)}>
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <section className="runnerBody">
        {botTab === "summary" && (
          <div className={last?.won ? "resultBox won" : last ? "resultBox lost" : "resultBox"}>
            {openTrades[0] ? (
              <>
                <strong>Contract bought</strong>
                <span>{openTrades[0].contract} · {openTrades[0].choice}</span>
              </>
            ) : last ? (
              <>
                <strong>⚑ Closed</strong>
                <h2>{last.won ? "+" : "-"}{money(last.won ? last.profit : last.stake)} USD</h2>
              </>
            ) : (
              <p>When you’re ready, hit Run.</p>
            )}
          </div>
        )}

        {botTab === "transactions" && (
          <div className="runnerTable">
            {[...openTrades, ...closedTrades].slice(0, 7).map((t) => (
              <div key={t.id}>
                <span>▥ ↗</span>
                <p>
                  <strong>{t.entry || "—"}</strong>
                  <small>{t.exit || "—"}</small>
                </p>
                <p>
                  <strong>{money(t.stake)} USD</strong>
                  <small className={t.won ? "green" : "red"}>
                    {t.status === "RUNNING"
                      ? "Running"
                      : `${t.won ? "+" : "-"}${money(t.won ? t.profit : t.stake)} USD`}
                  </small>
                </p>
              </div>
            ))}
          </div>
        )}

        {botTab === "journal" && (
          <div className="journalList">
            {transactions.slice(0, 7).map((t) => (
              <p key={t.id}>
                <strong>{t.type}</strong>
                <span>{t.time}</span>
              </p>
            ))}
          </div>
        )}
      </section>

      <section className="runnerStats">
        <Stat label="Stake" value={`${money(totalStake)} USD`} />
        <Stat label="Payout" value={`${money(totalPayout)} USD`} />
        <Stat label="Runs" value={runs} />
        <Stat label="Lost" value={lost} />
        <Stat label="Won" value={won} />
        <Stat label="P/L" value={`${pl >= 0 ? "+" : ""}${money(pl)} USD`} />
      </section>
    </div>
  );
}

function ProfilePage({ user, balances, transactions, setActivePage, logout }) {
  return (
    <div className="page profilePage">
      <section className="profileCard">
        <div className="bigAvatar">{user.initials || "JM"}</div>
        <div>
          <h2>{user.name} <span>✓</span></h2>
          <p>{user.email}</p>
          <b>Verified</b>
          <small>Account ID: {user.brokerId}</small>
        </div>
      </section>

      <section className="profileStats">
        <Stat label="Real Balance" value={`${money(balances.real)} USD`} />
        <Stat label="Demo Balance" value={`${money(balances.demo)} USD`} />
        <Stat label="Total Profit" value="+2,450.75" />
        <Stat label="Win Rate" value="63.25%" />
      </section>

      <section className="profileGrid">
        <button onClick={() => setActivePage("settings")}>⚙<strong>Settings</strong><span>Preferences</span></button>
        <button onClick={() => setActivePage("history")}>↺<strong>History</strong><span>{transactions.length} records</span></button>
        <button>🛡<strong>KYC</strong><span>Verified</span></button>
        <button>👥<strong>Referral</strong><span>Earn 30%</span></button>
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

      <section className="settingsGrid">
        <button className="active">⚙<span>General</span></button>
        <button>🛡<span>Security</span></button>
        <button>▣<span>KYC</span></button>
        <button>🔔<span>Notifications</span></button>
        <button>🌐<span>Language</span></button>
        <button>ⓘ<span>About</span></button>
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
            <button onClick={() => setStake((s) => Math.max(0.3, Number(s) - 1))}>−</button>
            <strong>{money(stake)}</strong>
            <button onClick={() => setStake((s) => Number(s) + 1)}>+</button>
          </div>
        </label>

        <div className="settingToggles">
          <p><span>Confirm before trading</span><b className="on"></b></p>
          <p><span>Quick Trade</span><b className="on"></b></p>
          <p><span>Sound Alerts</span><b className="on"></b></p>
          <p><span>Compact Mode</span><b className="on"></b></p>
        </div>
      </section>
    </div>
  );
}

function HistoryPage({ transactions, closedTrades }) {
  return (
    <div className="page listPage">
      <h1>History</h1>

      <section className="listPanel">
        {transactions.length === 0 && closedTrades.length === 0 && <p>No history yet.</p>}

        {transactions.slice(0, 10).map((t) => (
          <div key={t.id}>
            <span>
              <strong>{t.type}</strong>
              <small>{t.time}</small>
            </span>
            <b className={t.amount >= 0 ? "green" : "red"}>
              {t.amount >= 0 ? "+" : ""}{money(t.amount)} USD
            </b>
          </div>
        ))}
      </section>
    </div>
  );
}

function ReportsPage({ transactions, closedTrades }) {
  const wins = closedTrades.filter((t) => t.won).length;
  const loss = closedTrades.filter((t) => !t.won).length;

  return (
    <div className="page listPage">
      <h1>Reports</h1>

      <section className="profileStats">
        <Stat label="Transactions" value={transactions.length} />
        <Stat label="Won Trades" value={wins} />
        <Stat label="Lost Trades" value={loss} />
        <Stat label="Win Rate" value={wins + loss ? `${Math.round((wins / (wins + loss)) * 100)}%` : "0%"} />
      </section>

      <section className="listPanel">
        {closedTrades.slice(0, 10).map((t) => (
          <div key={t.id}>
            <span>
              <strong>{t.contract}</strong>
              <small>{t.choice} · digit {t.resultDigit}</small>
            </span>
            <b className={t.won ? "green" : "red"}>
              {t.won ? "+" : "-"}{money(t.won ? t.profit : t.stake)} USD
            </b>
          </div>
        ))}
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
          className={activePage === key ? "active" : ""}
          onClick={() => setActivePage(key)}
        >
          <span>{icon}</span>
          <small>{label}</small>
        </button>
      ))}
    </nav>
  );
}

function DepositModal({ close, submit }) {
  const [step, setStep] = useState("");
  const [amountUsd, setAmountUsd] = useState(10);
  const [phone, setPhone] = useState("");

  return (
    <div className="modalLayer">
      <div className="depositModal">
        <button className="modalClose" onClick={close}>×</button>

        {!step ? (
          <>
            <h2>Deposit Funds</h2>
            <p>Choose payment method</p>

            <button className="paymentOption" onClick={() => setStep("mpesa")}>
              <span>📱</span>
              <div><strong>M-Pesa</strong><small>Instant mobile money</small></div>
              <b>›</b>
            </button>

            <button className="paymentOption" onClick={() => setStep("card")}>
              <span>💳</span>
              <div><strong>Credit/Debit Card</strong><small>Visa, Mastercard</small></div>
              <b>›</b>
            </button>

            <button className="paymentOption" onClick={() => setStep("usdt")}>
              <span>₿</span>
              <div><strong>USDT (TRC20)</strong><small>Cryptocurrency</small></div>
              <b>›</b>
            </button>
          </>
        ) : (
          <>
            <button className="backSmall" onClick={() => setStep("")}>‹ Back</button>
            <h2>{step === "mpesa" ? "M-Pesa Deposit" : step === "card" ? "Card Deposit" : "USDT Deposit"}</h2>
            <p>Funds will be added to your real account.</p>

            <label>Amount USD</label>
            <input type="number" min="1" value={amountUsd} onChange={(e) => setAmountUsd(e.target.value)} />

            {step !== "usdt" && (
              <>
                <label>Phone Number</label>
                <input placeholder="07XXXXXXXX or 2547XXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </>
            )}

            <button className="modalPrimary" onClick={() => submit({ method: step, amountUsd, phone })}>
              {step === "mpesa" ? "Send STK Push" : "Continue"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function WithdrawModal({ close, submit }) {
  const [amountUsd, setAmountUsd] = useState(5);
  const [phone, setPhone] = useState("");

  return (
    <div className="modalLayer">
      <div className="depositModal">
        <button className="modalClose" onClick={close}>×</button>

        <h2>Withdraw Funds</h2>
        <p>Minimum withdrawal is $5.</p>

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