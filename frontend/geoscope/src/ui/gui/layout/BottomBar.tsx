import { HEATMAP_GRADIENT_STOPS, heatToHex } from "../../../utils/heatmapColors";

export function BottomBar() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-20 flex items-center px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="text-[10px] text-slate-500 uppercase tracking-wider">
          Low
        </span>
        <div className="flex gap-0.5">
          {HEATMAP_GRADIENT_STOPS.map((stop) => (
            <span
              key={stop}
              className="w-5 h-2 rounded-sm"
              style={{ backgroundColor: heatToHex(stop) }}
            />
          ))}
        </div>
        <span className="text-[10px] text-slate-500 uppercase tracking-wider">
          High Coverage
        </span>
      </div>
    </footer>
  );
}
