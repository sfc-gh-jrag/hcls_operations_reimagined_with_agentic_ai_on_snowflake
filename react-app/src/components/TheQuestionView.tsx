interface Props {
  onReveal: () => void;
}

export function TheQuestionView({ onReveal }: Props) {
  return (
    <div className="flex items-center justify-center" style={{ minHeight: "62vh", padding: "40px 32px" }}>
      <div className="text-center max-w-[820px]">
        <h1 className="text-[42px] font-black text-gray-900 leading-[1.25] tracking-tight">
          Can AI Agents make a difference?
        </h1>
        <div className="mt-10">
          <button
            onClick={onReveal}
            className="bg-[#29B5E8] hover:bg-[#1a9fd4] text-white border-none rounded-xl px-9 py-4 text-base font-bold cursor-pointer tracking-tight transition-all"
            style={{ boxShadow: "0 4px 16px rgba(41,181,232,0.35)" }}
          >
            Let's find out →
          </button>
        </div>
      </div>
    </div>
  );
}
