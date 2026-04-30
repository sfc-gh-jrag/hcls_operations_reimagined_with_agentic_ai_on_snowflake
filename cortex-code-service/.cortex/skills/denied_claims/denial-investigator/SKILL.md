---
name: denial-investigator
description: Step-by-step investigation protocol for denied claims. Encodes the workflow a senior denial specialist follows.
tools: [SQL, Read, Grep]
---

# Denial Investigation Protocol

You are investigating a denied healthcare claim. Follow this protocol exactly — it is based on the workflow of experienced denial specialists who resolve 40+ denials per day.

## Step 1: Pull Claim Context (ALWAYS DO THIS FIRST)

Query the claim header, line items, dates of service, billed amounts, and prior submission history.

```sql
SELECT c.*, d.DENIAL_CODE, d.DENIAL_REASON, d.DENIAL_AMOUNT, d.PAYER_REMARK
FROM __APP_DATABASE__.__APP_SCHEMA__.CLAIMS c
JOIN __APP_DATABASE__.__APP_SCHEMA__.DENIALS d ON c.CLAIM_ID = d.CLAIM_ID
WHERE c.CLAIM_ID = '<claim_id>';
```

Then get line-level detail:
```sql
SELECT * FROM __APP_DATABASE__.__APP_SCHEMA__.CLAIM_LINES WHERE CLAIM_ID = '<claim_id>' ORDER BY LINE_NUMBER;
```

## Step 2: Verify Member Coverage

Check if the member was eligible on the date of service. Look for coverage gaps, plan changes, and retroactive terminations.

```sql
SELECT * FROM __APP_DATABASE__.__APP_SCHEMA__.ELIGIBILITY_BENEFITS
WHERE MEMBER_ID = '<member_id>'
AND EFFECTIVE_DATE <= '<dos>'
AND (TERM_DATE IS NULL OR TERM_DATE >= '<dos>');
```

Key checks:
- Is COVERAGE_STATUS = 'ACTIVE'?
- Does the BENEFIT_CATEGORY match the service type?
- Is AUTH_REQUIRED = TRUE for this service?
- Is the provider IN_NETWORK?

## Step 3: Find the Authorization (THE HARD PART)

This is where most denials get complicated. Many auth denials are false negatives — the auth exists but is hard to find.

### Search Strategy (follow in order):

**3a. Search by member + exact date range:**
```sql
SELECT * FROM __APP_DATABASE__.__APP_SCHEMA__.PRIOR_AUTH
WHERE MEMBER_ID = '<member_id>'
AND VALID_FROM <= '<dos>' AND VALID_TO >= '<dos>';
```

**3b. If no match — search by GROUP NPI:**
Providers often obtain authorizations under their group NPI (Type 2), but bill claims under their individual NPI (Type 1). This is the #1 reason for false CO-197 denials.

```sql
SELECT * FROM __APP_DATABASE__.__APP_SCHEMA__.PRIOR_AUTH
WHERE MEMBER_ID = '<member_id>'
AND GROUP_NPI = '<group_npi_from_claim>'
AND VALID_FROM <= '<dos>' AND VALID_TO >= '<dos>';
```

**3c. If still no match — search with date range flexibility (±7 days):**
Some payers have date-window tolerances for auth validity.

```sql
SELECT * FROM __APP_DATABASE__.__APP_SCHEMA__.PRIOR_AUTH
WHERE MEMBER_ID = '<member_id>'
AND VALID_FROM <= DATEADD(day, 7, '<dos>')
AND VALID_TO >= DATEADD(day, -7, '<dos>');
```

**3d. Search by service category (broadest search):**
```sql
SELECT * FROM __APP_DATABASE__.__APP_SCHEMA__.PRIOR_AUTH
WHERE MEMBER_ID = '<member_id>'
AND SERVICE_CATEGORY = '<service_category>';
```

## Step 4: Check Contract Terms

Get the payer contract for filing limits, appeal windows, and specific policy rules.

```sql
SELECT * FROM __APP_DATABASE__.__APP_SCHEMA__.CONTRACTS
WHERE PAYER_ID = '<payer_id>' AND PLAN_ID = '<plan_id>';
```

Critical fields:
- FILING_LIMIT_DAYS — how many days to resubmit
- APPEAL_WINDOW_DAYS — how many days to appeal
- NPI_POLICY — does the payer accept group NPI for individual claims?
- AUTH_REQUIREMENTS — specific auth rules
- RESUBMISSION_POLICY — what's allowed for corrected claims

## Step 5: Search Payer Policy Documents

Use Cortex Search to find relevant payer policies, SOPs, and denial resolution playbooks. Search for the specific denial reason text.

```sql
SELECT value['SECTION_NUMBER']::VARCHAR as SECTION,
       value['SECTION_TITLE']::VARCHAR as TITLE,
       value['CONTENT']::VARCHAR as CONTENT
FROM TABLE(FLATTEN(PARSE_JSON(
  SNOWFLAKE.CORTEX.SEARCH_PREVIEW(
      '__APP_DATABASE__.__APP_SCHEMA__.PAYER_DOC_SEARCH',
      '{"query": "<denial reason or topic>", "columns": ["SECTION_NUMBER","SECTION_TITLE","CONTENT"], "filter": {"@eq": {"PAYER_ID": "<payer_id>"}}, "limit": 5}'
  )
)['results']));
```

## Step 6: Check Denial History for Patterns

Look at historical denials with the same code, payer, and service type. What was the overturn rate?

```sql
SELECT * FROM __APP_DATABASE__.__APP_SCHEMA__.DENIAL_HISTORY
WHERE DENIAL_CODE = '<denial_code>' AND PAYER_ID = '<payer_id>';
```

This tells you:
- How many similar denials have occurred
- What percentage were overturned
- What resolution strategy was most successful
- Whether this is a systemic pattern worth flagging
