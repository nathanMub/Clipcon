import { GoogleGenAI, Type } from '@google/genai';
import { execFile } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export class AiPipelineNotConfiguredError extends Error {
  readonly code = 'AI_PIPELINE_NOT_CONFIGURED';
  constructor(message: string) {
    super(message);
    this.name = 'AiPipelineNotConfiguredError';
  }
}

export interface ProbedVideoInfo {
  durationSeconds: number;
  width?: number;
  height?: number;
  hasAudio: boolean;
}

export interface CaptionLine {
  startOffset: number;
  endOffset: number;
  text: string;
}

export interface DetectedHighlight {
  title: string;
  startSeconds: number;
  endSeconds: number;
  reason: string;
  captions: CaptionLine[];
}

export async function probeVideoFile(filePath: string): Promise<ProbedVideoInfo> {
  let stdout = '';
  try {
    const res = await execFileAsync('ffprobe', [
      '-v',
      'error',
      '-print_format',
      'json',
      '-show_format',
      '-show_streams',
      filePath,
    ]);
    stdout = res.stdout;
  } catch {
    throw new Error('Uploaded file could not be decoded as a valid video.');
  }

  const parsed = JSON.parse(stdout) as {
    format?: { duration?: string };
    streams?: Array<{
      codec_type?: string;
      width?: number;
      height?: number;
      duration?: string;
    }>;
  };

  const streams = parsed.streams ?? [];
  const videoStream = streams.find((s) => s.codec_type === 'video');
  if (!videoStream) {
    throw new Error('Uploaded file does not contain a valid video stream.');
  }

  const hasAudio = streams.some((s) => s.codec_type === 'audio');
  const rawDuration = Number(
    parsed.format?.duration ?? videoStream.duration ?? '0',
  );
  if (!Number.isFinite(rawDuration) || rawDuration <= 0) {
    throw new Error('Could not read a valid video duration from the file.');
  }

  return {
    durationSeconds: Math.round(rawDuration * 10) / 10,
    width: typeof videoStream.width === 'number' ? videoStream.width : undefined,
    height: typeof videoStream.height === 'number' ? videoStream.height : undefined,
    hasAudio,
  };
}

export async function extractThumbnailDataUrl(
  videoPath: string,
  seekSeconds: number,
  tempDir: string,
): Promise<string | undefined> {
  const thumbPath = path.join(
    tempDir,
    `thumb_${crypto.randomBytes(6).toString('hex')}.jpg`,
  );
  try {
    await execFileAsync('ffmpeg', [
      '-y',
      '-ss',
      String(Math.max(0, seekSeconds)),
      '-i',
      videoPath,
      '-frames:v',
      '1',
      '-vf',
      'scale=480:-2',
      '-q:v',
      '4',
      thumbPath,
    ]);
    if (!fs.existsSync(thumbPath)) return undefined;
    const bytes = fs.readFileSync(thumbPath);
    return `data:image/jpeg;base64,${bytes.toString('base64')}`;
  } catch {
    return undefined;
  } finally {
    fs.rmSync(thumbPath, { force: true });
  }
}

function getTargetRangeText(durationPreset: string): string {
  switch (durationPreset) {
    case '15-30':
      return '15 to 30 seconds';
    case '30-60':
      return '30 to 60 seconds';
    case '60-90':
      return '60 to 90 seconds';
    default:
      return '15 to 60 seconds';
  }
}

export async function detectHighlightsWithGemini(params: {
  sourcePath: string;
  mimeType: string;
  durationSeconds: number;
  startTime: number;
  endTime: number;
  durationPreset: string;
  tempDir: string;
}): Promise<DetectedHighlight[]> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new AiPipelineNotConfiguredError(
      'Real AI highlight detection requires GEMINI_API_KEY to be configured on the server. Your video upload and FFmpeg clipping are ready, but AI moment detection cannot run until an API key is configured.',
    );
  }

  const windowStart = Math.max(0, Math.min(params.startTime, params.durationSeconds));
  const windowEnd =
    params.endTime > windowStart && params.endTime <= params.durationSeconds
      ? params.endTime
      : params.durationSeconds;

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  // Upload trimmed analysis window if user narrowed the range significantly, else source
  let analysisPath = params.sourcePath;
  let analysisMime = params.mimeType || 'video/mp4';
  let tempWindowPath: string | null = null;
  let offsetShift = 0;

  if (windowStart > 1 || windowEnd < params.durationSeconds - 1) {
    tempWindowPath = path.join(
      params.tempDir,
      `window_${crypto.randomBytes(6).toString('hex')}.mp4`,
    );
    await execFileAsync('ffmpeg', [
      '-y',
      '-ss',
      String(windowStart),
      '-to',
      String(windowEnd),
      '-i',
      params.sourcePath,
      '-c:v',
      'libx264',
      '-preset',
      'ultrafast',
      '-crf',
      '28',
      '-c:a',
      'aac',
      '-b:a',
      '96k',
      tempWindowPath,
    ]);
    analysisPath = tempWindowPath;
    analysisMime = 'video/mp4';
    offsetShift = windowStart;
  }

  const windowLength = Math.max(1, windowEnd - windowStart);
  let uploadedFileName: string | undefined;

  try {
    const uploaded = await ai.files.upload({
      file: analysisPath,
      config: { mimeType: analysisMime },
    });
    uploadedFileName = uploaded.name;

    let fileState = uploaded.state;
    let attempts = 0;
    while (fileState === 'PROCESSING' && attempts < 45) {
      await new Promise((r) => setTimeout(r, 2000));
      const check = await ai.files.get({ name: uploaded.name! });
      fileState = check.state;
      attempts++;
    }

    if (fileState !== 'ACTIVE') {
      throw new Error('Uploaded video did not finish indexing for AI analysis.');
    }

    const prompt = [
      `Analyze this video (duration ${windowLength.toFixed(1)} seconds) and select 1 to 3 of the strongest self-contained short-form highlight clips.`,
      `Target clip length: ${getTargetRangeText(params.durationPreset)} (if the video is shorter than the target length, select the strongest segment within 0 to ${windowLength.toFixed(1)} seconds).`,
      `Every startSeconds and endSeconds MUST be strictly within [0, ${windowLength.toFixed(1)}] with endSeconds > startSeconds + 2.`,
      `Provide concise engaging titles, why each moment works, and short caption lines with startOffset/endOffset relative to the start of that clip (0 to clipDuration).`,
    ].join('\n');

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: [
        {
          fileData: {
            fileUri: uploaded.uri,
            mimeType: uploaded.mimeType ?? analysisMime,
          },
        },
        { text: prompt },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              startSeconds: { type: Type.NUMBER },
              endSeconds: { type: Type.NUMBER },
              reason: { type: Type.STRING },
              captions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    startOffset: { type: Type.NUMBER },
                    endOffset: { type: Type.NUMBER },
                    text: { type: Type.STRING },
                  },
                },
              },
            },
          },
        },
      },
    });

    const rawJson = (response.text ?? '[]').trim();
    const parsed = JSON.parse(rawJson) as Array<{
      title?: string;
      startSeconds?: number;
      endSeconds?: number;
      reason?: string;
      captions?: Array<{ startOffset?: number; endOffset?: number; text?: string }>;
    }>;

    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error('AI analysis returned no valid clip segments.');
    }

    const sanitized: DetectedHighlight[] = [];
    for (const item of parsed.slice(0, 3)) {
      const relStart = Math.max(0, Number(item.startSeconds) || 0);
      const relEnd = Math.min(windowLength, Number(item.endSeconds) || windowLength);
      if (relEnd - relStart < 2) continue;
      const absStart = Math.round((offsetShift + relStart) * 10) / 10;
      const absEnd = Math.round((offsetShift + relEnd) * 10) / 10;
      const clipLen = absEnd - absStart;
      const captions = (item.captions ?? [])
        .map((c) => ({
          startOffset: Math.max(0, Math.min(clipLen, Number(c.startOffset) || 0)),
          endOffset: Math.max(0, Math.min(clipLen, Number(c.endOffset) || clipLen)),
          text: String(c.text ?? '').trim(),
        }))
        .filter((c) => c.text.length > 0 && c.endOffset > c.startOffset);

      sanitized.push({
        title: String(item.title ?? '').trim() || `Highlight Clip ${sanitized.length + 1}`,
        startSeconds: absStart,
        endSeconds: absEnd,
        reason: String(item.reason ?? '').trim(),
        captions,
      });
    }

    if (sanitized.length === 0) {
      throw new Error('AI analysis could not extract a clip segment >= 2 seconds.');
    }

    return sanitized;
  } finally {
    if (tempWindowPath) {
      fs.rmSync(tempWindowPath, { force: true });
    }
    if (uploadedFileName) {
      await ai.files.delete({ name: uploadedFileName }).catch(() => {});
    }
  }
}

function formatAssTime(sec: number): string {
  const clamped = Math.max(0, sec);
  const hours = Math.floor(clamped / 3600);
  const mins = Math.floor((clamped % 3600) / 60);
  const secs = Math.floor(clamped % 60);
  const cs = Math.floor((clamped % 1) * 100);
  return `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

function writeAssFile(
  assPath: string,
  captions: CaptionLine[],
  captionStyle: string,
  playResX: number,
  playResY: number,
) {
  const fontSize = Math.round(playResY * 0.042);
  const bold = captionStyle === 'minimal-clean' ? 0 : -1;
  const primaryColor =
    captionStyle === 'karaoke-highlight' ? '&H006DE62C' : '&H00FFFFFF';
  const outline = captionStyle === 'minimal-clean' ? 1 : 3;

  const header = [
    '[Script Info]',
    'ScriptType: v4.00+',
    `PlayResX: ${playResX}`,
    `PlayResY: ${playResY}`,
    '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    `Style: Default,DejaVu Sans,${fontSize},${primaryColor},&H00FFFFFF,&H00000000,&H80000000,${bold},0,0,0,100,100,0,0,1,${outline},1,2,40,40,${Math.round(playResY * 0.1)},1`,
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
  ];

  const events = captions.map((c) => {
    const cleanText = c.text.replace(/[\r\n]+/g, ' ').replace(/[{}]/g, '');
    return `Dialogue: 0,${formatAssTime(c.startOffset)},${formatAssTime(c.endOffset)},Default,,0,0,0,,${cleanText}`;
  });

  fs.writeFileSync(assPath, [...header, ...events].join('\n'), 'utf8');
}

export async function renderClipWithFfmpeg(params: {
  sourcePath: string;
  outputPath: string;
  startTime: number;
  endTime: number;
  aspectRatio: '9:16' | '1:1' | '16:9';
  captionStyle: string;
  captions: CaptionLine[];
  hasAudio: boolean;
  tempDir: string;
}): Promise<{ durationSeconds: number; thumbnailDataUrl?: string }> {
  const clipDuration = Math.max(1, params.endTime - params.startTime);

  let targetW = 720;
  let targetH = 1280;
  let vfFilter =
    'scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,setsar=1';

  if (params.aspectRatio === '1:1') {
    targetW = 720;
    targetH = 720;
    vfFilter =
      'scale=720:720:force_original_aspect_ratio=increase,crop=720:720,setsar=1';
  } else if (params.aspectRatio === '16:9') {
    targetW = 1280;
    targetH = 720;
    vfFilter =
      'scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1';
  }

  let assPath: string | null = null;
  if (params.captionStyle !== 'none' && params.captions.length > 0) {
    assPath = path.join(
      params.tempDir,
      `subs_${crypto.randomBytes(6).toString('hex')}.ass`,
    );
    writeAssFile(assPath, params.captions, params.captionStyle, targetW, targetH);
    const escapedAss = assPath.replace(/\\/g, '/').replace(/:/g, '\\:');
    vfFilter = `${vfFilter},ass=${escapedAss}`;
  }

  const args = [
    '-y',
    '-ss',
    String(params.startTime),
    '-t',
    String(clipDuration),
    '-i',
    params.sourcePath,
    '-vf',
    vfFilter,
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '23',
    '-pix_fmt',
    'yuv420p',
    ...(params.hasAudio ? ['-c:a', 'aac', '-b:a', '128k'] : ['-an']),
    '-movflags',
    '+faststart',
    params.outputPath,
  ];

  try {
    await execFileAsync('ffmpeg', args, { timeout: 180000 });
    const thumbnailDataUrl = await extractThumbnailDataUrl(
      params.outputPath,
      Math.min(1, clipDuration / 2),
      params.tempDir,
    );
    return {
      durationSeconds: Math.round(clipDuration * 10) / 10,
      thumbnailDataUrl,
    };
  } finally {
    if (assPath) {
      fs.rmSync(assPath, { force: true });
    }
  }
}
