'use client';

import { Music } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { type PreviewFormat } from '@/modules/downloader/model/preview';
import { formatBytes } from '@/modules/downloader/services/preview';
import { cn } from '@/shared/utils/cn';

interface FormatSelectorProps {
  formats: PreviewFormat[];
  selectedFormatId: string;
  onSelect: (formatId: string) => void;
}

function qualityText(format: PreviewFormat) {
  if (format.kind === 'audio') return format.label;
  return format.qualityLabel || format.label;
}

function FormatButton({ format, selectedFormatId, onSelect }: { format: PreviewFormat; selectedFormatId: string; onSelect: (formatId: string) => void }) {
  const selected = format.id === selectedFormatId;

  return (
    <button
      type="button"
      onClick={() => onSelect(format.id)}
      className={cn(
        'inline-flex items-center rounded-lg px-2.5 py-1.5 text-[11px] font-mono font-medium transition-all border',
        selected 
          ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)] shadow-sm' 
          : 'bg-transparent text-[var(--text-secondary)] border-[var(--border-color)] hover:border-[var(--accent-primary)]/40 hover:text-[var(--text-primary)]'
      )}
    >
      {qualityText(format)}
      {format.needsMerge ? <span className="ml-1 text-yellow-500">⚡</span> : null}
      {format.sizeBytes ? <span className="ml-1 opacity-60">({formatBytes(format.sizeBytes)})</span> : null}
    </button>
  );
}

export function FormatSelector({ formats, selectedFormatId, onSelect }: FormatSelectorProps) {
  const t = useTranslations('download.preview');
  const videoFormats = formats.filter((format) => format.kind === 'video');
  const audioFormats = formats.filter((format) => format.kind === 'audio');
  const imageFormats = formats.filter((format) => format.kind === 'image');

  return (
    <div className="space-y-3">
      {videoFormats.length > 0 ? (
        <div className="space-y-1.5">
          <div className="text-[10px] text-blue-400/80">{t('video')}</div>
          <div className="flex flex-wrap gap-2">
            {videoFormats.map((format) => <FormatButton key={format.id} format={format} selectedFormatId={selectedFormatId} onSelect={onSelect} />)}
          </div>
        </div>
      ) : null}

      {imageFormats.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {imageFormats.map((format) => <FormatButton key={format.id} format={format} selectedFormatId={selectedFormatId} onSelect={onSelect} />)}
        </div>
      ) : null}

      {audioFormats.length > 0 ? (
        <div className="space-y-1.5 border-t border-[var(--border-color)]/30 pt-2">
          <div className="flex items-center gap-1 text-[10px] text-purple-400/80"><Music className="h-3 w-3" /><span>{t('audio')}</span></div>
          <div className="flex flex-wrap gap-2">
            {audioFormats.map((format) => <FormatButton key={format.id} format={format} selectedFormatId={selectedFormatId} onSelect={onSelect} />)}
          </div>
        </div>
      ) : null}
    </div>
  );
}
