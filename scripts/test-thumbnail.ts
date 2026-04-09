// scripts/test-thumbnail.ts
// P2-T05 검증: composeVideo 가 _thumb.jpg 를 정상 추출하는지 단독 확인.
//
// 흐름:
//   1) assets/backgrounds/ 에서 배경 1개 선택
//   2) lavfi sine 으로 무음 voice wav 생성
//   3) 더미 ASS 자막 작성
//   4) composeVideo 호출 (BGM 사용 X — DISABLE_BGM 자동 적용)
//   5) <stem>_thumb.jpg 존재 + 크기(540x960) 검증
//
// 사용:
//   npx tsx scripts/test-thumbnail.ts

import { existsSync, mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { spawnFfmpeg } from '../lib/providers/ffmpeg';
import { listBackgrounds } from '../lib/providers/background';
import { composeVideo } from '../lib/pipeline/video';

const OUT_DIR = path.resolve(process.cwd(), 'data/.thumbnail-test');
const TEST_DURATION_SEC = 4;

async function makeSilentVoice(outPath: string): Promise<void> {
  const args = [
    '-y',
    '-hide_banner',
    '-f',
    'lavfi',
    '-i',
    `sine=frequency=220:duration=${TEST_DURATION_SEC}`,
    '-ac',
    '1',
    '-ar',
    '22050',
    outPath,
  ];
  await spawnFfmpeg(args, { capture: true, timeoutMs: 30_000 });
}

function makeDummySubtitle(outPath: string): void {
  const body = `[Script Info]
Title: Thumbnail Test
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,72,&H00FFFFFF,&H000000FF,&H00000000,&H64000000,1,0,0,0,100,100,0,0,1,3,0,2,60,60,200,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:00.00,0:00:${String(TEST_DURATION_SEC).padStart(2, '0')}.00,Default,,0,0,0,,썸네일 테스트
`;
  writeFileSync(outPath, body, 'utf-8');
}

interface JpegInfo {
  width: number;
  height: number;
}

/**
 * ffprobe 없이 JPEG 헤더에서 width/height 를 직접 파싱.
 * SOF (Start Of Frame) 마커: 0xFFC0 ~ 0xFFCF (단 0xFFC4 / 0xFFC8 / 0xFFCC 제외)
 *   바이트 구성: marker(2) + length(2) + precision(1) + height(2) + width(2) + ...
 */
function readJpegSize(filePath: string): JpegInfo {
  const fs = require('node:fs') as typeof import('node:fs');
  const buf: Buffer = fs.readFileSync(filePath);
  if (buf[0] !== 0xff || buf[1] !== 0xd8) {
    throw new Error(`[test-thumbnail] JPEG SOI 헤더 아님: ${filePath}`);
  }
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) {
      throw new Error(`[test-thumbnail] JPEG 마커 파싱 실패 @ offset ${i}`);
    }
    const marker = buf[i + 1];
    // SOF0~SOF3, SOF5~SOF7, SOF9~SOF11, SOF13~SOF15
    const isSof =
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc;
    const segLen = buf.readUInt16BE(i + 2);
    if (isSof) {
      const height = buf.readUInt16BE(i + 5);
      const width = buf.readUInt16BE(i + 7);
      return { width, height };
    }
    i += 2 + segLen;
  }
  throw new Error('[test-thumbnail] JPEG SOF 마커를 찾지 못함');
}

async function main(): Promise<number> {
  const backgrounds = listBackgrounds();
  if (backgrounds.length === 0) {
    console.error('[test-thumbnail] assets/backgrounds/ 가 비어 있습니다. P1-T04 가이드 참조.');
    return 1;
  }
  const bg = backgrounds[0];

  if (existsSync(OUT_DIR)) rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });

  const voicePath = path.join(OUT_DIR, 'voice.wav');
  await makeSilentVoice(voicePath);

  const subtitlePath = path.join(OUT_DIR, 'subtitle.ass');
  makeDummySubtitle(subtitlePath);

  console.log('[test-thumbnail] composeVideo 호출 중 (DISABLE_BGM 자동)...');
  process.env.DISABLE_BGM = '1';

  const result = await composeVideo({
    jobId: 'thumbnail-test',
    category: 'test',
    itemIndex: 0,
    audioPath: voicePath,
    subtitlePath,
    totalMs: TEST_DURATION_SEC * 1000,
    outputDir: OUT_DIR,
    backgroundPathOverride: bg,
    backgroundStartOffsetSec: 0,
    bgmPathOverride: null,
  });

  console.log(`[test-thumbnail] mp4   : ${path.basename(result.outputPath)}`);
  console.log(`[test-thumbnail] thumb : ${result.thumbnailPath ?? '(없음)'}`);

  if (!result.thumbnailPath) {
    console.error('[test-thumbnail] FAIL: 썸네일이 생성되지 않았습니다.');
    return 2;
  }
  if (!existsSync(result.thumbnailPath)) {
    console.error(`[test-thumbnail] FAIL: 썸네일 파일이 디스크에 없습니다: ${result.thumbnailPath}`);
    return 3;
  }
  const sz = statSync(result.thumbnailPath).size;
  console.log(`[test-thumbnail] file size : ${sz} bytes`);
  if (sz < 1000) {
    console.error('[test-thumbnail] FAIL: 썸네일 크기가 비정상적으로 작습니다.');
    return 4;
  }

  const dim = readJpegSize(result.thumbnailPath);
  console.log(`[test-thumbnail] dimensions: ${dim.width}x${dim.height} (기대 540x960)`);
  if (dim.width !== 540 || dim.height !== 960) {
    console.error(`[test-thumbnail] FAIL: 크기 불일치 ${dim.width}x${dim.height}`);
    return 5;
  }

  // 명명 규칙 확인 — UI 가 사용하는 stem + '_thumb.jpg' 패턴이어야 한다.
  const expected = result.outputPath.replace(/\.mp4$/i, '_thumb.jpg');
  if (path.resolve(result.thumbnailPath) !== path.resolve(expected)) {
    console.error(
      `[test-thumbnail] FAIL: 명명 규칙 위반\n  got      ${result.thumbnailPath}\n  expected ${expected}`,
    );
    return 6;
  }

  console.log('[test-thumbnail] PASS');
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error('[test-thumbnail] 예기치 않은 에러:', err);
    process.exit(99);
  });
