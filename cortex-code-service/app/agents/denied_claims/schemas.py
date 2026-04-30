from pydantic import BaseModel, Field


class DenialResolution(BaseModel):
    claim_id: str = Field(description="The claim identifier being processed")
    denial_category: str = Field(
        description="TECHNICAL | COVERAGE_BENEFIT | POTENTIAL_CLINICAL"
    )
    root_cause: str = Field(description="Human-readable root cause explanation")
    root_cause_codes: list[str] = Field(
        description="Denial codes and internal reason codes"
    )
    recommended_strategy: str = Field(
        description="CORRECT_AND_RESUBMIT | APPEAL | ADJUST_WRITE_OFF | ROUTE_TO_CLINICAL"
    )
    recommended_queue: str = Field(
        description="Target work queue, e.g. PA_CORRECTIONS, APPEALS, CLINICAL_REVIEW"
    )
    priority: str = Field(description="URGENT | HIGH | MEDIUM | LOW")
    confidence: float = Field(
        ge=0.0, le=1.0, description="Agent confidence score 0.0-1.0"
    )
    needs_human_review: bool = Field(
        description="Whether a human must review before action"
    )
    evidence_summary: str = Field(
        description="Summary of evidence gathered during investigation"
    )
    appeal_letter_drafted: bool = Field(
        description="Whether an appeal letter was drafted"
    )
    internal_note_drafted: bool = Field(
        description="Whether an internal note was drafted"
    )
    filing_window_days_remaining: int = Field(
        description="Days remaining in payer filing window"
    )
    appeal_window_days_remaining: int = Field(
        description="Days remaining in appeal window"
    )
    similar_denials_found: int = Field(
        description="Number of similar historical denials found"
    )
    similar_denials_overturned_pct: float = Field(
        description="Percentage of similar denials that were overturned"
    )
