import { createClient, type RedisClientType } from "redis";

import { logger } from "./logger";

export interface CacheStore {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getJson<T>(key: string): Promise<T | null>;
  setJson<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
  ping(): Promise<boolean>;
}

interface RedisCacheStoreOptions {
  url: string;
}

class NullCacheStore implements CacheStore {
  async connect(): Promise<void> {}
  async disconnect(): Promise<void> {}
  async getJson<T>(): Promise<T | null> {
    return null;
  }
  async setJson<T>(): Promise<void> {}
  async ping(): Promise<boolean> {
    return false;
  }
}

// ---------------------------------------------------------------------------
// In-memory LRU-ish cache with per-entry TTL
// ---------------------------------------------------------------------------
const DEFAULT_MAX_ENTRIES = 500;
const L1_MAX_TTL_SECONDS = 300; // cap memory TTL at 5 min

interface MemEntry {
  json: string;
  expiresAt: number;
}

export class InMemoryCacheStore implements CacheStore {
  private readonly cache = new Map<string, MemEntry>();
  private readonly maxSize: number;

  constructor(maxSize = DEFAULT_MAX_ENTRIES) {
    this.maxSize = maxSize;
  }

  async connect(): Promise<void> {}

  async disconnect(): Promise<void> {
    this.cache.clear();
  }

  async getJson<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return JSON.parse(entry.json) as T;
  }

  async setJson<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    if (this.cache.size >= this.maxSize) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
    this.cache.set(key, {
      json: JSON.stringify(value),
      expiresAt: Date.now() + Math.min(ttlSeconds, L1_MAX_TTL_SECONDS) * 1000,
    });
  }

  async ping(): Promise<boolean> {
    return true;
  }
}

// ---------------------------------------------------------------------------
// Tiered cache: L1 in-memory → L2 Redis (or Null)
// ---------------------------------------------------------------------------
export class TieredCacheStore implements CacheStore {
  private readonly l1: InMemoryCacheStore;
  private readonly l2: CacheStore;

  constructor(l2: CacheStore, maxMemoryEntries = DEFAULT_MAX_ENTRIES) {
    this.l1 = new InMemoryCacheStore(maxMemoryEntries);
    this.l2 = l2;
  }

  async connect(): Promise<void> {
    await this.l2.connect();
  }

  async disconnect(): Promise<void> {
    await this.l1.disconnect();
    await this.l2.disconnect();
  }

  async getJson<T>(key: string): Promise<T | null> {
    const memHit = await this.l1.getJson<T>(key);
    if (memHit !== null) return memHit;

    const redisHit = await this.l2.getJson<T>(key);
    if (redisHit !== null) {
      await this.l1.setJson(key, redisHit, L1_MAX_TTL_SECONDS);
      return redisHit;
    }
    return null;
  }

  async setJson<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    await Promise.all([
      this.l1.setJson(key, value, ttlSeconds),
      this.l2.setJson(key, value, ttlSeconds),
    ]);
  }

  async ping(): Promise<boolean> {
    return this.l2.ping();
  }
}

export class RedisCacheStore implements CacheStore {
  private readonly client: RedisClientType;

  constructor(options: RedisCacheStoreOptions) {
    this.client = createClient({
      url: options.url,
      socket: {
        connectTimeout: 1_000,
        reconnectStrategy: false,
      },
    });

    this.client.on("error", (error) => {
      logger.error("redis client error", {
        message: error.message,
      });
    });
  }

  async connect(): Promise<void> {
    if (this.client.isOpen) {
      return;
    }

    try {
      await this.client.connect();
      logger.info("redis connected");
    } catch (error) {
      logger.warn("redis unavailable, continuing without cache", {
        message: error instanceof Error ? error.message : "unknown redis error",
      });
    }
  }

  async disconnect(): Promise<void> {
    if (!this.client.isOpen) {
      return;
    }

    await this.client.quit();
  }

  async getJson<T>(key: string): Promise<T | null> {
    if (!this.client.isOpen) {
      return null;
    }

    try {
      const cachedValue = await this.client.get(key);
      return cachedValue ? (JSON.parse(cachedValue) as T) : null;
    } catch (error) {
      logger.warn("redis get failed", {
        key,
        message: error instanceof Error ? error.message : "unknown redis get error",
      });
      return null;
    }
  }

  async setJson<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    if (!this.client.isOpen) {
      return;
    }

    try {
      await this.client.set(key, JSON.stringify(value), {
        EX: ttlSeconds,
      });
    } catch (error) {
      logger.warn("redis set failed", {
        key,
        message: error instanceof Error ? error.message : "unknown redis set error",
      });
    }
  }

  async ping(): Promise<boolean> {
    if (!this.client.isOpen) {
      return false;
    }

    try {
      return (await this.client.ping()) === "PONG";
    } catch {
      return false;
    }
  }
}

export function createCacheStore(url?: string): CacheStore {
  const l2 = url ? new RedisCacheStore({ url }) : new NullCacheStore();
  return new TieredCacheStore(l2);
}
