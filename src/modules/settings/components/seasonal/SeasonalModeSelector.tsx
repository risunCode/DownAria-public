'use client';

import { Sparkles } from 'lucide-react';

import { cn } from '@/shared/utils/cn';
import { type SeasonType } from '@/modules/settings/services';

const SEASON_OPTIONS: { id: 'auto' | 'random' | SeasonType; labelKey: string; emoji?: string; customIcon?: 'locks' }[] = [
  { id: 'auto', labelKey: 'seasonOptions.auto', emoji: '✨' },
  { id: 'random', labelKey: 'seasonOptions.random', emoji: '🎲' },
  { id: 'locks', labelKey: 'seasonOptions.locks', customIcon: 'locks' },
  { id: 'winter', labelKey: 'seasonOptions.winter', emoji: '❄️' },
  { id: 'spring', labelKey: 'seasonOptions.spring', emoji: '🌸' },
  { id: 'autumn', labelKey: 'seasonOptions.autumn', emoji: '🍂' },
  { id: 'off', labelKey: 'seasonOptions.off', emoji: '🌙' },
];

interface SeasonalModeSelectorProps {
  mode: 'auto' | 'random' | SeasonType;
  title: string;
  description: string;
  getLabel: (labelKey: string) => string;
  onChange: (mode: 'auto' | 'random' | SeasonType) => void;
}

export function SeasonalModeSelector({ mode, title, description, getLabel, onChange }: SeasonalModeSelectorProps) {
  return (
    <div className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)]/35 hover:border-[var(--accent-primary)]/50 transition-all">
      <div className="flex items-center gap-3 mb-3">
        <Sparkles className="w-5 h-5 text-[var(--accent-primary)]" />
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">{title}</p>
          <p className="text-xs text-[var(--text-muted)]">{description}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
        {SEASON_OPTIONS.map((option) => (
          <button
            key={option.id}
            onClick={() => onChange(option.id)}
            className={cn(
              'flex flex-col items-center gap-1 p-2 rounded-xl border transition-all bg-[var(--bg-card)]/35',
              mode === option.id
                ? 'bg-[var(--accent-primary)]/20 border-[var(--accent-primary)] text-[var(--accent-primary)]'
                : 'border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--accent-primary)]/50'
            )}
          >
            {option.customIcon === 'locks' ? (
              <span className="flex items-center gap-1">
                <img src="/custom_seasonal/worldlock_PngItem_1106058.png" alt="World Lock" className="w-4 h-4 object-contain" />
                <img src="/custom_seasonal/diamondlock_kindpng_4497640.png" alt="Diamond Lock" className="w-4 h-4 object-contain" />
              </span>
            ) : (
              <span className="text-lg">{option.emoji}</span>
            )}
            <span className="text-[10px] font-medium">{getLabel(option.labelKey)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
