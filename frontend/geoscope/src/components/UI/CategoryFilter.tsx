import { useGlobeStore } from "../../store/globeStore";
import type { NewsCategory } from "../../api/mockData";

const CATEGORIES: { value: NewsCategory; label: string; icon: string }[] = [
  { value: "politics", label: "Politics", icon: "🏛️" },
  { value: "economics", label: "Economics", icon: "💰" },
  { value: "technology", label: "Technology", icon: "🚀" },
  { value: "environment", label: "Environment", icon: "🌍" },
  { value: "disaster", label: "Disaster", icon: "⚠️" },
  { value: "health", label: "Health", icon: "🏥" },
];

export function CategoryFilter() {
  const selectedCategory = useGlobeStore((s) => s.selectedCategory);
  const setSelectedCategory = useGlobeStore((s) => s.setSelectedCategory);

  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
        Filter:
      </span>
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
            selectedCategory === null
              ? "bg-accent-teal text-slate-900"
              : "bg-slate-800 text-slate-300 hover:bg-slate-700"
          }`}
        >
          All
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setSelectedCategory(cat.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
              selectedCategory === cat.value
                ? "bg-accent-teal text-slate-900"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            <span>{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </div>
    </div>
  );
}
