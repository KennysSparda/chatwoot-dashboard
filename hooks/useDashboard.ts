import { useCallback, useEffect, useRef, useState } from "react";
import type { DashboardData } from "@/types/chatwoot";

interface UseDashboardResult {
  data: DashboardData | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => void;
}

const REQUEST_TIMEOUT_MS = 60_000;

export function useDashboard(intervalMs = 30_000): UseDashboardResult {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const fetchingRef = useRef(false);
  const mountedRef = useRef(false);
  const hasDataRef = useRef(false);

  const fetchData = useCallback(async () => {
    if (fetchingRef.current) return;

    fetchingRef.current = true;
    setError(null);

    if (hasDataRef.current) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const timeoutId = window.setTimeout(() => {
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`/api/dashboard?t=${Date.now()}`, {
        method: "GET",
        cache: "no-store",
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-cache",
        },
        signal: controller.signal,
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          payload?.error ?? `Falha ao atualizar o dashboard (${response.status})`,
        );
      }

      if (!mountedRef.current) return;

      setData(payload as DashboardData);
      hasDataRef.current = true;
      setLastUpdated(new Date());
    } catch (err) {
      if (!mountedRef.current || controller.signal.aborted) {
        if (controller.signal.aborted && mountedRef.current) {
          setError("A atualização excedeu o limite de 60 segundos.");
        }
        return;
      }

      setError(
        err instanceof Error
          ? err.message
          : "Erro desconhecido ao atualizar o dashboard.",
      );
    } finally {
      window.clearTimeout(timeoutId);

      if (mountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }

      if (abortRef.current === controller) {
        abortRef.current = null;
      }

      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void fetchData();

    const intervalId = window.setInterval(() => {
      void fetchData();
    }, intervalMs);

    return () => {
      mountedRef.current = false;
      window.clearInterval(intervalId);
      abortRef.current?.abort();
    };
  }, [fetchData, intervalMs]);

  return {
    data,
    loading,
    refreshing,
    error,
    lastUpdated,
    refresh: () => void fetchData(),
  };
}
