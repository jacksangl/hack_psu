interface HelpModalProps {
  onClose: () => void;
}

const SECTIONS = [
  {
    title: "Navigation",
    body: "Use the top bar to switch between the News feed and the interactive Globe. On the News page, category tabs let you filter stories by topic.",
  },
  {
    title: "Multi-Source Analysis",
    body: "Click any article to see how different outlets cover the same event. You'll get a neutral story title, key topics, where sources agree, where they differ, and detailed framing comparisons.",
  },
  {
    title: "Globe View",
    body: "The globe shows a news-volume heatmap — brighter colors mean more coverage. Click any country on the globe to see its latest headlines and AI-generated brief. Use the search bar to find any country.",
  },
  {
    title: "Category Filters",
    body: "On the News page, use the tabs (Politics, Economy, Tech, Sports, etc.) to see only stories in that category. Select \"All\" to return to the full feed.",
  },
] as const;

export function HelpModal({ onClose }: HelpModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg mx-4 bg-wwn-surface-low ring-1 ring-white/5 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-wwn-surface-lowest">
          <h2 className="font-data text-xs font-bold uppercase tracking-[0.15em] text-wwn-primary-soft">
            How to Use WWN
          </h2>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center text-wwn-text-variant hover:text-wwn-on-surface transition-colors"
            aria-label="Close help"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 3l8 8M11 3l-8 8" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <h3 className="font-data text-[10px] font-semibold uppercase tracking-[0.12em] text-wwn-primary-soft mb-1.5">
                {section.title}
              </h3>
              <p className="font-body text-sm text-wwn-text-variant leading-relaxed">
                {section.body}
              </p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-wwn-surface-lowest flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-wwn-primary/15 text-wwn-primary-soft font-data text-xs uppercase tracking-wider hover:bg-wwn-primary/25 transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
