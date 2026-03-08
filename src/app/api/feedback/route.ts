import { NextResponse } from 'next/server';
import { rejectUntrustedRequest } from '../_internal/request-guard';

const FEEDBACK_WINDOW_MS = 10 * 60 * 1000;
const FEEDBACK_LIMIT = 5;

type FeedbackRateEntry = {
  count: number;
  resetAt: number;
};

const feedbackRateStore = new Map<string, FeedbackRateEntry>();

type FeedbackPayload = {
  name?: string;
  datetime?: string;
  comment?: string;
};

function sanitizeText(input: string): string {
  return input.replace(/\r\n/g, '\n').trim();
}

function containsDisallowedContent(input: string): boolean {
  return /(https?:\/\/|www\.|discord\.gg|@everyone|@here)/i.test(input);
}

function getClientAddress(request: Request): string {
  const forwardedFor = (request.headers.get('x-forwarded-for') || '').split(',')[0]?.trim();
  const realIp = (request.headers.get('x-real-ip') || '').trim();
  return forwardedFor || realIp || 'unknown';
}

function applyFeedbackRateLimit(request: Request): Response | null {
  const now = Date.now();
  const client = getClientAddress(request);

  for (const [key, value] of feedbackRateStore.entries()) {
    if (now >= value.resetAt) {
      feedbackRateStore.delete(key);
    }
  }

  const current = feedbackRateStore.get(client);
  if (!current || now >= current.resetAt) {
    feedbackRateStore.set(client, { count: 1, resetAt: now + FEEDBACK_WINDOW_MS });
    return null;
  }

  if (current.count >= FEEDBACK_LIMIT) {
    const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    return NextResponse.json(
      { error: 'Too many feedback requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': retryAfter.toString(),
        },
      },
    );
  }

  current.count += 1;
  feedbackRateStore.set(client, current);
  return null;
}

export async function POST(request: Request) {
  const rejected = rejectUntrustedRequest(request, 'feedback endpoint');
  if (rejected) return rejected;

  const rateLimited = applyFeedbackRateLimit(request);
  if (rateLimited) return rateLimited;

  const webhookUrl = (process.env.FEEDBACK_DISCORD_WEBHOOK_URL || '').trim();
  if (!webhookUrl) {
    return NextResponse.json({ error: 'Feedback webhook is not configured.' }, { status: 503 });
  }

  let body: FeedbackPayload;
  try {
    body = (await request.json()) as FeedbackPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const name = sanitizeText(body.name || '');
  const comment = sanitizeText(body.comment || '');
  const datetime = sanitizeText(body.datetime || new Date().toISOString());

  if (name.length < 2 || name.length > 40) {
    return NextResponse.json({ error: 'Name must be 2-40 characters.' }, { status: 400 });
  }
  if (comment.length < 3 || comment.length > 500) {
    return NextResponse.json({ error: 'Comment must be 3-500 characters.' }, { status: 400 });
  }
  if (containsDisallowedContent(name) || containsDisallowedContent(comment)) {
    return NextResponse.json({ error: 'Only plain text and emojis are allowed.' }, { status: 400 });
  }

  const parsedDatetime = new Date(datetime);
  const hasValidDatetime = !Number.isNaN(parsedDatetime.getTime());
  const embedTimestamp = hasValidDatetime ? parsedDatetime.toISOString() : new Date().toISOString();

  try {
    const webhookRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [
          {
            title: 'DownAria Feedback',
            color: 0x38bdf8,
            footer: {
              text: 'via DownAria',
            },
            timestamp: embedTimestamp,
            fields: [
              {
                name: 'Name',
                value: name,
                inline: true,
              },
              {
                name: 'Datetime',
                value: datetime,
                inline: true,
              },
              {
                name: 'Comment',
                value: comment,
              },
            ],
          },
        ],
        allowed_mentions: { parse: [] },
      }),
    });

    if (!webhookRes.ok) {
      return NextResponse.json({ error: 'Failed to deliver feedback to webhook.' }, { status: 502 });
    }
  } catch {
    return NextResponse.json({ error: 'Failed to send feedback.' }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
