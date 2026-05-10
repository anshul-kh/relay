import NodeCache from "node-cache";
import type { CacheKey } from "../types/cache";

export const cache = new NodeCache({
  checkperiod: 120,
  stdTTL: 300,
  useClones: false,
});

/**
 * Stores a value in the shared application cache.
 *
 * @param key Unique cache key.
 * @param value Value to cache.
 * @param ttlSeconds Optional TTL in seconds. Uses the default TTL when omitted.
 */
export function setCache<T>(key: CacheKey, value: T, ttlSeconds?: number): boolean {
  if (ttlSeconds === undefined) {
    return cache.set(key, value);
  }

  return cache.set(key, value, ttlSeconds);
}

/**
 * Reads a value from the shared application cache.
 *
 * @param key Unique cache key.
 * @returns Cached value when present, otherwise undefined.
 */
export function getCache<T>(key: CacheKey): T | undefined {
  return cache.get<T>(key);
}

/**
 * Removes a single cache entry.
 *
 * @param key Unique cache key.
 * @returns Number of deleted entries.
 */
export function deleteCache(key: CacheKey): number {
  return cache.del(key);
}

/**
 * Checks whether a key currently exists in cache.
 *
 * @param key Unique cache key.
 */
export function hasCache(key: CacheKey): boolean {
  return cache.has(key);
}

/**
 * Clears every value from the shared application cache.
 */
export function flushCache(): void {
  cache.flushAll();
}
