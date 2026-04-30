---
name: denial-classifier
description: Classification rules and strategy selection for denied claims
tools: [SQL]
---

# Denial Classification Protocol

After completing the investigation, classify the denial and select a resolution strategy.

## Classification Categories

### TECHNICAL
Denial is due to administrative or data errors that can be corrected without clinical review.

**Triggers:**
- Missing or unlinked prior authorization (CO-197) — but auth EXISTS
- Incorrect/missing member data (CO-16)
- Eligibility mismatch that can be corrected (CO-109)
- Filing/billing errors (CO-4, modifier issues)
- Duplicate claim that is NOT actually a duplicate (OA-18)
- COB/coordination of benefits issue (CO-22)

**Strategy: CORRECT_AND_RESUBMIT** (if filing window allows)
- Attach the missing auth reference
- Correct the billing data
- Resubmit with cover letter citing specific policy section

### COVERAGE_BENEFIT
Denial claims a service is not covered, but evidence suggests it IS covered under the plan or a rider.

**Triggers:**
- Non-covered service (CO-50) but contract/rider includes the service
- Non-covered charge (CO-96) but plan benefits cover the category
- Benefit maximum reached (CO-119) but utilization records show otherwise
- Provider not participating (OA-23) but credentialing records show in-network

**Strategy: APPEAL** (if overturn rate > 40% and evidence is strong)
- Draft appeal letter citing specific contract section and policy language
- Reference historical overturn data
- Include supporting documentation

**Strategy: ADJUST_WRITE_OFF** (if clearly excluded with no appeal basis)
- Document the exclusion clearly
- No appeal recommended — would waste resources

### POTENTIAL_CLINICAL
Denial involves clinical judgment. You MUST NOT make the determination.

**Triggers:**
- Medical necessity denial (CO-55)
- Experimental/investigational (CO-236)
- Service not consistent with medical record (PR-204)
- Level of care dispute
- Any denial requiring clinical documentation review

**Strategy: ROUTE_TO_CLINICAL** (ALWAYS for this category)
- Assemble complete evidence package
- Route to CLINICAL_REVIEW queue
- Explicitly state: "This denial involves clinical determination. No clinical recommendation is made by this agent."

## Confidence Scoring Rubric

| Evidence Strength | Score Range | Meaning |
|---|---|---|
| Auth found, contract confirms, history supports | 0.90 - 1.00 | Clear-cut fix |
| Strong evidence from 2+ sources, minor ambiguity | 0.70 - 0.89 | Proceed with recommendation |
| Mixed signals, some evidence supports, some contradicts | 0.50 - 0.69 | Human should decide |
| Insufficient data or contradictory evidence | 0.00 - 0.49 | Manual review required |

## Priority Assignment

| Condition | Priority |
|---|---|
| Appeal window < 7 days | URGENT |
| Claim amount > $15,000 OR filing window < 14 days | HIGH |
| Claim amount $5,000-$15,000 AND window > 14 days | MEDIUM |
| Claim amount < $5,000 AND window > 30 days | LOW |

## Queue Assignment

| Strategy | Queue |
|---|---|
| CORRECT_AND_RESUBMIT | PA_CORRECTIONS |
| APPEAL | APPEALS |
| ADJUST_WRITE_OFF | WRITE_OFFS |
| ROUTE_TO_CLINICAL | CLINICAL_REVIEW |
