import { and, desc, eq } from 'drizzle-orm';
import { db } from './index.ts';
import { clips, projects, uploadedVideos } from './schema.ts';

export interface CreateProjectWithVideoInput {
  id: string;
  videoId: string;
  userUid: string;
  name: string;
  fileName: string;
  mimeType: string;
  fileSizeBytes: number;
  format: string;
  durationSeconds?: number;
  width?: number;
  height?: number;
  thumbnailDataUrl?: string;
  status: string;
  clipDurationPreset: string;
  aspectRatio: string;
  captionStyle: string;
  startTime: number;
  endTime: number;
}

export interface UpdateProjectInput {
  name?: string;
  clipDurationPreset?: string;
  aspectRatio?: string;
  captionStyle?: string;
  startTime?: number;
  endTime?: number;
}

const projectWithVideoSelection = {
  id: projects.id,
  videoId: uploadedVideos.id,
  userUid: projects.userUid,
  name: projects.name,
  status: projects.status,
  clipDurationPreset: projects.clipDurationPreset,
  aspectRatio: projects.aspectRatio,
  captionStyle: projects.captionStyle,
  startTime: projects.startTime,
  endTime: projects.endTime,
  clipsCount: projects.clipsCount,
  createdAt: projects.createdAt,
  fileName: projects.fileName,
  mimeType: uploadedVideos.mimeType,
  fileSizeBytes: projects.fileSizeBytes,
  format: projects.format,
  durationSeconds: projects.durationSeconds,
  width: uploadedVideos.width,
  height: uploadedVideos.height,
  thumbnailDataUrl: projects.thumbnailDataUrl,
  storageKey: uploadedVideos.storageKey,
};

export async function listProjectsByUser(userUid: string) {
  try {
    return await db
      .select(projectWithVideoSelection)
      .from(projects)
      .leftJoin(uploadedVideos, eq(uploadedVideos.projectId, projects.id))
      .where(eq(projects.userUid, userUid))
      .orderBy(desc(projects.createdAt));
  } catch (error) {
    console.error('Database query failed in listProjectsByUser:', error);
    throw new Error('Failed to fetch projects. Please try again later.', {
      cause: error,
    });
  }
}

export async function getProjectById(projectId: string, userUid: string) {
  try {
    const rows = await db
      .select(projectWithVideoSelection)
      .from(projects)
      .leftJoin(uploadedVideos, eq(uploadedVideos.projectId, projects.id))
      .where(and(eq(projects.id, projectId), eq(projects.userUid, userUid)));

    return rows[0] ?? null;
  } catch (error) {
    console.error('Database query failed in getProjectById:', error);
    throw new Error('Failed to fetch project. Please try again later.', {
      cause: error,
    });
  }
}

export async function createProject(input: CreateProjectWithVideoInput) {
  try {
    return await db.transaction(async (tx) => {
      const [insertedProject] = await tx
        .insert(projects)
        .values({
          id: input.id,
          userUid: input.userUid,
          name: input.name,
          fileName: input.fileName,
          fileSizeBytes: input.fileSizeBytes,
          format: input.format,
          durationSeconds: input.durationSeconds ?? null,
          status: input.status,
          clipDurationPreset: input.clipDurationPreset,
          aspectRatio: input.aspectRatio,
          captionStyle: input.captionStyle,
          startTime: input.startTime,
          endTime: input.endTime,
          thumbnailDataUrl: input.thumbnailDataUrl ?? null,
          clipsCount: 0,
        })
        .returning();

      const [insertedVideo] = await tx
        .insert(uploadedVideos)
        .values({
          id: input.videoId,
          projectId: insertedProject.id,
          userUid: input.userUid,
          fileName: input.fileName,
          mimeType: input.mimeType,
          fileSizeBytes: input.fileSizeBytes,
          format: input.format,
          durationSeconds: input.durationSeconds ?? null,
          width: input.width ?? null,
          height: input.height ?? null,
          thumbnailDataUrl: input.thumbnailDataUrl ?? null,
        })
        .returning();

      return {
        ...insertedProject,
        videoId: insertedVideo.id,
        mimeType: insertedVideo.mimeType,
        width: insertedVideo.width,
        height: insertedVideo.height,
        storageKey: insertedVideo.storageKey,
      };
    });
  } catch (error) {
    console.error('Database query failed in createProject:', error);
    throw new Error('Failed to save project. Please try again later.', {
      cause: error,
    });
  }
}

export async function updateProjectById(
  projectId: string,
  userUid: string,
  input: UpdateProjectInput,
) {
  try {
    const [updated] = await db
      .update(projects)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.clipDurationPreset !== undefined
          ? { clipDurationPreset: input.clipDurationPreset }
          : {}),
        ...(input.aspectRatio !== undefined
          ? { aspectRatio: input.aspectRatio }
          : {}),
        ...(input.captionStyle !== undefined
          ? { captionStyle: input.captionStyle }
          : {}),
        ...(input.startTime !== undefined ? { startTime: input.startTime } : {}),
        ...(input.endTime !== undefined ? { endTime: input.endTime } : {}),
      })
      .where(and(eq(projects.id, projectId), eq(projects.userUid, userUid)))
      .returning();

    if (!updated) return null;
    return await getProjectById(updated.id, userUid);
  } catch (error) {
    console.error('Database query failed in updateProjectById:', error);
    throw new Error('Failed to update project. Please try again later.', {
      cause: error,
    });
  }
}

export async function deleteProjectById(projectId: string, userUid: string) {
  try {
    const [deletedProject] = await db
      .delete(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userUid, userUid)))
      .returning({ id: projects.id });

    return deletedProject ?? null;
  } catch (error) {
    console.error('Database query failed in deleteProjectById:', error);
    throw new Error('Failed to delete project. Please try again later.', {
      cause: error,
    });
  }
}

export async function listClipsByUser(userUid: string) {
  try {
    return await db
      .select()
      .from(clips)
      .where(eq(clips.userUid, userUid))
      .orderBy(desc(clips.createdAt));
  } catch (error) {
    console.error('Database query failed in listClipsByUser:', error);
    throw new Error('Failed to fetch clips. Please try again later.', {
      cause: error,
    });
  }
}

export async function listClipsByProject(projectId: string, userUid: string) {
  try {
    return await db
      .select()
      .from(clips)
      .where(and(eq(clips.projectId, projectId), eq(clips.userUid, userUid)))
      .orderBy(desc(clips.createdAt));
  } catch (error) {
    console.error('Database query failed in listClipsByProject:', error);
    throw new Error('Failed to fetch project clips. Please try again later.', {
      cause: error,
    });
  }
}

export async function getClipById(clipId: string, userUid: string) {
  try {
    const rows = await db
      .select()
      .from(clips)
      .where(and(eq(clips.id, clipId), eq(clips.userUid, userUid)));
    return rows[0] ?? null;
  } catch (error) {
    console.error('Database query failed in getClipById:', error);
    throw new Error('Failed to fetch clip. Please try again later.', {
      cause: error,
    });
  }
}

export interface CreateClipInput {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  durationSeconds: number;
  aspectRatio: string;
  thumbnailUrl?: string;
  downloadUrl?: string;
}

export async function createProjectWithClips(
  projectInput: CreateProjectWithVideoInput,
  clipInputs: CreateClipInput[],
) {
  try {
    return await db.transaction(async (tx) => {
      const [insertedProject] = await tx
        .insert(projects)
        .values({
          id: projectInput.id,
          userUid: projectInput.userUid,
          name: projectInput.name,
          fileName: projectInput.fileName,
          fileSizeBytes: projectInput.fileSizeBytes,
          format: projectInput.format,
          durationSeconds: projectInput.durationSeconds ?? null,
          status: projectInput.status,
          clipDurationPreset: projectInput.clipDurationPreset,
          aspectRatio: projectInput.aspectRatio,
          captionStyle: projectInput.captionStyle,
          startTime: projectInput.startTime,
          endTime: projectInput.endTime,
          thumbnailDataUrl: projectInput.thumbnailDataUrl ?? null,
          clipsCount: clipInputs.length,
        })
        .returning();

      const [insertedVideo] = await tx
        .insert(uploadedVideos)
        .values({
          id: projectInput.videoId,
          projectId: insertedProject.id,
          userUid: projectInput.userUid,
          fileName: projectInput.fileName,
          mimeType: projectInput.mimeType,
          fileSizeBytes: projectInput.fileSizeBytes,
          format: projectInput.format,
          durationSeconds: projectInput.durationSeconds ?? null,
          width: projectInput.width ?? null,
          height: projectInput.height ?? null,
          thumbnailDataUrl: projectInput.thumbnailDataUrl ?? null,
        })
        .returning();

      const insertedClips =
        clipInputs.length > 0
          ? await tx
              .insert(clips)
              .values(
                clipInputs.map((clip) => ({
                  id: clip.id,
                  projectId: insertedProject.id,
                  userUid: projectInput.userUid,
                  title: clip.title,
                  startTime: clip.startTime,
                  endTime: clip.endTime,
                  durationSeconds: clip.durationSeconds,
                  aspectRatio: clip.aspectRatio,
                  thumbnailUrl: clip.thumbnailUrl ?? null,
                  downloadUrl: clip.downloadUrl ?? null,
                })),
              )
              .returning()
          : [];

      return {
        project: {
          ...insertedProject,
          videoId: insertedVideo.id,
          mimeType: insertedVideo.mimeType,
          width: insertedVideo.width,
          height: insertedVideo.height,
          storageKey: insertedVideo.storageKey,
        },
        clips: insertedClips,
      };
    });
  } catch (error) {
    console.error('Database query failed in createProjectWithClips:', error);
    throw new Error('Failed to save project and clips. Please try again later.', {
      cause: error,
    });
  }
}
