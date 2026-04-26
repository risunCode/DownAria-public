'use client';

import { ArrowUpDown, Eye, Leaf } from 'lucide-react';

import { Slider } from '@/shared/ui/Slider';

interface SeasonalParticlesPanelProps {
  intensity: number;
  opacity: number;
  speed: number;
  labels: {
    intensity: string;
    intensityHint: string;
    speed: string;
    speedHint: string;
    opacity: string;
    opacityHint: string;
  };
  onIntensityChange: (value: number) => void;
  onSpeedChange: (value: number) => void;
  onOpacityChange: (value: number) => void;
}

export function SeasonalParticlesPanel({
  intensity,
  opacity,
  speed,
  labels,
  onIntensityChange,
  onSpeedChange,
  onOpacityChange,
}: SeasonalParticlesPanelProps) {
  return (
    <div className="space-y-4 mt-4 pt-4 border-t border-[var(--border-color)]">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Leaf className="w-4 h-4 text-[var(--text-muted)]" />
          <span className="text-xs text-[var(--text-secondary)]">{labels.intensity}</span>
        </div>
        <Slider value={intensity} min={0} max={200} onChange={onIntensityChange} showValue valueFormat={(value) => `${value}%`} color="blue" />
        <p className="text-[10px] text-[var(--text-muted)]">{labels.intensityHint}</p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-[var(--text-muted)]" />
          <span className="text-xs text-[var(--text-secondary)]">{labels.speed}</span>
        </div>
        <Slider value={speed} min={50} max={150} onChange={onSpeedChange} showValue valueFormat={(value) => `${value}%`} color="blue" />
        <p className="text-[10px] text-[var(--text-muted)]">{labels.speedHint}</p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-[var(--text-muted)]" />
          <span className="text-xs text-[var(--text-secondary)]">{labels.opacity}</span>
        </div>
        <Slider value={opacity} min={10} max={100} onChange={onOpacityChange} showValue valueFormat={(value) => `${value}%`} color="blue" />
        <p className="text-[10px] text-[var(--text-muted)]">{labels.opacityHint}</p>
      </div>
    </div>
  );
}
