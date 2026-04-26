import { type NextRequest } from 'next/server';

import { proxyDownload, readClientJson } from '@/infra/api/proxy';

export async function POST(req: NextRequest) {
	const parsed = await readClientJson(req);
	if (!parsed.ok) {
		return parsed.response;
	}

	return proxyDownload({
		method: 'POST',
		path: '/api/v1/download',
		body: parsed.data,
	});
}
