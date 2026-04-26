'use client';

import { Eye, Heart, Lock, MessageCircle, User } from 'lucide-react';

import { type PreviewItem, type PreviewResult } from '@/modules/downloader/model/preview';
import { formatNumber as formatCompactNumber } from '@/modules/downloader/utils/preview-helpers';
import { FormatSelector } from './FormatSelector';
import { LayersIcon } from '@/shared/ui/Icons';

interface PreviewHeaderProps {
  title: string;
  cached?: boolean;
  responseTimeMs?: number;
  isPrivateContent: boolean;
  onShowResponseJson: () => void;
  onShowCookieInfo: () => void;
  authorName?: string;
  authorHandle?: string;
  itemCount: number;
  engagement: PreviewResult['engagement'];
}

interface PreviewFormatPanelProps {
  item: PreviewItem;
  selectedFormatId: string;
  onSelectFormat: (formatId: string) => void;
}

export function PreviewHeader({
  title,
  cached,
  responseTimeMs,
  isPrivateContent,
  onShowResponseJson,
  onShowCookieInfo,
  authorName,
  authorHandle,
  itemCount,
  engagement,
}: PreviewHeaderProps) {
  return (
    <div className="mb-3 sm:mb-4">
      <div className="flex items-start justify-between gap-2 mb-1">
        <h3 className="text-sm sm:text-base font-semibold text-[var(--text-primary)] line-clamp-1">{title}</h3>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {(cached || (typeof responseTimeMs === 'number' && responseTimeMs > 0)) && (
            <button
              type="button"
              aria-label="Show extraction response JSON"
              onClick={onShowResponseJson}
              className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-mono font-medium ${
                cached
                  ? 'bg-purple-500/5 text-purple-400 border-purple-500/20'
                  : 'bg-blue-500/5 text-blue-400 border-blue-500/20'
              }`}
            >
              {cached ? 'CACHED' : `${responseTimeMs}ms`}
            </button>
          )}
          <button
            type="button"
            onClick={() => isPrivateContent && onShowCookieInfo()}
            disabled={!isPrivateContent}
            title={isPrivateContent ? 'Click to see cookie info' : undefined}
            className={`px-2 py-0.5 rounded border text-[10px] font-medium flex items-center gap-1 transition-all ${
              isPrivateContent
                ? 'bg-amber-500/5 text-amber-400 border-amber-500/20 hover:bg-amber-500/10 cursor-pointer'
                : 'bg-green-500/5 text-green-400 border-green-500/20 cursor-default'
            }`}
          >
            {isPrivateContent ? (
              <>
                <Lock className="w-3 h-3" />
                Private
              </>
            ) : (
              'Public'
            )}
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 sm:gap-3 text-xs text-[var(--text-secondary)]">
        {(authorName || authorHandle) && (
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {authorName || authorHandle}
          </span>
        )}
        {itemCount > 1 && (
          <span className="flex items-center gap-1 text-[var(--accent-primary)]">
            <LayersIcon className="w-3 h-3" />
            {itemCount} items
          </span>
        )}
        {(engagement.views || engagement.likes || engagement.comments) && (
          <span className="flex items-center gap-2 text-[var(--text-muted)] text-[11px] font-mono">
            {engagement.views ? (
              <span className="inline-flex items-center gap-1">
                <Eye className="w-3 h-3 text-sky-400" />
                {formatCompactNumber(engagement.views)}
              </span>
            ) : null}
            {engagement.likes ? (
              <span className="inline-flex items-center gap-1">
                <Heart className="w-3 h-3 text-rose-400" />
                {formatCompactNumber(engagement.likes)}
              </span>
            ) : null}
            {engagement.comments ? (
              <span className="inline-flex items-center gap-1">
                <MessageCircle className="w-3 h-3 text-emerald-400" />
                {formatCompactNumber(engagement.comments)}
              </span>
            ) : null}
          </span>
        )}
      </div>
    </div>
  );
}

export function PreviewFormatPanel({
  item,
  selectedFormatId,
  onSelectFormat,
}: PreviewFormatPanelProps) {
  return (
    <div className="flex flex-col gap-2">
      <FormatSelector formats={item.formats} selectedFormatId={selectedFormatId} onSelect={onSelectFormat} />
    </div>
  );
}
