import crypto from 'crypto';
import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  createProject,
  createProjectWithClips,
  deleteProjectById,
  getClipById,
  getProjectById,
  listClipsByProject,
  listClipsByUser,
  listProjectsByUser,
  updateProjectById,
} from './src/db/projects.ts';
import {
  getOrCreateUser,
  updateUserPreferences,
  updateUserProfile,
} from './src/db/users.ts';
import { requireAuth, type AuthRequest } from './src/middleware/auth.ts';
import { createRateLimiter } from './src/middleware/rateLimit.ts';
import {
  GUEST_MAX_DURATION_SECONDS,
  GUEST_MAX_FILE_BYTES,
  GUEST_MAX_PROCESS_RUNS,
  GUEST_MAX_UPLOADS,
  getAuthenticatedClipFilePath,
  getGuestClipsDir,
  getGuestDir,
  getGuestSourceDir,
  getOrCreateGuestSession,
  persistGuestSession,
  readExistingGuestSession,
  saveClipForAuthenticatedUser,
  serializeGuestSession,
} from './src/services/guestSession.ts';
import {
  AiPipelineNotConfiguredError,
  detectHighlightsWithGemini,
  extractThumbnailDataUrl,
  probeVideoFile,
  renderClipWithFfmpeg,
} from './src/services/videoProcessor.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 3000;

function streamVideoFile(
  req: express.Request,
  res: express.Response,
  filePath: string,
  options?: { downloadFilename?: string },
) {
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      error:
        'Clip media file is no longer in temporary server storage. Durable cloud object storage (GCS/S3) is required for permanent file hosting.',
    });
  }

  const stat = fs.statSync(filePath);
  const total = stat.size;

  if (options?.downloadFilename) {
    const safeName = options.downloadFilename.replace(/[^a-zA-Z0-9._-]/g, '_');
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Length', String(total));
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeName}"`,
    );
    return fs.createReadStream(filePath).pipe(res);
  }

  const range = req.headers.range;
  if (range) {
    const match = /^bytes=(\d+)-(\d*)$/.exec(range);
    if (!match) {
      return res.status(416).end();
    }
    const start = Number(match[1]);
    const end = match[2] ? Math.min(Number(match[2]), total - 1) : total - 1;
    if (start >= total || end < start) {
      res.setHeader('Content-Range', `bytes */${total}`);
      return res.status(416).end();
    }
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${total}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': String(end - start + 1),
      'Content-Type': 'video/mp4',
      'Cache-Control': 'private, no-store',
    });
    return fs.createReadStream(filePath, { start, end }).pipe(res);
  }

  res.writeHead(200, {
    'Content-Length': String(total),
    'Content-Type': 'video/mp4',
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'private, no-store',
  });
  return fs.createReadStream(filePath).pipe(res);
}

async function startServer() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '5mb' }));

  // Authenticated user profile & preferences
  app.get('/api/me', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      const email = req.user?.email ?? '';
      const name = typeof req.user?.name === 'string' ? req.user.name : undefined;
      if (!uid) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const user = await getOrCreateUser(uid, email, name);
      return res.json(user);
    } catch (error) {
      console.error('GET /api/me error:', error);
      const message =
        error instanceof Error ? error.message : 'Failed to load profile';
      return res.status(500).json({ error: message });
    }
  });

  app.put('/api/me/profile', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      const email = req.user?.email ?? '';
      if (!uid) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      await getOrCreateUser(uid, email);

      const { displayName, workspaceName, creatorFocus } = req.body ?? {};
      const updated = await updateUserProfile(uid, {
        displayName: String(displayName ?? '').trim() || 'Creator Workspace',
        workspaceName: String(workspaceName ?? '').trim() || 'ClipCon Studio',
        creatorFocus: String(creatorFocus ?? '').trim(),
      });
      return res.json(updated);
    } catch (error) {
      console.error('PUT /api/me/profile error:', error);
      const message =
        error instanceof Error ? error.message : 'Failed to update profile';
      return res.status(500).json({ error: message });
    }
  });

  app.put('/api/me/preferences', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      const email = req.user?.email ?? '';
      if (!uid) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      await getOrCreateUser(uid, email);

      const {
        defaultAspectRatio,
        defaultDuration,
        defaultCaptionStyle,
        autoIncludeCaptions,
        emailAlertsOnCompletion,
      } = req.body ?? {};

      const updated = await updateUserPreferences(uid, {
        defaultAspectRatio: String(defaultAspectRatio ?? '9:16'),
        defaultDuration: String(defaultDuration ?? 'auto'),
        defaultCaptionStyle: String(defaultCaptionStyle ?? 'bold-dynamic'),
        autoIncludeCaptions: Boolean(autoIncludeCaptions),
        emailAlertsOnCompletion: Boolean(emailAlertsOnCompletion),
      });
      return res.json(updated);
    } catch (error) {
      console.error('PUT /api/me/preferences error:', error);
      const message =
        error instanceof Error ? error.message : 'Failed to update preferences';
      return res.status(500).json({ error: message });
    }
  });

  // Projects & uploaded video metadata CRUD
  app.get('/api/projects', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      const email = req.user?.email ?? '';
      if (!uid) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      await getOrCreateUser(uid, email);
      const rows = await listProjectsByUser(uid);
      return res.json(rows);
    } catch (error) {
      console.error('GET /api/projects error:', error);
      const message =
        error instanceof Error ? error.message : 'Failed to fetch projects';
      return res.status(500).json({ error: message });
    }
  });

  app.get('/api/projects/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      if (!uid) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const projectId = String(req.params.id ?? '');
      const project = await getProjectById(projectId, uid);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      return res.json(project);
    } catch (error) {
      console.error('GET /api/projects/:id error:', error);
      const message =
        error instanceof Error ? error.message : 'Failed to fetch project';
      return res.status(500).json({ error: message });
    }
  });

  app.post('/api/projects', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      const email = req.user?.email ?? '';
      if (!uid) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      await getOrCreateUser(uid, email);

      const body = req.body ?? {};
      if (!body.id || !body.name || !body.fileName || !body.format) {
        return res.status(400).json({ error: 'Missing required project fields' });
      }

      const videoId =
        typeof body.videoId === 'string' && body.videoId.trim()
          ? body.videoId.trim()
          : `vid_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      const created = await createProject({
        id: String(body.id),
        videoId,
        userUid: uid,
        name: String(body.name),
        fileName: String(body.fileName),
        mimeType: String(body.mimeType || 'video/mp4'),
        fileSizeBytes: Number(body.fileSizeBytes) || 0,
        format: String(body.format),
        durationSeconds:
          typeof body.durationSeconds === 'number'
            ? body.durationSeconds
            : undefined,
        width: typeof body.width === 'number' ? body.width : undefined,
        height: typeof body.height === 'number' ? body.height : undefined,
        thumbnailDataUrl:
          typeof body.thumbnailDataUrl === 'string'
            ? body.thumbnailDataUrl
            : undefined,
        status: String(body.status ?? 'staged'),
        clipDurationPreset: String(body.settings?.duration ?? 'auto'),
        aspectRatio: String(body.settings?.aspectRatio ?? '9:16'),
        captionStyle: String(body.settings?.captionStyle ?? 'bold-dynamic'),
        startTime: Number(body.settings?.startTime) || 0,
        endTime: Number(body.settings?.endTime) || 0,
      });

      return res.status(201).json(created);
    } catch (error) {
      console.error('POST /api/projects error:', error);
      const message =
        error instanceof Error ? error.message : 'Failed to save project';
      return res.status(500).json({ error: message });
    }
  });

  app.patch('/api/projects/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      if (!uid) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const projectId = String(req.params.id ?? '');
      const body = req.body ?? {};
      const updated = await updateProjectById(projectId, uid, {
        ...(typeof body.name === 'string' ? { name: body.name.trim() } : {}),
        ...(typeof body.settings?.duration === 'string'
          ? { clipDurationPreset: body.settings.duration }
          : {}),
        ...(typeof body.settings?.aspectRatio === 'string'
          ? { aspectRatio: body.settings.aspectRatio }
          : {}),
        ...(typeof body.settings?.captionStyle === 'string'
          ? { captionStyle: body.settings.captionStyle }
          : {}),
        ...(typeof body.settings?.startTime === 'number'
          ? { startTime: body.settings.startTime }
          : {}),
        ...(typeof body.settings?.endTime === 'number'
          ? { endTime: body.settings.endTime }
          : {}),
      });
      if (!updated) {
        return res.status(404).json({ error: 'Project not found' });
      }
      return res.json(updated);
    } catch (error) {
      console.error('PATCH /api/projects/:id error:', error);
      const message =
        error instanceof Error ? error.message : 'Failed to update project';
      return res.status(500).json({ error: message });
    }
  });

  app.delete('/api/projects/:id', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      if (!uid) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const projectId = String(req.params.id ?? '');
      if (!projectId) {
        return res.status(400).json({ error: 'Project ID is required' });
      }
      const deleted = await deleteProjectById(projectId, uid);
      if (!deleted) {
        return res.status(404).json({ error: 'Project not found' });
      }
      return res.json({ deletedId: deleted.id });
    } catch (error) {
      console.error('DELETE /api/projects/:id error:', error);
      const message =
        error instanceof Error ? error.message : 'Failed to delete project';
      return res.status(500).json({ error: message });
    }
  });

  // Clips list (all user clips or scoped to a project)
  app.get('/api/clips', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      if (!uid) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const rows = await listClipsByUser(uid);
      return res.json(rows);
    } catch (error) {
      console.error('GET /api/clips error:', error);
      const message =
        error instanceof Error ? error.message : 'Failed to fetch clips';
      return res.status(500).json({ error: message });
    }
  });

  app.get('/api/projects/:id/clips', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      if (!uid) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      const projectId = String(req.params.id ?? '');
      const rows = await listClipsByProject(projectId, uid);
      return res.json(rows);
    } catch (error) {
      console.error('GET /api/projects/:id/clips error:', error);
      const message =
        error instanceof Error ? error.message : 'Failed to fetch project clips';
      return res.status(500).json({ error: message });
    }
  });

  // Authenticated clip playback & download (for clips saved to My Clips)
  app.get('/api/clips/:id/stream', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      if (!uid) return res.status(401).json({ error: 'Unauthorized' });
      const clipId = String(req.params.id ?? '');
      const clip = await getClipById(clipId, uid);
      if (!clip) return res.status(404).json({ error: 'Clip not found' });
      const filePath = getAuthenticatedClipFilePath(uid, clip.id);
      if (!filePath) {
        return res.status(404).json({
          error:
            'Clip media file is not available in temporary disk storage. Durable cloud storage is required across restarts.',
        });
      }
      return streamVideoFile(req, res, filePath);
    } catch (error) {
      console.error('GET /api/clips/:id/stream error:', error);
      return res.status(500).json({ error: 'Failed to stream clip' });
    }
  });

  app.get('/api/clips/:id/download', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      if (!uid) return res.status(401).json({ error: 'Unauthorized' });
      const clipId = String(req.params.id ?? '');
      const clip = await getClipById(clipId, uid);
      if (!clip) return res.status(404).json({ error: 'Clip not found' });
      const filePath = getAuthenticatedClipFilePath(uid, clip.id);
      if (!filePath) {
        return res.status(404).json({
          error:
            'Clip media file is not available in temporary disk storage. Durable cloud storage is required across restarts.',
        });
      }
      return streamVideoFile(req, res, filePath, {
        downloadFilename: `${clip.title || clip.id}.mp4`,
      });
    } catch (error) {
      console.error('GET /api/clips/:id/download error:', error);
      return res.status(500).json({ error: 'Failed to download clip' });
    }
  });

  // Guest session, temporary upload, AI processing, preview & sign-in claim flow
  const guestUploadLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 10,
    keyPrefix: 'guest-upload',
    getKeySuffix: (req) => readExistingGuestSession(req)?.guestId ?? 'new',
  });

  const guestProcessLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 10,
    keyPrefix: 'guest-process',
    getKeySuffix: (req) => readExistingGuestSession(req)?.guestId ?? 'new',
  });

  const guestUploadStorage = multer.diskStorage({
    destination: (req, _file, cb) => {
      const session = getOrCreateGuestSession(req, req.res);
      const sourceDir = getGuestSourceDir(session.guestId);
      fs.mkdirSync(sourceDir, { recursive: true });
      cb(null, sourceDir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const safeExt =
        ext === '.mov' || ext === '.webm' || ext === '.mp4' ? ext : '.mp4';
      cb(null, `up_${crypto.randomBytes(8).toString('hex')}${safeExt}`);
    },
  });

  const guestMulter = multer({
    storage: guestUploadStorage,
    limits: { fileSize: GUEST_MAX_FILE_BYTES, files: 1 },
    fileFilter: (_req, file, cb) => {
      const lower = file.originalname.toLowerCase();
      const allowedExt =
        lower.endsWith('.mp4') ||
        lower.endsWith('.mov') ||
        lower.endsWith('.webm');
      const allowedMime =
        file.mimetype === 'video/mp4' ||
        file.mimetype === 'video/quicktime' ||
        file.mimetype === 'video/webm' ||
        file.mimetype === 'application/octet-stream';
      if (!allowedExt || !allowedMime) {
        cb(new Error('Only MP4, MOV, and WebM video files are accepted.'));
        return;
      }
      cb(null, true);
    },
  });

  app.get('/api/guest/session', (req, res) => {
    const session = getOrCreateGuestSession(req, res);
    return res.json(serializeGuestSession(session));
  });

  app.post(
    '/api/guest/upload',
    guestUploadLimiter,
    (req, res, next) => {
      const session = getOrCreateGuestSession(req, res);
      if (session.uploadCount >= GUEST_MAX_UPLOADS) {
        return res.status(429).json({
          error: `Guest upload limit reached (${GUEST_MAX_UPLOADS} uploads per session). Sign in with Google or wait for your temporary session to reset.`,
        });
      }
      guestMulter.single('video')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({
              error: `Video exceeds the ${Math.round(GUEST_MAX_FILE_BYTES / (1024 * 1024))} MB guest upload limit.`,
            });
          }
          return res.status(400).json({ error: err.message });
        }
        if (err) {
          return res.status(400).json({
            error: err instanceof Error ? err.message : 'Invalid upload.',
          });
        }
        return next();
      });
    },
    async (req, res) => {
      const session = getOrCreateGuestSession(req, res);
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: 'No video file uploaded.' });
      }

      try {
        const probed = await probeVideoFile(file.path);
        if (probed.durationSeconds > GUEST_MAX_DURATION_SECONDS) {
          fs.rmSync(file.path, { force: true });
          return res.status(400).json({
            error: `Guest uploads are limited to ${Math.round(GUEST_MAX_DURATION_SECONDS / 60)} minutes maximum.`,
          });
        }

        const lower = file.originalname.toLowerCase();
        const format: 'MP4' | 'MOV' | 'WebM' = lower.endsWith('.mov')
          ? 'MOV'
          : lower.endsWith('.webm')
            ? 'WebM'
            : 'MP4';

        const uploadId = path.basename(file.filename, path.extname(file.filename));
        const tempDir = getGuestDir(session.guestId);
        const thumbnailDataUrl = await extractThumbnailDataUrl(
          file.path,
          Math.min(1, probed.durationSeconds / 4),
          tempDir,
        );

        // Keep at most 2 active uploads on disk for this guest session
        if (session.uploads.size >= 2) {
          const oldest = Array.from(session.uploads.values()).sort(
            (a, b) => a.createdAt - b.createdAt,
          )[0];
          if (oldest) {
            fs.rmSync(oldest.filePath, { force: true });
            session.uploads.delete(oldest.id);
          }
        }

        session.uploadCount += 1;
        const record = {
          id: uploadId,
          fileName: file.originalname,
          filePath: file.path,
          mimeType: file.mimetype || 'video/mp4',
          fileSizeBytes: file.size,
          format,
          durationSeconds: probed.durationSeconds,
          width: probed.width,
          height: probed.height,
          hasAudio: probed.hasAudio,
          thumbnailDataUrl,
          createdAt: Date.now(),
        };
        session.uploads.set(uploadId, record);
        persistGuestSession(session);

        return res.status(201).json({
          upload: {
            id: record.id,
            fileName: record.fileName,
            mimeType: record.mimeType,
            fileSizeBytes: record.fileSizeBytes,
            format: record.format,
            durationSeconds: record.durationSeconds,
            width: record.width,
            height: record.height,
            thumbnailDataUrl: record.thumbnailDataUrl,
          },
          session: serializeGuestSession(session),
        });
      } catch (error) {
        fs.rmSync(file.path, { force: true });
        return res.status(400).json({
          error:
            error instanceof Error
              ? error.message
              : 'Uploaded file could not be verified as a valid video.',
        });
      }
    },
  );

  app.post('/api/guest/process', guestProcessLimiter, async (req, res) => {
    const session = readExistingGuestSession(req);
    if (!session) {
      return res.status(400).json({
        error: 'Guest session expired or not found. Please upload your video again.',
      });
    }

    if (session.processCount >= GUEST_MAX_PROCESS_RUNS) {
      return res.status(429).json({
        error: `Guest processing limit reached (${GUEST_MAX_PROCESS_RUNS} runs per session). Sign in or wait for your session to reset.`,
      });
    }

    const body = req.body ?? {};
    const uploadId = String(body.uploadId ?? '').trim();
    const upload = session.uploads.get(uploadId);
    if (!upload || !fs.existsSync(upload.filePath)) {
      return res.status(404).json({
        error: 'Uploaded video was not found in temporary storage. Please upload again.',
      });
    }

    const rawAspect = String(body.settings?.aspectRatio ?? '9:16');
    const aspectRatio: '9:16' | '1:1' | '16:9' =
      rawAspect === '1:1' || rawAspect === '16:9' ? rawAspect : '9:16';
    const durationPreset = String(body.settings?.duration ?? 'auto');
    const captionStyle = String(body.settings?.captionStyle ?? 'bold-dynamic');
    const startTime = Number(body.settings?.startTime) || 0;
    const endTime = Number(body.settings?.endTime) || upload.durationSeconds;

    try {
      const highlights = await detectHighlightsWithGemini({
        sourcePath: upload.filePath,
        mimeType: upload.mimeType,
        durationSeconds: upload.durationSeconds,
        startTime,
        endTime,
        durationPreset,
        tempDir: getGuestDir(session.guestId),
      });

      const clipsDir = getGuestClipsDir(session.guestId);
      fs.mkdirSync(clipsDir, { recursive: true });

      const generatedClips = [];
      for (const highlight of highlights) {
        const clipId = `clip_${crypto.randomBytes(8).toString('hex')}`;
        const clipPath = path.join(clipsDir, `${clipId}.mp4`);
        const rendered = await renderClipWithFfmpeg({
          sourcePath: upload.filePath,
          outputPath: clipPath,
          startTime: highlight.startSeconds,
          endTime: highlight.endSeconds,
          aspectRatio,
          captionStyle,
          captions: highlight.captions,
          hasAudio: upload.hasAudio,
          tempDir: getGuestDir(session.guestId),
        });

        const clipRecord = {
          id: clipId,
          uploadId: upload.id,
          title: highlight.title,
          reason: highlight.reason,
          startTime: highlight.startSeconds,
          endTime: highlight.endSeconds,
          durationSeconds: rendered.durationSeconds,
          aspectRatio,
          captionStyle,
          filePath: clipPath,
          thumbnailDataUrl: rendered.thumbnailDataUrl,
          createdAt: new Date().toISOString(),
          claimed: false,
        };
        session.clips.set(clipId, clipRecord);
        generatedClips.push(clipRecord);
      }

      session.processCount += 1;
      persistGuestSession(session);
      return res.json({
        uploadId: upload.id,
        session: serializeGuestSession(session),
      });
    } catch (error) {
      if (error instanceof AiPipelineNotConfiguredError) {
        return res.status(503).json({
          code: error.code,
          error: error.message,
        });
      }
      console.error('POST /api/guest/process error:', error);
      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Video processing failed. Please try again.',
      });
    }
  });

  app.get('/api/guest/clips/:clipId/preview', (req, res) => {
    const session = readExistingGuestSession(req);
    if (!session) {
      return res.status(401).json({ error: 'Guest session expired or missing.' });
    }
    const clipId = String(req.params.clipId ?? '');
    const clip = session.clips.get(clipId);
    if (!clip) {
      return res.status(404).json({ error: 'Generated clip not found.' });
    }
    return streamVideoFile(req, res, clip.filePath);
  });

  app.get(
    '/api/guest/clips/:clipId/download',
    requireAuth,
    (req: AuthRequest, res) => {
      const session = readExistingGuestSession(req);
      if (!session) {
        return res
          .status(404)
          .json({ error: 'Temporary guest session has expired.' });
      }
      const clipId = String(req.params.clipId ?? '');
      const clip = session.clips.get(clipId);
      if (!clip) {
        return res.status(404).json({ error: 'Generated clip not found.' });
      }
      return streamVideoFile(req, res, clip.filePath, {
        downloadFilename: `${clip.title || clip.id}.mp4`,
      });
    },
  );

  app.post('/api/guest/claim', requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user?.uid;
      const email = req.user?.email ?? '';
      const name =
        typeof req.user?.name === 'string' ? req.user.name : undefined;
      if (!uid) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const session = readExistingGuestSession(req);
      if (!session) {
        return res.status(404).json({
          error: 'No active guest session found to claim.',
        });
      }

      const body = req.body ?? {};
      const requestedClipIds: string[] | null = Array.isArray(body.clipIds)
        ? body.clipIds.map((id: unknown) => String(id))
        : null;

      const availableClips = Array.from(session.clips.values()).filter(
        (clip) =>
          !clip.claimed &&
          fs.existsSync(clip.filePath) &&
          (!requestedClipIds || requestedClipIds.includes(clip.id)),
      );

      if (availableClips.length === 0) {
        return res.status(400).json({
          error: 'No unclaimed generated clips were found in your session.',
        });
      }

      const sourceUploadId = availableClips[0].uploadId;
      const upload = session.uploads.get(sourceUploadId);
      if (!upload) {
        return res.status(404).json({
          error: 'Source upload metadata for these clips has expired.',
        });
      }

      await getOrCreateUser(uid, email, name);

      const projectId = `proj_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      const videoId = `vid_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
      const cleanName =
        upload.fileName.replace(/\.(mp4|mov|webm)$/i, '') || upload.fileName;

      const clipInputs = availableClips.map((clip) => {
        saveClipForAuthenticatedUser(uid, clip.id, clip.filePath);
        return {
          id: clip.id,
          title: clip.title,
          startTime: clip.startTime,
          endTime: clip.endTime,
          durationSeconds: clip.durationSeconds,
          aspectRatio: clip.aspectRatio,
          thumbnailUrl: clip.thumbnailDataUrl,
          downloadUrl: `/api/clips/${encodeURIComponent(clip.id)}/download`,
        };
      });

      const saved = await createProjectWithClips(
        {
          id: projectId,
          videoId,
          userUid: uid,
          name: cleanName,
          fileName: upload.fileName,
          mimeType: upload.mimeType,
          fileSizeBytes: upload.fileSizeBytes,
          format: upload.format,
          durationSeconds: upload.durationSeconds,
          width: upload.width,
          height: upload.height,
          thumbnailDataUrl: upload.thumbnailDataUrl,
          status: 'completed',
          clipDurationPreset: String(body.settings?.duration ?? 'auto'),
          aspectRatio: availableClips[0].aspectRatio,
          captionStyle: availableClips[0].captionStyle,
          startTime: Number(body.settings?.startTime) || 0,
          endTime: Number(body.settings?.endTime) || upload.durationSeconds,
        },
        clipInputs,
      );

      for (const clip of availableClips) {
        clip.claimed = true;
      }
      persistGuestSession(session);

      return res.status(201).json({
        project: saved.project,
        clips: saved.clips,
        session: serializeGuestSession(session),
      });
    } catch (error) {
      console.error('POST /api/guest/claim error:', error);
      return res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : 'Failed to save clips to your account.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ClipCon server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
