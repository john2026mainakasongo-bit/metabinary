import { useEffect, useState } from "react";

export default function DigitBar() {
  const [activeDigit, setActiveDigit] = useState(5);
  const [selectedDigit, setSelectedDigit] = useState(null);
  const [stats, setStats] = useState(
    Array.from({ length: 10 }, (_, digit) => ({
      digit,
      percent: 8 + Math.random() * 5,
    }))
  );

  useEffect(() => {
    const timer = setInterval(() => {
      const nextDigit = Math.floor(Math.random() * 10);
      setActiveDigit(nextDigit);

      setStats((old) =>
        old.map((item) => ({
          ...item,
          percent: Math.max(
            5,
            Math.min(15, item.percent + (Math.random() - 0.5) * 1.4)
          ),
        }))
      );
    }, 900);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="digitBar">
      {stats.map((item) => (
        <button
          className={[
            "digit",
            activeDigit === item.digit ? "activeDigit" : "",
            selectedDigit === item.digit ? "selectedDigit" : "",
          ].join(" ")}
          key={item.digit}
          onClick={() => setSelectedDigit(item.digit)}
        >
          <strong>{item.digit}</strong>
          <small>{item.percent.toFixed(1)}%</small>
        </button>
      ))}
    </div>
  );
}