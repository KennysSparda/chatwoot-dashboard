import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  DashboardPeriod,
  DashboardPeriodPreset,
} from "@/types/chatwoot";

const STORAGE_KEY = "support-dashboard-period";
const BRAZIL_OFFSET = "-03:00";

type PeriodState = Pick<
  DashboardPeriod,
  "preset" | "startDate" | "endDate"
>;

function formatDateBR(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function addDays(dateString: string, days: number): string {
  const base = new Date(`${dateString}T12:00:00${BRAZIL_OFFSET}`);
  base.setUTCDate(base.getUTCDate() + days);
  return formatDateBR(base);
}

function todayBR(): string {
  return formatDateBR(new Date());
}

function presetToDates(preset: Exclude<DashboardPeriodPreset, "custom">) {
  const endDate = todayBR();

  if (preset === "today") {
    return { startDate: endDate, endDate };
  }

  const startDate =
    preset === "last7days" ? addDays(endDate, -6) : addDays(endDate, -29);

  return { startDate, endDate };
}

function toTimestamp(dateString: string, endOfDay = false): number {
  const time = endOfDay ? "23:59:59" : "00:00:00";
  return Math.floor(
    new Date(`${dateString}T${time}${BRAZIL_OFFSET}`).getTime() / 1000,
  );
}

function getDefaultPeriodState(): PeriodState {
  return {
    preset: "last7days",
    ...presetToDates("last7days"),
  };
}

function readStoredPeriod(): PeriodState | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored) as Partial<DashboardPeriod>;
    if (!parsed.startDate || !parsed.endDate) return null;

    return {
      preset: parsed.preset ?? "custom",
      startDate: parsed.startDate,
      endDate: parsed.endDate,
    };
  } catch {
    return null;
  }
}

function buildPeriod(state: PeriodState): DashboardPeriod {
  return {
    ...state,
    since: toTimestamp(state.startDate, false),
    until: toTimestamp(state.endDate, true),
  };
}

function isSamePeriod(a: PeriodState, b: PeriodState) {
  return (
    a.preset === b.preset &&
    a.startDate === b.startDate &&
    a.endDate === b.endDate
  );
}

export function useDashboardPeriod() {
  const [appliedState, setAppliedState] = useState<PeriodState>(() =>
    getDefaultPeriodState(),
  );
  const [draftState, setDraftState] = useState<PeriodState>(() =>
    getDefaultPeriodState(),
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const storedPeriod = readStoredPeriod();

    if (storedPeriod) {
      setAppliedState(storedPeriod);
      setDraftState(storedPeriod);
    }

    setHydrated(true);
  }, []);

  const period = useMemo<DashboardPeriod>(() => buildPeriod(appliedState), [
    appliedState,
  ]);

  const draftPeriod = useMemo<DashboardPeriod>(() => buildPeriod(draftState), [
    draftState,
  ]);

  const hasPendingChanges = useMemo(() => {
    return !isSamePeriod(appliedState, draftState);
  }, [appliedState, draftState]);

  const selectPreset = useCallback(
    (preset: Exclude<DashboardPeriodPreset, "custom">) => {
      setDraftState({
        preset,
        ...presetToDates(preset),
      });
    },
    [],
  );

  const setStartDate = useCallback((startDate: string) => {
    if (!startDate) return;

    setDraftState((current) => ({
      ...current,
      preset: "custom",
      startDate,
    }));
  }, []);

  const setEndDate = useCallback((endDate: string) => {
    if (!endDate) return;

    setDraftState((current) => ({
      ...current,
      preset: "custom",
      endDate,
    }));
  }, []);

  const applyPeriod = useCallback(() => {
    setAppliedState(draftState);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draftState));
    }
  }, [draftState]);

  const resetLast7Days = useCallback(() => {
    const next = {
      preset: "last7days" as const,
      ...presetToDates("last7days"),
    };

    setDraftState(next);
    setAppliedState(next);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  }, []);

  return {
    period,
    draftPeriod,
    hydrated,
    hasPendingChanges,
    selectPreset,
    setStartDate,
    setEndDate,
    applyPeriod,
    resetLast7Days,
  };
}
