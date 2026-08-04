import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { password } = req.body ?? {};
  const expected = process.env.DASHBOARD_PASSWORD;

  if (!expected) {
    return res.status(500).json({ error: 'DASHBOARD_PASSWORD não configurada no servidor.' });
  }

  if (password !== expected) {
    return res.status(401).json({ error: 'Senha incorreta.' });
  }

  const isProd = process.env.NODE_ENV === 'production';
  res.setHeader(
    'Set-Cookie',
    `dashboard_session=${expected}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}${
      isProd ? '; Secure' : ''
    }`
  );

  return res.status(200).json({ ok: true });
}
