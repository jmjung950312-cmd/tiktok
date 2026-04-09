// lib/pipeline/video.ts
// FFmpeg 합성 단계. 배경 영상 + TTS 오디오 (+ 선택적 BGM) + ASS 자막 → 1080x1920 9:16 mp4.
// libx264 CRF 22, aac 192k. 파일명: [yyyy-mm-dd]_[category]_[index].mp4
//
// Phase 2 P2-T03: BGM 3번째 입력 + amix filter_complex 분기 추가.
//   - BGM 파일 0개 또는 DISABLE_BGM=1 → 기존 2-input 경로(voice 단일)
//   - BGM 파일 1개 이상 → 3-input amix (voice 1.0 : bgm BGM_VOLUME)

import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

import { spawnFfmpeg, readMediaDurationMs } from '../providers/ffmpeg';
import { pickRandomBackground, ensureBackgroundForCategory } from '../providers/background';
import { pickRandomBgm, getBgmVolume } from '../providers/bgm';

export interface ComposeVideoInput {
  jobId: string;
  category: string;
  itemIndex: number; // 0~4
  audioPath: string;
  subtitlePath: string;
  totalMs: number;
  outputDir: string;
  /** 결정론 테스트용 고정 배경 경로 */
  backgroundPathOverride?: string;
  /** 결정론 테스트용 시작 오프셋 (초) */
  backgroundStartOffsetSec?: number;
  /** 결정론 테스트용 고정 BGM 경로(P2-T03). 지정 시 pickRandomBgm 대체 */
  bgmPathOverride?: string | null;
}

export interface ComposeVideoOutput {
  outputPath: string;
  durationMs: number;
  /** P2-T05: 썸네일 jpg 경로. 추출 실패 시 null. mp4 성공과 무관. */
  thumbnailPath: string | null;
}

/**
 * P2-T05: 완성된 mp4의 중간 지점 1프레임을 540x960 jpg로 추출.
 * 파일명 규칙: <stem>.mp4 → <stem>_thumb.jpg (DB 스키마 변경 회피, 경로 유추용).
 *
 * 실패해도 throw 하지 않고 null 반환 — mp4 성공이 우선.
 */
export async function extractThumbnail(mp4Path: string, totalSec: number): Promise<string | null> {
  const jpgPath = mp4Path.replace(/\.mp4$/i, '_thumb.jpg');
  const ts = Math.max(0.1, totalSec / 2);
  try {
    await spawnFfmpeg(
      [
        '-y',
        '-hide_banner',
        '-ss',
        String(ts),
        '-i',
        mp4Path,
        '-vframes',
        '1',
        '-vf',
        'scale=540:960:force_original_aspect_ratio=increase,crop=540:960',
        '-q:v',
        '3',
        jpgPath,
      ],
      { capture: false, timeoutMs: 60_000 },
    );
    return existsSync(jpgPath) ? jpgPath : null;
  } catch (err) {
    // 썸네일은 best-effort. 콘솔 경고만 남기고 null 반환.
    console.warn(`[video] 썸네일 추출 실패(무시): ${(err as Error).message}`);
    return null;
  }
}

function todayYmd(): string {
  const d = new Date();
  const pad = (n: number): string => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function buildOutputFilename(category: string, itemIndex: number): string {
  const safeCategory = category.replace(/[^a-zA-Z0-9_-]/g, '-');
  return `${todayYmd()}_${safeCategory}_${itemIndex + 1}.mp4`;
}

/**
 * 배경 영상에서 사용할 시작 오프셋(초)을 계산.
 * 배경 길이가 totalSec 이상이면 앞쪽 랜덤 오프셋, 아니면 0.
 */
async function calcBackgroundStart(
  backgroundPath: string,
  totalSec: number,
  override?: number,
): Promise<number> {
  if (typeof override === 'number') return Math.max(0, override);
  try {
    const bgMs = await readMediaDurationMs(backgroundPath);
    const bgSec = bgMs / 1000;
    const slack = bgSec - totalSec - 0.5;
    if (slack <= 0) return 0;
    return Math.floor(Math.random() * slack);
  } catch {
    return 0;
  }
}

/**
 * BGM을 얻는다. override가 지정되면 그대로, 아니면 pickRandomBgm 결과.
 * DISABLE_BGM=1 이거나 풀이 비어 있으면 null.
 */
function resolveBgm(override: string | null | undefined): string | null {
  if (override === null) return null;
  if (typeof override === 'string') {
    return existsSync(override) ? override : null;
  }
  return pickRandomBgm();
}

/**
 * amix filter_complex 문자열을 조립한다.
 *   [1:a]volume=1.0[a1];[2:a]volume=<bgmVolume>[a2];[a1][a2]amix=inputs=2:duration=first[aout]
 * voice 입력은 stream index 1, bgm 입력은 stream index 2 고정.
 */
function buildAmixFilter(bgmVolume: number): string {
  return (
    `[1:a]volume=1.0[a1];` +
    `[2:a]volume=${bgmVolume}[a2];` +
    `[a1][a2]amix=inputs=2:duration=first:dropout_transition=0[aout]`
  );
}

export async function composeVideo(input: ComposeVideoInput): Promise<ComposeVideoOutput> {
  if (!existsSync(input.audioPath)) {
    throw new Error(`[video] audio 없음: ${input.audioPath}`);
  }
  if (!existsSync(input.subtitlePath)) {
    throw new Error(`[video] subtitle 없음: ${input.subtitlePath}`);
  }
  if (!existsSync(input.outputDir)) mkdirSync(input.outputDir, { recursive: true });

  // P2-T04: 카테고리 기반 배경 선택 우선(로컬 카테고리 파일 → _cache → Pexels → 랜덤).
  // backgroundPathOverride가 지정되면 결정론 테스트 모드로 해당 경로만 사용.
  let bg: string;
  if (input.backgroundPathOverride) {
    bg = input.backgroundPathOverride;
  } else {
    try {
      bg = await ensureBackgroundForCategory(input.category);
    } catch {
      // ensureBackgroundForCategory 내부 폴백도 실패(로컬 풀 0개)한 극단 케이스
      bg = pickRandomBackground();
    }
  }
  if (!existsSync(bg)) {
    throw new Error(`[video] 배경 영상 파일 없음: ${bg}`);
  }

  // P2-T03: BGM 선택 (없으면 null → 2-input 경로로 폴백)
  const bgm = resolveBgm(input.bgmPathOverride);

  const totalSec = Math.max(1, Math.round(input.totalMs / 1000));
  const ss = await calcBackgroundStart(bg, totalSec, input.backgroundStartOffsetSec);

  const filename = buildOutputFilename(input.category, input.itemIndex);
  const outputPath = path.join(input.outputDir, filename);

  // ffmpeg 자막 필터는 경로 중 특수문자를 이스케이프해야 한다.
  const escapedSub = input.subtitlePath
    .replace(/\\/g, '\\\\')
    .replace(/:/g, '\\:')
    .replace(/'/g, "'\\''");

  const vf = [
    'scale=1080:1920:force_original_aspect_ratio=increase',
    'crop=1080:1920',
    'setsar=1',
    `ass='${escapedSub}'`,
  ].join(',');

  // 입력 공통 파트
  const inputArgs = [
    '-y',
    '-hide_banner',
    '-ss',
    String(ss),
    '-t',
    String(totalSec),
    '-i',
    bg,
    '-i',
    input.audioPath,
  ];

  // 출력 공통 파트(영상 인코딩 + 오디오 인코딩 + 메타)
  const videoEncodeArgs = [
    '-vf',
    vf,
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-crf',
    '22',
    '-pix_fmt',
    'yuv420p',
    '-c:a',
    'aac',
    '-b:a',
    '192k',
    '-shortest',
    '-movflags',
    '+faststart',
  ];

  let args: string[];
  if (bgm) {
    // 3-input amix 경로
    const bgmVolume = getBgmVolume();
    const amix = buildAmixFilter(bgmVolume);
    args = [
      ...inputArgs,
      '-i',
      bgm,
      '-filter_complex',
      amix,
      '-map',
      '0:v:0',
      '-map',
      '[aout]',
      ...videoEncodeArgs,
      outputPath,
    ];
  } else {
    // 기존 2-input 경로(폴백, 백워드 호환)
    args = [...inputArgs, '-map', '0:v:0', '-map', '1:a:0', ...videoEncodeArgs, outputPath];
  }

  await spawnFfmpeg(args, { capture: true, timeoutMs: 5 * 60 * 1000 });

  const durationMs = await readMediaDurationMs(outputPath).catch(() => input.totalMs);

  // P2-T05: 썸네일 추출(best-effort, 실패해도 mp4는 성공)
  const thumbnailPath = await extractThumbnail(outputPath, durationMs / 1000);

  return { outputPath, durationMs, thumbnailPath };
}
