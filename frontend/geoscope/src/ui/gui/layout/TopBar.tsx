import { useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { SearchBar } from "../ui/SearchBar";
import { ModeToggle } from "../ui/ModeToggle";
import { CategoryFilter } from "../ui/CategoryFilter";
import { HelpModal } from "../ui/HelpModal";

const CATEGORY_TABS = [
  { key: "", label: "All" },
  { key: "Politics", label: "Politics" },
  { key: "Economy", label: "Economy" },
  { key: "World", label: "World" },
  { key: "Technology", label: "Tech" },
  { key: "Sports", label: "Sports" },
] as const;

export function TopBar() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isGlobe = location.pathname === "/globe";
  const isNews = location.pathname === "/";
  const [helpOpen, setHelpOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return !localStorage.getItem("wwn_seen_help");
  });

  const activeCategory = searchParams.get("category") ?? "";

  const handleCategoryClick = (key: string) => {
    if (key) {
      setSearchParams({ category: key });
    } else {
      setSearchParams({});
    }
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-20 bg-wwn-surface-low/90 backdrop-blur-md">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2">
              <span className="font-data text-sm font-bold tracking-[0.2em] text-wwn-primary-soft uppercase">
                WWN
              </span>
            </Link>

            <nav className="hidden sm:flex items-center">
              <Link
                to="/"
                className={`px-3 py-1.5 text-xs font-data font-medium uppercase tracking-wider transition-colors duration-200 ${
                  isNews
                    ? "bg-wwn-surface-high text-wwn-primary-soft"
                    : "text-wwn-text-variant hover:text-wwn-on-surface"
                }`}
              >
                News
              </Link>
              <Link
                to="/globe"
                className={`px-3 py-1.5 text-xs font-data font-medium uppercase tracking-wider transition-colors duration-200 ${
                  isGlobe
                    ? "bg-wwn-surface-high text-wwn-primary-soft"
                    : "text-wwn-text-variant hover:text-wwn-on-surface"
                }`}
              >
                Globe
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {isGlobe && (
              <>
                <SearchBar />
                <CategoryFilter />
                <ModeToggle />
              </>
            )}
            <button
              onClick={() => setHelpOpen(true)}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-wwn-surface-high text-wwn-text-variant hover:text-wwn-primary-soft transition-colors text-xs font-data font-bold"
              aria-label="Help"
            >
              ?
            </button>
          </div>
        </div>

        {/* Category tabs on news page */}
        {isNews && (
          <div className="flex items-center gap-1 px-4 pb-2 overflow-x-auto scrollbar-hide">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleCategoryClick(tab.key)}
                className={`px-3 py-1 text-[10px] font-data font-semibold uppercase tracking-[0.12em] whitespace-nowrap transition-colors duration-200 ${
                  activeCategory === tab.key
                    ? "bg-wwn-primary/15 text-wwn-primary-soft"
                    : "text-wwn-text-variant hover:text-wwn-on-surface hover:bg-wwn-surface-high/50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </header>

      {helpOpen && (
        <HelpModal
          onClose={() => {
            setHelpOpen(false);
            localStorage.setItem("wwn_seen_help", "1");
          }}
        />
      )}
    </>
  );
}
