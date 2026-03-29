import { SearchBar } from "../ui/SearchBar";
import { ModeToggle } from "../ui/ModeToggle";
import { CategoryFilter } from "../ui/CategoryFilter";

export function TopBar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-20 border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#14b8a6"
              strokeWidth="1.5"
            >
              <circle cx="12" cy="12" r="10" />
              <ellipse cx="12" cy="12" rx="4" ry="10" />
              <path d="M2 12h20" />
            </svg>
            <h1 className="text-base font-semibold text-slate-100 tracking-tight">
              GeoScope
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <SearchBar />
          <CategoryFilter />
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
