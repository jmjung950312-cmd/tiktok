// lib/team/types.ts
// Phase 0 P0-B3에서 확정한 FinalContentSchema를 중앙 재사용점으로 선언하고,
// TeamTriggerPayload discriminated union (I-6 권고) 을 제공한다.

import { z } from 'zod';

// ========== P0-B3 FinalContentSchema (PRD §9.1 인용) ==========

export const FinalContentItemSchema = z.object({
  topic: z.string().min(1),
  script: z.object({
    hook: z.string().min(1),
    sentences: z.array(z.string()).length(5),
  }),
  caption: z.string().min(1),
  hashtags: z.array(z.string()).min(3).max(5),
  hookVerdict: z.enum(['PASS', 'REWRITE']),
  /**
   * P2-T06: hook-critic이 생성한 대안 훅 2개(원본 포함 총 3개 선택지).
   * optional이므로 기존 final-content.json도 그대로 통과.
   * 길이는 정확히 2(서로 다른 훅 유형) — UI에서 원본과 함께 radio로 노출.
   */
  hookAlternatives: z.array(z.string()).length(2).optional(),
  aiDisclosure: z.literal(true),
  contentQaReport: z.object({
    status: z.enum(['PASS', 'FAIL']),
    notes: z.string().optional(),
  }),
});

export const FinalContentSchema = z.object({
  jobId: z.string().uuid(),
  category: z.string().min(1),
  createdAt: z.string().datetime(),
  items: z.array(FinalContentItemSchema).length(5),
});

export type FinalContentItem = z.infer<typeof FinalContentItemSchema>;
export type FinalContent = z.infer<typeof FinalContentSchema>;

// ========== 시나리오 코드 ==========

export const ScenarioCodeSchema = z.enum(['A', 'B', 'C', 'D', 'E', 'F']);
export type ScenarioCode = z.infer<typeof ScenarioCodeSchema>;

// ========== 공통 설정 ==========

/**
 * ScenarioA 트리거 payload 및 파이프라인이 사용하는 평탄화된 기본 설정.
 * 여기에는 절대 presetsByCategory가 들어가지 않는다(페이로드 경량화).
 */
export const BaseSettingsSchema = z.object({
  voiceId: z.number().int().nonnegative().default(0),
  speed: z.number().min(0.8).max(1.3).default(1.0),
  backgroundFilter: z.string().nullable().default(null),
});

export type BaseSettings = z.infer<typeof BaseSettingsSchema>;

/**
 * 카테고리별 TTS/배경 프리셋 (Phase 2 P2-T02).
 * settingsStore에 persist되어 카테고리 선택 시 자동 적용된다.
 * payload에는 포함되지 않음(ScenarioA 트리거는 BaseSettings만 전달).
 */
export const CategoryPresetSchema = z.object({
  voiceId: z.number().int().nonnegative(),
  speed: z.number().min(0.8).max(1.3),
  backgroundFilter: z.string().nullable(),
});

export type CategoryPreset = z.infer<typeof CategoryPresetSchema>;

/**
 * settingsStore persist용 확장 스키마.
 * BaseSettings + presetsByCategory optional 맵. 기존 v1 사용자는 맵이 비어 있는 상태로 migrate됨.
 */
export const SettingsSchema = BaseSettingsSchema.extend({
  presetsByCategory: z.record(z.string(), CategoryPresetSchema).optional().default({}),
});

export type Settings = z.infer<typeof SettingsSchema>;

// ========== TeamTriggerPayload discriminated union ==========

/** 시나리오 A — 콘텐츠 제작 (Phase 1 실동작) */
export const ScenarioAPayloadSchema = z.object({
  scenario: z.literal('A'),
  category: z.string().min(1),
  count: z.literal(5),
  // payload는 경량 BaseSettings만 전달 — 카테고리 프리셋은 store 전용
  settings: BaseSettingsSchema,
});

/** 시나리오 F — 재생성 (Phase 1 실동작) */
export const ScenarioFPayloadSchema = z.object({
  scenario: z.literal('F'),
  jobId: z.string().uuid(),
  itemIndex: z.number().int().min(0).max(4),
  reason: z.string().optional(),
});

/** 시나리오 B — 개발 팀 (Phase 1 스켈레톤, Phase 2 가동) */
export const ScenarioBPayloadSchema = z.object({
  scenario: z.literal('B'),
  request: z.string().min(1),
});

/** 시나리오 C — 주간 분석 (Phase 1 스켈레톤, Phase 2 가동) */
export const ScenarioCPayloadSchema = z.object({
  scenario: z.literal('C'),
  period: z.enum(['7d', '30d']).default('7d'),
});

/** 시나리오 D — 프롬프트 개선 연쇄 (Phase 1 스켈레톤, Phase 3 가동) */
export const ScenarioDPayloadSchema = z.object({
  scenario: z.literal('D'),
  triggeredBy: z.string().uuid(), // 선행 시나리오 C triggerId
});

/** 시나리오 E — 퍼스널라이제이션 (Phase 1 스켈레톤, Phase 3 가동) */
export const ScenarioEPayloadSchema = z.object({
  scenario: z.literal('E'),
  subject: z.enum(['style', 'hooks']),
});

export const TeamTriggerPayloadSchema = z.discriminatedUnion('scenario', [
  ScenarioAPayloadSchema,
  ScenarioBPayloadSchema,
  ScenarioCPayloadSchema,
  ScenarioDPayloadSchema,
  ScenarioEPayloadSchema,
  ScenarioFPayloadSchema,
]);

export type TeamTriggerPayload = z.infer<typeof TeamTriggerPayloadSchema>;

// ========== 편의 타입 ==========

export type TriggerStatus = 'queued' | 'running' | 'completed' | 'failed';
