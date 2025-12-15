interface CacheEntry<T> {
  data: T;
  expiry: number;
}

class LRUCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private maxSize: number = 100;
  private cleanupIntervalId: NodeJS.Timeout | null = null;
  private cleanupIntervalMs: number = 60 * 1000; // Run cleanup every minute

  constructor() {
    this.startPeriodicCleanup();
  }

  private startPeriodicCleanup(): void {
    if (this.cleanupIntervalId) return;
    
    this.cleanupIntervalId = setInterval(() => {
      this.cleanup();
    }, this.cleanupIntervalMs);

    // Allow Node to exit even if interval is running
    if (this.cleanupIntervalId.unref) {
      this.cleanupIntervalId.unref();
    }
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;
    
    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      if (now > entry.expiry) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`[CACHE] Cleaned up ${cleaned} expired entries, ${this.cache.size} remaining`);
    }
  }

  set<T>(key: string, data: T, ttlMs: number): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }
    
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttlMs,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    
    if (!entry) return null;
    
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    this.cache.delete(key);
    this.cache.set(key, entry);
    
    return entry.data;
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }
    
    const keys = Array.from(this.cache.keys());
    for (const key of keys) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }
  
  size(): number {
    return this.cache.size;
  }

  stopCleanup(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }
  }
}

export const cache = new LRUCache();

export const CACHE_TTL = {
  PROPERTIES_LIST: 60 * 1000,
  PROPERTY_DETAIL: 2 * 60 * 1000,
  STATIC_CONTENT: 10 * 60 * 1000,
  USER_ROLE: 15 * 60 * 1000,
  OWNERSHIP_CHECK: 30 * 1000,
} as const;
