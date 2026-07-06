# Story Market Desk Runbook (Step by Step)

This runbook is the full execution path for the current setup.

## 1) What is already done

- App build and type-check pass.
- n8n webhook sync from the app passes (`Workflow was started`).
- Secret leak scan passes.
- n8n sync endpoint supports optional webhook secret modes (`header`, `query`, `both`).
- Auto-sync option exists in the app for successful live runs.

## 2) One-command health check

Run from project root:

```powershell
npm run verify:all
```

Expected result:

- Build passes.
- `verify:n8n` returns status `200`.
- `verify:secrets` returns `secret scan passed`.

## 3) n8n workflow wiring (manual, requires your login)

Use this chain only:

1. `Webhook`
2. `Explode Sheet Rows` (Code)
3. `Append To Google Sheets`

Important:

- Do not use workflow page URLs in app config.
- Use webhook URL from the Webhook node (`.../webhook/...` or `.../webhook-test/...`).

## 4) Google Sheets setup (manual, requires your Google account)

1. Import `n8n/story-market-google-sheets-template.csv` into a new Google Sheet.
2. In `Append To Google Sheets`, connect your Google account.
3. Select the spreadsheet and target tab.
4. Save workflow and set it `Active`.

## 5) App environment

Set in `.env.local`:

- `SERPAPI_API_KEY`
- `N8N_WEBHOOK_URL`

Optional webhook auth hardening:

- `N8N_WEBHOOK_SECRET`
- `N8N_WEBHOOK_SECRET_MODE` (example: `header`)
- `N8N_WEBHOOK_SECRET_HEADER_NAME` (example: `X-N8N-SECRET`)
- `N8N_WEBHOOK_SECRET_QUERY_PARAM_NAME` (example: `secret`)

## 6) Live flow test

1. Start app (`npm run dev`) if needed.
2. In app, select tools and run `Run live`.
3. Enable `Auto-sync live run to n8n` if desired.
4. Or click `Send to n8n` manually.
5. Check n8n execution list and Google Sheets row insertion.

## 7) If something fails

Use this order:

1. Run `npm run verify:all`.
2. Check webhook URL in `.env.local` is a webhook endpoint (not `/workflow/...`).
3. Confirm workflow is active in n8n for production webhook.
4. If using webhook auth, ensure app and n8n use same secret mode/key.

## 8) Production routine

Before publishing updates:

1. `npm run verify:all`
2. Trigger one `Send to n8n` test
3. Confirm one new row in Google Sheets
4. Commit (without `.env.local`)
