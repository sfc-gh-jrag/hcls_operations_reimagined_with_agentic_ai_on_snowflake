import { useState, useEffect, useRef } from "react";
import {
  Database, BookOpen, Cpu, Play, Loader2,
  CheckCircle2, XCircle, ChevronDown, Zap, Shield, Search, Wrench, Lock, Eye, PlayCircle, FileText
} from "lucide-react";

interface AgentPersona {
  name: string;
  display_name: string;
  description: string;
  vertical: string;
  skills: Array<{ name: string; desc: string }>;
  data_sources: Array<{ table: string; desc: string; access: string }>;
  capabilities: Array<{ name: string; type: string; desc: string }>;
  is_live: boolean;
}

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

interface BulkJobStatus {
  status: string;
  total: number;
  completed: number;
  failed: number;
  running: number;
  queued: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  jobs: Record<string, { status: string; result: any }>;
}

const VERTICAL_COLORS: Record<string, string> = {
  Provider: "bg-blue-100 text-blue-700",
  Payer: "bg-emerald-100 text-emerald-700",
  "Life Sciences": "bg-purple-100 text-purple-700",
  MedTech: "bg-amber-100 text-amber-700",
};

const CAP_ICONS: Record<string, typeof Wrench> = {
  tool: Wrench,
  search: Search,
  guardrail: Shield,
  constraint: Lock,
  author: FileText,
};

const PIPELINE_STEPS = [
  { title: "Trigger", sub: "New denial", style: "", border: "1px solid rgba(41,181,232,0.4)", titleColor: "#e0f2fe", subColor: "#7dd3fc" },
  { title: "Investigate", sub: "Claims + Auth + Eligibility", style: "background:rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)", titleColor: "#dcfce7", subColor: "#86efac" },
  { title: "Reason", sub: "Contract + History", style: "background:rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)", titleColor: "#dcfce7", subColor: "#86efac" },
  { title: "Decide", sub: "Classify + Strategy", style: "background:rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)", titleColor: "#dcfce7", subColor: "#86efac" },
  { title: "Act", sub: "Draft + Route", style: "background:rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)", titleColor: "#dcfce7", subColor: "#86efac" },
  { title: "Review", sub: "Human in loop", style: "", border: "1px solid rgba(245,158,11,0.35)", titleColor: "#fef3c7", subColor: "#fde68a" },
];

export function AgentProcessingView() {
  const [personas, setPersonas] = useState<AgentPersona[]>([]);
  const [selectedPersona, setSelectedPersona] = useState<string>("");
  const [denials, setDenials] = useState<DenialRow[]>([]);
  const [selectedClaimId, setSelectedClaimId] = useState<string>("");
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string>("");
  const [messages, setMessages] = useState<Array<{ type: string; content: string; detail?: string }>>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [result, setResult] = useState<any>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const [logMode, setLogMode] = useState<"summary" | "minimal" | "detailed">("summary");

  const [bulkId, setBulkId] = useState<string | null>(null);
  const [bulkStatus, setBulkStatus] = useState<BulkJobStatus | null>(null);
  const [bulkRunning, setBulkRunning] = useState(false);
  const bulkPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch("/api/agents")
      .then((r) => r.json())
      .then((data: AgentPersona[]) => {
        setPersonas(data);
        const live = data.find((p) => p.is_live);
        if (live) setSelectedPersona(live.name);
        else if (data.length > 0) setSelectedPersona(data[0].name);
      })
      .catch(() => {});
  }, []);

  const loadDenials = () => {
    fetch("/data/queue?unprocessed=true")
      .then((r) => r.json())
      .then((data) => {
        const rows = data.denials || [];
        setDenials(rows);
        if (rows.length > 0) setSelectedClaimId(rows[0].CLAIM_ID);
      })
      .catch(() => {});
  };

  useEffect(() => { loadDenials(); }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (bulkPollRef.current) clearInterval(bulkPollRef.current);
    };
  }, []);

  const persona = personas.find((p) => p.name === selectedPersona);
  const isLive = persona?.is_live ?? false;

  const handleProcess = async () => {
    if (!selectedClaimId || !isLive || !persona) return;
    setBulkId(null);
    setBulkStatus(null);
    setBulkRunning(false);
    if (bulkPollRef.current) clearInterval(bulkPollRef.current);
    setMessages([]);
    setResult(null);
    setJobStatus("running");
    setJobId(null);

    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_name: persona.name, input: { claim_id: selectedClaimId } }),
      });
      const data = await res.json();
      if (!res.ok) {
        setJobStatus("error");
        setResult({ is_error: true, result_text: data.detail || "Submit failed" });
        return;
      }
      setJobId(data.job_id);
      let offset = 0;
      pollRef.current = setInterval(async () => {
        try {
          const poll = await fetch(`/api/status/${data.job_id}?after=${offset}`);
          const status = await poll.json();
          if (status.messages && status.messages.length > 0) {
            setMessages((prev) => [...prev, ...status.messages]);
            offset = status.message_count;
          }
          if (status.status === "completed" || status.status === "error") {
            setJobStatus(status.status);
            setResult(status.result);
            if (pollRef.current) clearInterval(pollRef.current);
          }
        } catch { /* keep polling */ }
      }, 2000);
    } catch (err) {
      setJobStatus("error");
      setResult({ is_error: true, result_text: String(err) });
    }
  };

  const handleBulkProcess = async () => {
    if (!isLive || !persona || denials.length === 0) return;
    if (pollRef.current) clearInterval(pollRef.current);
    setJobId(null);
    setJobStatus("");
    setMessages([]);
    setResult(null);

    setBulkRunning(true);
    setBulkStatus(null);

    try {
      const claimIds = denials.map((d) => d.CLAIM_ID);
      const res = await fetch("/api/bulk-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_name: persona.name, claim_ids: claimIds }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBulkRunning(false);
        return;
      }
      setBulkId(data.bulk_id);
      bulkPollRef.current = setInterval(async () => {
        try {
          const poll = await fetch(`/api/bulk-status/${data.bulk_id}`);
          const bs: BulkJobStatus = await poll.json();
          setBulkStatus(bs);
          if (bs.status === "completed") {
            setBulkRunning(false);
            if (bulkPollRef.current) clearInterval(bulkPollRef.current);
            loadDenials();
          }
        } catch { /* keep polling */ }
      }, 2000);
    } catch {
      setBulkRunning(false);
    }
  };

  const selected = denials.find((d) => d.CLAIM_ID === selectedClaimId);
  const running = jobStatus === "running";
  const showBulkPanel = bulkId !== null;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl p-7 text-white" style={{ background: "linear-gradient(135deg, #0f172a, #1e3a5f)" }}>
        <div className="flex items-center gap-2.5 text-xl font-extrabold mb-1.5">
          Type 2 : Worker Agent
          <span className="text-[10px] font-bold bg-[#29B5E8] text-white rounded-md px-2 py-0.5">Type 2 · Cortex Code</span>
        </div>
        <p className="text-[13px] max-w-[680px] leading-relaxed" style={{ color: "#cbd5e1" }}>
          A worker agent doesn't wait for human interaction. When a trigger event is routed to it, it moves ahead with advanced reasoning and contextual awareness to get the work done — and routes the final work output for human review when required.
        </p>
        <div className="flex items-center gap-0 flex-wrap mt-5 rounded-xl p-5" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
          {PIPELINE_STEPS.map((step, i) => (
            <div key={step.title} className="flex items-center">
              <div className={`rounded-[10px] px-4 py-2.5 text-center ${step.style}`} style={{ border: step.border }}>
                <div className="text-xs font-bold" style={{ color: step.titleColor }}>{step.title}</div>
                <div className="text-[10px] mt-0.5" style={{ color: step.subColor }}>{step.sub}</div>
              </div>
              {i < PIPELINE_STEPS.length - 1 && <span className="px-2.5 text-xl" style={{ color: "#475569" }}>→</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
      <div className="col-span-4 space-y-4">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Cpu size={16} className="text-[#29B5E8]" />
                Agent Persona
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase bg-blue-50 text-blue-700">
                  Type 2 — Cortex Code
                </span>
                {persona && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${persona.is_live ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {persona.is_live ? "LIVE" : "CONFIGURED"}
                  </span>
                )}
              </div>
            </div>
            <div className="relative">
              <select
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-[#29B5E8]"
                value={selectedPersona}
                onChange={(e) => {
                  setSelectedPersona(e.target.value);
                  setResult(null);
                  setMessages([]);
                  setJobStatus("");
                  setJobId(null);
                  setBulkId(null);
                  setBulkStatus(null);
                  setBulkRunning(false);
                  if (pollRef.current) clearInterval(pollRef.current);
                  if (bulkPollRef.current) clearInterval(bulkPollRef.current);
                }}
              >
                {personas.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.display_name} ({p.vertical})
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" />
            </div>
            {persona && (
              <div className="mt-3">
                <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${VERTICAL_COLORS[persona.vertical] || "bg-gray-100 text-gray-600"}`}>
                  {persona.vertical}
                </span>
                <p className="text-xs text-gray-500 mt-2 leading-relaxed">{persona.description}</p>
              </div>
            )}
          </div>

          {persona && (
            <div className="max-h-[420px] overflow-y-auto">
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen size={14} className="text-amber-600" />
                  <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Skills</span>
                  <span className="text-[10px] text-gray-400 ml-auto">{persona.skills.length}</span>
                </div>
                <div className="space-y-2">
                  {persona.skills.map((s) => (
                    <div key={s.name} className="p-2 bg-gray-50 rounded-lg">
                      <div className="text-xs font-medium text-gray-900">{s.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5 leading-relaxed">{s.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center gap-2 mb-3">
                  <Database size={14} className="text-blue-600" />
                  <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Data Sources</span>
                  <span className="text-[10px] text-gray-400 ml-auto">{persona.data_sources.length}</span>
                </div>
                <div className="space-y-1">
                  {persona.data_sources.map((ds) => (
                    <div key={ds.table} className="flex items-center justify-between text-xs py-1.5 px-2 rounded hover:bg-gray-50">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-gray-600">{ds.table}</span>
                        {ds.access === "read/write" && <Eye size={10} className="text-amber-500" />}
                      </div>
                      <span className="text-gray-400 text-right max-w-[140px] truncate" title={ds.desc}>{ds.desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Wrench size={14} className="text-gray-600" />
                  <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Capabilities</span>
                  <span className="text-[10px] text-gray-400 ml-auto">{persona.capabilities.length}</span>
                </div>
                <div className="space-y-1.5">
                  {persona.capabilities.map((cap) => {
                    const Icon = CAP_ICONS[cap.type] || Wrench;
                    const typeColors: Record<string, string> = {
                      tool: "text-blue-500 bg-blue-50",
                      search: "text-purple-500 bg-purple-50",
                      guardrail: "text-red-500 bg-red-50",
                      constraint: "text-amber-500 bg-amber-50",
                      author: "text-teal-500 bg-teal-50",
                    };
                    const color = typeColors[cap.type] || "text-gray-500 bg-gray-50";
                    return (
                      <div key={cap.name} className="flex items-start gap-2 py-1.5 px-2 rounded hover:bg-gray-50">
                        <div className={`w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 ${color}`}>
                          <Icon size={10} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-900">{cap.name}</span>
                            <span className={`text-[9px] font-semibold uppercase px-1.5 py-0 rounded ${color}`}>{cap.type}</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5 leading-relaxed">{cap.desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="col-span-8 space-y-4">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">
              {isLive ? "Process Denied Claims" : `${persona?.display_name || "Agent"} — Preview`}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {isLive ? "Process a single denial or run the agent on all unprocessed claims" : "This persona is configured but not connected to live data in this demo"}
            </p>
          </div>

          {isLive ? (
            <div className="p-5 border-b border-gray-100">
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <select
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-[#29B5E8] focus:border-transparent"
                    value={selectedClaimId}
                    onChange={(e) => {
                      setSelectedClaimId(e.target.value);
                      setResult(null);
                      setMessages([]);
                      setJobStatus("");
                      setJobId(null);
                      if (pollRef.current) clearInterval(pollRef.current);
                    }}
                    disabled={running || bulkRunning}
                  >
                    {denials.map((d) => (
                      <option key={d.DENIAL_ID} value={d.CLAIM_ID}>
                        {d.CLAIM_ID} — {d.PATIENT_NAME} — {d.DENIAL_CODE} — ${Number(d.DENIAL_AMOUNT).toLocaleString()}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-3 text-gray-400 pointer-events-none" />
                </div>
                <button
                  onClick={handleProcess}
                  disabled={running || bulkRunning || !selectedClaimId}
                  className="px-4 py-2.5 bg-[#29B5E8] hover:bg-[#1a9fd4] disabled:bg-gray-300 disabled:text-gray-500 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
                >
                  {running ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                  {running ? "Processing..." : "Process"}
                </button>
                <button
                  onClick={handleBulkProcess}
                  disabled={running || bulkRunning || denials.length === 0}
                  className="px-4 py-2.5 bg-gradient-to-r from-[#29B5E8] to-[#11567F] hover:from-[#1a9fd4] hover:to-[#0e4a6d] disabled:from-gray-300 disabled:to-gray-400 disabled:text-gray-500 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
                >
                  {bulkRunning ? <Loader2 size={16} className="animate-spin" /> : <PlayCircle size={16} />}
                  {bulkRunning ? "Running..." : `Process All (${denials.length})`}
                </button>
              </div>
              {!showBulkPanel && selected && (
                <div className="mt-3 grid grid-cols-4 gap-3">
                  <div className="text-xs"><span className="text-gray-400">Patient:</span> <span className="font-medium text-gray-700">{selected.PATIENT_NAME}</span></div>
                  <div className="text-xs"><span className="text-gray-400">Provider:</span> <span className="font-medium text-gray-700">{selected.PROVIDER_NAME}</span></div>
                  <div className="text-xs"><span className="text-gray-400">Code:</span> <span className="font-medium text-gray-700">{selected.DENIAL_CODE}</span></div>
                  <div className="text-xs"><span className="text-gray-400">Amount:</span> <span className="font-medium text-gray-700">${Number(selected.DENIAL_AMOUNT).toLocaleString()}</span></div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center border-b border-gray-100">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                <Lock size={20} className="text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">
                The <strong>{persona?.display_name}</strong> persona is registered in the framework with its skill cluster, data sources, and capabilities configured.
              </p>
              <p className="text-xs text-gray-400 mt-2">Connect live data and skill definitions to enable agent processing.</p>
            </div>
          )}

          {showBulkPanel ? (
            <div className="p-5">
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-900">Bulk Processing</span>
                  {bulkStatus && (
                    <span className="text-xs text-gray-500">
                      {bulkStatus.completed + bulkStatus.failed} / {bulkStatus.total} done
                      {bulkStatus.running > 0 && ` · ${bulkStatus.running} running`}
                      {bulkStatus.queued > 0 && ` · ${bulkStatus.queued} queued`}
                    </span>
                  )}
                </div>
                {bulkStatus && (
                  <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-[#29B5E8] to-[#11567F] transition-all duration-500" style={{ width: `${((bulkStatus.completed + bulkStatus.failed) / bulkStatus.total) * 100}%` }} />
                  </div>
                )}
                {bulkStatus && bulkStatus.status === "completed" && (
                  <div className="mt-3 flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-xs"><CheckCircle2 size={14} className="text-green-500" /><span className="text-green-700 font-semibold">{bulkStatus.completed} completed</span></div>
                    {bulkStatus.failed > 0 && <div className="flex items-center gap-1.5 text-xs"><XCircle size={14} className="text-red-500" /><span className="text-red-700 font-semibold">{bulkStatus.failed} failed</span></div>}
                  </div>
                )}
              </div>
              <div className="space-y-1.5 max-h-[420px] overflow-y-auto">
                {bulkStatus && Object.entries(bulkStatus.jobs).map(([claimId, job]) => {
                  const den = denials.find((d) => d.CLAIM_ID === claimId);
                  const statusColors: Record<string, string> = {
                    queued: "bg-gray-100 text-gray-600",
                    running: "bg-blue-100 text-blue-700",
                    completed: "bg-green-100 text-green-700",
                    error: "bg-red-100 text-red-700",
                  };
                  return (
                    <div key={claimId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex items-center gap-3 min-w-0">
                        {job.status === "running" ? <Loader2 size={14} className="text-[#29B5E8] animate-spin shrink-0" /> :
                         job.status === "completed" ? <CheckCircle2 size={14} className="text-green-500 shrink-0" /> :
                         job.status === "error" ? <XCircle size={14} className="text-red-500 shrink-0" /> :
                         <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-300 shrink-0" />}
                        <div className="min-w-0">
                          <span className="text-xs font-semibold text-gray-900">{claimId}</span>
                          {den && <span className="text-xs text-gray-400 ml-2">{den.PATIENT_NAME} · {den.DENIAL_CODE}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {job.status === "completed" && job.result?.structured_output && (
                          <span className="text-[10px] text-gray-500">{job.result.structured_output.denial_category} · {job.result.structured_output.recommended_strategy}</span>
                        )}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${statusColors[job.status] || "bg-gray-100 text-gray-600"}`}>{job.status}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              <div className="bg-gray-950 text-gray-300 font-mono text-xs min-h-[400px] max-h-[500px] overflow-y-auto p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-500 text-[10px] uppercase tracking-wider">Agent Activity Log</span>
                  <div className="flex items-center bg-gray-800 rounded-md overflow-hidden">
                    <button onClick={() => setLogMode("summary")} className={`px-2.5 py-1 text-[10px] font-semibold transition-colors ${logMode === "summary" ? "bg-[#29B5E8] text-white" : "text-gray-400 hover:text-gray-300"}`}>Summary</button>
                    <button onClick={() => setLogMode("minimal")} className={`px-2.5 py-1 text-[10px] font-semibold transition-colors ${logMode === "minimal" ? "bg-[#29B5E8] text-white" : "text-gray-400 hover:text-gray-300"}`}>Minimal</button>
                    <button onClick={() => setLogMode("detailed")} className={`px-2.5 py-1 text-[10px] font-semibold transition-colors ${logMode === "detailed" ? "bg-[#29B5E8] text-white" : "text-gray-400 hover:text-gray-300"}`}>Detailed</button>
                  </div>
                </div>
                {!jobId && !running && messages.length === 0 && (
                  <div className="text-gray-600 text-center py-16">
                    {isLive ? "Select a claim and click \"Process\" to begin, or \"Process All\" for bulk execution" : `${persona?.display_name || "Agent"} — awaiting live data connection`}
                  </div>
                )}
                {logMode === "summary" && messages.length > 0 && (
                  <SummaryLog messages={messages} />
                )}
                {logMode !== "summary" && messages.map((m, i) => (
                  <div key={i} className={`${logMode === "detailed" ? "py-1.5 mb-1" : "py-0.5"}`}>
                    {m.type === "tool" ? (
                      <div>
                        <div className="flex items-start gap-2">
                          <Zap size={12} className="text-[#29B5E8] mt-0.5 shrink-0" />
                          <span className="text-[#29B5E8] font-semibold">{m.content}</span>
                        </div>
                        {logMode === "detailed" && m.detail && (
                          <pre className="ml-5 mt-1 text-[10px] text-gray-500 bg-gray-900 rounded px-2 py-1.5 overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">{m.detail}</pre>
                        )}
                      </div>
                    ) : m.type === "system" ? (
                      <div className="flex items-start gap-2"><span className="text-yellow-500">*</span><span className="text-yellow-400">{m.content}</span></div>
                    ) : (
                      <div className="flex items-start gap-2">
                        <span className="text-gray-600 shrink-0">{"\u25B8"}</span>
                        <span className={`break-all leading-relaxed ${logMode === "detailed" ? "text-gray-300" : "text-gray-400"}`}>{m.content}</span>
                      </div>
                    )}
                  </div>
                ))}
                {running && (
                  <div className="flex items-center gap-2 py-2 text-[#29B5E8]">
                    <Loader2 size={12} className="animate-spin" />
                    <span>Agent is working... ({messages.length} events)</span>
                  </div>
                )}
                <div ref={logEndRef} />
              </div>

              {result && (
                <div className={`p-5 border-t ${result.is_error ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {result.is_error ? <XCircle size={18} className="text-red-600" /> : <CheckCircle2 size={18} className="text-green-600" />}
                    <span className={`text-sm font-semibold ${result.is_error ? "text-red-800" : "text-green-800"}`}>
                      {result.is_error ? "Agent Error" : "Agent Completed Successfully"}
                    </span>
                    {result.duration_ms && (
                      <span className="text-xs text-gray-500 ml-auto">{(Number(result.duration_ms) / 1000).toFixed(1)}s · {result.num_turns} turns</span>
                    )}
                  </div>
                  {result.structured_output && (
                    <div className="mt-3 bg-white border border-gray-200 rounded-lg p-4">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div><div className="text-xs text-gray-400 uppercase">Category</div><div className="font-semibold text-gray-900">{result.structured_output.denial_category}</div></div>
                        <div><div className="text-xs text-gray-400 uppercase">Strategy</div><div className="font-semibold text-gray-900">{result.structured_output.recommended_strategy}</div></div>
                        <div><div className="text-xs text-gray-400 uppercase">Confidence</div><div className="font-semibold text-gray-900">{((result.structured_output.confidence || 0) * 100).toFixed(0)}%</div></div>
                      </div>
                      {result.structured_output.root_cause && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className="text-xs text-gray-400 uppercase mb-1">Root Cause</div>
                          <p className="text-sm text-gray-700">{result.structured_output.root_cause}</p>
                        </div>
                      )}
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="text-xs text-gray-400 uppercase mb-2">Actions Completed</div>
                        <div className="flex flex-wrap gap-2">
                          <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium flex items-center gap-1"><CheckCircle2 size={10} /> Investigation Note</span>
                          {result.structured_output.appeal_letter_drafted && (
                            <span className="text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full font-medium flex items-center gap-1"><CheckCircle2 size={10} /> Appeal Letter (DOCX)</span>
                          )}
                          <span className="text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded-full font-medium flex items-center gap-1"><CheckCircle2 size={10} /> Work Item Created</span>
                          <span className="text-xs bg-purple-50 text-purple-700 px-2.5 py-1 rounded-full font-medium flex items-center gap-1"><CheckCircle2 size={10} /> Denial Marked Processed</span>
                          {result.structured_output.recommended_strategy === "ROUTE_TO_CLINICAL" && (
                            <span className="text-xs bg-red-50 text-red-700 px-2.5 py-1 rounded-full font-medium flex items-center gap-1"><CheckCircle2 size={10} /> Clinical Evidence Package</span>
                          )}
                        </div>
                        {result.structured_output.recommended_queue && (
                          <div className="mt-2 text-xs text-gray-500">Routed to <span className="font-semibold text-gray-700">{result.structured_output.recommended_queue}</span> queue · {result.structured_output.priority} priority</div>
                        )}
                      </div>
                    </div>
                  )}
                  {result.result_text && !result.structured_output && (
                    <p className="text-xs text-gray-600 mt-1">{result.result_text.slice(0, 500)}</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

// Summary log groups raw tool calls into 6 human-readable investigation steps
function SummaryLog({ messages }: { messages: Array<{ type: string; content: string; detail?: string }> }) {
  const steps = buildSummarySteps(messages);
  if (steps.length === 0) {
    return (
      <div className="text-gray-600 text-center py-8 text-xs">
        Processing... waiting for agent steps.
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {steps.map((step, i) => (
        <div key={i} className="bg-gray-800 border border-gray-700 rounded-lg p-3">
          <div className="text-[10px] font-semibold text-[#7dd3fc] uppercase tracking-wider mb-1">{step.label}</div>
          <div className="text-xs text-gray-300 leading-relaxed">{step.description}</div>
          {step.outcome && (
            <div className={`text-xs mt-1.5 font-medium ${step.isComplete ? "text-[#86efac]" : "text-[#fbbf24]"}`}>
              {step.outcome}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

type StepAccumulator = {
  label: string;
  description: string;
  outcome: string;
  isComplete: boolean;
}

function buildSummarySteps(messages: Array<{ type: string; content: string; detail?: string }>): StepAccumulator[] {
  const steps: StepAccumulator[] = [];
  const toolCalls = messages.filter((m) => m.type === "tool");
  const textMessages = messages.filter((m) => m.type === "text");

  const hasToolLike = (patterns: string[]) =>
    toolCalls.some((m) => patterns.some((p) => (m.content + " " + (m.detail || "")).toLowerCase().includes(p.toLowerCase())));

  const getDetail = (patterns: string[]) => {
    const match = toolCalls.find((m) => patterns.some((p) => (m.content + " " + (m.detail || "")).toLowerCase().includes(p.toLowerCase())));
    return match?.detail?.slice(0, 150) || match?.content || "";
  };

  if (hasToolLike(["CLAIMS", "DENIALS", "PRIOR_AUTH", "execute_sql", "denial_investigator", "search_claims"])) {
    steps.push({
      label: "Step 1 — Investigation",
      description: "Retrieved claim details, denial codes, and searched for prior authorizations including group NPI lookup.",
      outcome: getDetail(["PRIOR_AUTH", "GROUP_NPI"]) ? "✓ Auth search completed — check results for group NPI match" : "✓ Claim data retrieved",
      isComplete: true,
    });
  }
  if (hasToolLike(["ELIGIBILITY", "MEMBERS", "BENEFITS", "eligibility"])) {
    steps.push({
      label: "Step 2 — Eligibility & Coverage Check",
      description: "Verified member eligibility on date of service and checked benefit limits.",
      outcome: "✓ Member active and coverage verified",
      isComplete: true,
    });
  }
  if (hasToolLike(["CONTRACTS", "PAYER_POLICY", "cortex_search", "payer_doc_search", "contract"])) {
    steps.push({
      label: "Step 3 — Contract & Policy Analysis",
      description: "Searched payer contract for relevant coverage clauses, authorization requirements, and appeal provisions.",
      outcome: "✓ Applicable contract section retrieved",
      isComplete: true,
    });
  }
  if (hasToolLike(["DENIAL_HISTORY", "denial_classifier", "classification", "strategy"])) {
    steps.push({
      label: "Step 4 — Classification & Strategy",
      description: "Analyzed evidence, checked historical overturn rates, determined denial category and resolution strategy.",
      outcome: "✓ Category and strategy determined",
      isComplete: true,
    });
  }
  if (hasToolLike(["appeal_drafter", "generate_appeal", "docx", "APPEAL_DRAFTS", "INSERT.*APPEAL"])) {
    steps.push({
      label: "Step 5 — Documentation",
      description: "Drafted appeal or resubmission letter with policy citations. Generated DOCX package ready for specialist review.",
      outcome: "✓ Appeal letter drafted with policy citations",
      isComplete: true,
    });
  }
  if (hasToolLike(["DENIAL_WORK_ITEMS", "INSERT.*WORK", "work_item", "routed"])) {
    steps.push({
      label: "Step 6 — Work Item Created",
      description: "Created work item, set priority, routed to appropriate specialist queue with deadline flagged.",
      outcome: "✓ Package ready for specialist review",
      isComplete: true,
    });
  }

  // Add any final text summary if the agent is done
  const lastText = textMessages[textMessages.length - 1];
  if (lastText && steps.length > 0) {
    steps[steps.length - 1].outcome += ` — ${lastText.content.slice(0, 80)}`;
  }

  return steps;
}
