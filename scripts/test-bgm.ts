// scripts/test-bgm.ts
// P2-T03 검증: BGM 자동 믹스가 동작하는지 수동 확인.
//
// 흐름:
//   1) assets/backgrounds/ 에서 배경 1개 선택
//   2) assets/bgm/ 에서 BGM 1개 선택 (없으면 skip 경고)
//   3) 더미 ASS 자막 생성
//   4) ffmpeg amix 경로로 테스트 mp4 생성
//   5) ffmpeg -i 로 duration + audio stream 확인
//
// 사용:
//   npx tsx scripts/test-bgm.ts                    # 3-input amix 경로
//   DISABLE_BGM=1 npx tsx scripts/test-bgm.ts      # 2-input 폴백 경로

import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';

import { spawnFfmpeg, readMediaDurationMs } from '../lib/providers/ffmpeg';
import { listBackgrounds } from '../lib/providers/background';
import { listBgmFiles, pickRandomBgm } from '../lib/providers/bgm';
import { composeVideo } from '../lib/pipeline/video';

const OUT_DIR = path.resolve(process.cwd(), 'data/.bgm-test');
const TEST_DURATION_SEC = 4;

interface TestReport {
  bgmEnabled: boolean;
  bgmPath: string | null;
  backgroundPath: string;
  outputPath: string;
  durationMs: number;
  audioStreamCount: number;
}

async function makeSilentVoice(outPath: string): Promise<void> {
  // MeloTTS 없이도 테스트 가능하도록 무음 wav 생성(lavfi sine 0Hz).
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
Title: BGM Test
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,72,&H00FFFFFF,&H000000FF,&H00000000,&H64000000,1,0,0,0,100,100,0,0,1,3,0,2,60,60,200,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:00.00,0:00:${String(TEST_DURATION_SEC).padStart(2, '0')}.00,Default,,0,0,0,,BGM 테스트
`;
  writeFileSync(outPath, body, 'utf-8');
}

async function countAudioStreams(mp4Path: string): Promise<number> {
  // ffprobe 없이 ffmpeg -i 로그에서 Input #0 섹션의 Audio stream 개수 카운트.
  // 주의: `-f null -` 은 Input 블록 + Output 블록 양쪽에 Stream 라인을 출력하므로
  // Input #0 블록만 잘라낸 후 "Audio:" 횟수를 센다.
  const result = await spawnFfmpeg(['-hide_banner', '-i', mp4Path, '-f', 'null', '-'], {
    capture: true,
    timeoutMs: 30_000,
  }).catch((err: Error) => ({ exitCode: -1, stdout: '', stderr: err.message }));

  const log = result.stderr;
  const inputStart = log.indexOf('Input #0');
  if (inputStart === -1) return 0;
  const inputEnd = log.indexOf('Output #', inputStart);
  const inputSection = inputEnd === -1 ? log.slice(inputStart) : log.slice(inputStart, inputEnd);
  const matches = inputSection.match(/Stream #\d+:\d+.*?: Audio/g) ?? [];
  return matches.length;
}

async function main(): Promise<number> {
  const disableBgm = process.env.DISABLE_BGM === '1';

  // 1) 배경 영상 확인
  const backgrounds = listBackgrounds();
  if (backgrounds.length === 0) {
    console.error('[test-bgm] assets/backgrounds/ 에 파일이 없습니다. P1-T04 가이드 참조.');
    return 1;
  }
  const bgPath = backgrounds[0];

  // 2) BGM 확인
  const bgmFiles = listBgmFiles();
  console.log(`[test-bgm] DISABLE_BGM=${disableBgm ? '1' : '0'}`);
  console.log(`[test-bgm] 배경 영상 ${backgrounds.length}개 감지 → 사용: ${path.basename(bgPath)}`);
  console.log(`[test-bgm] BGM 파일 ${bgmFiles.length}개 감지`);

  if (!disableBgm && bgmFiles.length === 0) {
    console.warn('[test-bgm] BGM 풀이 비어 있습니다. 자동으로 2-input 폴백 경로로 진행합니다.');
  }

  // 3) 테스트 디렉토리 준비
  if (existsSync(OUT_DIR)) {
    rmSync(OUT_DIR, { recursive: true, force: true });
  }
  mkdirSync(OUT_DIR, { recursive: true });

  // 4) 무음 voice wav 생성
  const voicePath = path.join(OUT_DIR, 'voice.wav');
  console.log('[test-bgm] 무음 voice wav 생성...');
  await makeSilentVoice(voicePath);

  // 5) 더미 자막 ASS
  const subtitlePath = path.join(OUT_DIR, 'subtitle.ass');
  makeDummySubtitle(subtitlePath);

  // 6) composeVideo 호출
  console.log('[test-bgm] composeVideo 호출 중...');
  const { outputPath, durationMs } = await composeVideo({
    jobId: 'bgm-test',
    category: 'test',
    itemIndex: 0,
    audioPath: voicePath,
    subtitlePath,
    totalMs: TEST_DURATION_SEC * 1000,
    outputDir: OUT_DIR,
    backgroundPathOverride: bgPath,
    backgroundStartOffsetSec: 0,
    bgmPathOverride: disableBgm ? null : pickRandomBgm() ?? undefined,
  });

  // 7) 검증
  const streamCount = await countAudioStreams(outputPath);
  const actualDuration = await readMediaDurationMs(outputPath).catch(() => -1);

  const report: TestReport = {
    bgmEnabled: !disableBgm && bgmFiles.length > 0,
    bgmPath: disableBgm ? null : pickRandomBgm(),
    backgroundPath: bgPath,
    outputPath,
    durationMs: actualDuration,
    audioStreamCount: streamCount,
  };

  console.log('');
  console.log('[test-bgm] 리포트');
  console.log(`  BGM 활성화        : ${report.bgmEnabled}`);
  console.log(`  배경 영상         : ${path.basename(report.backgroundPath)}`);
  console.log(`  출력 mp4          : ${path.basename(report.outputPath)}`);
  console.log(`  duration          : ${report.durationMs}ms (기대 ${TEST_DURATION_SEC * 1000}ms)`);
  console.log(`  audio stream 개수 : ${report.audioStreamCount} (기대 1)`);
  console.log('');

  if (report.audioStreamCount !== 1) {
    console.error(`[test-bgm] FAIL: audio stream 개수가 1이 아님 (${report.audioStreamCount})`);
    return 2;
  }
  if (Math.abs(report.durationMs - TEST_DURATION_SEC * 1000) > 800) {
    console.error(`[test-bgm] FAIL: duration 오차 과대 (${report.durationMs}ms)`);
    return 3;
  }

  console.log('[test-bgm] PASS');
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error('[test-bgm] 예기치 않은 에러:', err);
    process.exit(99);
  });
