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

export const createCacheStore = (url?: string): CacheStore => (url ? new RedisCacheStore({ url }) : new NullCacheStore());
