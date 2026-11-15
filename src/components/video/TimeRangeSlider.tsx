import React from 'react';
import { RotateCcw } from 'lucide-react';
import { formatDuration } from '../../utils/formatters';

interface TimeRangeSliderProps {
  duration: number;
  startTime: number;
  endTime: number;
  onChange: (startTime: number, endTime: number) => void;
  onSeekPreview?: (timeSeconds: number) => void;
}

export const TimeRangeSlider: React.FC<TimeRangeSliderProps> = ({
  duration,
  startTime,
  endTime,
  onChange,
  onSeekPreview,
}) => {
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const minGap = safeDuration > 1 ? 1 : safeDuration * 0.1;
  const step = safeDuration >= 10 ? 0.5 : 0.1;

  const clampedStart =
    safeDuration > 0 ? Math.max(0, Math.min(startTime, safeDuration)) : 0;
  const clampedEnd =
    safeDuration > 0
      ? Math.max(clampedStart, Math.min(endTime > 0 ? endTime : safeDuration, safeDuration))
      : 0;

  const startPercent = safeDuration > 0 ? (clampedStart / safeDuration) * 100 : 0;
  const endPercent = safeDuration > 0 ? (clampedEnd / safeDuration) * 100 : 100;
  const selectedLength = Math.max(0, clampedEnd - clampedStart);

  const isModified =
    safeDuration > 0 && (clampedStart > 0.05 || clampedEnd < safeDuration - 0.05);

  const handleStartChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (safeDuration <= 0) return;
    const raw = Number(event.target.value);
    const nextStart = Math.min(raw, Math.max(0, clampedEnd - minGap));
    const rounded = Math.round(nextStart * 10) / 10;
    onChange(rounded, clampedEnd);
    onSeekPreview?.(rounded);
  };

  const handleEndChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (safeDuration <= 0) return;
    const raw = Number(event.target.value);
    const nextEnd = Math.max(raw, Math.min(safeDuration, clampedStart + minGap));
    const rounded = Math.round(nextEnd * 10) / 10;
    onChange(clampedStart, rounded);
    onSeekPreview?.(rounded);
  };

  const handleReset = () => {
    if (safeDuration <= 0) return;
    const fullEnd = Math.round(safeDuration * 10) / 10;
    onChange(0, fullEnd);
    onSeekPreview?.(0);
  };

  return (
    <section
      aria-label="Clip time range selection"
      className="rounded-xl border border-white/[0.08] bg-[#141816] p-5 space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-sm font-semibold text-[#F8FAFC]">
            Source Time Range
          </h2>
          <p className="mt-0.5 text-xs text-[#94A39B]">
            Select the start and end timestamps within your video to analyze for clips.
          </p>
        </div>

        {isModified && (
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.1] bg-[#0E1110] px-3 py-1.5 min-h-[34px] text-xs font-medium text-[#F8FAFC] hover:bg-white/[0.06] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2CE66D]"
          >
            <RotateCcw className="h-3.5 w-3.5 shrink-0" />
            <span>Reset Range</span>
          </button>
        )}
      </div>

      {/* Dual-thumb track */}
      <div className="relative flex h-9 items-center">
        {/* Base rail */}
        <div className="absolute inset-x-0 h-2 rounded-full bg-[#0E1110] border border-white/[0.08]" />

        {/* Selected active span */}
        <div
          className="absolute h-2 rounded-full bg-[#2CE66D]"
          style={{
            left: `${startPercent}%`,
            width: `${Math.max(0, endPercent - startPercent)}%`,
          }}
        />

        {/* Start range input */}
        <input
          type="range"
          min={0}
          max={safeDuration || 100}
          step={step}
          value={clampedStart}
          disabled={safeDuration <= 0}
          onChange={handleStartChange}
          aria-label="Start timestamp in seconds"
          className={`dual-range-input absolute inset-x-0 w-full h-9 m-0 focus:outline-none ${
            clampedStart > safeDuration * 0.85 ? 'z-30' : 'z-20'
          }`}
        />

        {/* End range input */}
        <input
          type="range"
          min={0}
          max={safeDuration || 100}
          step={step}
          value={clampedEnd}
          disabled={safeDuration <= 0}
          onChange={handleEndChange}
          aria-label="End timestamp in seconds"
          className="dual-range-input absolute inset-x-0 w-full h-9 m-0 z-20 focus:outline-none"
        />
      </div>

      {/* Timestamp readout */}
      <div className="grid grid-cols-3 gap-3 border-t border-white/[0.07] pt-3.5">
        <div>
          <span className="block text-[11px] font-medium text-[#94A39B]">
            Start Time
          </span>
          <span className="mt-0.5 block font-mono text-sm font-medium tabular-nums text-[#F8FAFC]">
            {safeDuration > 0 ? formatDuration(clampedStart) : '--:--'}
          </span>
        </div>

        <div className="text-center">
          <span className="block text-[11px] font-medium text-[#94A39B]">
            Selected Window
          </span>
          <span className="mt-0.5 block font-mono text-sm font-semibold tabular-nums text-[#2CE66D]">
            {safeDuration > 0 ? formatDuration(selectedLength) : '--:--'}
          </span>
        </div>

        <div className="text-right">
          <span className="block text-[11px] font-medium text-[#94A39B]">
            End Time
          </span>
          <span className="mt-0.5 block font-mono text-sm font-medium tabular-nums text-[#F8FAFC]">
            {safeDuration > 0 ? formatDuration(clampedEnd) : '--:--'}
          </span>
        </div>
      </div>
    </section>
  );
};
