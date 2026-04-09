// scripts/test-pipeline.ts
// 결정론 파이프라인 smoke 테스트.
// MeloTTS 가 설치되지 않아도 subtitle/video 단계까지 검증할 수 있도록,
// voice 단계를 ffmpeg sine tone 으로 대체하는 옵션 --no-tts 를 제공한다.
//
// 사용:
//   npx tsx scripts/test-pipeline.ts --no-tts   # 더미 wav 생성
//   npx tsx scripts/test-pipeline.ts            # 실제 MeloTTS 사용

import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

import { spawnFfmpeg, readMediaDurationMs } from '../lib/providers/ffmpeg';
import { pickRandomBackground } from '../lib/providers/background';
import { buildAssSubtitle } from '../lib/pipeline/subtitle';
import { composeVideo } from '../lib/pipeline/video';
import type { VoiceOutput } from '../lib/pipeline/voice';
import type { FinalContent } from '../lib/team/types';

const useNoTts = process.argv.includes('--no-tts');

function buildDummyContent(jobId: string): FinalContent {
  const sentences = [
    '당신은 이 사실을 알고 계셨나요?',
    '첫 번째 이유는 아주 단순합니다.',
    '두 번째는 의외로 많은 사람들이 놓칩니다.',
    '세 번째는 데이터가 명확히 말해줍니다.',
    '오늘부터 이 방법을 시도해 보세요.',
  ];
  return {
    jobId,
    category: 'love-psychology',
    createdAt: new Date().toISOString(),
    items: [0, 1, 2, 3, 4].map((i) => ({
      topic: `테스트 주제 ${i + 1}`,
      script: {
        hook: sentences[0],
        sentences,
      },
      caption: `테스트 캡션 ${i + 1}`,
      hashtags: ['#테스트', '#숏폼', '#연애심리'],
      hookVerdict: 'PASS' as const,
      aiDisclosure: true as const,
      contentQaReport: { status: 'PASS' as const },
    })),
  };
}

async function makeSineWav(outPath: string, durationSec: number): Promise<void> {
  // ffmpeg sine 오실레이터로 wav 생성 (테스트 더미)
  mkdirSync(path.dirname(outPath), { recursive: true });
  await spawnFfmpeg(
    [
      '-y',
      '-f',
      'lavfi',
      '-i',
      `sine=frequency=440:sample_rate=22050:duration=${durationSec}`,
      '-c:a',
      'pcm_s16le',
      outPath,
    ],
    { capture: true, timeoutMs: 30_000 },
  );
}

async function fakeVoiceSingle(
  jobId: string,
  itemIndex: number,
  sentences: string[],
  tempDir: string,
): Promise<VoiceOutput> {
  const itemDir = path.join(tempDir, `item_${itemIndex}`);
  mkdirSync(itemDir, { recursive: true });

  const segmentTimings: VoiceOutput['segmentTimings'] = [];
  let cursor = 0;
  for (let i = 0; i < sentences.length; i += 1) {
    const wav = path.join(itemDir, `sent_${i}.wav`);
    await makeSineWav(wav, 3); // 문장당 3초 더미
    const dur = await readMediaDurationMs(wav);
    segmentTimings.push({
      index: i,
      text: sentences[i],
      startMs: cursor,
      endMs: cursor + dur,
      audioPath: wav,
    });
    cursor += dur;
  }

  const listFile = path.join(itemDir, 'concat.txt');
  writeFileSync(listFile, segmentTimings.map((s) => `file '${s.audioPath}'`).join('\n'), 'utf-8');
  const concatWav = path.join(itemDir, 'voice.wav');
  await spawnFfmpeg(['-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', concatWav], {
    capture: true,
    timeoutMs: 60_000,
  });
  const totalMs = await readMediaDurationMs(concatWav);
  return { audioPath: concatWav, totalMs, segmentTimings };
}

async function main(): Promise<void> {
  const jobId = randomUUID();
  const content = buildDummyContent(jobId);

  const jobDir = path.resolve(process.cwd(), 'data/jobs', jobId);
  const tempDir = path.join(jobDir, 'temp');
  const outputDir = path.join(jobDir, 'output');
  mkdirSync(tempDir, { recursive: true });
  mkdirSync(outputDir, { recursive: true });

  writeFileSync(path.join(jobDir, 'final-content.json'), JSON.stringify(content, null, 2), 'utf-8');

  console.log(`[test-pipeline] jobId=${jobId} mode=${useNoTts ? 'no-tts(sine)' : 'melo'}`);

  // 결정론 재현성을 위해 배경을 1개 고정
  const bg = pickRandomBackground();
  console.log(`[test-pipeline] background=${path.basename(bg)}`);

  const t0 = Date.now();
  // 테스트 범위 축소: 2개 아이템만 생성 (5개는 너무 느림)
  const TEST_LIMIT = 2;

  for (let i = 0; i < TEST_LIMIT; i += 1) {
    const item = content.items[i];
    console.log(`\n[test-pipeline] 아이템 ${i + 1}/${TEST_LIMIT} 시작`);

    let voice: VoiceOutput;
    if (useNoTts) {
      voice = await fakeVoiceSingle(jobId, i, item.script.sentences, tempDir);
    } else {
      const { synthesizeScript } = await import('../lib/pipeline/voice');
      voice = await synthesizeScript({
        jobId,
        itemIndex: i,
        sentences: item.script.sentences,
        voiceId: 0,
        speed: 1.0,
        tempDir,
      });
    }
    console.log(`  voice: totalMs=${voice.totalMs}`);

    const sub = buildAssSubtitle({
      jobId,
      itemIndex: i,
      segmentTimings: voice.segmentTimings,
      tempDir,
    });
    console.log(`  subtitle: ${path.relative(process.cwd(), sub.subtitlePath)}`);

    const video = await composeVideo({
      jobId,
      category: content.category,
      itemIndex: i,
      audioPath: voice.audioPath,
      subtitlePath: sub.subtitlePath,
      totalMs: voice.totalMs,
      outputDir,
      backgroundPathOverride: bg,
      backgroundStartOffsetSec: 0,
    });
    console.log(
      `  video: ${path.relative(process.cwd(), video.outputPath)} (${video.durationMs}ms)`,
    );
  }

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n[test-pipeline] ${TEST_LIMIT}개 완료 (${elapsed}s)`);

  // ffprobe 대체: ffmpeg -i 로 codec/resolution 확인
  const firstMp4 = path.join(
    outputDir,
    `${new Date().toISOString().slice(0, 10)}_love-psychology_1.mp4`,
  );
  if (existsSync(firstMp4)) {
    const { stderr } = await spawnFfmpeg(['-hide_banner', '-i', firstMp4, '-f', 'null', '-'], {
      capture: true,
      timeoutMs: 30_000,
    }).catch((e: Error) => ({ exitCode: -1, stdout: '', stderr: e.message }));
    const res = stderr.match(/Stream #0:0.*?Video: (\S+).*?(\d{3,4})x(\d{3,4})/);
    if (res) {
      console.log(`  확인: codec=${res[1]} resolution=${res[2]}x${res[3]}`);
    } else {
      console.log('  [주의] Stream 정보 파싱 실패. 수동 확인 필요.');
    }
  }
}

main().catch((e: Error) => {
  console.error(`[test-pipeline] 실패: ${e.message}`);
  process.exit(1);
});
