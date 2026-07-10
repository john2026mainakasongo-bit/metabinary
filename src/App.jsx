import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function money(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function uid() {
  return Date.now() + Math.random();
}

function readStorage(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

export default function App() {
  const [user, setUser] = useState(() =>
    readStorage("metabinary_user", {
      name: "John Maina",
      email: "johnmaina@gmail.com",
      initials: "JM",
      verified: true,
      brokerId: "MB123456",
    })
  );

  const [activePage, setActivePage] = useState("home");
  const [account, setAccount] = useState("demo");

  const [balances, setBalances] = useState(() =>
    readStorage("metabinary_balances", {
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
    Array.from(
      { length: 60 },
      (_, i) => 1.085 + Math.sin(i / 6) * 0.002 + Math.random() * 0.0015
    )
  );

  const [lastDigit, setLastDigit] = useState(0);
  const [digitStats, setDigitStats] = useState(() =>
    Array.from({ length: 10 }, () => 7 + Math.random() * 6)
  );

  const [openTrades, setOpenTrades] = useState([]);
  const [closedTrades, setClosedTrades] = useState(() =>
    readStorage("metabinary_closed_trades", [])
  );
  const [transactions, setTransactions] = useState(() =>
    readStorage("metabinary_transactions", [])
  );
  const [toasts, setToasts] = useState([]);

  const [botRunner, setBotRunner] = useState(null);
  const [botRunning, setBotRunning] = useState(false);
  const [botTimer, setBotTimer] = useState(null);

  const balance = balances[account] || 0;
  const livePrice = priceData[priceData.length - 1] || 1.08564;

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
        const last = old[old.length - 1] || 1.08564;
        const next = Number((last + (Math.random() - 0.47) * 0.0009).toFixed(5));
        return [...old.slice(-59), next];
      });

      setLastDigit(Math.floor(Math.random() * 10));
      setDigitStats(Array.from({ length: 10 }, () => 7 + Math.random() * 6));
    }, 850);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    refreshUserBalance();
    const timer = setInterval(refreshUserBalance, 8000);
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
      // Backend offline: keep local balances.
    }
  }

  function showToast(type, title, message) {
    const toast = { id: uid(), type, title, message };
    setToasts((old) => [toast, ...old].slice(0, 3));

    setTimeout(() => {
      setToasts((old) => old.filter((item) => item.id !== toast.id));
    }, 3500);
  }

  function addTransaction(item) {
    setTransactions((old) => [
      {
        id: uid(),
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
    const entry = Number((livePrice + (Math.random() - 0.5) * 0.003).toFixed(5));
    const exit = Number((entry + (Math.random() - 0.47) * 0.002).toFixed(5));

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
      id: uid(),
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
    if (botTimer) clearInterval(botTimer);

    setBotRunner(bot);
    setBotRunning(true);
    setTradeType(bot.contract);
    setStake(bot.stake);
    setDuration(bot.duration);
    setPrediction(bot.prediction || 2);
    showToast("open", `${bot.name} started`, "Bot is now buying contracts.");

    let runs = 0;

    const runOnce = () => {
      if (runs >= 30) {
        stopBot();
        return;
      }

      runs += 1;
      placeTrade(bot.choice, bot.name);
    };

    runOnce();

    const timer = setInterval(() => {
      runOnce();
    }, (bot.duration + 2) * 1000);

    setBotTimer(timer);
  }

  function stopBot() {
    if (botTimer) clearInterval(botTimer);
    setBotTimer(null);
    setBotRunning(false);
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
          <HomePage
            setActivePage={setActivePage}
            onDeposit={() => setDepositOpen(true)}
          />
        )}

        {activePage === "markets" && (
          <MarketsPage
            setActivePage={setActivePage}
            onDeposit={() => setDepositOpen(true)}
          />
        )}

        {activePage === "forex" && (
          <ForexPage
            balance={balance}
            setActivePage={setActivePage}
            onDeposit={() => setDepositOpen(true)}
            priceData={priceData}
            livePrice={livePrice}
            openTrades={openTrades}
          />
        )}

        {activePage === "trade" && (
          <TradePage
            setActivePage={setActivePage}
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

        {activePage === "reports" && <ReportsPage transactions={transactions} />}

        {activePage === "history" && (
          <HistoryPage transactions={transactions} closedTrades={closedTrades} />
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
          onClose={() => setBotRunner(null)}
          onStart={() => startBot(botRunner)}
          onStop={stopBot}
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
        <button className="menuBtn" onClick={() => setMenuOpen(true)}>
          ☰
        </button>

        <Logo />

        <button className="topWallet" onClick={() => setActivePage("profile")}>
          <small>{account === "real" ? "REAL ACCOUNT" : "DEMO ACCOUNT"}</small>
          <strong>{money(balance)} USD</strong>
          <span>⌄</span>
        </button>

        <div className="headerRight">
          <button className="bell">
            🔔<span>3</span>
          </button>

          <button className="avatar" onClick={() => setActivePage("profile")}>
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

        <div className="mobileBalance">
          <small>{account === "real" ? "Real Account" : "Demo Account"}</small>
          <strong>{money(balance)} USD</strong>
        </div>

        <button className="depositBig" onClick={onDeposit}>
          Deposit
        </button>
      </div>

      {menuOpen && (
        <SideMenu
          user={user}
          account={account}
          setAccount={setAccount}
          balance={balance}
          setActivePage={setActivePage}
          onDeposit={onDeposit}
          onWithdraw={onWithdraw}
          logout={logout}
          closeMenu={() => setMenuOpen(false)}
        />
      )}
    </header>
  );
}

function SideMenu({
  user,
  account,
  setAccount,
  balance,
  setActivePage,
  onDeposit,
  onWithdraw,
  logout,
  closeMenu,
}) {
  const openPage = (page) => {
    setActivePage(page);
    closeMenu();
  };

  const doAction = (action) => {
    action();
    closeMenu();
  };

  return (
    <div className="sideMenuOverlay">
      <button className="sideMenuShade" onClick={closeMenu}></button>

      <aside className="sideMenuPanel">
        <div className="sideMenuTop">
          <Logo />
          <button className="sideMenuClose" onClick={closeMenu}>
            ×
          </button>
        </div>

        <div className="sideAccountCard">
          <div className="sideAccountHeader">
            <div className="sideAccountLogo">M</div>

            <div>
              <small>{account === "demo" ? "Demo Account" : "Real Account"}</small>
              <strong>{money(balance)} USD</strong>
              <span>
                Account ID: {user.brokerId || "MB123456"} <b>⧉</b>
              </span>
            </div>
          </div>

          <div className="sideAccountSwitch">
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
        </div>

        <MenuSection title="TRADING">
          <MenuItem icon="⌂" label="Trader's Hub" active onClick={() => openPage("forex")} />
          <MenuItem icon="▥" label="Markets" onClick={() => openPage("markets")} />
          <MenuItem icon="↕" label="Trade" onClick={() => openPage("trade")} />
        </MenuSection>

        <MenuSection title="FUNDS">
          <MenuItem icon="▱" label="Cashier / Deposit" onClick={() => doAction(onDeposit)} />
          <MenuItem icon="⇧" label="Withdraw" onClick={() => doAction(onWithdraw)} />
          <MenuItem icon="↺" label="Transaction History" onClick={() => openPage("history")} />
        </MenuSection>

        <MenuSection title="AUTOMATION">
          <MenuItem icon="🤖" label="My Bots" onClick={() => openPage("bots")} />
          <MenuItem icon="⚙" label="Bot Builder" onClick={() => openPage("bots")} />
          <MenuItem icon="▶" label="Running Bots" onClick={() => openPage("bots")} />
          <MenuItem icon="↺" label="Bot History" onClick={() => openPage("bots")} />
        </MenuSection>

        <MenuSection title="ACCOUNT">
          <MenuItem icon="♙" label="Profile" onClick={() => openPage("profile")} />
          <MenuItem icon="⚙" label="Settings" onClick={() => openPage("settings")} />
          <MenuItem icon="🛡" label="Security" onClick={() => openPage("settings")} />
          <MenuItem icon="▣" label="Verification (KYC)" onClick={() => openPage("profile")} />
          <MenuItem icon="👥" label="Referral Program" badge="Earn 30%" onClick={() => openPage("profile")} />
          <MenuItem icon="🔔" label="Notifications" bubble="3" onClick={() => openPage("settings")} />
        </MenuSection>

        <MenuSection title="SUPPORT">
          <MenuItem icon="?" label="Help Center" onClick={() => alert("Help Center will be added next.")} />
          <MenuItem icon="☏" label="Live Chat" onClick={() => alert("Live Chat will be added next.")} />
        </MenuSection>

        <button
          className="sideLogout"
          onClick={() => {
            logout();
            closeMenu();
          }}
        >
          <span>⇥</span>
          Logout
        </button>
      </aside>
    </div>
  );
}

function MenuSection({ title, children }) {
  return (
    <div className="menuSection">
      <h4>{title}</h4>
      <div>{children}</div>
    </div>
  );
}

function MenuItem({ icon, label, active, badge, bubble, onClick }) {
  return (
    <button className={`menuItem ${active ? "active" : ""}`} onClick={onClick}>
      <span className="menuItemIcon">{icon}</span>
      <strong>{label}</strong>
      {badge && <em className="menuBadge">{badge}</em>}
      {bubble && <em className="menuBubble">{bubble}</em>}
      <b>›</b>
    </button>
  );
}

function HubMenu({ setActivePage, active = "Forex", onDeposit }) {
  const items = [
    { label: "Trader’s Hub", icon: "▣", page: "forex" },
    { label: "Reports", icon: "▤", page: "reports" },
    { label: "Cashier", icon: "▱", action: onDeposit },
    { label: "History", icon: "↺", page: "history" },
    { label: "Forex", icon: "▥", page: "forex" },
    { label: "Settings", icon: "⚙", page: "settings" },
  ];

  return (
    <section className="hubRow">
      {items.map((item) => (
        <button
          key={item.label}
          className={active === item.label ? "active" : ""}
          onClick={() => {
            if (item.action) item.action();
            if (item.page) setActivePage(item.page);
          }}
        >
          <span>{item.icon}</span>
          <small>{item.label}</small>
        </button>
      ))}
    </section>
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
          className={
            activePage === item.key ||
            (activePage === "forex" && item.key === "trade") ||
            (activePage === "settings" && item.key === "profile")
              ? "active"
              : ""
          }
          onClick={() => setActivePage(item.key)}
        >
          <span>{item.icon}</span>
          <small>{item.label}</small>
        </button>
      ))}
    </nav>
  );
}

function LandingPage({ onStart }) {
  return (
    <div className="landingPage">
      <div className="landingCard">
        <Logo />
        <h1>Trade Smarter. Earn Consistently.</h1>
        <p>MetaBinary broker platform with binary options, forex and AI bots.</p>
        <button onClick={onStart}>Start Trading</button>
      </div>
    </div>
  );
}

function HomePage({ setActivePage, onDeposit }) {
  return (
    <div className="homePage mobilePage">
      <DashboardCard onDeposit={onDeposit} />
      <HubMenu setActivePage={setActivePage} active="Trader’s Hub" onDeposit={onDeposit} />

      <section className="homeGrid">
        <button onClick={() => setActivePage("forex")}>
          <span>▥</span>
          <strong>Forex Trading</strong>
          <small>Open live terminal</small>
        </button>
        <button onClick={() => setActivePage("trade")}>
          <span>↕</span>
          <strong>Binary Options</strong>
          <small>Even/Odd, Rise/Fall</small>
        </button>
        <button onClick={() => setActivePage("bots")}>
          <span>🤖</span>
          <strong>AI Bots</strong>
          <small>Run strategies</small>
        </button>
        <button onClick={() => setActivePage("markets")}>
          <span>📊</span>
          <strong>Markets</strong>
          <small>Top symbols</small>
        </button>
      </section>

      <section className="compactStats">
        <div><small>Total Trades</small><strong>$2.45M</strong></div>
        <div><small>Active Traders</small><strong>15,342</strong></div>
        <div><small>Payouts</small><strong>$892K</strong></div>
        <div><small>Success</small><strong>98.62%</strong></div>
      </section>

      <TopMarkets compact />
    </div>
  );
}

function DashboardCard({ onDeposit }) {
  return (
    <section className="dashboardCard">
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

      <button onClick={onDeposit}>▱ Cashier</button>
    </section>
  );
}

function ForexPage({ balance, setActivePage, onDeposit, priceData, livePrice, openTrades }) {
  return (
    <div className="forexPage mobilePage">
      <DashboardCard onDeposit={onDeposit} />
      <HubMenu setActivePage={setActivePage} active="Forex" onDeposit={onDeposit} />

      <section className="forexSymbol">
        <button>‹</button>
        <div className="pairFlag">🇪🇺🇺🇸</div>
        <div>
          <strong>EUR/USD</strong>
          <small>Euro / US Dollar</small>
        </div>
        <div className="symbolPrice">
          <strong>{livePrice.toFixed(5)}</strong>
          <small>+0.00231 ▲</small>
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
        {["1m", "5m", "15m", "1h", "4h", "1D"].map((time, index) => (
          <button key={time} className={index === 0 ? "active" : ""}>
            {time}
          </button>
        ))}
        <button>⌄</button>
        <button>⇅</button>
        <button>ƒx</button>
        <button>↶</button>
        <button>↷</button>
        <button>⛶</button>
      </section>

      <section className="forexChartPanel">
        <div className="toolStrip">
          {["＋", "⌁", "☷", "T", "☻", "▱", "◎", "◉", "⌫"].map((item) => (
            <button key={item}>{item}</button>
          ))}
        </div>
        <CandleChart data={priceData} />
        <div className="chartPriceTag">
          {livePrice.toFixed(5)}
          <small>00:18</small>
        </div>
      </section>

      <section className="forexOrder">
        <div className="orderTabs">
          <button className="active">Market Order</button>
          <button>Pending Order</button>
        </div>

        <div className="forexOrderGrid">
          <div className="forexInputs">
            <ForexInput label="Volume" value="0.01" plus />
            <ForexInput label="Leverage" value="1:100" />
            <ForexInput label="Stop Loss" value="0.00000" plus />
            <ForexInput label="Take Profit" value="0.00000" plus />
          </div>

          <div className="buySellStack">
            <button className="forexBuy">
              <strong>Buy ↗</strong>
              <span>{livePrice.toFixed(5)}</span>
            </button>
            <button className="forexSell">
              <strong>Sell ↓</strong>
              <span>{(livePrice - 0.00006).toFixed(5)}</span>
            </button>
          </div>

          <div className="spreadBox">
            <div><span>Spread</span><strong>0.6 Pips</strong></div>
            <div><span>High</span><strong className="green">1.08789</strong></div>
            <div><span>Low</span><strong className="red">1.08312</strong></div>
            <div><span>Change</span><strong className="green">+0.21%</strong></div>
          </div>
        </div>
      </section>

      <section className="forexTrades">
        <div className="tradeTabs">
          <button className="active">Open <span>{Math.max(2, openTrades.length)}</span></button>
          <button>Profit <span>1</span></button>
          <button>Loss <span>1</span></button>
          <button>Hold <span>0</span></button>
          <button>History</button>
        </div>

        <div className="forexTradeRow head">
          <span>Instrument</span>
          <span>Type</span>
          <span>Vol</span>
          <span>P/L</span>
          <span>Action</span>
        </div>

        <div className="forexTradeRow">
          <strong>🇪🇺 EUR/USD</strong>
          <b className="green">Buy</b>
          <span>0.01</span>
          <em className="green">+0.34</em>
          <button>Close</button>
        </div>

        <div className="forexTradeRow">
          <strong>🇬🇧 GBP/USD</strong>
          <b className="red">Sell</b>
          <span>0.01</span>
          <em className="red">-0.01</em>
          <button>Close</button>
        </div>
      </section>

      <section className="equityBar">
        <div><small>Equity</small><strong>{money(balance + 0.33)} USD</strong></div>
        <div><small>Used</small><strong>21.74 USD</strong></div>
        <div><small>Free</small><strong>{money(balance - 21.74)} USD</strong></div>
        <div><small>Level</small><strong>47,143%</strong></div>
      </section>
    </div>
  );
}

function ForexInput({ label, value, plus }) {
  return (
    <label className="forexInput">
      <span>{label}</span>
      <div>
        <strong>{value}</strong>
        {plus && (
          <>
            <button>−</button>
            <button>+</button>
          </>
        )}
      </div>
    </label>
  );
}

function TradePage({
  setActivePage,
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
    <div className="tradePage mobilePage">
      <HubMenu setActivePage={setActivePage} active="Forex" onDeposit={onDeposit} />

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

      <section className="binaryChartCard">
        <div className="chartHeader">
          <div>
            <strong>Volatility 100 (1s) Index</strong>
            <span>{money(livePrice * 800)} · LIVE</span>
          </div>
          <button>1s⌄</button>
        </div>

        <LineChart data={priceData.map((item) => item * 800)} />

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
            Stake
            <div className="stakeControl">
              <button onClick={() => setStake((old) => Math.max(0.3, Number(old) - 1))}>−</button>
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

      <section className="miniTradeStatus">
        <span>Open {openTrades.length}</span>
        <span>Won {closedTrades.filter((t) => t.won).length}</span>
        <span>Lost {closedTrades.filter((t) => !t.won).length}</span>
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

function CandleChart({ data }) {
  return (
    <div className="candleChart">
      {data.slice(-40).map((value, index) => {
        const up = index % 3 !== 0;
        const height = 28 + Math.abs(Math.sin(index)) * 64;
        const bottom = 30 + Math.abs(Math.cos(index / 2)) * 80;

        return (
          <span
            key={index}
            className={up ? "up" : "down"}
            style={{
              height: `${height}px`,
              bottom: `${bottom}px`,
              left: `${index * 2.35 + 3}%`,
            }}
          />
        );
      })}
    </div>
  );
}

function TopMarkets({ compact }) {
  const list = [
    ["🇪🇺🇺🇸", "EUR/USD", "Euro / US Dollar", "1.08564", "+0.24%"],
    ["🇬🇧🇺🇸", "GBP/USD", "British Pound", "1.26542", "-0.11%"],
    ["₿", "BTC/USD", "Bitcoin", "67,890.12", "+1.02%"],
  ];

  return (
    <section className={`marketPanel ${compact ? "compactMarket" : ""}`}>
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

function MarketsPage({ setActivePage, onDeposit }) {
  return (
    <div className="marketsPage mobilePage">
      <HubMenu setActivePage={setActivePage} active="Reports" onDeposit={onDeposit} />
      <div className="pageHead">
        <h2>Markets</h2>
        <p>Choose forex, crypto, commodities, and volatility markets.</p>
      </div>

      <section className="marketTiles">
        {["EUR/USD", "GBP/USD", "USD/JPY", "XAU/USD", "BTC/USD", "Volatility 100"].map((item) => (
          <button key={item}>
            <strong>{item}</strong>
            <span className="green">+0.{Math.floor(Math.random() * 99)}%</span>
          </button>
        ))}
      </section>

      <TopMarkets />
    </div>
  );
}

function ReportsPage({ transactions }) {
  return (
    <div className="reportsPage mobilePage">
      <div className="pageHead">
        <h2>Reports</h2>
        <p>Account reports, performance and trading activity.</p>
      </div>

      <section className="reportGrid">
        <Stat value="$10,250.00" label="Balance" />
        <Stat value="+$250.00" label="Today P/L" />
        <Stat value="63.25%" label="Win Rate" />
        <Stat value={transactions.length || 0} label="Transactions" />
      </section>

      <section className="simplePanel">
        <h3>Recent Report</h3>
        {transactions.slice(0, 8).map((tx) => (
          <div className="simpleRow" key={tx.id}>
            <span>{tx.type}</span>
            <strong className={tx.amount >= 0 ? "green" : "red"}>
              {tx.amount >= 0 ? "+" : ""}
              {money(tx.amount)} USD
            </strong>
          </div>
        ))}
        {transactions.length === 0 && <p>No report data yet.</p>}
      </section>
    </div>
  );
}

function HistoryPage({ transactions, closedTrades }) {
  return (
    <div className="historyPage mobilePage">
      <div className="pageHead">
        <h2>History</h2>
        <p>Deposits, withdrawals and trade settlements.</p>
      </div>

      <section className="simplePanel">
        {transactions.slice(0, 15).map((tx) => (
          <div className="simpleRow" key={tx.id}>
            <div>
              <strong>{tx.type}</strong>
              <small>{tx.time}</small>
            </div>
            <span className={tx.amount >= 0 ? "green" : "red"}>
              {tx.amount >= 0 ? "+" : ""}
              {money(tx.amount)} USD
            </span>
          </div>
        ))}

        {transactions.length === 0 &&
          closedTrades.slice(0, 10).map((trade) => (
            <div className="simpleRow" key={trade.id}>
              <div>
                <strong>{trade.contract}</strong>
                <small>{trade.choice} · digit {trade.resultDigit}</small>
              </div>
              <span className={trade.won ? "green" : "red"}>
                {trade.won ? "+" : "-"}
                {money(trade.won ? trade.profit : trade.stake)} USD
              </span>
            </div>
          ))}
      </section>
    </div>
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
    <div className="botsPage mobilePage">
      <div className="botsHead">
        <div>
          <h2>My Bots</h2>
          <p>Create, manage and monitor your trading bots.</p>
        </div>
        <button>+ New Bot</button>
      </div>

      <div className="botTabsTop">
        {["My Bots", "Running", "Stopped", "History"].map((tab, index) => (
          <button className={index === 0 ? "active" : ""} key={tab}>
            {tab}
          </button>
        ))}
      </div>

      <div className="botStatsCards">
        <BotStat title="Total" value="12" tag="All Time" />
        <BotStat title="Running" value="5" tag="Live" />
        <BotStat title="Stopped" value="3" tag="Paused" />
        <BotStat title="Done" value="4" tag="Finished" />
      </div>

      <div className="botSearchRow">
        <input placeholder="Search bots..." />
        <select>
          <option>All Status</option>
          <option>Running</option>
          <option>Stopped</option>
        </select>
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
              <em className={bot.status === "Running" ? "running" : "stopped"}>
                {bot.status}
              </em>
            </div>

            <div className="botMetrics">
              <div>
                <span>Profit</span>
                <strong className={bot.profit >= 0 ? "green" : "red"}>
                  {bot.profit >= 0 ? "+" : ""}
                  {money(bot.profit)}
                </strong>
              </div>
              <div><span>Win Rate</span><strong>{bot.winRate}</strong></div>
              <div><span>Trades</span><strong>{bot.trades}</strong></div>
              <div><span>Balance</span><strong>{money(bot.balance)}</strong></div>
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

function ProfilePage({ user, balances, transactions, logout, onDeposit, setActivePage }) {
  return (
    <div className="profilePage mobilePage">
      <div className="profileMainCard">
        <div className="profileAvatar">
          {user.initials}
          <span>📷</span>
        </div>

        <div className="profileIdentity">
          <h2>{user.name} <b>✓</b></h2>
          <p>{user.email}</p>
          <em>Verified</em>
          <small>ID: {user.brokerId || "MB123456"}</small>
        </div>

        <div className="levelCard">
          <strong>💎 Silver Trader</strong>
          <span>65% to Gold Trader</span>
          <div><i></i></div>
        </div>
      </div>

      <div className="profileStats">
        <Stat value={`${money(balances.real)} USD`} label="Real Balance" />
        <Stat value={`${money(balances.demo)} USD`} label="Demo Balance" />
        <Stat value="+2,450.75 USD" label="Total Profit" />
        <Stat value="63.25%" label="Win Rate" />
      </div>

      <div className="profileActionGrid">
        <button onClick={onDeposit}>
          <span>▱</span>
          <strong>Payment Methods</strong>
          <small>Deposit and withdraw</small>
        </button>
        <button onClick={() => setActivePage("history")}>
          <span>↺</span>
          <strong>Transaction History</strong>
          <small>{transactions.length} records</small>
        </button>
        <button onClick={() => setActivePage("settings")}>
          <span>⚙</span>
          <strong>Settings</strong>
          <small>Preferences</small>
        </button>
        <button>
          <span>👥</span>
          <strong>Referral Program</strong>
          <small>Earn 30%</small>
        </button>
      </div>

      <div className="settingsList profileCompactList">
        <Setting title="Personal Information" desc="Update your details" />
        <Setting title="Security" desc="Password and login activity" />
        <Setting title="Verification (KYC)" desc="Verify your identity" badge="Verified" />
        <Setting title="Notifications" desc="Email and push settings" />
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

function SettingsPage({ account, setAccount, tradeType, setTradeType, stake, setStake }) {
  const [theme, setTheme] = useState("Dark");
  const [confirmTrade, setConfirmTrade] = useState(true);
  const [animations, setAnimations] = useState(true);
  const [compactMode, setCompactMode] = useState(true);
  const [quickTrade, setQuickTrade] = useState(true);
  const [showPositions, setShowPositions] = useState(true);
  const [soundAlerts, setSoundAlerts] = useState(true);
  const [autoClose, setAutoClose] = useState(false);

  return (
    <div className="settingsPage mobilePage">
      <div className="settingsHero">
        <h1>Settings</h1>
        <p>Manage your account preferences and platform settings</p>
      </div>

      <div className="settingsLayout">
        <aside className="settingsSidebar">
          {[
            ["General", "Platform", "⚙"],
            ["Security", "Password", "🛡"],
            ["Account", "Profile", "♙"],
            ["KYC", "Identity", "▣"],
            ["Payment", "Methods", "▤"],
            ["Alerts", "Push", "🔔"],
          ].map(([title, desc, icon], index) => (
            <button key={title} className={index === 0 ? "active" : ""}>
              <span>{icon}</span>
              <div>
                <strong>{title}</strong>
                <small>{desc}</small>
              </div>
            </button>
          ))}
        </aside>

        <section className="settingsContent">
          <SettingsCard icon="⚙" title="Platform Preferences">
            <SettingSelect
              title="Default Account"
              desc="Choose account"
              value={account === "real" ? "Real Account" : "Demo Account"}
              onChange={(value) => setAccount(value === "Real Account" ? "real" : "demo")}
              options={["Real Account", "Demo Account"]}
            />

            <SettingSelect
              title="Default Trade Type"
              desc="Preferred trade type"
              value={tradeType}
              onChange={setTradeType}
              options={["Even/Odd", "Matches/Differs", "Over/Under", "Rise/Fall", "Touch/No Touch"]}
            />

            <div className="settingLine">
              <div>
                <strong>Default Stake</strong>
                <small>Set stake amount</small>
              </div>
              <div className="settingsStake">
                <button onClick={() => setStake((old) => Math.max(0.3, Number(old) - 1))}>−</button>
                <span>{money(stake)}</span>
                <button onClick={() => setStake((old) => Number(old) + 1)}>+</button>
              </div>
            </div>

            <CheckLine checked={confirmTrade} setChecked={setConfirmTrade} label="Confirm before placing trade" />
          </SettingsCard>

          <SettingsCard icon="▣" title="Display Preferences" purple>
            <div className="settingLine">
              <div>
                <strong>Theme Mode</strong>
                <small>Choose theme</small>
              </div>

              <div className="themeSwitch">
                {["Dark", "Light", "System"].map((item) => (
                  <button key={item} className={theme === item ? "active" : ""} onClick={() => setTheme(item)}>
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <SwitchLine title="Animations" desc="Enable animations" checked={animations} setChecked={setAnimations} />
            <SwitchLine title="Compact Mode" desc="Better mobile view" checked={compactMode} setChecked={setCompactMode} />
          </SettingsCard>

          <SettingsCard icon="↗" title="Trading Preferences" green>
            <SwitchLine title="Quick Trade" desc="One-click trading" checked={quickTrade} setChecked={setQuickTrade} />
            <SwitchLine title="Show Positions" desc="Positions on chart" checked={showPositions} setChecked={setShowPositions} />
            <SwitchLine title="Sound Alerts" desc="Trade event sounds" checked={soundAlerts} setChecked={setSoundAlerts} />
            <SwitchLine title="Auto Close" desc="Close on profit" checked={autoClose} setChecked={setAutoClose} />
          </SettingsCard>
        </section>
      </div>
    </div>
  );
}

function SettingsCard({ icon, title, children, purple, green }) {
  return (
    <div className="settingsCard">
      <div className="settingsCardTitle">
        <span className={purple ? "purple" : green ? "greenBg" : ""}>{icon}</span>
        <strong>{title}</strong>
      </div>
      {children}
    </div>
  );
}

function SettingSelect({ title, desc, value, onChange, options }) {
  return (
    <div className="settingLine">
      <div>
        <strong>{title}</strong>
        <small>{desc}</small>
      </div>
      <select value={value} onChange={(e) => onChange?.(e.target.value)}>
        {options.map((item) => <option key={item}>{item}</option>)}
      </select>
    </div>
  );
}

function CheckLine({ checked, setChecked, label }) {
  return (
    <label className="checkLine">
      <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function SwitchLine({ title, desc, checked, setChecked }) {
  return (
    <div className="settingLine">
      <div>
        <strong>{title}</strong>
        <small>{desc}</small>
      </div>
      <button className={`switchBtn ${checked ? "on" : ""}`} onClick={() => setChecked((old) => !old)}>
        <i></i>
      </button>
    </div>
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
            <input type="number" min="1" value={amountUsd} onChange={(e) => setAmountUsd(e.target.value)} />

            {method !== "usdt" && (
              <>
                <label>{method === "mpesa" ? "M-Pesa phone" : "Phone number"}</label>
                <input placeholder="07XXXXXXXX or 2547XXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} />
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
        <button className="modalX" onClick={onClose}>×</button>

        <h2>Withdraw Funds</h2>
        <p>Minimum withdrawal is $5.</p>

        <label>Amount USD</label>
        <input type="number" min="5" value={amountUsd} onChange={(e) => setAmountUsd(e.target.value)} />

        <label>M-Pesa phone</label>
        <input placeholder="07XXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} />

        <button className="modalPrimary" onClick={() => onSubmit({ amountUsd: Number(amountUsd), phone })}>
          Request Withdrawal
        </button>
      </div>
    </div>
  );
}

function BotRunnerOverlay({ bot, botRunning, onClose, onStart, onStop, openTrades, closedTrades, transactions }) {
  const [tab, setTab] = useState("summary");

  const totalStake = [...openTrades, ...closedTrades].reduce((sum, trade) => sum + Number(trade.stake || 0), 0);
  const totalPayout = closedTrades.reduce((sum, trade) => sum + Number(trade.won ? trade.payout : 0), 0);
  const won = closedTrades.filter((trade) => trade.won).length;
  const lost = closedTrades.filter((trade) => !trade.won).length;
  const pl = closedTrades.reduce((sum, trade) => sum + (trade.won ? trade.profit : -trade.stake), 0);
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