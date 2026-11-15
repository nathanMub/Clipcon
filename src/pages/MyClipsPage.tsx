import React, { useMemo, useState } from 'react';
import { Clapperboard } from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';
import { ClipCard } from '../components/video/ClipCard';
import { AspectRatioOption, GeneratedClip, NavRoute } from '../types/video';

interface MyClipsPageProps {
  clips: GeneratedClip[];
  onNavigate: (route: NavRoute) => void;
  onDownloadClip: (clip: GeneratedClip) => Promise<void>;
}

type AspectFilter = 'all' | AspectRatioOption;

export const MyClipsPage: React.FC<MyClipsPageProps> = ({
  clips,
  onNavigate,
  onDownloadClip,
}) => {
  const [aspectFilter, setAspectFilter] = useState<AspectFilter>('all');

  const filteredClips = useMemo(() => {
    if (aspectFilter === 'all') return clips;
    return clips.filter((clip) => clip.aspectRatio === aspectFilter);
  }, [clips, aspectFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-[#F8FAFC]">
            My Clips
          </h1>
          <p className="text-sm text-[#94A39B]">
            Short-form exports formatted for TikTok, Instagram Reels, and YouTube Shorts.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <span className="font-mono text-xs tabular-nums text-[#94A39B]">
            {clips.length} {clips.length === 1 ? 'clip' : 'clips'}
          </span>

          <div
            role="group"
            aria-label="Filter clips by aspect ratio"
            className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-[#0E1110] p-1"
          >
            {(['all', '9:16', '1:1', '16:9'] as AspectFilter[]).map((ratio) => {
              const active = aspectFilter === ratio;
              return (
                <button
                  key={ratio}
                  type="button"
                  onClick={() => setAspectFilter(ratio)}
                  className={`rounded-md px-3 py-1.5 min-h-[34px] text-xs font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2CE66D] ${
                    active
                      ? 'bg-[#141816] text-[#2CE66D]'
                      : 'text-[#94A39B] hover:text-[#F8FAFC]'
                  }`}
                >
                  {ratio === 'all' ? 'All Ratios' : ratio}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {clips.length === 0 ? (
        <EmptyState
          icon={Clapperboard}
          title="No clips generated yet"
          description="Upload a video in Create Clips to generate short-form highlights and save them here."
          actionLabel="Go to Create Clips"
          onAction={() => onNavigate('create-clips')}
          secondaryLabel="View Projects"
          onSecondaryAction={() => onNavigate('projects')}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {filteredClips.map((clip) => (
            <ClipCard
              key={clip.id}
              clip={clip}
              onDownload={onDownloadClip}
            />
          ))}
        </div>
      )}
    </div>
  );
};
