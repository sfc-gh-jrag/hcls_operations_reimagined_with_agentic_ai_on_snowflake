import os

from ...framework import AgentConfig, register_agent
from .hooks import audit_logger, safety_gate
from .schemas import DenialResolution

_DB = os.environ.get("SNOWFLAKE_DATABASE", "AGENTIC_DENIED_CLAIMS_HANDLING")
_SCHEMA = os.environ.get("SNOWFLAKE_SCHEMA", "DENIED_CLAIMS")
_FQN = f"{_DB}.{_SCHEMA}"

SYSTEM_PROMPT = f"""You are a denied claims operations assistant working for a Revenue Cycle Management company.

YOUR ROLE:
- You investigate denied healthcare claims by querying Snowflake tables
- You classify denials into categories (TECHNICAL, COVERAGE_BENEFIT, POTENTIAL_CLINICAL)
- You recommend resolution strategies and draft operational artifacts
- You create work items, internal notes, and appeal letters when appropriate

CRITICAL CONSTRAINTS — NON-CDS COMPLIANCE:
- You NEVER make clinical or medical-necessity determinations
- You NEVER suggest diagnoses, treatments, or clinical interventions
- You NEVER modify clinical codes (ICD, CPT, DRG) in the database
- When a denial involves medical necessity (CO-55, CO-56), you MUST classify it as POTENTIAL_CLINICAL and recommend ROUTE_TO_CLINICAL. You assemble the evidence package but explicitly state you are NOT making a clinical determination.

DATA LOCATION:
All data lives in Snowflake under {_FQN} schema:
- CLAIMS, CLAIM_LINES, DENIALS — claim and denial details
- MEMBERS, ELIGIBILITY_BENEFITS — member coverage info
- PRIOR_AUTH — authorization records (search by MEMBER_ID, also try GROUP_NPI)
- CONTRACTS — payer contract terms, filing limits, appeal windows
- DENIAL_HISTORY — aggregated historical denial patterns with overturn rates
- DENIAL_WORK_ITEMS, DENIAL_NOTES, APPEAL_DRAFTS — operational tables you can write to

To search payer policy documents, use SQL:
SELECT value['SECTION_NUMBER']::VARCHAR, value['SECTION_TITLE']::VARCHAR, value['CONTENT']::VARCHAR
FROM TABLE(FLATTEN(PARSE_JSON(SNOWFLAKE.CORTEX.SEARCH_PREVIEW('{_FQN}.PAYER_DOC_SEARCH', '{"query": "<your search terms>", "columns": ["SECTION_NUMBER","SECTION_TITLE","CONTENT","PAYER_NAME"], "filter": {"@eq": {"PAYER_ID": "<payer_id>"}}, "limit": 5}'))['results']));

CONFIDENCE SCORING:
- 0.90-1.00: Clear-cut resolution, high evidence support
- 0.70-0.89: Strong evidence, recommend proceeding
- 0.50-0.69: Ambiguous, human should review closely
- Below 0.50: Insufficient evidence, manual review required

Always set needs_human_review=true if confidence < 0.70 or if the case involves clinical elements."""


def build_denial_prompt(input_data: dict) -> str:
    claim_id = input_data.get("claim_id", "")
    return f"""Process denied claim {claim_id}.

You MUST complete ALL phases below. Do NOT return your final structured result until you have executed SQL INSERT statements for the artifacts and work item.

PHASE 1 — INVESTIGATION (run each query via the SQL tool):
1. Query CLAIMS + DENIALS for claim {claim_id} to get full context including provider, payer, dates, and denial details
2. Query CLAIM_LINES for line-level detail (CPT codes, charges)
3. Query MEMBERS + ELIGIBILITY_BENEFITS for the member's coverage status on the date of service
4. Query CONTRACTS for the payer/plan filing limits, appeal windows, and auth requirements
5. Query PRIOR_AUTH — search by MEMBER_ID first, then try GROUP_NPI if no match on individual NPI
6. Search payer policy docs using Cortex Search for the denial reason text and relevant coverage/rider provisions
7. Query DENIAL_HISTORY for similar denial patterns and overturn rates

PHASE 2 — CLASSIFICATION (decide based on evidence):
8. Classify the denial: TECHNICAL / COVERAGE_BENEFIT / POTENTIAL_CLINICAL
9. Select resolution strategy based on classification and evidence strength
10. Score confidence based on evidence strength (use the rubric in your system prompt)

PHASE 3 — WRITE ARTIFACTS TO SNOWFLAKE (you MUST execute these INSERT statements):

11. INSERT an internal note into DENIAL_NOTES (columns: NOTE_ID, CLAIM_ID, DENIAL_ID, NOTE_TYPE, NOTE_TEXT, EVIDENCE_SUMMARY, CREATED_BY, CREATED_AT):
```sql
INSERT INTO {_FQN}.DENIAL_NOTES
(NOTE_ID, CLAIM_ID, DENIAL_ID, NOTE_TYPE, NOTE_TEXT, EVIDENCE_SUMMARY, CREATED_BY, CREATED_AT)
VALUES ('<generate_unique_id>', '{{claim_id}}', '<denial_id>', 'AGENT_INVESTIGATION', '<your detailed investigation note>', '<evidence summary>', 'DENIAL_AGENT', CURRENT_TIMESTAMP());
```

12. If strategy is APPEAL, INSERT an appeal letter into APPEAL_DRAFTS (columns: APPEAL_ID, CLAIM_ID, DENIAL_ID, APPEAL_TYPE, APPEAL_BODY, POLICY_CITATIONS, STATUS, CREATED_BY, CREATED_AT):
```sql
INSERT INTO {_FQN}.APPEAL_DRAFTS
(APPEAL_ID, CLAIM_ID, DENIAL_ID, APPEAL_TYPE, APPEAL_BODY, POLICY_CITATIONS, STATUS, CREATED_BY, CREATED_AT)
VALUES ('<generate_unique_id>', '{{claim_id}}', '<denial_id>', 'FORMAL_APPEAL', '<your appeal letter text>', '<comma-separated section numbers cited>', 'DRAFT', 'DENIAL_AGENT', CURRENT_TIMESTAMP());
```

PHASE 3.5 — GENERATE APPEAL DOCUMENT (only when strategy is APPEAL):

After inserting the appeal draft, you MUST generate a formatted DOCX document by running this Bash command:

```bash
python3 /home/agentuser/workspace/tools/generate_appeal_docx.py \\
  --claim-id "{claim_id}" \\
  --denial-id "<denial_id>" \\
  --provider-name "<provider_name>" \\
  --provider-npi "<provider_npi>" \\
  --member-name "<first_name> <last_name>" \\
  --member-id "<member_id>" \\
  --plan-id "<plan_id>" \\
  --dos "<date_of_service>" \\
  --denial-code "<denial_code>" \\
  --denial-reason "<denial_reason>" \\
  --appeal-body "<the full appeal body text you drafted — use single quotes inside, escape as needed>" \\
  --policy-citations "<comma-separated section numbers>"
```

The script outputs the stage path on stdout. Capture it and then UPDATE the APPEAL_DRAFTS record:
```sql
UPDATE {_FQN}.APPEAL_DRAFTS
SET DOCX_STAGE_PATH = '<stage_path_from_script_output>'
WHERE CLAIM_ID = '{{claim_id}}' AND CREATED_BY = 'DENIAL_AGENT';
```

PHASE 4 — CREATE WORK ITEM IN SNOWFLAKE (you MUST execute this INSERT):

13. INSERT a work item into DENIAL_WORK_ITEMS (columns: WORK_ITEM_ID, CLAIM_ID, DENIAL_ID, STATUS, QUEUE, PRIORITY, RESOLUTION_STRATEGY, RESOLUTION_NOTES, DUE_DATE, CREATED_BY, CREATED_AT):
```sql
INSERT INTO {_FQN}.DENIAL_WORK_ITEMS
(WORK_ITEM_ID, CLAIM_ID, DENIAL_ID, STATUS, QUEUE, PRIORITY, RESOLUTION_STRATEGY, RESOLUTION_NOTES, DUE_DATE, CREATED_BY, CREATED_AT)
VALUES ('<generate_unique_id>', '{{claim_id}}', '<denial_id>', 'OPEN', '<queue>', '<priority>', '<strategy>', '<brief summary of recommended action>', DATEADD(day, <days_based_on_deadline>, CURRENT_DATE()), 'DENIAL_AGENT', CURRENT_TIMESTAMP());
```

14. UPDATE the denial record to mark it as agent-processed:
```sql
UPDATE {_FQN}.DENIALS
SET PROCESSED_BY_AGENT = true, AGENT_PROCESSED_AT = CURRENT_TIMESTAMP(),
    AGENT_RESULT = PARSE_JSON('<your structured result as JSON>')
WHERE CLAIM_ID = '{{claim_id}}';
```

ONLY after you have executed ALL INSERT, UPDATE, and DOCX generation steps above, return your complete analysis as structured JSON matching the DenialResolution schema."""


def register_denied_claims_agent():
    config = AgentConfig(
        name="denied_claims",
        display_name="Denial Resolution Specialist",
        description="Investigates denied healthcare claims by querying Snowflake, classifies denial root causes (Technical, Coverage, Clinical), recommends resolution strategies, and drafts appeal artifacts. Encodes tribal knowledge like Group NPI fallback search.",
        vertical="Provider",
        is_live=True,
        skills=[
            {"name": "Denial Investigator", "desc": "6-step investigation protocol with Group NPI fallback search strategy"},
            {"name": "Denial Classifier", "desc": "3-category classification (Technical, Coverage, Clinical) with confidence scoring and strategy matrix"},
            {"name": "Appeal Drafter", "desc": "Templates for internal notes, appeal letters, and evidence packages. Never fabricates policy text."},
        ],
        data_sources=[
            {"table": "DENIALS", "desc": "Denial records with codes, amounts, payer remarks", "access": "read/write"},
            {"table": "CLAIMS", "desc": "Claim header — provider, payer, diagnosis, dates", "access": "read"},
            {"table": "CLAIM_LINES", "desc": "Line-level CPT codes and charges", "access": "read"},
            {"table": "MEMBERS", "desc": "Member demographics and plan enrollment", "access": "read"},
            {"table": "ELIGIBILITY_BENEFITS", "desc": "Coverage status, auth requirements, network status", "access": "read"},
            {"table": "PRIOR_AUTH", "desc": "Authorization records — search by member, provider NPI, or group NPI", "access": "read"},
            {"table": "CONTRACTS", "desc": "Payer contract terms — filing limits, appeal windows, NPI policies", "access": "read"},
            {"table": "DENIAL_WORK_ITEMS", "desc": "Work queue — tasks, priorities, due dates", "access": "read/write"},
            {"table": "DENIAL_NOTES", "desc": "Investigation notes and evidence summaries", "access": "read/write"},
            {"table": "APPEAL_DRAFTS", "desc": "Appeal letters with policy citations", "access": "read/write"},
            {"table": "DENIAL_HISTORY", "desc": "Aggregated historical denial patterns and overturn rates", "access": "read"},
        ],
        capabilities=[
            {"name": "SQL", "type": "tool", "desc": "Query Snowflake tables and write operational artifacts"},
            {"name": "Read", "type": "tool", "desc": "Read skill definitions and workspace files"},
            {"name": "Grep", "type": "tool", "desc": "Search skill files for relevant protocols"},
            {"name": "Cortex Search", "type": "search", "desc": "PAYER_DOC_SEARCH — 25 payer policy documents indexed by section, title, content"},
            {"name": "Safety Gate", "type": "guardrail", "desc": f"Blocks destructive SQL (DROP, TRUNCATE) and writes outside {_SCHEMA} schema"},
            {"name": "Audit Logger", "type": "guardrail", "desc": "Logs every tool invocation with inputs and outputs for compliance"},
            {"name": "Non-CDS Compliance", "type": "constraint", "desc": "Never makes clinical determinations — routes CO-55/CO-56 to CLINICAL_REVIEW"},
            {"name": "Investigation Note", "type": "author", "desc": "Structured investigation summary with root cause, evidence, and recommendation for every denial"},
            {"name": "Formal Appeal Letter", "type": "author", "desc": "DOCX appeal letter with policy citations, contract references, and historical overturn data"},
            {"name": "Clinical Evidence Package", "type": "author", "desc": "Compiled evidence package for clinical review — assembled without clinical determinations"},
        ],
        system_prompt=SYSTEM_PROMPT,
        output_schema=DenialResolution.model_json_schema(),
        hooks={
            "PreToolUse": [
                {"matcher": "SQL|Bash", "hooks": [safety_gate], "timeout": 30.0}
            ],
            "PostToolUse": [
                {"matcher": None, "hooks": [audit_logger], "timeout": 10.0}
            ],
        },
        connection="default",
        cwd="/home/agentuser/workspace",
        max_turns=25,
        effort="high",
        prompt_builder=build_denial_prompt,
    )
    register_agent(config)
