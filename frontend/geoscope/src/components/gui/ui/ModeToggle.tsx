import { useGlobeStore } from "../../../store/globeStore";

export function ModeToggle() {
  const connectDotsMode = useGlobeStore((s) => s.connectDotsMode);
  const toggleConnectDots = useGlobeStore((s) => s.toggleConnectDots);

  return (
    <button
      onClick={toggleConnectDots}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 border ${
        connectDotsMode
          ? "bg-accent-amber/15 text-accent-amber border-accent-amber/30 glow-amber"
          : "bg-slate-800/60 text-slate-400 border-slate-700 hover:text-slate-300 hover:border-slate-600"
      }`}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <circle cx="3" cy="3" r="1.5" />
        <circle cx="11" cy="5" r="1.5" />
        <circle cx="5" cy="11" r="1.5" />
        <path d="M4.2 3.8l5.2 0.8M4.2 10l5.2-4" opacity="0.6" />
      </svg>
      Connect the Dots
    </button>
  );
}
