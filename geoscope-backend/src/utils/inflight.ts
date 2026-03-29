const pending = new Map<string, Promise<unknown>>();

/**
 * Deduplicate concurrent async calls with the same key.
 * If a computation for `key` is already in-flight, callers share the same
 * promise instead of kicking off duplicate work.
 */
export function dedup<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = pending.get(key);
  if (existing) return existing as Promise<T>;

  const promise = fn().finally(() => {
    pending.delete(key);
  });

  pending.set(key, promise);
  return promise;
}
