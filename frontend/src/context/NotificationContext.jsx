import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import api, { WS_ROOT } from '../utils/api';
import { getStoredUser, getAccessToken } from '../utils/auth';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';
import { playSound } from '../utils/sounds';

const NotificationContext = createContext();

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const { ready: authReady } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [isPolling, setIsPolling] = useState(false);

  const socketRef         = useRef(null);
  const reconnectTimerRef = useRef(null);
  const pollingTimerRef   = useRef(null);
  const lastFetchedRef    = useRef(0);
  const wasOfflineRef     = useRef(false);
  const userIdRef         = useRef(null);
  // OPTIMIZATION: exponential backoff for reconnects to prevent Redis spam
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT_DELAY  = 60000; // cap at 60s
  const BASE_RECONNECT_DELAY = 5000;  // start at 5s (was 10s flat)

  const user   = getStoredUser();
  const userId = user?.id;

  // Keep userIdRef in sync
  useEffect(() => { userIdRef.current = userId; }, [userId]);

  // ── Polling fallback ────────────────────────────────────────────────────
  const stopPolling = useCallback(() => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const poll = useCallback(async () => {
    if (Date.now() - lastFetchedRef.current < 10000) return;
    try {
      const r = await api.get('/notifications/polling/');
      setUnreadCount(r.data.unread_count);
      setNotifications(r.data.notifications);
      lastFetchedRef.current = Date.now();
    } catch (err) {
      console.warn('Polling failed', err);
    }
  }, []);

  const startPolling = useCallback(() => {
    if (pollingTimerRef.current) return;
    setIsPolling(true);
    poll(); // immediate first poll
    pollingTimerRef.current = setInterval(poll, 30000);
  }, [poll]);

  // ── WebSocket connection ─────────────────────────────────────────────────
  const connect = useCallback(() => {
    if (!userIdRef.current) return;
    const token = getAccessToken();
    if (!token) return;

    // Guard: don't open a second connection
    if (socketRef.current && socketRef.current.readyState <= WebSocket.OPEN) return;

    // SECURITY: Connect without token in URL — send it as first message instead.
    // This prevents the access token from appearing in server/proxy logs.
    const ws = new WebSocket(`${WS_ROOT}/ws/notifications/`);
    socketRef.current = ws;

    ws.onopen = () => {
      // Send auth token as the first message (not in URL)
      ws.send(JSON.stringify({ type: 'auth', token }));
    };

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);

        // Handle auth confirmation — mark connection as active after successful auth
        if (data.type === 'auth_success') {
          if (data.user_id) {
            setRealtimeConnected(true);
            stopPolling();
            reconnectAttemptsRef.current = 0;
            if (reconnectTimerRef.current) {
              clearTimeout(reconnectTimerRef.current);
              reconnectTimerRef.current = null;
            }
            if (wasOfflineRef.current) {
              wasOfflineRef.current = false;
              lastFetchedRef.current = 0;
              poll();
            }
          }
          return;
        }

        if (data.type === 'unread_count') {
          setUnreadCount(data.count);

        } else if (data.type === 'notification') {
          setNotifications(prev => {
            const existing = prev.find(n => n.id === data.id);
            if (existing) {
              // Consolidated notification — update in place
              return prev.map(n => n.id === data.id ? { ...n, title: data.title, message: data.message, message_count: data.message_count } : n);
            }
            return [data, ...prev].slice(0, 20);
          });
          setUnreadCount(data.unread_count);
          // Play appropriate sound per notification type
          if (data.notification_type === 'announcement') {
            playSound('announcement');
          } else if (data.notification_type === 'message') {
            playSound('message');
          } else {
            playSound('notification');
          }
          toast.success(data.title, { duration: 5000 });

        } else if (data.type === 'notification_read') {
          setNotifications(prev =>
            prev.map(n => n.id === data.id ? { ...n, is_read: true } : n)
          );
          setUnreadCount(data.unread_count);

        } else if (data.type === 'moderation_alert') {
          playSound('error');
          toast.error(`NEW REPORT: ${data.data.reason}`, { icon: '⚠️', duration: 10000 });
        } else if (data.type === 'emergency_alert') {
          playSound('error');
          const em = data.data || {};
          toast.error(`EMERGENCY: ${em.title || 'Alert'}`, {
            icon: '🚨',
            duration: 15000,
          });
        }
      } catch (err) {
        console.error('Error parsing notification WS message', err);
      }
    };

    ws.onclose = (e) => {
      setRealtimeConnected(false);
      socketRef.current = null;
      startPolling();
      // OPTIMIZATION: exponential backoff — prevents rapid reconnect loops
      // that spam Redis with group_add/group_discard commands.
      // 5s → 10s → 20s → 40s → 60s (capped)
      if (e.code !== 1000 && e.code !== 1001 && userIdRef.current) {
        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
        const attempts = reconnectAttemptsRef.current;
        const delay = Math.min(BASE_RECONNECT_DELAY * Math.pow(2, attempts), MAX_RECONNECT_DELAY);
        reconnectAttemptsRef.current = attempts + 1;
        reconnectTimerRef.current = setTimeout(connect, delay);
      }
    };

    ws.onerror = () => {
      setRealtimeConnected(false);
      wasOfflineRef.current = true;
      startPolling();
    };
  }, [poll, startPolling, stopPolling]);

  // ── Send a WS action (mark read, etc.) ──────────────────────────────────
  const sendWS = useCallback((payload) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(payload));
      return true;
    }
    return false;
  }, []);

  // ── Reconnect on browser coming back online ──────────────────────────────
  useEffect(() => {
    const handleOnline = () => {
      wasOfflineRef.current = true;
      if (!socketRef.current || socketRef.current.readyState > WebSocket.OPEN) {
        connect();
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [connect]);

  // ── Connect / disconnect on login / logout ───────────────────────────────
  // authReady is needed so the effect re-runs after a page refresh when the
  // access token is restored via cookie refresh (userId is the same from
  // localStorage but getAccessToken() was null on the first render).
  useEffect(() => {
    if (!authReady) return;
    if (userId) {
      connect();
    } else {
      // Logout cleanup
      if (socketRef.current) {
        socketRef.current.close(1000, 'User logged out');
        socketRef.current = null;
      }
      setRealtimeConnected(false);
      setNotifications([]);
      setUnreadCount(0);
      stopPolling();
      // Reset backoff so next login starts fresh
      reconnectAttemptsRef.current = 0;
    }
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    };
  }, [authReady, userId, connect, stopPolling]);

  const value = {
    notifications,
    setNotifications,
    unreadCount,
    setUnreadCount,
    realtimeConnected,
    isPolling,
    sendWS,
    // NOTE: do not expose socketRef.current directly — it's always stale in a value object.
    // Consumers that need to send WS messages should use sendWS() instead.
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
