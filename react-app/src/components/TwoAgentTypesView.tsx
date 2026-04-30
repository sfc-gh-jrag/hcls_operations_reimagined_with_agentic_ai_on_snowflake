import type { TabId } from "../types";

interface Props {
  onNavigate: (tab: TabId) => void;
}

export function TwoAgentTypesView({ onNavigate }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[22px] font-extrabold text-gray-900">The Tale of Two Agents</h2>
        <p className="text-[13px] text-gray-500 mt-1">Both are powerful. Both are essential. The transformation comes from knowing which to deploy — and when.</p>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div className="bg-white border-2 border-blue-200 rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 px-6 py-5 border-b border-blue-200">
            <div className="text-[10px] font-bold uppercase tracking-widest text-blue-500 mb-1.5">Type 1</div>
            <div className="text-xl font-extrabold text-blue-800">Interactive Agent</div>
            <div className="inline-flex items-center gap-1.5 bg-white border border-blue-200 rounded-md px-2.5 py-1 text-[11px] font-semibold text-blue-600 mt-2">💬 Cortex Agent · Snowflake</div>
          </div>
          <div className="p-6">
            <div className="text-xs font-bold text-blue-800 mb-2.5">What makes it powerful</div>
            <p className="text-[13px] text-gray-600 leading-relaxed mb-4">The human stays in control. The agent amplifies their expertise with instant access to any data — claims history, contract text, eligibility, prior auth, payer patterns — delivered in a natural conversation.</p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {["Ad-hoc analysis", "Exception handling", "Complex investigations", "Guided exploration", "Physician & clinical dialogue"].map((c) => (
                <span key={c} className="inline-flex items-center gap-1 bg-green-50 border border-green-200 rounded-md px-2 py-0.5 text-[11px] font-medium text-green-700">✓ {c}</span>
              ))}
            </div>
            <div className="bg-blue-50 rounded-[10px] p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-blue-500 mb-1.5">Interaction Model</div>
              <div className="font-mono text-[11px] font-bold text-blue-800 tracking-wide">HUMAN ASKS → AGENT ANSWERS → HUMAN GUIDES → AGENT ACTS</div>
              <div className="text-[11px] text-gray-500 mt-1.5">The human drives. The agent executes their intent.</div>
            </div>
            <div className="mt-3.5 bg-gray-50 border-l-[3px] border-blue-500 rounded-r-lg p-3">
              <div className="text-xs font-semibold text-gray-900">Best for:</div>
              <div className="text-xs text-gray-500 mt-1 leading-relaxed">Cases that require your best people's judgment — escalations, novel situations, clinical nuance, strategic decisions.</div>
            </div>
          </div>
        </div>

        <div className="bg-white border-2 border-[#29B5E8] rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-br from-sky-50 to-sky-100 px-6 py-5 border-b border-[#29B5E8]">
            <div className="text-[10px] font-bold uppercase tracking-widest text-sky-600 mb-1.5">Type 2</div>
            <div className="text-xl font-extrabold text-sky-800">Worker Agent</div>
            <div className="inline-flex items-center gap-1.5 bg-white border border-sky-300 rounded-md px-2.5 py-1 text-[11px] font-semibold text-sky-600 mt-2">⚡ Cortex Code SDK · Snowflake</div>
          </div>
          <div className="p-6">
            <div className="text-xs font-bold text-sky-800 mb-2.5">What makes it powerful</div>
            <p className="text-[13px] text-gray-600 leading-relaxed mb-4">Triggered by an event, the agent doesn't follow a fixed script — it <strong>reasons through the problem</strong>. It decides what to investigate, interprets what it finds, weighs competing evidence, and determines the right path forward.</p>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {["Reasons through ambiguity", "Adapts based on findings", "Weighs evidence & context", "Knows when to escalate", "Runs without human input", "Produces auditable reasoning"].map((c) => (
                <span key={c} className="inline-flex items-center gap-1 bg-sky-50 border border-sky-200 rounded-md px-2 py-0.5 text-[11px] font-medium text-sky-700">✓ {c}</span>
              ))}
            </div>
            <div className="bg-sky-50 rounded-[10px] p-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-sky-600 mb-1.5">How it works</div>
              <div className="font-mono text-[11px] font-bold text-sky-800 tracking-wide leading-relaxed">TRIGGER → INVESTIGATE → REASON → DECIDE → ACT → SURFACE FOR REVIEW</div>
              <div className="text-[11px] text-gray-500 mt-1.5">Each step informs the next. The path is determined by what the data reveals — not by a fixed ruleset.</div>
            </div>
            <div className="mt-3.5 bg-gray-50 border-l-[3px] border-[#29B5E8] rounded-r-lg p-3">
              <div className="text-xs font-semibold text-gray-900">Best for:</div>
              <div className="text-xs text-gray-500 mt-1 leading-relaxed">Operational workflows where the right answer isn't always obvious — but the evidence is in your data. The agent finds it, interprets it, and acts on it.</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-[18px] border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">🎯 Right Tool, Right Job</h3>
          <p className="text-xs text-gray-400 mt-1">The question isn't which agent is better — it's which fits the situation</p>
        </div>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-[18px] py-2.5 text-left text-[11px] uppercase tracking-wider text-gray-400 font-semibold border-b border-gray-200">Scenario</th>
              <th className="px-[18px] py-2.5 text-center text-[11px] uppercase tracking-wider text-blue-500 font-semibold border-b border-gray-200 w-40">Interactive</th>
              <th className="px-[18px] py-2.5 text-center text-[11px] uppercase tracking-wider text-sky-600 font-semibold border-b border-gray-200 w-40">Worker</th>
            </tr>
          </thead>
          <tbody>
            {SCENARIOS.map((s, i) => (
              <tr key={i} className={`border-b border-gray-100 ${i % 2 === 1 ? "bg-gray-50/50" : ""}`}>
                <td className="px-[18px] py-3 text-[13px] text-gray-600">{s.scenario}</td>
                <td className="px-[18px] py-3 text-center text-lg">{s.interactive ? "✅" : "—"}</td>
                <td className="px-[18px] py-3 text-center text-lg">{s.worker ? "✅" : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-200 rounded-xl px-7 py-5 flex items-center justify-between">
        <div>
          <div className="text-[15px] font-bold text-gray-900 mb-1">See each agent in action</div>
          <div className="text-xs text-gray-500">Explore the Interactive Agent and Worker Agent independently, then see how they work together.</div>
        </div>
        <div className="flex gap-2.5">
          <button onClick={() => onNavigate("interactive")} className="bg-white border border-blue-200 rounded-lg px-4 py-2 text-xs font-semibold text-blue-700 cursor-pointer hover:bg-blue-50 transition-colors">💬 Interactive Agent →</button>
          <button onClick={() => onNavigate("worker")} className="bg-white border border-sky-300 rounded-lg px-4 py-2 text-xs font-semibold text-sky-700 cursor-pointer hover:bg-sky-50 transition-colors">⚡ Worker Agent →</button>
          <button onClick={() => onNavigate("together")} className="bg-[#29B5E8] border-none rounded-lg px-4 py-2 text-xs font-semibold text-white cursor-pointer hover:bg-[#1a9fd4] transition-colors">🔗 Working Together →</button>
        </div>
      </div>
    </div>
  );
}

const SCENARIOS = [
  { scenario: "High-volume routine processing (standard codes, known patterns, repeatable logic)", interactive: false, worker: true },
  { scenario: "Complex escalation requiring clinical, compliance, or contractual judgment", interactive: true, worker: false },
  { scenario: "Physician or patient-facing dialogue requiring empathy, context & nuance", interactive: true, worker: false },
  { scenario: "Overnight batch processing of queued cases while staff are offline", interactive: false, worker: true },
  { scenario: 'Ad-hoc investigation: "Why did our metrics shift this quarter?"', interactive: true, worker: false },
  { scenario: "Continuous monitoring, tracking & follow-up across payers and systems", interactive: false, worker: true },
  { scenario: "Exception review: Worker Agent flags a case outside its confidence threshold", interactive: true, worker: false },
];
