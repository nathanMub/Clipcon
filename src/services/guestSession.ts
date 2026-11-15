import crypto from 'crypto';
import type { Request, Response } from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';

export const GUEST_COOKIE_NAME = 'cc_guest_sid';
export const GUEST_TTL_MS = 60 * 60 * 1000; // 60 minutes
export const GUEST_MAX_FILE_BYTES = 100 * 1024 * 1024; // 100 MB
export const GUEST_MAX_DURATION_SECONDS = 15 * 60; // 15 minutes
export const GUEST_MAX_UPLOADS = 3;
export const GUEST_MAX_PROCESS_RUNS = 3;

export const GUEST_TEMP_ROOT = path.join(os.tmpdir(), 'clipcon-guest');
export const USER_CLIPS_ROOT = path.join(os.tmpdir(), 'clipcon-user-clips');

const GUEST_SECRET_FILE = path.join(GUEST_TEMP_ROOT, '.session-secret');
let cachedFallbackSecret: string | null = null;

function getSigningSecret(): string {
  const configured = process.env.GUEST_SESSION_SECRET?.trim();
  if (configured) return configured;

  if (cachedFallbackSecret) return cachedFallbackSecret;

  // Derive a deterministic server-only signing key when shared environment secrets exist
  // so multiple instances / restarts verify the same HMAC cookies without exposing secrets.
  const envSeedParts = [
    process.env.SQL_PASSWORD?.trim() || '',
    process.env.SQL_HOST?.trim() || '',
    process.env.GEMINI_API_KEY?.trim() || '',
    process.env.FIREBASE_PROJECT_ID?.trim() || '',
  ].filter(Boolean);

  if (envSeedParts.length > 0) {
    cachedFallbackSecret = crypto
      .createHmac('sha256', 'clipcon-guest-session-v1')
      .update(envSeedParts.join('|'))
      .digest('hex');
    return cachedFallbackSecret;
  }

  // Fallback for local single-host runs without env secrets: persist key on temp root
  try {
    ensureDir(GUEST_TEMP_ROOT);
    if (fs.existsSync(GUEST_SECRET_FILE)) {
      const existing = fs.readFileSync(GUEST_SECRET_FILE, 'utf8').trim();
      if (/^[a-f0-9]{64}$/.test(existing)) {
        cachedFallbackSecret = existing;
        return existing;
      }
    }
    const generated = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(GUEST_SECRET_FILE, generated, { mode: 0o600 });
    cachedFallbackSecret = generated;
    return generated;
  } catch {
    cachedFallbackSecret = crypto.randomBytes(32).toString('hex');
    return cachedFallbackSecret;
  }
}

export interface GuestUploadRecord {
  id: string;
  fileName: string;
  filePath: string;
  mimeType: string;
  fileSizeBytes: number;
  format: 'MP4' | 'MOV' | 'WebM';
  durationSeconds: number;
  width?: number;
  height?: number;
  hasAudio: boolean;
  thumbnailDataUrl?: string;
  createdAt: number;
}

export interface GuestClipRecord {
  id: string;
  uploadId: string;
  title: string;
  reason?: string;
  startTime: number;
  endTime: number;
  durationSeconds: number;
  aspectRatio: '9:16' | '1:1' | '16:9';
  captionStyle: string;
  filePath: string;
  thumbnailDataUrl?: string;
  createdAt: string;
  claimed?: boolean;
}

export interface GuestSessionRecord {
  guestId: string;
  createdAt: number;
  expiresAt: number;
  uploadCount: number;
  processCount: number;
  uploads: Map<string, GuestUploadRecord>;
  clips: Map<string, GuestClipRecord>;
}

interface SerializedSessionDisk {
  guestId: string;
  createdAt: number;
  expiresAt: number;
  uploadCount: number;
  processCount: number;
  uploads: GuestUploadRecord[];
  clips: GuestClipRecord[];
}

const guestSessions = new Map<string, GuestSessionRecord>();
const requestSessionCache = new WeakMap<Request, GuestSessionRecord>();

function ensureDir(dirPath: string) {
  fs.mkdirSync(dirPath, { recursive: true });
}

ensureDir(GUEST_TEMP_ROOT);
ensureDir(USER_CLIPS_ROOT);

function signGuestId(guestId: string): string {
  const sig = crypto
    .createHmac('sha256', getSigningSecret())
    .update(guestId)
    .digest('hex');
  return `${guestId}.${sig}`;
}

function verifySignedToken(raw: string): string | null {
  const dotIdx = raw.lastIndexOf('.');
  if (dotIdx <= 0) return null;
  const guestId = raw.slice(0, dotIdx);
  const sig = raw.slice(dotIdx + 1);
  if (!/^guest_[a-f0-9]{24}$/.test(guestId) || !/^[a-f0-9]{64}$/.test(sig)) {
    return null;
  }
  const expected = crypto
    .createHmac('sha256', getSigningSecret())
    .update(guestId)
    .digest('hex');
  const sigBuf = Buffer.from(sig, 'hex');
  const expBuf = Buffer.from(expected, 'hex');
  if (sigBuf.length !== expBuf.length) return null;
  if (!crypto.timingSafeEqual(sigBuf, expBuf)) return null;
  return guestId;
}

function parseCookies(req: Request): Record<string, string> {
  const header = req.headers.cookie;
  if (!header) return {};
  const result: Record<string, string> = {};
  for (const part of header.split(';')) {
    const eqIdx = part.indexOf('=');
    if (eqIdx <= 0) continue;
    const key = part.slice(0, eqIdx).trim();
    const val = part.slice(eqIdx + 1).trim();
    try {
      result[key] = decodeURIComponent(val);
    } catch {
      result[key] = val;
    }
  }
  return result;
}

function isHttpsRequest(req: Request): boolean {
  if (req.secure) return true;
  const forwardedProto = req.headers['x-forwarded-proto'];
  if (typeof forwardedProto === 'string') {
    const first = forwardedProto.split(',')[0].trim().toLowerCase();
    if (first === 'https') return true;
  } else if (
    Array.isArray(forwardedProto) &&
    forwardedProto[0]?.toLowerCase() === 'https'
  ) {
    return true;
  }
  const origin = req.headers.origin;
  if (typeof origin === 'string' && origin.startsWith('https://')) {
    return true;
  }
  const referer = req.headers.referer;
  if (typeof referer === 'string' && referer.startsWith('https://')) {
    return true;
  }
  return false;
}

function setGuestSessionCookie(req: Request, res: Response, guestId: string) {
  if (res.headersSent) return;
  const signed = signGuestId(guestId);
  const https = isHttpsRequest(req);
  // Cross-site iframe contexts (e.g. AI Studio preview on HTTPS) require SameSite=None; Secure
  // so cookies are accepted and sent on POST /api/guest/upload, /api/guest/process, and <video>.
  res.cookie(GUEST_COOKIE_NAME, signed, {
    httpOnly: true,
    sameSite: https ? 'none' : 'lax',
    secure: https,
    maxAge: GUEST_TTL_MS,
    path: '/',
  });
}

export function getGuestDir(guestId: string): string {
  return path.join(GUEST_TEMP_ROOT, guestId);
}

export function getGuestSourceDir(guestId: string): string {
  return path.join(getGuestDir(guestId), 'source');
}

export function getGuestClipsDir(guestId: string): string {
  return path.join(getGuestDir(guestId), 'clips');
}

function getGuestSessionMetaPath(guestId: string): string {
  return path.join(getGuestDir(guestId), 'session.json');
}

export function persistGuestSession(session: GuestSessionRecord) {
  try {
    ensureDir(getGuestDir(session.guestId));
    const payload: SerializedSessionDisk = {
      guestId: session.guestId,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      uploadCount: session.uploadCount,
      processCount: session.processCount,
      uploads: Array.from(session.uploads.values()),
      clips: Array.from(session.clips.values()),
    };
    const metaPath = getGuestSessionMetaPath(session.guestId);
    const tmpPath = `${metaPath}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(payload), 'utf8');
    fs.renameSync(tmpPath, metaPath);
  } catch (error) {
    console.error('Failed to persist guest session metadata:', error);
  }
}

function loadGuestSession(guestId: string): GuestSessionRecord | null {
  const now = Date.now();
  const inMemory = guestSessions.get(guestId);
  if (inMemory) {
    if (inMemory.expiresAt > now) {
      return inMemory;
    }
    guestSessions.delete(guestId);
    removeGuestFiles(guestId);
    return null;
  }

  const metaPath = getGuestSessionMetaPath(guestId);
  if (!fs.existsSync(metaPath)) return null;

  try {
    const raw = fs.readFileSync(metaPath, 'utf8');
    const parsed = JSON.parse(raw) as SerializedSessionDisk;
    if (
      !parsed ||
      parsed.guestId !== guestId ||
      typeof parsed.expiresAt !== 'number' ||
      parsed.expiresAt <= now
    ) {
      removeGuestFiles(guestId);
      return null;
    }

    const hydrated: GuestSessionRecord = {
      guestId: parsed.guestId,
      createdAt: Number(parsed.createdAt) || now,
      expiresAt: parsed.expiresAt,
      uploadCount: Number(parsed.uploadCount) || 0,
      processCount: Number(parsed.processCount) || 0,
      uploads: new Map(
        (Array.isArray(parsed.uploads) ? parsed.uploads : []).map((u) => [
          u.id,
          u,
        ]),
      ),
      clips: new Map(
        (Array.isArray(parsed.clips) ? parsed.clips : []).map((c) => [c.id, c]),
      ),
    };
    guestSessions.set(guestId, hydrated);
    return hydrated;
  } catch {
    return null;
  }
}

export function removeGuestFiles(guestId: string) {
  const dir = getGuestDir(guestId);
  fs.rmSync(dir, { recursive: true, force: true });
}

export function getOrCreateGuestSession(
  req: Request,
  res?: Response,
): GuestSessionRecord {
  const cached = requestSessionCache.get(req);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    if (res) {
      setGuestSessionCookie(req, res, cached.guestId);
    }
    return cached;
  }

  const cookies = parseCookies(req);
  const rawCookie = cookies[GUEST_COOKIE_NAME];
  const existingId = rawCookie ? verifySignedToken(rawCookie) : null;

  if (existingId) {
    const existing = loadGuestSession(existingId);
    if (existing) {
      requestSessionCache.set(req, existing);
      if (res) {
        setGuestSessionCookie(req, res, existing.guestId);
      }
      return existing;
    }
  }

  const guestId = `guest_${crypto.randomBytes(12).toString('hex')}`;
  const session: GuestSessionRecord = {
    guestId,
    createdAt: now,
    expiresAt: now + GUEST_TTL_MS,
    uploadCount: 0,
    processCount: 0,
    uploads: new Map(),
    clips: new Map(),
  };

  guestSessions.set(guestId, session);
  ensureDir(getGuestSourceDir(guestId));
  ensureDir(getGuestClipsDir(guestId));
  persistGuestSession(session);
  requestSessionCache.set(req, session);

  if (res) {
    setGuestSessionCookie(req, res, guestId);
  }

  return session;
}

export function readExistingGuestSession(
  req: Request,
): GuestSessionRecord | null {
  const cached = requestSessionCache.get(req);
  if (cached && cached.expiresAt > Date.now()) {
    return cached;
  }

  const cookies = parseCookies(req);
  const rawCookie = cookies[GUEST_COOKIE_NAME];
  if (!rawCookie) return null;
  const guestId = verifySignedToken(rawCookie);
  if (!guestId) return null;
  const session = loadGuestSession(guestId);
  if (!session) return null;
  requestSessionCache.set(req, session);
  return session;
}

export function serializeGuestSession(session: GuestSessionRecord) {
  const uploads = Array.from(session.uploads.values()).sort(
    (a, b) => b.createdAt - a.createdAt,
  );
  const latestUpload = uploads[0] ?? null;
  const clips = Array.from(session.clips.values())
    .filter((clip) => fs.existsSync(clip.filePath))
    .map((clip) => ({
      id: clip.id,
      uploadId: clip.uploadId,
      title: clip.title,
      reason: clip.reason,
      startTime: clip.startTime,
      endTime: clip.endTime,
      durationSeconds: clip.durationSeconds,
      aspectRatio: clip.aspectRatio,
      captionStyle: clip.captionStyle,
      previewUrl: `/api/guest/clips/${encodeURIComponent(clip.id)}/preview`,
      thumbnailUrl: clip.thumbnailDataUrl,
      createdAt: clip.createdAt,
      claimed: Boolean(clip.claimed),
    }));

  return {
    guestId: session.guestId,
    expiresAt: new Date(session.expiresAt).toISOString(),
    limits: {
      maxFileBytes: GUEST_MAX_FILE_BYTES,
      maxDurationSeconds: GUEST_MAX_DURATION_SECONDS,
      maxUploads: GUEST_MAX_UPLOADS,
      maxProcessRuns: GUEST_MAX_PROCESS_RUNS,
    },
    usage: {
      uploadsUsed: session.uploadCount,
      processRunsUsed: session.processCount,
    },
    activeUpload: latestUpload
      ? {
          id: latestUpload.id,
          fileName: latestUpload.fileName,
          mimeType: latestUpload.mimeType,
          fileSizeBytes: latestUpload.fileSizeBytes,
          format: latestUpload.format,
          durationSeconds: latestUpload.durationSeconds,
          width: latestUpload.width,
          height: latestUpload.height,
          thumbnailDataUrl: latestUpload.thumbnailDataUrl,
        }
      : null,
    clips,
    aiConfigured: Boolean(process.env.GEMINI_API_KEY?.trim()),
  };
}

export function saveClipForAuthenticatedUser(
  userUid: string,
  clipId: string,
  sourceClipPath: string,
): string {
  const safeUid = userUid.replace(/[^a-zA-Z0-9_-]/g, '_');
  const userDir = path.join(USER_CLIPS_ROOT, safeUid);
  ensureDir(userDir);
  const destPath = path.join(userDir, `${clipId}.mp4`);
  fs.copyFileSync(sourceClipPath, destPath);
  return destPath;
}

export function getAuthenticatedClipFilePath(
  userUid: string,
  clipId: string,
): string | null {
  const safeUid = userUid.replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeClipId = clipId.replace(/[^a-zA-Z0-9_-]/g, '');
  if (!safeClipId) return null;
  const candidate = path.join(USER_CLIPS_ROOT, safeUid, `${safeClipId}.mp4`);
  return fs.existsSync(candidate) ? candidate : null;
}

export function cleanupExpiredGuestData() {
  const now = Date.now();
  for (const [guestId, session] of guestSessions.entries()) {
    if (session.expiresAt <= now) {
      guestSessions.delete(guestId);
      removeGuestFiles(guestId);
    }
  }

  // Sweep expired or orphaned folders from disk (e.g. from previous server runs)
  try {
    const entries = fs.readdirSync(GUEST_TEMP_ROOT, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (guestSessions.has(entry.name)) continue;
      const fullPath = path.join(GUEST_TEMP_ROOT, entry.name);
      const metaPath = path.join(fullPath, 'session.json');
      if (fs.existsSync(metaPath)) {
        try {
          const parsed = JSON.parse(fs.readFileSync(metaPath, 'utf8')) as {
            expiresAt?: number;
          };
          if (typeof parsed.expiresAt === 'number' && parsed.expiresAt > now) {
            continue;
          }
        } catch {
          // Corrupted metadata falls back to mtime check below
        }
      }
      const stat = fs.statSync(fullPath);
      if (now - stat.mtimeMs > GUEST_TTL_MS || fs.existsSync(metaPath)) {
        fs.rmSync(fullPath, { recursive: true, force: true });
      }
    }
  } catch {
    // Ignore sweep errors if temp root doesn't exist yet
  }
}

// Run startup sweep and periodic 5-minute cleanup
cleanupExpiredGuestData();
setInterval(cleanupExpiredGuestData, 5 * 60 * 1000).unref();
