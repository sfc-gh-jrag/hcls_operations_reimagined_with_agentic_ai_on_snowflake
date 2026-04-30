interface Props {
  onNext?: () => void;
}

export function CurrentStateView({ onNext }: Props) {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl p-8 text-white" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)" }}>
        <div className="text-[22px] font-extrabold leading-[1.35]">
          Why does healthcare still spend <span className="text-[#29B5E8]">20 cents of every dollar</span> on operational administration — despite decades of technology investment?
        </div>
        <p className="text-[13px] text-gray-400 mt-3.5 leading-relaxed">
          Because the hardest part of healthcare operations isn't accessing data — it's reasoning over it. Every denial, authorization, and other operational workflows demands judgment: interpreting contracts, weighing evidence, choosing the right action under ambiguity. Rule engines can't do this. Dashboards can't do this.
        </p>
        <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg text-[13px] font-semibold text-[#29B5E8]" style={{ background: "rgba(41,181,232,0.15)", border: "1px solid rgba(41,181,232,0.3)" }}>
          📊 $1.1 trillion in annual U.S. healthcare administrative spend (Research Woolhandler and Himmelstein)
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-[18px] border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">🏥 The Operational Overhead Crisis — Across Every HCLS Workflow</h3>
          <p className="text-xs text-gray-400 mt-1">Manual processes, expert judgment bottlenecks, and tribal knowledge risk — present in every operational function</p>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-4 gap-3">
            {BURDEN_TILES.map((t) => (
              <div key={t.name} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-base mb-2.5 ${t.iconBg}`}>{t.icon}</div>
                <div className="text-[13px] font-bold text-gray-900">{t.name}</div>
                <div className="text-xs font-bold text-red-500 my-1">{t.cost}</div>
                <div className="text-[11px] text-gray-400 leading-relaxed">{t.why}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl p-6 flex items-center justify-between cursor-pointer" style={{ background: "linear-gradient(90deg, #0f172a, #1e293b)" }} onClick={onNext}>
        <div>
          <div className="text-white font-bold text-base">Now let's zoom in to one example : Denied Claims Handling (By Provider)</div>
          <div className="text-gray-400 text-xs mt-1">The same pattern of manual overhead and tribal knowledge that makes denials hard makes every process above hard. The same solution applies to all of them.</div>
        </div>
        <div className="text-gray-500 text-[22px]">→</div>
      </div>
    </div>
  );
}

const BURDEN_TILES = [
  { name: "Denied Claims", cost: "$262B lost annually", why: "Requires judgment: tribal NPI knowledge, contract interpretation, per-claim ROI calculation", icon: "🚫", iconBg: "bg-red-50" },
  { name: "Prior Authorization", cost: "40+ hrs/physician/week", why: "Payer rules change constantly; requires real-time policy lookup + clinical context per request", icon: "📋", iconBg: "bg-amber-50" },
  { name: "Clinical Documentation", cost: "$8.6B/yr in physician time", why: "Query resolution requires clinical judgment, not just data retrieval — interrupts care delivery", icon: "📄", iconBg: "bg-blue-50" },
  { name: "Discharge Planning", cost: "$900/day per delayed discharge", why: "Multi-party coordination with uncertain timelines — requires constant human follow-up", icon: "🏥", iconBg: "bg-green-50" },
  { name: "Care Gap Management", cost: "40% eligible never contacted", why: "Reaching the right patient with the right intervention requires personalization at scale", icon: "👥", iconBg: "bg-purple-50" },
  { name: "Coding Review", cost: "10–25% error rates", why: "Requires understanding of clinical context, not just code lookup — errors found months later", icon: "🔢", iconBg: "bg-orange-50" },
  { name: "Contract Compliance", cost: "Millions undetected monthly", why: "Requires comparing 300-page contracts against claim-level data — no one has time to do it", icon: "📑", iconBg: "bg-emerald-50" },
  { name: "Compliance Monitoring", cost: "Reactive-only today", why: "Patterns only visible across millions of data points — no human can monitor continuously", icon: "🔍", iconBg: "bg-red-50" },
];
