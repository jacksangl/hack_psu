import { useMemo } from "react";
import { useGlobeStore } from "../../store/globeStore";

function formatDayLabel(date: Date, index: number): string {
  if (index === 0) return "Today";
  if (index === 1) return "Yesterday";
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days[date.getDay()];
}

function formatDayDate(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

export function Timeline() {
  const activeDate = useGlobeStore((s) => s.activeDate);
  const setActiveDate = useGlobeStore((s) => s.setActiveDate);

  const days = useMemo(() => {
    const result: { date: Date; label: string; dateStr: string }[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      result.push({
        date,
        label: formatDayLabel(date, i),
        dateStr: formatDayDate(date),
      });
    }
    return result;
  }, []);

  const activeDateStr = useMemo(() => {
    const d = new Date(activeDate);
    d.setHours(0, 0, 0, 0);
    return d.toDateString();
  }, [activeDate]);

  return (
    <div className="flex items-center gap-1.5">
      {days.map((day) => {
        const isActive = day.date.toDateString() === activeDateStr;
        return (
          <button
            key={day.date.toISOString()}
            onClick={() => setActiveDate(day.date)}
            className={`flex flex-col items-center px-3 py-1.5 rounded-lg transition-all duration-200 ${
              isActive
                ? "bg-accent-teal/20 text-accent-teal border border-accent-teal/30"
                : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 border border-transparent"
            }`}
          >
            <span className="text-[10px] font-medium uppercase tracking-wider">
              {day.label}
            </span>
            <span className="text-[10px] opacity-70">{day.dateStr}</span>
          </button>
        );
      })}
    </div>
  );
}
