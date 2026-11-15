const SUPPORTED_EXTENSIONS = ['.mp4', '.mov', '.webm'] as const;
const SUPPORTED_MIME_TYPES = new Set([
  'video/mp4',
  'video/quicktime',
  'video/webm',
]);

export interface VideoValidationResult {
  valid: boolean;
  extension?: 'MP4' | 'MOV' | 'WebM';
  error?: string;
}

export function validateVideoFile(file: File): VideoValidationResult {
  const lowerName = file.name.toLowerCase();
  const matchedExt = SUPPORTED_EXTENSIONS.find((ext) => lowerName.endsWith(ext));

  if (!matchedExt && !SUPPORTED_MIME_TYPES.has(file.type)) {
    return {
      valid: false,
      error: `Unsupported file "${file.name}". Please select an MP4, MOV, or WebM video file.`,
    };
  }

  let extension: 'MP4' | 'MOV' | 'WebM' = 'MP4';
  if (matchedExt === '.mov' || file.type === 'video/quicktime') {
    extension = 'MOV';
  } else if (matchedExt === '.webm' || file.type === 'video/webm') {
    extension = 'WebM';
  }

  return {
    valid: true,
    extension,
  };
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, exponent);
  return `${value >= 100 || exponent === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[exponent]}`;
}

export function formatDuration(seconds?: number): string {
  if (seconds === undefined || !Number.isFinite(seconds) || seconds < 0) {
    return '--:--';
  }
  const totalSeconds = Math.floor(seconds);
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatShortDate(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function stripFileExtension(fileName: string): string {
  return fileName.replace(/\.(mp4|mov|webm)$/i, '');
}

export function captureVideoThumbnail(video: HTMLVideoElement): string | undefined {
  if (!video.videoWidth || !video.videoHeight) return undefined;
  try {
    const canvas = document.createElement('canvas');
    const maxWidth = 640;
    const scale = Math.min(1, maxWidth / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.78);
  } catch {
    return undefined;
  }
}
