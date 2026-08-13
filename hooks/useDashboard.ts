import { useCallback, useEffect, useRef, useState } from "react";
import type { DashboardData, DashboardPeriodPreset } from "@/types/chatwoot";

interface UseDashboardResult {
  data: DashboardData | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => void;
}

const REQUEST_TIMEOUT_MS = 60_000;

export function useDashboard(
  since?: number,
  until?: number,
  preset?: DashboardPeriodPreset,
  intervalMs = 30_000,
): UseDashboardResult {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const fetchingRef = useRef(false);
  const mountedRef = useRef(false);
  const hasDataRef = useRef(false);
  const requestSeqRef = useRef(0);

  const fetchData = useCallback(async () => {
    if (fetchingRef.current) return;

    const requestSeq = requestSeqRef.current + 1;
    requestSeqRef.current = requestSeq;
    fetchingRef.current = true;

    if (hasDataRef.current) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    const controller = new AbortController();
    abortRef.current = controller;
    let didTimeout = false;

    const timeoutId = window.setTimeout(() => {
      didTimeout = true;
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

    try {
      const params = new URLSearchParams({ t: String(Date.now()) });
      if (typeof since === "number") params.set("since", String(since));
      if (typeof until === "number") params.set("until", String(until));
      if (preset) params.set("preset", preset);

      const response = await fetch(`/api/dashboard?${params.toString()}`, {
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

      if (!mountedRef.current || requestSeq !== requestSeqRef.current) return;

      setData(payload as DashboardData);
      hasDataRef.current = true;
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      if (!mountedRef.current || requestSeq !== requestSeqRef.current) return;

      if (controller.signal.aborted) {
        if (didTimeout) {
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

      if (mountedRef.current && requestSeq === requestSeqRef.current) {
        setLoading(false);
        setRefreshing(false);
      }

      if (abortRef.current === controller) {
        abortRef.current = null;
      }

      if (requestSeq === requestSeqRef.current) {
        fetchingRef.current = false;
      }
    }
  }, [since, until, preset]);

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
      fetchingRef.current = false;
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
