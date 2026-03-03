import { NextResponse } from 'next/server';

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

export async function POST(request: Request) {
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

  const content = [
    '📝 **DownAria Feedback**',
    `👤 **Name:** ${name}`,
    `🕒 **Datetime:** ${datetime}`,
    `💬 **Comment:** ${comment}`,
  ].join('\n');

  try {
    const webhookRes = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content,
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
