import { type NextRequest } from 'next/server';

import { proxyJson } from '@/infra/api/proxy';
import { isBackendJobData } from '@/infra/api/types';

export async function GET(
	_req: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const { id } = await params;
	return proxyJson({
		method: 'GET',
		path: `/api/v1/jobs/${encodeURIComponent(id)}`,
		validateData: isBackendJobData,
	});
}

export async function DELETE(
	_req: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	const { id } = await params;
	return proxyJson({
		method: 'DELETE',
		path: `/api/v1/jobs/${encodeURIComponent(id)}`,
	});
}
