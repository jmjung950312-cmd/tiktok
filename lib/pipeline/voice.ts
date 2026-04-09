// lib/pipeline/voice.ts
// 5문장 → 문장별 wav → concat → 통합 wav + segmentTimings.
// MeloTTS 콜드 스타트를 고려해 모델 로드 1회로 공통화하고 싶지만, Phase 1은 결정론 우선.
// 문장별 spawn 을 단순 사용하고, Phase 2 에서 warm keep 으로 개선 예정.

import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { getTtsProvider } from '../providers/tts';
import { spawnFfmpeg, readMediaDurationMs } from '../providers/ffmpeg';

export interface VoiceSegmentTiming {
  index: number;
  text: string;
  startMs: number;
  endMs: number;
  audioPath: string;
}

export interface VoiceOutput {
  /** 통합(concat) wav 경로 */
  audioPath: string;
  /** 통합 wav 의 총 길이(ms) */
  totalMs: number;
  /** 문장별 시작/종료 시각 맵 */
  segmentTimings: VoiceSegmentTiming[];
}

export interface SynthesizeScriptInput {
  jobId: string;
  itemIndex: number;
  /** hook 포함 5문장 */
  sentences: string[];
  voiceId: number;
  speed: number;
  /** data/jobs/[jobId]/temp 기본 경로 */
  tempDir: string;
}

/**
 * 5문장을 TTS 로 합성하고 concat 하여 하나의 wav 를 만든다.
 * ffmpeg concat demuxer 를 사용(재인코딩 없음).
 */
export async function synthesizeScript(input: SynthesizeScriptInput): Promise<VoiceOutput> {
  if (input.sentences.length === 0) {
    throw new Error('[voice] sentences 가 비어 있습니다.');
  }

  const provider = getTtsProvider();
  const itemDir = path.join(input.tempDir, `item_${input.itemIndex}`);
  if (!existsSync(itemDir)) mkdirSync(itemDir, { recursive: true });

  // 1) 문장별 wav 생성 (순차 — MeloTTS 는 동시 spawn 이 불안정)
  const perSentence: VoiceSegmentTiming[] = [];
  let cursorMs = 0;

  for (let i = 0; i < input.sentences.length; i += 1) {
    const text = input.sentences[i];
    const wavPath = path.join(itemDir, `sent_${i}.wav`);
    const result = await provider.synthesize({
      text,
      voiceId: input.voiceId,
      speed: input.speed,
      outPath: wavPath,
    });

    perSentence.push({
      index: i,
      text,
      startMs: cursorMs,
      endMs: cursorMs + result.durationMs,
      audioPath: result.audioPath,
    });
    cursorMs += result.durationMs;
  }

  // 2) concat demuxer 입력 리스트 작성
  const listFile = path.join(itemDir, 'concat.txt');
  const listBody = perSentence
    .map((seg) => `file '${seg.audioPath.replace(/'/g, "'\\''")}'`)
    .join('\n');
  writeFileSync(listFile, listBody, 'utf-8');

  const concatWav = path.join(itemDir, 'voice.wav');
  await spawnFfmpeg(
    [
      '-y',
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      listFile,
      '-c',
      'copy',
      concatWav,
    ],
    { capture: true, timeoutMs: 120_000 },
  );

  const totalMs = await readMediaDurationMs(concatWav).catch(() => cursorMs);

  return {
    audioPath: concatWav,
    totalMs,
    segmentTimings: perSentence,
  };
}
