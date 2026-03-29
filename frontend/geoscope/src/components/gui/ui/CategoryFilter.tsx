import { useEffect, useMemo, useRef, useState } from "react";
import { useGlobeStore } from "../../../store/globeStore";
import type { NewsCategory } from "../../../api/mockData";

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
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedLabel = useMemo(
    () => CATEGORIES.find((category) => category.value === selectedCategory)?.label ?? "All",
    [selectedCategory]
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors duration-200 ${
          isOpen || selectedCategory
            ? "border-accent-teal/40 bg-accent-teal/10 text-slate-100"
            : "border-slate-700 bg-slate-800/60 text-slate-300 hover:border-slate-600 hover:text-slate-100"
        }`}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="flex-shrink-0"
        >
          <path d="M2 3.5h10" />
          <path d="M4.5 7h5" />
          <path d="M6 10.5h2" />
        </svg>
        <span className="hidden sm:inline">Filter</span>
        <span className="text-xs text-slate-400">{selectedLabel}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        >
          <path d="M2.5 4.5L6 8l3.5-3.5" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-slate-700/80 bg-slate-900/95 p-2 shadow-xl backdrop-blur-md">
          <button
            type="button"
            onClick={() => {
              setSelectedCategory(null);
              setIsOpen(false);
            }}
            className={`mb-1 flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors duration-150 ${
              selectedCategory === null
                ? "border-accent-teal/30 bg-accent-teal/15 text-accent-teal"
                : "border-transparent text-slate-300 hover:bg-slate-800/70 hover:text-slate-100"
            }`}
          >
            <span>All categories</span>
            {selectedCategory === null && <span className="text-xs uppercase tracking-wider">Active</span>}
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => {
                setSelectedCategory(selectedCategory === cat.value ? null : cat.value);
                setIsOpen(false);
              }}
              className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors duration-150 ${
                selectedCategory === cat.value
                  ? "border-accent-teal/30 bg-accent-teal/15 text-accent-teal"
                  : "border-transparent text-slate-300 hover:bg-slate-800/70 hover:text-slate-100"
              }`}
            >
              <span>{cat.label}</span>
              {selectedCategory === cat.value && <span className="text-xs uppercase tracking-wider">Active</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
