import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;
const USD_RATE = Number(process.env.USD_RATE || 130);

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://www.metabinaryfx.com",
      "https://metabinaryfx.com",
    ],
    credentials: true,
  })
);

app.use(express.json());

let users = {};

function getUser(email) {
  if (!email) return null;

  const cleanEmail = String(email).toLowerCase().trim();

  if (!users[cleanEmail]) {
    users[cleanEmail] = {
      email: cleanEmail,
      demoBalance: 10000,
      realBalance: 0,
      transactions: [],
      referralCode: "",
      referralApproved: false,
      referralCommission: 0,
      referrals: [],
      createdAt: new Date().toISOString(),
    };
  }

  return users[cleanEmail];
}

app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "MetaBinary backend is running",
    time: new Date().toISOString(),
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "MetaBinary Backend",
    status: "online",
  });
});

app.get("/api/user/:email", (req, res) => {
  const user = getUser(req.params.email);

  if (!user) {
    return res.status(400).json({
      ok: false,
      message: "Email is required",
    });
  }

  res.json(user);
});

app.post("/api/deposit", async (req, res) => {
  const { email, amountUsd, phone, method } = req.body;

  const amount = Number(amountUsd || 0);
  const amountKes = Math.round(amount * USD_RATE);

  if (!email) {
    return res.status(400).json({
      ok: false,
      message: "Email is required",
    });
  }

  if (amount < 1) {
    return res.status(400).json({
      ok: false,
      message: "Minimum deposit is 1 USD",
    });
  }

  const user = getUser(email);

  /*
    TEMPORARY LIVE TEST MODE:
    This adds the deposit immediately so your Render backend works.
    Before real public money, connect IntaSend callback confirmation only.
  */

  user.realBalance = Number((user.realBalance + amount).toFixed(2));

  user.transactions.unshift({
    id: Date.now(),
    type: "Deposit",
    method: method || "M-Pesa",
    amount,
    amountKes,
    phone: phone || "",
    status: "Completed",
    time: new Date().toISOString(),
  });

  res.json({
    ok: true,
    message: "Deposit added successfully",
    user,
  });
});

app.post("/api/withdraw", (req, res) => {
  const { email, amountUsd, phone } = req.body;

  const amount = Number(amountUsd || 0);
  const user = getUser(email);

  if (!user) {
    return res.status(400).json({
      ok: false,
      message: "User not found",
    });
  }

  if (amount < 5) {
    return res.status(400).json({
      ok: false,
      message: "Minimum withdrawal is 5 USD",
    });
  }

  if (amount > 150000) {
    return res.status(400).json({
      ok: false,
      message: "Maximum withdrawal is 150,000 USD",
    });
  }

  if (amount > user.realBalance) {
    return res.status(400).json({
      ok: false,
      message: "Insufficient real balance",
    });
  }

  user.realBalance = Number((user.realBalance - amount).toFixed(2));

  user.transactions.unshift({
    id: Date.now(),
    type: "Withdrawal",
    method: "M-Pesa",
    amount: -amount,
    amountKes: Math.round(amount * USD_RATE),
    phone: phone || "",
    status: "Processing",
    time: new Date().toISOString(),
  });

  res.json({
    ok: true,
    message: "Withdrawal request received",
    user,
  });
});

app.post("/api/referral/apply", (req, res) => {
  const { email, name } = req.body;

  const user = getUser(email);

  if (!user) {
    return res.status(400).json({
      ok: false,
      message: "User not found",
    });
  }

  const cleanName = String(name || email)
    .split("@")[0]
    .replace(/[^a-zA-Z0-9]/g, "")
    .toLowerCase();

  const code = `MB-${cleanName}-${Math.floor(1000 + Math.random() * 9000)}`.toUpperCase();

  user.referralApproved = true;
  user.referralCode = code;

  user.transactions.unshift({
    id: Date.now(),
    type: "Referral application",
    method: "Referral",
    amount: 0,
    status: "Approved",
    details: code,
    time: new Date().toISOString(),
  });

  res.json({
    ok: true,
    referralCode: code,
    referralLink: `https://www.metabinaryfx.com/register?ref=${code}`,
    commissionRate: 30,
    message: "Referral account approved",
  });
});

app.post("/api/referral/commission", (req, res) => {
  const { email, amountUsd, referredEmail } = req.body;

  const user = getUser(email);
  const amount = Number(amountUsd || 0);

  if (!user) {
    return res.status(400).json({
      ok: false,
      message: "User not found",
    });
  }

  if (!user.referralApproved) {
    return res.status(400).json({
      ok: false,
      message: "Referral account is not approved",
    });
  }

  const commission = Number((amount * 0.3).toFixed(2));

  user.referralCommission = Number((user.referralCommission + commission).toFixed(2));

  user.referrals.unshift({
    email: referredEmail || "new trader",
    commission,
    time: new Date().toISOString(),
  });

  user.transactions.unshift({
    id: Date.now(),
    type: "Referral commission",
    method: "Referral",
    amount: commission,
    status: "Completed",
    details: referredEmail || "New referral deposit",
    time: new Date().toISOString(),
  });

  res.json({
    ok: true,
    commission,
    totalCommission: user.referralCommission,
    user,
  });
});

app.listen(PORT, () => {
  console.log(`MetaBinary backend running on port ${PORT}`);
});