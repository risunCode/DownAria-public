import { type NextRequest } from 'next/server';

import { proxyJson, readClientJson } from '@/infra/api/proxy';

export async function GET() {
  return proxyJson({
    method: 'GET',
    path: '/api/v1/stats',
  });
}

export async function POST(req: NextRequest) {
  const parsed = await readClientJson(req);
  if (!parsed.ok) {
    return parsed.response;
  }

  return proxyJson({
    method: 'POST',
    path: '/api/v1/stats/log',
    body: parsed.data,
  });
}
