// scripts/test-warm-keep.ts
// P2-T01 검증: MeloTTS warm keep daemon 프로토콜의 시간 단축 효과 측정.
//
// 동일 문장 10회 반복 합성 → 1회차(콜드) vs 2~10회차 평균 비교.
// 2~10회차 평균이 1회차 대비 30% 이상 단축되면 PASS.
//
// 사용:
//   npx tsx scripts/test-warm-keep.ts              # daemon 경로 측정
//   MELO_DAEMON=0 npx tsx scripts/test-warm-keep.ts # one-shot 폴백 경로 측정
//
// 주의: 실제 MeloTTS 설치가 필요. 'npm run setup:melo' 선행.

import { mkdirSync, rmSync, existsSync } from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

import { getTtsProvider, shutdownMeloDaemonForTest } from '../lib/providers/tts';

const TEST_DIR = path.resolve(process.cwd(), 'data/.warm-keep-test');
const ITERATIONS = 10;
const SAMPLE_TEXT = '안녕하세요, 오늘은 따뜻한 봄날입니다.';

interface IterationResult {
  index: number;
  ms: number;
  audioPath: string;
  durationMs: number;
}

function formatMs(ms: number): string {
  return `${ms.toFixed(0)}ms`;
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * p));
  return sorted[idx];
}

async function runOnce(index: number): Promise<IterationResult> {
  const provider = getTtsProvider();
  const outPath = path.join(TEST_DIR, `iter_${index}.wav`);
  const start = performance.now();
  const { audioPath, durationMs } = await provider.synthesize({
    text: SAMPLE_TEXT,
    voiceId: 0,
    speed: 1.0,
    outPath,
  });
  const elapsed = performance.now() - start;
  return { index, ms: elapsed, audioPath, durationMs };
}

async function main(): Promise<number> {
  // 테스트 디렉토리 정리
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true });
  }
  mkdirSync(TEST_DIR, { recursive: true });

  const mode = process.env.MELO_DAEMON === '0' ? 'one-shot (폴백)' : 'daemon (warm keep)';
  console.log(`[warm-keep] 모드: ${mode}`);
  console.log(`[warm-keep] 반복: ${ITERATIONS}회, 문장: "${SAMPLE_TEXT}"`);
  console.log('');

  const results: IterationResult[] = [];
  for (let i = 1; i <= ITERATIONS; i += 1) {
    try {
      const r = await runOnce(i);
      results.push(r);
      console.log(`  ${String(i).padStart(2, ' ')}/${ITERATIONS}: ${formatMs(r.ms)} → ${path.basename(r.audioPath)} (duration ${r.durationMs}ms)`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ${i}/${ITERATIONS} FAIL: ${msg}`);
      await shutdownMeloDaemonForTest();
      return 1;
    }
  }

  const firstMs = results[0].ms;
  const restMs = results.slice(1).map((r) => r.ms);
  const restAvg = restMs.reduce((s, v) => s + v, 0) / restMs.length;
  const restMin = Math.min(...restMs);
  const restMax = Math.max(...restMs);
  const restP50 = percentile(restMs, 0.5);
  const reduction = ((firstMs - restAvg) / firstMs) * 100;

  console.log('');
  console.log('[warm-keep] 집계');
  console.log(`  1회차(콜드)        : ${formatMs(firstMs)}`);
  console.log(`  2~${ITERATIONS}회차 평균     : ${formatMs(restAvg)}`);
  console.log(`  2~${ITERATIONS}회차 min/p50/max: ${formatMs(restMin)} / ${formatMs(restP50)} / ${formatMs(restMax)}`);
  console.log(`  단축률             : ${reduction.toFixed(1)}%`);
  console.log('');

  await shutdownMeloDaemonForTest();

  if (mode.startsWith('daemon') && reduction < 30) {
    console.error(`[warm-keep] FAIL: 단축률 ${reduction.toFixed(1)}% < 30% (Phase 2 필수 조건 미달)`);
    return 2;
  }

  console.log(mode.startsWith('daemon')
    ? `[warm-keep] PASS: 단축률 ${reduction.toFixed(1)}% ≥ 30%`
    : `[warm-keep] 폴백 경로 측정 완료 — 목표 없음(비교용)`);
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error('[warm-keep] 예기치 않은 에러:', err);
    process.exit(99);
  });
