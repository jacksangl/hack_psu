import { useGlobeStore } from "../../store/globeStore";
import type { NewsCategory } from "../../api/mockData";

const CATEGORIES: { value: NewsCategory; label: string }[] = [
  { value: "politics", label: "Politics" },
  { value: "conflict", label: "Conflict" },
  { value: "economy", label: "Economy" },
  { value: "business", label: "Business" },
  { value: "climate", label: "Climate" },
  { value: "health", label: "Health" },
  { value: "technology", label: "Tech" },
  { value: "diplomacy", label: "Diplomacy" },
];

export function CategoryFilter() {
  const selectedCategory = useGlobeStore((s) => s.selectedCategory);
  const setSelectedCategory = useGlobeStore((s) => s.setSelectedCategory);

  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mr-1">
        Filter
      </span>
      <div className="flex gap-1.5 flex-wrap">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-2.5 py-1 rounded text-xs font-medium transition-colors duration-150 ${
            selectedCategory === null
              ? "bg-accent-teal/15 text-accent-teal border border-accent-teal/30"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
          }`}
        >
          All
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() =>
              setSelectedCategory(
                selectedCategory === cat.value ? null : cat.value
              )
            }
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors duration-150 ${
              selectedCategory === cat.value
                ? "bg-accent-teal/15 text-accent-teal border border-accent-teal/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>
    </div>
  );
}
