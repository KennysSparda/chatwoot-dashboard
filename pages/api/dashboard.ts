import type { NextApiRequest, NextApiResponse } from "next";
import { ChatwootClient } from "@/lib/chatwoot";
import type { DashboardData, DashboardPeriodPreset } from "@/types/chatwoot";

type ApiResponse = DashboardData | { error: string };

function parseTimestamp(value: string | string[] | undefined): number | undefined {
  const rawValue = Array.isArray(value) ? value[0] : value;
  if (!rawValue) return undefined;

  const parsed = Number(rawValue);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function parsePreset(
  value: string | string[] | undefined,
): DashboardPeriodPreset | undefined {
  const rawValue = Array.isArray(value) ? value[0] : value;

  if (
    rawValue === "today" ||
    rawValue === "last7days" ||
    rawValue === "last30days" ||
    rawValue === "custom"
  ) {
    return rawValue;
  }

  return undefined;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({
      error: "Método não permitido",
    });
  }

  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");

  const baseUrl = process.env.CHATWOOT_BASE_URL;
  const accountId = process.env.CHATWOOT_ACCOUNT_ID;
  const accessToken = process.env.CHATWOOT_ACCESS_TOKEN;

  if (!baseUrl || !accountId || !accessToken) {
    return res.status(500).json({
      error:
        "CHATWOOT_BASE_URL, CHATWOOT_ACCOUNT_ID ou CHATWOOT_ACCESS_TOKEN não configurados no servidor.",
    });
  }

  const since = parseTimestamp(req.query.since);
  const until = parseTimestamp(req.query.until);
  const preset = parsePreset(req.query.preset);

  if ((since && !until) || (!since && until)) {
    return res.status(400).json({
      error: "Informe since e until juntos para filtrar por período.",
    });
  }

  if (since && until && since >= until) {
    return res.status(400).json({
      error: "A data inicial precisa ser menor que a data final.",
    });
  }

  try {
    const client = new ChatwootClient({
      baseUrl,
      accountId,
      accessToken,
    });

    const data = await client.getDashboardData(since, until, preset);
    return res.status(200).json(data);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erro desconhecido ao buscar dados";

    return res.status(502).json({
      error: message,
    });
  }
}
