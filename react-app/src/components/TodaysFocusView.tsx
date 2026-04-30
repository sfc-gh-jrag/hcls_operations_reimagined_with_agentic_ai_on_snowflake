import { useState, useEffect } from "react";

interface QueueSummary {
  count: number;
  totalAmount: number;
}

export function TodaysFocusView() {
  const [queue, setQueue] = useState<QueueSummary | null>(null);

  useEffect(() => {
    fetch("/data/queue")
      .then((r) => r.json())
      .then((data) => {
        const denials = data.denials || [];
        let total = 0;
        for (const d of denials) total += Number(d.DENIAL_AMOUNT || 0);
        setQueue({ count: denials.length, totalAmount: total });
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[22px] font-extrabold text-gray-900">Today's Focus: Denied Claims</h2>
        <p className="text-[13px] text-gray-500 mt-1">We're zooming into one workflow — but everything you see here reflects the same pattern of judgment bottlenecks, tribal knowledge, and manual overhead present in every process on the previous tab.</p>
      </div>

      {queue && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Queue Today", value: String(queue.count), sub: "denied claims", color: "text-gray-900", icon: "🛡" },
            { label: "Revenue at Risk", value: "$" + queue.totalAmount.toLocaleString(), sub: "pending recovery", color: "text-red-500", icon: "📉" },
            { label: "Est. Time to Clear", value: `${Math.round(queue.count * 55 / 60)}+ hrs`, sub: "at 45-65 min/claim", color: "text-amber-500", icon: "⏱" },
            { label: "Systems Required", value: "6+", sub: "disconnected platforms", color: "text-gray-900", icon: "🖥" },
          ].map((c) => (
            <div key={c.label} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-2">{c.icon} {c.label}</div>
              <div className={`text-[28px] font-extrabold leading-none ${c.color}`}>{c.value}</div>
              <div className="text-xs text-gray-400 mt-1">{c.sub}</div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-[18px] border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">🧠 The Judgment Calls That Make Denials Hard</h3>
          <p className="text-xs text-gray-400 mt-1">Each denial isn't just a checklist — it demands reasoning, domain knowledge, and decisions under ambiguity</p>
        </div>
        <div>
          {JUDGMENT_CALLS.map((jc, i) => (
            <div key={i} className={`flex gap-3.5 p-[18px] px-5 ${i < JUDGMENT_CALLS.length - 1 ? "border-b border-gray-100" : ""}`}>
              <div className="shrink-0">
                <div className={`w-10 h-10 rounded-[10px] flex items-center justify-center text-lg ${jc.iconBg}`}>{jc.icon}</div>
              </div>
              <div className="flex-1">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[13px] font-semibold text-gray-900">{jc.question}</div>
                    <div className="text-[11px] text-gray-500 mt-1 leading-relaxed">{jc.context}</div>
                  </div>
                  <span className={`shrink-0 inline-block px-2.5 py-1 rounded-full text-[11px] font-semibold ${jc.pillColor}`}>{jc.difficulty}</span>
                </div>
                <div className="mt-2.5 bg-gray-50 rounded-lg p-2.5 px-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">What makes this hard</div>
                  <div className="text-[11px] text-gray-600 leading-relaxed">{jc.whyHard}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-[18px] border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">💸 The Real Cost</h3>
        </div>
        <div className="grid grid-cols-2 gap-px bg-gray-200">
          {PAIN_POINTS.map((p, i) => (
            <div key={i} className="bg-white p-5 flex gap-4 items-start">
              <div className="text-[30px] font-extrabold text-red-500 shrink-0 w-[72px] text-right">{p.stat}</div>
              <div>
                <div className="text-[13px] font-semibold text-gray-900">{p.label}</div>
                <div className="text-xs text-gray-400 mt-1">{p.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const JUDGMENT_CALLS = [
  {
    question: "Is this a true missing authorization — or was it filed under a different NPI?",
    context: "CO-197 denials say \"prior auth not obtained,\" but 40% of the time the auth exists — filed under the group NPI, not the individual provider NPI.",
    whyHard: "The specialist must know to search by GROUP NPI — a workaround only learned through experience. New staff hit dead ends for months before a colleague teaches them this.",
    difficulty: "Tribal Knowledge",
    pillColor: "bg-red-50 text-red-600",
    icon: "❓",
    iconBg: "bg-red-50",
  },
  {
    question: "Does the payer contract actually exclude this — or is there a rider that covers it?",
    context: "CO-50 denials claim \"non-covered,\" but contracts often have riders buried deep in 200–300 page PDFs that override the standard exclusion.",
    whyHard: "The specialist must search a 200-page PDF, interpret contract language, and distinguish a hard exclusion from one with an override — with no structured search.",
    difficulty: "Contract Interpretation",
    pillColor: "bg-amber-50 text-amber-700",
    icon: "📖",
    iconBg: "bg-amber-50",
  },
  {
    question: "Should I appeal, resubmit with corrections, or route to clinical review?",
    context: "The right resolution depends on denial category, evidence strength, historical overturn rates for this payer, filing window, and whether clinical judgment is involved.",
    whyHard: "A technical error is a resubmission. A coverage dispute with strong evidence is an appeal. But if the overturn rate is 15% and the window is 7 days, is it worth the effort? If it involves medical necessity, clinical review is required — making that determination yourself violates compliance.",
    difficulty: "Multi-Factor Decision",
    pillColor: "bg-purple-50 text-purple-700",
    icon: "⚖️",
    iconBg: "bg-purple-50",
  },
];

const PAIN_POINTS = [
  { stat: "70%", label: "Time spent gathering information", detail: "Specialists spend the vast majority hunting for data across systems — not making decisions." },
  { stat: "40%", label: "Auth searches that hit dead ends", detail: "Standard authorization searches fail because the auth was filed under a group NPI." },
  { stat: "6+", label: "Months for new specialist to be productive", detail: "Tribal knowledge about payer quirks and contract clauses takes months to accumulate." },
  { stat: "45–90", label: "Minutes per denial resolution", detail: "Including investigation, classification, documentation, and routing — one complex denial can take over an hour." },
];
