// app/api/team/status/route.ts
// 특정 triggerId 의 현재 상태 + 활성 Teammate 반환.
// triggerId 쿼리가 없으면 최근 10건 요약을 반환 (헤더 배지용).

import { NextResponse } from 'next/server';

import { getTriggerById, listRecentTriggers } from '@/lib/team/trigger-repo';

const TEAMMATE_POOL_FOR_SCENARIO: Record<string, string[]> = {
  A: ['trend-scout', 'script-writer', 'hook-critic', 'caption-crafter', 'content-qa'],
  B: ['frontend-builder', 'backend-builder', 'code-reviewer'],
  C: ['metrics-analyst', 'trend-analyst'],
  D: ['preference-learner', 'prompt-tuner'],
  E: ['preference-learner'],
  F: ['script-writer', 'hook-critic'],
};

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const triggerId = url.searchParams.get('triggerId');

  if (!triggerId) {
    const recent = listRecentTriggers(10);
    return NextResponse.json({
      recent: recent.map((t) => ({
        triggerId: t.id,
        scenario: t.scenario,
        status: t.status,
        activeTeammates: t.activeTeammates,
        createdAt: t.createdAt,
      })),
    });
  }

  const row = getTriggerById(triggerId);
  if (!row) {
    return NextResponse.json({ error: 'not-found' }, { status: 404 });
  }

  const pool = TEAMMATE_POOL_FOR_SCENARIO[row.scenario] ?? [];
  const completed = pool.filter((name) => !row.activeTeammates.includes(name));

  return NextResponse.json({
    triggerId: row.id,
    scenario: row.scenario,
    status: row.status,
    activeTeammates: row.activeTeammates,
    completedTeammates: row.status === 'completed' ? pool : completed,
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    outputPath: row.outputPath,
    errorMessage: row.errorMessage,
  });
}
