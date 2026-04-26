import { proxyDownload } from '@/infra/api/proxy';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  return proxyDownload({
    method: 'GET',
    path: `/api/v1/jobs/${encodeURIComponent(id)}/artifact`,
  });
}
