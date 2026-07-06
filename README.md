# Story Market Desk

A Next.js app for planning the same story across multiple formats and languages using the provided source payload.

## Included

- Top section with the exact request and response JSON
- Format selection for Kindle, paperback, hardcover, and audiobook
- Primary and alternate language selection for the same story
- Lightweight demand and royalty-style readout based on the supplied source data
- Search and action tool catalog with filtering, stack selection, and example request or response briefs
- Lower-cost recommended stack logic with SerpApi as the default live connector
- Industry essentials planning for metadata, rights, production, and launch readiness
- API-ready execution pack generated from the selected stack at `/api/tool-requests`
- One-click export of the execution pack as JSON or CSV
- Optional `n8n` webhook handoff for the full request bundle, live run snapshot, and run history through `/api/n8n-sync`
- Optional auto-sync mode that pushes each successful live run to `n8n`
- Live outbound execution for `serpapi:searchGoogleTrends`, `serpapi:searchGoogleTrendsTrendingNow`, and `dataforseo:KeywordsDataSearchVolumeLive` through `/api/tool-run`
- Saved live run history in the browser for repeat market checks

## Run locally

Use the Node install already present on this machine:

```powershell
cd C:\Users\Mizgin2\book-market-research-app
& "C:\Program Files\nodejs\npm.cmd" install
& "C:\Program Files\nodejs\npm.cmd" run dev
```

Then open `http://localhost:3000`.

## Environment setup

Copy `.env.example` to `.env.local` and fill the provider keys you actually use.

Default lower-cost setup for this app:

- `SERPAPI_API_KEY`
- `N8N_WEBHOOK_URL` for automation handoff

Optional webhook auth hardening:

- `N8N_WEBHOOK_SECRET`
- `N8N_WEBHOOK_SECRET_MODE` (`header`, `query`, or `both`)
- `N8N_WEBHOOK_SECRET_HEADER_NAME` (default `X-N8N-SECRET`)
- `N8N_WEBHOOK_SECRET_QUERY_PARAM_NAME` (default `secret`)

Optional advanced connectors:

- `DATAFORSEO_LOGIN`
- `DATAFORSEO_PASSWORD`
- `KEYWORDS_EVERYWHERE_API_KEY`
- `SCRAPINGBEE_API_KEY`
- `SE_RANKING_API_KEY`
- `SEMRUSH_API_KEY`
- `AMAZON_SP_API_WEBHOOK_URL` (Amazon bridge endpoint, for seller pricing live runs)
- `HALOSCAN_API_KEY`
- `SCRAPE_IT_CLOUD_API_KEY`
- `MAGIC_MEAL_KITS_API_KEY`

The execution panel and `/api/tool-requests` route report which connectors are configured and which environment keys are still missing.

If you use self-hosted `n8n`, point `N8N_WEBHOOK_URL` to your workflow webhook and use the `Send to n8n` button in the execution panel.

If your n8n webhook is protected by a secret, set the optional `N8N_WEBHOOK_SECRET*` environment variables. The app route at `/api/n8n-sync` will send the secret as header, query param, or both based on your mode.

## n8n to Google Sheets

Recommended flow in `n8n`:

1. `Webhook` node as the trigger.
2. `Google Sheets` node with `Append row`.
3. Map rows from `sheetRows`, not from the nested raw payload.

There is now an importable workflow template in [n8n/story-market-to-google-sheets.workflow.json](C:/Users/Mizgin2/book-market-research-app/n8n/story-market-to-google-sheets.workflow.json).

There is also a ready-made Google Sheets header/sample file in [n8n/story-market-google-sheets-template.csv](C:/Users/Mizgin2/book-market-research-app/n8n/story-market-google-sheets-template.csv). You can import that CSV into a blank sheet or copy the first row as your column headers.

After importing it in `n8n`:

1. Connect your Google Sheets account in the `Append To Google Sheets` node.
2. Choose the target spreadsheet and sheet tab.
3. Copy the webhook URL from the imported `Webhook` node if the path changes.
4. Paste that URL into [C:/Users/Mizgin2/book-market-research-app/.env.local](C:/Users/Mizgin2/book-market-research-app/.env.local) as `N8N_WEBHOOK_URL=`.
5. Restart the app if you changed the webhook URL.

The app now sends a flattened `sheetRows` array inside the webhook payload. Each row already includes:

- `syncedAt`
- `storyTitle`
- `primaryLanguage`
- `alternateLanguage`
- `selectedFormats`
- `selectedToolCount`
- `requestCount`
- `configuredConnectors`
- `missingConnectors`
- `toolKey`
- `appName`
- `module`
- `label`
- `moduleType`
- `connectorConfigured`
- `provider`
- `missingEnvKeys`
- `liveProvider`
- `liveToolKey`
- `liveStatus`
- `liveAverageInterest`
- `livePoints`

In `n8n`, set the `Google Sheets` node to append one row per item from `sheetRows`.

Live execution support:

- `serpapi:searchGoogleTrends`
- `serpapi:searchGoogleTrendsTrendingNow`
- `dataforseo:KeywordsDataSearchVolumeLive` (optional, not part of the default stack)
- `amazon-seller-central:searchCompetitivePricing` (via `AMAZON_SP_API_WEBHOOK_URL`)
- `amazon-seller-central:searchProductsPricing` (via `AMAZON_SP_API_WEBHOOK_URL`)

## Amazon bridge (SP-API compatible path)

To enable Amazon live runs in the app, point `AMAZON_SP_API_WEBHOOK_URL` to a webhook that returns JSON in the bridge shape.

There is an importable starter workflow in [n8n/story-market-amazon-bridge.workflow.json](C:/Users/Mizgin2/book-market-research-app/n8n/story-market-amazon-bridge.workflow.json).

After import:

1. Activate the workflow.
2. Copy the webhook URL from `Amazon Bridge Webhook`.
3. Put that URL into `.env.local` as `AMAZON_SP_API_WEBHOOK_URL=`.
4. Replace the mock code node with your real Amazon SP-API call and map it to the same response shape.

## Scripts

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run verify:n8n` (checks app -> /api/n8n-sync -> webhook path)
- `npm run verify:secrets` (quick local scan for accidental secrets in tracked files)
- `npm run verify:all` (build + n8n check + secret scan)

For full operational steps, see [RUNBOOK_STEP_BY_STEP.md](C:/Users/Mizgin2/book-market-research-app/RUNBOOK_STEP_BY_STEP.md).

## Production checklist

- Keep `.env.local` out of git (already ignored).
- Confirm `npm run verify:all` passes before push.
- Keep only `Webhook -> Code -> Google Sheets` active in n8n.
- If using secured webhook auth, set `N8N_WEBHOOK_SECRET*` values in `.env.local`.
