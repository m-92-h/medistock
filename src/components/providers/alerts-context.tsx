"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from "react";

interface AlertsContextValue {
  unreadCount: number;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

const AlertsContext = createContext<AlertsContextValue>({
  unreadCount: 0,
  refresh: async () => {},
  markRead: async () => {},
  markAllRead: async () => {},
});

export function AlertsProvider({ children }: { children: ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchCount = useCallback(async () => {
    try {
      const res = await fetch("/api/alerts?limit=100&isRead=false");
      if (!res.ok) return;
      const data = await res.json();
      setUnreadCount(data.total ?? data.alerts?.length ?? 0);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchCount();
    intervalRef.current = setInterval(fetchCount, 60_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchCount]);

  const markRead = useCallback(async (id: string) => {
    await fetch(`/api/alerts/${id}`, { method: "PATCH" });
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    await fetch("/api/alerts/bulk", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
    });
    setUnreadCount(0);
  }, []);

  return <AlertsContext.Provider value={{ unreadCount, refresh: fetchCount, markRead, markAllRead }}>{children}</AlertsContext.Provider>;
}

export function useAlerts() {
  return useContext(AlertsContext);
}
