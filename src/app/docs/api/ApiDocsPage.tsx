'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { SidebarLayout } from '@/components/layout/Sidebar';
import { DocsNavbar } from '@/components/docs/DocsNavbar';
import { AlertTriangle, ChevronDown, ChevronUp, Code2, Globe, Lock, Shield, Sparkles, Zap } from 'lucide-react';

type EndpointDoc = {
  method: 'GET' | 'POST';
  path: string;
  label: string;
  summary: string;
  example: string;
  params?: string;
  notes?: string;
};

type ErrorCodeDoc = {
  code: string;
  status: number;
  category: 'VALIDATION' | 'NOT_FOUND' | 'NETWORK' | 'RATE_LIMIT' | 'AUTH' | 'EXTRACTION_FAILED';
  handling: string;
};

type ShapeItem = {
  field: string;
  type: string;
  required: 'required' | 'optional' | 'conditional';
  notes: string;
};

const endpoints: EndpointDoc[] = [
  {
    method: 'GET',
    path: '/api/web/proxy',
    label: 'Preview / Stream Media',
    summary: 'Proxy/stream media URL for preview playback and HLS proxy flow.',
    example: `curl "{BASE_URL}/api/web/proxy?url=MEDIA_URL"`,
    params: 'url (required) - media URL from extract response',
    notes: 'Use this route for preview/stream. Dedicated download uses `/api/web/download`.',
  },
  {
    method: 'GET',
    path: '/api/web/download',
    label: 'Dedicated Download Route',
    summary: 'Download route used by runtime for file output.',
    example: `curl -L "{BASE_URL}/api/web/download?url=MEDIA_URL&filename=output.mp4"`,
    params: 'url (required), filename/platform (optional)',
    notes: 'Backend public equivalent: `GET /api/v1/download`.',
  },
  {
    method: 'POST',
    path: '/api/web/merge',
    label: 'Merge / Convert',
    summary: 'Supports YouTube URL mode and direct pair mode (`videoUrl + audioUrl`).',
    example: `curl -X POST {BASE_URL}/api/web/merge \\
  -H "Content-Type: application/json" \\
  -d '{"url":"YOUTUBE_URL","quality":"1080p","format":"mp4"}'`,
    params: 'url (YouTube mode) or videoUrl+audioUrl (pair mode), plus optional quality/format/filename',
    notes: 'Primary runtime merge path. Pair mode is used for frontend paired streams, including HLS audio/video merge path. Public `/api/v1/merge` is conditional and non-default (available only when `WEB_INTERNAL_SHARED_SECRET` is unset).',
  },
  {
    method: 'GET',
    path: '/api/v1/stats/public',
    label: 'Public Usage Stats',
    summary: 'Read public aggregate service usage stats.',
    example: `curl "{BASE_URL}/api/v1/stats/public"`,
    params: 'No params required',
  },
  {
    method: 'POST',
    path: '/api/web/extract',
    label: 'Extract Media Metadata',
    summary: 'Extract media metadata and download variants for runtime flow.',
    example: `curl -X POST {BASE_URL}/api/web/extract \\
  -H "Content-Type: application/json" \\
  -d '{"url":"POST_URL","cookie":"optional_cookie"}'`,
    params: 'url (required), cookie (optional)',
    notes: 'Accepts `{ url, cookie? }`. Cookie lane order: Guest -> Server -> UserProvided.',
  },
];

const errorCodes: ErrorCodeDoc[] = [
  { code: 'INVALID_JSON', status: 400, category: 'VALIDATION', handling: 'Request body is malformed JSON. Fix syntax/shape and retry.' },
  { code: 'INVALID_URL', status: 400, category: 'VALIDATION', handling: 'URL is missing/invalid. Must be absolute HTTP/HTTPS.' },
  { code: 'MISSING_PARAMS', status: 400, category: 'VALIDATION', handling: 'Required fields/query params are missing.' },
  { code: 'METHOD_NOT_ALLOWED', status: 405, category: 'VALIDATION', handling: 'Wrong HTTP method for endpoint. Use the documented method.' },

  { code: 'PLATFORM_NOT_FOUND', status: 404, category: 'NOT_FOUND', handling: 'Platform pattern is not supported by extractor registry.' },
  { code: 'NO_MEDIA_FOUND', status: 422, category: 'NOT_FOUND', handling: 'Content exists but no downloadable media was detected.' },
  { code: 'NOT_FOUND', status: 404, category: 'NOT_FOUND', handling: 'Endpoint/route not found under current runtime/public routes.' },

  { code: 'TIMEOUT', status: 504, category: 'NETWORK', handling: 'Gateway timeout. Usually upstream latency; retry with backoff.' },
  { code: 'NETWORK_ERROR', status: 502, category: 'NETWORK', handling: 'Upstream/proxy network failure. Retry recommended.' },
  { code: 'PROXY_FAILED', status: 502, category: 'NETWORK', handling: 'Proxy stream/request failed. Try another variant or retry.' },

  { code: 'RATE_LIMITED', status: 429, category: 'RATE_LIMIT', handling: 'Too many requests. Honor `Retry-After` and `resetAt` metadata.' },

  { code: 'AUTH_REQUIRED', status: 401, category: 'AUTH', handling: 'Authentication/cookie is required for this content.' },
  { code: 'ACCESS_DENIED', status: 403, category: 'AUTH', handling: 'Authenticated but forbidden by upstream/policy restrictions.' },
  { code: 'ORIGIN_NOT_ALLOWED', status: 403, category: 'AUTH', handling: 'Request origin blocked by server policy.' },

  { code: 'EXTRACTION_FAILED', status: 500, category: 'EXTRACTION_FAILED', handling: 'Generic extraction processing failure; check metadata `causeCode`.' },
  { code: 'MERGE_FAILED', status: 500, category: 'EXTRACTION_FAILED', handling: 'FFmpeg merge execution failed.' },
  { code: 'FFMPEG_UNAVAILABLE', status: 503, category: 'EXTRACTION_FAILED', handling: 'FFmpeg is unavailable on server runtime.' },
  { code: 'FILE_TOO_LARGE', status: 413, category: 'EXTRACTION_FAILED', handling: 'Selected file exceeds server size limit; choose lower quality.' },
];

const categoryColor: Record<ErrorCodeDoc['category'], string> = {
  VALIDATION: 'text-orange-400',
  NOT_FOUND: 'text-sky-400',
  NETWORK: 'text-yellow-400',
  RATE_LIMIT: 'text-amber-400',
  AUTH: 'text-red-400',
  EXTRACTION_FAILED: 'text-pink-400',
};

const orderedCategories: ErrorCodeDoc['category'][] = [
  'VALIDATION',
  'NOT_FOUND',
  'NETWORK',
  'RATE_LIMIT',
  'AUTH',
  'EXTRACTION_FAILED',
];

const responseShape: ShapeItem[] = [
  { field: 'success', type: 'boolean', required: 'required', notes: 'True for success, false for error.' },
  { field: 'data', type: 'object', required: 'conditional', notes: 'Present only when success=true.' },
  { field: 'error', type: 'object', required: 'conditional', notes: 'Present only when success=false.' },
  { field: 'meta', type: 'object', required: 'optional', notes: 'Request metadata (requestId, timestamp, responseTime, accessMode, cookieSource).' },
];

const dataShape: ShapeItem[] = [
  { field: 'url', type: 'string', required: 'required', notes: 'Original URL sent to extract endpoint.' },
  { field: 'platform', type: 'string', required: 'required', notes: 'Detected platform (youtube, facebook, instagram, threads, twitter, pixiv, tiktok, ...).' },
  { field: 'mediaType', type: 'string', required: 'required', notes: 'Content classification (post/reel/story/video/audio/image).' },
  { field: 'author', type: 'object', required: 'optional', notes: 'name and/or handle. May be partial by platform.' },
  { field: 'content', type: 'object', required: 'optional', notes: 'id, text, description, createdAt (optional depending on source).' },
  { field: 'engagement', type: 'object', required: 'required', notes: 'views/likes/comments/shares/bookmarks. Missing stats default to 0.' },
  { field: 'media', type: 'array<Media>', required: 'required', notes: 'Always array. Single item still returned as array length 1.' },
  { field: 'authentication', type: 'object', required: 'required', notes: 'used + source (none/server/client).' },
];

const mediaShape: ShapeItem[] = [
  { field: 'index', type: 'number', required: 'required', notes: 'Stable position in media array.' },
  { field: 'type', type: 'string', required: 'required', notes: 'video/image/audio.' },
  { field: 'thumbnail', type: 'string', required: 'optional', notes: 'Preview URL if available.' },
  { field: 'variants', type: 'array<Variant>', required: 'required', notes: 'Always array. Can be 1 or many variants.' },
];

const variantShape: ShapeItem[] = [
  { field: 'quality', type: 'string', required: 'required', notes: 'Human quality label (1080p, HD, Audio, Original).' },
  { field: 'url', type: 'string', required: 'required', notes: 'Direct media URL (usually proxied on frontend).' },
  { field: 'size', type: 'number', required: 'optional', notes: 'File size bytes; may be unavailable on some sources.' },
  { field: 'mime', type: 'string', required: 'optional', notes: 'MIME type (video/mp4, image/jpeg, ...).' },
  { field: 'format', type: 'string', required: 'optional', notes: 'Extension (mp4, m4a, jpg, webp, ...).' },
  { field: 'resolution', type: 'string', required: 'optional', notes: 'Resolution when provided by extractor.' },
  { field: 'codec', type: 'string', required: 'optional', notes: 'Codec hint when available.' },
  { field: 'hasAudio', type: 'boolean', required: 'optional', notes: 'For video variants.' },
  { field: 'requiresMerge', type: 'boolean', required: 'optional', notes: 'True for separate AV streams (e.g. some YouTube formats).' },
  { field: 'requiresProxy', type: 'boolean', required: 'optional', notes: 'True if client should fetch via proxy route.' },
  { field: 'formatId', type: 'string', required: 'optional', notes: 'Extractor/internal quality identifier.' },
];

/* ── Reusable sub-components ─────────────────────────────────── */

function MacPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/45 overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-[var(--border-color)] bg-[var(--bg-card)]/55">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400/90" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400/90" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/90" />
        </div>
        <span className="text-[11px] text-[var(--text-muted)] truncate text-right">{title}</span>
      </div>
      <div className="p-3 overflow-x-auto">{children}</div>
    </div>
  );
}

function ShapeCard({ item, showRequired }: { item: ShapeItem; showRequired?: boolean }) {
  return (
    <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)]/55 p-2.5 overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <code className="text-xs text-[var(--text-primary)] break-all">{item.field}</code>
        <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--bg-secondary)] text-[var(--text-secondary)] whitespace-nowrap">{item.type}</span>
        {showRequired && (
          <span
            className={`text-[10px] px-2 py-0.5 rounded whitespace-nowrap ${
              item.required === 'required'
                ? 'bg-emerald-500/15 text-emerald-300'
                : item.required === 'conditional'
                  ? 'bg-amber-500/15 text-amber-300'
                  : 'bg-zinc-500/15 text-zinc-300'
            }`}
          >
            {item.required}
          </span>
        )}
      </div>
      <p className="text-xs text-[var(--text-muted)] leading-relaxed break-words">{item.notes}</p>
    </div>
  );
}

function InfoCard({ color, label, children }: { color: string; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 p-2.5 overflow-hidden">
      <p className={`text-[11px] font-semibold ${color} mb-1`}>{label}</p>
      <p className="text-xs text-[var(--text-muted)] leading-relaxed break-words">{children}</p>
    </div>
  );
}

function ChecklistCard({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 p-2.5 overflow-hidden">
      <p className="text-[11px] font-semibold text-[var(--text-primary)] mb-1 flex items-center gap-2">
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border border-[var(--accent-primary)]/35 text-[10px] font-bold shrink-0">{num}</span>
        {title}
      </p>
      <p className="text-xs text-[var(--text-muted)] leading-relaxed break-words">{children}</p>
    </div>
  );
}

/* ── Card wrapper — forces all children to stay inside ────── */

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`glass-card border border-[var(--border-color)] rounded-2xl p-4 sm:p-5 overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────── */

export function ApiDocsPage() {
  const [showErrorCodes, setShowErrorCodes] = useState(false);
  const [requestTab, setRequestTab] = useState<'curl' | 'powershell' | 'javascript'>('curl');
  const [responseTab, setResponseTab] = useState<'success' | 'error'>('success');
  const [openEndpoint, setOpenEndpoint] = useState<string | null>('/api/web/proxy');
  const [showResponseShapeGuide, setShowResponseShapeGuide] = useState(false);

  const otherEndpoints = endpoints.filter((ep) => ep.path !== '/api/web/extract');
  const rawBaseUrl = (process.env.NEXT_PUBLIC_API_URL || '').trim();
  const normalizedRawBaseUrl = rawBaseUrl.replace(/\/+$/, '');
  const baseUrl = (() => {
    if (!normalizedRawBaseUrl) return '';
    try {
      const parsed = new URL(normalizedRawBaseUrl);
      return `${parsed.protocol}//${parsed.hostname}`;
    } catch {
      return normalizedRawBaseUrl.replace(/:\d+(?=\/|$)/, '');
    }
  })();

  const requestExamples = {
    curl: `curl -X POST ${baseUrl}/api/web/extract \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "cookie": "optional_cookie_string"
  }'`,
    powershell: `Invoke-RestMethod -Uri "${baseUrl}/api/web/extract" \\
  -Method POST \\
  -ContentType "application/json" \\
  -Body '{"url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'`,
    javascript: `const res = await fetch('/api/web/extract', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    cookie: optionalCookie,
  }),
});

const json = await res.json();`,
  };

  const successResponse = `{
  "success": true,
  "data": {
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "platform": "youtube",
    "mediaType": "video",
    "author": {
      "name": "Rick Astley",
      "handle": "RickAstleyVEVO"
    },
    "content": {
      "id": "dQw4w9WgXcQ",
      "text": "Rick Astley - Never Gonna Give You Up (Official Music Video)",
      "description": "The official video for Never Gonna Give You Up"
    },
    "engagement": {
      "views": 0,
      "likes": 0,
      "comments": 0,
      "shares": 0,
      "bookmarks": 0
    },
    "media": [
      {
        "index": 0,
        "type": "video",
        "thumbnail": "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
        "variants": [
          {
            "quality": "1080p",
            "url": "https://rr1---sn.example.googlevideo.com/videoplayback?...",
            "resolution": "1920x1080",
            "mime": "video/mp4",
            "format": "mp4",
            "size": 52428800,
            "codec": "avc1",
            "hasAudio": false,
            "requiresMerge": true,
            "requiresProxy": false,
            "formatId": "137"
          },
          {
            "quality": "Audio",
            "url": "https://rr1---sn.example.googlevideo.com/videoplayback?...",
            "mime": "audio/mp4",
            "format": "m4a",
            "size": 4194304,
            "codec": "mp4a.40.2",
            "hasAudio": true,
            "requiresMerge": false,
            "requiresProxy": false,
            "formatId": "140"
          }
        ]
      }
    ],
    "authentication": {
      "used": false,
      "source": "none"
    }
  },
  "meta": {
    "requestId": "req_01J...",
    "timestamp": "2026-03-03T10:20:30Z",
    "responseTime": 342,
    "cookieSource": "guest",
    "accessMode": "public",
    "publicContent": true
  }
}`;

  const errorResponse = `{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "category": "RATE_LIMIT",
    "message": "rate limit exceeded",
    "metadata": {
      "retryAfter": 60,
      "resetAt": 1772500000,
      "causeCode": "RATE_LIMITED_429"
    }
  }
}`;

  return (
    <SidebarLayout>
      <div className="docs-surface py-5 sm:py-6 px-3 sm:px-4 lg:px-8 overflow-hidden w-full">
        <div className="max-w-5xl mx-auto overflow-hidden">
          <DocsNavbar />
          <div className="space-y-6 overflow-hidden">

            {/* ── Hero ── */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="sm:!p-6">
                <h1 className="text-2xl sm:text-3xl font-bold mb-3 leading-tight">
                  <span className="gradient-text">API</span> Reference
                </h1>
                <p className="text-[var(--text-muted)] text-sm leading-relaxed">
                  Complete endpoint and error-handling reference based on current backend implementation.
                  Includes routing groups, response behavior, and practical client handling rules.
                </p>
              </Card>
            </motion.div>

            {/* ── Feature cards ── */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 }} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="glass-card border border-[var(--border-color)] rounded-xl p-4 sm:p-5 flex flex-col justify-between bg-gradient-to-br from-yellow-500/8 to-transparent overflow-hidden">
                <div className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-yellow-400/30 bg-yellow-500/10 mb-2.5">
                  <Zap className="w-4.5 h-4.5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-base sm:text-lg font-semibold text-[var(--text-primary)] leading-tight">BFF Runtime Routes</p>
                  <p className="text-xs sm:text-[13px] text-[var(--text-muted)] mt-1.5 leading-relaxed break-words">Frontend calls signed `/api/web/*` routes by default.</p>
                </div>
              </div>
              <div className="glass-card border border-[var(--border-color)] rounded-xl p-4 sm:p-5 flex flex-col justify-between bg-gradient-to-br from-emerald-500/8 to-transparent overflow-hidden">
                <div className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-emerald-400/30 bg-emerald-500/10 mb-2.5">
                  <Shield className="w-4.5 h-4.5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-base sm:text-lg font-semibold text-[var(--text-primary)] leading-tight">Rate Limited</p>
                  <p className="text-xs sm:text-[13px] text-[var(--text-muted)] mt-1.5 leading-relaxed break-words">429 includes `Retry-After` and `resetAt` metadata.</p>
                </div>
              </div>
              <div className="glass-card border border-[var(--border-color)] rounded-xl p-4 sm:p-5 flex flex-col justify-between bg-gradient-to-br from-sky-500/8 to-transparent sm:col-span-2 lg:col-span-1 overflow-hidden">
                <div className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-sky-400/30 bg-sky-500/10 mb-2.5">
                  <Globe className="w-4.5 h-4.5 text-sky-400" />
                </div>
                <div>
                  <p className="text-base sm:text-lg font-semibold text-[var(--text-primary)] leading-tight">Split Proxy / Download</p>
                  <p className="text-xs sm:text-[13px] text-[var(--text-muted)] mt-1.5 leading-relaxed break-words">Preview/stream uses `/proxy`, file output uses `/download`.</p>
                </div>
              </div>
            </motion.div>

            {/* ── Base URL ── */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <Card>
                <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">Base URL</h2>
                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/60 px-3 py-2.5 overflow-hidden">
                  <code className="text-sm text-[var(--accent-primary)] break-all">{baseUrl || '/'}</code>
                </div>
                <p className="text-[11px] text-[var(--text-muted)] mt-2">
                  Source: <code className="text-[var(--text-secondary)]">NEXT_PUBLIC_API_URL</code>
                </p>
              </Card>
            </motion.div>

            {/* ── Extract endpoint ── */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.09 }}>
              <Card>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-green-500/20 text-green-300">POST</span>
                  <code className="text-sm text-[var(--text-primary)] break-all">/api/web/extract</code>
                </div>
                <p className="text-xs text-[var(--text-muted)] mb-4 break-words">Extract media information from supported URL with optional cookie lane fallback. Frontend runtime uses signed `/api/web/*` routes.</p>

                <div className="rounded-xl border border-sky-500/35 bg-sky-500/12 p-3 mb-4 overflow-hidden">
                  <p className="text-xs font-semibold text-sky-400 mb-1">Cookie Support</p>
                  <p className="text-xs text-[var(--text-secondary)] break-words">For private content, pass cookie in `cookie` field format: `name=value; name2=value2`.</p>
                </div>

                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Request</h3>
                <MacPanel title="request.json">
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {(['curl', 'powershell', 'javascript'] as const).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setRequestTab(tab)}
                        className={`text-[11px] px-2.5 py-1 rounded-md border transition-colors ${requestTab === tab ? 'border-[var(--accent-primary)]/40 bg-[var(--accent-primary)]/15 text-[var(--text-primary)]' : 'border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-muted)]'}`}
                      >
                        {tab === 'curl' ? 'cURL' : tab === 'powershell' ? 'PowerShell' : 'JavaScript'}
                      </button>
                    ))}
                  </div>
                  <pre className="text-[11px] sm:text-xs text-[var(--text-secondary)] overflow-x-auto leading-relaxed whitespace-pre-wrap break-all">
                    <code>{requestExamples[requestTab]}</code>
                  </pre>
                </MacPanel>

                <div className="mt-4">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Response</h3>
                  <MacPanel title="response.json">
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <button
                        type="button"
                        onClick={() => setResponseTab('success')}
                        className={`text-[11px] px-2.5 py-1 rounded-md border transition-colors ${responseTab === 'success' ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300' : 'border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-muted)]'}`}
                      >
                        Success
                      </button>
                      <button
                        type="button"
                        onClick={() => setResponseTab('error')}
                        className={`text-[11px] px-2.5 py-1 rounded-md border transition-colors ${responseTab === 'error' ? 'border-red-500/40 bg-red-500/15 text-red-300' : 'border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-muted)]'}`}
                      >
                        Error
                      </button>
                    </div>
                    <pre className="text-[11px] sm:text-xs text-[var(--text-secondary)] overflow-x-auto leading-relaxed whitespace-pre-wrap break-all">
                      <code>{responseTab === 'success' ? successResponse : errorResponse}</code>
                    </pre>
                  </MacPanel>
                </div>
              </Card>
            </motion.div>

            {/* ── Other Endpoints ── */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.11 }}>
              <Card>
                <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">Other Endpoints</h2>
                <div className="space-y-2.5">
                  {otherEndpoints.map((ep) => {
                    const expanded = openEndpoint === ep.path;
                    return (
                      <div key={`${ep.method}-${ep.path}`} className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/45 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setOpenEndpoint((prev) => (prev === ep.path ? null : ep.path))}
                          className="w-full p-3 sm:p-3.5 flex items-start sm:items-center justify-between gap-2 sm:gap-3 text-left border-b border-[var(--border-color)]"
                        >
                          <div className="min-w-0 overflow-hidden">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1">
                              <span className={`text-[10px] px-2 py-0.5 rounded font-semibold shrink-0 ${ep.method === 'GET' ? 'bg-sky-500/20 text-sky-300' : 'bg-green-500/20 text-green-300'}`}>{ep.method}</span>
                              <code className="text-xs text-[var(--text-primary)] break-all">{ep.path}</code>
                              <span className="text-xs text-[var(--text-muted)] basis-full sm:basis-auto break-words">{ep.label}</span>
                            </div>
                            <p className="text-xs text-[var(--text-muted)] leading-relaxed break-words">{ep.summary}</p>
                          </div>
                          {expanded ? <ChevronUp className="w-4 h-4 text-[var(--text-muted)] shrink-0" /> : <ChevronDown className="w-4 h-4 text-[var(--text-muted)] shrink-0" />}
                        </button>

                        {expanded && (
                          <div className="p-3 sm:p-4 space-y-3 overflow-hidden">
                            {ep.notes && <p className="text-xs text-[var(--text-secondary)] leading-relaxed break-words">{ep.notes}</p>}
                            <MacPanel title={`${ep.path.replace('/api/web/', '').replace('/api/v1/', '')}.example`}>
                              <pre className="text-[11px] sm:text-xs text-[var(--text-secondary)] overflow-x-auto leading-relaxed whitespace-pre-wrap break-all">
                                <code>{ep.example.replaceAll('{BASE_URL}', baseUrl)}</code>
                              </pre>
                            </MacPanel>
                            {ep.params && (
                              <p className="text-[11px] text-[var(--text-muted)] break-words">
                                Parameters: <span className="text-[var(--text-secondary)]">{ep.params}</span>
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Card>
            </motion.div>

            {/* ── Response Shape Guide ── */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
              <Card>
                <button
                  type="button"
                  onClick={() => setShowResponseShapeGuide((prev) => !prev)}
                  className="w-full flex items-start sm:items-center justify-between gap-2 text-left"
                >
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">Response Shape Guide</h2>
                  {showResponseShapeGuide ? (
                    <ChevronUp className="w-4 h-4 text-[var(--text-muted)] shrink-0 mt-0.5 sm:mt-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[var(--text-muted)] shrink-0 mt-0.5 sm:mt-0" />
                  )}
                </button>

                <p className="text-xs text-[var(--text-muted)] mt-2 leading-relaxed break-words">
                  Response envelope is stable across all platforms. Field values vary per source, but array/object shape stays consistent.
                  This section helps clients adapt without platform-specific hardcoding.
                </p>

                {showResponseShapeGuide ? (
                  <div className="space-y-3 mt-4">
                    <MacPanel title="Envelope (top level)">
                      <div className="space-y-2">
                        {responseShape.map((item) => (
                          <ShapeCard key={item.field} item={item} showRequired />
                        ))}
                      </div>
                    </MacPanel>

                    <MacPanel title="data object">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {dataShape.map((item) => (
                          <ShapeCard key={item.field} item={item} />
                        ))}
                      </div>
                    </MacPanel>

                    <MacPanel title="media[] and variants[]">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        <div className="space-y-2 overflow-hidden">
                          <p className="text-xs font-semibold text-[var(--text-primary)]">Media item</p>
                          {mediaShape.map((item) => (
                            <ShapeCard key={item.field} item={item} />
                          ))}
                        </div>
                        <div className="space-y-2 overflow-hidden">
                          <p className="text-xs font-semibold text-[var(--text-primary)]">Variant item</p>
                          {variantShape.map((item) => (
                            <ShapeCard key={item.field} item={item} />
                          ))}
                        </div>
                      </div>
                    </MacPanel>
                  </div>
                ) : (
                  <p className="text-[11px] text-[var(--text-muted)] mt-3">Collapsed by default. Click to expand full response field map.</p>
                )}
              </Card>
            </motion.div>

            {/* ── Error Categories + Cookie/Auth ── */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <h3 className="text-base font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[var(--accent-primary)] shrink-0" />
                  Error Categories
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <InfoCard color="text-orange-400" label="VALIDATION">Invalid request shape/body/URL. Fix input, then resend.</InfoCard>
                  <InfoCard color="text-sky-400" label="NOT_FOUND">Platform/content/route not found in current runtime/public scope.</InfoCard>
                  <InfoCard color="text-yellow-400" label="NETWORK">Gateway/upstream/proxy timeout or transient network failure.</InfoCard>
                  <InfoCard color="text-amber-400" label="RATE_LIMIT">Too many requests. Respect `Retry-After` + `resetAt`.</InfoCard>
                  <InfoCard color="text-red-400" label="AUTH">Cookie/session/login required or request is forbidden.</InfoCard>
                  <InfoCard color="text-pink-400" label="EXTRACTION_FAILED">Generic extraction runtime failure on server side.</InfoCard>
                </div>
              </Card>

              <Card>
                <h3 className="text-base font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[var(--accent-primary)] shrink-0" />
                  Cookie/Auth Handling
                </h3>
                <div className="space-y-2">
                  <InfoCard color="text-[var(--text-primary)]" label="Lane Order">Guest {'->'}  Server {'->'}  UserProvided</InfoCard>
                  <InfoCard color="text-[var(--text-primary)]" label="Escalation Rule">Move to next lane only when current lane fails with <span className="text-red-400">AUTH</span>.</InfoCard>
                  <InfoCard color="text-[var(--text-primary)]" label="Success Metadata">`meta.cookieSource` = `guest | server | userProvided`.</InfoCard>
                  <InfoCard color="text-[var(--text-primary)]" label="Private Access Flag">If auth lane used: `accessMode=private`, `publicContent=false`.</InfoCard>
                </div>
              </Card>
            </motion.div>

            {/* ── Error Codes Handling ── */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card>
                <button
                  type="button"
                  onClick={() => setShowErrorCodes((prev) => !prev)}
                  className="w-full flex items-start sm:items-center justify-between gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/35 px-3 py-2.5 hover:bg-[var(--bg-secondary)]/55 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Code2 className="w-4 h-4 text-[var(--accent-primary)] shrink-0" />
                    <span className="text-sm sm:text-base font-semibold text-[var(--text-primary)] break-words">Error Codes Handling</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] sm:text-xs text-[var(--text-muted)] shrink-0">
                    <span>{showErrorCodes ? 'Collapse' : 'Expand'}</span>
                    {showErrorCodes ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                {!showErrorCodes ? (
                  <p className="mt-3 text-xs text-[var(--text-muted)] leading-relaxed break-words">
                    Expand to view canonical error codes, HTTP status mapping, category group, and handling guidance.
                  </p>
                ) : (
                  <div className="mt-4 space-y-4">
                    {orderedCategories.map((category) => {
                      const items = errorCodes.filter((item) => item.category === category);
                      if (items.length === 0) return null;

                      return (
                        <div key={category} className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/25 p-3 sm:p-4 overflow-hidden">
                          <div className="flex items-center gap-2 mb-3">
                            <span className={`text-xs font-semibold ${categoryColor[category]}`}>{category}</span>
                            <span className="text-[11px] text-[var(--text-muted)]">({items.length} codes)</span>
                          </div>

                          <div className="space-y-2">
                            {items.map((item) => (
                              <div key={item.code} className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)]/60 p-2.5 sm:p-3 overflow-hidden">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-1.5">
                                  <code className="text-xs sm:text-sm text-[var(--text-primary)] break-all">{item.code}</code>
                                  <div className="flex flex-wrap items-center gap-2 sm:justify-end shrink-0">
                                    <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--bg-card)] text-[var(--text-secondary)] whitespace-nowrap">HTTP {item.status}</span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded bg-[var(--bg-card)] whitespace-nowrap ${categoryColor[item.category]}`}>{item.category}</span>
                                  </div>
                                </div>
                                <p className="text-xs text-[var(--text-muted)] leading-relaxed break-words">{item.handling}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </motion.div>

            {/* ── Client Handling Checklist ── */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }}>
              <Card>
                <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[var(--accent-primary)] shrink-0" />
                  Client Handling Checklist
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <ChecklistCard num="01" title="Branching">Route UX by `error.category` first, refine with `error.code` second.</ChecklistCard>
                  <ChecklistCard num="02" title="Rate Limit">Use `Retry-After` header and `error.metadata.resetAt` countdown together.</ChecklistCard>
                  <ChecklistCard num="03" title="Auth Recovery">Show cookie settings action and retry with user-provided lane.</ChecklistCard>
                  <ChecklistCard num="04" title="Retry Policy">Retry only `NETWORK` and `RATE_LIMIT` with exponential backoff.</ChecklistCard>
                  <div className="sm:col-span-2">
                    <ChecklistCard num="05" title="Canonical vs Cause Code">When code is normalized, inspect `error.metadata.causeCode` for upstream root cause.</ChecklistCard>
                  </div>
                </div>
                <div className="mt-3 text-[11px] text-[var(--text-muted)] flex items-start gap-1.5 leading-relaxed">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="break-words">This page is synced to current frontend runtime routes (`/api/web/*`) and active DownAria-API public routes.</span>
                </div>
                <div className="mt-2 text-[11px] text-[var(--text-muted)] flex items-start gap-1.5 leading-relaxed">
                  <Sparkles className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  <span className="break-words">Example JSON is representative; payload shape follows runtime extract result and may vary per platform.</span>
                </div>
              </Card>
            </motion.div>

          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
