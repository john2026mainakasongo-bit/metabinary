import { useMemo, useState } from "react";

function money(value) {
  return Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function TradePanel({ onPlaceTrade }) {
  const [contract, setContract] = useState("Even/Odd");
  const [duration, setDuration] = useState(5);
  const [stake, setStake] = useState(10);
  const [prediction, setPrediction] = useState(2);

  const contractOptions = [
    "Even/Odd",
    "Rise/Fall",
    "Matches/Differs",
    "Over/Under",
    "Touch/No Touch",
  ];

  const actions = useMemo(() => {
    if (contract === "Even/Odd") {
      return [
        { label: "Even", icon: "▦", className: "buyAction" },
        { label: "Odd", icon: "▵", className: "sellAction" },
      ];
    }

    if (contract === "Rise/Fall") {
      return [
        { label: "Rise", icon: "↗", className: "buyAction" },
        { label: "Fall", icon: "↘", className: "sellAction" },
      ];
    }

    if (contract === "Matches/Differs") {
      return [
        { label: "Matches", icon: "◎", className: "buyAction" },
        { label: "Differs", icon: "◇", className: "sellAction" },
      ];
    }

    if (contract === "Over/Under") {
      return [
        { label: "Over", icon: "↑", className: "buyAction" },
        { label: "Under", icon: "↓", className: "sellAction" },
      ];
    }

    return [
      { label: "Touch", icon: "●", className: "buyAction" },
      { label: "No Touch", icon: "○", className: "sellAction" },
    ];
  }, [contract]);

  const payoutRateFor = (choice) => {
    if (contract === "Matches/Differs" && choice === "Matches") return 8.333;
    if (contract === "Matches/Differs" && choice === "Differs") return 1.087;
    if (contract === "Even/Odd") return 1.818;
    if (contract === "Over/Under") return 1.85;
    return 1.9;
  };

  const buy = (choice) => {
    const cleanStake = Math.max(0.3, Number(stake || 0.3));
    const cleanDuration = Math.max(1, Number(duration || 5));
    const payoutRate = payoutRateFor(choice);
    const payout = Number((cleanStake * payoutRate).toFixed(2));
    const profit = Number((payout - cleanStake).toFixed(2));

    onPlaceTrade({
      contract,
      choice,
      stake: cleanStake,
      duration: cleanDuration,
      prediction: Number(prediction || 2),
      payoutRate,
      payout,
      profit,
    });
  };

  const increaseStake = () => {
    setStake((old) => Number((Number(old) + 1).toFixed(2)));
  };

  const decreaseStake = () => {
    setStake((old) => Math.max(0.3, Number((Number(old) - 1).toFixed(2))));
  };

  return (
    <aside className="tradePanel phoneTradePanel">
      <div className="mobileTradeCard">
        <div className="learnText">Learn about this trade type</div>

        <div className="contractSelectorCard">
          <div className="contractIcons">
            <span>▦</span>
            <span>▵</span>
          </div>

          <div className="contractText">
            <strong>{contract}</strong>
            {(contract === "Over/Under" ||
              contract === "Matches/Differs" ||
              contract === "Touch/No Touch") && (
              <small>Prediction digit: {prediction}</small>
            )}
          </div>

          <select
            value={contract}
            onChange={(e) => setContract(e.target.value)}
            aria-label="Contract type"
          >
            {contractOptions.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>

          <span className="contractArrow">›</span>
        </div>

        {(contract === "Over/Under" ||
          contract === "Matches/Differs" ||
          contract === "Touch/No Touch") && (
          <div className="mobilePredictionRow">
            <span>Prediction</span>

            <select
              value={prediction}
              onChange={(e) => setPrediction(Number(e.target.value))}
            >
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
                <option key={digit} value={digit}>
                  {digit}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="mobileTradeParams">
          <button
            className="mobileParam"
            onClick={() => setDuration((old) => (old >= 10 ? 1 : old + 1))}
          >
            <span>{duration} ticks</span>
          </button>

          <div className="mobileStakeBox">
            <button onClick={decreaseStake}>−</button>
            <strong>{money(stake)} USD</strong>
            <button onClick={increaseStake}>+</button>
          </div>

          <div className="mobileParam muted">
            <span>Stake</span>
          </div>
        </div>

        <div className="tradeActionGrid">
          {actions.map((action) => {
            const payout = Number((stake * payoutRateFor(action.label)).toFixed(2));

            return (
              <button
                key={action.label}
                className={`tradeActionBtn ${action.className}`}
                onClick={() => buy(action.label)}
              >
                <div className="actionMain">
                  <span className="actionIcon">{action.icon}</span>
                  <strong>{action.label}</strong>
                </div>

                <div className="actionFooter">
                  <span>Payout</span>
                  <strong>{money(payout)} USD</strong>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}