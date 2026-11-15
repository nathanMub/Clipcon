import {
  ClipSettings,
  GeneratedClip,
  LocalVideoAsset,
  VideoProject,
} from '../types/video';

/**
 * Architectural boundary for future backend pipeline integration:
 * 1. Supabase Storage / Auth for persistent project & user state
 * 2. AI Transcription & Moment Detection (Whisper / Gemini)
 * 3. Server-side FFmpeg worker for 9:16 reframing, cutting, and caption burn-in
 *
 * Currently operates purely as a local staging contract without fake AI generation.
 */
export interface VideoProcessingService {
  readonly isBackendConnected: boolean;
  stageLocalProject(asset: LocalVideoAsset, settings: ClipSettings): VideoProject;
  listClipsForProject(projectId: string): Promise<GeneratedClip[]>;
}

export const clipPilotPipeline: VideoProcessingService = {
  isBackendConnected: false,

  stageLocalProject(asset: LocalVideoAsset, settings: ClipSettings): VideoProject {
    const cleanTitle = asset.name.replace(/\.(mp4|mov|webm)$/i, '');
    const suffix = Math.random().toString(36).slice(2, 7);
    const stamp = Date.now();
    return {
      id: `proj_${stamp}_${suffix}`,
      videoId: `vid_${stamp}_${suffix}`,
      name: cleanTitle || asset.name,
      fileName: asset.name,
      mimeType: asset.mimeType || 'video/mp4',
      fileSizeBytes: asset.sizeBytes,
      format: asset.extension,
      durationSeconds: asset.durationSeconds,
      width: asset.width,
      height: asset.height,
      createdAt: new Date().toISOString(),
      status: 'staged',
      settings: { ...settings },
      thumbnailDataUrl: asset.thumbnailDataUrl,
      previewUrl: asset.objectUrl,
      sourceFile: asset.file,
      clipsCount: 0,
    };
  },

  async listClipsForProject(): Promise<GeneratedClip[]> {
    return [];
  },
};
