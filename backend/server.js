import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const IntaSend = require("intasend-node");

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 5000);
const USD_RATE = Number(process.env.USD_RATE || 130);
const MIN_DEPOSIT_USD = Number(process.env.MIN_DEPOSIT_USD || 1);
const MIN_WITHDRAW_USD = Number(process.env.MIN_WITHDRAW_USD || 5);
const MAX_WITHDRAW_USD = Number(process.env.MAX_WITHDRAW_USD || 150000);
const TEST_MODE =
  String(process.env.INTASEND_TEST_MODE || "true").toLowerCase() === "true";

const DB_PATH =
  process.env.DB_PATH || path.join(__dirname, "data", "metabinary.json");

const FRONTEND_URLS = String(
  process.env.FRONTEND_URL || "http://localhost:5173"
)
  .split(",")
  .map((value) => value.trim().replace(/\/$/, ""))
  .filter(Boolean);

const PUBLIC_KEY = String(process.env.INTASEND_PUBLIC_KEY || "").trim();
const SECRET_KEY = String(process.env.INTASEND_SECRET_KEY || "").trim();

const app = express();

app.disable("x-powered-by");

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || FRONTEND_URLS.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin is not allowed by CORS."));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));

let database = {
  users: {},
  deposits: {},
  withdrawals: {},
  processedInvoices: {},
};

let saveQueue = Promise.resolve();

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random()
    .toString(16)
    .slice(2, 10)}`;
}

function roundMoney(value) {
  return Number(Number(value || 0).toFixed(2));
}

function cleanEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeKenyanPhone(value) {
  let phone = String(value || "").replace(/\D/g, "");

  if (phone.startsWith("0") && phone.length === 10) {
    phone = `254${phone.slice(1)}`;
  } else if (
    (phone.startsWith("7") || phone.startsWith("1")) &&
    phone.length === 9
  ) {
    phone = `254${phone}`;
  } else if (phone.startsWith("00254")) {
    phone = phone.slice(2);
  }

  if (!/^254[17]\d{8}$/.test(phone)) {
    throw new Error(
      "Enter a valid Kenyan phone number, for example 07XXXXXXXX."
    );
  }

  return phone;
}

function ensurePaymentKeys() {
  if (!PUBLIC_KEY || !SECRET_KEY) {
    throw new Error("IntaSend keys are not configured on the backend.");
  }
}

function intasendClient() {
  ensurePaymentKeys();
  return new IntaSend(PUBLIC_KEY, SECRET_KEY, TEST_MODE);
}

function getUser(email, name = "") {
  const normalizedEmail = cleanEmail(email);

  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    throw new Error("A valid email address is required.");
  }

  if (!database.users[normalizedEmail]) {
    database.users[normalizedEmail] = {
      email: normalizedEmail,
      name: String(name || normalizedEmail.split("@")[0]),
      brokerId: `MB${Math.floor(100000 + Math.random() * 900000)}`,
      demoBalance: 10000,
      realBalance: 0,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
  }

  return database.users[normalizedEmail];
}

function publicUser(user) {
  return {
    email: user.email,
    name: user.name,
    brokerId: user.brokerId,
    demoBalance: roundMoney(user.demoBalance),
    realBalance: roundMoney(user.realBalance),
  };
}

function providerErrorMessage(error) {
  if (!error) {
    return "Payment provider request failed.";
  }

  let raw;

  if (Buffer.isBuffer(error)) {
    raw = error.toString("utf8");
  } else if (typeof error === "string") {
    raw = error;
  } else if (error?.message) {
    raw = error.message;
  } else {
    try {
      raw = JSON.stringify(error);
    } catch {
      raw = String(error);
    }
  }

  try {
    const parsed = JSON.parse(raw);

    return (
      parsed.message ||
      parsed.detail ||
      parsed.error ||
      raw
    );
  } catch {
    return String(raw).slice(0, 400);
  }
}

function pickFirst(...values) {
  return values.find(
    (value) =>
      value !== undefined &&
      value !== null &&
      String(value).trim() !== ""
  );
}

function extractInvoiceId(payload = {}) {
  return String(
    pickFirst(
      payload.invoice_id,
      payload.invoiceId,
      payload.invoice?.invoice_id,
      payload.invoice?.id,
      payload.data?.invoice_id,
      payload.data?.invoice?.invoice_id,
      payload.result?.invoice_id,
      payload.id
    ) || ""
  );
}

function extractApiRef(payload = {}) {
  return String(
    pickFirst(
      payload.api_ref,
      payload.apiRef,
      payload.invoice?.api_ref,
      payload.data?.api_ref,
      payload.data?.invoice?.api_ref
    ) || ""
  );
}

function extractCheckoutUrl(payload = {}) {
  return String(
    pickFirst(
      payload.url,
      payload.checkout_url,
      payload.checkoutUrl,
      payload.payment_url,
      payload.data?.url,
      payload.data?.checkout_url,
      payload.invoice?.url
    ) || ""
  );
}

function extractTrackingId(payload = {}) {
  return String(
    pickFirst(
      payload.tracking_id,
      payload.trackingId,
      payload.id,
      payload.data?.tracking_id,
      payload.transactions?.[0]?.tracking_id,
      payload.data?.transactions?.[0]?.tracking_id
    ) || ""
  );
}

function normalizeStatus(payload = {}) {
  const raw = pickFirst(
    payload.state,
    payload.status,
    payload.invoice?.state,
    payload.invoice?.status,
    payload.data?.state,
    payload.data?.status,
    payload.data?.invoice?.state,
    payload.data?.invoice?.status,
    payload.transactions?.[0]?.status,
    payload.data?.transactions?.[0]?.status
  );

  return String(raw || "PENDING")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");
}

const PAID_STATUSES = new Set([
  "COMPLETE",
  "COMPLETED",
  "PAID",
  "SUCCESS",
  "SUCCESSFUL",
]);

const FAILED_STATUSES = new Set([
  "FAILED",
  "FAILURE",
  "CANCELLED",
  "CANCELED",
  "REVERSED",
  "EXPIRED",
]);

async function loadDatabase() {
  try {
    const raw = await fs.readFile(DB_PATH, "utf8");
    const parsed = JSON.parse(raw);

    database = {
      users: parsed.users || {},
      deposits: parsed.deposits || {},
      withdrawals: parsed.withdrawals || {},
      processedInvoices: parsed.processedInvoices || {},
    };
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Database load error:", error);
    }

    await saveDatabase();
  }
}

function saveDatabase() {
  const snapshot = JSON.stringify(database, null, 2);

  saveQueue = saveQueue.then(async () => {
    await fs.mkdir(path.dirname(DB_PATH), {
      recursive: true,
    });

    const temporaryPath = `${DB_PATH}.tmp`;

    await fs.writeFile(
      temporaryPath,
      snapshot,
      "utf8"
    );

    await fs.rename(
      temporaryPath,
      DB_PATH
    );
  });

  return saveQueue;
}

function findDepositByProviderReference(
  invoiceId,
  apiRef
) {
  return Object.values(database.deposits).find(
    (deposit) =>
      (invoiceId && deposit.invoiceId === invoiceId) ||
      (apiRef && deposit.apiRef === apiRef)
  );
}

async function creditDepositOnce(
  deposit,
  verifiedStatus
) {
  if (!deposit || deposit.credited) {
    return deposit;
  }

  if (!PAID_STATUSES.has(verifiedStatus)) {
    return deposit;
  }

  const invoiceKey =
    deposit.invoiceId || deposit.id;

  if (database.processedInvoices[invoiceKey]) {
    deposit.credited = true;
    deposit.status = "COMPLETED";
    deposit.updatedAt = nowIso();

    await saveDatabase();

    return deposit;
  }

  const user = getUser(deposit.email);

  user.realBalance = roundMoney(
    Number(user.realBalance) +
      Number(deposit.amountUsd)
  );

  user.updatedAt = nowIso();

  deposit.credited = true;
  deposit.status = "COMPLETED";
  deposit.completedAt = nowIso();
  deposit.updatedAt = nowIso();

  database.processedInvoices[invoiceKey] = {
    depositId: deposit.id,
    processedAt: nowIso(),
  };

  await saveDatabase();

  return deposit;
}

async function reconcileDeposit(deposit) {
  if (
    !deposit?.invoiceId ||
    deposit.credited ||
    FAILED_STATUSES.has(deposit.status)
  ) {
    return deposit;
  }

  try {
    const providerResponse =
      await intasendClient()
        .collection()
        .status(deposit.invoiceId);

    const status =
      normalizeStatus(providerResponse);

    deposit.providerStatusResponse =
      providerResponse;

    deposit.status = status;
    deposit.updatedAt = nowIso();

    if (PAID_STATUSES.has(status)) {
      await creditDepositOnce(
        deposit,
        status
      );
    } else {
      await saveDatabase();
    }
  } catch (error) {
    deposit.lastStatusError =
      providerErrorMessage(error);

    deposit.updatedAt = nowIso();

    await saveDatabase();
  }

  return deposit;
}

function responseForDeposit(deposit) {
  const user = getUser(deposit.email);

  return {
    ok: true,
    depositId: deposit.id,
    invoiceId: deposit.invoiceId,
    status: deposit.status,
    method: deposit.method,
    phone: deposit.phone,
    amountUsd: deposit.amountUsd,
    amountKes: deposit.amountKes,
    realBalance: roundMoney(
      user.realBalance
    ),
    credited: Boolean(deposit.credited),
    message:
      deposit.status === "COMPLETED"
        ? "Deposit completed successfully."
        : FAILED_STATUSES.has(
              deposit.status
            )
          ? `Deposit ${deposit.status.toLowerCase()}.`
          : "Payment is still pending.",
  };
}

app.get("/", (_req, res) => {
  res.json({
    ok: true,
    service: "MetaBinary payments backend",
    mode: TEST_MODE ? "sandbox" : "live",
    time: nowIso(),
  });
});

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    mode: TEST_MODE ? "sandbox" : "live",
  });
});

app.get(
  "/api/user/:email",
  async (req, res, next) => {
    try {
      const user = getUser(
        req.params.email
      );

      await saveDatabase();

      res.json({
        ok: true,
        ...publicUser(user),
      });
    } catch (error) {
      next(error);
    }
  }
);

app.post(
  "/api/deposit",
  async (req, res, next) => {
    try {
      const email = cleanEmail(
        req.body.email
      );

      const name = String(
        req.body.name ||
          "MetaBinary User"
      ).trim();

      const method = String(
        req.body.method || "mpesa"
      )
        .trim()
        .toLowerCase();

      const amountUsd = Number(
        req.body.amountUsd
      );

      const requestId = String(
        req.body.requestId ||
          makeId("client")
      );

      if (
        !Number.isFinite(amountUsd) ||
        amountUsd < MIN_DEPOSIT_USD
      ) {
        return res
          .status(400)
          .json({
            ok: false,
            message: `Minimum deposit is ${MIN_DEPOSIT_USD} USD.`,
          });
      }

      const existing =
        Object.values(
          database.deposits
        ).find(
          (deposit) =>
            deposit.email === email &&
            deposit.requestId ===
              requestId
        );

      if (existing) {
        return res
          .status(200)
          .json(
            responseForDeposit(
              existing
            )
          );
      }

      const user = getUser(
        email,
        name
      );

      const amountKes = Math.max(
        1,
        Math.round(
          amountUsd * USD_RATE
        )
      );

      const depositId =
        makeId("dep");

      const apiRef =
        `MB-${depositId}`.slice(
          0,
          64
        );

      if (method === "card") {
        const providerResponse =
          await intasendClient()
            .collection()
            .charge({
              first_name: String(
                name.split(/\s+/)[0] ||
                  "MetaBinary"
              ),
              last_name: String(
                name
                  .split(/\s+/)
                  .slice(1)
                  .join(" ") || "User"
              ),
              email,
              host:
                FRONTEND_URLS[0] ||
                "http://localhost:5173",
              amount:
                roundMoney(
                  amountUsd
                ),
              currency: "USD",
              api_ref: apiRef,
            });

        const invoiceId =
          extractInvoiceId(
            providerResponse
          );

        const checkoutUrl =
          extractCheckoutUrl(
            providerResponse
          );

        database.deposits[
          depositId
        ] = {
          id: depositId,
          requestId,
          apiRef,
          invoiceId,
          email: user.email,
          method: "card",
          phone: "",
          amountUsd:
            roundMoney(
              amountUsd
            ),
          amountKes,
          status:
            normalizeStatus(
              providerResponse
            ),
          credited: false,
          providerResponse,
          createdAt: nowIso(),
          updatedAt: nowIso(),
        };

        await saveDatabase();

        return res
          .status(201)
          .json({
            ok: true,
            depositId,
            invoiceId,
            checkoutUrl,
            status:
              database.deposits[
                depositId
              ].status,
            message:
              "Continue to the secure card checkout.",
          });
      }

      if (method !== "mpesa") {
        return res
          .status(400)
          .json({
            ok: false,
            message:
              "Choose M-Pesa or card deposit.",
          });
      }

      const phone =
        normalizeKenyanPhone(
          req.body.phone
        );

      const payload = {
        phone_number: phone,
        name,
        email,
        amount: amountKes,
        api_ref: apiRef,
      };

      if (
        process.env
          .INTASEND_CALLBACK_URL
      ) {
        payload.callback_url =
          process.env
            .INTASEND_CALLBACK_URL;
      }

      const providerResponse =
        await intasendClient()
          .collection()
          .mpesaStkPush(payload);

      const invoiceId =
        extractInvoiceId(
          providerResponse
        );

      database.deposits[
        depositId
      ] = {
        id: depositId,
        requestId,
        apiRef,
        invoiceId,
        email: user.email,
        method: "mpesa",
        phone,
        amountUsd:
          roundMoney(amountUsd),
        amountKes,
        status:
          normalizeStatus(
            providerResponse
          ),
        credited: false,
        providerResponse,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };

      await saveDatabase();

      return res
        .status(201)
        .json({
          ok: true,
          depositId,
          invoiceId,
          status:
            database.deposits[
              depositId
            ].status,
          amountUsd:
            roundMoney(
              amountUsd
            ),
          amountKes,
          message:
            "M-Pesa request sent. Complete it on your phone.",
        });
    } catch (error) {
      error.status =
        error.status || 502;

      error.message =
        providerErrorMessage(
          error
        );

      next(error);
    }
  }
);

app.get(
  "/api/deposit/:depositId/status",
  async (req, res, next) => {
    try {
      const deposit =
        database.deposits[
          req.params.depositId
        ];

      if (!deposit) {
        return res
          .status(404)
          .json({
            ok: false,
            message:
              "Deposit was not found.",
          });
      }

      await reconcileDeposit(
        deposit
      );

      return res.json(
        responseForDeposit(
          deposit
        )
      );
    } catch (error) {
      next(error);
    }
  }
);

async function paymentCallback(
  req,
  res,
  next
) {
  try {
    const invoiceId =
      extractInvoiceId(req.body);

    const apiRef =
      extractApiRef(req.body);

    const deposit =
      findDepositByProviderReference(
        invoiceId,
        apiRef
      );

    if (!deposit) {
      return res
        .status(202)
        .json({
          ok: true,
          message:
            "Callback received; no matching local deposit yet.",
        });
    }

    if (
      invoiceId &&
      !deposit.invoiceId
    ) {
      deposit.invoiceId =
        invoiceId;
    }

    await reconcileDeposit(
      deposit
    );

    return res.json(
      responseForDeposit(
        deposit
      )
    );
  } catch (error) {
    next(error);
  }
}

app.post(
  "/api/payment/callback",
  paymentCallback
);

app.post(
  "/api/intasend/callback",
  paymentCallback
);

app.post(
  "/api/withdraw",
  async (req, res, next) => {
    try {
      const email = cleanEmail(
        req.body.email
      );

      const name = String(
        req.body.name ||
          "MetaBinary User"
      ).trim();

      const amountUsd = Number(
        req.body.amountUsd
      );

      const requestId = String(
        req.body.requestId ||
          makeId("client")
      );

      const phone =
        normalizeKenyanPhone(
          req.body.phone
        );

      if (
        !Number.isFinite(amountUsd) ||
        amountUsd <
          MIN_WITHDRAW_USD
      ) {
        return res
          .status(400)
          .json({
            ok: false,
            message: `Minimum withdrawal is ${MIN_WITHDRAW_USD} USD.`,
          });
      }

      if (
        amountUsd >
        MAX_WITHDRAW_USD
      ) {
        return res
          .status(400)
          .json({
            ok: false,
            message: `Maximum withdrawal is ${MAX_WITHDRAW_USD} USD.`,
          });
      }

      const existing =
        Object.values(
          database.withdrawals
        ).find(
          (withdrawal) =>
            withdrawal.email ===
              email &&
            withdrawal.requestId ===
              requestId
        );

      if (existing) {
        const user = getUser(
          email,
          name
        );

        return res.json({
          ok:
            existing.status !==
            "FAILED",
          withdrawalId:
            existing.id,
          status:
            existing.status,
          realBalance:
            roundMoney(
              user.realBalance
            ),
          message:
            existing.message ||
            "Withdrawal already submitted.",
        });
      }

      const user = getUser(
        email,
        name
      );

      if (
        Number(user.realBalance) <
        amountUsd
      ) {
        return res
          .status(400)
          .json({
            ok: false,
            message:
              "Insufficient real-account balance.",
          });
      }

      ensurePaymentKeys();

      const withdrawalId =
        makeId("wd");

      const amountKes = Math.max(
        1,
        Math.round(
          amountUsd * USD_RATE
        )
      );

      user.realBalance =
        roundMoney(
          Number(
            user.realBalance
          ) - amountUsd
        );

      user.updatedAt = nowIso();

      database.withdrawals[
        withdrawalId
      ] = {
        id: withdrawalId,
        requestId,
        email,
        phone,
        amountUsd:
          roundMoney(
            amountUsd
          ),
        amountKes,
        status: "SUBMITTING",
        refunded: false,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };

      await saveDatabase();

      try {
        const providerResponse =
          await intasendClient()
            .payouts()
            .mpesa({
              currency: "KES",
              requires_approval:
                String(
                  process.env
                    .INTASEND_PAYOUT_REQUIRES_APPROVAL ||
                    "NO"
                ).toUpperCase(),
              transactions: [
                {
                  name,
                  account: phone,
                  amount:
                    String(
                      amountKes
                    ),
                  narrative:
                    `MetaBinary withdrawal ${withdrawalId}`,
                },
              ],
            });

        const status =
          normalizeStatus(
            providerResponse
          );

        const withdrawal =
          database.withdrawals[
            withdrawalId
          ];

        withdrawal.status =
          FAILED_STATUSES.has(
            status
          )
            ? "FAILED"
            : status === "PENDING"
              ? "PROCESSING"
              : status;

        withdrawal.trackingId =
          extractTrackingId(
            providerResponse
          );

        withdrawal.providerResponse =
          providerResponse;

        withdrawal.updatedAt =
          nowIso();

        if (
          withdrawal.status ===
          "FAILED"
        ) {
          user.realBalance =
            roundMoney(
              Number(
                user.realBalance
              ) + amountUsd
            );

          withdrawal.refunded =
            true;

          withdrawal.message =
            "The payout was rejected and the balance was restored.";
        } else {
          withdrawal.message =
            "Withdrawal submitted to M-Pesa.";
        }

        await saveDatabase();

        return res
          .status(201)
          .json({
            ok:
              withdrawal.status !==
              "FAILED",
            withdrawalId,
            trackingId:
              withdrawal.trackingId,
            status:
              withdrawal.status,
            amountUsd:
              withdrawal.amountUsd,
            amountKes:
              withdrawal.amountKes,
            realBalance:
              roundMoney(
                user.realBalance
              ),
            message:
              withdrawal.message,
          });
      } catch (
        providerError
      ) {
        const withdrawal =
          database.withdrawals[
            withdrawalId
          ];

        if (
          !withdrawal.refunded
        ) {
          user.realBalance =
            roundMoney(
              Number(
                user.realBalance
              ) + amountUsd
            );

          withdrawal.refunded =
            true;
        }

        withdrawal.status =
          "FAILED";

        withdrawal.message =
          providerErrorMessage(
            providerError
          );

        withdrawal.updatedAt =
          nowIso();

        await saveDatabase();

        return res
          .status(502)
          .json({
            ok: false,
            status: "FAILED",
            realBalance:
              roundMoney(
                user.realBalance
              ),
            message:
              withdrawal.message,
          });
      }
    } catch (error) {
      next(error);
    }
  }
);

app.get(
  "/api/transactions/:email",
  (req, res, next) => {
    try {
      const email = cleanEmail(
        req.params.email
      );

      const deposits =
        Object.values(
          database.deposits
        )
          .filter(
            (item) =>
              item.email === email
          )
          .map((item) => ({
            id: item.id,
            type: "Deposit",
            method: item.method,
            amountUsd:
              item.amountUsd,
            amountKes:
              item.amountKes,
            status: item.status,
            createdAt:
              item.createdAt,
          }));

      const withdrawals =
        Object.values(
          database.withdrawals
        )
          .filter(
            (item) =>
              item.email === email
          )
          .map((item) => ({
            id: item.id,
            type: "Withdrawal",
            method: "M-Pesa",
            amountUsd:
              -item.amountUsd,
            amountKes:
              -item.amountKes,
            status: item.status,
            createdAt:
              item.createdAt,
          }));

      res.json({
        ok: true,
        transactions: [
          ...deposits,
          ...withdrawals,
        ].sort(
          (a, b) =>
            new Date(
              b.createdAt
            ) -
            new Date(
              a.createdAt
            )
        ),
      });
    } catch (error) {
      next(error);
    }
  }
);

app.use((req, res) => {
  res.status(404).json({
    ok: false,
    message: `Route not found: ${req.method} ${req.path}`,
  });
});

app.use(
  (error, _req, res, _next) => {
    console.error(error);

    const status = Number(
      error.status || 500
    );

    res.status(status).json({
      ok: false,
      message:
        providerErrorMessage(
          error
        ) ||
        "Unexpected server error.",
    });
  }
);

await loadDatabase();

app.listen(PORT, () => {
  console.log(
    `MetaBinary backend running on port ${PORT} (${
      TEST_MODE
        ? "sandbox"
        : "live"
    })`
  );
});