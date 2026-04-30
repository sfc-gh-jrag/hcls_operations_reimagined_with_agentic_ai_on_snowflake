---
name: appeal-drafter
description: Templates and rules for drafting internal notes and appeal letters
tools: [SQL, Read]
---

# Appeal and Artifact Drafting Protocol

After classification and strategy selection, draft the appropriate operational artifacts.

## Artifact 1: Internal Note (EVERY denial gets this)

Write an internal note that summarizes the investigation and recommendation. This note goes into the DENIAL_NOTES table and is visible to the reviewing specialist.

### Internal Note Structure:
```
CLAIM: [claim_id] | DENIAL: [denial_code] - [denial_reason]
DATE: [current_date] | PAYER: [payer_name]

ROOT CAUSE ANALYSIS:
[2-3 sentence explanation of why the denial occurred and what the actual facts are]

EVIDENCE GATHERED:
- Claim Details: [key facts — DOS, amount, CPT codes, provider]
- Member Coverage: [active/inactive, plan, auth required]
- Authorization: [found/not found, details if found, where found]
- Contract Terms: [filing limit, appeal window, relevant policy sections]
- Payer Policy: [specific policy text found via search, with section numbers]
- Historical Pattern: [X similar denials, Y% overturned, most successful strategy]

RECOMMENDATION:
Strategy: [CORRECT_AND_RESUBMIT | APPEAL | ADJUST_WRITE_OFF | ROUTE_TO_CLINICAL]
Confidence: [score]
Queue: [target queue]
Priority: [URGENT | HIGH | MEDIUM | LOW]

OPEN QUESTIONS / FLAGS:
[Any unresolved issues, deadline warnings, or escalation triggers]
```

## Artifact 2: Appeal Letter (only when strategy = APPEAL)

Draft a formal appeal letter that cites specific policy text and evidence. This is the most valuable artifact — a well-crafted appeal letter with policy citations has 2-3x the success rate of a generic template.

### Appeal Letter Structure:
```
[Date]

[Payer Name]
Appeals Department

RE: Appeal of Claim Denial
Claim Number: [claim_id]
Member: [member_name], ID: [member_id]
Date of Service: [dos]
Denial Code: [denial_code]
Denial Date: [denial_date]

Dear Appeals Committee,

We are writing to appeal the denial of the above-referenced claim. The claim was denied with reason code [denial_code]: "[denial_reason]." After thorough review of the member's coverage, contract terms, and applicable policies, we believe this denial should be overturned for the following reasons:

[PARAGRAPH 1: State the specific service denied and why it should be covered]
The service in question — [CPT code and description] — was performed on [DOS] for the treatment of [diagnosis]. According to your [Plan Name] contract, Section [X.X], [quote the specific coverage language from payer policy docs].

[PARAGRAPH 2: Cite the specific policy or contract provision]
Your own published policy (Section [X.X]: "[Section Title]") states: "[Direct quote from payer doc search results]." The member's plan ([plan_id]) includes [relevant rider or benefit category], which covers this service when [list conditions met].

[PARAGRAPH 3: Address the denial reason directly]
The denial states "[denial reason]." However, our records show [specific evidence contradicting the denial]. [If applicable: This is consistent with [X] similar cases in the past [timeframe], of which [Y%] were overturned on appeal.]

[PARAGRAPH 4: Specific request]
Based on the above evidence, we respectfully request that this denial be overturned and the claim reprocessed for payment in accordance with the contracted terms.

Please contact our office at [provider phone] if additional information is needed.

Sincerely,
[Provider Name]
[Provider Group]
[NPI]
```

### RULES FOR APPEAL LETTERS:
1. NEVER fabricate or invent policy text. Only cite text that was actually retrieved from payer doc search.
2. NEVER include clinical judgments or medical opinions.
3. ALWAYS include the specific contract section number and direct quotes.
4. ALWAYS reference historical overturn data if available ("X of Y similar denials were overturned").
5. If the appeal window is < 7 days, mark the letter as URGENT and note the deadline prominently.
6. Keep the tone professional and factual. No emotional language.
7. Each citation must reference a specific section number from the payer's own documents.

## Artifact 2.5: Appeal DOCX Document (only when strategy = APPEAL)

After inserting the appeal letter text into APPEAL_DRAFTS, generate a professionally formatted DOCX document using the helper script:

```bash
python3 /home/agentuser/workspace/tools/generate_appeal_docx.py \
  --claim-id "<claim_id>" \
  --denial-id "<denial_id>" \
  --provider-name "<provider_name>" \
  --provider-npi "<provider_npi>" \
  --member-name "<member_name>" \
  --member-id "<member_id>" \
  --plan-id "<plan_id>" \
  --dos "<date_of_service>" \
  --denial-code "<denial_code>" \
  --denial-reason "<denial_reason>" \
  --appeal-body "<the appeal body text>" \
  --policy-citations "<comma-separated citations>"
```

The script:
1. Creates a formatted DOCX with letterhead, RE block, appeal body, citations, and signature
2. Uploads it to the @APPEAL_DOCUMENTS Snowflake stage
3. Prints the stage path to stdout

After running the script, UPDATE the APPEAL_DRAFTS record with the DOCX_STAGE_PATH.

## Artifact 3: Evidence Package (for ROUTE_TO_CLINICAL)

When routing to clinical review, assemble all gathered evidence into a structured package. The clinical reviewer should not need to re-investigate.

Include:
- Full claim details and line items
- Member coverage and eligibility status
- All relevant payer policy sections found
- Historical denial patterns for this code/payer
- The denial reason and payer remarks
- Explicit statement: "This case involves a clinical determination. No clinical recommendation is made by this agent. All gathered evidence is presented for clinical reviewer assessment."
