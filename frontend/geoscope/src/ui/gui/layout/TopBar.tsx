import { Link, useLocation } from "react-router-dom";
import { SearchBar } from "../ui/SearchBar";
import { ModeToggle } from "../ui/ModeToggle";
import { CategoryFilter } from "../ui/CategoryFilter";

export function TopBar() {
  const location = useLocation();
  const isGlobe = location.pathname === "/globe";
  const isNews = location.pathname === "/";

  return (
    <header className="fixed top-0 left-0 right-0 z-20 bg-wwn-surface-low/90 backdrop-blur-md">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="font-data text-sm font-bold tracking-[0.2em] text-wwn-primary-soft uppercase">
              WWN
            </span>
          </Link>

          {/* Navigation */}
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
        </div>
      </div>
    </header>
  );
}
