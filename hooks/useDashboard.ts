import { useCallback, useEffect, useRef, useState } from "react";
import type { DashboardData } from "@/types/chatwoot";

interface UseDashboardResult {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => void;
}

export function useDashboard(intervalMs = 30000): UseDashboardResult {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const fetchingRef = useRef(false);
  const mountedRef = useRef(false);

  const fetchData = useCallback(async () => {
    if (fetchingRef.current) {
      return;
    }

    fetchingRef.current = true;
    setLoading(true);
    setError(null);

    abortRef.current?.abort();

    const controller = new AbortController();
    abortRef.current = controller;

    const timeoutId = window.setTimeout(() => {
      controller.abort();
    }, 15000);

    try {
      const res = await fetch(`/api/dashboard?t=${Date.now()}`, {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
        signal: controller.signal,
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error ?? `HTTP ${res.status}`);
      }

      setData(json);
      setLastUpdated(new Date());
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") {
        setError("Tempo limite ao buscar dados do dashboard.");
        return;
      }

      setError(e instanceof Error ? e.message : "Erro ao buscar dados");
    } finally {
      window.clearTimeout(timeoutId);
      fetchingRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    fetchData();

    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") {
        return;
      }

      fetchData();
    }, intervalMs);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchData();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      mountedRef.current = false;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      abortRef.current?.abort();
    };
  }, [fetchData, intervalMs]);

  return {
    data,
    loading,
    error,
    lastUpdated,
    refresh: fetchData,
  };
}
