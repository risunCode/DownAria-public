import { type NextRequest } from 'next/server';

import { proxyJson, readClientJson } from '@/infra/api/proxy';
import { isBackendExtractData } from '@/infra/api/types';

export async function POST(req: NextRequest) {
	const parsed = await readClientJson(req);
	if (!parsed.ok) {
		return parsed.response;
	}

	return proxyJson({
		method: 'POST',
		path: '/api/v1/extract',
		body: parsed.data,
		validateData: isBackendExtractData,
	});
}
