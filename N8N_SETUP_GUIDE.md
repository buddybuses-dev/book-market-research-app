# N8N Automation System - Complete Setup Guide

## Overview
Five scheduled workflows + error handling for book market research system. All workflows append to single Google Sheet with timestamp logging.

**Spreadsheet ID:** `1jaYJZ44z8K8TYrCfrIAJ_K9BSly1GPRMXyCQTEox9Pg`

---

## TIMEZONE: Europe/Oslo
All cron expressions use this timezone. Adjust if needed at workflow level.

---

## CRON EXPRESSIONS (Europe/Oslo)

| Workflow | Schedule | Cron Expression | UTC Offset |
|----------|----------|-----------------|-----------|
| Daily Report Generator | Daily at 9:00 AM | `0 9 * * *` | CET/CEST |
| Competitive Analysis | Monday at 10:00 AM | `0 10 * * 1` | CET/CEST |
| Trend Summary | Sunday at 6:00 PM | `0 18 * * 0` | CET/CEST |
| Book Outline Generator | Wednesday at 11:00 AM | `0 11 * * 3` | CET/CEST |
| Content Recommendations | Friday at 2:00 PM | `0 14 * * 5` | CET/CEST |

**Note:** N8N automatically converts to UTC. Set timezone in workflow settings to Europe/Oslo or use UTC equivalents:
- 9 AM CET = 8 AM UTC (winter) / 7 AM UTC (summer)
- Add `TZ=Europe/Oslo` to environment if timezone settings unavailable

---

## GOOGLE SHEETS STRUCTURE

### Sheet 1: Daily Reports
**Tab Name:** `Daily Reports`

| Column | Type | Example |
|--------|------|---------|
| A | Timestamp | 2026-07-06 09:15:32 |
| B | Date | 2026-07-06 |
| C | Niche | romance |
| D | Trend | Paranormal Romance |
| E | Search Volume | 4500 |
| F | Competition | High |
| G | Execution ID | exec_20260706_094532 |

**Append rows:** One per niche per run (5 rows per execution)

---

### Sheet 2: Competitors
**Tab Name:** `Competitors`

| Column | Type | Example |
|--------|------|---------|
| A | Timestamp | 2026-07-06 10:15:32 |
| B | Niche | romance |
| C | Competitor Name | Author1 |
| D | Book Title | "Midnight Echoes" |
| E | Reviews | 2450 |
| F | Rating | 4.5 |
| G | Price | $9.99 |
| H | Market Saturation % | 78 |
| I | Opportunity Flag | Low comp + High vol |
| J | Execution ID | exec_20260707_101532 |

**Update Frequency:** Weekly (Monday 10am)
**Append rows:** Add new competitors as found

---

### Sheet 3: Trends
**Tab Name:** `Trends`

| Column | Type | Example |
|--------|------|---------|
| A | Timestamp | 2026-07-06 18:15:32 |
| B | Week | 2026-W28 |
| C | Niche | thriller |
| D | Trend Status | UP |
| E | Week-over-Week Change % | +12.5 |
| F | Current Volume | 5200 |
| G | Previous Volume | 4650 |
| H | Trending Keywords | "dark romance thriller" |
| I | Execution ID | exec_20260705_181532 |

**Update Frequency:** Weekly (Sunday 6pm)

---

### Sheet 4: Outlines
**Tab Name:** `Outlines`

| Column | Type | Example |
|--------|------|---------|
| A | Timestamp | 2026-07-09 11:15:32 |
| B | Title | "The Midnight Detective" |
| C | Format | Full Novel |
| D | Target Audience | Adults 25-45 |
| E | Keywords | thriller, mystery, detective |
| F | Chapter 1 | Investigation Begins |
| G | Chapter 2 | Hidden Secrets |
| H | Chapter 3 | Plot Twist |
| I | Full Outline | [JSON or formatted text] |
| J | Competition Level | Medium |
| K | Execution ID | exec_20260709_111532 |

**Update Frequency:** Weekly (Wednesday 11am)

---

### Sheet 5: Recommendations
**Tab Name:** `Recommendations`

| Column | Type | Example |
|--------|------|---------|
| A | Timestamp | 2026-07-11 14:15:32 |
| B | Rank | 1 |
| C | Book Title | "Paranormal Detective" |
| D | Format | Full Novel |
| E | Niche | Romance/Thriller |
| F | Market Size Score | 8.5 |
| G | Trend Score | 9.2 |
| H | Competition Score | 7.1 |
| I | Overall Score | 8.27 |
| J | Reasoning | High trend + low sat |
| K | Execution ID | exec_20260711_141532 |

**Update Frequency:** Weekly (Friday 2pm)
**Rank:** Top 3 per niche/format combo

---

## ERROR HANDLING SETUP

### Global Error Handler Node
**Node Type:** Error Trigger
**Add to each workflow:**

1. **Error Catch Node:**
   - Catches all workflow errors
   - Logs timestamp + error message
   - Sends email notification

2. **Email Configuration:**
   - Service: Gmail / SendGrid / n8n Email
   - To: `your-email@example.com`
   - Subject: `[ALERT] N8N Workflow Failed - {{workflow.name}}`
   - Body:
     ```
     Workflow: {{workflow.name}}
     Execution ID: {{execution.id}}
     Time: {{now}}
     Error: {{error.message}}
     Error Details: {{error}}
     
     Check n8n dashboard: https://mizgind1t.app.n8n.cloud
     ```

3. **Execution Log Node:**
   - Append error row to "Execution Log" sheet
   - Fields: Timestamp | Workflow | Status | Error | Execution ID

### Execution Log Sheet
**Tab Name:** `Execution Log`

| Column | Type | Example |
|--------|------|---------|
| A | Timestamp | 2026-07-06 09:15:32 |
| B | Workflow | Daily Report Generator |
| C | Status | SUCCESS / FAILED |
| D | Error Message | [if failed] |
| E | Execution ID | exec_20260706_094532 |
| F | Duration (seconds) | 45 |
| G | Records Processed | 5 |

---

## WORKFLOW ARCHITECTURE

### Common Components (All Workflows)

```
Cron Trigger
    ↓
Set Execution Context
    ↓
Execute Main Logic
    ├─→ Fetch Data (HTTP nodes or API calls)
    ├─→ Transform Data
    └─→ Append to Google Sheets
    ↓
Log Execution
    ↓
[Error Handler] ← catches any failures
```

### Context Variables (Set in each workflow)
```json
{
  "execution_id": "exec_{{now.format('YYYYMMDDhhmmss')}}",
  "workflow_name": "[Workflow Name]",
  "timestamp": "{{now}}",
  "timezone": "Europe/Oslo"
}
```

---

## NODE CONFIGURATIONS

### 1. Cron Trigger Node
**Node Type:** Cron
**Settings:**
- Timezone: `Europe/Oslo`
- Cron Expression: [See table above]
- Example (Daily 9am):
  ```
  Cron Expression: 0 9 * * *
  Timezone: Europe/Oslo
  ```

### 2. Set Context Node
**Node Type:** Set
**Configuration:**
```json
{
  "execution_id": "exec_{{$now.format('YYYYMMDDhhmmss')}}",
  "workflow_name": "Daily Report Generator",
  "timestamp": "{{$now.toISO()}}",
  "timestamp_readable": "{{$now.format('YYYY-MM-DD HH:mm:ss')}}",
  "date_only": "{{$now.format('YYYY-MM-DD')}}",
  "week": "{{$now.format('YYYY-[W]WW')}}"
}
```

### 3. HTTP Request Node (Call App API)
**Node Type:** HTTP Request
**For fetching search data:**
```
Method: GET/POST
URL: https://localhost:3000/api/search (or your app endpoint)
Headers:
  - Authorization: Bearer {{env.API_TOKEN}}
  - Content-Type: application/json

Query Parameters (for Daily Report):
  - niches: romance,thriller,self-help,business,cooking
  - limit: 5
  - include_volume: true
  - include_competition: true
```

### 4. Google Sheets Append Rows Node
**Node Type:** Google Sheets
**Action:** Append
**Configuration:**
```
Authentication: [Connect Google account]
Spreadsheet ID: 1jaYJZ44z8K8TYrCfrIAJ_K9BSly1GPRMXyCQTEox9Pg
Sheet Name: Daily Reports (varies per workflow)
Data to Append: [See data mapping below]
```

### 5. Log Execution Node
**Node Type:** Google Sheets - Append
**Configuration:**
```
Spreadsheet ID: 1jaYJZ44z8K8TYrCfrIAJ_K9BSly1GPRMXyCQTEox9Pg
Sheet Name: Execution Log
Data:
  - Timestamp: {{$node.SetContext.json.timestamp_readable}}
  - Workflow: Daily Report Generator
  - Status: SUCCESS
  - Error Message: [empty]
  - Execution ID: {{$node.SetContext.json.execution_id}}
  - Duration: {{$execution.duration / 1000}}
  - Records Processed: {{$node.FetchData.json.count}}
```

### 6. Error Handler Node
**Node Type:** Error Trigger
**Connected to:** Catch errors from main logic
```
On Error:
  1. Send Email (Gmail)
  2. Append Error Log to "Execution Log" sheet
  3. Status: FAILED
  4. Include full error message
```

---

## DATA TRANSFORMATION EXAMPLES

### Transform API Response to Sheet Format
**Node Type:** Function (JavaScript)
**For Daily Report:**
```javascript
// Input: Array of search results from API
// Output: Array ready for Google Sheets

return items.map(item => ({
  "A": new Date().toLocaleString('en-NO', { timeZone: 'Europe/Oslo' }),
  "B": new Date().toLocaleDateString('en-NO', { timeZone: 'Europe/Oslo' }),
  "C": item.niche,
  "D": item.trending_keyword,
  "E": item.search_volume,
  "F": item.competition_level,
  "G": `exec_${new Date().getTime()}`
}));
```

### Calculate Market Saturation
**Node Type:** Function
```javascript
// Input: competitors array
return $input.all()[0].json.data.map(comp => {
  const saturation = (comp.reviews / 100000) * 100; // Formula: scale to %
  return {
    ...comp,
    "H": Math.round(saturation * 10) / 10,
    "I": saturation < 40 && comp.search_volume > 3000 
        ? "🎯 Opportunity" 
        : ""
  };
});
```

### Calculate Week-over-Week Changes
**Node Type:** Function
```javascript
// Input: current and previous week volumes
return items.map(item => {
  const change = ((item.current - item.previous) / item.previous) * 100;
  return {
    ...item,
    "D": change > 0 ? "UP" : (change < 0 ? "DOWN" : "STABLE"),
    "E": `${change > 0 ? '+' : ''}${Math.round(change * 10) / 10}%`
  };
});
```

---

## SPECIFIC WORKFLOW DETAILS

### Workflow 1: Daily Report Generator
**Schedule:** 9am daily
**Runtime:** ~2-3 minutes

**Steps:**
1. Cron trigger (9am)
2. Set execution context
3. HTTP: GET /api/search (5 default niches)
4. Transform response to sheet format
5. Append to "Daily Reports" sheet
6. Log execution
7. Error handler

**Data Sources:**
- App API: `/api/search?niches=romance,thriller,self-help,business,cooking`

**Expected Output:**
- 5 new rows in Daily Reports sheet
- Execution logged in Execution Log

---

### Workflow 2: Competitive Analysis
**Schedule:** Monday 10am
**Runtime:** ~5-7 minutes

**Steps:**
1. Cron trigger (Monday 10am)
2. Set execution context
3. For each niche:
   - HTTP: GET /api/competitors?niche={{niche}}
   - Transform data with saturation calculations
   - Flag opportunities (high volume + low competition)
4. Append all competitors to "Competitors" sheet
5. Calculate statistics (optional: send summary email)
6. Log execution
7. Error handler

**Data Sources:**
- App API: `/api/competitors?niche={{niche}}&limit=10`

**Calculations:**
- Market Saturation = (competitor_count / market_size) * 100
- Opportunity Flag = volume > 3000 AND saturation < 40%

---

### Workflow 3: Trend Summary
**Schedule:** Sunday 6pm
**Runtime:** ~3-4 minutes

**Steps:**
1. Cron trigger (Sunday 6pm)
2. Set execution context + calculate week number
3. HTTP: GET /api/trends (fetch weekly data)
4. Calculate week-over-week changes
5. Identify trending keywords
6. Append to "Trends" sheet
7. Log execution
8. Error handler

**Data Sources:**
- App API: `/api/trends?period=week&niches=all`

**Calculations:**
- WoW Change % = ((current - previous) / previous) * 100
- Trend Status = UP (>5%), DOWN (<-5%), STABLE

---

### Workflow 4: Book Outline Generator
**Schedule:** Wednesday 11am
**Runtime:** ~4-6 minutes (depends on AI)

**Steps:**
1. Cron trigger (Wednesday 11am)
2. Set execution context
3. HTTP: GET /api/trending-keywords (get top keywords)
4. For each top keyword:
   - Call AI (if available) or webhook to generate outline
   - OR: Call external API for outline generation
5. Transform outline to sheet format
6. Append to "Outlines" sheet
7. Log execution
8. Error handler

**Data Sources:**
- App API: `/api/trending-keywords?limit=5&period=week`
- AI Service: OpenAI API or n8n AI nodes (if configured)

**Outline Generation:**
- Option A: Use OpenAI webhook
  ```
  Prompt: "Generate a 3-chapter book outline for: {{keyword}}
  Format: JSON with chapters as array"
  ```
- Option B: Use local generation API
  ```
  POST /api/generate-outline
  {
    "keyword": "paranormal romance",
    "format": "Full Novel",
    "target_audience": "Adults 25-45"
  }
  ```

---

### Workflow 5: Content Recommendations
**Schedule:** Friday 2pm
**Runtime:** ~6-8 minutes

**Steps:**
1. Cron trigger (Friday 2pm)
2. Set execution context
3. Fetch week's data:
   - HTTP: GET /api/weekly-summary
4. Calculate scores:
   - Market Size Score (0-10)
   - Trend Score (0-10)
   - Competition Score (0-10)
   - Overall = (Market + Trend + (10 - Competition)) / 3
5. Rank top 3 per niche/format
6. Append to "Recommendations" sheet
7. Send summary email (optional)
8. Log execution
9. Error handler

**Score Calculations:**
```javascript
market_score = (search_volume / 10000) * 10; // normalize to 10
trend_score = Math.min(trend_percentage / 5 + 5, 10); // 0-10
competition_score = (saturation_percentage / 100) * 10; // 0-10
overall = (market_score + trend_score + (10 - competition_score)) / 3;
```

---

## ERROR HANDLING IMPLEMENTATION

### Error Trigger Node Configuration
```
Type: Error Trigger
Activate: YES
Node to attach to: End of main workflow chain

Actions on Error:
1. Send Email
   - To: your-email@example.com
   - Subject: [ALERT] {{workflow.name}} Failed
   - Include: Error message, workflow name, timestamp

2. Append to Execution Log
   - Status: FAILED
   - Error Message: {{error.message}}
   - Include full stack trace if available

3. Optional: Send Slack notification
   - Channel: #alerts
   - Message: Workflow failed, see email
```

### Email Template
```
Subject: [ALERT] {{workflow.name}} - Execution Failed

Body:
─────────────────────────────────────
⚠️ WORKFLOW EXECUTION FAILED

Workflow: {{workflow.name}}
Timestamp: {{now}}
Execution ID: {{execution.id}}

Error Message:
{{error.message}}

Error Details:
{{error.description}}

─────────────────────────────────────
Action Required: Check n8n logs
Dashboard: https://mizgind1t.app.n8n.cloud

```

---

## IMPLEMENTATION CHECKLIST

### Pre-Setup
- [ ] Create all 5 sheets in Google Sheets (Daily Reports, Competitors, Trends, Outlines, Recommendations, Execution Log)
- [ ] Add column headers to each sheet
- [ ] Get Google Sheets API credentials for n8n
- [ ] Set up email service (Gmail app password or SendGrid API key)
- [ ] Document API endpoints for book research app
- [ ] Get API token if authentication required
- [ ] Verify app is running and accessible

### Workflow 1: Daily Report Generator
- [ ] Create new workflow in n8n
- [ ] Add Cron trigger (9 * * * * with Europe/Oslo timezone)
- [ ] Add Set node for execution context
- [ ] Add HTTP node to call /api/search endpoint
- [ ] Add Function node to transform data
- [ ] Add Google Sheets node to append rows
- [ ] Add Log execution node (appends to Execution Log sheet)
- [ ] Add Error trigger with email handler
- [ ] Test with manual trigger
- [ ] Verify data appears in sheet
- [ ] Deploy to production

### Workflow 2: Competitive Analysis
- [ ] Create new workflow in n8n
- [ ] Add Cron trigger (0 10 * * 1 for Monday 10am)
- [ ] Add Set node for execution context
- [ ] Add Loop node for each niche
- [ ] Add HTTP nodes to fetch competitor data
- [ ] Add Function node for saturation calculation + opportunity flagging
- [ ] Add Google Sheets append nodes
- [ ] Add execution logging
- [ ] Add error handler
- [ ] Test workflow
- [ ] Deploy

### Workflow 3: Trend Summary
- [ ] Create new workflow in n8n
- [ ] Add Cron trigger (0 18 * * 0 for Sunday 6pm)
- [ ] Add Set node with week calculation
- [ ] Add HTTP node to fetch trend data
- [ ] Add Function node for WoW calculations
- [ ] Add Google Sheets append
- [ ] Add execution logging
- [ ] Add error handler
- [ ] Test with realistic data
- [ ] Deploy

### Workflow 4: Book Outline Generator
- [ ] Create new workflow in n8n
- [ ] Add Cron trigger (0 11 * * 3 for Wednesday 11am)
- [ ] Add Set node for context
- [ ] Add HTTP node to fetch trending keywords
- [ ] Add HTTP/AI node for outline generation
- [ ] Add Function node to format outline for sheets
- [ ] Add Google Sheets append
- [ ] Add execution logging
- [ ] Add error handler
- [ ] Test with sample keywords
- [ ] Deploy

### Workflow 5: Content Recommendations
- [ ] Create new workflow in n8n
- [ ] Add Cron trigger (0 14 * * 5 for Friday 2pm)
- [ ] Add Set node for context
- [ ] Add HTTP node to fetch weekly summary
- [ ] Add Function node for scoring calculations
- [ ] Add Sort + Limit for top 3 per category
- [ ] Add Google Sheets append
- [ ] Add execution logging
- [ ] Add error handler
- [ ] Test calculations
- [ ] Deploy

### Post-Setup
- [ ] Verify all cron schedules are active
- [ ] Test error handling by simulating failures
- [ ] Verify emails send on errors
- [ ] Check Execution Log sheet updates correctly
- [ ] Monitor first week of executions
- [ ] Adjust API calls if needed
- [ ] Document any custom modifications
- [ ] Set up backups for workflow configs

---

## TROUBLESHOOTING

| Issue | Solution |
|-------|----------|
| Workflow not triggering | Check timezone in Cron node = Europe/Oslo; Verify n8n is running |
| Google Sheets error | Reauthorize Google account in n8n; Check sheet exists and name matches |
| API calls failing | Verify API endpoint URL; Check API token/auth; Test endpoint manually |
| Data not appending | Check column mapping; Verify sheet has space; Check row format |
| Emails not sending | Verify email service credentials; Check to/from addresses; Test email manually |
| Duplicate rows | Check deduplication logic; Verify append not insert; Check execution IDs |

---

## MONITORING & OPTIMIZATION

### Weekly Review
- Check Execution Log sheet for failures
- Review data quality in each sheet
- Identify patterns in successful/failed runs
- Adjust cron times if needed

### Performance Optimization
- Monitor workflow execution times
- Cache API responses if possible
- Consider workflow scheduling conflicts
- Optimize Google Sheets operations (batch appends)

### Scaling
- If API rate limits hit: add delays or reduce query frequency
- If data volume grows: archive old sheets monthly
- Consider adding data validation nodes

