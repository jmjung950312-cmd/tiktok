// lib/constants.ts
// 대시보드 공통 상수. 카테고리, 시나리오 표시명, 영상 규격 등.

import type { CategoryCode } from '@/store/currentSessionStore';

export interface CategoryDef {
  code: CategoryCode;
  label: string;
  emoji: string;
  description: string;
}

export const CATEGORIES: readonly CategoryDef[] = [
  {
    code: 'love-psychology',
    label: '연애 심리',
    emoji: '💘',
    description: '끌림·호감·거리감 심리학 기반 인사이트',
  },
  {
    code: 'unknown-facts',
    label: '몰랐던 사실',
    emoji: '🤯',
    description: '평범해 보이지만 의외로 잘 모르는 상식',
  },
  {
    code: 'money-habits',
    label: '돈 습관',
    emoji: '💰',
    description: '저축·투자·소비 행동 심리학',
  },
  {
    code: 'relationships',
    label: '인간관계',
    emoji: '🤝',
    description: '직장·친구·가족 대화 기술',
  },
  {
    code: 'self-improvement',
    label: '자기계발',
    emoji: '🚀',
    description: '루틴·집중력·생산성 향상',
  },
] as const;

export const SCENARIO_A_TEAMMATES = [
  'trend-scout',
  'script-writer',
  'hook-critic',
  'caption-crafter',
  'content-qa',
] as const;

export const JOB_POLLING_INTERVAL_MS = 2000;
export const TRIGGER_POLLING_INTERVAL_MS = 2000;

export const VIDEO_SPEC = {
  width: 1080,
  height: 1920,
  targetDurationSec: 20,
  aspectRatio: '9:16',
} as const;
