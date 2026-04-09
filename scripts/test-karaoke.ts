// scripts/test-karaoke.ts
// P2-T07 인라인 검증 — buildAssSubtitle 의 default/karaoke 모드 결과 비교.

import { mkdirSync, rmSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { buildAssSubtitle } from '../lib/pipeline/subtitle';

const tempDir = path.resolve(process.cwd(), 'data/.karaoke-test');
if (existsSync(tempDir)) rmSync(tempDir, { recursive: true, force: true });
mkdirSync(tempDir, { recursive: true });

const segs = [
  { index: 0, text: '연애에 정답은 없습니다', startMs: 0, endMs: 2000, audioPath: '' },
  { index: 1, text: '단어한개', startMs: 2000, endMs: 3000, audioPath: '' },
  { index: 2, text: '세 어절 짜리', startMs: 3000, endMs: 5500, audioPath: '' },
  { index: 3, text: '', startMs: 5500, endMs: 6000, audioPath: '' },
  {
    index: 4,
    text: '연애에서 가장 흔한 실수 다섯 가지를 알려드릴게요',
    startMs: 6000,
    endMs: 12000,
    audioPath: '',
  },
];

console.log('=== default mode ===');
const def = buildAssSubtitle({
  jobId: 'test',
  itemIndex: 0,
  segmentTimings: segs,
  tempDir,
  mode: 'default',
});
console.log('mode:', def.mode);
console.log(readFileSync(def.subtitlePath, 'utf-8').split('[Events]')[1]);

console.log('');
console.log('=== karaoke mode ===');
const kar = buildAssSubtitle({
  jobId: 'test',
  itemIndex: 1,
  segmentTimings: segs,
  tempDir,
  mode: 'karaoke',
});
console.log('mode:', kar.mode);
console.log(readFileSync(kar.subtitlePath, 'utf-8').split('[Events]')[1]);

console.log('');
console.log('=== env fallback (KARAOKE_MODE=1, no mode arg) ===');
process.env.KARAOKE_MODE = '1';
const env = buildAssSubtitle({
  jobId: 'test',
  itemIndex: 2,
  segmentTimings: segs.slice(0, 1),
  tempDir,
});
console.log('mode:', env.mode);
console.log(readFileSync(env.subtitlePath, 'utf-8').split('[Events]')[1]);
