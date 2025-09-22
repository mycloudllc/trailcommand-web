import { useCallback, useRef } from 'react';

const useDebounce = () => {
  const timeoutRef = useRef(null);

  const debounce = useCallback((func, delay) => {
    return (...args) => {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => func(...args), delay);
    };
  }, []);

  const debounceAsync = useCallback((func, delay) => {
    let timeoutId = null;
    let resolvePromise = null;
    let rejectPromise = null;

    return (...args) => {
      return new Promise((resolve, reject) => {
        clearTimeout(timeoutId);

        if (resolvePromise) {
          resolvePromise(); // Resolve previous promise with undefined
        }

        resolvePromise = resolve;
        rejectPromise = reject;

        timeoutId = setTimeout(async () => {
          try {
            const result = await func(...args);
            resolve(result);
          } catch (error) {
            reject(error);
          } finally {
            resolvePromise = null;
            rejectPromise = null;
          }
        }, delay);
      });
    };
  }, []);

  const cancel = useCallback(() => {
    clearTimeout(timeoutRef.current);
  }, []);

  return { debounce, debounceAsync, cancel };
};

export default useDebounce;