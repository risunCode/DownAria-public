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
    path: '/api/v1/proxy',
    label: 'Stream / Download Media',
    summary: 'Proxy/stream downloadable media URL from extraction result.',
    example: `curl "{BASE_URL}/api/v1/proxy?url=MEDIA_URL"`,
    params: 'url (required) - media URL from extract response',
    notes: 'Supports size limits and upstream validation.',
  },
  {
    method: 'POST',
    path: '/api/v1/merge',
    label: 'YouTube Fast-Path Merge',
    summary: 'Use yt-dlp + FFmpeg fast-path from the original YouTube URL (no manual stream fallback).',
    example: `curl -X POST {BASE_URL}/api/v1/merge \\
  -H "Content-Type: application/json" \\
  -d '{"url":"YOUTUBE_URL","quality":"1080p","format":"mp4"}'`,
    params: 'url (required), quality/format/filename/userAgent (optional)',
    notes: 'Set format to mp3/m4a for audio output, or mp4 for merged video output.',
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
    path: '/api/v1/extract',
    label: 'Extract Media Metadata',
    summary: 'Extract media metadata, variants, and auth lane result.',
    example: `curl -X POST {BASE_URL}/api/v1/extract \\
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
  { code: 'NOT_FOUND', status: 404, category: 'NOT_FOUND', handling: 'Endpoint/route not found under `/api/v1`.' },

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

function MacPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/45 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-color)] bg-[var(--bg-card)]/55">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400/90" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400/90" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/90" />
        </div>
        <span className="text-[11px] text-[var(--text-muted)]">{title}</span>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

export function ApiDocsPage() {
  const [showErrorCodes, setShowErrorCodes] = useState(false);
  const [requestTab, setRequestTab] = useState<'curl' | 'powershell' | 'javascript'>('curl');
  const [responseTab, setResponseTab] = useState<'success' | 'error'>('success');
  const [openEndpoint, setOpenEndpoint] = useState<string | null>('/api/v1/proxy');

  const otherEndpoints = endpoints.filter((ep) => ep.path !== '/api/v1/extract');
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
    curl: `curl -X POST ${baseUrl}/api/v1/extract \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "cookie": "optional_cookie_string"
  }'`,
    powershell: `Invoke-RestMethod -Uri "${baseUrl}/api/v1/extract" \\
  -Method POST \\
  -ContentType "application/json" \\
  -Body '{"url":"https://www.youtube.com/watch?v=dQw4w9WgXcQ"}'`,
    javascript: `const res = await fetch('/api/v1/extract', {
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
      <div className="docs-surface py-5 sm:py-6 px-3 sm:px-4 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <DocsNavbar />
          <div className="space-y-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card border border-[var(--border-color)] rounded-2xl p-4 sm:p-6">
              <h1 className="text-2xl sm:text-3xl font-bold mb-3 leading-tight">
                <span className="gradient-text">API</span> Reference
              </h1>
              <p className="text-[var(--text-muted)] text-sm leading-relaxed max-w-3xl">
                Complete endpoint and error-handling reference based on current backend implementation.
                Includes routing groups, response behavior, and practical client handling rules.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
            >
              <div className="glass-card border border-[var(--border-color)] rounded-xl p-4 sm:p-5 min-h-[128px] sm:min-h-[136px] flex flex-col justify-between bg-gradient-to-br from-yellow-500/8 to-transparent">
                <div className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-yellow-400/30 bg-yellow-500/10 mb-2.5">
                  <Zap className="w-4.5 h-4.5 text-yellow-400" />
                </div>
                <div>
                  <p className="text-base sm:text-lg font-semibold text-[var(--text-primary)] leading-tight">Single Endpoint</p>
                  <p className="text-xs sm:text-[13px] text-[var(--text-muted)] mt-1.5 leading-relaxed">One extract endpoint for all supported platforms.</p>
                </div>
              </div>
              <div className="glass-card border border-[var(--border-color)] rounded-xl p-4 sm:p-5 min-h-[128px] sm:min-h-[136px] flex flex-col justify-between bg-gradient-to-br from-emerald-500/8 to-transparent">
                <div className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-emerald-400/30 bg-emerald-500/10 mb-2.5">
                  <Shield className="w-4.5 h-4.5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-base sm:text-lg font-semibold text-[var(--text-primary)] leading-tight">Rate Limited</p>
                  <p className="text-xs sm:text-[13px] text-[var(--text-muted)] mt-1.5 leading-relaxed">429 includes `Retry-After` and `resetAt` metadata.</p>
                </div>
              </div>
              <div className="glass-card border border-[var(--border-color)] rounded-xl p-4 sm:p-5 min-h-[128px] sm:min-h-[136px] flex flex-col justify-between bg-gradient-to-br from-sky-500/8 to-transparent sm:col-span-2 lg:col-span-1">
                <div className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-sky-400/30 bg-sky-500/10 mb-2.5">
                  <Globe className="w-4.5 h-4.5 text-sky-400" />
                </div>
                <div>
                  <p className="text-base sm:text-lg font-semibold text-[var(--text-primary)] leading-tight">Platform Auto Detect</p>
                  <p className="text-xs sm:text-[13px] text-[var(--text-muted)] mt-1.5 leading-relaxed">No platform param needed; backend detects from URL.</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="glass-card border border-[var(--border-color)] rounded-2xl p-4 sm:p-5"
            >
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">Base URL</h2>
              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/60 px-3 py-2.5">
                <code className="text-sm text-[var(--accent-primary)] break-all">{baseUrl || '/'}</code>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mt-2">
                Source: <code className="text-[var(--text-secondary)]">NEXT_PUBLIC_API_URL</code>
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.09 }}
              className="glass-card border border-[var(--border-color)] rounded-2xl p-4 sm:p-5"
            >
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-green-500/20 text-green-300">POST</span>
                <code className="text-sm text-[var(--text-primary)]">/api/v1/extract</code>
              </div>
              <p className="text-xs text-[var(--text-muted)] mb-4">Extract media information from supported URL with optional cookie lane fallback.</p>

              <div className="rounded-xl border border-sky-500/35 bg-sky-500/12 p-3 mb-4">
                <p className="text-xs font-semibold text-sky-400 mb-1">Cookie Support</p>
                <p className="text-xs text-[var(--text-secondary)]">For private content, pass cookie in `cookie` field format: `name=value; name2=value2`.</p>
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
                <pre className="text-[11px] sm:text-xs text-[var(--text-secondary)] overflow-x-auto leading-relaxed">
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
                  <pre className="text-[11px] sm:text-xs text-[var(--text-secondary)] overflow-x-auto leading-relaxed">
                    <code>{responseTab === 'success' ? successResponse : errorResponse}</code>
                  </pre>
                </MacPanel>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.11 }}
              className="glass-card border border-[var(--border-color)] rounded-2xl p-4 sm:p-5"
            >
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">Response Shape Guide</h2>
              <p className="text-xs text-[var(--text-muted)] mb-4 leading-relaxed">
                Response envelope is stable across all platforms. Field values vary per source, but array/object shape stays consistent.
                This section helps clients adapt without platform-specific hardcoding.
              </p>

              <div className="space-y-3">
                <MacPanel title="Envelope (top level)">
                  <div className="space-y-2">
                    {responseShape.map((item) => (
                      <div key={item.field} className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)]/55 p-2.5">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <code className="text-xs text-[var(--text-primary)]">{item.field}</code>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--bg-secondary)] text-[var(--text-secondary)]">{item.type}</span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded ${
                              item.required === 'required'
                                ? 'bg-emerald-500/15 text-emerald-300'
                                : item.required === 'conditional'
                                  ? 'bg-amber-500/15 text-amber-300'
                                  : 'bg-zinc-500/15 text-zinc-300'
                            }`}
                          >
                            {item.required}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-muted)] leading-relaxed">{item.notes}</p>
                      </div>
                    ))}
                  </div>
                </MacPanel>

                <MacPanel title="data object">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {dataShape.map((item) => (
                      <div key={item.field} className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)]/55 p-2.5">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <code className="text-xs text-[var(--text-primary)]">{item.field}</code>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--bg-secondary)] text-[var(--text-secondary)]">{item.type}</span>
                        </div>
                        <p className="text-xs text-[var(--text-muted)] leading-relaxed">{item.notes}</p>
                      </div>
                    ))}
                  </div>
                </MacPanel>

                <MacPanel title="media[] and variants[]">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-[var(--text-primary)]">Media item</p>
                      {mediaShape.map((item) => (
                        <div key={item.field} className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)]/55 p-2.5">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <code className="text-xs text-[var(--text-primary)]">{item.field}</code>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--bg-secondary)] text-[var(--text-secondary)]">{item.type}</span>
                          </div>
                          <p className="text-xs text-[var(--text-muted)] leading-relaxed">{item.notes}</p>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-[var(--text-primary)]">Variant item</p>
                      {variantShape.map((item) => (
                        <div key={item.field} className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)]/55 p-2.5">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <code className="text-xs text-[var(--text-primary)]">{item.field}</code>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--bg-secondary)] text-[var(--text-secondary)]">{item.type}</span>
                          </div>
                          <p className="text-xs text-[var(--text-muted)] leading-relaxed">{item.notes}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </MacPanel>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 }}
              className="glass-card border border-[var(--border-color)] rounded-2xl p-4 sm:p-5"
            >
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3">Other Endpoints</h2>
              <div className="space-y-2.5">
                {otherEndpoints.map((ep) => {
                  const expanded = openEndpoint === ep.path;
                  return (
                    <div key={`${ep.method}-${ep.path}`} className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/45 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setOpenEndpoint((prev) => (prev === ep.path ? null : ep.path))}
                        className="w-full p-3 sm:p-3.5 flex items-center justify-between gap-2 text-left border-b border-[var(--border-color)]"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${ep.method === 'GET' ? 'bg-sky-500/20 text-sky-300' : 'bg-green-500/20 text-green-300'}`}>{ep.method}</span>
                            <code className="text-xs text-[var(--text-primary)] break-all">{ep.path}</code>
                            <span className="text-xs text-[var(--text-muted)]">- {ep.label}</span>
                          </div>
                          <p className="text-xs text-[var(--text-muted)] leading-relaxed">{ep.summary}</p>
                        </div>
                        {expanded ? <ChevronUp className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0" />}
                      </button>

                      {expanded ? (
                        <div className="p-3 sm:p-4 space-y-3">
                          {ep.notes ? <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{ep.notes}</p> : null}
                          <MacPanel title={`${ep.path.replace('/api/v1/', '')}.example`}>
                            <pre className="text-[11px] sm:text-xs text-[var(--text-secondary)] overflow-x-auto leading-relaxed">
                              <code>{ep.example.replaceAll('{BASE_URL}', baseUrl)}</code>
                            </pre>
                          </MacPanel>
                          {ep.params ? (
                            <p className="text-[11px] text-[var(--text-muted)]">
                              Parameters: <span className="text-[var(--text-secondary)]">{ep.params}</span>
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="glass-card border border-[var(--border-color)] rounded-2xl p-4 sm:p-5">
                <h3 className="text-base font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[var(--accent-primary)]" />
                  Error Categories
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 p-2.5">
                    <p className="text-[11px] font-semibold text-orange-400 mb-1">VALIDATION</p>
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">Invalid request shape/body/URL. Fix input, then resend.</p>
                  </div>
                  <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 p-2.5">
                    <p className="text-[11px] font-semibold text-sky-400 mb-1">NOT_FOUND</p>
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">Platform/content/route not found in current v1 scope.</p>
                  </div>
                  <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 p-2.5">
                    <p className="text-[11px] font-semibold text-yellow-400 mb-1">NETWORK</p>
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">Gateway/upstream/proxy timeout or transient network failure.</p>
                  </div>
                  <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 p-2.5">
                    <p className="text-[11px] font-semibold text-amber-400 mb-1">RATE_LIMIT</p>
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">Too many requests. Respect `Retry-After` + `resetAt`.</p>
                  </div>
                  <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 p-2.5">
                    <p className="text-[11px] font-semibold text-red-400 mb-1">AUTH</p>
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">Cookie/session/login required or request is forbidden.</p>
                  </div>
                  <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 p-2.5">
                    <p className="text-[11px] font-semibold text-pink-400 mb-1">EXTRACTION_FAILED</p>
                    <p className="text-xs text-[var(--text-muted)] leading-relaxed">Generic extraction runtime failure on server side.</p>
                  </div>
                </div>
              </div>

              <div className="glass-card border border-[var(--border-color)] rounded-2xl p-4 sm:p-5">
                <h3 className="text-base font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[var(--accent-primary)]" />
                  Cookie/Auth Handling
                </h3>
                <div className="space-y-2">
                  <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 p-2.5">
                    <p className="text-[11px] font-semibold text-[var(--text-primary)] mb-1">Lane Order</p>
                    <p className="text-xs text-[var(--text-muted)]">Guest {'->'} Server {'->'} UserProvided</p>
                  </div>
                  <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 p-2.5">
                    <p className="text-[11px] font-semibold text-[var(--text-primary)] mb-1">Escalation Rule</p>
                    <p className="text-xs text-[var(--text-muted)]">Move to next lane only when current lane fails with <span className="text-red-400">AUTH</span>.</p>
                  </div>
                  <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 p-2.5">
                    <p className="text-[11px] font-semibold text-[var(--text-primary)] mb-1">Success Metadata</p>
                    <p className="text-xs text-[var(--text-muted)]">`meta.cookieSource` = `guest | server | userProvided`.</p>
                  </div>
                  <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 p-2.5">
                    <p className="text-[11px] font-semibold text-[var(--text-primary)] mb-1">Private Access Flag</p>
                    <p className="text-xs text-[var(--text-muted)]">If auth lane used: `accessMode=private`, `publicContent=false`.</p>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card border border-[var(--border-color)] rounded-2xl p-4 sm:p-5">
              <button
                type="button"
                onClick={() => setShowErrorCodes((prev) => !prev)}
                className="w-full flex items-center justify-between gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/35 px-3 py-2.5 hover:bg-[var(--bg-secondary)]/55 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-[var(--accent-primary)]" />
                  <span className="text-sm sm:text-base font-semibold text-[var(--text-primary)]">Error Codes Handling</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] sm:text-xs text-[var(--text-muted)]">
                  <span>{showErrorCodes ? 'Collapse' : 'Expand'}</span>
                  {showErrorCodes ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </button>

              {!showErrorCodes ? (
                <p className="mt-3 text-xs text-[var(--text-muted)] leading-relaxed">
                  Expand to view canonical error codes, HTTP status mapping, category group, and handling guidance.
                </p>
              ) : (
                <div className="mt-4 space-y-4">
                  {orderedCategories.map((category) => {
                    const items = errorCodes.filter((item) => item.category === category);
                    if (items.length === 0) return null;

                    return (
                      <div key={category} className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/25 p-3 sm:p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <span className={`text-xs font-semibold ${categoryColor[category]}`}>{category}</span>
                          <span className="text-[11px] text-[var(--text-muted)]">({items.length} codes)</span>
                        </div>

                        <div className="space-y-2">
                          {items.map((item) => (
                            <div key={item.code} className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)]/60 p-2.5 sm:p-3">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-1.5">
                                <code className="text-xs sm:text-sm text-[var(--text-primary)] break-all">{item.code}</code>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--bg-card)] text-[var(--text-secondary)]">HTTP {item.status}</span>
                                  <span className={`text-[10px] px-2 py-0.5 rounded bg-[var(--bg-card)] ${categoryColor[item.category]}`}>{item.category}</span>
                                </div>
                              </div>
                              <p className="text-xs text-[var(--text-muted)] leading-relaxed">{item.handling}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }} className="glass-card border border-[var(--border-color)] rounded-2xl p-4 sm:p-5">
              <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                <Globe className="w-4 h-4 text-[var(--accent-primary)]" />
                Client Handling Checklist
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 p-2.5">
                  <p className="text-[11px] font-semibold text-[var(--text-primary)] mb-1 flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border border-[var(--accent-primary)]/35 text-[10px] font-bold">01</span>
                    Branching
                  </p>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">Route UX by `error.category` first, refine with `error.code` second.</p>
                </div>
                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 p-2.5">
                  <p className="text-[11px] font-semibold text-[var(--text-primary)] mb-1 flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border border-[var(--accent-primary)]/35 text-[10px] font-bold">02</span>
                    Rate Limit
                  </p>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">Use `Retry-After` header and `error.metadata.resetAt` countdown together.</p>
                </div>
                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 p-2.5">
                  <p className="text-[11px] font-semibold text-[var(--text-primary)] mb-1 flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border border-[var(--accent-primary)]/35 text-[10px] font-bold">03</span>
                    Auth Recovery
                  </p>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">Show cookie settings action and retry with user-provided lane.</p>
                </div>
                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 p-2.5">
                  <p className="text-[11px] font-semibold text-[var(--text-primary)] mb-1 flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border border-[var(--accent-primary)]/35 text-[10px] font-bold">04</span>
                    Retry Policy
                  </p>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">Retry only `NETWORK` and `RATE_LIMIT` with exponential backoff.</p>
                </div>
                <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/50 p-2.5 sm:col-span-2">
                  <p className="text-[11px] font-semibold text-[var(--text-primary)] mb-1 flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] border border-[var(--accent-primary)]/35 text-[10px] font-bold">05</span>
                    Canonical vs Cause Code
                  </p>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">When code is normalized, inspect `error.metadata.causeCode` for upstream root cause.</p>
                </div>
              </div>
              <div className="mt-3 text-[11px] text-[var(--text-muted)] inline-flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                This page is synced to current backend code paths under `internal/transport/http` and `internal/core/errors`.
              </div>
              <div className="mt-2 text-[11px] text-[var(--text-muted)] inline-flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                Example JSON is representative; payload shape follows runtime extract result and may vary per platform.
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
