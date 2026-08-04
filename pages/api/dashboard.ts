import type { NextApiRequest, NextApiResponse } from 'next';
import { ChatwootClient } from '@/lib/chatwoot';
import { DashboardData } from '@/types/chatwoot';

type ApiResponse = DashboardData | { error: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  const baseUrl = process.env.CHATWOOT_BASE_URL;
  const accountId = process.env.CHATWOOT_ACCOUNT_ID;
  const accessToken = process.env.CHATWOOT_ACCESS_TOKEN;

  if (!baseUrl || !accountId || !accessToken) {
    return res.status(500).json({
      error: 'CHATWOOT_BASE_URL, CHATWOOT_ACCOUNT_ID ou CHATWOOT_ACCESS_TOKEN não configurados no servidor.',
    });
  }

  try {
    const client = new ChatwootClient({ baseUrl, accountId, accessToken });
    const data = await client.getDashboardData();
    return res.status(200).json({
      ...data,
      meta: { baseUrl, accountId }, // não-sensível: só pra montar links "abrir no Chatwoot"
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido';
    return res.status(502).json({ error: message });
  }
}
