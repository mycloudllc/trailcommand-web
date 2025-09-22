class OptimizedTrailCommandAPI {
  constructor(baseURL = 'https://api.trailcommandpro.com:443/api') {
    this.baseURL = baseURL;
    this.cache = new Map();
    this.pendingRequests = new Map();
    this.debounceTimers = new Map();
    this.batchQueue = new Map();
    this.defaultTTL = 5000; // 5 seconds
  }

  // Debounced API call wrapper
  debounce(key, func, delay = 500) {
    return (...args) => {
      return new Promise((resolve, reject) => {
        // Clear existing timer
        if (this.debounceTimers.has(key)) {
          clearTimeout(this.debounceTimers.get(key).timeout);
          // Reject previous promise
          this.debounceTimers.get(key).reject(new Error('Debounced'));
        }

        // Set new timer
        const timeout = setTimeout(async () => {
          try {
            const result = await func(...args);
            resolve(result);
          } catch (error) {
            reject(error);
          } finally {
            this.debounceTimers.delete(key);
          }
        }, delay);

        this.debounceTimers.set(key, { timeout, resolve, reject });
      });
    };
  }

  // Cached request wrapper
  async cachedRequest(key, requestFunc, ttl = this.defaultTTL) {
    // Check cache first
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data;
    }

    // Check for pending request
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }

    // Make new request
    const requestPromise = (async () => {
      try {
        const data = await requestFunc();
        this.cache.set(key, { data, timestamp: Date.now() });
        return data;
      } finally {
        this.pendingRequests.delete(key);
      }
    })();

    this.pendingRequests.set(key, requestPromise);
    return requestPromise;
  }

  // Base HTTP method with optimizations
  async request(method, endpoint, data = null, options = {}) {
    const {
      cache = false,
      ttl = this.defaultTTL,
      timeout = 10000,
      retries = 3
    } = options;

    const url = `${this.baseURL}${endpoint}`;
    const cacheKey = cache ? `${method}:${endpoint}:${JSON.stringify(data)}` : null;

    const makeRequest = async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const config = {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers
          },
          signal: controller.signal
        };

        if (data && method !== 'GET') {
          config.body = JSON.stringify(data);
        }

        const response = await fetch(url, config);
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        return result;

      } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          throw new Error('Request timeout');
        }
        throw error;
      }
    };

    // Use cache if enabled
    if (cache && method === 'GET') {
      return this.cachedRequest(cacheKey, makeRequest, ttl);
    }

    // Retry logic for non-cached requests
    let lastError;
    for (let i = 0; i < retries; i++) {
      try {
        return await makeRequest();
      } catch (error) {
        lastError = error;
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        }
      }
    }

    throw lastError;
  }

  // Batch request processing
  batchRequest(batchKey, requestFunc, delay = 100) {
    return new Promise((resolve, reject) => {
      if (!this.batchQueue.has(batchKey)) {
        this.batchQueue.set(batchKey, {
          requests: [],
          timeout: setTimeout(() => this.processBatch(batchKey), delay)
        });
      }

      this.batchQueue.get(batchKey).requests.push({ resolve, reject, requestFunc });
    });
  }

  async processBatch(batchKey) {
    const batch = this.batchQueue.get(batchKey);
    if (!batch) return;

    this.batchQueue.delete(batchKey);

    try {
      // Execute all requests in parallel
      const results = await Promise.allSettled(
        batch.requests.map(req => req.requestFunc())
      );

      // Resolve individual promises
      results.forEach((result, index) => {
        const request = batch.requests[index];
        if (result.status === 'fulfilled') {
          request.resolve(result.value);
        } else {
          request.reject(result.reason);
        }
      });
    } catch (error) {
      // Reject all requests if batch fails
      batch.requests.forEach(req => req.reject(error));
    }
  }

  // Optimized API methods with debouncing and caching

  // GET methods with caching
  async getDevices() {
    return this.request('GET', '/devices', null, { cache: true, ttl: 10000 });
  }

  async getDevice(deviceId) {
    return this.request('GET', `/devices/${deviceId}`, null, { cache: true, ttl: 5000 });
  }

  async getWidgets(deviceId) {
    return this.request('GET', `/devices/${deviceId}/widgets`, null, { cache: true, ttl: 3000 });
  }

  async getSensorData(deviceId, sensorId) {
    return this.request('GET', `/devices/${deviceId}/sensors/${sensorId}`, null, { cache: true, ttl: 2000 });
  }

  // Debounced control commands
  sendControlCommand = this.debounce('control', async (deviceId, controlId, value) => {
    return this.request('POST', `/devices/${deviceId}/controls/${controlId}`, { value });
  }, 300);

  // Debounced widget updates
  updateWidget = this.debounce('widget-update', async (deviceId, widgetId, updates) => {
    return this.request('PUT', `/devices/${deviceId}/widgets/${widgetId}`, updates);
  }, 500);

  // Batch widget position updates
  async batchUpdateWidgetPositions(deviceId, positionUpdates) {
    const batchKey = `positions-${deviceId}`;

    return this.batchRequest(batchKey, () => {
      return this.request('PUT', `/devices/${deviceId}/widgets/positions`, { updates: positionUpdates });
    });
  }

  // Optimized polling with smart intervals
  createPollingManager(requests, options = {}) {
    const {
      baseInterval = 5000,
      maxInterval = 30000,
      backoffMultiplier = 1.5,
      errorThreshold = 3
    } = options;

    let currentInterval = baseInterval;
    let errorCount = 0;
    let isActive = true;
    let timeoutId = null;

    const poll = async () => {
      if (!isActive) return;

      try {
        // Execute all polling requests
        await Promise.all(requests.map(req => req()));

        // Reset on success
        errorCount = 0;
        currentInterval = baseInterval;

      } catch (error) {
        errorCount++;
        console.warn('Polling error:', error);

        // Backoff on errors
        if (errorCount >= errorThreshold) {
          currentInterval = Math.min(currentInterval * backoffMultiplier, maxInterval);
        }
      } finally {
        if (isActive) {
          timeoutId = setTimeout(poll, currentInterval);
        }
      }
    };

    // Start polling
    poll();

    return {
      stop: () => {
        isActive = false;
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      },
      getCurrentInterval: () => currentInterval,
      getErrorCount: () => errorCount
    };
  }

  // Cache management
  invalidateCache(pattern) {
    if (typeof pattern === 'string') {
      this.cache.delete(pattern);
    } else if (pattern instanceof RegExp) {
      for (const key of this.cache.keys()) {
        if (pattern.test(key)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  clearExpiredCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.defaultTTL * 6) { // Clear items older than 30 seconds
        this.cache.delete(key);
      }
    }
  }

  // Cleanup method
  cleanup() {
    // Clear all timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer.timeout);
      timer.reject(new Error('API cleanup'));
    }
    this.debounceTimers.clear();

    // Clear batch queues
    for (const [key, batch] of this.batchQueue.entries()) {
      clearTimeout(batch.timeout);
      batch.requests.forEach(req => req.reject(new Error('API cleanup')));
    }
    this.batchQueue.clear();

    // Clear caches
    this.cache.clear();
    this.pendingRequests.clear();
  }

  // Status methods
  getStats() {
    return {
      cacheSize: this.cache.size,
      pendingRequests: this.pendingRequests.size,
      activeDebouncers: this.debounceTimers.size,
      batchQueues: this.batchQueue.size
    };
  }
}

// Create singleton instance
const optimizedAPI = new OptimizedTrailCommandAPI();

export default optimizedAPI;
export { OptimizedTrailCommandAPI };