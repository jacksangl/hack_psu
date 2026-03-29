import { useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useBiasComparison } from "../ui/hooks/useBiasComparison";
import { SourcesLoader } from "../ui/gui/ui/SourcesLoader";
import type {
  BiasComparisonResponse,
  SourceCoverage,
} from "../data/news/client";

function getSourceDomain(articleUrl: string) {
  try {
    return new URL(articleUrl).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function getSourceInitials(source: string) {
  return source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

function getSourceLogoUrl(articleUrl: string) {
  const domain = getSourceDomain(articleUrl);

  if (!domain) {
    return null;
  }

  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
}

function SourceLogo({ source, url }: { source: string; url: string }) {
  const [hasLogoError, setHasLogoError] = useState(false);
  const logoUrl = hasLogoError ? null : getSourceLogoUrl(url);
  const initials = getSourceInitials(source);

  return (
    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-wwn-surface-high/85 ring-1 ring-wwn-surface-high/80 overflow-hidden">
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={`${source} logo`}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="h-4 w-4 object-contain"
          onError={() => setHasLogoError(true)}
        />
      ) : (
        <span className="font-data text-[9px] font-semibold uppercase tracking-[0.12em] text-wwn-primary-soft">
          {initials}
        </span>
      )}
    </div>
  );
}

function SourceCard({ coverage }: { coverage: SourceCoverage }) {
  const emphasizedDetails = coverage.detectedBias?.emphasizedDetails ?? [];
  const overallOpinion = coverage.detectedBias?.overallOpinion?.trim() ?? "";

  return (
    <div className="p-5 transition-colors duration-200 bg-wwn-surface-low ring-1 ring-wwn-surface-high/70">
      <div className="flex items-center gap-2 mb-3">
        <SourceLogo source={coverage.source} url={coverage.url} />
        <span className="font-data text-[10px] font-semibold uppercase tracking-[0.15em] text-wwn-primary-soft">
          {coverage.source}
        </span>
      </div>
      <h4 className="font-serif text-base font-medium text-wwn-on-surface leading-snug mb-2">
        {coverage.headline}
      </h4>
      {coverage.summary && (
        <p className="font-body text-sm text-wwn-text-variant leading-relaxed">
          {coverage.summary}
        </p>
      )}
      {(emphasizedDetails.length > 0 || overallOpinion) && (
        <div className="mt-4 p-4 bg-wwn-surface-high/35 ring-1 ring-wwn-surface-high/60 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <span className="font-data text-[10px] font-semibold uppercase tracking-[0.15em] text-wwn-primary-soft">
              Detected Bias
            </span>
            <span className="font-data text-[10px] uppercase tracking-[0.12em] text-wwn-text-variant">
              Framing Signals
            </span>
          </div>
          {overallOpinion && (
            <div>
              <p className="font-data text-[10px] uppercase tracking-[0.12em] text-wwn-text-variant mb-1.5">
                Overall Opinion
              </p>
              <p className="font-body text-sm text-wwn-on-surface leading-relaxed">
                {overallOpinion}
              </p>
            </div>
          )}
          {emphasizedDetails.length > 0 && (
            <div>
              <p className="font-data text-[10px] uppercase tracking-[0.12em] text-wwn-text-variant mb-2">
                Emphasized Details
              </p>
              <div className="flex flex-wrap gap-2">
                {emphasizedDetails.map((detail, index) => (
                  <span
                    key={`${detail}-${index}`}
                    className="px-2.5 py-1 bg-wwn-primary/10 text-wwn-primary-soft font-data text-[10px] uppercase tracking-[0.12em]"
                  >
                    {detail}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      <a
        href={coverage.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 mt-3 font-data text-xs text-wwn-primary-soft hover:text-wwn-primary transition-colors"
      >
        Read Full Article
        <svg
          width="10"
          height="10"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M2 10L10 2M10 2H4M10 2v6" />
        </svg>
      </a>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-wwn-surface-high rounded w-3/4" />
      <div className="h-4 bg-wwn-surface-high rounded w-1/2" />
      <div className="space-y-3">
        <div className="h-4 bg-wwn-surface-high rounded w-2/3" />
        <div className="h-4 bg-wwn-surface-high rounded w-1/2" />
        <div className="h-4 bg-wwn-surface-high rounded w-3/4" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-wwn-surface-low rounded" />
        ))}
      </div>
    </div>
  );
}

function uniqueNonEmptyStrings(values: string[]) {
  const seen = new Set<string>();
  const results: string[] = [];

  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) {
      continue;
    }

    const key = trimmed.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    results.push(trimmed);
  }

  return results;
}

const GENERIC_SUMMARY_PATTERNS = [
  /^headlines vary in which details they emphasize first/i,
  /^some outlets add context or qualifiers/i,
  /^source selection changes which follow-on implications are highlighted/i,
  /^\d+\s+outlets are covering the same event/i,
  /^coverage differences mostly come from/i,
  /^outlets consistently reference/i,
  /^the core incident described in the original headline is present across the matched sources/i,
  /^coverage falls inside the same short reporting window/i,
  /^matched coverage is/i,
  /^shared event markers across headlines include/i,
  /frames the event differently in its headline wording/i,
  /^compared with .* focus on .* emphasizes .*$/i,
  /^[\w.-]+\s+(?:emphasizes|foregrounds)\s+[A-Z][\w-]*(?:\s+[A-Z][\w-]*)*(?:,?\s+(?:and\s+)?[A-Z][\w-]*(?:\s+[A-Z][\w-]*)*)+\b/i,
];

function stripTrailingPunctuation(value: string) {
  return value.trim().replace(/[.!?]+$/g, "");
}

function lowercaseFirstLetter(value: string) {
  return value ? value.charAt(0).toLowerCase() + value.slice(1) : value;
}

function normalizeComparisonText(value: string) {
  return value.trim().toLowerCase().replace(/[.!?]+$/g, "");
}

function opinionClause(source: string, opinion: string) {
  const cleanedOpinion = stripTrailingPunctuation(opinion);

  if (/^this source\b/i.test(cleanedOpinion)) {
    return cleanedOpinion.replace(/^this source\b/i, source);
  }

  if (cleanedOpinion.toLowerCase().startsWith(source.toLowerCase())) {
    return cleanedOpinion;
  }

  return `${source} presents the story as ${lowercaseFirstLetter(cleanedOpinion)}`;
}

function formatList(values: string[]) {
  if (values.length === 0) {
    return "";
  }

  if (values.length === 1) {
    return values[0];
  }

  if (values.length === 2) {
    return `${values[0]} and ${values[1]}`;
  }

  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
}

function isSpecificSummaryPoint(point: string) {
  const trimmed = point.trim();

  if (!trimmed) {
    return false;
  }

  return !GENERIC_SUMMARY_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function getDetectedBiasDetails(coverage: SourceCoverage) {
  return uniqueNonEmptyStrings(coverage.detectedBias?.emphasizedDetails ?? []).slice(0, 3);
}

function buildSourceComparisonPoint(
  reference: SourceCoverage,
  coverage: SourceCoverage,
) {
  const details = getDetectedBiasDetails(coverage);
  const referenceDetails = getDetectedBiasDetails(reference);
  const referenceOpinion = reference.detectedBias?.overallOpinion?.trim() ?? "";
  const opinion = coverage.detectedBias?.overallOpinion?.trim() ?? "";
  const summary = coverage.summary?.trim() ?? "";
  const summaryIsUseful = summary
    && !/^coverage from /i.test(summary)
    && normalizeComparisonText(summary) !== normalizeComparisonText(opinion)
    && normalizeComparisonText(summary) !== normalizeComparisonText(coverage.headline);

  if (details.length === 0 && !opinion) {
    return null;
  }

  if (opinion) {
    const coverageClause = opinionClause(coverage.source, opinion);
    const hasReferenceContrast = referenceOpinion
      && normalizeComparisonText(referenceOpinion) !== normalizeComparisonText(opinion);

    if (hasReferenceContrast) {
      const referenceClause = opinionClause(reference.source, referenceOpinion);

      return summaryIsUseful
        ? `${coverageClause}, while ${lowercaseFirstLetter(referenceClause)}. ${summary}`
        : `${coverageClause}, while ${lowercaseFirstLetter(referenceClause)}.`;
    }

    return summaryIsUseful
      ? `${coverageClause}. ${summary}`
      : `${coverageClause}.`;
  }

  const comparisonLead = details.length > 0
    ? reference !== coverage
      && referenceDetails.length > 0
      && formatList(referenceDetails) !== formatList(details)
      ? `${coverage.source} foregrounds ${formatList(details)}, while ${lowercaseFirstLetter(`${reference.source} centers ${formatList(referenceDetails)}`)}`
      : `${coverage.source} foregrounds ${formatList(details)}`
    : `${coverage.source} takes a distinct angle on the story`;

  return summaryIsUseful
    ? `${comparisonLead}. ${summary}`
    : `${comparisonLead}.`;
}

function buildSourceDrivenSummary(data: BiasComparisonResponse) {
  return uniqueNonEmptyStrings(
    data.otherSources
      .map((coverage) => buildSourceComparisonPoint(data.originalSource, coverage))
      .filter((point): point is string => Boolean(point)),
  ).slice(0, 4);
}

function buildDifferingOpinionSummary(data: BiasComparisonResponse) {
  return uniqueNonEmptyStrings([
    ...buildSourceDrivenSummary(data),
    ...data.keyDifferences,
    ...data.disagreements,
  ].filter((point) => isSpecificSummaryPoint(point))).slice(0, 6);
}

function buildSummaryFallback(data: BiasComparisonResponse) {
  const sourceDrivenSummary = buildSourceDrivenSummary(data);

  if (sourceDrivenSummary.length > 0) {
    return sourceDrivenSummary;
  }

  return uniqueNonEmptyStrings([
    ...data.keyDifferences,
    ...data.disagreements,
  ]).slice(0, 6);
}

export function ArticleComparisonPage() {
  const { encodedUrl } = useParams<{ encodedUrl: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const state = location.state as {
    title?: string;
    source?: string;
    url?: string;
    description?: string | null;
    otherSources?: SourceCoverage[];
  } | null;

  const articleUrl = state?.url ?? (encodedUrl ? decodeURIComponent(encodedUrl) : null);
  const articleTitle = state?.title ?? null;
  const articleSource = state?.source ?? null;
  const articleDescription = state?.description ?? null;
  const knownSources = state?.otherSources ?? null;

  const { data, isLoading, error } = useBiasComparison(
    articleTitle,
    articleSource,
    articleUrl,
    articleDescription,
    knownSources,
  );

  const allSources = data
    ? [data.originalSource, ...data.otherSources]
    : [];
  const differingOpinionSummary = data
    ? buildDifferingOpinionSummary(data)
    : [];
  const summaryFallback = data
    ? buildSummaryFallback(data)
    : [];

  return (
    <div className="w-full h-full overflow-y-auto bg-wwn-bg pt-14">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 mb-8 font-data text-xs uppercase tracking-wider text-wwn-text-variant hover:text-wwn-primary-soft transition-colors"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M9 3L5 7l4 4" />
          </svg>
          Back
        </button>

        {isLoading && (
          <>
            <SourcesLoader label="Finding similar coverage" />
            <LoadingSkeleton />
          </>
        )}

        {error && (
          <div className="p-4 bg-red-500/10 text-red-400 font-body text-sm">
            {error}
          </div>
        )}

        {data && (
          <>
            {/* Header */}
            <header className="mb-8">
              <span className="font-data text-[10px] font-semibold uppercase tracking-[0.15em] text-wwn-primary mb-3 block">
                Multi-Source Analysis
              </span>
              <h1 className="font-serif text-2xl md:text-4xl font-bold text-wwn-on-surface leading-tight mb-4">
                {data.storyTitle}
              </h1>
              <p className="font-body text-sm text-wwn-text-variant">
                {data.singleSource
                  ? "1 source analyzed"
                  : `${allSources.length} sources analyzed`}
              </p>
            </header>

            {false && (
              <section className="mb-8">
                <div className="rounded-sm border border-dashed border-amber-500/25 bg-wwn-surface-low/75 p-6">
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-data text-[10px] font-semibold uppercase tracking-[0.15em] text-amber-300">
                      ⚠ Only 1 source found
                    </span>
                    <span className="font-data text-[10px] uppercase tracking-[0.15em] text-wwn-text-variant">
                      Comparison withheld
                    </span>
                  </div>
                  <p className="mt-3 font-body text-sm leading-relaxed text-wwn-text-variant">
                    A second distinct outlet did not match this story in the current search window, so the bias comparison
                    breakdown is intentionally not generated.
                  </p>
                </div>
              </section>
            )}

            <section className="mb-8">
              <h3 className="font-data text-[10px] font-semibold uppercase tracking-[0.15em] text-wwn-text-variant mb-3">
                AI Summary
              </h3>
              <div className="bg-amber-500/5 ring-1 ring-amber-500/15 p-5 space-y-3">
                {data.singleSource ? (
                  <>
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-data text-[10px] font-semibold uppercase tracking-[0.15em] text-amber-300">
                        Only 1 source found
                      </span>
                      <span className="font-data text-[10px] uppercase tracking-[0.15em] text-wwn-text-variant">
                        Comparison limited
                      </span>
                    </div>
                    <p className="font-body text-sm text-wwn-text-variant leading-relaxed">
                      A second distinct outlet did not match this story in the current search window, so there is not
                      enough reporting to summarize differing opinions yet.
                    </p>
                  </>
                ) : differingOpinionSummary.length > 0 ? (
                  differingOpinionSummary.map((point, i) => (
                    <div key={i} className="flex gap-3">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        className="flex-shrink-0 mt-0.5 text-amber-400"
                      >
                        <path
                          d="M8 3v6M8 12v.5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                      <p className="font-body text-sm text-wwn-on-surface leading-relaxed">
                        {point}
                      </p>
                    </div>
                  ))
                ) : summaryFallback.length > 0 ? (
                  summaryFallback.map((point, i) => (
                    <div key={i} className="flex gap-3">
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                        className="flex-shrink-0 mt-0.5 text-amber-400"
                      >
                        <path
                          d="M8 3v6M8 12v.5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                        />
                      </svg>
                      <p className="font-body text-sm text-wwn-on-surface leading-relaxed">
                        {point}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="font-body text-sm text-wwn-text-variant leading-relaxed">
                    The currently matched sources are broadly aligned, with only minor framing differences surfacing in
                    this comparison window.
                  </p>
                )}
              </div>
            </section>

            <section className="mb-8">
              <h3 className="font-data text-[10px] font-semibold uppercase tracking-[0.15em] text-wwn-text-variant mb-3">
                Sources
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {allSources.map((source, i) => (
                  <SourceCard key={`${source.source}-${source.url}-${i}`} coverage={source} />
                ))}
              </div>
            </section>
          </>
        )}

        {/* Fallback if no article info */}
        {!isLoading && !error && !data && !articleTitle && (
          <div className="text-center py-12">
            <p className="font-body text-sm text-wwn-text-variant mb-4">
              No article information available.
            </p>
            <button
              onClick={() => navigate("/")}
              className="font-data text-xs uppercase tracking-wider text-wwn-primary-soft hover:text-wwn-primary transition-colors"
            >
              Back to News
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
