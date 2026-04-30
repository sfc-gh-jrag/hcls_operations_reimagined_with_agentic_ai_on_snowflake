import { useState, useEffect } from "react";
import {
  CheckCircle2, Clock, TrendingUp, Loader2, ChevronDown,
  ChevronRight, FileText, MessageSquare,
  XCircle, Edit3, Save, X, ShieldAlert
} from "lucide-react";
import { InteractiveAgentView } from "./InteractiveAgentView";

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
  PAYER_ID?: string;
  FILING_DEADLINE?: string;
  APPEAL_DEADLINE?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DetailData = Record<string, any>;

const CODE_COLORS: Record<string, string> = {
  "CO-15": "bg-amber-50 text-amber-700",
  "CO-50": "bg-red-50 text-red-700",
  "CO-56": "bg-red-50 text-red-700",
  "CO-97": "bg-purple-50 text-purple-700",
};

function daysLeft(deadline?: string): number | null {
  if (!deadline) return null;
  const diff = Math.floor((new Date(deadline).getTime() - Date.now()) / 86400000);
  return diff;
}

function DeadlineBadge({ days }: { days: number | null }) {
  if (days === null) return null;
  if (days < 0) return <span className="text-xs text-red-600 font-semibold">Expired</span>;
  if (days <= 7) return <span className="text-xs text-red-600 font-semibold">{days}d ⚠</span>;
  if (days <= 14) return <span className="text-xs text-amber-600 font-semibold">{days}d</span>;
  return <span className="text-xs text-green-600">{days}d ✓</span>;
}

export function ReviewQueueView() {
  const [denials, setDenials] = useState<DenialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedClaim, setExpandedClaim] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, DetailData>>({});
  const [loadingDetail, setLoadingDetail] = useState<string | null>(null);
  const [preloading, setPreloading] = useState(false);
  const [deepDiveClaim, setDeepDiveClaim] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [savingDraft, setSavingDraft] = useState(false);
  const [approving, setApproving] = useState<string | null>(null);
  const [rowStatus, setRowStatus] = useState<Record<string, "approved" | "rejected">>({});

  useEffect(() => {
    fetch("/data/queue")
      .then((r) => r.json())
      .then(async (data) => {
        const rows: DenialRow[] = data.denials || [];
        setDenials(rows);
        setLoading(false);
        const processed = rows.filter((d) => d.PROCESSED_BY_AGENT);
        if (processed.length) {
          setPreloading(true);
          const results = await Promise.allSettled(
            processed.map((d) =>
              fetch(`/data/results/${d.CLAIM_ID}`).then((r) => r.json()).then((detail) => ({ claimId: d.CLAIM_ID, detail }))
            )
          );
          const loaded: Record<string, DetailData> = {};
          for (const r of results) {
            if (r.status === "fulfilled") loaded[r.value.claimId] = r.value.detail;
          }
          setDetails((prev) => ({ ...prev, ...loaded }));
          setPreloading(false);
        }
      })
      .catch(() => setLoading(false));
  }, []);

  const handleExpand = async (claimId: string) => {
    if (expandedClaim === claimId) {
      setExpandedClaim(null);
      setDeepDiveClaim(null);
      return;
    }
    setExpandedClaim(claimId);
    setDeepDiveClaim(null);
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

  const handleApprove = async (claimId: string, action: "approve" | "reject") => {
    setApproving(claimId + action);
    try {
      await fetch(`/data/approve/${claimId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, notes: "" }),
      });
      setRowStatus((prev) => ({ ...prev, [claimId]: action === "approve" ? "approved" : "rejected" }));
      setExpandedClaim(null);
      setDeepDiveClaim(null);
      refreshDetail(claimId);
    } catch { /* ignore */ }
    setApproving(null);
  };

  const handleSaveDraft = async (claimId: string) => {
    setSavingDraft(true);
    try {
      await fetch(`/data/appeal-save/${claimId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appeal_body: editBody, policy_citations: "" }),
      });
      setDetails((prev) => ({
        ...prev,
        [claimId]: {
          ...prev[claimId],
          appeal_drafts: prev[claimId]?.appeal_drafts?.map((d: DetailData, i: number) =>
            i === 0 ? { ...d, APPEAL_BODY: editBody, REVIEW_STATUS: "REVISED" } : d
          ) || [],
        },
      }));
      setEditingDraft(null);
    } catch { /* ignore */ }
    setSavingDraft(false);
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
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Review Queue</h2>
        <p className="text-gray-500 mt-1 text-sm">
          These are completed work packages — each denial already investigated, classified, and documented by the Worker Agent.
          Your specialists review, not process.
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Completed by Agent", value: String(processed.length), sub: `of ${denials.length} denials`, color: "text-green-600", icon: <CheckCircle2 size={16} /> },
          { label: "Awaiting Review", value: String(processed.filter((d) => !rowStatus[d.CLAIM_ID]).length), sub: "packages ready", color: "text-amber-600", icon: <Clock size={16} /> },
          { label: "Revenue Packaged", value: `$${processedAmount.toLocaleString()}`, sub: `of $${totalAmount.toLocaleString()} total`, color: "text-[#29B5E8]", icon: <TrendingUp size={16} /> },
          { label: "Pending Processing", value: String(pending.length), sub: "not yet processed", color: "text-gray-500", icon: <ShieldAlert size={16} /> },
        ].map((c) => (
          <div key={c.label} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <div className={`flex items-center gap-2 mb-2 ${c.color} opacity-60`}>{c.icon}<span className="text-xs font-medium uppercase tracking-wider text-gray-500">{c.label}</span></div>
            <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
            <div className="text-xs text-gray-400 mt-0.5">{c.sub}</div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 grid grid-cols-12 gap-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          <div className="col-span-1" />
          <div className="col-span-2">Claim ID</div>
          <div className="col-span-2">Patient</div>
          <div className="col-span-1">Code</div>
          <div className="col-span-1 text-right">Amount</div>
          <div className="col-span-2">Payer</div>
          <div className="col-span-1">Deadline</div>
          <div className="col-span-2 text-center">Action</div>
        </div>

        {denials.map((d) => {
          const expanded = expandedClaim === d.CLAIM_ID;
          const detail = details[d.CLAIM_ID];
          const isLoadingThis = loadingDetail === d.CLAIM_ID;
          const status = rowStatus[d.CLAIM_ID];
          const filingDays = daysLeft(d.FILING_DEADLINE);

          return (
            <div key={d.DENIAL_ID} className="border-b border-gray-50 last:border-0">
              <div
                className={`px-5 py-3 grid grid-cols-12 gap-4 items-center text-sm cursor-pointer hover:bg-gray-50 transition-colors ${
                  status === "approved" ? "bg-green-50" : status === "rejected" ? "bg-red-50" : expanded ? "bg-blue-50" : ""
                }`}
                onClick={() => d.PROCESSED_BY_AGENT && handleExpand(d.CLAIM_ID)}
              >
                <div className="col-span-1">
                  {d.PROCESSED_BY_AGENT
                    ? (expanded ? <ChevronDown size={14} className="text-[#29B5E8]" /> : <ChevronRight size={14} className="text-gray-400" />)
                    : <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-200" />}
                </div>
                <div className="col-span-2 font-mono text-xs text-gray-700">{d.CLAIM_ID}</div>
                <div className="col-span-2 text-gray-700 truncate">{d.PATIENT_NAME}</div>
                <div className="col-span-1">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${CODE_COLORS[d.DENIAL_CODE] || "bg-gray-100 text-gray-600"}`}>
                    {d.DENIAL_CODE}
                  </span>
                </div>
                <div className="col-span-1 text-right font-semibold text-gray-900">${Number(d.DENIAL_AMOUNT).toLocaleString()}</div>
                <div className="col-span-2 text-gray-500 text-xs truncate">{d.PAYER_ID || "—"}</div>
                <div className="col-span-1"><DeadlineBadge days={filingDays} /></div>
                <div className="col-span-2 text-center" onClick={(e) => e.stopPropagation()}>
                  {status === "approved" ? (
                    <span className="text-xs font-semibold text-green-700 bg-green-100 px-2.5 py-1 rounded-full">✓ Approved</span>
                  ) : status === "rejected" ? (
                    <span className="text-xs font-semibold text-red-700 bg-red-100 px-2.5 py-1 rounded-full">✗ Rejected</span>
                  ) : d.PROCESSED_BY_AGENT ? (
                    <button
                      onClick={() => handleExpand(d.CLAIM_ID)}
                      className="text-xs font-semibold text-[#1d4ed8] bg-[#eff6ff] hover:bg-[#dbeafe] border border-[#bfdbfe] px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Review →
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400 font-medium">Pending ⏳</span>
                  )}
                </div>
              </div>

              {expanded && (
                <div className="border-t border-gray-100 bg-[#f8fafc]">
                  {(isLoadingThis || (preloading && !detail)) && (
                    <div className="flex items-center gap-2 p-6 justify-center">
                      <Loader2 size={16} className="animate-spin text-[#29B5E8]" />
                      <span className="text-sm text-gray-500">Loading review package...</span>
                    </div>
                  )}
                  {!isLoadingThis && detail && (
                    <ReviewPanel
                      detail={detail}
                      claimId={d.CLAIM_ID}
                      showDeepDive={deepDiveClaim === d.CLAIM_ID}
                      onToggleDeepDive={() => setDeepDiveClaim((prev) => prev === d.CLAIM_ID ? null : d.CLAIM_ID)}
                      editingDraft={editingDraft === d.CLAIM_ID}
                      editBody={editBody}
                      onEditBody={setEditBody}
                      onStartEdit={() => {
                        const draft = detail.appeal_drafts?.[0];
                        setEditBody(draft?.APPEAL_BODY || "");
                        setEditingDraft(d.CLAIM_ID);
                      }}
                      onCancelEdit={() => setEditingDraft(null)}
                      onSaveDraft={() => handleSaveDraft(d.CLAIM_ID)}
                      savingDraft={savingDraft && editingDraft === d.CLAIM_ID}
                      onApprove={() => handleApprove(d.CLAIM_ID, "approve")}
                      onReject={() => handleApprove(d.CLAIM_ID, "reject")}
                      approving={approving}
                    />
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

function ReviewPanel({
  detail,
  claimId,
  showDeepDive,
  onToggleDeepDive,
  editingDraft,
  editBody,
  onEditBody,
  onStartEdit,
  onCancelEdit,
  onSaveDraft,
  savingDraft,
  onApprove,
  onReject,
  approving,
}: {
  detail: DetailData;
  claimId: string;
  showDeepDive: boolean;
  onToggleDeepDive: () => void;
  editingDraft: boolean;
  editBody: string;
  onEditBody: (v: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveDraft: () => void;
  savingDraft: boolean;
  onApprove: () => void;
  onReject: () => void;
  approving: string | null;
}) {
  const ar = detail.agent_result;
  const wis = detail.work_items || [];
  const notes = detail.notes || [];
  const drafts = detail.appeal_drafts || [];
  const draft = drafts[0];
  const note = notes[0];
  const wi = wis[0];

  const catClass = ar?.denial_category === "TECHNICAL"
    ? "bg-blue-100 text-blue-800"
    : ar?.denial_category === "COVERAGE_BENEFIT"
    ? "bg-amber-100 text-amber-800"
    : "bg-red-100 text-red-800";

  const stratClass = ar?.recommended_strategy === "CORRECT_AND_RESUBMIT"
    ? "bg-green-100 text-green-800"
    : ar?.recommended_strategy === "APPEAL"
    ? "bg-amber-100 text-amber-800"
    : "bg-purple-100 text-purple-800";

  return (
    <div className={`${showDeepDive ? "grid grid-cols-2 divide-x divide-gray-100 h-[600px]" : ""}`}>
      <div className={`p-5 space-y-4 ${showDeepDive ? "overflow-y-auto" : ""}`}>
        {ar && (
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${catClass}`}>
              {ar.denial_category}
            </span>
            <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full ${stratClass}`}>
              {(ar.recommended_strategy || "").replace(/_/g, " ")}
            </span>
            {ar.confidence != null && (
              <span className="text-xs font-semibold text-gray-500">
                Confidence: <span className={Number(ar.confidence) >= 0.8 ? "text-green-700" : "text-amber-700"}>
                  {(Number(ar.confidence) * 100).toFixed(0)}%
                </span>
              </span>
            )}
            {ar.priority && (
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${
                ar.priority === "URGENT" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
              }`}>
                {ar.priority}
              </span>
            )}
          </div>
        )}

        {ar?.root_cause && (
          <div className="bg-white border border-gray-200 rounded-lg p-3.5">
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Root Cause</div>
            <p className="text-sm text-gray-800 leading-relaxed">{ar.root_cause}</p>
          </div>
        )}

        {ar?.evidence_summary && (
          <div className="bg-white border border-gray-200 rounded-lg p-3.5">
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Evidence</div>
            <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">{ar.evidence_summary}</p>
          </div>
        )}

        {draft?.APPEAL_BODY && (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-3.5 py-2.5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={13} className="text-[#11567F]" />
                <span className="text-xs font-semibold text-gray-900">Appeal Letter</span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                  draft.REVIEW_STATUS === "APPROVED" ? "bg-green-100 text-green-700" :
                  draft.REVIEW_STATUS === "REVISED" ? "bg-blue-100 text-blue-700" :
                  "bg-gray-100 text-gray-600"
                }`}>{(draft.REVIEW_STATUS || "DRAFT").replace("_", " ")}</span>
              </div>
              {!editingDraft && (
                <button onClick={onStartEdit} className="text-[10px] text-gray-500 hover:text-gray-700 flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-100">
                  <Edit3 size={10} /> Edit
                </button>
              )}
            </div>
            {editingDraft ? (
              <div className="p-3.5 space-y-2">
                <textarea
                  className="w-full h-40 text-xs font-mono text-gray-700 border border-gray-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-[#29B5E8] resize-y"
                  value={editBody}
                  onChange={(e) => onEditBody(e.target.value)}
                />
                <div className="flex gap-2">
                  <button onClick={onSaveDraft} disabled={savingDraft} className="px-3 py-1.5 bg-[#29B5E8] hover:bg-[#1a9fd4] text-white rounded-lg text-xs font-semibold flex items-center gap-1 disabled:bg-gray-200">
                    {savingDraft ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />}
                    {savingDraft ? "Saving..." : "Save"}
                  </button>
                  <button onClick={onCancelEdit} className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-semibold"><X size={10} /></button>
                </div>
              </div>
            ) : (
              <>
                <div className="px-3.5 py-3 text-xs text-gray-700 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">
                  {draft.APPEAL_BODY}
                </div>
                {draft.POLICY_CITATIONS && (
                  <div className="px-3.5 py-2.5 border-t border-gray-100 flex flex-wrap gap-1.5 items-center">
                    <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider">Citations:</span>
                    {draft.POLICY_CITATIONS.split(",").map((c: string, i: number) => (
                      <span key={i} className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{c.trim()}</span>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {wi && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg px-3.5 py-2.5 text-xs text-blue-700 flex flex-wrap gap-3">
            <span className="font-mono font-semibold">{wi.WORK_ITEM_ID}</span>
            <span>·</span>
            <span>{(wi.RESOLUTION_STRATEGY || "").replace(/_/g, " ")} → {wi.QUEUE}</span>
            <span>·</span>
            <span className={wi.PRIORITY === "URGENT" ? "text-red-600 font-semibold" : "font-medium"}>{wi.PRIORITY}</span>
            <span>·</span>
            <span>{wi.STATUS}</span>
          </div>
        )}

        {note?.NOTE_TEXT && (
          <div className="bg-white border border-gray-200 rounded-lg p-3.5">
            <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Investigation Notes</div>
            <p className="text-xs text-gray-700 leading-relaxed line-clamp-4">{note.NOTE_TEXT}</p>
          </div>
        )}

        <div className="flex gap-2 pt-1 border-t border-gray-100">
          <button
            onClick={onApprove}
            disabled={!!approving}
            className="flex-1 basis-0 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 disabled:bg-gray-200 disabled:text-gray-400 transition-colors"
          >
            {approving === claimId + "approve" ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={13} />}
            Approve
          </button>
          <button
            onClick={onStartEdit}
            className="flex-1 basis-0 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Edit3 size={12} /> Edit Letter
          </button>
          <button
            onClick={onToggleDeepDive}
            className={`flex-1 basis-0 py-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
              showDeepDive
                ? "bg-[#29B5E8] text-white"
                : "bg-[#eff6ff] hover:bg-[#dbeafe] text-[#1d4ed8] border border-[#bfdbfe]"
            }`}
          >
            <MessageSquare size={12} />
            {showDeepDive ? "▲ Close Deep Dive" : "💬 Deep Dive"}
          </button>
          <button
            onClick={onReject}
            disabled={!!approving}
            className="flex-1 basis-0 py-2 bg-white border border-gray-200 hover:bg-red-50 hover:border-red-200 text-red-600 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50 transition-colors"
          >
            {approving === claimId + "reject" ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={13} />}
            Reject
          </button>
        </div>
      </div>

      {showDeepDive && (
        <div className="p-4 flex flex-col min-h-0 overflow-hidden">
          <div className="flex items-center gap-2 mb-3 flex-shrink-0">
            <div className="w-2 h-2 rounded-full bg-green-400" />
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Interactive Agent — Deep Dive
            </span>
            <span className="text-[10px] text-gray-400 ml-1">Supercontextualized on {claimId}</span>
          </div>
          <div className="flex-1 min-h-0">
            <InteractiveAgentView
              initialClaimId={claimId}
              initialClaimContext={detail}
              compact
            />
          </div>
        </div>
      )}
    </div>
  );
}
