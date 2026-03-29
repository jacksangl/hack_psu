import type { SourceCoverage } from "../../data/news/client";

interface StoryCoverageInlineProps {
  sourceCount: number;
  singleSource: boolean;
  originalSource: SourceCoverage;
  otherSources: SourceCoverage[];
  compact?: boolean;
}

function coverageLine(coverage: SourceCoverage) {
  return coverage.summary || coverage.headline;
}

export function StoryCoverageInline({
  sourceCount,
  singleSource,
  originalSource,
  otherSources,
  compact = false,
}: StoryCoverageInlineProps) {
  if (singleSource) {
    return (
      <div className="mt-4 rounded-sm border border-dashed border-amber-500/25 bg-wwn-surface-low/70 px-3 py-3">
        <div className="flex items-center justify-between gap-3">
          <span className="font-data text-[10px] font-semibold uppercase tracking-[0.15em] text-amber-300">
            ⚠ Only 1 source found
          </span>
          <span className="font-data text-[10px] uppercase tracking-[0.15em] text-wwn-text-variant">
            Single-source
          </span>
        </div>
        {!compact && (
          <p className="mt-2 font-body text-sm leading-relaxed text-wwn-text-variant">
            No second distinct outlet matched this story yet, so bias comparison is withheld.
          </p>
        )}
      </div>
    );
  }

  const previewSources = [originalSource, ...otherSources].slice(0, compact ? 3 : 4);

  return (
    <div className="mt-4 rounded-sm border border-wwn-primary/20 bg-wwn-primary/5 px-3 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="font-data text-[10px] font-semibold uppercase tracking-[0.15em] text-wwn-primary-soft">
          {sourceCount} sources covering this story
        </span>
        <span className="font-data text-[10px] uppercase tracking-[0.15em] text-wwn-text-variant">
          Inline comparison
        </span>
      </div>
      <div className="mt-3 space-y-2">
        {previewSources.map((coverage, index) => (
          <div key={`${coverage.source}-${coverage.url}-${index}`} className="flex gap-2">
            <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-wwn-primary-soft" />
            <div className="min-w-0">
              <p className="font-data text-[10px] uppercase tracking-[0.12em] text-wwn-primary-soft">
                {coverage.source}
              </p>
              <p className="font-body text-sm leading-snug text-wwn-on-surface line-clamp-2">
                {coverageLine(coverage)}
              </p>
            </div>
          </div>
        ))}
      </div>
      {otherSources.length > previewSources.length - 1 && (
        <p className="mt-3 font-data text-[10px] uppercase tracking-[0.12em] text-wwn-text-variant">
          +{otherSources.length - (previewSources.length - 1)} more sources
        </p>
      )}
    </div>
  );
}
