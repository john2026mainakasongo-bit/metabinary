import { useState } from "react";

export default function AIAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      from: "ai",
      text: "Hi, I am MetaBinary AI. Click scan or ask me about the market.",
    },
  ]);

  const sendMessage = () => {
    const text = input.trim();

    if (!text) return;

    setMessages((old) => [
      ...old,
      {
        from: "user",
        text,
      },
      {
        from: "ai",
        text: "Market scan complete. Volatility is active. Best demo setup: Over 2 with small stake. Avoid high martingale and protect your balance.",
      },
    ]);

    setInput("");
  };

  const scanMarket = () => {
    setMessages((old) => [
      ...old,
      {
        from: "ai",
        text: "AI scan: Volatility 100 is active. Trend strength 67%. Entry quality medium. Safer setup is small stake, short duration, and wait for two lower ticks before entry.",
      },
    ]);
  };

  return (
    <>
      <button className="aiBubble" onClick={() => setOpen(true)}>
        AI
      </button>

      {open && (
        <div className="aiWindow">
          <div className="aiHeader">
            <div>
              <strong>MetaBinary AI</strong>
              <small>Market scanner assistant</small>
            </div>

            <button onClick={() => setOpen(false)}>×</button>
          </div>

          <div className="aiQuick">
            <button onClick={scanMarket}>Scan Market</button>
            <button
              onClick={() =>
                setMessages((old) => [
                  ...old,
                  {
                    from: "ai",
                    text: "Free Bot uses demo recovery logic. Start with $1 stake, stop loss $10, take profit $20. Do not let it run without watching.",
                  },
                ])
              }
            >
              Free Bot Advice
            </button>
          </div>

          <div className="aiMessages">
            {messages.map((msg, index) => (
              <div
                className={msg.from === "ai" ? "aiMsg aiLeft" : "aiMsg aiRight"}
                key={index}
              >
                {msg.text}
              </div>
            ))}
          </div>

          <div className="aiInput">
            <input
              placeholder="Ask AI..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendMessage();
              }}
            />

            <button onClick={sendMessage}>Send</button>
          </div>
        </div>
      )}
    </>
  );
}