export interface Denial {
  denialId: string;
  claimId: string;
  denialCode: string;
  denialReason: string;
  denialAmount: number;
  processedByAgent: boolean;
  providerName: string;
  dateOfService: string;
  totalBilled: number;
  diagnosis: string;
  diagnosisDesc: string;
  patientName: string;
  planId: string;
}

export interface WorkItem {
  workItemId: string;
  claimId: string;
  status: string;
  queue: string;
  priority: string;
  resolutionStrategy: string;
  resolutionNotes: string;
  createdBy: string;
  dueDate: string;
}

export interface AgentResult {
  denial_category?: string;
  recommended_strategy?: string;
  confidence?: number;
  root_cause?: string;
  evidence_summary?: string;
  priority?: string;
  recommended_queue?: string;
  similar_denials_found?: number;
  similar_denials_overturned_pct?: number;
  internal_note_drafted?: boolean;
  appeal_letter_drafted?: boolean;
  filing_window_days_remaining?: number;
  appeal_window_days_remaining?: number;
}

export interface DenialResult {
  denial: Denial;
  workItems: WorkItem[];
  notes: Array<{ noteId: string; content: string; noteType: string; createdAt: string }>;
  agentResult: AgentResult | null;
}

export interface JobMessage {
  type: string;
  content: string;
}

export type TabId = "challenge" | "focus" | "question" | "twoAgents" | "interactive" | "worker" | "together" | "impact";
