from ..framework import AgentConfig, register_agent


def register_placeholder_personas():
    register_agent(AgentConfig(
        name="prior_auth",
        display_name="Prior Auth Specialist",
        description="Verifies authorization status, matches auths to claims via NPI and group NPI lookups, identifies auth gaps before claim submission, and tracks auth expiry timelines.",
        vertical="Provider",
        is_live=False,
        system_prompt="",
        output_schema={},
        skills=[
            {"name": "Auth Matcher", "desc": "Links authorizations to claims using member ID, provider NPI, and group NPI fallback strategies"},
            {"name": "Gap Analyzer", "desc": "Identifies missing or expiring authorizations before claims are submitted to payers"},
            {"name": "Auth Status Tracker", "desc": "Monitors authorization lifecycle — pending, approved, denied, expired — across all active cases"},
        ],
        data_sources=[
            {"table": "PRIOR_AUTH", "desc": "Authorization records with NPI, validity dates, approval status", "access": "read"},
            {"table": "CLAIMS", "desc": "Claim header for matching auths to submitted claims", "access": "read"},
            {"table": "CLAIM_LINES", "desc": "Line-level CPT codes to verify auth coverage", "access": "read"},
            {"table": "ELIGIBILITY_BENEFITS", "desc": "Coverage details and auth requirements by service type", "access": "read"},
            {"table": "MEMBERS", "desc": "Member demographics and plan enrollment", "access": "read"},
            {"table": "CONTRACTS", "desc": "Payer-specific auth rules and timely filing limits", "access": "read"},
        ],
        capabilities=[
            {"name": "SQL", "type": "tool", "desc": "Read-only queries against authorization and claims data"},
            {"name": "Read", "type": "tool", "desc": "Read skill definitions and workspace files"},
            {"name": "Cortex Search", "type": "search", "desc": "PAYER_DOC_SEARCH — payer authorization requirement policies"},
            {"name": "Auth-Scope Guard", "type": "guardrail", "desc": "Restricts writes to authorization-related tables only"},
            {"name": "Audit Logger", "type": "guardrail", "desc": "Logs every tool invocation for compliance trail"},
        ],
    ))

    register_agent(AgentConfig(
        name="formulary_review",
        display_name="Formulary Review Analyst",
        description="Evaluates drug formulary exception requests, checks clinical criteria and step therapy requirements, identifies therapeutic alternatives, and drafts coverage determination rationale for pharmacy benefit decisions.",
        vertical="Payer",
        is_live=False,
        system_prompt="",
        output_schema={},
        skills=[
            {"name": "Formulary Exception Reviewer", "desc": "Evaluates non-formulary drug requests against clinical criteria, step therapy protocols, and plan benefit designs"},
            {"name": "Coverage Determination Writer", "desc": "Drafts structured approval or denial rationale citing specific formulary policies and clinical guidelines"},
            {"name": "Therapeutic Alternative Finder", "desc": "Identifies formulary-preferred therapeutic alternatives based on drug class, indication, and member history"},
        ],
        data_sources=[
            {"table": "FORMULARY_CATALOG", "desc": "Drug formulary tiers, restrictions, and step therapy requirements", "access": "read"},
            {"table": "DRUG_PRIOR_AUTH_REQUESTS", "desc": "Incoming pharmacy PA requests with prescriber notes", "access": "read/write"},
            {"table": "CLINICAL_CRITERIA", "desc": "Clinical review criteria by drug class and indication", "access": "read"},
            {"table": "MEMBER_PHARMACY_HISTORY", "desc": "Member prescription fill history and step therapy compliance", "access": "read"},
            {"table": "PLAN_BENEFIT_DESIGNS", "desc": "Pharmacy benefit structure — copays, tiers, quantity limits", "access": "read"},
        ],
        capabilities=[
            {"name": "SQL", "type": "tool", "desc": "Query formulary data and write coverage determinations"},
            {"name": "Read", "type": "tool", "desc": "Read skill definitions and clinical criteria files"},
            {"name": "Cortex Search", "type": "search", "desc": "DRUG_POLICY_SEARCH — payer drug policies, clinical guidelines, P&T committee decisions"},
            {"name": "Non-CDS Compliance", "type": "constraint", "desc": "Never makes prescribing decisions — provides information for pharmacist review"},
            {"name": "Audit Logger", "type": "guardrail", "desc": "Logs every tool invocation for regulatory compliance"},
        ],
    ))

    register_agent(AgentConfig(
        name="clinical_trial_monitor",
        display_name="Clinical Trial Site Monitor",
        description="Reviews clinical trial site data for protocol deviations, validates subject enrollment criteria, monitors adverse event reporting timelines, and scores site performance — the work normally done by a CRA during site monitoring visits.",
        vertical="Life Sciences",
        is_live=False,
        system_prompt="",
        output_schema={},
        skills=[
            {"name": "Protocol Deviation Detector", "desc": "Flags enrollment, dosing, and visit schedule deviations by comparing site data against the protocol-defined procedures"},
            {"name": "AE Timeline Validator", "desc": "Checks adverse event reporting windows against regulatory requirements (24hr serious, 15-day IND safety)"},
            {"name": "Site Performance Scorer", "desc": "Calculates composite site risk score from enrollment rate, deviation count, query response time, and AE reporting compliance"},
        ],
        data_sources=[
            {"table": "TRIAL_SUBJECTS", "desc": "Subject enrollment, demographics, consent dates, randomization", "access": "read"},
            {"table": "PROTOCOL_SCHEDULE", "desc": "Protocol-defined visit windows, procedures, and assessments", "access": "read"},
            {"table": "ADVERSE_EVENTS", "desc": "AE/SAE records with onset dates, severity, causality, reporting timestamps", "access": "read"},
            {"table": "SITE_VISITS", "desc": "Monitoring visit logs, findings, action items", "access": "read"},
            {"table": "INVESTIGATOR_SITES", "desc": "Site profiles — PI credentials, IRB status, enrollment targets", "access": "read"},
        ],
        capabilities=[
            {"name": "SQL", "type": "tool", "desc": "Read-only queries against clinical trial operational data"},
            {"name": "Read", "type": "tool", "desc": "Read protocol documents and monitoring SOPs"},
            {"name": "Cortex Search", "type": "search", "desc": "PROTOCOL_DOC_SEARCH — study protocol, ICF, investigator brochure, monitoring plan"},
            {"name": "GCP Compliance Guard", "type": "guardrail", "desc": "Never modifies subject data — read-only access with full audit trail"},
            {"name": "Audit Logger", "type": "guardrail", "desc": "21 CFR Part 11 compliant logging of all data access"},
        ],
    ))

    register_agent(AgentConfig(
        name="device_complaint",
        display_name="Device Complaint Analyst",
        description="Triages incoming product complaints, assesses severity and FDA reportability (MDR), evaluates whether a CAPA is warranted, and drafts initial assessment reports — the work a quality engineer does manually for each complaint record.",
        vertical="MedTech",
        is_live=False,
        system_prompt="",
        output_schema={},
        skills=[
            {"name": "Complaint Triage", "desc": "Assesses complaint severity (critical/major/minor) and categorizes by failure mode, product family, and risk level"},
            {"name": "MDR Evaluator", "desc": "Evaluates FDA Medical Device Reporting criteria — death, serious injury, malfunction that could cause harm"},
            {"name": "CAPA Recommender", "desc": "Analyzes complaint patterns against risk matrix to recommend corrective/preventive actions with priority scoring"},
        ],
        data_sources=[
            {"table": "COMPLAINT_RECORDS", "desc": "Incoming complaint details — product, event description, patient outcome", "access": "read/write"},
            {"table": "DEVICE_CATALOG", "desc": "Device master records — product codes, classifications, risk levels", "access": "read"},
            {"table": "ADVERSE_EVENT_HISTORY", "desc": "Historical complaint and adverse event trends by product", "access": "read"},
            {"table": "PRODUCT_RISK_MATRIX", "desc": "Risk scores by failure mode, severity, and occurrence probability", "access": "read"},
            {"table": "REGULATORY_SUBMISSIONS", "desc": "MDR/MedWatch submission history and FDA correspondence", "access": "read"},
        ],
        capabilities=[
            {"name": "SQL", "type": "tool", "desc": "Query complaint data and write triage assessments"},
            {"name": "Read", "type": "tool", "desc": "Read quality SOPs and regulatory guidance"},
            {"name": "Cortex Search", "type": "search", "desc": "DEVICE_POLICY_SEARCH — FDA guidance documents, company SOPs, risk assessments"},
            {"name": "Regulatory Guard", "type": "guardrail", "desc": "Never changes regulatory submission status — flags for quality review"},
            {"name": "Audit Logger", "type": "guardrail", "desc": "ISO 13485 compliant logging of all complaint data access"},
        ],
    ))
