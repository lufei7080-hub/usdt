# USDT ⇄ ILS Exchange

Compliance-first USDT↔ILS exchange website for Israeli users (default language: **Hebrew / RTL**), plus a Windows desktop ops app.

## Project layout


| Path                | Role                                         |
| ------------------- | -------------------------------------------- |
| `frontend/`         | React (CRA + CRACO), i18n `en` / `he` / `ar` |
| `backend/server.py` | FastAPI + MongoDB (Vercel serverless)        |
| Desktop app         | `../桌面程序/`（本地运行，不上传 Vercel）                  |


## Environment variables

Set these in Vercel (Production / Preview). See also `部署环境变量说明.txt`:


| Variable                    | Required    | Description                                                            |
| --------------------------- | ----------- | ---------------------------------------------------------------------- |
| `MONGO_URL`                 | Yes         | MongoDB Atlas connection string (`MONGODB_URI` also accepted)          |
| `JWT_SECRET`                | Yes         | Long random secret for admin JWT. **Do not** derive from `MONGO_URL`   |
| `ADMIN_PATH`                | Recommended | Fallback admin URL path if not set in MongoDB config                   |
| `CORS_ORIGINS`              | Optional    | Extra allowed origins, comma-separated (e.g. `https://new-domain.com`) |
| `TG_BOT` / `TG_CHAT_ID`     | Optional    | Telegram ops alerts (Chinese text OK — ops only)                       |
| `VERCEL_ENV` / `VERCEL_URL` | Auto        | Set by Vercel                                                          |


See `backend/.env.example`. `backend/.env` is gitignored and must never be committed.  
`JWT_SECRET=` [Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }) -as [byte[]])

## Admin entry

1. Set `adminPath` in MongoDB `config` (or `ADMIN_PATH` env).
2. Open `https://your-domain{adminPath}` (hidden path, not linked publicly).
3. Log in with the admin access key stored as a **bcrypt hash** in MongoDB.
4. Production refuses the built-in development default password.

## Default language

- Default: Hebrew (`he`), `dir=rtl`
- Switcher: English / Hebrew / Arabic
- API errors are English codes; the frontend maps them via `apiErrors.js` + `translations.js`

## Deploy (Vercel)

1. Connect the repo; **Root Directory = repository root** (the folder that contains `vercel.json`, not `frontend/`).
2. Configure env vars above (`MONGO_URL`, `JWT_SECRET`, `ADMIN_PATH`).
3. Atlas Network Access: allow Vercel egress (or `0.0.0.0/0` if needed).
4. Frontend build uses **npm** + `frontend/package-lock.json` (`npm ci` / `npm run build` in `vercel.json`).
5. Preview/production on `*.vercel.app` is allowed via CORS; custom domains can also be listed in `CORS_ORIGINS`.
6. After deploy, smoke-test: homepage → `/api/health` or `/api/config` → open chat → ping presence.

> Note: This project uses the legacy `builds` + `routes` style in `vercel.json` (Python API + CRA frontend in one repo). Do **not** mix a top-level `functions` block with `builds` — Vercel will fail the deployment.

Python Lambda size limit is set via `maxLambdaSize` on the Python build. For `maxDuration` / memory, set them in the Vercel project **Settings → Functions** if needed.

**Image uploads:** capped at **4MB** to stay under Vercel’s serverless request body limit (~4.5MB).

## Security notes

- Admin password is hashed (bcrypt); `GET /api/admin/config` never returns the plaintext password.
- Visitor chat reads require `session_id` + `visitor_phone` (header/query).
- Chat images use short-lived signed URLs.
- Login and chat write endpoints are IP rate-limited in MongoDB.
- Chat data retention: **72 hours** without interaction — session, messages, and images are auto-deleted (TTL + cleanup job, including GridFS).

## Desktop ops app

- Source: separate Windows app repo `wy-exchange-admin` (CustomTkinter + WebView2 chat)
- Build via that repo’s `build.bat` / `build.py`
- Config/session: Windows `%LOCALAPPDATA%\ExchangeAdmin\` (encrypted)
- Ops UI language: Chinese; chat bubbles keep Hebrew/RTL; times use `Asia/Jerusalem` 24h

## Legal pages

- `/terms`, `/privacy` — real routes (Footer Contact opens live chat)

