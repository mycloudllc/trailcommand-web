import { useRef, useCallback, useEffect } from 'react';
import { io } from 'socket.io-client';

const useOptimizedSocket = (url, options = {}) => {
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const messageQueueRef = useRef([]);
  const listenersRef = useRef(new Map());

  const {
    autoConnect = true,
    reconnectDelay = 1000,
    maxReconnectAttempts = 5,
    onConnect,
    onDisconnect,
    onError
  } = options;

  // Optimized message handler with batching
  const handleMessage = useCallback((eventName, handler, batchSize = 10, batchDelay = 100) => {
    let messageBuffer = [];
    let timeoutId = null;

    const processMessages = () => {
      if (messageBuffer.length > 0) {
        handler(messageBuffer);
        messageBuffer = [];
      }
      timeoutId = null;
    };

    const batchedHandler = (data) => {
      messageBuffer.push(data);

      if (messageBuffer.length >= batchSize) {
        clearTimeout(timeoutId);
        processMessages();
      } else if (!timeoutId) {
        timeoutId = setTimeout(processMessages, batchDelay);
      }
    };

    return batchedHandler;
  }, []);

  // Optimized emit with queue management
  const emit = useCallback((eventName, data) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(eventName, data);
    } else {
      // Queue messages when disconnected
      messageQueueRef.current.push({ eventName, data, timestamp: Date.now() });

      // Limit queue size to prevent memory issues
      if (messageQueueRef.current.length > 100) {
        messageQueueRef.current = messageQueueRef.current.slice(-50);
      }
    }
  }, []);

  // Process queued messages on reconnection
  const processQueuedMessages = useCallback(() => {
    const now = Date.now();
    const validMessages = messageQueueRef.current.filter(
      msg => now - msg.timestamp < 30000 // Only send messages less than 30 seconds old
    );

    validMessages.forEach(({ eventName, data }) => {
      socketRef.current?.emit(eventName, data);
    });

    messageQueueRef.current = [];
  }, []);

  // Optimized listener management
  const on = useCallback((eventName, handler, enableBatching = false, batchOptions = {}) => {
    if (!socketRef.current) return;

    const actualHandler = enableBatching
      ? handleMessage(eventName, handler, batchOptions.size, batchOptions.delay)
      : handler;

    socketRef.current.on(eventName, actualHandler);

    // Store for cleanup
    if (!listenersRef.current.has(eventName)) {
      listenersRef.current.set(eventName, []);
    }
    listenersRef.current.get(eventName).push(actualHandler);

    return () => {
      socketRef.current?.off(eventName, actualHandler);
      const handlers = listenersRef.current.get(eventName);
      if (handlers) {
        const index = handlers.indexOf(actualHandler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }, [handleMessage]);

  const off = useCallback((eventName, handler) => {
    socketRef.current?.off(eventName, handler);
  }, []);

  // Connection management
  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    try {
      socketRef.current = io(url, {
        transports: ['websocket', 'polling'],
        upgrade: true,
        rememberUpgrade: true,
        ...options
      });

      socketRef.current.on('connect', () => {
        onConnect?.();
        processQueuedMessages();
      });

      socketRef.current.on('disconnect', (reason) => {
        onDisconnect?.(reason);
      });

      socketRef.current.on('connect_error', (error) => {
        onError?.(error);
      });

    } catch (error) {
      onError?.(error);
    }
  }, [url, options, onConnect, onDisconnect, onError, processQueuedMessages]);

  const disconnect = useCallback(() => {
    clearTimeout(reconnectTimeoutRef.current);

    // Clean up all listeners
    listenersRef.current.forEach((handlers, eventName) => {
      handlers.forEach(handler => {
        socketRef.current?.off(eventName, handler);
      });
    });
    listenersRef.current.clear();

    socketRef.current?.disconnect();
    socketRef.current = null;
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  // Connection status
  const isConnected = socketRef.current?.connected || false;

  return {
    socket: socketRef.current,
    isConnected,
    connect,
    disconnect,
    emit,
    on,
    off,
    queueSize: messageQueueRef.current.length
  };
};

export default useOptimizedSocket;