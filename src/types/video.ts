export type NavRoute =
  | 'home'
  | 'dashboard'
  | 'create-clips'
  | 'projects'
  | 'clips'
  | 'settings';

export type ProjectStatus = 'staged' | 'queued' | 'processing' | 'completed';

export type ClipDurationPreset = 'auto' | '15-30' | '30-60' | '60-90';

export type AspectRatioOption = '9:16' | '1:1' | '16:9';

export type CaptionStyleOption =
  | 'bold-dynamic'
  | 'minimal-clean'
  | 'karaoke-highlight'
  | 'none';

export interface ClipSettings {
  duration: ClipDurationPreset;
  aspectRatio: AspectRatioOption;
  captionStyle: CaptionStyleOption;
  startTime: number;
  endTime: number;
}

export interface LocalVideoAsset {
  file: File;
  objectUrl: string;
  name: string;
  sizeBytes: number;
  mimeType: string;
  extension: 'MP4' | 'MOV' | 'WebM';
  durationSeconds?: number;
  width?: number;
  height?: number;
  thumbnailDataUrl?: string;
  remoteUploadId?: string;
}

export interface VideoProject {
  id: string;
  videoId?: string;
  name: string;
  fileName: string;
  mimeType?: string;
  fileSizeBytes: number;
  format: 'MP4' | 'MOV' | 'WebM';
  durationSeconds?: number;
  width?: number;
  height?: number;
  createdAt: string;
  status: ProjectStatus;
  settings: ClipSettings;
  thumbnailDataUrl?: string;
  previewUrl?: string;
  sourceFile?: File;
  clipsCount: number;
}

export interface GeneratedClip {
  id: string;
  projectId: string;
  title: string;
  durationSeconds: number;
  aspectRatio: AspectRatioOption;
  thumbnailUrl?: string;
  downloadUrl?: string;
  createdAt: string;
}

export interface GuestClipItem {
  id: string;
  uploadId: string;
  title: string;
  reason?: string;
  startTime: number;
  endTime: number;
  durationSeconds: number;
  aspectRatio: AspectRatioOption;
  captionStyle: CaptionStyleOption;
  previewUrl: string;
  thumbnailUrl?: string;
  createdAt: string;
  claimed?: boolean;
}

export interface GuestSessionState {
  guestId: string;
  expiresAt: string;
  limits: {
    maxFileBytes: number;
    maxDurationSeconds: number;
    maxUploads: number;
    maxProcessRuns: number;
  };
  usage: {
    uploadsUsed: number;
    processRunsUsed: number;
  };
  activeUpload: {
    id: string;
    fileName: string;
    mimeType: string;
    fileSizeBytes: number;
    format: 'MP4' | 'MOV' | 'WebM';
    durationSeconds: number;
    width?: number;
    height?: number;
    thumbnailDataUrl?: string;
  } | null;
  clips: GuestClipItem[];
  aiConfigured: boolean;
}

export type PendingSignInAction =
  | { type: 'download'; clipId: string; clipTitle: string }
  | { type: 'save-clip'; clipId: string; clipTitle: string }
  | { type: 'save-all' };

export interface WorkspaceProfile {
  displayName: string;
  email: string;
  workspaceName: string;
  creatorFocus: string;
}

export interface WorkspacePreferences {
  defaultAspectRatio: AspectRatioOption;
  defaultDuration: ClipDurationPreset;
  defaultCaptionStyle: CaptionStyleOption;
  autoIncludeCaptions: boolean;
  emailAlertsOnCompletion: boolean;
}
