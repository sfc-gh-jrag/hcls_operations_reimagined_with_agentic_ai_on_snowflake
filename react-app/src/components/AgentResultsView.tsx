import { useState, useEffect } from "react";
import {
  CheckCircle2, Clock, ChevronDown, ChevronRight,
  FileText, AlertTriangle, Loader2, XCircle,
  TrendingUp, Edit3, MessageSquare, Save
} from "lucide-react";

interface DenialRow {
  DENIAL_ID: string;
  CLAIM_ID: string;
  DENIAL_CODE: string;
  DENIAL_REASON: string;
  DENIAL_AMOUNT: number;
  PATIENT_NAME: string;
  PROVIDER_NAME: string;
  DATE_OF_SERVICE: string;
  PROCESSED_BY_AGENT: boolean;
}

interface ResultDetail {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  denial: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  agent_result: Record<string, any> | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  work_items: Record<string, any>[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  notes: Record<string, any>[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  appeal_drafts: Record<string, any>[];
}

const REVIEW_BADGE: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  APPROVED: "bg-green-100 text-green-700",
  CHANGES_REQUESTED: "bg-amber-100 text-amber-700",
  REJECTED: "bg-red-100 text-red-700",
  REVISED: "bg-blue-100 text-blue-700",
};

export function AgentResultsView() {
  const [denials, setDenials] = useState<DenialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedClaim, setExpandedClaim] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, ResultDetail>>({});
  const [loadingDetail, setLoadingDetail] = useState<string | null>(null);

  useEffect(() => {
    fetch("/data/queue")
      .then((r) => r.json())
      .then((data) => {
        setDenials(data.denials || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleExpand = async (claimId: string) => {
    if (expandedClaim === claimId) {
      setExpandedClaim(null);
      return;
    }
    setExpandedClaim(claimId);
    if (details[claimId]) return;
    setLoadingDetail(claimId);
    try {
      const res = await fetch(`/data/results/${claimId}`);
      const data = await res.json();
      setDetails((prev) => ({ ...prev, [claimId]: data }));
    } catch { /* ignore */ }
    setLoadingDetail(null);
  };

  const refreshDetail = async (claimId: string) => {
    try {
      const res = await fetch(`/data/results/${claimId}`);
      const data = await res.json();
      setDetails((prev) => ({ ...prev, [claimId]: data }));
    } catch { /* ignore */ }
  };

  const processed = denials.filter((d) => d.PROCESSED_BY_AGENT);
  const pending = denials.filter((d) => !d.PROCESSED_BY_AGENT);
  const totalAmount = denials.reduce((s, d) => s + Number(d.DENIAL_AMOUNT), 0);
  const processedAmount = processed.reduce((s, d) => s + Number(d.DENIAL_AMOUNT), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-[#29B5E8]" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Art of the Possible</h2>
        <p className="text-gray-500 mt-1">Real agent results from Snowflake — every result shown was produced by the Cortex Code agent.</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Agent Processed" value={String(processed.length)} sub={`of ${denials.length} denials`} color="text-green-600" icon={<CheckCircle2 size={16} />} />
        <StatCard label="Pending Review" value={String(pending.length)} sub="awaiting processing" color="text-amber-600" icon={<Clock size={16} />} />
        <StatCard label="Revenue Actionable" value={`$${processedAmount.toLocaleString()}`} sub={`of $${totalAmount.toLocaleString()} total`} color="text-[#29B5E8]" icon={<TrendingUp size={16} />} />
        <StatCard label="Avg Resolution" value="< 3 min" sub="vs. 45-90 min manual" color="text-green-600" icon={<Clock size={16} />} />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
          <div className="w-6" />
          <div className="w-8">Status</div>
          <div className="flex-1">Claim</div>
          <div className="w-28">Patient</div>
          <div className="w-16 text-center">Code</div>
          <div className="w-24 text-right">Amount</div>
          <div className="w-28">Provider</div>
        </div>
        {denials.map((d) => {
          const expanded = expandedClaim === d.CLAIM_ID;
          const detail = details[d.CLAIM_ID];
          const isLoadingThis = loadingDetail === d.CLAIM_ID;
          return (
            <div key={d.DENIAL_ID}>
              <button
                onClick={() => handleExpand(d.CLAIM_ID)}
                className={`w-full px-5 py-3 flex items-center gap-4 text-sm hover:bg-gray-50 transition-colors border-b border-gray-50 ${expanded ? "bg-gray-50" : ""}`}
              >
                <div className="w-6">
                  {expanded ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
                </div>
                <div className="w-8">
                  {d.PROCESSED_BY_AGENT ? <CheckCircle2 size={16} className="text-green-500" /> : <Clock size={16} className="text-amber-400" />}
                </div>
                <div className="flex-1 text-left font-mono text-gray-700">{d.CLAIM_ID}</div>
                <div className="w-28 text-left text-gray-700 truncate">{d.PATIENT_NAME}</div>
                <div className="w-16 text-center">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                    d.DENIAL_CODE === "CO-197" ? "bg-blue-50 text-blue-700" :
                    d.DENIAL_CODE === "CO-50" ? "bg-amber-50 text-amber-700" :
                    d.DENIAL_CODE === "CO-55" ? "bg-red-50 text-red-700" :
                    d.DENIAL_CODE === "CO-96" ? "bg-purple-50 text-purple-700" :
                    "bg-gray-50 text-gray-700"
                  }`}>{d.DENIAL_CODE}</span>
                </div>
                <div className="w-24 text-right font-medium text-gray-900">${Number(d.DENIAL_AMOUNT).toLocaleString()}</div>
                <div className="w-28 text-left text-gray-500 truncate">{d.PROVIDER_NAME}</div>
              </button>
              {expanded && (
                <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
                  {isLoadingThis && (
                    <div className="flex items-center gap-2 py-8 justify-center">
                      <Loader2 size={16} className="animate-spin text-[#29B5E8]" />
                      <span className="text-sm text-gray-500">Loading results...</span>
                    </div>
                  )}
                  {!isLoadingThis && !d.PROCESSED_BY_AGENT && (
                    <div className="text-center py-8 text-gray-500">
                      <Clock size={24} className="mx-auto mb-2 text-amber-400" />
                      <p className="text-sm font-medium">Pending Agent Processing</p>
                      <p className="text-xs text-gray-400 mt-1">Use the "Agent Processing" tab to run the agent on this claim.</p>
                    </div>
                  )}
                  {!isLoadingThis && d.PROCESSED_BY_AGENT && detail && (
                    <ResultDetailPanel detail={detail} claimId={d.CLAIM_ID} onRefresh={() => refreshDetail(d.CLAIM_ID)} />
                  )}
                  {!isLoadingThis && d.PROCESSED_BY_AGENT && !detail && (
                    <div className="text-center py-8 text-gray-400 text-sm">Could not load details for this claim.</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color, icon }: { label: string; value: string; sub: string; color: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <div className={`flex items-center gap-2 mb-2 ${color} opacity-60`}>
        {icon}
        <span className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-400 mt-0.5">{sub}</div>
    </div>
  );
}

function ResultDetailPanel({ detail, claimId, onRefresh }: { detail: ResultDetail; claimId: string; onRefresh: () => void }) {
  const ar = detail.agent_result;
  const wis = detail.work_items;
  const notes = detail.notes;
  const drafts = detail.appeal_drafts;
  const draft = drafts.length > 0 ? drafts[0] : null;
  const hasAppeal = draft && draft.APPEAL_BODY;

  return (
    <div className="space-y-4">
      {ar ? (
        <>
          <div className="flex items-center gap-3 flex-wrap">
            {ar.denial_category && (
              <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                ar.denial_category === "TECHNICAL" ? "bg-blue-100 text-blue-800" :
                ar.denial_category === "COVERAGE_BENEFIT" ? "bg-amber-100 text-amber-800" :
                "bg-red-100 text-red-800"
              }`}>{ar.denial_category}</span>
            )}
            {ar.recommended_strategy && (
              <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                ar.recommended_strategy === "CORRECT_AND_RESUBMIT" ? "bg-green-100 text-green-800" :
                ar.recommended_strategy === "APPEAL" ? "bg-amber-100 text-amber-800" :
                "bg-purple-100 text-purple-800"
              }`}>{ar.recommended_strategy}</span>
            )}
            {ar.confidence != null && (
              <span className="text-xs font-bold text-gray-500">
                Confidence: <span className={Number(ar.confidence) >= 0.8 ? "text-green-700" : "text-amber-700"}>{(Number(ar.confidence) * 100).toFixed(0)}%</span>
              </span>
            )}
            {ar.priority && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                ar.priority === "URGENT" ? "bg-red-100 text-red-700" :
                ar.priority === "HIGH" ? "bg-amber-100 text-amber-700" :
                "bg-gray-100 text-gray-600"
              }`}>{ar.priority} priority</span>
            )}
          </div>

          {ar.root_cause && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Root Cause</div>
              <p className="text-sm text-gray-800">{ar.root_cause}</p>
            </div>
          )}

          {ar.evidence_summary && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Evidence</div>
              <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">{ar.evidence_summary}</p>
            </div>
          )}
        </>
      ) : (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <AlertTriangle size={14} className="text-amber-500" />
          Agent processed this claim but no structured result was stored.
        </div>
      )}

      {hasAppeal && <AppealDocumentPanel draft={draft} claimId={claimId} onRefresh={onRefresh} />}

      {wis.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Work Items</div>
          <div className="space-y-2">
            {wis.map((wi) => (
              <div key={wi.WORK_ITEM_ID} className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <span className="text-xs font-mono text-gray-600">{wi.WORK_ITEM_ID}</span>
                  <span className="mx-2 text-gray-300">{"\u00B7"}</span>
                  <span className="text-xs font-medium text-gray-700">{wi.RESOLUTION_STRATEGY}</span>
                  <span className="mx-2 text-gray-300">{"\u2192"}</span>
                  <span className="text-xs text-gray-500">{wi.QUEUE}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                    wi.STATUS === "OVERTURNED" ? "bg-green-100 text-green-700" :
                    wi.STATUS === "OPEN" ? "bg-blue-100 text-blue-700" :
                    wi.STATUS === "WRITE_OFF" ? "bg-red-100 text-red-700" :
                    "bg-gray-100 text-gray-600"
                  }`}>{wi.STATUS}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    wi.PRIORITY === "HIGH" ? "bg-amber-50 text-amber-600" :
                    wi.PRIORITY === "MEDIUM" ? "bg-gray-50 text-gray-600" :
                    "bg-gray-50 text-gray-400"
                  }`}>{wi.PRIORITY}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {notes.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Investigation Notes</div>
          {notes.map((n, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-lg p-3 text-xs text-gray-700 whitespace-pre-wrap">
              {n.NOTE_TEXT || n.CONTENT || JSON.stringify(n)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function AppealDocumentPanel({ draft, claimId, onRefresh }: { draft: Record<string, any>; claimId: string; onRefresh: () => void }) {
  const [editing, setEditing] = useState(false);
  const [editBody, setEditBody] = useState(draft.APPEAL_BODY || "");
  const [editCitations, setEditCitations] = useState(draft.POLICY_CITATIONS || "");
  const [saving, setSaving] = useState(false);
  const [reviewAction, setReviewAction] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const reviewStatus = draft.REVIEW_STATUS || "DRAFT";
  const badgeClass = REVIEW_BADGE[reviewStatus] || REVIEW_BADGE.DRAFT;

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/data/appeal-save/${claimId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appeal_body: editBody, policy_citations: editCitations }),
      });
      setEditing(false);
      onRefresh();
    } catch { /* ignore */ }
    setSaving(false);
  };

  const handleReview = async (action: string) => {
    if (action === "request_changes") {
      setReviewAction("request_changes");
      return;
    }
    setSubmittingReview(true);
    try {
      await fetch(`/data/appeal-review/${claimId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, notes: "" }),
      });
      onRefresh();
    } catch { /* ignore */ }
    setSubmittingReview(false);
  };

  const submitReviewNotes = async () => {
    setSubmittingReview(true);
    try {
      await fetch(`/data/appeal-review/${claimId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request_changes", notes: reviewNotes }),
      });
      setReviewAction(null);
      setReviewNotes("");
      onRefresh();
    } catch { /* ignore */ }
    setSubmittingReview(false);
  };

  const citations = (draft.POLICY_CITATIONS || "").split(",").map((c: string) => c.trim()).filter(Boolean);

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText size={16} className="text-[#11567F]" />
          <span className="text-sm font-semibold text-gray-900">Appeal Letter</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${badgeClass}`}>{reviewStatus.replace("_", " ")}</span>
        </div>
        <div className="flex items-center gap-2">
          {!editing && (
            <button onClick={() => { setEditing(true); setEditBody(draft.APPEAL_BODY || ""); setEditCitations(draft.POLICY_CITATIONS || ""); }} className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100">
              <Edit3 size={12} /> Edit
            </button>
          )}
        </div>
      </div>

      <div className="p-4">
        {editing ? (
          <div className="space-y-3">
            <textarea
              className="w-full h-64 text-xs font-mono text-gray-700 border border-gray-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-[#29B5E8] resize-y"
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
            />
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase">Policy Citations</label>
              <input
                className="w-full text-xs text-gray-700 border border-gray-200 rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-[#29B5E8]"
                value={editCitations}
                onChange={(e) => setEditCitations(e.target.value)}
                placeholder="Section 3.4.1, Section 7.2"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-[#29B5E8] hover:bg-[#1a9fd4] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 disabled:bg-gray-300">
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                {saving ? "Saving..." : "Save & Re-generate DOCX"}
              </button>
              <button onClick={() => setEditing(false)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg text-xs font-semibold">Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <div className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
              {draft.APPEAL_BODY}
            </div>
            {citations.length > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-100">
                <div className="text-xs font-semibold text-[#11567F] uppercase tracking-wider mb-2">Policy Citations Referenced</div>
                <div className="flex flex-wrap gap-2">
                  {citations.map((c: string, i: number) => (
                    <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium">{c}</span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {!editing && (
        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
          {reviewAction === "request_changes" ? (
            <div className="space-y-2">
              <textarea
                className="w-full h-20 text-xs text-gray-700 border border-gray-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-amber-400"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Describe the changes needed..."
              />
              <div className="flex gap-2">
                <button onClick={submitReviewNotes} disabled={submittingReview} className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1 disabled:bg-gray-300">
                  {submittingReview ? <Loader2 size={12} className="animate-spin" /> : <MessageSquare size={12} />} Submit Feedback
                </button>
                <button onClick={() => setReviewAction(null)} className="px-3 py-1.5 bg-gray-200 text-gray-600 rounded-lg text-xs font-semibold">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <button onClick={() => handleReview("approve")} disabled={submittingReview} className="flex-1 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 disabled:bg-gray-300">
                <CheckCircle2 size={14} /> Approve
              </button>
              <button onClick={() => handleReview("request_changes")} disabled={submittingReview} className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 disabled:bg-gray-300">
                <MessageSquare size={14} /> Request Changes
              </button>
              <button onClick={() => handleReview("reject")} disabled={submittingReview} className="flex-1 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-red-600 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 disabled:bg-gray-300 disabled:text-gray-400">
                <XCircle size={14} /> Reject
              </button>
            </div>
          )}
        </div>
      )}

      {draft.REVIEWER_NOTES && (
        <div className="px-4 py-2 border-t border-gray-100 bg-amber-50">
          <div className="text-xs text-amber-800"><span className="font-semibold">Reviewer notes:</span> {draft.REVIEWER_NOTES}</div>
        </div>
      )}
    </div>
  );
}
