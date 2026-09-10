# Trust Portfolio Analytics

A trustee decision-support dashboard for a charitable trust's investment restructuring proposal: current vs proposed portfolio, risk and stress testing, the two-gate legal framework (MPT Act / Circular 619 and Income-tax Act s.11(5)), fund research, implementation tracking and governance.

Built with Next.js 16, React 19, Tailwind CSS 4 and Recharts.

## What is public and what is private

| Shown to everyone | Signed-in users only |
| --- | --- |
| Portfolio analytics, weights and values, risk, legal framework, fund research | Implementation and Governance sections |
| Assumption register (read-only) | Editing shared records |
| Placeholder identity ("Client trust") | The client's name, references, location and related parties |

Identifying details are **never stored in this repository**. They come from the `DASHBOARD_IDENTITY` environment variable and are only sent to a signed-in user.

## Run locally

```bash
npm install
npm run create-user   # prompts for a username and password; writes .env.local
npm run dev           # http://localhost:3000
```

On Windows PowerShell, if scripts are blocked use `npm.cmd` instead of `npm`.

`npm run create-user` can be re-run to add users or change a password; `npm run create-user -- --list` and `-- --remove <name>` manage accounts. Passwords are stored only as salted scrypt hashes.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `AUTH_SECRET` | Yes, for sign-in | Random string (≥ 32 chars) that signs session cookies. Written by `create-user`. |
| `DASHBOARD_USERS` | Yes, for sign-in | `username:scrypt.<salt>.<hash>` entries, comma-separated. Written by `create-user`. |
| `DASHBOARD_IDENTITY` | Optional | One-line JSON with `name`, `reference`, `location`, `relatedEntity`, `statementSource`, `adviser`. Revealed to signed-in users. |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | For editing online | Upstash Redis for shared records. Added automatically when Upstash is connected in Vercel. |
| `DASHBOARD_DATA_DIR` | Optional | Where local shared records are kept (default `./data`). |

Keep all of these in `.env.local` locally — it is git-ignored.

## Shared records

Trade statuses, the monitoring calendar, trustee decisions, open items, the assumption register and the implementation target are shared between signed-in users, with an append-only change log (Governance → Change log).

- **Locally** they are stored in `data/records.json` and `data/audit.jsonl` (git-ignored — back this folder up).
- **On Vercel** they are stored in Upstash Redis. Without Redis the site still works, but records are read-only.

Builder weights, simulators and the currency view stay per browser.

## Deploy to Vercel

1. Import the GitHub repository in Vercel (framework: Next.js; no build settings needed).
2. **Settings → Environment Variables**: add `AUTH_SECRET`, `DASHBOARD_USERS` and `DASHBOARD_IDENTITY`, copying the values from your local `.env.local`.
3. **Storage → Upstash (Redis) → Create / Connect** to the project — this adds `KV_REST_API_URL` and `KV_REST_API_TOKEN`.
4. Redeploy (Deployments → ⋯ → Redeploy) so the new variables take effect.

## Source and limitations

Figures come from the trust's Investment & Portfolio Restructuring Proposal (September 2026). Every value is labelled as measured, calculated, estimated, assumption-based or unconfirmed; figures the source cannot support are shown as "Not available". Alpha is a holdings-based attribution proxy, not a regression alpha. Forward-looking figures are illustrative, not forecasts. This is an analytical tool — not legal, tax or investment advice.
