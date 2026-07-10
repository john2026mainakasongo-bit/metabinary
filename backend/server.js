import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://www.metabinaryfx.com",
    "https://metabinaryfx.com"
  ],
  credentials: true
}));

app.use(express.json());

const PORT = process.env.PORT || 5000;

let users = {};

function getUser(email) {
  if (!email) return null;

  if (!users[email]) {
    users[email] = {
      email,
      demoBalance: 10000,
      realBalance: 0,
      transactions: [],
      referralCode: "",
      referralApproved: false,
      referralCommission: 0
    };
  }

  return users[email];
}

app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "MetaBinary backend is running"
  });
});

app.get("/api/user/:email", (req, res) => {
  const user = getUser(req.params.email);
  res.json(user);
});

app.post("/api/deposit", async (req, res) => {
  const { email, amountUsd, phone, method } = req.body;

  const amount = Number(amountUsd || 0);

  if (!email) {
    return res.status(400).json({
      ok: false,
      message: "Email is required"
    });
  }

  if (amount < 1) {
    return res.status(400).json({
      ok: false,
      message: "Minimum deposit is 1 USD"
    });
  }

  const user = getUser(email);

  /*
    TEMPORARY:
    This adds money immediately so your live site works.
    Later we connect confirmed IntaSend callback only.
  */

  user.realBalance = Number((user.realBalance + amount).toFixed(2));

  user.transactions.unshift({
    id: Date.now(),
    type: "Deposit",
    method: method || "M-Pesa",
    amount,
    phone: phone || "",
    status: "Completed",
    time: new Date().toISOString()
  });

  res.json({
    ok: true,
    message: "Deposit added successfully",
    user
  });
});

app.post("/api/withdraw", (req, res) => {
  const { email, amountUsd, phone } = req.body;

  const amount = Number(amountUsd || 0);
  const user = getUser(email);

  if (!user) {
    return res.status(400).json({
      ok: false,
      message: "User not found"
    });
  }

  if (amount < 5) {
    return res.status(400).json({
      ok: false,
      message: "Minimum withdrawal is 5 USD"
    });
  }

  if (amount > user.realBalance) {
    return res.status(400).json({
      ok: false,
      message: "Insufficient real balance"
    });
  }

  user.realBalance = Number((user.realBalance - amount).toFixed(2));

  user.transactions.unshift({
    id: Date.now(),
    type: "Withdrawal",
    method: "M-Pesa",
    amount: -amount,
    phone: phone || "",
    status: "Processing",
    time: new Date().toISOString()
  });

  res.json({
    ok: true,
    message: "Withdrawal request received",
    user
  });
});

app.post("/api/referral/apply", (req, res) => {
  const { email, name } = req.body;

  const user = getUser(email);

  if (!user) {
    return res.status(400).json({
      ok: false,
      message: "User not found"
    });
  }

  const cleanName = String(name || email)
    .split("@")[0]
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();

  user.referralApproved = true;
  user.referralCode = `MB-${cleanName}-${Math.floor(1000 + Math.random() * 9000)}`;

  res.json({
    ok: true,
    referralCode: user.referralCode,
    referralLink: `https://www.metabinaryfx.com/register?ref=${user.referralCode}`,
    commissionRate: "30%"
  });
});

app.listen(PORT, () => {
  console.log(`MetaBinary backend running on port ${PORT}`);
});