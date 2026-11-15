import {
  AspectRatioOption,
  CaptionStyleOption,
  ClipDurationPreset,
  ClipSettings,
  GeneratedClip,
  GuestSessionState,
  ProjectStatus,
  VideoProject,
  WorkspacePreferences,
  WorkspaceProfile,
} from '../types/video';

interface ApiUserRow {
  uid: string;
  email: string;
  displayName: string;
  workspaceName: string;
  creatorFocus: string;
  defaultAspectRatio: string;
  defaultDuration: string;
  defaultCaptionStyle: string;
  autoIncludeCaptions: boolean;
  emailAlertsOnCompletion: boolean;
}

interface ApiProjectRow {
  id: string;
  videoId: string | null;
  name: string;
  fileName: string;
  mimeType: string | null;
  fileSizeBytes: number;
  format: string;
  durationSeconds: number | null;
  width: number | null;
  height: number | null;
  status: string;
  clipDurationPreset: string;
  aspectRatio: string;
  captionStyle: string;
  startTime: number;
  endTime: number;
  thumbnailDataUrl: string | null;
  clipsCount: number;
  createdAt: string;
}

interface ApiClipRow {
  id: string;
  projectId: string;
  title: string;
  durationSeconds: number;
  aspectRatio: string;
  thumbnailUrl: string | null;
  downloadUrl: string | null;
  createdAt: string;
}

async function requestJson<T>(
  url: string,
  token: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      typeof body?.error === 'string'
        ? body.error
        : `Request failed with status ${response.status}`,
    );
  }

  return (await response.json()) as T;
}

function mapUserRow(row: ApiUserRow): {
  profile: WorkspaceProfile;
  preferences: WorkspacePreferences;
} {
  return {
    profile: {
      displayName: row.displayName,
      email: row.email,
      workspaceName: row.workspaceName,
      creatorFocus: row.creatorFocus,
    },
    preferences: {
      defaultAspectRatio: (row.defaultAspectRatio as AspectRatioOption) || '9:16',
      defaultDuration: (row.defaultDuration as ClipDurationPreset) || 'auto',
      defaultCaptionStyle:
        (row.defaultCaptionStyle as CaptionStyleOption) || 'bold-dynamic',
      autoIncludeCaptions: Boolean(row.autoIncludeCaptions),
      emailAlertsOnCompletion: Boolean(row.emailAlertsOnCompletion),
    },
  };
}

function mapProjectRow(row: ApiProjectRow): VideoProject {
  return {
    id: row.id,
    videoId: row.videoId ?? undefined,
    name: row.name,
    fileName: row.fileName,
    mimeType: row.mimeType ?? undefined,
    fileSizeBytes: Number(row.fileSizeBytes) || 0,
    format: (row.format as 'MP4' | 'MOV' | 'WebM') || 'MP4',
    durationSeconds:
      typeof row.durationSeconds === 'number' ? row.durationSeconds : undefined,
    width: typeof row.width === 'number' ? row.width : undefined,
    height: typeof row.height === 'number' ? row.height : undefined,
    createdAt: row.createdAt,
    status: (row.status as ProjectStatus) || 'staged',
    settings: {
      duration: (row.clipDurationPreset as ClipDurationPreset) || 'auto',
      aspectRatio: (row.aspectRatio as AspectRatioOption) || '9:16',
      captionStyle: (row.captionStyle as CaptionStyleOption) || 'bold-dynamic',
      startTime: Number(row.startTime) || 0,
      endTime: Number(row.endTime) || 0,
    },
    thumbnailDataUrl: row.thumbnailDataUrl ?? undefined,
    clipsCount: Number(row.clipsCount) || 0,
  };
}

function mapClipRow(row: ApiClipRow): GeneratedClip {
  return {
    id: row.id,
    projectId: row.projectId,
    title: row.title,
    durationSeconds: row.durationSeconds,
    aspectRatio: (row.aspectRatio as AspectRatioOption) || '9:16',
    thumbnailUrl: row.thumbnailUrl ?? undefined,
    downloadUrl: row.downloadUrl ?? undefined,
    createdAt: row.createdAt,
  };
}

export async function fetchWorkspaceAccount(token: string) {
  const row = await requestJson<ApiUserRow>('/api/me', token);
  return mapUserRow(row);
}

export async function saveWorkspaceProfile(
  token: string,
  profile: WorkspaceProfile,
) {
  const row = await requestJson<ApiUserRow>('/api/me/profile', token, {
    method: 'PUT',
    body: JSON.stringify(profile),
  });
  return mapUserRow(row).profile;
}

export async function saveWorkspacePreferences(
  token: string,
  preferences: WorkspacePreferences,
) {
  const row = await requestJson<ApiUserRow>('/api/me/preferences', token, {
    method: 'PUT',
    body: JSON.stringify(preferences),
  });
  return mapUserRow(row).preferences;
}

export async function fetchProjects(token: string): Promise<VideoProject[]> {
  const rows = await requestJson<ApiProjectRow[]>('/api/projects', token);
  return rows.map(mapProjectRow);
}

export async function createRemoteProject(
  token: string,
  project: VideoProject,
): Promise<VideoProject> {
  const row = await requestJson<ApiProjectRow>('/api/projects', token, {
    method: 'POST',
    body: JSON.stringify({
      id: project.id,
      videoId: project.videoId,
      name: project.name,
      fileName: project.fileName,
      mimeType: project.mimeType,
      fileSizeBytes: project.fileSizeBytes,
      format: project.format,
      durationSeconds: project.durationSeconds,
      width: project.width,
      height: project.height,
      status: project.status,
      settings: project.settings,
      thumbnailDataUrl: project.thumbnailDataUrl,
    }),
  });
  return {
    ...mapProjectRow(row),
    previewUrl: project.previewUrl,
    sourceFile: project.sourceFile,
  };
}

export async function deleteRemoteProject(
  token: string,
  projectId: string,
): Promise<void> {
  await requestJson<{ deletedId: string }>(
    `/api/projects/${encodeURIComponent(projectId)}`,
    token,
    { method: 'DELETE' },
  );
}

export async function fetchClips(token: string): Promise<GeneratedClip[]> {
  const rows = await requestJson<ApiClipRow[]>('/api/clips', token);
  return rows.map(mapClipRow);
}

export async function fetchGuestSession(): Promise<GuestSessionState> {
  const response = await fetch('/api/guest/session', {
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error('Unable to initialize temporary guest session.');
  }
  return (await response.json()) as GuestSessionState;
}

export async function uploadGuestVideo(file: File): Promise<{
  upload: NonNullable<GuestSessionState['activeUpload']>;
  session: GuestSessionState;
}> {
  const formData = new FormData();
  formData.append('video', file);

  const response = await fetch('/api/guest/upload', {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      typeof body?.error === 'string'
        ? body.error
        : `Upload failed with status ${response.status}`,
    );
  }

  return (await response.json()) as {
    upload: NonNullable<GuestSessionState['activeUpload']>;
    session: GuestSessionState;
  };
}

export class AiProcessingError extends Error {
  readonly code?: string;
  readonly status: number;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export async function processGuestVideo(
  uploadId: string,
  settings: ClipSettings,
): Promise<{ uploadId: string; session: GuestSessionState }> {
  const response = await fetch('/api/guest/process', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uploadId, settings }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new AiProcessingError(
      typeof body?.error === 'string'
        ? body.error
        : `Processing failed with status ${response.status}`,
      response.status,
      typeof body?.code === 'string' ? body.code : undefined,
    );
  }

  return (await response.json()) as {
    uploadId: string;
    session: GuestSessionState;
  };
}

export async function claimGuestClips(
  token: string,
  settings: ClipSettings,
  clipIds?: string[],
): Promise<{
  project: VideoProject;
  clips: GeneratedClip[];
  session: GuestSessionState;
}> {
  const data = await requestJson<{
    project: ApiProjectRow;
    clips: ApiClipRow[];
    session: GuestSessionState;
  }>('/api/guest/claim', token, {
    method: 'POST',
    body: JSON.stringify({ settings, clipIds }),
  });

  return {
    project: mapProjectRow(data.project),
    clips: data.clips.map(mapClipRow),
    session: data.session,
  };
}

export async function downloadAuthenticatedMedia(
  url: string,
  token: string,
  fileName: string,
): Promise<void> {
  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      typeof body?.error === 'string'
        ? body.error
        : `Download failed with status ${response.status}`,
    );
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = `${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}.mp4`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
