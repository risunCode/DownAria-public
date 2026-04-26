'use client';

import { AlertTriangle, Sparkles } from 'lucide-react';

import { cn } from '@/shared/utils/cn';

interface SeasonalControlsProps {
  enabled: boolean;
  toggleTitle: string;
  toggleDescription: string;
  warningTitle: string;
  warningDescription: string;
  onToggle: (enabled: boolean) => void;
}

export function SeasonalControls({
  enabled,
  toggleTitle,
  toggleDescription,
  warningTitle,
  warningDescription,
  onToggle,
}: SeasonalControlsProps) {
  return (
    <>
      <div className="flex items-center justify-between p-4 rounded-xl border border-[var(--border-color)] hover:border-[var(--accent-primary)] transition-all">
        <div className="flex items-center gap-3">
          <Sparkles className={cn('w-5 h-5', enabled ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]')} />
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">{toggleTitle}</p>
            <p className="text-xs text-[var(--text-muted)]">{toggleDescription}</p>
          </div>
        </div>
        <button
          onClick={() => onToggle(!enabled)}
          className={cn(
            'relative w-12 h-6 rounded-full shrink-0 transition-colors',
            enabled ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-card)] border border-[var(--border-color)]'
          )}
        >
          <span className={cn('absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform', enabled ? 'translate-x-6' : 'translate-x-0')} />
        </button>
      </div>

      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
        <div className="flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-500">{warningTitle}</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">{warningDescription}</p>
          </div>
        </div>
      </div>
    </>
  );
}
