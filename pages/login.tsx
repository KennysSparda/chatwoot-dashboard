import { useState } from "react";
import { useRouter } from "next/router";
import Logo from "@/components/Logo";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha no login");
      router.push("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#eeeeee] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center flex flex-col items-center">
          <Logo />

          <p className="text-zinc-400 text-sm">
            Acesso restrito ao time de suporte
          </p>
        </div>

        <div className="bg-[#18181b] border border-zinc-800 rounded-2xl p-6 space-y-4 shadow-xl">
          <div>
            <label className="block text-zinc-300 text-xs font-semibold mb-1.5 uppercase tracking-wider">
              Senha
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2.5 text-[#ff5a5a] text-sm focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-colors"
              autoFocus
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5 text-red-400 text-sm font-medium">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-500 active:bg-red-700 disabled:opacity-50 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors shadow-lg shadow-red-600/20 cursor-pointer"
          >
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </div>
      </div>
    </div>
  );
}
