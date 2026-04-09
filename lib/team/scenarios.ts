// lib/team/scenarios.ts
// 시나리오 A~F 6개 정의. A + F만 Phase 1 실동작, B/C/D/E는 Phase 2~3 가동 (C-4 결정).
// 각 시나리오는 teammates 목록·예상 소요·payloadSchema를 가진다.

import type { ZodType } from 'zod';
import {
  ScenarioAPayloadSchema,
  ScenarioBPayloadSchema,
  ScenarioCPayloadSchema,
  ScenarioDPayloadSchema,
  ScenarioEPayloadSchema,
  ScenarioFPayloadSchema,
  type ScenarioCode,
  type TeamTriggerPayload,
} from './types';

/** 시나리오별 활성 여부. Phase 1은 A/F만 true. */
export type ScenarioActivation = 'active' | 'skeleton';

export interface ScenarioDef<TPayload extends TeamTriggerPayload = TeamTriggerPayload> {
  code: ScenarioCode;
  label: string;
  description: string;
  teammates: readonly string[];
  expectedDurationMin: number;
  activation: ScenarioActivation;
  payloadSchema: ZodType<TPayload>;
}

/**
 * 시나리오 A — 콘텐츠 제작.
 * 5명 spawn → final-content.json 생성 → 결정론 파이프라인 → mp4 5개.
 */
const ScenarioA: ScenarioDef = {
  code: 'A',
  label: '콘텐츠 제작',
  description:
    '카테고리 하나에 대해 trend-scout → script-writer → hook-critic → caption-crafter → content-qa 5명이 순차·병렬 작업하여 final-content.json 생성',
  teammates: ['trend-scout', 'script-writer', 'hook-critic', 'caption-crafter', 'content-qa'],
  expectedDurationMin: 15,
  activation: 'active',
  payloadSchema: ScenarioAPayloadSchema,
};

/**
 * 시나리오 F — 재생성.
 * 특정 아이템의 대본만 다시. script-writer + hook-critic 2명.
 */
const ScenarioF: ScenarioDef = {
  code: 'F',
  label: '재생성',
  description:
    '기존 잡의 특정 itemIndex 대본을 script-writer + hook-critic 2명으로 재생성하여 파이프라인 일부만 재실행',
  teammates: ['script-writer', 'hook-critic'],
  expectedDurationMin: 5,
  activation: 'active',
  payloadSchema: ScenarioFPayloadSchema,
};

/**
 * 시나리오 B — 개발 팀. Phase 2 P2-T08 부터 active.
 * Leader는 spawn 직후 각 Teammate에게 `Switch to plan mode` 강제 전송 (P0-B2).
 * R-15: plan mode × Opus 중첩으로 토큰 폭증 위험. 실측은 docs/r15-scenario-b-measurement.md.
 */
const ScenarioB: ScenarioDef = {
  code: 'B',
  label: '개발 팀',
  description:
    '사용자 기능 요청/버그 리포트에 대해 frontend-builder + backend-builder + code-reviewer 3명 계획 승인 모드 작업. P2-T08에서 active 승격',
  teammates: ['frontend-builder', 'backend-builder', 'code-reviewer'],
  expectedDurationMin: 60,
  activation: 'active',
  payloadSchema: ScenarioBPayloadSchema,
};

/**
 * 시나리오 C — 주간 분석. P2-T09 부터 active.
 * launchd cron(매주 월 09:00) 또는 수동 슬래시 커맨드(/tiktok-analyze) 로 트리거.
 */
const ScenarioC: ScenarioDef = {
  code: 'C',
  label: '주간 분석',
  description:
    'metrics-analyst + trend-analyst 2명이 최근 기간의 TikTok 성과를 집계하고 다음 주 추천 주제 Top-5를 산출. 매주 월요일 09:00 launchd 자동 발동(P2-T09).',
  teammates: ['metrics-analyst', 'trend-analyst'],
  expectedDurationMin: 10,
  activation: 'active',
  payloadSchema: ScenarioCPayloadSchema,
};

/**
 * 시나리오 D — 프롬프트 개선 연쇄. Phase 3 P3-T03 가동.
 * P0-B1 §8.4.1 절차: 시나리오 C 완료 후 동일 tiktok-ops-team 내에서 인원 교체 spawn.
 */
const ScenarioD: ScenarioDef = {
  code: 'D',
  label: '프롬프트 개선 (Phase 3)',
  description:
    '시나리오 C 완료 후 Leader가 연쇄 트리거. preference-learner + prompt-tuner 2명이 선호 분석 + 프롬프트 개선 제안 생성. 동일 팀 내 인원 교체로만 spawn (P0-B1 §8.4.1)',
  teammates: ['preference-learner', 'prompt-tuner'],
  expectedDurationMin: 15,
  activation: 'skeleton',
  payloadSchema: ScenarioDPayloadSchema,
};

/**
 * 시나리오 E — 퍼스널라이제이션 단독 실행. Phase 3 가동.
 */
const ScenarioE: ScenarioDef = {
  code: 'E',
  label: '퍼스널라이제이션 (Phase 3)',
  description: '사용자가 수동으로 스타일/훅 선호 학습을 강제 실행. preference-learner 단독 spawn',
  teammates: ['preference-learner'],
  expectedDurationMin: 5,
  activation: 'skeleton',
  payloadSchema: ScenarioEPayloadSchema,
};

export const SCENARIOS: Record<ScenarioCode, ScenarioDef> = {
  A: ScenarioA,
  B: ScenarioB,
  C: ScenarioC,
  D: ScenarioD,
  E: ScenarioE,
  F: ScenarioF,
};

/** 활성 시나리오 코드만 반환. */
export function getActiveScenarios(): ScenarioCode[] {
  return (Object.keys(SCENARIOS) as ScenarioCode[]).filter(
    (code) => SCENARIOS[code].activation === 'active',
  );
}
