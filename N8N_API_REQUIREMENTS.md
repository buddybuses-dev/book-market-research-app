# N8N Implementation Guide - API Requirements & Integration Points

## REQUIRED API ENDPOINTS

Your book research app must expose these endpoints for n8n to consume:

### 1. Search Endpoint
**Used by:** Daily Report Generator (Workflow 1)

```
GET /api/search
Query Parameters:
  - niches: comma-separated (romance,thriller,self-help,business,cooking)
  - limit: number (5)
  - include_volume: boolean (true)
  - include_competition: boolean (true)

Headers:
  - Authorization: Bearer {{API_TOKEN}}
  - Content-Type: application/json

Response Format:
[
  {
    "niche": "romance",
    "trending_keyword": "Paranormal Romance",
    "search_volume": 4500,
    "competition_level": "High"
  },
  ...
]

Error Handling:
  - Return 401 if auth invalid
  - Return 500 with error message on failure
```

---

### 2. Competitors Endpoint
**Used by:** Competitive Analysis (Workflow 2)

```
GET /api/competitors
Query Parameters:
  - niche: string (romance, thriller, etc.)
  - limit: number (10)

Headers:
  - Authorization: Bearer {{API_TOKEN}}

Response Format:
[
  {
    "niche": "romance",
    "competitor_name": "Author1",
    "book_title": "Midnight Echoes",
    "reviews": 2450,
    "rating": 4.5,
    "price": "$9.99",
    "competitors_count": 78000,
    "search_volume": 5200
  },
  ...
]
```

---

### 3. Trends Endpoint
**Used by:** Trend Summary (Workflow 3)

```
GET /api/trends
Query Parameters:
  - period: string (week, month)
  - niches: string (all OR comma-separated)

Headers:
  - Authorization: Bearer {{API_TOKEN}}

Response Format:
[
  {
    "niche": "thriller",
    "current_volume": 5200,
    "previous_volume": 4650,
    "trending_keywords": ["dark romance thriller", "psychological thriller"],
    "trend_direction": "up"
  },
  ...
]
```

---

### 4. Trending Keywords Endpoint
**Used by:** Book Outline Generator (Workflow 4)

```
GET /api/trending-keywords
Query Parameters:
  - limit: number (5)
  - period: string (week, month)
  - format: string (optional: novel, short_story, novelette)

Headers:
  - Authorization: Bearer {{API_TOKEN}}

Response Format:
[
  {
    "keyword": "paranormal romance",
    "niche": "romance",
    "search_volume": 4500,
    "competition_level": "High",
    "trend_change": "+12.5"
  },
  ...
]
```

---

### 5. Weekly Summary Endpoint
**Used by:** Content Recommendations (Workflow 5)

```
GET /api/weekly-summary
Query Parameters:
  - include_scores: boolean (true)

Headers:
  - Authorization: Bearer {{API_TOKEN}}

Response Format:
{
  "items": [
    {
      "keyword": "The Midnight Detective",
      "niche": "thriller",
      "format": "Full Novel",
      "search_volume": 5200,
      "market_saturation": 65,
      "trend_change": 12.5
    },
    ...
  ],
  "period": "2026-07-06",
  "total_opportunities": 15
}
```

---

## ENVIRONMENT VARIABLES (N8N Configuration)

Set these in your n8n environment:

```bash
# Required
API_TOKEN=your_book_research_app_api_token
API_BASE_URL=http://localhost:3000  # or your production URL

# Optional - for email notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-specific-password
ALERT_EMAIL=your-email@example.com

# Optional - for AI outline generation
OPENAI_API_KEY=sk-xxx...
OPENAI_MODEL=gpt-4

# Optional - for alternative AI services
ANTHROPIC_API_KEY=xxx...
```

---

## AUTHENTICATION SETUP

### Option 1: API Token (Recommended)
```javascript
// In your app backend
app.use((req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token !== process.env.N8N_API_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});
```

### Option 2: OAuth2 (Advanced)
If you want more security:
1. Set up OAuth2 provider in your app
2. In n8n: Create credentials with OAuth2 setup
3. Use credentials instead of token in HTTP nodes

---

## GOOGLE SHEETS SETUP

### Initial Sheet Creation
Create a new Google Sheet with these tabs:

**Tab Names:**
1. Daily Reports
2. Competitors
3. Trends
4. Outlines
5. Recommendations
6. Execution Log

### Headers Configuration

**Daily Reports:**
```
| Timestamp | Date | Niche | Trend | Search Volume | Competition | Execution ID |
```

**Competitors:**
```
| Timestamp | Niche | Competitor Name | Book Title | Reviews | Rating | Price | Market Saturation % | Opportunity Flag | Execution ID |
```

**Trends:**
```
| Timestamp | Week | Niche | Trend Status | Week-over-Week Change % | Current Volume | Previous Volume | Trending Keywords | Execution ID |
```

**Outlines:**
```
| Timestamp | Title | Format | Target Audience | Keywords | Chapter 1 | Chapter 2 | Chapter 3 | Full Outline | Competition Level | Execution ID |
```

**Recommendations:**
```
| Timestamp | Rank | Book Title | Format | Niche | Market Size Score | Trend Score | Competition Score | Overall Score | Reasoning | Execution ID |
```

**Execution Log:**
```
| Timestamp | Workflow | Status | Error Message | Execution ID | Duration (seconds) | Records Processed |
```

### Google Sheets API Credentials in N8N

1. Go to Google Cloud Console
2. Create new project
3. Enable "Google Sheets API"
4. Create Service Account
5. Generate JSON key file
6. In n8n: Create Google Sheets credentials
7. Paste JSON key content
8. Test connection

---

## ALTERNATIVE: Without AI Integration

If you don't have OpenAI API, replace Workflow 4 (Book Outline Generator):

### Option A: Use Local Generation API
```
POST /api/generate-outline
Body:
{
  "keyword": "paranormal romance",
  "format": "Full Novel",
  "target_audience": "Adults 25-45"
}

Response:
{
  "title": "Midnight Whispers",
  "chapters": [
    { "title": "The First Encounter", "description": "..." },
    { "title": "Hidden Secrets", "description": "..." },
    { "title": "The Revelation", "description": "..." },
    { "title": "Ever After", "description": "..." }
  ]
}
```

### Option B: Use Template-Based Generation
```javascript
// Simple template system - no AI needed
const templates = {
  'paranormal romance': {
    title: 'Midnight {{keyword}}',
    chapters: [
      'The Supernatural Encounter',
      'Forbidden Attraction',
      'Ancient Secrets Revealed',
      'Love Transcends Worlds'
    ]
  },
  'thriller': {
    title: 'The {{keyword}} Mystery',
    chapters: [
      'The Discovery',
      'Hidden Clues',
      'The Twist',
      'Resolution'
    ]
  }
};
```

---

## N8N CREDENTIALS SETUP

### Required Credentials in N8N

1. **Google Sheets**
   - Type: Google Sheets
   - Auth: Service Account (JSON key)
   - Test: Can connect to spreadsheet

2. **Email (Gmail)**
   - Type: Gmail
   - Auth: OAuth2
   - Test: Send test email

3. **HTTP Auth (Optional)**
   - Type: Bearer Token
   - Token: Your API_TOKEN

---

## TESTING EACH WORKFLOW

### Test Checklist

**Workflow 1: Daily Report Generator**
- [ ] Manual trigger at 9am
- [ ] Check if 5 rows added to Daily Reports sheet
- [ ] Verify timestamp is correct
- [ ] Check Execution Log has SUCCESS entry
- [ ] Test error handling: disable API and verify email sent

**Workflow 2: Competitive Analysis**
- [ ] Manual trigger on Monday morning
- [ ] Verify ~10 competitor rows per niche added
- [ ] Check saturation % calculations
- [ ] Verify opportunity flags are correct
- [ ] Test with invalid niche parameter

**Workflow 3: Trend Summary**
- [ ] Manual trigger Sunday evening
- [ ] Verify WoW % calculations
- [ ] Check week number format (YYYY-WXX)
- [ ] Test with missing previous data

**Workflow 4: Book Outline Generator**
- [ ] If using AI: verify OpenAI responses format correctly
- [ ] If using template: verify template keywords substitute correctly
- [ ] Check outline text splits into chapters correctly
- [ ] Verify format and target audience set correctly

**Workflow 5: Content Recommendations**
- [ ] Verify top 3 ranked by overall score
- [ ] Check score calculations:
     - Market = volume/10000 * 10
     - Trend = trend%/5 + 5 (capped at 10)
     - Comp = saturation%/100 * 10
     - Overall = (M + T + (10-C)) / 3
- [ ] Verify ranking order is descending

---

## MONITORING & ALERTS

### What to Monitor

**Daily:**
- Check Execution Log sheet every morning
- Look for FAILED status
- Review error messages if any

**Weekly:**
- Review each workflow's data quality
- Check for duplicates (compare Execution IDs)
- Verify trends make sense

**Monthly:**
- Archive old data (>30 days old)
- Review and optimize API queries
- Update alert email if needed

### Common Issues & Solutions

| Issue | Cause | Fix |
|-------|-------|-----|
| Workflow didn't run | Timezone mismatch | Set timezone to Europe/Oslo in both Cron and workflow settings |
| Rows not appending | Column names don't match | Verify exact column names in sheet headers match data mapping |
| API 401 errors | Invalid token | Verify API_TOKEN env var and token hasn't expired |
| Email not sending | Gmail credentials expired | Reauthorize Gmail in n8n credentials |
| Duplicate rows | Execution ran twice | Check if n8n retry is enabled; add deduplication check |
| Slow execution | Large API response | Add pagination/limit parameters to API calls |

---

## PRODUCTION CHECKLIST

- [ ] All workflows set to active
- [ ] Cron schedules verified for Europe/Oslo timezone
- [ ] Email alerts configured with correct recipient
- [ ] API tokens securely stored in environment variables
- [ ] Google Sheets credentials working
- [ ] All 6 sheets exist with correct headers
- [ ] Error trigger nodes on all workflows
- [ ] Manual test of each workflow successful
- [ ] Execution Log sheet has successful entries
- [ ] API endpoints are stable and responding
- [ ] Backup of workflow JSON files created
- [ ] Team notified of schedule/alerts
- [ ] Monitoring plan in place

---

## WORKFLOW IMPORT INSTRUCTIONS

1. In n8n Dashboard, click "Create New"
2. Select "Import Workflow"
3. Paste the workflow JSON from files:
   - workflow_1_daily_report_generator.json
   - workflow_2_competitive_analysis.json
   - workflow_3_trend_summary.json
   - workflow_4_book_outline_generator.json
   - workflow_5_content_recommendations.json

4. For each workflow:
   - Update HTTP node URLs if needed
   - Set API_TOKEN environment variable
   - Update alert email address
   - Test manually
   - Set active = true

---

## OPTIONAL: Schedule Drift Prevention

If you want to prevent overlapping executions:

Add to each workflow before main logic:
```
Node Type: Set
{
  "lock_key": "{{workflow.name}}_{{$now.format('YYYY-MM-DD HH')}}",
  "is_running": "checking..."
}

Then add a Check if execution is already running:
Node Type: Function
return $input.json.is_running === 'true' ? 
  { json: { message: 'Workflow already running, skipping' } } :
  { json: { message: 'Starting workflow' } };
```

This prevents duplicate runs if cron fires multiple times.

---

## COST OPTIMIZATION TIPS

1. **Reduce API calls:** Cache data when possible
2. **Batch operations:** Combine multiple rows before appending
3. **Conditional execution:** Skip workflows if no data changed
4. **Archive old sheets:** Move data > 90 days to archive sheet monthly
5. **Optimize AI calls:** Only generate outlines for top 3 keywords, not all

---

## NEXT STEPS

1. ✅ Review this guide completely
2. ✅ Prepare your app's API endpoints
3. ✅ Create Google Sheet with all tabs/headers
4. ✅ Set up n8n credentials (Google Sheets, Email)
5. ✅ Import all 5 workflow JSON files
6. ✅ Test each workflow manually
7. ✅ Deploy to production
8. ✅ Monitor Execution Log for 1 week
9. ✅ Make adjustments based on data quality
10. ✅ Document any customizations for team

