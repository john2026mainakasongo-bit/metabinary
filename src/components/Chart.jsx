import { useEffect, useMemo, useState } from "react";

export default function Chart({ activePage }) {
  const [price, setPrice] = useState(1010.22);
  const [points, setPoints] = useState(() =>
    Array.from({ length: 90 }, (_, i) => ({
      x: i,
      y: 1000 + Math.sin(i / 5) * 3 + Math.random() * 4,
    }))
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setPoints((oldPoints) => {
        const last = oldPoints[oldPoints.length - 1];
        const nextY = Math.max(
          996,
          Math.min(1013, last.y + (Math.random() - 0.42) * 1.8)
        );

        setPrice(nextY);

        return [
          ...oldPoints.slice(1),
          {
            x: last.x + 1,
            y: nextY,
          },
        ];
      });
    }, 900);

    return () => clearInterval(timer);
  }, []);

  const linePath = useMemo(() => {
    const width = 900;
    const height = 420;

    const minY = Math.min(...points.map((p) => p.y));
    const maxY = Math.max(...points.map((p) => p.y));
    const range = maxY - minY || 1;

    return points
      .map((p, index) => {
        const x = (index / (points.length - 1)) * width;
        const y = height - ((p.y - minY) / range) * height;

        return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(" ");
  }, [points]);

  const lastPoint = points[points.length - 1];
  const change = price - 1010;
  const activeTitle =
    activePage === "manual"
      ? "Manual Trader"
      : activePage === "bot"
      ? "Bot Builder"
      : "Bulk Trader";

  return (
    <div className="liveChart">
      <div className="marketCard">
        <div className="marketTop">
          <small>Volatility 100 (1s) Index</small>
          <span>⌄</span>
        </div>

        <h1>{price.toFixed(2)}</h1>

        <span className={change >= 0 ? "marketUp" : "marketDown"}>
          {change >= 0 ? "+" : ""}
          {change.toFixed(2)} ({change >= 0 ? "+" : ""}
          {((change / 1010) * 100).toFixed(2)}%) ● LIVE
        </span>
      </div>

      <div className="timeframes">
        {["1s", "5s", "10s", "30s", "1m", "5m", "1h"].map((t) => (
          <button className={t === "1s" ? "active" : ""} key={t}>
            {t}
          </button>
        ))}
      </div>

      <div className="modeLabel">
        <strong>{activeTitle}</strong>
        <span>Live synthetic movement</span>
      </div>

      <svg className="chartSvg" viewBox="0 0 900 420" preserveAspectRatio="none">
        <line x1="0" y1="80" x2="900" y2="80" className="priceLine" />

        <path d={linePath} className="chartLine" />

        <circle cx="890" cy="80" r="5" className="lastDot" />
      </svg>

      <div className="priceTag">{price.toFixed(2)}</div>

      <div className="chartNumbers right top">1012.05</div>
      <div className="chartNumbers right mid">1005.70</div>
      <div className="chartNumbers right low">999.36</div>
      <div className="chartNumbers bottom one">-167s</div>
      <div className="chartNumbers bottom two">-100s</div>
      <div className="chartNumbers bottom three">-33s</div>
      <div className="chartNumbers bottom four">-0s</div>
    </div>
  );
}