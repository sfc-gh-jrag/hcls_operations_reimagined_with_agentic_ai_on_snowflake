export function TheImpactView() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[22px] font-extrabold text-gray-900">The Impact</h2>
        <p className="text-[13px] text-gray-500 mt-1">One pattern. Every workflow. The same agentic approach that transforms denied claims handling applies across every operational bottleneck in healthcare.</p>
      </div>

      <div className="rounded-2xl p-7" style={{ background: "linear-gradient(135deg, #0f172a, #1e3a5f)" }}>
        <div className="text-lg font-extrabold text-white mb-5">Enterprise ROI Projection</div>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl p-[18px]" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div className="text-[10px] font-bold uppercase tracking-widest mb-2.5" style={{ color: "#94a3b8" }}>Revenue Recovery</div>
            <div className="font-mono text-xs leading-relaxed" style={{ color: "#cbd5e1" }}>
              Current recovery rate: 35%<br />
              Agent-assisted rate: 72%<br />
              Annual denied claims: $12M<br />
              Additional recovery: $12M × 37% = ...
            </div>
            <div className="text-[22px] font-black mt-2.5" style={{ color: "#29B5E8" }}>$4.44M</div>
            <div className="text-[11px] mt-1" style={{ color: "#7dd3fc" }}>Additional annual revenue recovered</div>
          </div>
          <div className="rounded-xl p-[18px]" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div className="text-[10px] font-bold uppercase tracking-widest mb-2.5" style={{ color: "#94a3b8" }}>Operational Efficiency</div>
            <div className="font-mono text-xs leading-relaxed" style={{ color: "#cbd5e1" }}>
              Current: 55 min/denial × 200/month<br />
              After: 3 min agent + 30 sec review<br />
              Time saved: 180 hrs/month<br />
              FTE equivalent: 1.1 FTEs reallocated
            </div>
            <div className="text-[22px] font-black mt-2.5" style={{ color: "#29B5E8" }}>180 hrs/mo</div>
            <div className="text-[11px] mt-1" style={{ color: "#7dd3fc" }}>Specialist time redirected to complex cases</div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-[18px] border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">One Pattern, Every Workflow</h3>
          <p className="text-xs text-gray-400 mt-1">The Worker Agent + Interactive Agent pattern isn't specific to denied claims. It's a repeatable architecture for any judgment-heavy operational workflow.</p>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-3 gap-3.5">
            {USE_CASES.map((uc) => (
              <div key={uc.name} className={`rounded-xl p-[18px] shadow-sm ${uc.live ? "bg-sky-50 border-2 border-[#29B5E8]" : "bg-white border border-gray-200"}`}>
                <div className="text-[22px] mb-2">{uc.icon}</div>
                <div className="text-[13px] font-bold text-gray-900 mb-1">{uc.name}</div>
                <div className="text-[11px] text-red-500 mb-1.5">{uc.before}</div>
                <div className="text-[11px] text-green-700 leading-relaxed">{uc.after}</div>
                <div className="mt-2.5">
                  {uc.live ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#29B5E8] text-white uppercase">Live Demo</span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 uppercase">Same Pattern</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl px-7 py-6 flex items-center justify-between" style={{ background: "#29B5E8" }}>
        <div>
          <div className="text-base font-extrabold text-white">Let's build this for your organization</div>
          <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.75)" }}>From proof-of-concept to production in weeks — using your data, your workflows, your Snowflake account.</div>
        </div>
        <button className="bg-white text-sky-700 border-none rounded-[10px] px-5 py-2.5 text-[13px] font-bold cursor-pointer whitespace-nowrap shrink-0">
          Start the Conversation →
        </button>
      </div>
    </div>
  );
}

const USE_CASES = [
  { name: "Denied Claims", icon: "🚫", before: "45–90 min per denial, 65% write-off rate", after: "Agent investigates in <3 min. Specialist reviews completed package in 30 seconds. Recovery rate 72%.", live: true },
  { name: "Prior Authorization", icon: "📋", before: "40+ hrs/physician/week on auth management", after: "Worker Agent tracks auth status, follows up automatically, flags expiring auths before they lapse.", live: false },
  { name: "Clinical Documentation", icon: "📄", before: "$8.6B/yr in physician documentation time", after: "Interactive Agent answers clinical queries in natural language, pulling from structured + unstructured data.", live: false },
  { name: "Discharge Planning", icon: "🏥", before: "$900/day per delayed discharge", after: "Worker Agent coordinates across departments, tracks milestones, surfaces blockers before they delay discharge.", live: false },
  { name: "Care Gap Management", icon: "👥", before: "40% eligible patients never contacted", after: "Worker Agent identifies gaps, personalizes outreach, routes to the right care coordinator with context.", live: false },
  { name: "Coding Review", icon: "🔢", before: "10–25% error rates caught months later", after: "Worker Agent reviews codes at submission time, flags mismatches, suggests corrections with clinical evidence.", live: false },
];
