'use client';

/**
 * MIUI-Style Slider Component
 * ===========================
 * Compact slider with +/- buttons on sides for easier adjustment.
 * Only triggers onChange on release (not during drag) to prevent excessive re-renders.
 */

import { useCallback, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/utils/helpers';

interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  className?: string;
  showValue?: boolean;
  valueFormat?: (value: number) => string;
  color?: 'purple' | 'blue' | 'green' | 'amber';
}

const COLOR_CLASSES = {
  purple: {
    track: 'bg-purple-500/80',
    button: 'hover:bg-purple-500/20 active:bg-purple-500/30',
    icon: 'text-purple-400',
  },
  blue: {
    track: 'bg-blue-500/80',
    button: 'hover:bg-blue-500/20 active:bg-blue-500/30',
    icon: 'text-blue-400',
  },
  green: {
    track: 'bg-green-500/80',
    button: 'hover:bg-green-500/20 active:bg-green-500/30',
    icon: 'text-green-400',
  },
  amber: {
    track: 'bg-amber-500/80',
    button: 'hover:bg-amber-500/20 active:bg-amber-500/30',
    icon: 'text-amber-400',
  },
};

export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  className,
  showValue = false,
  valueFormat,
  color = 'purple',
}: SliderProps) {
  const colors = COLOR_CLASSES[color];

  // Local state for dragging - only commit on release
  const [localValue, setLocalValue] = useState(value);
  const [isDragging, setIsDragging] = useState(false);

  // Use local value when dragging, otherwise use prop value
  const displayValue = isDragging ? localValue : value;
  const percentage = ((displayValue - min) / (max - min)) * 100;

  const handleDecrease = useCallback(() => {
    const newValue = Math.max(min, value - step);
    onChange(newValue);
  }, [value, min, step, onChange]);

  const handleIncrease = useCallback(() => {
    const newValue = Math.min(max, value + step);
    onChange(newValue);
  }, [value, max, step, onChange]);

  // Handle drag start
  const handleDragStart = useCallback(() => {
    setIsDragging(true);
    setLocalValue(value);
  }, [value]);

  // Handle drag (only update local state)
  const handleDrag = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(Number(e.target.value));
  }, []);

  // Handle drag end - commit the value
  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    if (localValue !== value) {
      onChange(localValue);
    }
  }, [localValue, value, onChange]);

  // Calculate thumb position (accounting for thumb width)
  const thumbSize = 16; // w-4 = 16px
  const thumbOffset = (percentage / 100) * thumbSize;

  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {/* Minus Button */}
      <button
        type="button"
        onClick={handleDecrease}
        disabled={value <= min}
        className={cn(
          'p-1 rounded-md transition-colors',
          'bg-white/5 border border-white/10',
          'disabled:opacity-30 disabled:cursor-not-allowed',
          colors.button
        )}
        aria-label="Decrease"
      >
        <Minus className={cn('w-3 h-3', colors.icon)} />
      </button>

      {/* Slider Track */}
      <div className="flex-1 relative h-5 flex items-center">
        {/* Background Track */}
        <div className="absolute inset-x-0 h-5 rounded-full bg-white/10 backdrop-blur-sm border border-white/10" />

        {/* Filled Track */}
        <div
          className={cn('absolute left-0 h-5 rounded-full transition-all', colors.track)}
          style={{ width: `calc(${percentage}% + ${(100 - percentage) / 100 * 10}px)` }}
        />

        {/* Thumb */}
        <div
          className="absolute w-4 h-4 rounded-full bg-white shadow-sm border border-white/20 transition-all pointer-events-none"
          style={{ left: `calc(${percentage}% - ${thumbOffset}px + 2px)` }}
        />

        {/* Hidden Input */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={displayValue}
          onMouseDown={handleDragStart}
          onTouchStart={handleDragStart}
          onChange={handleDrag}
          onMouseUp={handleDragEnd}
          onTouchEnd={handleDragEnd}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
      </div>

      {/* Plus Button */}
      <button
        type="button"
        onClick={handleIncrease}
        disabled={value >= max}
        className={cn(
          'p-1 rounded-md transition-colors',
          'bg-white/5 border border-white/10',
          'disabled:opacity-30 disabled:cursor-not-allowed',
          colors.button
        )}
        aria-label="Increase"
      >
        <Plus className={cn('w-3 h-3', colors.icon)} />
      </button>

      {/* Value Display */}
      {showValue && (
        <span className="min-w-[2.5rem] text-right text-[11px] font-medium text-[var(--text-secondary)]">
          {valueFormat ? valueFormat(displayValue) : displayValue}
        </span>
      )}
    </div>
  );
}

export default Slider;
