import { useState, useEffect, useCallback, useRef } from "react";
import type { TabId } from "./types";
import { CurrentStateView } from "./components/CurrentStateView";
import { TodaysFocusView } from "./components/TodaysFocusView";
import { TheQuestionView } from "./components/TheQuestionView";
import { TwoAgentTypesView } from "./components/TwoAgentTypesView";
import { InteractiveAgentView } from "./components/InteractiveAgentView";
import { AgentProcessingView } from "./components/AgentProcessingView";
import { WorkingTogetherView } from "./components/WorkingTogetherView";
import { TheImpactView } from "./components/TheImpactView";
import {
  AlertTriangle, Target, HelpCircle, Scale, MessageSquare, Cpu,
  Link2, TrendingUp, RotateCcw, X, CheckSquare, Square, RotateCw, Trash2
} from "lucide-react";

interface ResetClaim {
  DENIAL_ID: string;
  CLAIM_ID: string;
  DENIAL_CODE: string;
  DENIAL_AMOUNT: number;
  PROCESSED_BY_AGENT: boolean;
  PATIENT_NAME: string;
}

function ResetDialog({
  open,
  onClose,
  onReset,
}: {
  open: boolean;
  onClose: () => void;
  onReset: (mode: "seed" | "clean" | "selective", claimIds?: string[]) => void;
}) {
  const [claims, setClaims] = useState<ResetClaim[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/data/reset-claims")
      .then((r) => r.json())
      .then((d) => {
        setClaims(d.claims || []);
        setSelected(new Set());
      })
      .catch(() => setClaims([]))
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const processedClaims = claims.filter((c) => c.PROCESSED_BY_AGENT);
  const toggleClaim = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-[520px] max-h-[80vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h2 className="text-[15px] font-bold text-gray-900">Reset Demo</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-md">
            <X size={16} className="text-gray-400" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => onReset("seed")}
              className="flex flex-col items-start gap-1.5 p-3.5 rounded-lg border-2 border-[#29B5E8]/30 bg-[#f0f9ff] hover:border-[#29B5E8] hover:bg-[#e0f2fe] transition-all text-left"
            >
              <div className="flex items-center gap-2">
                <RotateCw size={14} className="text-[#29B5E8]" />
                <span className="text-[12px] font-bold text-gray-800">Reset to Demo State</span>
              </div>
              <span className="text-[10px] text-gray-500 leading-snug">
                Restores 6 pre-processed claims + 1 unprocessed (Dorothy Walker CO-96)
              </span>
            </button>
            <button
              onClick={() => onReset("clean")}
              className="flex flex-col items-start gap-1.5 p-3.5 rounded-lg border-2 border-gray-200 bg-gray-50 hover:border-red-300 hover:bg-red-50 transition-all text-left"
            >
              <div className="flex items-center gap-2">
                <Trash2 size={14} className="text-gray-500" />
                <span className="text-[12px] font-bold text-gray-800">Reset All (Clean)</span>
              </div>
              <span className="text-[10px] text-gray-500 leading-snug">
                Clears all agent data — all 7 claims become unprocessed
              </span>
            </button>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-8">
              <RotateCcw size={16} className="animate-spin text-gray-400" />
              <span className="ml-2 text-[12px] text-gray-400">Loading claims...</span>
            </div>
          )}

          {!loading && processedClaims.length > 0 && (
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  Or reset specific claims
                </span>
                {selected.size > 0 && (
                  <button
                    onClick={() => onReset("selective", Array.from(selected))}
                    className="text-[11px] font-semibold text-white bg-[#29B5E8] hover:bg-[#1a9fd0] px-3 py-1.5 rounded-md transition-colors"
                  >
                    Reset Selected ({selected.size})
                  </button>
                )}
              </div>
              <div className="space-y-1">
                {processedClaims.map((c) => {
                  const isSelected = selected.has(c.CLAIM_ID);
                  return (
                    <button
                      key={c.CLAIM_ID}
                      onClick={() => toggleClaim(c.CLAIM_ID)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all ${
                        isSelected
                          ? "border-[#29B5E8] bg-[#f0f9ff]"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      }`}
                    >
                      {isSelected ? (
                        <CheckSquare size={15} className="text-[#29B5E8] shrink-0" />
                      ) : (
                        <Square size={15} className="text-gray-300 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono font-bold text-gray-700">
                            {c.CLAIM_ID}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 rounded font-medium text-gray-500">
                            {c.DENIAL_CODE}
                          </span>
                        </div>
                        <span className="text-[10px] text-gray-400">
                          {c.PATIENT_NAME} · ${Number(c.DENIAL_AMOUNT).toLocaleString()}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {!loading && processedClaims.length === 0 && claims.length > 0 && (
            <p className="text-[12px] text-gray-400 text-center py-4">
              No processed claims to selectively reset.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

const ALL_TABS: { id: TabId; label: string; icon: typeof AlertTriangle; badge?: string; hidden?: boolean }[] = [
  { id: "challenge",   label: "The Challenge",      icon: AlertTriangle },
  { id: "focus",       label: "Today's Focus",      icon: Target },
  { id: "question",    label: "The Question",       icon: HelpCircle },
  { id: "twoAgents",   label: "The Tale of Two Agents", icon: Scale,    hidden: true },
  { id: "interactive", label: "Interactive Agent",   icon: MessageSquare, badge: "Type 1", hidden: true },
  { id: "worker",      label: "Worker Agent",        icon: Cpu,           badge: "Type 2", hidden: true },
  { id: "together",    label: "Working Together",    icon: Link2,         hidden: true },
  { id: "impact",      label: "The Impact",          icon: TrendingUp,    hidden: true },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>("challenge");
  const mainRef = useRef<HTMLElement>(null);
  const [revealed, setRevealed] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  const handleReveal = () => {
    setRevealed(true);
    setActiveTab("twoAgents");
    mainRef.current?.scrollTo(0, 0);
  };

  const handleReset = useCallback(
    async (mode: "seed" | "clean" | "selective", claimIds?: string[]) => {
      setResetDialogOpen(false);
      setResetting(true);
      try {
        const payload: Record<string, unknown> = { mode };
        if (mode === "selective" && claimIds?.length) {
          payload.claim_ids = claimIds;
        }
        await fetch("/data/reset", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        setResetKey((k) => k + 1);
        setRevealed(false);
        setActiveTab("challenge");
        mainRef.current?.scrollTo(0, 0);
      } catch {
        /* ignore */
      }
      setResetting(false);
    },
    []
  );

  const visibleTabs = ALL_TABS.filter((t) => !t.hidden || revealed);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-3.5 shadow-sm">
        <div className="max-w-[1360px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-[34px] h-[34px] bg-[#29B5E8] rounded-lg flex items-center justify-center">
              <span className="text-white font-extrabold text-lg">❄</span>
            </div>
            <div>
              <h1 className="text-[17px] font-bold text-gray-900 leading-tight">
                Agentic HCLS Operations
              </h1>
              <p className="text-[11px] text-gray-400">
                Powered by Cortex Code SDK & Cortex Agents - Snowflake
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setResetDialogOpen(true)}
              disabled={resetting}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 rounded-md text-[11px] text-gray-500 font-medium transition-colors"
            >
              <RotateCcw size={11} className={resetting ? "animate-spin" : ""} />
              {resetting ? "Resetting..." : "Reset Demo"}
            </button>
            <span className="px-2.5 py-1 bg-gray-100 rounded-md text-[11px] text-gray-500 font-medium">
              DENIED CLAIMS DEMO
            </span>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b border-gray-200 px-4 overflow-x-auto">
        <div className="max-w-[1360px] mx-auto flex whitespace-nowrap">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); mainRef.current?.scrollTo(0, 0); }}
                className={`flex items-center gap-1.5 px-3 py-[13px] text-[12px] font-medium border-b-2 transition-all shrink-0 ${
                  active
                    ? "border-[#29B5E8] text-[#29B5E8] font-semibold"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <Icon size={13} />
                {tab.label}
                {tab.badge && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide ${
                    active ? "bg-[#e0f2fe] text-[#0369a1]" : "bg-gray-100 text-gray-500"
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      <main ref={mainRef} className="flex-1 overflow-auto">
        <div className="max-w-[1360px] mx-auto px-8 py-7">
          <div style={{ display: activeTab === "challenge"   ? undefined : "none" }}><CurrentStateView key={resetKey} onNext={() => { setActiveTab("focus"); mainRef.current?.scrollTo(0, 0); }} /></div>
          <div style={{ display: activeTab === "focus"       ? undefined : "none" }}><TodaysFocusView key={resetKey} /></div>
          <div style={{ display: activeTab === "question"    ? undefined : "none" }}><TheQuestionView onReveal={handleReveal} /></div>
          <div style={{ display: activeTab === "twoAgents"   ? undefined : "none" }}><TwoAgentTypesView onNavigate={(id) => { setActiveTab(id); mainRef.current?.scrollTo(0, 0); }} /></div>
          <div style={{ display: activeTab === "interactive" ? undefined : "none" }}><InteractiveAgentView key={resetKey} /></div>
          <div style={{ display: activeTab === "worker"      ? undefined : "none" }}><AgentProcessingView key={resetKey} /></div>
          <div style={{ display: activeTab === "together"    ? undefined : "none" }}><WorkingTogetherView key={resetKey} /></div>
          <div style={{ display: activeTab === "impact"      ? undefined : "none" }}><TheImpactView /></div>
        </div>
      </main>

      <ResetDialog
        open={resetDialogOpen}
        onClose={() => setResetDialogOpen(false)}
        onReset={handleReset}
      />
    </div>
  );
}
