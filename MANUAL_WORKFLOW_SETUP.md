# N8N Manual Workflow Setup - Step-by-Step Instructions

**For users who prefer building workflows manually instead of importing JSON.**

---

## BEFORE YOU START

✅ Have these ready:
- N8N account at https://mizgind1t.app.n8n.cloud
- Google Sheet ID: `1jaYJZ44z8K8TYrCfrIAJ_K9BSly1GPRMXyCQTEox9Pg`
- API endpoint URLs from your app
- API authentication token
- Email for alerts

---

## WORKFLOW 1: DAILY REPORT GENERATOR

**Schedule:** Every day at 9:00 AM (Europe/Oslo)  
**Time needed:** ~15 minutes to set up

### Step 1: Create New Workflow

1. Click "Create new workflow" in N8N
2. Name it: `Daily Report Generator`
3. Click Settings (gear icon) → Select Timezone: `Europe/Oslo`

### Step 2: Add Cron Trigger Node

1. Click "+ Add nodes" → Search "Cron"
2. Add the **Cron** node
3. Configure:
   - **Trigger:** every
   - **Unit:** day
   - **Value:** 1
   - **Trigger at hour:** 9
   - **Trigger at minute:** 0
   - **Timezone:** Europe/Oslo
4. Click the node name and rename to: `Cron Trigger - 9am Daily`

### Step 3: Add Set Context Node

1. Click "+ Add nodes" → Search "Set"
2. Add the **Set** node
3. Click the node → Click "Add Row"
4. Set these values:
   ```
   execution_id = "exec_" + now().format("YYYYMMDDhhmmss")
   workflow_name = "Daily Report Generator"
   timestamp = now().toISO()
   timestamp_readable = now().format("YYYY-MM-DD HH:mm:ss")
   date_only = now().format("YYYY-MM-DD")
   niches = ["romance", "thriller", "self-help", "business", "cooking"]
   ```
5. Rename to: `Set Execution Context`
6. Connect: Cron Trigger → Set Context

### Step 4: Add HTTP Node

1. Click "+ Add nodes" → Search "HTTP"
2. Add the **HTTP Request** node
3. Configure:
   ```
   Method: GET
   URL: http://localhost:3000/api/search
   ```
4. Click "Add option" → Select "Query Parameters"
5. Add parameters:
   ```
   Name: niches
   Value: romance,thriller,self-help,business,cooking
   
   Name: limit
   Value: 5
   
   Name: include_volume
   Value: true
   
   Name: include_competition
   Value: true
   ```
6. Click "Add option" → Select "Headers"
7. Add header:
   ```
   Name: Authorization
   Value: Bearer {{env.API_TOKEN}}
   ```
8. Click dropdown "On Error" → Select "Continue Workflow"
9. Rename to: `HTTP - Fetch Search Data`
10. Connect: Set Context → HTTP node

### Step 5: Add Transform Function Node

1. Click "+ Add nodes" → Search "Function"
2. Add the **Function** node (not Function Item)
3. Paste this code:
```javascript
const context = $input.all()[0].json;
const searchData = $input.last().json;

const results = [];
if (Array.isArray(searchData)) {
  searchData.forEach(item => {
    results.push({
      "A": context.timestamp_readable,
      "B": context.date_only,
      "C": item.niche || 'unknown',
      "D": item.trending_keyword || '',
      "E": item.search_volume || 0,
      "F": item.competition_level || 'Unknown',
      "G": context.execution_id
    });
  });
}

return [{ json: { data: results, count: results.length } }];
```
4. Rename to: `Transform - Format for Sheets`
5. Connect: HTTP node → Transform node

### Step 6: Add Google Sheets Append Node

1. Click "+ Add nodes" → Search "Google Sheets"
2. Add the **Google Sheets** node
3. Click "Authenticate" → Select your Google account → Authorize
4. Configure:
   ```
   Mode: Append
   Spreadsheet ID: 1jaYJZ44z8K8TYrCfrIAJ_K9BSly1GPRMXyCQTEox9Pg
   Sheet Name: Daily Reports
   Data Mode: Define by map
   ```
5. Click "+ Add Mapping" for each column:
   ```
   From: A → To: Timestamp
   From: B → To: Date
   From: C → To: Niche
   From: D → To: Trend
   From: E → To: Search Volume
   From: F → To: Competition
   From: G → To: Execution ID
   ```
6. Rename to: `Google Sheets - Append Daily Reports`
7. Connect: Transform node → Google Sheets node

### Step 7: Add Execution Log Node

1. Click "+ Add nodes" → Search "Google Sheets"
2. Add another **Google Sheets** node
3. Configure:
   ```
   Mode: Append
   Spreadsheet ID: 1jaYJZ44z8K8TYrCfrIAJ_K9BSly1GPRMXyCQTEox9Pg
   Sheet Name: Execution Log
   Data Mode: Define by map
   ```
4. Add mappings:
   ```
   From: timestamp_readable → To: Timestamp
   From: workflow_name → To: Workflow
   Status = "SUCCESS" → To: Status
   From: execution_id → To: Execution ID
   ```
5. Rename to: `Google Sheets - Log Execution`
6. Connect: Previous Google Sheets node → This node

### Step 8: Add Error Handler

1. Right-click on the Transform node → "Handle Error"
2. Add the **Error Trigger** node
3. Click "+ Add nodes" after Error Trigger → Search "Gmail"
4. Add the **Gmail** node
5. Click "Authenticate" → Authorize your Gmail account
6. Configure:
   ```
   To: your-email@example.com
   Subject: [ALERT] Daily Report Generator - Execution Failed
   Text: 
   Workflow: {{workflow.name}}
   Execution ID: {{execution_id}}
   Timestamp: {{now()}}
   Error: {{error.message}}
   
   Check n8n: https://mizgind1t.app.n8n.cloud
   ```
7. Rename to: `Send Error Email`

### Step 9: Test the Workflow

1. Click "Test workflow" (or "Execute workflow")
2. Watch the execution in the right panel
3. Should see 5 rows appended to Daily Reports sheet
4. Check Execution Log sheet for success entry
5. If errors, check error panel for details

### Step 10: Deploy

1. Click "Save" (Ctrl+S)
2. Click "Activate workflow" toggle
3. Workflow will now run automatically at 9am daily

---

## WORKFLOW 2: COMPETITIVE ANALYSIS

**Schedule:** Monday 10:00 AM  
**Time needed:** ~20 minutes

### Quick Setup (using JSON import recommended for this complex workflow)

**Alternative: Manual Steps**

1. Create new workflow: `Competitive Analysis`
2. Add Cron trigger:
   - Trigger: every
   - Unit: week
   - Trigger at day: Monday
   - Hour: 10, Minute: 0
   - Timezone: Europe/Oslo

3. Add Set Context node (same as Workflow 1)

4. Add HTTP node:
   - URL: `http://localhost:3000/api/competitors`
   - Method: GET
   - Query: `niche={{niche}}`, `limit=10`
   - Header: `Authorization: Bearer {{env.API_TOKEN}}`

5. Add Function for saturation calculation:
```javascript
const item = $input.first().json;
const context = $input.all()[0].json;

const saturation = (item.competitors_count / 100000) * 100;
const opportunity = saturation < 40 && item.search_volume > 3000 ? '🎯 Opportunity' : '';

return {
  A: context.timestamp_readable,
  B: item.niche,
  C: item.competitor_name || '',
  D: item.book_title || '',
  E: item.reviews || 0,
  F: item.rating || 0,
  G: item.price || '$0.00',
  H: Math.round(saturation * 10) / 10,
  I: opportunity,
  J: context.execution_id
};
```

6. Add Google Sheets append to "Competitors" sheet
7. Add Execution Log node
8. Add error handler with email
9. Test and deploy

---

## WORKFLOW 3: TREND SUMMARY

**Schedule:** Sunday 6:00 PM  
**Time needed:** ~15 minutes

### Key Configuration

**Cron:**
- Trigger: every
- Unit: week
- Trigger at day: Sunday
- Hour: 18, Minute: 0

**HTTP Endpoint:**
- URL: `http://localhost:3000/api/trends`
- Query params: `period=week`, `niches=all`

**Transform Function:**
```javascript
const item = $input.first().json;
const context = $input.all()[0].json;

const current = item.current_volume || 0;
const previous = item.previous_volume || current;
const change = previous > 0 ? ((current - previous) / previous) * 100 : 0;
const status = change > 5 ? 'UP' : (change < -5 ? 'DOWN' : 'STABLE');

return {
  A: context.timestamp_readable,
  B: context.week,
  C: item.niche || 'unknown',
  D: status,
  E: `${change > 0 ? '+' : ''}${Math.round(change * 10) / 10}%`,
  F: current,
  G: previous,
  H: item.trending_keywords?.join(', ') || '',
  I: context.execution_id
};
```

**Google Sheets:**
- Sheet: "Trends"
- Columns: Timestamp, Week, Niche, Trend Status, Week-over-Week Change %, Current Volume, Previous Volume, Trending Keywords, Execution ID

---

## WORKFLOW 4: BOOK OUTLINE GENERATOR

**Schedule:** Wednesday 11:00 AM  
**Time needed:** ~20 minutes

### Key Configuration

**Cron:**
- Trigger: every
- Unit: week
- Trigger at day: Wednesday
- Hour: 11, Minute: 0

**Step 1:** Add Set Context

**Step 2:** Add HTTP - Fetch Trending Keywords
- URL: `http://localhost:3000/api/trending-keywords`
- Query: `limit=5`, `period=week`

**Step 3:** Add HTTP - Generate Outline (Choose one)

**Option A: OpenAI API**
```
Method: POST
URL: https://api.openai.com/v1/chat/completions
Header: Authorization: Bearer {{env.OPENAI_API_KEY}}
Body (JSON):
{
  "model": "gpt-4",
  "messages": [{
    "role": "user",
    "content": "Generate a 4-chapter book outline for: {{$input.first().json.keyword}}. Return as JSON with chapters array."
  }],
  "temperature": 0.7,
  "max_tokens": 1000
}
```

**Option B: Local API**
```
Method: POST
URL: http://localhost:3000/api/generate-outline
Body (JSON):
{
  "keyword": "{{$input.first().json.keyword}}",
  "format": "Full Novel",
  "target_audience": "Adults 25-45"
}
```

**Step 4:** Add Function to parse outline:
```javascript
const item = $input.first().json;
const context = $input.all()[0].json;

// Parse the response (adjust based on your API)
let outline = 'Default outline';
try {
  if (item.choices && item.choices[0]?.message?.content) {
    // OpenAI response
    outline = item.choices[0].message.content;
  } else if (item.chapters) {
    // Local API response
    outline = item.chapters.map(ch => `${ch.title}: ${ch.description}`).join(' | ');
  }
} catch (e) {
  outline = 'Failed to parse outline';
}

return {
  A: context.timestamp_readable,
  B: item.keyword || 'Generated Title',
  C: 'Full Novel',
  D: 'Adults 25-45',
  E: item.keyword || '',
  F: outline.split(' | ')?.[0] || 'Chapter 1',
  G: outline.split(' | ')?.[1] || 'Chapter 2',
  H: outline.split(' | ')?.[2] || 'Chapter 3',
  I: outline,
  J: item.competition_level || 'Medium',
  K: context.execution_id
};
```

**Step 5:** Google Sheets append to "Outlines" sheet
**Step 6:** Add Execution Log + error handler

---

## WORKFLOW 5: CONTENT RECOMMENDATIONS

**Schedule:** Friday 2:00 PM  
**Time needed:** ~15 minutes

### Key Configuration

**Cron:**
- Trigger: every
- Unit: week
- Trigger at day: Friday
- Hour: 14, Minute: 0

**HTTP Endpoint:**
```
URL: http://localhost:3000/api/weekly-summary
Query: include_scores=true
```

**Scoring Function:**
```javascript
const data = $input.first().json;
const context = $input.all()[0].json;

const calculateScores = (item) => {
  const marketScore = Math.min((item.search_volume || 0) / 10000 * 10, 10);
  const trendScore = Math.min((item.trend_change || 0) / 5 + 5, 10);
  const competitionScore = (item.market_saturation || 0) / 100 * 10;
  const overall = (marketScore + trendScore + (10 - competitionScore)) / 3;
  
  return {
    marketScore: Math.round(marketScore * 10) / 10,
    trendScore: Math.round(trendScore * 10) / 10,
    competitionScore: Math.round(competitionScore * 10) / 10,
    overall: Math.round(overall * 100) / 100,
    reasoning: `Market: ${marketScore}/10, Trend: ${trendScore}/10, Comp: ${competitionScore}/10`
  };
};

const recommendations = (data.items || [])
  .map(item => ({
    title: item.keyword || 'Unknown',
    format: item.format || 'Full Novel',
    niche: item.niche || 'Unknown',
    ...calculateScores(item)
  }))
  .sort((a, b) => b.overall - a.overall)
  .slice(0, 3);

return recommendations.map((rec, idx) => ({
  A: context.timestamp_readable,
  B: idx + 1,
  C: rec.title,
  D: rec.format,
  E: rec.niche,
  F: rec.marketScore,
  G: rec.trendScore,
  H: rec.competitionScore,
  I: rec.overall,
  J: rec.reasoning,
  K: context.execution_id
}));
```

**Google Sheets:**
- Sheet: "Recommendations"
- Maps top 3 scored items

---

## COMMON NODE CONFIGURATIONS

### Gmail Alert Node (All workflows)
```
Service: Gmail
To: your-email@example.com
Subject: [ALERT] {{workflow.name}} - Execution Failed
Text Body:
---
Workflow: {{workflow.name}}
Execution ID: {{execution_id}}
Timestamp: {{now()}}
Error: {{error.message}}

Details: {{error.description}}

Action: Check n8n logs at https://mizgind1t.app.n8n.cloud
---
```

### Google Sheets Execution Log (All workflows)
```
Mode: Append
Spreadsheet: 1jaYJZ44z8K8TYrCfrIAJ_K9BSly1GPRMXyCQTEox9Pg
Sheet: Execution Log

Mapping:
- timestamp_readable → Timestamp
- workflow_name → Workflow
- "SUCCESS" or "FAILED" → Status
- error_message (if any) → Error Message
- execution_id → Execution ID
- duration → Duration (seconds)
- records_count → Records Processed
```

---

## ENVIRONMENT VARIABLES

Set in N8N Settings → Environment Variables:

```
API_TOKEN=your_api_token_here
ALERT_EMAIL=your-email@example.com
OPENAI_API_KEY=sk-xxx (only if using AI)
```

---

## TESTING EACH WORKFLOW

### Workflow 1 Test
1. Open workflow
2. Click "Test" button (play icon)
3. Check "Daily Reports" sheet → should have 5 new rows
4. Check "Execution Log" sheet → should have 1 SUCCESS entry
5. Verify columns match expected values

### Workflow 2-5 Tests
1. Same process as above
2. Adjust expected row count per workflow:
   - Competitive Analysis: ~10 rows per niche × 5 niches = 50 rows
   - Trend Summary: 5 rows (one per niche)
   - Book Outline Generator: 5 rows (one per keyword)
   - Content Recommendations: 3 rows (top 3 ranked)

### Error Testing
1. Break HTTP URL by adding typo
2. Click "Test"
3. Should see error trigger
4. Check email received within 1 minute
5. Check Execution Log shows FAILED status
6. Fix the URL
7. Click "Test" again to verify it works

---

## COMMON ISSUES & FIXES

### Issue: Workflow doesn't trigger at scheduled time
**Fix:** Check timezone in Cron node = Europe/Oslo AND in workflow settings

### Issue: Data not appending to Google Sheets
**Fix:** 
1. Verify sheet name matches exactly (case-sensitive)
2. Verify column headers exist in sheet
3. Verify column mapping is correct
4. Click "Test" in Google Sheets node to debug

### Issue: API returns 401 Unauthorized
**Fix:**
1. Check API_TOKEN is set in environment variables
2. Verify token hasn't expired
3. Test token manually with curl or Postman

### Issue: Function node shows syntax error
**Fix:**
1. Check for missing semicolons
2. Verify all parentheses are balanced
3. Check variable names are correct
4. Look at error message for exact line number

### Issue: Emails not sending
**Fix:**
1. Verify Gmail is authenticated (click node → check auth status)
2. Reauthorize Gmail credentials
3. Check email address is correct
4. Try sending test email directly from Gmail node

---

## DEPLOYMENT STEPS

1. ✅ Create all workflows manually or import JSONs
2. ✅ Test each workflow individually
3. ✅ Set environment variables (API_TOKEN, ALERT_EMAIL)
4. ✅ Verify all Google Sheets tabs exist with headers
5. ✅ Click "Activate" toggle on each workflow
6. ✅ Verify workflows show as "Active" with green indicator
7. ✅ Monitor Execution Log sheet first week

---

## MONITORING

**Daily:**
- Check Execution Log sheet first thing in morning
- Look for any FAILED entries
- Review error messages

**Weekly:**
- Review all data in each sheet
- Spot-check calculations
- Look for trends or anomalies

**Monthly:**
- Archive data older than 30 days
- Review workflow performance
- Optimize if needed

---

## NEXT STEPS

1. [ ] Set up Google Sheets with all 6 tabs
2. [ ] Create all workflows (manual or import JSONs)
3. [ ] Test each workflow
4. [ ] Deploy to production
5. [ ] Monitor first week
6. [ ] Document any customizations
7. [ ] Share access with team

