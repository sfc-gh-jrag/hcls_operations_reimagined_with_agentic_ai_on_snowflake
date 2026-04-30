import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  MessageSquare, Loader2, Send, Search, Database,
  ChevronDown, AlertTriangle, Clock, TrendingUp, CheckCircle2, X,
  Zap, Cpu, BookOpen, Wrench, Shield, Lock, FileText, Eye
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
  PAYER_ID?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ClaimContext = Record<string, any> | null;

interface ToolCallIndicator {
  type: "cortex_search" | "cortex_analyst";
  label: string;
  status: "running" | "complete";
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCallIndicator[];
  isStreaming?: boolean;
}

interface Props {
  initialClaimId?: string;
  initialClaimContext?: ClaimContext;
  compact?: boolean;
}

interface InteractivePersona {
  name: string;
  display_name: string;
  description: string;
  vertical: string;
  skills: Array<{ name: string; desc: string }>;
  data_sources: Array<{ table: string; desc: string; access: string }>;
  capabilities: Array<{ name: string; type: string; desc: string }>;
  is_live: boolean;
}

const INTERACTIVE_PERSONAS: InteractivePersona[] = [
  {
    name: "rcm_analytics_assistant",
    display_name: "RCM Analytics Assistant",
    description: "Strategic questions don't fit a predefined workflow. This Interactive Agent lets any leader — RCM Director, CFO, CMO — interrogate their operational data in plain language.",
    vertical: "Provider",
    skills: [
      { name: "Denial Trend Analysis", desc: "Identify spikes, shifts, and emerging patterns across payers and denial codes" },
      { name: "Revenue Impact Modeling", desc: "Quantify at-risk revenue, aging exposure, and recovery projections" },
      { name: "Payer Benchmarking", desc: "Compare performance metrics across payers, regions, and time periods" },
      { name: "Root Cause Investigation", desc: "Trace denial drivers to upstream process failures and documentation gaps" },
    ],
    data_sources: [
      { table: "DENIED_CLAIMS", desc: "All denied claims with codes, amounts, dates", access: "read" },
      { table: "PAYER_CONTRACTS", desc: "Contract terms, appeal windows, coverage rules", access: "read" },
      { table: "DENIAL_HISTORY", desc: "Historical overturn rates and resolution outcomes", access: "read" },
      { table: "PROVIDER_PERFORMANCE", desc: "Provider-level denial rates and trends", access: "read" },
    ],
    capabilities: [
      { name: "Cortex Analyst", type: "tool", desc: "Natural language to SQL over claims data via semantic view" },
      { name: "Payer Doc Search", type: "search", desc: "Semantic search over payer policy documents and contracts" },
      { name: "PII Guardrails", type: "guardrail", desc: "Patient data is referenced but never exposed in raw form" },
    ],
    is_live: true,
  },
  {
    name: "utilization_review_advisor",
    display_name: "Utilization Review Advisor",
    description: "Guides clinical staff through utilization review workflows — evaluating medical necessity, length of stay, and level of care decisions against payer criteria and clinical guidelines.",
    vertical: "Payer",
    skills: [
      { name: "Medical Necessity Evaluation", desc: "Assess clinical documentation against InterQual and Milliman criteria" },
      { name: "Length of Stay Analysis", desc: "Compare actual vs expected LOS with peer benchmarking" },
      { name: "Authorization Gap Detection", desc: "Identify missing or expiring prior authorizations before they become denials" },
      { name: "Clinical Evidence Synthesis", desc: "Summarize clinical notes and lab results relevant to the review decision" },
    ],
    data_sources: [
      { table: "CLINICAL_REVIEWS", desc: "UR case files with clinical criteria scores", access: "read" },
      { table: "AUTH_REQUESTS", desc: "Prior authorization submissions and statuses", access: "read" },
      { table: "CLINICAL_GUIDELINES", desc: "Payer-specific clinical criteria and protocols", access: "read" },
    ],
    capabilities: [
      { name: "Clinical NLP", type: "tool", desc: "Extract structured insights from unstructured clinical notes" },
      { name: "Guideline Search", type: "search", desc: "Semantic retrieval over clinical criteria and medical policies" },
      { name: "PHI Protection", type: "guardrail", desc: "All patient data handled under HIPAA-compliant access controls" },
    ],
    is_live: false,
  },
  {
    name: "compliance_audit_navigator",
    display_name: "Compliance Audit Navigator",
    description: "Helps compliance officers investigate regulatory adherence, audit findings, and corrective action plans across coding, billing, and documentation practices.",
    vertical: "Provider",
    skills: [
      { name: "Audit Finding Analysis", desc: "Surface patterns in audit findings across departments, coders, and payers" },
      { name: "Regulatory Cross-Reference", desc: "Map operational gaps to CMS, OIG, and state-specific regulations" },
      { name: "Corrective Action Tracking", desc: "Monitor open remediation items and deadline compliance" },
      { name: "Coding Accuracy Assessment", desc: "Analyze coding error rates, upcoding/downcoding patterns" },
    ],
    data_sources: [
      { table: "AUDIT_FINDINGS", desc: "Internal and external audit results", access: "read" },
      { table: "COMPLIANCE_POLICIES", desc: "Organizational compliance policies and procedures", access: "read" },
      { table: "CODING_REVIEWS", desc: "Coding accuracy reviews and error logs", access: "read" },
    ],
    capabilities: [
      { name: "Regulatory Search", type: "search", desc: "Semantic search over CMS rules, OIG guidelines, and payer policies" },
      { name: "Audit Analytics", type: "tool", desc: "Statistical analysis of audit trends and risk scoring" },
      { name: "Access Constraints", type: "constraint", desc: "Role-based access limited to compliance-authorized data sets" },
    ],
    is_live: false,
  },
  {
    name: "patient_access_coordinator",
    display_name: "Patient Access Coordinator",
    description: "Assists front-desk and scheduling staff with eligibility verification, benefit interpretation, and patient financial counseling — reducing upstream denials before they happen.",
    vertical: "Provider",
    skills: [
      { name: "Eligibility Verification", desc: "Real-time insurance eligibility checks with coverage detail interpretation" },
      { name: "Benefit Interpretation", desc: "Translate complex benefit structures into plain-language patient guidance" },
      { name: "Financial Estimation", desc: "Generate patient responsibility estimates based on coverage and contracted rates" },
      { name: "Pre-Service Auth Guidance", desc: "Determine if prior authorization is required and guide submission" },
    ],
    data_sources: [
      { table: "MEMBER_ELIGIBILITY", desc: "Active coverage records and benefit details", access: "read" },
      { table: "FEE_SCHEDULES", desc: "Contracted rates by payer and procedure", access: "read" },
      { table: "AUTH_REQUIREMENTS", desc: "Payer-specific pre-authorization rules", access: "read" },
    ],
    capabilities: [
      { name: "Benefit Lookup", type: "tool", desc: "Structured query over eligibility and benefit data" },
      { name: "Policy Search", type: "search", desc: "Retrieve payer-specific coverage and authorization requirements" },
      { name: "Patient Data Guardrails", type: "guardrail", desc: "Minimizes PHI exposure; only displays what's relevant to the inquiry" },
    ],
    is_live: false,
  },
];

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
  { title: "Human Asks", sub: "Question / hypothesis", style: "", border: "1px solid rgba(41,181,232,0.4)", titleColor: "#e0f2fe", subColor: "#7dd3fc" },
  { title: "Agent Answers", sub: "Data + Policy + Context", style: "background:rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)", titleColor: "#dcfce7", subColor: "#86efac" },
  { title: "Human Guides", sub: "Refine · Redirect · Decide", style: "", border: "1px solid rgba(41,181,232,0.4)", titleColor: "#e0f2fe", subColor: "#7dd3fc" },
  { title: "Agent Acts", sub: "Deeper analysis · Draft · Route", style: "background:rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.25)", titleColor: "#dcfce7", subColor: "#86efac" },
];

const SAMPLE_QUESTIONS: Record<string, string[]> = {
  rcm_analytics_assistant: [
    "Which denial codes have the highest overturn rates across all payers?",
    "How much revenue is at risk from claims expiring in the next 30 days?",
    "What are the top 5 root causes of denials by dollar amount?",
    "Compare denial rates across payers for prior authorization issues.",
    "Which providers have the highest denial volume this quarter?",
  ],
  utilization_review_advisor: [
    "What percentage of our UR cases are overturned on peer-to-peer review?",
    "Which service lines have the longest average length of stay vs benchmark?",
    "How many active authorizations are expiring in the next 7 days?",
    "What are the top clinical criteria gaps leading to medical necessity denials?",
    "Compare our admission denial rate to regional peers this quarter.",
  ],
  compliance_audit_navigator: [
    "What are the most common audit findings from our last external review?",
    "Which departments have the highest coding error rates this year?",
    "How many corrective action items are past their remediation deadline?",
    "What regulatory changes in the past quarter affect our billing practices?",
    "Show me upcoding/downcoding trends by specialty over the last 12 months.",
  ],
  patient_access_coordinator: [
    "What percentage of denials originated from eligibility verification failures?",
    "Which payers have the most complex prior authorization requirements?",
    "How accurate are our patient financial estimates vs actual charges?",
    "What are the top reasons for registration-related claim rejections?",
    "Which service lines generate the most pre-service authorization denials?",
  ],
};

function getThinkingText(toolCalls?: ToolCallIndicator[]): string {
  if (!toolCalls || toolCalls.length === 0) return "Thinking…";
  const running = toolCalls.find((t) => t.status === "running");
  if (running) {
    return running.type === "cortex_search"
      ? "Searching payer policy documents…"
      : "Querying claims data…";
  }
  if (toolCalls.every((t) => t.status === "complete")) {
    return "Synthesizing findings…";
  }
  return "Thinking…";
}

function StreamingMarkdown({ content, isStreaming }: { content: string; isStreaming?: boolean }) {
  return (
    <div className="agent-prose">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      {isStreaming && content && (
        <span className="inline-block w-[6px] h-[16px] ml-0.5 bg-blue-400 rounded-sm animate-blink align-text-bottom" />
      )}
    </div>
  );
}

export function InteractiveAgentView({ initialClaimId, initialClaimContext, compact = false }: Props) {
  const [denials, setDenials] = useState<DenialRow[]>([]);
  const [selectedId, setSelectedId] = useState<string>(initialClaimId || "");
  const [claimContext, setClaimContext] = useState<ClaimContext>(initialClaimContext || null);
  const [loadingContext, setLoadingContext] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [selectedPersona, setSelectedPersona] = useState<string>(INTERACTIVE_PERSONAS[0].name);

  const isStandalone = !compact && !initialClaimId;
  const persona = INTERACTIVE_PERSONAS.find((p) => p.name === selectedPersona) || INTERACTIVE_PERSONAS[0];
  const currentQuestions = SAMPLE_QUESTIONS[selectedPersona] || SAMPLE_QUESTIONS[INTERACTIVE_PERSONAS[0].name];

  useEffect(() => {
    if (!isStandalone) {
      fetch("/data/queue")
        .then((r) => r.json())
        .then((data) => {
          const rows: DenialRow[] = (data.denials || []).filter((d: DenialRow) => d.PROCESSED_BY_AGENT);
          setDenials(rows);
          if (!initialClaimId && rows.length > 0) {
            setSelectedId(rows[0].CLAIM_ID);
          }
        })
        .catch(() => {});
    }
  }, [initialClaimId, isStandalone]);

  useEffect(() => {
    if (!isStandalone && selectedId && !initialClaimContext) {
      loadClaimContext(selectedId);
    }
  }, [selectedId, initialClaimContext, isStandalone]);

  useEffect(() => {
    if (!isStandalone && claimContext && messages.length === 0) {
      seedOpeningMessage(claimContext);
    }
  }, [claimContext, isStandalone]);

  useEffect(() => {
    if (isStandalone && messages.length === 0) {
      setMessages([{
        id: "seed-" + Date.now(),
        role: "assistant",
        content:
          `Welcome! I'm the **${persona.display_name}**, powered by Snowflake Cortex.\n\n` +
          "I can help you analyze denial trends, investigate root causes, benchmark payer performance, " +
          "and quantify revenue impact — all from a conversation.\n\n" +
          "Try one of the sample questions, or ask me anything about your denied claims data.",
      }]);
    }
  }, [isStandalone]);

  useEffect(() => {
    const el = messagesEndRef.current;
    if (el) {
      const container = el.closest("[class*='overflow-y-auto']");
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, [messages]);

  const loadClaimContext = async (claimId: string) => {
    setLoadingContext(true);
    setMessages([]);
    try {
      const res = await fetch(`/data/results/${claimId}`);
      if (res.ok) {
        const data = await res.json();
        setClaimContext(data);
      }
    } catch { /* ignore */ }
    setLoadingContext(false);
  };

  const seedOpeningMessage = (ctx: ClaimContext) => {
    if (!ctx) return;
    const denial = ctx.denial || {};
    const ar = ctx.agent_result || {};
    const wis = ctx.work_items || [];
    const wi = wis[0] || {};
    const drafts = ctx.appeal_drafts || [];
    const draft = drafts[0] || {};
    const conf = ar.confidence ? `${Math.round(ar.confidence * 100)}%` : "N/A";
    const strategy = ar.recommended_strategy?.replace(/_/g, " ") || "N/A";
    const category = ar.denial_category || "N/A";

    const text = [
      `I've loaded the investigation package for **${denial.CLAIM_ID || "this claim"}**.`,
      ``,
      `**Worker Agent Summary:**`,
      `- Denial: ${denial.DENIAL_CODE || "N/A"} — ${(denial.DENIAL_REASON || "").slice(0, 80)}`,
      `- Category: ${category} | Strategy: ${strategy} | Confidence: ${conf}`,
      ar.root_cause ? `- Root Cause: ${ar.root_cause.slice(0, 120)}` : null,
      wi.PRIORITY ? `- Priority: ${wi.PRIORITY} | Queue: ${wi.QUEUE || "N/A"}` : null,
      draft.REVIEW_STATUS ? `- Appeal Draft: ${draft.REVIEW_STATUS}` : null,
      ``,
      `What would you like to explore before deciding on this claim?`,
    ].filter((l) => l !== null).join("\n");

    setMessages([{ id: "seed-" + Date.now(), role: "assistant", content: text }]);
  };

  const handleSend = async (overrideText?: string) => {
    const userText = (overrideText || input).trim();
    if (!userText || streaming) return;
    setInput("");

    const userMsg: ChatMessage = { id: "u-" + Date.now(), role: "user", content: userText };
    const assistantMsg: ChatMessage = {
      id: "a-" + Date.now(),
      role: "assistant",
      content: "",
      toolCalls: [],
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setStreaming(true);

    const chatHistory = messages
      .filter((m) => m.role === "user" || (m.role === "assistant" && !m.id.startsWith("seed-")))
      .map((m) => ({ role: m.role, content: m.content }));
    chatHistory.push({ role: "user", content: userText });

    abortRef.current = new AbortController();

    try {
      const res = await fetch("/data/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: chatHistory,
          claim_context: isStandalone ? null : claimContext,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accText = "";
      let accTools: ToolCallIndicator[] = [];
      let currentEventType = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("event:")) {
            currentEventType = line.slice(6).trim();
            continue;
          }
          if (!line.startsWith("data:")) continue;
          const raw = line.slice(5).trim();
          if (!raw || raw === "[DONE]") continue;
          try {
            const evt = JSON.parse(raw);

            if (currentEventType === "response.text.delta") {
              accText += evt.text || "";
              if (accTools.some((t) => t.status === "running")) {
                accTools = accTools.map((t) => ({ ...t, status: "complete" as const }));
              }
              setMessages((prev) =>
                prev.map((m) => m.id === assistantMsg.id ? { ...m, content: accText, toolCalls: [...accTools] } : m)
              );
            }

            if (currentEventType === "response.tool_use") {
              const toolName: string = evt.name || "";
              const toolType = toolName === "payer_doc_search" ? "cortex_search" : "cortex_analyst";
              const existingIdx = accTools.findIndex((t) => t.type === toolType);
              if (existingIdx === -1) {
                const indicator: ToolCallIndicator = toolName === "payer_doc_search"
                  ? { type: "cortex_search", label: "Searching payer policies", status: "running" }
                  : { type: "cortex_analyst", label: "Querying claims data", status: "running" };
                accTools = [...accTools, indicator];
              } else {
                accTools = accTools.map((t, i) => i === existingIdx ? { ...t, status: "running" as const } : t);
              }
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsg.id
                    ? { ...m, toolCalls: [...accTools] }
                    : m
                )
              );
            }

            if (currentEventType === "response.tool_result") {
              accTools = accTools.map((t) => ({ ...t, status: "complete" as const }));
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsg.id
                    ? { ...m, toolCalls: [...accTools] }
                    : m
                )
              );
            }

            if (currentEventType === "response.tool_result.analyst.delta") {
              const delta = evt.delta;
              if (delta?.text) {
                accText += delta.text;
                setMessages((prev) =>
                  prev.map((m) => m.id === assistantMsg.id ? { ...m, content: accText, toolCalls: [...accTools] } : m)
                );
              }
            }

            if (currentEventType === "response.status") {
              // status events like "planning", "executing_tool" - no action needed
            }

            if (currentEventType === "error") {
              const errMsg = evt.message || "Unknown agent error";
              accText += `\n\n*${errMsg}*\n`;
              setMessages((prev) =>
                prev.map((m) => m.id === assistantMsg.id ? { ...m, content: accText } : m)
              );
            }

            if (currentEventType === "response.text") {
              if (evt.text && !accText) {
                accText = evt.text;
                if (accTools.some((t) => t.status === "running")) {
                  accTools = accTools.map((t) => ({ ...t, status: "complete" as const }));
                }
                setMessages((prev) =>
                  prev.map((m) => m.id === assistantMsg.id ? { ...m, content: accText, toolCalls: [...accTools] } : m)
                );
              }
            }

            if (currentEventType === "response") {
              if (evt.content && Array.isArray(evt.content)) {
                const textItems = evt.content.filter((c: { type: string; text?: string }) => c.type === "text" && c.text);
                if (textItems.length > 0) {
                  accText = textItems.map((c: { text: string }) => c.text).join("\n\n");
                  accTools = accTools.map((t) => ({ ...t, status: "complete" as const }));
                  setMessages((prev) =>
                    prev.map((m) => m.id === assistantMsg.id ? { ...m, content: accText, toolCalls: [...accTools] } : m)
                  );
                }
              }
            }

            if (currentEventType === "done") break;
          } catch { /* skip malformed chunk */ }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id
              ? { ...m, content: "Sorry, an error occurred reaching the agent. Please try again.", isStreaming: false }
              : m
          )
        );
      }
    } finally {
      setMessages((prev) =>
        prev.map((m) => m.id === assistantMsg.id ? { ...m, isStreaming: false, toolCalls: (m.toolCalls || []).map((t) => ({ ...t, status: "complete" as const })) } : m)
      );
      setStreaming(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
    setStreaming(false);
    setMessages((prev) =>
      prev.map((m) => m.isStreaming ? { ...m, isStreaming: false } : m)
    );
  };

  const selectedDenial = denials.find((d) => d.CLAIM_ID === selectedId);

  const claimSuggestedQuestions = [
    "What's the historical overturn rate for this denial type?",
    "How many days do we have left to appeal?",
    "Is there a prior authorization on file under the group NPI?",
    "What does the payer contract say about this procedure?",
    "What documentation should we include in the appeal?",
  ];

  const canSend = isStandalone ? true : !!selectedId;

  const handlePersonaChange = (name: string) => {
    setSelectedPersona(name);
    setMessages([]);
    const p = INTERACTIVE_PERSONAS.find((pp) => pp.name === name);
    if (p && isStandalone) {
      setTimeout(() => {
        setMessages([{
          id: "seed-" + Date.now(),
          role: "assistant",
          content:
            `Welcome! I'm the **${p.display_name}**, powered by Snowflake Cortex.\n\n` +
            `${p.description}\n\n` +
            "Try one of the sample questions, or ask me anything.",
        }]);
      }, 50);
    }
  };

  const renderMessage = (msg: ChatMessage) => (
    <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
        msg.role === "assistant" ? "bg-blue-100 text-blue-700" : "bg-[#e0f2fe] text-[#0369a1]"
      }`}>
        {msg.role === "assistant" ? "AI" : isStandalone ? "D" : "S"}
      </div>
      <div className={`max-w-[78%] space-y-1.5 ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col`}>
        {msg.toolCalls && msg.toolCalls.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {msg.toolCalls.map((tc, i) => (
              <span key={i} className={`inline-flex items-center gap-1.5 text-[10px] font-medium px-2.5 py-1 rounded-md border ${
                tc.type === "cortex_search"
                  ? "bg-purple-50 text-purple-600 border-purple-200"
                  : "bg-blue-50 text-blue-600 border-blue-200"
              }`}>
                {tc.type === "cortex_search" ? <Search size={9} /> : <Database size={9} />}
                {tc.label}
                {tc.status === "running" && (
                  <span className="flex gap-0.5 ml-1">
                    <span className="typing-dot w-1 h-1 rounded-full" style={{ background: tc.type === "cortex_search" ? "#9333ea" : "#2563eb" }} />
                    <span className="typing-dot w-1 h-1 rounded-full" style={{ background: tc.type === "cortex_search" ? "#9333ea" : "#2563eb" }} />
                    <span className="typing-dot w-1 h-1 rounded-full" style={{ background: tc.type === "cortex_search" ? "#9333ea" : "#2563eb" }} />
                  </span>
                )}
                {tc.status === "complete" && (
                  <CheckCircle2 size={9} className="ml-0.5 text-emerald-500" />
                )}
              </span>
            ))}
          </div>
        )}
        <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
          msg.role === "user"
            ? "bg-[#eff6ff] text-[#1e3a5f] rounded-tr-sm"
            : "bg-gray-50 border border-gray-200 text-gray-800 rounded-tl-sm"
        }`}>
          {msg.content ? (
            <StreamingMarkdown content={msg.content} isStreaming={msg.isStreaming} />
          ) : msg.isStreaming ? (
            <div className="flex items-center gap-2 py-1">
              <span className="flex items-center gap-1">
                <span className="typing-dot w-1.5 h-1.5 bg-blue-400 rounded-full" />
                <span className="typing-dot w-1.5 h-1.5 bg-blue-400 rounded-full" />
                <span className="typing-dot w-1.5 h-1.5 bg-blue-400 rounded-full" />
              </span>
              <span className="text-xs text-gray-400 italic">{getThinkingText(msg.toolCalls)}</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );

  const renderChatInput = () => (
    <div className="p-3 border-t border-gray-100">
      <div className="flex gap-2 items-end">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            !canSend
              ? "Select a claim to start..."
              : streaming
              ? "Agent is responding..."
              : isStandalone
              ? "Ask about denial trends, payer patterns, revenue impact, overturn rates..."
              : "Ask about this claim, payer policies, overturn rates, filing deadlines..."
          }
          disabled={streaming || !canSend}
          className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#29B5E8] focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed"
        />
        {streaming ? (
          <button
            onClick={handleStop}
            className="p-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors flex-shrink-0"
            title="Stop"
          >
            <X size={16} />
          </button>
        ) : (
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || !canSend}
            className="p-2.5 bg-[#29B5E8] hover:bg-[#1a9fd4] disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-lg transition-colors flex-shrink-0"
          >
            <Send size={16} />
          </button>
        )}
      </div>
    </div>
  );

  const renderSampleQuestions = (questions: string[]) => (
    <div className="px-3 pb-3">
      <div className="flex items-center gap-1.5 mb-2">
        <Zap size={10} className="text-amber-500" />
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Sample Questions</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {questions.slice(0, 2).map((q) => (
          <button
            key={q}
            onClick={() => handleSend(q)}
            disabled={streaming || (isStandalone ? !persona.is_live : !canSend)}
            className="text-[11px] px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:bg-blue-50 hover:text-blue-800 hover:border-blue-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors leading-relaxed whitespace-nowrap"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );

  const renderPersonaCard = () => (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Cpu size={16} className="text-[#29B5E8]" />
            Agent Persona
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase bg-blue-50 text-blue-700">
              Type 1 — Cortex Agent
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${persona.is_live ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
              {persona.is_live ? "LIVE" : "CONFIGURED"}
            </span>
          </div>
        </div>
        <div className="relative">
          <select
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-[#29B5E8]"
            value={selectedPersona}
            onChange={(e) => handlePersonaChange(e.target.value)}
          >
            {INTERACTIVE_PERSONAS.map((p) => (
              <option key={p.name} value={p.name}>
                {p.display_name} ({p.vertical})
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" />
        </div>
        <div className="mt-3">
          <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${VERTICAL_COLORS[persona.vertical] || "bg-gray-100 text-gray-600"}`}>
            {persona.vertical}
          </span>
          <p className="text-xs text-gray-500 mt-2 leading-relaxed">{persona.description}</p>
        </div>
      </div>

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
    </div>
  );

  if (isStandalone) {
    return (
      <div className="space-y-5">
        <div className="rounded-2xl p-7 text-white" style={{ background: "linear-gradient(135deg, #0f172a, #1e3a5f)" }}>
          <div className="flex items-center gap-2.5 text-xl font-extrabold mb-1.5">
            Type 1: Interactive Agent
            <span className="text-[10px] font-bold bg-[#29B5E8] text-white rounded-md px-2 py-0.5">Type 1 · Cortex Agent</span>
          </div>
          <p className="text-[13px] max-w-[680px] leading-relaxed" style={{ color: "#cbd5e1" }}>
            The human is in the driver's seat, interacting with the agent and guiding it on how to proceed ahead. Every question, every follow-up, every decision point is driven by human judgment — the agent brings data, context, and reasoning to the table.
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

        <div className="grid grid-cols-12 gap-6 items-start">
          <div className="col-span-4 space-y-4">
            {renderPersonaCard()}


          </div>

          <div className="col-span-8 space-y-3">
            <div className="flex flex-col bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden" style={{ height: 520 }}>
              <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${persona.is_live ? "bg-green-400" : "bg-gray-300"}`} />
                  <span className="text-xs font-medium text-gray-600">
                    {persona.display_name} · {persona.is_live ? "All Payers · All Claims" : "Preview Mode"}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-gray-400">
                  <span className="flex items-center gap-1"><Search size={9} /> payer_doc_search</span>
                  <span className="flex items-center gap-1"><Database size={9} /> claims_analyst</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
                {!persona.is_live && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                      <Lock size={20} className="text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-500">
                      The <strong>{persona.display_name}</strong> persona is registered in the framework with its skill cluster, data sources, and capabilities configured.
                    </p>
                    <p className="text-xs text-gray-400 mt-2">Connect live data and skill definitions to enable interactive sessions.</p>
                  </div>
                )}
                {persona.is_live && messages.map(renderMessage)}
                <div ref={messagesEndRef} />
              </div>

              {persona.is_live && renderChatInput()}
            </div>
            {persona.is_live && (
              <div className="flex items-center gap-3">
                <Zap size={10} className="text-amber-500 shrink-0" />
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider shrink-0">Try</span>
                {currentQuestions.slice(0, 2).map((q) => (
                  <button
                    key={q}
                    onClick={() => handleSend(q)}
                    disabled={streaming || !persona.is_live}
                    className="text-[11px] px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:bg-blue-50 hover:text-blue-800 hover:border-blue-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors leading-relaxed whitespace-nowrap"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${compact ? "" : "min-h-[640px]"}`}>
      {!compact && (
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Interactive Agent</h2>
          <p className="text-gray-500 mt-1 text-sm">
            Type 1 — Cortex Agent · Powered by Snowflake Cortex. Supercontextualized on claim data, payer policies, and agent findings.
          </p>
        </div>
      )}

      <div className={`flex gap-4 ${compact ? "flex-col flex-1 min-h-0" : "flex-1 min-h-0"}`} style={compact ? {} : { height: "100%" }}>
        {!compact && (
          <div className="w-80 flex-shrink-0 space-y-3">
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <MessageSquare size={14} className="text-[#29B5E8]" />
                  Claim Context
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Select a processed claim to contextualize the agent</p>
              </div>
              <div className="p-3">
                <div className="relative">
                  <select
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-[#29B5E8]"
                    value={selectedId}
                    onChange={(e) => {
                      setSelectedId(e.target.value);
                      setMessages([]);
                    }}
                    disabled={streaming}
                  >
                    <option value="">— Select a claim —</option>
                    {denials.map((d) => (
                      <option key={d.DENIAL_ID} value={d.CLAIM_ID}>
                        {d.CLAIM_ID} · {d.DENIAL_CODE} · ${Number(d.DENIAL_AMOUNT).toLocaleString()}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" />
                </div>

                {loadingContext && (
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                    <Loader2 size={12} className="animate-spin" />
                    Loading claim context...
                  </div>
                )}

                {selectedDenial && claimContext && (
                  <div className="mt-3 space-y-1.5">
                    <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-lg">
                      <div className="text-xs font-semibold text-blue-800 mb-1.5">Claim Summary</div>
                      <div className="space-y-1">
                        {[
                          { icon: <AlertTriangle size={10} />, label: "Code", value: selectedDenial.DENIAL_CODE },
                          { icon: <TrendingUp size={10} />, label: "Amount", value: `$${Number(selectedDenial.DENIAL_AMOUNT).toLocaleString()}` },
                          { icon: <Database size={10} />, label: "Payer", value: selectedDenial.PAYER_ID || "N/A" },
                          { icon: <Clock size={10} />, label: "Patient", value: selectedDenial.PATIENT_NAME },
                        ].map((item) => (
                          <div key={item.label} className="flex items-center gap-1.5 text-xs text-blue-700">
                            <span className="text-blue-400">{item.icon}</span>
                            <span className="text-blue-500 font-medium">{item.label}:</span>
                            <span className="truncate">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {claimContext?.agent_result && (
                      <div className="p-2.5 bg-green-50 border border-green-100 rounded-lg">
                        <div className="text-xs font-semibold text-green-800 mb-1.5 flex items-center gap-1">
                          <CheckCircle2 size={10} /> Worker Agent Findings
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs">
                            <span className="text-green-600 font-medium">Strategy: </span>
                            <span className="text-green-700">
                              {(claimContext.agent_result.recommended_strategy || "N/A").replace(/_/g, " ")}
                            </span>
                          </div>
                          <div className="text-xs">
                            <span className="text-green-600 font-medium">Confidence: </span>
                            <span className="text-green-700">
                              {claimContext.agent_result.confidence
                                ? `${Math.round(claimContext.agent_result.confidence * 100)}%`
                                : "N/A"}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>


          </div>
        )}

        <div className={`flex flex-col flex-1 min-h-0 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden`}>
          <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${selectedId && claimContext ? "bg-green-400" : "bg-gray-300"}`} />
              <span className="text-xs font-medium text-gray-600">
                {selectedId && claimContext
                  ? `Context loaded: ${selectedId}`
                  : "No claim context — select a claim for a supercontextualized session"}
              </span>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-gray-400">
              <span className="flex items-center gap-1"><Search size={9} /> payer_doc_search</span>
              <span className="flex items-center gap-1"><Database size={9} /> claims_analyst</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
            {messages.length === 0 && !loadingContext && (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                <MessageSquare size={28} className="text-gray-200 mb-3" />
                <div className="text-sm font-medium text-gray-400">
                  {selectedId ? "Loading claim context..." : "Select a claim to begin"}
                </div>
                <div className="text-xs text-gray-300 mt-1">
                  The agent will be pre-loaded with the Worker Agent's full investigation package
                </div>
              </div>
            )}

            {messages.map(renderMessage)}
            <div ref={messagesEndRef} />
          </div>

          {renderChatInput()}
          {canSend && renderSampleQuestions(claimSuggestedQuestions)}
        </div>
      </div>
    </div>
  );
}
