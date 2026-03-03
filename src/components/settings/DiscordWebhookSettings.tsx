'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, Bell, BellOff, Clock3, Info, Loader2, Send } from 'lucide-react';
import {
    UserDiscordSettings,
    DEFAULT_USER_DISCORD,
    getUserDiscordSettings,
    saveUserDiscordSettings,
} from '@/lib/utils/discord-webhook';

export function DiscordWebhookSettings() {
    const [settings, setSettings] = useState<UserDiscordSettings>(DEFAULT_USER_DISCORD);
    const [webhookUrlInput, setWebhookUrlInput] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
    const [showTips, setShowTips] = useState(false);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const saved = getUserDiscordSettings();
        if (saved) {
            const normalized = {
                ...DEFAULT_USER_DISCORD,
                ...saved,
                sendMethod: saved.sendMethod === 'smart' ? 'double' : saved.sendMethod,
            };
            setSettings(normalized);
            setWebhookUrlInput(normalized.webhookUrl || '');
            if (saved.sendMethod === 'smart') {
                saveUserDiscordSettings(normalized);
            }
        }
    }, []);

    useEffect(() => {
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, []);

    const updateSetting = <K extends keyof UserDiscordSettings>(key: K, value: UserDiscordSettings[K]) => {
        const next = { ...settings, [key]: value };
        setSettings(next);
        saveUserDiscordSettings(next);
    };

    const normalizeWebhookError = (raw: string, status: number) => {
        const text = raw?.trim();
        if (!text) return `Webhook error ${status}`;

        const isHtml = /^<!doctype html/i.test(text) || /<html[\s>]/i.test(text);
        if (isHtml) {
            return `Webhook error ${status}. Endpoint returned HTML instead of Discord API response.`;
        }

        return text.length > 220 ? `${text.slice(0, 220)}...` : text;
    };

    const sendTestMessage = async () => {
        if (!settings.enabled) {
            setResult({ success: false, message: 'Enable notifications first.' });
            return;
        }

        if (!settings.webhookUrl) {
            setResult({ success: false, message: 'Set webhook URL first.' });
            return;
        }

        setIsSending(true);
        setResult(null);

        try {
            const payload: Record<string, unknown> = {
                username: 'DownAria',
                avatar_url: typeof window !== 'undefined' ? `${window.location.origin}/icon.png` : '/icon.png',
            };

            if (settings.embedEnabled) {
                payload.embeds = [{
                    title: 'Download Notification Test',
                    description: 'Webhook test message from DownAria.',
                    color: parseInt(settings.embedColor.replace('#', ''), 16),
                    footer: { text: settings.footerText || 'via DownAria' },
                    timestamp: new Date().toISOString(),
                }];
            } else {
                payload.content = 'Download notification test from DownAria.';
            }

            const res = await fetch(settings.webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (res.ok || res.status === 204) {
                setResult({ success: true, message: 'Webhook test sent.' });
            } else {
                const errorText = await res.text();
                setResult({ success: false, message: normalizeWebhookError(errorText, res.status) });
            }
        } catch (err) {
            setResult({ success: false, message: err instanceof Error ? err.message : 'Failed to send test message.' });
        } finally {
            setIsSending(false);
        }
    };

    const controlsDisabled = !settings.enabled;
    const previewTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
        <div className="space-y-4">
            <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]/35">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-[#5865F2]/20 flex items-center justify-center shrink-0">
                            <svg className="w-6 h-6 text-[#5865F2]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                            </svg>
                        </div>
                        <div className="min-w-0">
                            <p className="text-lg font-semibold text-[var(--text-primary)] leading-tight">Discord Webhook</p>
                            <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
                                Video notifications use 2 messages: link first, then metadata embed. Your webhook URL is stored locally.
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setShowTips((v) => !v)}
                        className="w-10 h-10 rounded-xl border border-[var(--accent-primary)]/50 text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10 transition-colors"
                        aria-label="Toggle webhook tips"
                    >
                        <Info className="w-4 h-4 mx-auto" />
                    </button>
                </div>
            </div>

            {showTips && (
                <div className="p-3 rounded-xl border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/10 text-xs text-[var(--text-muted)] leading-relaxed">
                    Create a channel webhook in Discord Integrations, then paste the URL here.
                </div>
            )}

            <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]/35 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {settings.enabled ? <Bell className="w-4 h-4 text-[var(--accent-primary)]" /> : <BellOff className="w-4 h-4 text-[var(--text-muted)]" />}
                        <div>
                            <p className="text-sm font-medium text-[var(--text-primary)]">Enable Discord Notifications</p>
                            <p className="text-xs text-[var(--text-muted)]">Master switch for webhook notifications</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => updateSetting('enabled', !settings.enabled)}
                        className={`relative w-12 h-6 rounded-full shrink-0 transition-colors ${settings.enabled ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-card)] border border-[var(--border-color)]'}`}
                    >
                        <span
                            className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${settings.enabled ? 'translate-x-6' : 'translate-x-0'}`}
                        />
                    </button>
                </div>

                <div className={controlsDisabled ? 'opacity-60 pointer-events-none' : ''}>
                    <div className="grid grid-cols-1 xl:grid-cols-5 gap-3">
                        <div className="xl:col-span-3 p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]/30 space-y-3">
                            <div className="space-y-1.5">
                                <label className="text-xs text-[var(--text-muted)]">Webhook URL</label>
                                <input
                                    type="url"
                                    value={webhookUrlInput}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setWebhookUrlInput(val);
                                        if (debounceRef.current) clearTimeout(debounceRef.current);
                                        debounceRef.current = setTimeout(() => {
                                            updateSetting('webhookUrl', val);
                                        }, 400);
                                    }}
                                    placeholder="https://discord.com/api/webhooks/..."
                                    className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-primary)]/65 border border-[var(--border-color)] text-sm font-mono text-[var(--text-primary)]"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs text-[var(--text-muted)]">Mention (optional)</label>
                                <input
                                    type="text"
                                    value={settings.mention || ''}
                                    onChange={(e) => updateSetting('mention', e.target.value)}
                                    placeholder="@everyone or <@&role_id>"
                                    className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-primary)]/65 border border-[var(--border-color)] text-sm font-mono"
                                />
                            </div>

                            <button
                                type="button"
                                onClick={sendTestMessage}
                                disabled={isSending || !settings.webhookUrl}
                                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[var(--accent-primary)] text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                            >
                                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                {isSending ? 'Testing...' : 'Test Webhook'}
                            </button>
                        </div>

                        <div className="xl:col-span-2 p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]/30 space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-[var(--text-primary)]">Auto-send on download</p>
                                    <p className="text-xs text-[var(--text-muted)]">Runs only when notification is enabled and webhook URL is valid</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => updateSetting('autoSend', !settings.autoSend)}
                                    className={`relative w-12 h-6 rounded-full shrink-0 transition-colors ${settings.autoSend ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-card)] border border-[var(--border-color)]'}`}
                                >
                                    <span
                                        className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${settings.autoSend ? 'translate-x-6' : 'translate-x-0'}`}
                                    />
                                </button>
                            </div>

                            <p className="text-[11px] text-[var(--text-muted)]">
                                Canonical mode is fixed: 2 messages for video (link first, then metadata embed).
                            </p>

                            <div className="space-y-1.5">
                                <label className="block text-xs text-[var(--text-muted)]">Embed Color</label>
                                <div className="flex gap-2">
                                    <input
                                        type="color"
                                        value={settings.embedColor}
                                        onChange={(e) => updateSetting('embedColor', e.target.value)}
                                        className="w-12 h-10 rounded-lg cursor-pointer border border-[var(--border-color)]"
                                    />
                                    <input
                                        type="text"
                                        value={settings.embedColor}
                                        onChange={(e) => updateSetting('embedColor', e.target.value)}
                                        className="flex-1 px-2 py-2 rounded-lg bg-[var(--bg-primary)]/65 border border-[var(--border-color)] text-sm font-mono"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="block text-xs text-[var(--text-muted)]">Footer</label>
                                <input
                                    type="text"
                                    value={settings.footerText}
                                    onChange={(e) => updateSetting('footerText', e.target.value)}
                                    placeholder="via DownAria"
                                    className="w-full px-3 py-2.5 rounded-lg bg-[var(--bg-primary)]/65 border border-[var(--border-color)] text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]/30 p-3">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-medium text-[var(--text-secondary)]">Discord embed preview</p>
                            <p className="text-[10px] text-[var(--text-muted)]">Live</p>
                        </div>

                        <div className="rounded-lg border border-[#3f4248] bg-[#2b2d31] p-3 text-[#dbdee1]" style={{ borderLeft: `4px solid ${settings.embedColor}` }}>
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-[#f2f3f5]">Facebook Downloader</p>
                                    <p className="text-sm text-[#6ea8fe] mt-1">Open Media Source</p>
                                    <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
                                        <div>
                                            <p className="text-[#f2f3f5] font-semibold">Platform</p>
                                            <p>Facebook</p>
                                        </div>
                                        <div>
                                            <p className="text-[#f2f3f5] font-semibold">Type</p>
                                            <p>video</p>
                                        </div>
                                        <div>
                                            <p className="text-[#f2f3f5] font-semibold">Author</p>
                                            <p>Nikki.</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="w-14 h-14 rounded-md overflow-hidden bg-[#1f2125] shrink-0">
                                    <img src="/icon.png" alt="Preview thumbnail" className="w-full h-full object-cover" />
                                </div>
                            </div>

                            <div className="mt-3 pt-2 border-t border-[#3f4248] text-xs text-[#b5bac1] flex items-center gap-1.5">
                                <Clock3 className="w-3.5 h-3.5" />
                                <span>{settings.footerText || 'via DownAria'} • Today at {previewTime}</span>
                            </div>
                        </div>

                        <p className="text-[10px] text-[var(--text-muted)] mt-2">
                            Note: Preview updates from Embed Color and Footer fields. Real messages also include dynamic platform/title/author data.
                        </p>
                    </div>
                </div>

                {result && (
                    <div className={`mt-1 text-xs flex items-start gap-1.5 break-words ${result.success ? 'text-emerald-400' : 'text-red-400'}`}>
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span className="leading-relaxed">{result.message}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
