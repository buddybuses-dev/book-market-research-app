# N8N Automation - Quick Reference Card

## CRON SCHEDULE SUMMARY

```
┌─────────────────────────────────────────────────────────────────┐
│         EUROPE/OSLO TIMEZONE - All times in CET/CEST            │
├─────────────────────────────────────┬──────────────┬────────────┤
│ Workflow                            │ Schedule     │ Cron       │
├─────────────────────────────────────┼──────────────┼────────────┤
│ 1. Daily Report Generator           │ Daily 9 AM   │ 0 9 * * *  │
│ 2. Competitive Analysis             │ Mon 10 AM    │ 0 10 * * 1 │
│ 3. Trend Summary                    │ Sun 6 PM     │ 0 18 * * 0 │
│ 4. Book Outline Generator           │ Wed 11 AM    │ 0 11 * * 3 │
│ 5. Content Recommendations          │ Fri 2 PM     │ 0 14 * * 5 │
└─────────────────────────────────────┴──────────────┴────────────┘
```

---

## DATA FLOW DIAGRAM

```
Cron Trigger
    ↓
Set Context (execution_id, timestamp)
    ↓
HTTP Node (fetch data from app API)
    ↓
Transform/Function Node (format & calculate)
    ↓
Google Sheets Append
    ↓
Log Execution (add row to Execution Log)
    ↓
[END - unless error occurs]
    ↓
Error Trigger → Send Email Alert
```

---

## NODE CONFIGURATION QUICK REFERENCE

### Cron Node
```
Timezone: Europe/Oslo
For Monday: trigger: "every", unit: "week", triggerAtDay: "Monday"
For Daily: trigger: "every", unit: "day", value: 1, triggerAtHour: 9
```

### HTTP Node
```
URL: http://localhost:3000/api/[endpoint]
Method: GET or POST
Header: Authorization: Bearer {{env.API_TOKEN}}
OnError: continueRegularFlow (don't stop on API errors)
```

### Google Sheets Append
```
Action: Append
Spreadsheet ID: 1jaYJZ44z8K8TYrCfrIAJ_K9BSly1GPRMXyCQTEox9Pg
Sheet Name: [varies per workflow]
Data Mode: define_by_map
```

### Function Node (Transform)
```javascript
// Always access input with $input
const item = $input.first().json;  // Single item
const items = $input.all();         // All items

// Return transformed data
return {
  json: { 
    colA: value,
    colB: value,
    ...
  }
};
```

### Error Handler
```
Node Type: Error Trigger
Actions:
  1. Email node (Send email on failure)
  2. Google Sheets append (Log error to Execution Log)
  3. Optional: Slack notification
```

---

## API ENDPOINT CHECKLIST

Before running workflows, ensure app has:

- [ ] GET /api/search → returns [{niche, trending_keyword, search_volume, competition_level}]
- [ ] GET /api/competitors?niche={{niche}} → returns [{competitor_name, book_title, reviews, rating, price, ...}]
- [ ] GET /api/trends?period=week → returns [{niche, current_volume, previous_volume, trending_keywords}]
- [ ] GET /api/trending-keywords?limit=5 → returns [{keyword, niche, search_volume}]
- [ ] GET /api/weekly-summary → returns {items: [{keyword, niche, format, search_volume, market_saturation, trend_change}]}

**All endpoints require:** `Authorization: Bearer {{API_TOKEN}}`

---

## GOOGLE SHEETS COLUMNS

### Workflow 1: Daily Reports
```
A: Timestamp | B: Date | C: Niche | D: Trend | E: Search Volume | F: Competition | G: Execution ID
```

### Workflow 2: Competitors
```
A: Timestamp | B: Niche | C: Competitor Name | D: Book Title | E: Reviews | F: Rating | G: Price | H: Market Saturation % | I: Opportunity Flag | J: Execution ID
```

### Workflow 3: Trends
```
A: Timestamp | B: Week | C: Niche | D: Trend Status | E: WoW Change % | F: Current Volume | G: Previous Volume | H: Trending Keywords | I: Execution ID
```

### Workflow 4: Outlines
```
A: Timestamp | B: Title | C: Format | D: Target Audience | E: Keywords | F: Chapter 1 | G: Chapter 2 | H: Chapter 3 | I: Full Outline | J: Competition Level | K: Execution ID
```

### Workflow 5: Recommendations
```
A: Timestamp | B: Rank | C: Book Title | D: Format | E: Niche | F: Market Size Score | G: Trend Score | H: Competition Score | I: Overall Score | J: Reasoning | K: Execution ID
```

### Execution Log (All workflows)
```
A: Timestamp | B: Workflow | C: Status | D: Error Message | E: Execution ID | F: Duration (seconds) | G: Records Processed
```

---

## KEY FORMULAS

### Market Saturation %
```javascript
saturation = (competitor_count / market_size) * 100;
// Example: (78000 / 100000) * 100 = 78%
```

### Market Size Score
```javascript
score = (search_volume / 10000) * 10;
// Normalize: 4500 volume → 4.5 score
```

### Trend Score
```javascript
score = Math.min(trend_change / 5 + 5, 10);
// Example: +12.5% trend → (12.5/5)+5 = 7.5 score
```

### Competition Score
```javascript
score = (market_saturation / 100) * 10;
// Example: 78% saturation → 7.8 score
```

### Overall Recommendation Score
```javascript
overall = (market + trend + (10 - competition)) / 3;
// Example: (4.5 + 7.5 + (10-7.8)) / 3 = 4.73 score
```

---

## ERROR HANDLING FLOW

```
Workflow executes normally
    ↓
[If ANY node errors]
    ↓
Error Trigger activates
    ↓
Send Email Alert
    │
    ├→ To: {{ALERT_EMAIL}}
    ├→ Subject: [ALERT] {{workflow.name}} - Execution Failed
    └→ Body includes: error message, timestamp, execution ID
    ↓
Log to Execution Log sheet
    ├→ Status: FAILED
    ├→ Error Message: {{error.message}}
    └→ Execution ID: {{execution_id}}
    ↓
[STOP]
```

---

## ENVIRONMENT VARIABLES

```bash
# REQUIRED
API_TOKEN=xxx                              # Your API authentication token
ALERT_EMAIL=your-email@example.com         # Where to send failure alerts

# OPTIONAL (for AI outline generation)
OPENAI_API_KEY=sk-xxx                      # OpenAI API key

# OPTIONAL (for advanced email)
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-specific-password
```

**How to set in N8N:**
1. Go to Settings → Environment Variables
2. Add each variable as KEY=VALUE
3. Save and restart n8n

---

## TROUBLESHOOTING QUICK FIXES

| Problem | Quick Fix |
|---------|-----------|
| Workflows not running on schedule | Check timezone = Europe/Oslo in Cron node |
| Data not appending to sheets | Verify column names match exactly (case-sensitive) |
| 401 Unauthorized errors | Check API_TOKEN in environment variables |
| Rows appending to wrong sheet | Verify sheetName parameter in Google Sheets node |
| Missing data in calculations | Check null values with `item?.property || 0` |
| Duplicate rows | Add execution_id to identify runs, check for retries |
| Email not sending | Reauthorize Gmail in n8n credentials |
| Slow execution (>5min) | Add pagination/limits to API endpoints |

---

## MONITORING CHECKLIST

### Daily
- [ ] Check Execution Log sheet for failures
- [ ] Verify morning Daily Report has 5 rows

### Weekly
- [ ] Review all workflow executions
- [ ] Spot-check data quality in each sheet
- [ ] Verify timestamps are correct
- [ ] Look for patterns in successful/failed runs

### Monthly
- [ ] Archive data older than 30 days
- [ ] Review API performance
- [ ] Optimize slow queries
- [ ] Update documentation if processes changed

---

## WORKFLOW FILES

```
📦 book-market-research-app/
├── 📄 N8N_SETUP_GUIDE.md                    ← Full setup documentation
├── 📄 N8N_API_REQUIREMENTS.md               ← API endpoints & integration
├── 📄 N8N_QUICK_REFERENCE.md                ← This file
├── 📄 workflow_1_daily_report_generator.json
├── 📄 workflow_2_competitive_analysis.json
├── 📄 workflow_3_trend_summary.json
├── 📄 workflow_4_book_outline_generator.json
└── 📄 workflow_5_content_recommendations.json
```

---

## TESTING SCRIPT

Run these manual tests before production:

```
✓ Workflow 1: Daily Reports
  1. Click Test → Verify 5 rows added to "Daily Reports" sheet
  2. Verify timestamp matches current time
  3. Disable API endpoint → Verify error email received

✓ Workflow 2: Competitive Analysis
  1. Click Test → Verify competitors added to "Competitors" sheet
  2. Check saturation % is between 0-100
  3. Verify opportunity flags are populated for low comp

✓ Workflow 3: Trend Summary
  1. Click Test → Verify data added to "Trends" sheet
  2. Check WoW % calculations are reasonable (±50%)
  3. Verify trend status is UP/DOWN/STABLE

✓ Workflow 4: Book Outline Generator
  1. Click Test → Verify outline added to "Outlines" sheet
  2. Check title and chapters are populated
  3. Verify format is set correctly

✓ Workflow 5: Content Recommendations
  1. Click Test → Verify top 3 ranked to "Recommendations" sheet
  2. Check overall score = (market + trend + (10-comp)) / 3
  3. Verify ranking is descending by score

✓ Error Handling
  1. Break an HTTP URL → Verify error email sent within 1 minute
  2. Check Execution Log shows FAILED status
  3. Verify error message includes useful information
```

---

## DEPLOYMENT CHECKLIST

Before going live:

```
PRE-DEPLOYMENT
- [ ] All API endpoints tested and working
- [ ] Google Sheets credentials authorized
- [ ] Email credentials authorized
- [ ] All environment variables set
- [ ] Each workflow manually tested
- [ ] All 6 sheet tabs created with headers

DEPLOYMENT
- [ ] Import all 5 workflow JSONs
- [ ] Set each workflow to Active
- [ ] Verify cron schedules match table above
- [ ] Run manual test of each workflow
- [ ] Verify Execution Log entries appear
- [ ] Set up monitoring alerts

POST-DEPLOYMENT
- [ ] Monitor first 24 hours closely
- [ ] Check Execution Log each morning
- [ ] Review data quality in sheets
- [ ] Document any issues/customizations
- [ ] Schedule weekly review meetings
```

---

## SUPPORT CONTACTS

- **N8N Docs:** https://docs.n8n.io
- **N8N Community:** https://community.n8n.io
- **API Errors:** Check app logs at `http://localhost:3000/logs`
- **Google Sheets Issues:** https://support.google.com/sheets
- **Your Dashboard:** https://mizgind1t.app.n8n.cloud

