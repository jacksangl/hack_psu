import { sentimentToHex, sentimentLabel } from "../../utils/sentimentColors";
import type { Sentiment } from "../../utils/sentimentColors";

const LEGEND_ITEMS: Sentiment[] = ["positive", "neutral", "negative", "crisis"];

export function BottomBar() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-20 flex items-center px-4 py-3">
      <div className="flex items-center gap-4">
        {LEGEND_ITEMS.map((sentiment) => (
          <div key={sentiment} className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: sentimentToHex(sentiment) }}
            />
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">
              {sentimentLabel(sentiment)}
            </span>
          </div>
        ))}
      </div>
    </footer>
  );
}
