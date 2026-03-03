import { createHash, createHmac, randomBytes } from 'crypto';

export function buildWebSignature(secret: string, method: string, path: string, timestamp: string, nonce: string, body: string): string {
  const bodyHash = createHash('sha256').update(body).digest('hex');
  const canonical = [method.toUpperCase(), path, timestamp, nonce, bodyHash].join('\n');
  return createHmac('sha256', secret).update(canonical).digest('hex');
}

export function buildWebSignatureHeaders(secret: string, method: string, path: string, body: string): Record<string, string> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = randomBytes(16).toString('hex');
  const signature = buildWebSignature(secret, method, path, timestamp, nonce, body);

  return {
    'X-Downaria-Timestamp': timestamp,
    'X-Downaria-Nonce': nonce,
    'X-Downaria-Signature': signature,
  };
}

export function resolveGatewayOrigin(request: Request): string {
  const configuredOrigin = (process.env.NEXT_PUBLIC_APP_URL || '').trim();
  const requestOrigin = (request.headers.get('origin') || '').trim();
  const isDevelopment = process.env.NODE_ENV === 'development';
  return isDevelopment ? (requestOrigin || configuredOrigin) : configuredOrigin;
}
