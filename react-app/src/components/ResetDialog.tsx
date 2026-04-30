import { useState, useEffect, useRef } from "react";
import { RotateCcw, X, Check, Loader2, ChevronDown } from "lucide-react";

interface Claim {
  DENIAL_ID: string;
  CLAIM_ID: string;
  DENIAL_CODE: string;
  DENIAL_AMOUNT: number;
  PROCESSED_BY_AGENT: boolean;
  PATIENT_NAME: string;
}

interface Props {
  onResetComplete: () => void;
}

export function ResetDialog({ onResetComplete }: Props) {
  const [open, setOpen] = useState(false);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch("/data/reset-claims")
      .then((r) => r.json())
      .then((d) => {
        setClaims(d.claims || []);
        setSelected(new Set());
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const doReset = async (mode: "seed" | "clean" | "selective") => {
    setResetting(true);
    try {
      const body =
        mode === "selective"
          ? { claim_ids: Array.from(selected) }
          : { mode };
      await fetch("/data/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      onResetComplete();
      setOpen(false);
    } catch {}
    setResetting(false);
  };

  const processed = claims.filter((c) => c.PROCESSED_BY_AGENT);
  const selectedProcessed = Array.from(selected).filter((id) =>
    processed.some((c) => c.CLAIM_ID === id)
  );

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-md text-[11px] text-gray-500 font-medium transition-colors"
      >
        <RotateCcw size={11} />
        Reset Demo
        <ChevronDown size={10} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-[420px] bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-[13px] font-semibold text-gray-800">Reset Options</h3>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          </div>

          <div className="px-4 py-3 space-y-2 border-b border-gray-100">
            <button
              onClick={() => doReset("seed")}
              disabled={resetting}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-[12px] font-medium bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition-colors disabled:opacity-50"
            >
              {resetting ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
              <div>
                <div>Reset to Demo State</div>
                <div className="text-[10px] font-normal text-blue-500 mt-0.5">
                  6 processed claims + 1 unprocessed (Dorothy Walker)
                </div>
              </div>
            </button>
            <button
              onClick={() => doReset("clean")}
              disabled={resetting}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-[12px] font-medium bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200 transition-colors disabled:opacity-50"
            >
              {resetting ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
              <div>
                <div>Reset All (Clean Slate)</div>
                <div className="text-[10px] font-normal text-gray-400 mt-0.5">
                  Clear all agent data — all 7 claims become unprocessed
                </div>
              </div>
            </button>
          </div>

          <div className="px-4 py-2.5">
            <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Selective Reset
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 size={16} className="animate-spin text-gray-400" />
              </div>
            ) : processed.length === 0 ? (
              <p className="text-[11px] text-gray-400 py-2">No processed claims to reset.</p>
            ) : (
              <div className="space-y-1 max-h-[220px] overflow-y-auto">
                {processed.map((c) => (
                  <label
                    key={c.CLAIM_ID}
                    className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-md hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        selected.has(c.CLAIM_ID)
                          ? "bg-blue-500 border-blue-500"
                          : "border-gray-300 bg-white"
                      }`}
                      onClick={(e) => {
                        e.preventDefault();
                        toggle(c.CLAIM_ID);
                      }}
                    >
                      {selected.has(c.CLAIM_ID) && <Check size={10} className="text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-medium text-gray-700 truncate">
                        {c.PATIENT_NAME}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {c.CLAIM_ID} · {c.DENIAL_CODE} · ${Number(c.DENIAL_AMOUNT).toLocaleString()}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
            {selectedProcessed.length > 0 && (
              <button
                onClick={() => doReset("selective")}
                disabled={resetting}
                className="mt-2 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-[11px] font-medium bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-colors disabled:opacity-50"
              >
                {resetting ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                Reset Selected ({selectedProcessed.length})
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
