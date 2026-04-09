// lib/pipeline/subtitle.ts
// assets/styles/subtitle.ass 템플릿의 {DIALOGUE_LINES} 플레이스홀더를
// 실제 문장별 Dialogue 줄로 치환하여 data/jobs/[jobId]/temp/item_N.ass 저장.
//
// P2-T07: mode 파라미터(default | karaoke) 도입.
//   - default  : 기존과 동일. 'Default' 스타일 1줄/문장.
//   - karaoke  : 'Karaoke' 스타일 + {\k<centisec>} 태그를 어절(공백 split) 단위로 분배.
//                MeloTTS 가 단어 타이밍을 제공하지 않으므로 어절 균등 분배(≈85% 정확도).

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

import type { VoiceSegmentTiming } from './voice';

const TEMPLATE_PATH = path.resolve(process.cwd(), 'assets/styles/subtitle.ass');

export type SubtitleMode = 'default' | 'karaoke';

export interface BuildAssInput {
  jobId: string;
  itemIndex: number;
  segmentTimings: VoiceSegmentTiming[];
  tempDir: string;
  /** P2-T07: 자막 모드. 미지정 시 'default' (백워드 호환). */
  mode?: SubtitleMode;
}

export interface BuildAssOutput {
  subtitlePath: string;
  /** 실제 사용된 모드(env 폴백 포함 결과). */
  mode: SubtitleMode;
}

function msToAssTime(ms: number): string {
  // ASS 타임 포맷: H:MM:SS.cs (centiseconds, 2자리)
  const totalSec = ms / 1000;
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = Math.floor(totalSec % 60);
  const cs = Math.floor((ms % 1000) / 10);
  const pad = (n: number, width = 2): string => n.toString().padStart(width, '0');
  return `${h}:${pad(m)}:${pad(s)}.${pad(cs)}`;
}

function escapeAssText(text: string): string {
  // ASS 에서 줄바꿈은 \N, 중괄호는 의미가 있으므로 이스케이프
  return text.replace(/\{/g, '(').replace(/\}/g, ')').replace(/\r?\n/g, '\\N');
}

/**
 * P2-T07: 어절 균등 분배 \k 태그 라인 본문 생성.
 * - 어절(공백 split) 개수만큼 균등 분배 + 나머지는 마지막 어절에 가산
 * - 어절이 1개여도 정상 동작(crash 없음 검증 항목)
 * - 중괄호는 ASS 태그 문법이므로 escapeAssText 적용 후 다시 \k 태그 부착
 */
function buildKaraokeLine(seg: VoiceSegmentTiming): string {
  const totalCs = Math.max(1, Math.round((seg.endMs - seg.startMs) / 10));
  // 공백 1개 이상으로 split, 빈 토큰 제거
  const words = seg.text
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 0);

  if (words.length === 0) {
    // 비정상 입력 가드 — 빈 라인 반환
    return '';
  }
  if (words.length === 1) {
    const safe = escapeAssText(words[0]);
    return `{\\k${totalCs}}${safe}`;
  }

  const perWordCs = Math.max(1, Math.floor(totalCs / words.length));
  const consumed = perWordCs * (words.length - 1);
  const lastCs = Math.max(1, totalCs - consumed);

  return words
    .map((w, i) => {
      const cs = i === words.length - 1 ? lastCs : perWordCs;
      const safe = escapeAssText(w);
      return `{\\k${cs}}${safe}`;
    })
    .join(' ');
}

function resolveMode(mode: SubtitleMode | undefined): SubtitleMode {
  if (mode === 'karaoke' || mode === 'default') return mode;
  // 환경 변수 폴백 — orchestrator 가 명시 전달하지 않아도 KARAOKE_MODE=1 만으로 활성화
  return process.env.KARAOKE_MODE === '1' ? 'karaoke' : 'default';
}

export function buildAssSubtitle(input: BuildAssInput): BuildAssOutput {
  if (!existsSync(TEMPLATE_PATH)) {
    throw new Error(`[subtitle] 템플릿 없음: ${TEMPLATE_PATH}`);
  }
  const template = readFileSync(TEMPLATE_PATH, 'utf-8');
  if (!template.includes('{DIALOGUE_LINES}')) {
    throw new Error('[subtitle] 템플릿에 {DIALOGUE_LINES} 플레이스홀더가 없습니다.');
  }

  const mode = resolveMode(input.mode);
  const styleName = mode === 'karaoke' ? 'Karaoke' : 'Default';

  const lines = input.segmentTimings
    .map((seg) => {
      const start = msToAssTime(seg.startMs);
      const end = msToAssTime(seg.endMs);
      const text =
        mode === 'karaoke' ? buildKaraokeLine(seg) : escapeAssText(seg.text);
      // Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
      return `Dialogue: 0,${start},${end},${styleName},,0,0,0,,${text}`;
    })
    .join('\n');

  const rendered = template.replace('{DIALOGUE_LINES}', lines);

  const itemDir = path.join(input.tempDir, `item_${input.itemIndex}`);
  if (!existsSync(itemDir)) mkdirSync(itemDir, { recursive: true });

  const subtitlePath = path.join(itemDir, 'subtitle.ass');
  writeFileSync(subtitlePath, rendered, 'utf-8');

  return { subtitlePath, mode };
}
