import React, { useRef, useState } from 'react';
import {
  AlertCircle,
  Bookmark,
  Check,
  CheckCircle2,
  Download,
  FileVideo,
  Info,
  Loader2,
  RefreshCw,
  Scissors,
  Trash2,
} from 'lucide-react';
import { TimeRangeSlider } from '../components/video/TimeRangeSlider';
import { VideoDropzone } from '../components/video/VideoDropzone';
import { useAuth } from '../contexts/AuthContext';
import {
  AspectRatioOption,
  CaptionStyleOption,
  ClipDurationPreset,
  ClipSettings,
  GuestClipItem,
  GuestSessionState,
  LocalVideoAsset,
  NavRoute,
} from '../types/video';
import {
  captureVideoThumbnail,
  formatDuration,
  formatFileSize,
} from '../utils/formatters';

interface CreateClipsPageProps {
  selectedVideo: LocalVideoAsset | null;
  settings: ClipSettings;
  guestSession: GuestSessionState | null;
  generatedClips: GuestClipItem[];
  processingStage: 'idle' | 'uploading' | 'processing';
  processingError: string | null;
  onClearProcessingError: () => void;
  onSelectVideo: (file: File, extension: 'MP4' | 'MOV' | 'WebM') => void;
  onUpdateVideoMetadata: (patch: Partial<LocalVideoAsset>) => void;
  onClearVideo: () => void;
  onUpdateSettings: (patch: Partial<ClipSettings>) => void;
  onGenerateClips: () => Promise<void>;
  onStageProject: () => Promise<void> | void;
  onRequestDownload: (clip: GuestClipItem) => Promise<void> | void;
  onRequestSaveClip: (clip: GuestClipItem) => Promise<void> | void;
  onRequestSaveAll: () => Promise<void> | void;
  onNavigate: (route: NavRoute) => void;
}

const DURATION_OPTIONS: { value: ClipDurationPreset; label: string }[] = [
  { value: 'auto', label: 'Auto (AI)' },
  { value: '15-30', label: '15–30s' },
  { value: '30-60', label: '30–60s' },
  { value: '60-90', label: '60–90s' },
];

const ASPECT_OPTIONS: { value: AspectRatioOption; label: string; hint: string }[] = [
  { value: '9:16', label: '9:16 Vertical', hint: 'TikTok, Reels, Shorts' },
  { value: '1:1', label: '1:1 Square', hint: 'Social feeds' },
  { value: '16:9', label: '16:9 Wide', hint: 'Standard landscape' },
];

const CAPTION_OPTIONS: { value: CaptionStyleOption; label: string }[] = [
  { value: 'bold-dynamic', label: 'Bold Dynamic' },
  { value: 'minimal-clean', label: 'Minimal Clean' },
  { value: 'karaoke-highlight', label: 'Word Highlight' },
  { value: 'none', label: 'No Captions' },
];

export const CreateClipsPage: React.FC<CreateClipsPageProps> = ({
  selectedVideo,
  settings,
  guestSession,
  generatedClips,
  processingStage,
  processingError,
  onClearProcessingError,
  onSelectVideo,
  onUpdateVideoMetadata,
  onClearVideo,
  onUpdateSettings,
  onGenerateClips,
  onStageProject,
  onRequestDownload,
  onRequestSaveClip,
  onRequestSaveAll,
  onNavigate,
}) => {
  const { user } = useAuth();
  const replaceInputRef = useRef<HTMLInputElement | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const [stagedConfirmation, setStagedConfirmation] = useState(false);
  const [staging, setStaging] = useState(false);
  const [busyClipId, setBusyClipId] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);

  const isBusy = processingStage !== 'idle';

  const handleLoadedMetadata = () => {
    const videoEl = videoElementRef.current;
    if (!videoEl) return;
    const rawDuration = Number.isFinite(videoEl.duration)
      ? videoEl.duration
      : undefined;
    onUpdateVideoMetadata({
      durationSeconds: rawDuration,
      width: videoEl.videoWidth || undefined,
      height: videoEl.videoHeight || undefined,
    });
    if (rawDuration && rawDuration > 0) {
      const roundedDuration = Math.round(rawDuration * 10) / 10;
      if (settings.endTime <= 0 || settings.endTime > roundedDuration) {
        onUpdateSettings({
          startTime: 0,
          endTime: roundedDuration,
        });
      }
    }
  };

  const handleSeekPreview = (timeSeconds: number) => {
    const videoEl = videoElementRef.current;
    if (!videoEl || !Number.isFinite(timeSeconds)) return;
    videoEl.currentTime = timeSeconds;
  };

  const handleLoadedData = () => {
    const videoEl = videoElementRef.current;
    if (!videoEl || selectedVideo?.thumbnailDataUrl) return;
    const thumb = captureVideoThumbnail(videoEl);
    if (thumb) {
      onUpdateVideoMetadata({ thumbnailDataUrl: thumb });
    }
  };

  const handleReplaceInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const lower = file.name.toLowerCase();
    let ext: 'MP4' | 'MOV' | 'WebM' = 'MP4';
    if (lower.endsWith('.mov') || file.type === 'video/quicktime') ext = 'MOV';
    else if (lower.endsWith('.webm') || file.type === 'video/webm') ext = 'WebM';
    else if (!lower.endsWith('.mp4') && file.type !== 'video/mp4') {
      event.target.value = '';
      return;
    }
    setStagedConfirmation(false);
    onClearProcessingError();
    onSelectVideo(file, ext);
    event.target.value = '';
  };

  const handleStageOnlyClick = async () => {
    if (!selectedVideo || staging) return;
    setStaging(true);
    try {
      await onStageProject();
      setStagedConfirmation(true);
    } finally {
      setStaging(false);
    }
  };

  const handleClipAction = async (
    clipId: string,
    fn: () => Promise<void> | void,
  ) => {
    setBusyClipId(clipId);
    try {
      await fn();
    } finally {
      setBusyClipId(null);
    }
  };

  const handleSaveAllClick = async () => {
    if (savingAll) return;
    setSavingAll(true);
    try {
      await onRequestSaveAll();
    } finally {
      setSavingAll(false);
    }
  };

  const unclaimedCount = generatedClips.filter((c) => !c.claimed).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-[#F8FAFC]">
            Create Clips
          </h1>
          <p className="text-sm text-[#94A39B]">
            Upload a video, set your trim window and framing presets, and preview generated short-form clips.
          </p>
        </div>

        {guestSession && !user && (
          <p className="font-mono text-xs tabular-nums text-[#94A39B]">
            {Math.max(
              0,
              guestSession.limits.maxProcessRuns -
                guestSession.usage.processRunsUsed,
            )}{' '}
            of {guestSession.limits.maxProcessRuns} guest runs remaining · 100 MB max
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
        {/* Left column: Upload & local video preview */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          {!selectedVideo ? (
            <VideoDropzone
              onFileAccepted={(file, ext) => {
                setStagedConfirmation(false);
                onClearProcessingError();
                onSelectVideo(file, ext);
              }}
              heading="Select a source video"
              description="Choose an MP4, MOV, or WebM file up to 100 MB (15 min max for guests). No account needed to start."
              buttonLabel="Select Video File"
            />
          ) : (
            <>
              <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#141816]">
                {/* Video Player */}
                <div className="aspect-video w-full bg-black border-b border-white/[0.08]">
                  <video
                    ref={videoElementRef}
                    key={selectedVideo.objectUrl}
                    src={selectedVideo.objectUrl}
                    controls
                    playsInline
                    preload="metadata"
                    onLoadedMetadata={handleLoadedMetadata}
                    onLoadedData={handleLoadedData}
                    className="h-full w-full object-contain"
                  />
                </div>

                {/* Selected Video File Details */}
                <div className="p-5 space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-[#0E1110] text-[#2CE66D]">
                        <FileVideo className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-display text-sm font-semibold text-[#F8FAFC]">
                          {selectedVideo.name}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#94A39B]">
                          <span className="font-mono tabular-nums">
                            {formatFileSize(selectedVideo.sizeBytes)}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{selectedVideo.extension}</span>
                          {selectedVideo.durationSeconds !== undefined && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono tabular-nums">
                                {formatDuration(selectedVideo.durationSeconds)}
                              </span>
                            </>
                          )}
                          {selectedVideo.width && selectedVideo.height && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono tabular-nums">
                                {selectedVideo.width}×{selectedVideo.height}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        ref={replaceInputRef}
                        type="file"
                        accept=".mp4,.mov,.webm,video/mp4,video/quicktime,video/webm"
                        onChange={handleReplaceInput}
                        className="sr-only"
                      />
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => replaceInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.1] bg-[#0E1110] px-3.5 py-2 min-h-[40px] text-xs font-medium text-[#F8FAFC] hover:bg-white/[0.06] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2CE66D]"
                      >
                        <RefreshCw className="h-3.5 w-3.5 shrink-0" />
                        <span>Change Video</span>
                      </button>
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => {
                          setStagedConfirmation(false);
                          onClearProcessingError();
                          onClearVideo();
                        }}
                        aria-label="Remove selected video"
                        className="inline-flex h-[40px] w-[40px] items-center justify-center rounded-lg border border-white/[0.08] bg-[#0E1110] text-[#94A39B] hover:text-red-300 hover:border-red-500/30 disabled:opacity-50 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2CE66D]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <TimeRangeSlider
                duration={selectedVideo.durationSeconds ?? 0}
                startTime={settings.startTime}
                endTime={settings.endTime}
                onChange={(startTime, endTime) =>
                  onUpdateSettings({ startTime, endTime })
                }
                onSeekPreview={handleSeekPreview}
              />
            </>
          )}
        </div>

        {/* Right column: Clip configuration */}
        <aside className="lg:col-span-5 xl:col-span-4 rounded-xl border border-white/[0.08] bg-[#141816] p-5 space-y-6">
          <div>
            <h2 className="font-display text-base font-semibold text-[#F8FAFC]">
              Clip Configuration
            </h2>
            <p className="mt-1 text-xs text-[#94A39B]">
              Choose output length, framing, and caption styling.
            </p>
          </div>

          {/* Clip Duration */}
          <div className="space-y-2.5">
            <label className="block text-xs font-medium text-[#F8FAFC]">
              Target Clip Duration
            </label>
            <div className="grid grid-cols-2 gap-2">
              {DURATION_OPTIONS.map((option) => {
                const active = settings.duration === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={isBusy}
                    onClick={() => onUpdateSettings({ duration: option.value })}
                    className={`rounded-lg px-3 py-2.5 min-h-[40px] text-xs font-medium border transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2CE66D] ${
                      active
                        ? 'border-[#2CE66D] bg-[#2CE66D]/12 text-[#F8FAFC]'
                        : 'border-white/[0.08] bg-[#0E1110] text-[#94A39B] hover:text-[#F8FAFC]'
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Aspect Ratio */}
          <div className="space-y-2.5">
            <label className="block text-xs font-medium text-[#F8FAFC]">
              Output Aspect Ratio
            </label>
            <div className="space-y-2">
              {ASPECT_OPTIONS.map((option) => {
                const active = settings.aspectRatio === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={isBusy}
                    onClick={() => onUpdateSettings({ aspectRatio: option.value })}
                    className={`flex w-full items-center justify-between rounded-lg px-3.5 py-2.5 min-h-[42px] border text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2CE66D] ${
                      active
                        ? 'border-[#2CE66D] bg-[#2CE66D]/12 text-[#F8FAFC]'
                        : 'border-white/[0.08] bg-[#0E1110] text-[#94A39B] hover:text-[#F8FAFC]'
                    }`}
                  >
                    <span className="text-xs font-medium whitespace-nowrap">
                      {option.label}
                    </span>
                    <span className="text-[11px] text-[#94A39B] whitespace-nowrap">
                      {option.hint}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Caption Style */}
          <div className="space-y-2.5">
            <label
              htmlFor="caption-style-select"
              className="block text-xs font-medium text-[#F8FAFC]"
            >
              Caption Style
            </label>
            <select
              id="caption-style-select"
              disabled={isBusy}
              value={settings.captionStyle}
              onChange={(e) =>
                onUpdateSettings({
                  captionStyle: e.target.value as CaptionStyleOption,
                })
              }
              className="w-full rounded-lg border border-white/[0.1] bg-[#0E1110] px-3.5 py-2.5 min-h-[42px] text-sm text-[#F8FAFC] focus:border-[#2CE66D] focus:outline-none focus:ring-1 focus:ring-[#2CE66D]"
            >
              {CAPTION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Honest Pipeline / Guest Storage Notice */}
          <div className="flex items-start gap-2.5 rounded-lg border border-white/[0.08] bg-[#0E1110] p-3.5 text-xs leading-relaxed text-[#94A39B]">
            <Info className="h-4 w-4 shrink-0 mt-0.5 text-[#2CE66D]" />
            {guestSession && !guestSession.aiConfigured ? (
              <p>
                Temporary upload and FFmpeg rendering are active, but server AI
                highlight detection is not configured yet. Submitting will
                validate your upload and report readiness rather than simulating
                clips.
              </p>
            ) : (
              <p>
                Guest uploads and generated clips stay in temporary server storage
                for 60 minutes. Sign in with Google when ready to download or save
                to My Clips.
              </p>
            )}
          </div>

          {processingError && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-500/10 p-3.5 text-xs leading-relaxed text-red-200"
            >
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
              <span>{processingError}</span>
            </div>
          )}

          {/* Primary CTA */}
          <div className="space-y-3 pt-1">
            <button
              type="button"
              disabled={!selectedVideo || isBusy}
              onClick={() => void onGenerateClips()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#2CE66D] px-4 py-3 min-h-[44px] text-sm font-semibold text-[#06130B] hover:bg-[#22C55E] disabled:cursor-not-allowed disabled:opacity-40 transition-colors duration-150 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2CE66D]"
            >
              {isBusy ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
              ) : (
                <Scissors className="h-4 w-4 shrink-0" />
              )}
              <span>
                {processingStage === 'uploading'
                  ? 'Uploading Video...'
                  : processingStage === 'processing'
                    ? 'Generating Clips...'
                    : 'Generate Clips'}
              </span>
            </button>

            {user && selectedVideo && (
              <button
                type="button"
                disabled={staging || isBusy}
                onClick={() => void handleStageOnlyClick()}
                className="inline-flex w-full items-center justify-center rounded-lg border border-white/[0.1] bg-[#0E1110] px-4 py-2.5 min-h-[40px] text-xs font-medium text-[#94A39B] hover:text-[#F8FAFC] hover:bg-white/[0.06] disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                {staging ? 'Saving Project...' : 'Save Staged Project Only'}
              </button>
            )}

            {stagedConfirmation && (
              <div className="rounded-lg border border-[#2CE66D]/30 bg-[#2CE66D]/10 p-3.5 text-xs text-[#D1FAE5] space-y-2">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-[#2CE66D]" />
                  <span>
                    Project metadata saved to your account as awaiting AI processing.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('projects')}
                  className="font-medium text-[#2CE66D] underline underline-offset-2 hover:text-white"
                >
                  View in My Projects
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Generated Clips Preview Grid */}
      {generatedClips.length > 0 && (
        <section
          aria-label="Generated clips preview"
          className="space-y-4 border-t border-white/[0.08] pt-8"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h2 className="font-display text-lg font-semibold text-[#F8FAFC]">
                Generated Clips ({generatedClips.length})
              </h2>
              <p className="text-xs text-[#94A39B]">
                {user
                  ? 'Preview your clips below, download MP4 files, or save them to My Clips.'
                  : 'Preview your generated clips free. Sign in with Google to download or save to My Clips.'}
              </p>
            </div>

            {unclaimedCount > 0 && (
              <button
                type="button"
                disabled={savingAll}
                onClick={() => void handleSaveAllClick()}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#2CE66D] px-4 py-2.5 min-h-[40px] text-xs font-semibold text-[#06130B] hover:bg-[#22C55E] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
              >
                <Bookmark className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {savingAll ? 'Saving...' : 'Save All to My Clips'}
                </span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {generatedClips.map((clip) => {
              const isClipBusy = busyClipId === clip.id;
              return (
                <article
                  key={clip.id}
                  className="flex flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-[#141816]"
                >
                  <div className="aspect-[9/16] max-h-[360px] w-full bg-black border-b border-white/[0.08]">
                    <video
                      src={clip.previewUrl}
                      poster={clip.thumbnailUrl}
                      controls
                      playsInline
                      preload="metadata"
                      className="h-full w-full object-contain"
                    />
                  </div>

                  <div className="flex flex-1 flex-col p-4 space-y-3">
                    <div>
                      <h3 className="font-display text-sm font-semibold text-[#F8FAFC] truncate">
                        {clip.title}
                      </h3>
                      <div className="mt-1 flex items-center gap-2 text-xs text-[#94A39B]">
                        <span className="font-mono tabular-nums">
                          {formatDuration(clip.durationSeconds)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{clip.aspectRatio}</span>
                      </div>
                      {clip.reason && (
                        <p className="mt-2 text-xs leading-relaxed text-[#94A39B] line-clamp-2">
                          {clip.reason}
                        </p>
                      )}
                    </div>

                    <div className="mt-auto grid grid-cols-2 gap-2 pt-2">
                      <button
                        type="button"
                        disabled={isClipBusy}
                        onClick={() =>
                          void handleClipAction(clip.id, () =>
                            onRequestDownload(clip),
                          )
                        }
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/[0.12] bg-[#0E1110] px-3 py-2 min-h-[38px] text-xs font-medium text-[#F8FAFC] hover:bg-white/[0.06] disabled:opacity-50 transition-colors whitespace-nowrap"
                      >
                        <Download className="h-3.5 w-3.5 shrink-0" />
                        <span>Download</span>
                      </button>

                      <button
                        type="button"
                        disabled={isClipBusy || clip.claimed}
                        onClick={() =>
                          void handleClipAction(clip.id, () =>
                            onRequestSaveClip(clip),
                          )
                        }
                        className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 min-h-[38px] text-xs font-semibold transition-colors whitespace-nowrap ${
                          clip.claimed
                            ? 'border border-[#2CE66D]/30 bg-[#2CE66D]/10 text-[#2CE66D] cursor-default'
                            : 'bg-[#2CE66D] text-[#06130B] hover:bg-[#22C55E] disabled:opacity-50'
                        }`}
                      >
                        {clip.claimed ? (
                          <>
                            <Check className="h-3.5 w-3.5 shrink-0" />
                            <span>Saved</span>
                          </>
                        ) : (
                          <>
                            <Bookmark className="h-3.5 w-3.5 shrink-0" />
                            <span>Save to My Clips</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};
