# MetaBinary v380 — Secure Server Trading

React/Vite frontend with an Express/MongoDB backend for accounts, trading,
M-PESA/Pesapal deposits, withdrawals, referrals, support and administration.

## What changed in v380

- Final trade digits are generated and retained by the backend; they are not
  derived from the public market clock and are never returned before settlement.
- Client requests cannot force an early settlement.
- Tick timing is enforced by the backend.
- Real-account limits cover stake size, rolling daily stake, concurrent trades
  and cooldown between trades.
- Withdrawal completion/rejection uses an atomic status claim to stop duplicate
  refunds and conflicting admin actions.
- Login, payment and trade routes are rate limited.
- Helmet security headers are enabled.
- Failed M-PESA callback processing returns an error so the provider may retry.
- Frontend and backend dependency audits report zero known vulnerabilities.

## Local setup

1. Copy `backend/.env.example` to `backend/.env` and add real credentials.
2. Never enable `SIMULATE_PAYMENTS` in production.
3. Run `npm install` in the project root and in `backend/`.
4. Start the backend with `npm run dev --prefix backend`.
5. Start the frontend with `npm run dev`.

## Production checks

- Use a long, unique `JWT_SECRET` and admin password.
- Set `FRONTEND_URL`, `FRONTEND_PUBLIC_URL` and `PUBLIC_BACKEND_URL` exactly.
- Use live Daraja/Pesapal values only after sandbox callback testing passes.
- Keep real-account limits conservative until monitored load tests are complete.
- Configure MongoDB backups and alerts.
- Use a licensed/independently auditable market or RNG source before accepting
  public real-money trading. These controls close known client-side prediction
  and timing exploits, but do not replace legal or regulatory review.

## Validation

```bash
npm run build
npm audit --omit=dev
node --check backend/server.js
npm --prefix backend audit --omit=dev
```
