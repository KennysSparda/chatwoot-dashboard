import { useState, useEffect } from "react";

const STORAGE_KEY = "chatwoot-ignored-agents";

export function useAgentFilter() {
  const [ignoredAgentIds, setIgnoredAgentIds] = useState<number[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setIgnoredAgentIds(JSON.parse(stored));
      } catch (e) {
        console.error("Erro ao ler agentes ignorados", e);
      }
    }
    setMounted(true);
  }, []);

  const toggleAgent = (id: number) => {
    setIgnoredAgentIds((prev) => {
      const isIgnored = prev.includes(id);
      const newIds = isIgnored ? prev.filter((i) => i !== id) : [...prev, id];
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(newIds));
      return newIds;
    });
  };

  return { ignoredAgentIds, toggleAgent, mounted };
}
