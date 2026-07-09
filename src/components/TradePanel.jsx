import { useMemo, useState } from "react";

export default function TradePanel({ onPlaceTrade }) {
  const [contract, setContract] = useState("Rise/Fall");
  const [duration, setDuration] = useState(5);
  const [stake, setStake] = useState(10);
  const [prediction, setPrediction] = useState(5);

  const payoutRate = useMemo(() => {
    if (contract === "Matches/Differs") return 1.087;
    if (contract === "Even/Odd") return 1.9;
    if (contract === "Over/Under") return 1.85;
    if (contract === "Touch/No Touch") return 1.75;
    return 1.9;
  }, [contract]);

  const payout = stake * payoutRate;
  const profit = payout - stake;

  const changeStake = (type) => {
    setStake((old) => {
      if (type === "minus") return Math.max(0.3, Number((old - 1).toFixed(2)));
      return Number((old + 1).toFixed(2));
    });
  };

  const place = (choice) => {
    if (stake < 0.3) {
      alert("Minimum stake is $0.30");
      return;
    }

    onPlaceTrade({
      contract,
      choice,
      stake,
      duration,
      prediction,
      payoutRate,
      payout,
      profit,
    });
  };

  const showDigitInput =
    contract === "Matches/Differs" ||
    contract === "Over/Under" ||
    contract === "Touch/No Touch";

  return (
    <aside className="tradePanel">
      <div className="learnBox">Learn about this trade type</div>

      <label>Contract type</label>
      <select value={contract} onChange={(e) => setContract(e.target.value)}>
        <option>Rise/Fall</option>
        <option>Even/Odd</option>
        <option>Matches/Differs</option>
        <option>Over/Under</option>
        <option>Touch/No Touch</option>
      </select>

      <label>Duration: {duration}s</label>
      <input
        type="range"
        min="1"
        max="30"
        value={duration}
        onChange={(e) => setDuration(Number(e.target.value))}
      />

      {showDigitInput && (
        <>
          <label>Prediction digit</label>
          <select
            value={prediction}
            onChange={(e) => setPrediction(Number(e.target.value))}
          >
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </>
      )}

      <label>Stake (USD)</label>
      <div className="stakeBox">
        <button onClick={() => changeStake("minus")}>-</button>
        <strong>${stake.toFixed(2)}</strong>
        <button onClick={() => changeStake("plus")}>+</button>
      </div>

      <div className="payoutBox">
        <span>Payout if you win</span>
        <strong>${payout.toFixed(2)}</strong>
      </div>

      <div className="payoutBox">
        <span>Net profit</span>
        <strong>${profit.toFixed(2)}</strong>
      </div>

      {contract === "Rise/Fall" && (
        <>
          <button className="riseBtn" onClick={() => place("Rise")}>
            Rise
          </button>
          <button className="fallBtn" onClick={() => place("Fall")}>
            Fall
          </button>
        </>
      )}

      {contract === "Even/Odd" && (
        <>
          <button className="riseBtn" onClick={() => place("Even")}>
            Even
          </button>
          <button className="fallBtn" onClick={() => place("Odd")}>
            Odd
          </button>
        </>
      )}

      {contract === "Matches/Differs" && (
        <>
          <button className="riseBtn" onClick={() => place("Matches")}>
            Matches {prediction}
          </button>
          <button className="fallBtn" onClick={() => place("Differs")}>
            Differs {prediction}
          </button>
        </>
      )}

      {contract === "Over/Under" && (
        <>
          <button className="riseBtn" onClick={() => place("Over")}>
            Over {prediction}
          </button>
          <button className="fallBtn" onClick={() => place("Under")}>
            Under {prediction}
          </button>
        </>
      )}

      {contract === "Touch/No Touch" && (
        <>
          <button className="riseBtn" onClick={() => place("Touch")}>
            Touch {prediction}
          </button>
          <button className="fallBtn" onClick={() => place("No Touch")}>
            No Touch {prediction}
          </button>
        </>
      )}
    </aside>
  );
}