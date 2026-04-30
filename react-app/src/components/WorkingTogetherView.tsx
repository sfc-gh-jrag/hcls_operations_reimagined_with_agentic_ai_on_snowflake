import { ReviewQueueView } from "./ReviewQueueView";

export function WorkingTogetherView() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[22px] font-extrabold text-gray-900">Working Together</h2>
        <p className="text-[13px] text-gray-500 mt-1">The Worker Agent has already done the work. Your specialist opens completed packages — not raw claims. And when they need to go deeper, the Interactive Agent is on standby.</p>
      </div>

      <div className="rounded-2xl p-7" style={{ background: "linear-gradient(135deg, #0f172a, #1e3a5f)" }}>
        <div className="text-xl font-extrabold text-white mb-5">The Specialist's Role Has Fundamentally Changed</div>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl p-5" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)" }}>
            <div className="text-[11px] font-bold uppercase tracking-widest mb-3.5 flex items-center gap-1.5" style={{ color: "#fca5a5" }}>
              ❌ Before: The Processor
            </div>
            {BEFORE_ITEMS.map((item, i) => (
              <div key={i} className="flex gap-2 items-start py-[7px] text-xs" style={{ color: "#fca5a5", borderBottom: i < BEFORE_ITEMS.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                <span className="shrink-0">→</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
          <div className="rounded-xl p-5" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.25)" }}>
            <div className="text-[11px] font-bold uppercase tracking-widest mb-3.5 flex items-center gap-1.5" style={{ color: "#86efac" }}>
              ✓ After: The Reviewer
            </div>
            {AFTER_ITEMS.map((item, i) => (
              <div key={i} className="flex gap-2 items-start py-[7px] text-xs" style={{ color: "#86efac", borderBottom: i < AFTER_ITEMS.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                <span className="shrink-0">→</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <ReviewQueueView />

      <div className="rounded-2xl p-7" style={{ background: "linear-gradient(135deg, #0f172a, #1e3a5f)" }}>
        <div className="text-lg font-extrabold text-white mb-5 text-center">This Is the Complete Picture</div>
        <div className="grid items-center" style={{ gridTemplateColumns: "1fr auto 1fr auto 1fr", gap: 0 }}>
          <div className="text-center px-4">
            <div className="text-[28px] mb-2">⚡</div>
            <div className="text-[13px] font-bold mb-1" style={{ color: "#7dd3fc" }}>Worker Agent</div>
            <div className="text-xs leading-relaxed" style={{ color: "#94a3b8" }}>Processes claims autonomously. Investigates, reasons, classifies, drafts, routes. No human required until the work is done.</div>
          </div>
          <div className="text-2xl px-2.5" style={{ color: "#475569" }}>→</div>
          <div className="text-center px-4">
            <div className="text-[28px] mb-2">📋</div>
            <div className="text-[13px] font-bold mb-1" style={{ color: "#fbbf24" }}>Review Queue</div>
            <div className="text-xs leading-relaxed" style={{ color: "#94a3b8" }}>Specialist opens completed packages — not raw claims. Evidence assembled, strategy recommended, deadline flagged.</div>
          </div>
          <div className="text-2xl px-2.5" style={{ color: "#475569" }}>→</div>
          <div className="text-center px-4">
            <div className="text-[28px] mb-2">💬</div>
            <div className="text-[13px] font-bold mb-1" style={{ color: "#86efac" }}>Interactive Agent</div>
            <div className="text-xs leading-relaxed" style={{ color: "#94a3b8" }}>On standby for any question. Specialist approves with confidence. Seconds, not hours.</div>
          </div>
        </div>
        <div className="text-center text-[13px] mt-4 pt-4" style={{ color: "#94a3b8", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          Two agents. One seamless workflow. Your specialists' expertise applied where it matters most.
        </div>
      </div>
    </div>
  );
}

const BEFORE_ITEMS = [
  "45–90 min per denial across 6+ systems",
  "6 months to reach full productivity",
  "Deadlines missed under volume pressure",
];

const AFTER_ITEMS = [
  "30 seconds per review — approve, redirect, or escalate",
  "Day 1 contribution — agent handles complexity",
  "Every deadline tracked automatically",
];
