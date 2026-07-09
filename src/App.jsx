import { useRef, useState } from "react";
import Chart from "./components/Chart.jsx";
import DigitBar from "./components/DigitBar.jsx";
import TradePanel from "./components/TradePanel.jsx";
import AIAssistant from "./components/AIAssistant.jsx";
import FreeBotBuilder from "./components/FreeBotBuilder.jsx";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

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
  const [menuOpen, setMenuOpen] = useState(false);

  const [depositAmount, setDepositAmount] = useState(10);
  const [depositPhone, setDepositPhone] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState(5);
  const [withdrawPhone, setWithdrawPhone] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState("");

  const [freeBotRunning, setFreeBotRunning] = useState(false);
  const [bulkCount, setBulkCount] = useState(5);

  const botIntervalRef = useRef(null);
  const botRunCountRef = useRef(0);
  const activeBotNameRef = useRef("");

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
    setMenuOpen(false);
    localStorage.removeItem("metabinary_user");
    setUser(null);
    setAuthMode("login");
  };

  const openModal = (name) => {
    setMenuOpen(false);
    setPaymentMessage("");
    setModal(name);
  };

  const addTransaction = (item) => {
    const tx = {
      id: Date.now() + Math.random(),
      time: new Date().toLocaleString(),
      ...item,
    };

    setTransactions((old) => [tx, ...old].slice(0, 80));
  };

  const pollDepositStatus = (apiRef, amountUsd) => {
    let attempts = 0;

    const timer = setInterval(async () => {
      attempts += 1;

      try {
        const res = await fetch(`${API_URL}/api/deposit/status/${apiRef}`);
        const data = await res.json();

        const status = String(data?.deposit?.status || "").toUpperCase();

        if (status === "COMPLETED") {
          clearInterval(timer);

          setBalances((old) => {
            const next = {
              ...old,
              real: Number((old.real + Number(amountUsd)).toFixed(2)),
            };

            return saveBalances(next);
          });

          addTransaction({
            type: "Deposit",
            account: "real",
            amount: Number(amountUsd),
            status: "Completed",
            method: "M-Pesa",
            phone: depositPhone,
          });

          setAccount("real");
          setPaymentMessage("Payment completed. Real balance updated.");
          alert("Payment completed. Real balance updated.");
        }

        if (attempts >= 40) {
          clearInterval(timer);
          setPaymentMessage(
            "STK Push sent. Waiting for callback. If payment was completed, refresh after callback."
          );
        }
      } catch {
        if (attempts >= 40) {
          clearInterval(timer);
        }
      }
    }, 3000);
  };

  const sendMpesaStkPush = async () => {
    const amount = Number(depositAmount);

    if (!amount || amount < 1) {
      alert("Minimum deposit is $1");
      return;
    }

    if (!depositPhone.trim()) {
      alert("Enter M-Pesa phone number");
      return;
    }

    try {
      setPaymentLoading(true);
      setPaymentMessage("Sending STK Push...");

      const res = await fetch(`${API_URL}/api/deposit/mpesa`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: user.email,
          amountUsd: amount,
          phone: depositPhone,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.message || "STK Push failed");
      }

      setPaymentMessage("STK Push sent. Check your phone and enter M-Pesa PIN.");

      addTransaction({
        type: "Deposit Pending",
        account: "real",
        amount,
        status: "Pending",
        method: "M-Pesa",
        phone: depositPhone,
      });

      if (data.apiRef) {
        pollDepositStatus(data.apiRef, amount);
      }
    } catch (error) {
      alert(error.message || "Failed to send STK Push");
      setPaymentMessage(error.message || "Failed to send STK Push");
    } finally {
      setPaymentLoading(false);
    }
  };

  const openCardCheckout = async () => {
    const amount = Number(depositAmount);

    if (!amount || amount < 1) {
      alert("Minimum deposit is $1");
      return;
    }

    try {
      setPaymentLoading(true);
      setPaymentMessage("Creating card checkout...");

      const res = await fetch(`${API_URL}/api/deposit/card`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: user.email,
          amountUsd: amount,
          phone: depositPhone,
          firstName: user.name || "MetaBinary",
          lastName: "Trader",
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.message || "Card checkout failed");
      }

      if (!data.checkoutUrl) {
        throw new Error("Checkout URL missing from IntaSend response");
      }

      addTransaction({
        type: "Card Deposit Started",
        account: "real",
        amount,
        status: "Pending",
        method: "Card",
        phone: user.email,
      });

      window.location.href = data.checkoutUrl;
    } catch (error) {
      alert(error.message || "Failed to create card checkout");
      setPaymentMessage(error.message || "Failed to create card checkout");
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleUsdtDeposit = () => {
    setPaymentMessage(
      "USDT is shown in the UI. We need your IntaSend crypto method enabled before real TRC20 deposits can work."
    );
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
      type: trade.botName ? `${trade.botName} Opened` : "Trade Opened",
      account,
      amount: tradeData.stake,
      status: "Running",
      method: trade.botName ? "Free Bot" : tradeData.contract,
      phone: trade.botName ? `${tradeData.contract} · ${tradeData.choice}` : tradeData.choice,
    });

    setTimeout(() => {
      const settled = decideTradeResult(trade);

      setOpenTrades((old) => old.filter((item) => item.id !== trade.id));
      setClosedTrades((old) => [settled, ...old].slice(0, 50));

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
        type: settled.botName
          ? `${settled.botName} ${settled.won ? "Won" : "Lost"}`
          : settled.won
          ? "Trade Won"
          : "Trade Lost",
        account: trade.account,
        amount: settled.won ? settled.profit : settled.stake,
        status: settled.status,
        method: settled.botName ? "Free Bot" : settled.contract,
        phone: `${settled.choice} · digit ${settled.resultDigit}`,
      });
    }, trade.duration * 1000);
  };

  const startFreeBot = (selectedBot = {}) => {
    if (freeBotRunning) return;

    const botName = selectedBot.name || "Over 2 Recovery";
    const stake = Number(selectedBot.stake || 1);
    const duration = Number(selectedBot.duration || 5);
    const prediction = Number(selectedBot.prediction || 2);

    botRunCountRef.current = 0;
    activeBotNameRef.current = botName;

    setFreeBotRunning(true);

    addTransaction({
      type: `${botName} Started`,
      account,
      amount: stake,
      status: "Running",
      method: "Free Bot",
      phone: botName,
    });

    const createBotTrade = () => {
      botRunCountRef.current += 1;

      let trade = {
        contract: selectedBot.contract || "Over/Under",
        choice: selectedBot.choice || "Over",
        stake,
        duration,
        prediction,
        payoutRate: 1.85,
        payout: Number((stake * 1.85).toFixed(2)),
        profit: Number((stake * 0.85).toFixed(2)),
        botName,
      };

      if (botName === "Over 2 Recovery") {
        const recoveryStake =
          botRunCountRef.current % 3 === 0 ? Number((stake * 2).toFixed(2)) : stake;

        trade = {
          contract: "Over/Under",
          choice: "Over",
          stake: recoveryStake,
          duration,
          prediction: 2,
          payoutRate: 1.85,
          payout: Number((recoveryStake * 1.85).toFixed(2)),
          profit: Number((recoveryStake * 0.85).toFixed(2)),
          botName,
        };
      }

      if (botName === "Even/Odd Hunter") {
        const choice = botRunCountRef.current % 2 === 0 ? "Even" : "Odd";

        trade = {
          contract: "Even/Odd",
          choice,
          stake,
          duration,
          prediction: 5,
          payoutRate: 1.9,
          payout: Number((stake * 1.9).toFixed(2)),
          profit: Number((stake * 0.9).toFixed(2)),
          botName,
        };
      }

      if (botName === "Rise/Fall Trend") {
        const choice = botRunCountRef.current % 2 === 0 ? "Rise" : "Fall";

        trade = {
          contract: "Rise/Fall",
          choice,
          stake,
          duration,
          prediction,
          payoutRate: 1.9,
          payout: Number((stake * 1.9).toFixed(2)),
          profit: Number((stake * 0.9).toFixed(2)),
          botName,
        };
      }

      if (botName === "Low Risk Demo Bot") {
        trade = {
          contract: "Over/Under",
          choice: "Over",
          stake,
          duration,
          prediction: 3,
          payoutRate: 1.75,
          payout: Number((stake * 1.75).toFixed(2)),
          profit: Number((stake * 0.75).toFixed(2)),
          botName,
        };
      }

      addTransaction({
        type: `${botName} Trade ${botRunCountRef.current}`,
        account,
        amount: trade.stake,
        status: "Opened",
        method: "Free Bot",
        phone: `${trade.contract} · ${trade.choice}`,
      });

      placeTrade(trade);
    };

    createBotTrade();

    botIntervalRef.current = setInterval(() => {
      createBotTrade();
    }, (duration + 2) * 1000);
  };

  const stopFreeBot = () => {
    if (botIntervalRef.current) {
      clearInterval(botIntervalRef.current);
      botIntervalRef.current = null;
    }

    const botName = activeBotNameRef.current || "Free Bot";

    setFreeBotRunning(false);

    addTransaction({
      type: `${botName} Stopped`,
      account,
      amount: 0,
      status: "Stopped",
      method: "Free Bot",
      phone: botName,
    });
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

          <button className="depositBtn" onClick={() => openModal("depositOptions")}>
            Deposit
          </button>

          <button className="topMiniBtn desktopOnly" onClick={() => openModal("withdraw")}>
            Withdraw
          </button>

          <button className="topMiniBtn desktopOnly" onClick={() => openModal("history")}>
            History
          </button>

          <div className="menuWrap">
            <button
              className="iconBtn"
              onClick={() => setMenuOpen((old) => !old)}
              title="Menu"
            >
              ☰
            </button>

            {menuOpen && (
              <div className="menuDropdown">
                <div className="menuUser">
                  <strong>{user.name}</strong>
                  <small>{user.email}</small>
                  <small>Broker ID: {user.brokerId}</small>
                </div>

                <button onClick={() => openModal("depositOptions")}>Deposit</button>
                <button onClick={() => openModal("withdraw")}>Withdraw</button>
                <button onClick={() => openModal("history")}>History</button>
                <button onClick={() => setActivePage("analysis")}>Market Analyse</button>
                <button onClick={() => setActivePage("tradingview")}>Trading View</button>
                <button className="logoutMenuBtn" onClick={logout}>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="layout">
        {activePage !== "freebot" && (
          <aside className="leftPanel">
            <h3>Open Positions</h3>

            {openTrades.length === 0 ? (
              <p>No open trades</p>
            ) : (
              openTrades.map((trade) => (
                <div className="positionCard" key={trade.id}>
                  <strong>{trade.choice}</strong>
                  <small>
                    {trade.botName ? `${trade.botName} · ` : ""}
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
                  <small>{trade.botName || trade.choice}</small>
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
        )}

        {activePage === "freebot" ? (
          <FreeBotBuilder
            freeBotRunning={freeBotRunning}
            startFreeBot={startFreeBot}
            stopFreeBot={stopFreeBot}
            openTrades={openTrades}
            closedTrades={closedTrades}
            transactions={transactions}
          />
        ) : (
          <>
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

            {activePage === "bulk" && (
              <BulkPanel
                bulkCount={bulkCount}
                setBulkCount={setBulkCount}
                runBulkTrades={runBulkTrades}
              />
            )}

            {activePage === "tradingview" && <TradingViewSidePanel />}

            {activePage === "analysis" && <AnalysisSidePanel />}
          </>
        )}
      </main>

      <AIAssistant />

      {modal === "depositOptions" && (
        <DarkPaymentModal
          title="Deposit Funds"
          subtitle="Choose payment method"
          close={() => setModal(null)}
        >
          <PaymentOption
            icon="▯"
            title="M-Pesa"
            subtitle="Instant mobile money"
            onClick={() => openModal("depositMpesa")}
          />

          <PaymentOption
            icon="▭"
            title="Credit/Debit Card"
            subtitle="Visa, Mastercard"
            onClick={() => openModal("depositCard")}
          />

          <PaymentOption
            icon="₿"
            title="USDT (TRC20)"
            subtitle="Cryptocurrency"
            onClick={() => openModal("depositUsdt")}
          />
        </DarkPaymentModal>
      )}

      {modal === "depositMpesa" && (
        <DarkPaymentModal
          title="M-Pesa Deposit"
          subtitle="Send real STK Push to your phone"
          close={() => setModal(null)}
          back={() => openModal("depositOptions")}
        >
          <label>Amount USD</label>
          <input
            type="number"
            min="1"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
          />

          <label>M-Pesa phone number</label>
          <input
            placeholder="07XXXXXXXX or 2547XXXXXXXX"
            value={depositPhone}
            onChange={(e) => setDepositPhone(e.target.value)}
          />

          <button
            className="darkPrimaryBtn"
            onClick={sendMpesaStkPush}
            disabled={paymentLoading}
          >
            {paymentLoading ? "Sending..." : "Send STK Push"}
          </button>

          {paymentMessage && <p className="paymentStatus">{paymentMessage}</p>}
        </DarkPaymentModal>
      )}

      {modal === "depositCard" && (
        <DarkPaymentModal
          title="Card Deposit"
          subtitle="Pay using Visa or Mastercard"
          close={() => setModal(null)}
          back={() => openModal("depositOptions")}
        >
          <label>Amount USD</label>
          <input
            type="number"
            min="1"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
          />

          <label>Phone number optional</label>
          <input
            placeholder="07XXXXXXXX"
            value={depositPhone}
            onChange={(e) => setDepositPhone(e.target.value)}
          />

          <button
            className="darkPrimaryBtn"
            onClick={openCardCheckout}
            disabled={paymentLoading}
          >
            {paymentLoading ? "Creating..." : "Continue to Card Payment"}
          </button>

          {paymentMessage && <p className="paymentStatus">{paymentMessage}</p>}
        </DarkPaymentModal>
      )}

      {modal === "depositUsdt" && (
        <DarkPaymentModal
          title="USDT (TRC20)"
          subtitle="Cryptocurrency deposit"
          close={() => setModal(null)}
          back={() => openModal("depositOptions")}
        >
          <div className="cryptoNotice">
            <strong>USDT TRC20 setup required</strong>
            <span>
              We need to confirm the exact IntaSend crypto method enabled on your
              account before real USDT deposits can work.
            </span>
          </div>

          <button className="darkPrimaryBtn" onClick={handleUsdtDeposit}>
            Check USDT Availability
          </button>

          {paymentMessage && <p className="paymentStatus">{paymentMessage}</p>}
        </DarkPaymentModal>
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

function PaymentOption({ icon, title, subtitle, onClick }) {
  return (
    <button className="paymentOption" onClick={onClick}>
      <div className="paymentIcon">{icon}</div>

      <div>
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </div>

      <div className="paymentArrow">→</div>
    </button>
  );
}

function DarkPaymentModal({ title, subtitle, close, back, children }) {
  return (
    <div className="darkModalOverlay">
      <div className="darkPaymentCard">
        <div className="darkModalHeader">
          <div>
            {back && (
              <button className="darkBackBtn" onClick={back}>
                ←
              </button>
            )}

            <h2>{title}</h2>
            <p>{subtitle}</p>
          </div>

          <button className="darkCloseBtn" onClick={close}>
            ×
          </button>
        </div>

        <div className="darkModalBody">{children}</div>
      </div>
    </div>
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