const COMMON_SECOND_LEVEL_DOMAINS = new Set([
  "co",
  "com",
  "org",
  "net",
  "gov",
  "edu",
]);

const HOST_PREFIXES = new Set([
  "www",
  "m",
  "amp",
  "rss",
  "feeds",
]);

const HOST_SUFFIXES = [
  "news",
  "media",
  "online",
  "tv",
  "radio",
];

const TRACKING_QUERY_KEYS = new Set([
  "fbclid",
  "gclid",
  "mc_cid",
  "mc_eid",
  "output",
  "ref",
  "ref_src",
  "share",
  "smid",
  "spm",
  "utm_campaign",
  "utm_content",
  "utm_id",
  "utm_medium",
  "utm_name",
  "utm_source",
  "utm_term",
]);

const SOURCE_ALIAS_MAP: Record<string, string> = {
  ap: "apnews",
  apnews: "apnews",
  associatedpress: "apnews",
  bbcnews: "bbc",
  bbci: "bbc",
  newyorktimes: "newyorktimes",
  nyt: "newyorktimes",
  nytimes: "newyorktimes",
  guardian: "guardian",
  theguardian: "guardian",
  wallstreetjournal: "wallstreetjournal",
  wsj: "wallstreetjournal",
  wsjournal: "wallstreetjournal",
};

function uniqueNonEmpty(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = value?.trim();
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}

function compactAlphanumeric(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function sourceWords(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .filter((word) => word !== "the")
    .filter((word) => !COMMON_SECOND_LEVEL_DOMAINS.has(word))
    .filter((word) => word !== "uk");
}

function normalizePublisherKey(value: string): string {
  const compact = compactAlphanumeric(value);
  return SOURCE_ALIAS_MAP[compact] ?? compact;
}

function sourceNameVariants(source: string): string[] {
  const words = sourceWords(source);
  if (words.length === 0) {
    return [];
  }

  const compact = words.join("");
  const initials = words.map((word) => word[0]).join("");
  const initialPlusLast = words.length > 1
    ? `${words.slice(0, -1).map((word) => word[0]).join("")}${words[words.length - 1]}`
    : null;

  return uniqueNonEmpty([
    compact,
    initials,
    initialPlusLast,
  ]);
}

function hostnameWithoutPrefixes(hostname: string): string[] {
  const parts = hostname
    .toLowerCase()
    .split(".")
    .map((part) => part.trim())
    .filter(Boolean);

  while (parts.length > 2 && HOST_PREFIXES.has(parts[0])) {
    parts.shift();
  }

  return parts;
}

function baseDomainRoot(hostname: string): string | null {
  const parts = hostnameWithoutPrefixes(hostname);
  if (parts.length === 0) {
    return null;
  }

  if (
    parts.length >= 3
    && parts[parts.length - 1].length === 2
    && COMMON_SECOND_LEVEL_DOMAINS.has(parts[parts.length - 2])
  ) {
    return parts[parts.length - 3] ?? null;
  }

  if (parts.length >= 2) {
    return parts[parts.length - 2] ?? null;
  }

  return parts[0] ?? null;
}

function hostVariants(url: string): string[] {
  try {
    const parsed = new URL(url);
    const domainRoot = baseDomainRoot(parsed.hostname);
    if (!domainRoot) {
      return [];
    }

    const strippedThe = domainRoot.startsWith("the") && domainRoot.length > 3
      ? domainRoot.slice(3)
      : null;
    const strippedSuffixes = HOST_SUFFIXES
      .map((suffix) => (
        domainRoot.endsWith(suffix) && domainRoot.length > suffix.length + 1
          ? domainRoot.slice(0, -suffix.length)
          : null
      ));

    return uniqueNonEmpty([
      domainRoot,
      strippedThe,
      ...strippedSuffixes,
    ]);
  } catch {
    return [];
  }
}

function normalizedArticleUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = hostnameWithoutPrefixes(parsed.hostname).join(".");
    const pathname = parsed.pathname.replace(/\/+$/g, "") || "/";
    const filteredParams = [...parsed.searchParams.entries()]
      .filter(([key]) => {
        const normalizedKey = key.toLowerCase();
        return !normalizedKey.startsWith("utm_") && !TRACKING_QUERY_KEYS.has(normalizedKey);
      })
      .sort(([left], [right]) => left.localeCompare(right));
    const search = filteredParams.length > 0
      ? `?${new URLSearchParams(filteredParams).toString()}`
      : "";

    return `${host}${pathname}${search}`;
  } catch {
    return null;
  }
}

export function getSourceDedupKeys(source: string, url: string): string[] {
  const sourcePublisherKeys = sourceNameVariants(source).map(normalizePublisherKey);
  const publisherKeyCandidates = sourcePublisherKeys.length > 0
    ? sourcePublisherKeys
    : hostVariants(url).map(normalizePublisherKey);
  const publisherKeys = uniqueNonEmpty([
    ...publisherKeyCandidates,
  ]).map((key) => `publisher:${key}`);
  const articleKey = normalizedArticleUrl(url);

  return uniqueNonEmpty([
    ...publisherKeys,
    articleKey ? `article:${articleKey}` : null,
  ]);
}

export function hasSeenSource(seen: Set<string>, source: string, url: string): boolean {
  return getSourceDedupKeys(source, url).some((key) => seen.has(key));
}

export function markSourceSeen(seen: Set<string>, source: string, url: string): void {
  for (const key of getSourceDedupKeys(source, url)) {
    seen.add(key);
  }
}
