import React, { useState } from 'react';
import { Download, Video } from 'lucide-react';
import { GeneratedClip } from '../../types/video';
import { formatDuration, formatShortDate } from '../../utils/formatters';

interface ClipCardProps {
  clip: GeneratedClip;
  onDownload: (clip: GeneratedClip) => Promise<void> | void;
}

export const ClipCard: React.FC<ClipCardProps> = ({ clip, onDownload }) => {
  const [downloading, setDownloading] = useState(false);

  const handleClick = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      await onDownload(clip);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-[#141816]">
      <div className="relative aspect-[9/16] w-full bg-[#0E1110] border-b border-white/[0.07] overflow-hidden">
        {clip.thumbnailUrl ? (
          <img
            src={clip.thumbnailUrl}
            alt={clip.title}
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-[#94A39B]">
            <Video className="h-7 w-7" />
            <span className="text-xs">Short Clip</span>
          </div>
        )}

        <span className="absolute bottom-2.5 right-2.5 rounded bg-black/85 px-2 py-0.5 font-mono text-xs tabular-nums text-[#F8FAFC]">
          {formatDuration(clip.durationSeconds)}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-display text-sm font-semibold text-[#F8FAFC] truncate">
          {clip.title}
        </h3>
        <div className="mt-1 flex items-center gap-2 text-xs text-[#94A39B]">
          <span>{clip.aspectRatio}</span>
          <span aria-hidden="true">·</span>
          <span>{formatShortDate(clip.createdAt)}</span>
        </div>

        <button
          type="button"
          disabled={downloading}
          onClick={() => void handleClick()}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/[0.1] bg-[#0E1110] px-3.5 py-2 min-h-[40px] text-xs font-medium text-[#F8FAFC] hover:bg-white/[0.06] disabled:opacity-50 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2CE66D]"
        >
          <Download className="h-3.5 w-3.5 shrink-0" />
          <span>{downloading ? 'Downloading...' : 'Download Clip'}</span>
        </button>
      </div>
    </article>
  );
};
