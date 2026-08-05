import type { NextApiRequest, NextApiResponse } from "next";
import { ChatwootClient } from "@/lib/chatwoot";
import type { DashboardData } from "@/types/chatwoot";

type ApiResponse = DashboardData | { error: string };

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

  try {
    const client = new ChatwootClient({
      baseUrl,
      accountId,
      accessToken,
    });

    const data = await client.getDashboardData();

    return res.status(200).json(data);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erro desconhecido ao buscar dados";

    return res.status(502).json({
      error: message,
    });
  }
}
