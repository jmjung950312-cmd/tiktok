// lib/team/trigger-repo.ts
// team_triggers 테이블에 대한 타입 안전 래퍼.
// 실제 SQL은 lib/db/repo.ts에 있고, 여기서는 TeamTriggerPayload 검증 + FIFO 규약을 담당한다.
// R-14 FIFO 직렬화: insert는 queued로, getNext는 가장 오래된 queued 1건만 반환.

import {
  getNextQueuedTrigger,
  getTriggerById,
  insertTeamTrigger,
  listRecentTriggers,
  markTriggerCompleted,
  markTriggerFailed,
  markTriggerRunning,
  recoverStaleRunningTriggers,
  updateTriggerTeammates,
  type TeamTriggerRow,
} from '@/lib/db/repo';
import { SCENARIOS } from './scenarios';
import {
  TeamTriggerPayloadSchema,
  type TeamTriggerPayload,
} from './types';

/**
 * 트리거 insert. 반드시 payload가 TeamTriggerPayloadSchema를 통과해야 하며,
 * 시나리오 코드는 payload.scenario에서 자동 추출한다.
 */
export function createTrigger(raw: unknown): TeamTriggerRow {
  const payload: TeamTriggerPayload = TeamTriggerPayloadSchema.parse(raw);
  const scenarioDef = SCENARIOS[payload.scenario];
  if (!scenarioDef) {
    throw new Error(`알 수 없는 시나리오 코드: ${payload.scenario}`);
  }
  return insertTeamTrigger({
    scenario: payload.scenario,
    payload,
  });
}

/**
 * FIFO 다음 트리거 1건 조회 + 동시에 running 상태로 전환.
 * hook과 Leader가 원자적으로 "집어가는" 진입점.
 * 반환 null이면 대기 중인 트리거 없음.
 */
export function takeNextTrigger(): TeamTriggerRow | null {
  const next = getNextQueuedTrigger();
  if (!next) return null;
  markTriggerRunning(next.id);
  return getTriggerById(next.id);
}

/**
 * R-13 stale 복구. 15분 초과 running을 queued로 복귀. session-start-poll.sh hook과 동일 로직을
 * TypeScript 쪽에서도 호출할 수 있도록 re-export.
 */
export function recoverStaleRunning(thresholdMinutes = 15): number {
  return recoverStaleRunningTriggers(thresholdMinutes);
}

// ========== 재export (API 라우트가 직접 사용) ==========

export {
  getTriggerById,
  listRecentTriggers,
  markTriggerCompleted,
  markTriggerFailed,
  updateTriggerTeammates,
  type TeamTriggerRow,
};
