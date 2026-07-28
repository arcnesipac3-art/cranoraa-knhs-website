import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import * as AsyncStorage from '@react-native-async-storage/async-storage';
import { useOnlineStatus } from '@hooks/useOnlineStatus';
import { useUIStore } from '@stores/ui.store';

interface QueuedAction {
  id: string;
  endpoint: string;
  method: 'POST' | 'PUT' | 'DELETE';
  body: unknown;
  timestamp: number;
  retryCount: number;
}

interface OfflineContextType {
  queue: QueuedAction[];
  addToQueue: (action: Omit<QueuedAction, 'id' | 'timestamp' | 'retryCount'>) => void;
  processQueue: () => Promise<void>;
  clearQueue: () => void;
  queueLength: number;
}

const OfflineContext = createContext<OfflineContextType>({
  queue: [],
  addToQueue: () => {},
  processQueue: async () => {},
  clearQueue: () => {},
  queueLength: 0,
});

export function useOffline() {
  return useContext(OfflineContext);
}

const QUEUE_KEY = '@offline_queue';
let actionCounter = 0;

interface OfflineProviderProps {
  children: React.ReactNode;
}

export function OfflineProvider({ children }: OfflineProviderProps) {
  const [queue, setQueue] = useState<QueuedAction[]>([]);
  const isOnline = useOnlineStatus();
  const { addToast } = useUIStore();

  useEffect(() => {
    loadQueue();
  }, []);

  useEffect(() => {
    if (isOnline && queue.length > 0) {
      processQueue();
    }
  }, [isOnline, queue.length]);

  const loadQueue = async () => {
    try {
      const stored = await AsyncStorage.getItem(QUEUE_KEY);
      if (stored) {
        setQueue(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error);
    }
  };

  const saveQueue = async (newQueue: QueuedAction[]) => {
    try {
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(newQueue));
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  };

  const addToQueue = useCallback((action: Omit<QueuedAction, 'id' | 'timestamp' | 'retryCount'>) => {
    const newAction: QueuedAction = {
      ...action,
      id: `action_${++actionCounter}_${Date.now()}`,
      timestamp: Date.now(),
      retryCount: 0,
    };

    setQueue((prev) => {
      const newQueue = [...prev, newAction];
      saveQueue(newQueue);
      return newQueue;
    });

    addToast({
      type: 'info',
      title: 'Action queued',
      message: 'This action will be processed when you\'re back online.',
      duration: 2000,
    });
  }, [addToast]);

  const processQueue = useCallback(async () => {
    if (!isOnline || queue.length === 0) return;

    const sortedQueue = [...queue].sort((a, b) => a.timestamp - b.timestamp);

    for (const action of sortedQueue) {
      try {
        await fetch(action.endpoint, {
          method: action.method,
          headers: { 'Content-Type': 'application/json' },
          body: action.body ? JSON.stringify(action.body) : undefined,
        });

        setQueue((prev) => {
          const newQueue = prev.filter((a) => a.id !== action.id);
          saveQueue(newQueue);
          return newQueue;
        });
      } catch (error) {
        console.error(`Failed to process queued action ${action.id}:`, error);

        setQueue((prev) => {
          const newQueue = prev.map((a) =>
            a.id === action.id ? { ...a, retryCount: a.retryCount + 1 } : a
          );
          saveQueue(newQueue);
          return newQueue;
        });
      }
    }
  }, [isOnline, queue]);

  const clearQueue = useCallback(() => {
    setQueue([]);
    AsyncStorage.removeItem(QUEUE_KEY);
  }, []);

  return (
    <OfflineContext.Provider
      value={{
        queue,
        addToQueue,
        processQueue,
        clearQueue,
        queueLength: queue.length,
      }}
    >
      {children}
    </OfflineContext.Provider>
  );
}