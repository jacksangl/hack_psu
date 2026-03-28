import { useState, useRef, useEffect, useCallback } from "react";
import { searchCountries, type CountryInfo } from "../../utils/countryData";
import { useGlobeStore } from "../../store/globeStore";

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CountryInfo[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const selectCountry = useGlobeStore((s) => s.selectCountry);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const handleSearch = useCallback((value: string) => {
    setQuery(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      if (value.trim().length === 0) {
        setResults([]);
        setIsOpen(false);
        return;
      }
      const matches = searchCountries(value).slice(0, 8);
      setResults(matches);
      setIsOpen(matches.length > 0);
      setHighlightIndex(-1);
    }, 300);
  }, []);

  const handleSelect = useCallback(
    (country: CountryInfo) => {
      selectCountry(country.code);
      setQuery("");
      setResults([]);
      setIsOpen(false);
      inputRef.current?.blur();
    },
    [selectCountry]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && highlightIndex >= 0) {
      e.preventDefault();
      handleSelect(results[highlightIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800/60 border border-slate-700 focus-within:border-accent-teal/50 transition-colors duration-200">
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-slate-500 flex-shrink-0"
        >
          <circle cx="6" cy="6" r="4.5" />
          <path d="M9.5 9.5L13 13" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          placeholder="Search country..."
          className="bg-transparent border-none outline-none text-sm text-slate-200 placeholder-slate-500 w-40"
        />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 py-1 glass-panel shadow-xl max-h-64 overflow-y-auto z-50">
          {results.map((country, idx) => (
            <button
              key={country.code}
              onClick={() => handleSelect(country)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors duration-100 ${
                idx === highlightIndex
                  ? "bg-accent-teal/10 text-accent-teal"
                  : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              <span className="text-base">{country.flag}</span>
              <span className="text-sm font-medium">{country.name}</span>
              <span className="text-xs text-slate-500 ml-auto">
                {country.code}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
