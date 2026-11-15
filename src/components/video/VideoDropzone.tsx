import React, { useId, useRef, useState } from 'react';
import { AlertCircle, Upload } from 'lucide-react';
import { validateVideoFile } from '../../utils/formatters';

interface VideoDropzoneProps {
  onFileAccepted: (file: File, extension: 'MP4' | 'MOV' | 'WebM') => void;
  heading?: string;
  description?: string;
  buttonLabel?: string;
  compact?: boolean;
}

export const VideoDropzone: React.FC<VideoDropzoneProps> = ({
  onFileAccepted,
  heading = 'Drop your long-form video here',
  description = 'Supports MP4, MOV, and WebM files for local preview and clip setup.',
  buttonLabel = 'Upload Video',
  compact = false,
}) => {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    const validation = validateVideoFile(file);
    if (!validation.valid || !validation.extension) {
      setErrorMessage(validation.error ?? 'Invalid video file.');
      return;
    }
    setErrorMessage(null);
    onFileAccepted(file, validation.extension);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    handleFile(file);
    event.target.value = '';
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    handleFile(file);
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative flex flex-col items-center justify-center rounded-xl border border-dashed text-center transition-colors duration-150 ${
          compact ? 'px-6 py-10' : 'px-6 py-14 sm:py-16'
        } ${
          isDragging
            ? 'border-[#2CE66D] bg-[#2CE66D]/8'
            : 'border-white/[0.14] bg-[#141816] hover:border-white/[0.24]'
        }`}
      >
        <input
          id={inputId}
          ref={fileInputRef}
          type="file"
          accept=".mp4,.mov,.webm,video/mp4,video/quicktime,video/webm"
          onChange={handleInputChange}
          className="sr-only"
        />

        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.08] bg-[#0E1110] text-[#2CE66D]">
          <Upload className="h-5 w-5" />
        </div>

        <h3 className="mt-4 font-display text-lg font-semibold text-[#F8FAFC]">
          {heading}
        </h3>
        <p className="mt-1.5 max-w-md text-sm text-[#94A39B]">{description}</p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-lg bg-[#2CE66D] px-5 py-2.5 min-h-[44px] text-sm font-semibold text-[#06130B] hover:bg-[#22C55E] transition-colors duration-150 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2CE66D] focus-visible:ring-offset-2 focus-visible:ring-offset-[#141816]"
          >
            <Upload className="h-4 w-4 shrink-0" />
            <span>{buttonLabel}</span>
          </button>
        </div>

        <p className="mt-4 text-xs text-[#94A39B]">
          MP4, MOV, or WebM · Local browser preview
        </p>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
