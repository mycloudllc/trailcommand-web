import { useRef, useCallback } from 'react';

const useApiCache = () => {
  const cache = useRef(new Map());
  const pendingRequests = useRef(new Map());

  const getCachedData = useCallback(async (key, fetcher, options = {}) => {
    const {
      ttl = 5000, // 5 seconds default TTL
      forceRefresh = false,
      enableDeduplication = true
    } = options;

    // Check cache first
    if (!forceRefresh) {
      const cached = cache.current.get(key);
      if (cached && Date.now() - cached.timestamp < ttl) {
        return cached.data;
      }
    }

    // Check for pending request to avoid duplicate API calls
    if (enableDeduplication && pendingRequests.current.has(key)) {
      return pendingRequests.current.get(key);
    }

    // Create new request
    const requestPromise = (async () => {
      try {
        const data = await fetcher();
        cache.current.set(key, { data, timestamp: Date.now() });
        return data;
      } finally {
        pendingRequests.current.delete(key);
      }
    })();

    if (enableDeduplication) {
      pendingRequests.current.set(key, requestPromise);
    }

    return requestPromise;
  }, []);

  const invalidateCache = useCallback((pattern) => {
    if (typeof pattern === 'string') {
      cache.current.delete(pattern);
    } else if (pattern instanceof RegExp) {
      for (const key of cache.current.keys()) {
        if (pattern.test(key)) {
          cache.current.delete(key);
        }
      }
    } else {
      cache.current.clear();
    }
  }, []);

  const getCacheSize = useCallback(() => {
    return cache.current.size;
  }, []);

  const clearExpired = useCallback(() => {
    const now = Date.now();
    for (const [key, value] of cache.current.entries()) {
      if (now - value.timestamp > 300000) { // 5 minutes
        cache.current.delete(key);
      }
    }
  }, []);

  return {
    getCachedData,
    invalidateCache,
    getCacheSize,
    clearExpired
  };
};

export default useApiCache;