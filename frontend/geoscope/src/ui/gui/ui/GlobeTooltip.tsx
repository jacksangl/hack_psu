import { useGlobeStore } from "../../../store/globeStore";

export function GlobeTooltip() {
  const hoveredCountry = useGlobeStore((state) => state.hoveredCountry);
  const hoveredStoryTitle = useGlobeStore((state) => state.hoveredStoryTitle);
  const hoveredScreenPosition = useGlobeStore(
    (state) => state.hoveredScreenPosition
  );

  const label = hoveredCountry ?? hoveredStoryTitle;

  if (!label || !hoveredScreenPosition) {
    return null;
  }

  return (
    <div
      className="fixed z-30 pointer-events-none px-3 py-2 max-w-[240px] rounded-lg border border-slate-700/70 bg-slate-950/90 text-xs text-slate-100 shadow-[0_14px_40px_rgba(2,6,23,0.45)] backdrop-blur-sm"
      style={{
        left: hoveredScreenPosition.x,
        top: hoveredScreenPosition.y,
        transform: "translate(12px, -50%)",
      }}
    >
      {label}
    </div>
  );
}
