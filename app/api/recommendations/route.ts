// app/api/recommendations/route.ts
// Phase 2/3 스켈레톤. trend-analyst 산출물 기반 추천 주제/훅 패턴 반환 예정.

import { NextResponse } from 'next/server';

export async function GET(): Promise<Response> {
  return NextResponse.json({
    status: 'stub',
    phase: 2,
    message: 'Phase 2 에서 trend-analyst 가동 후 활성화됩니다.',
    topTopics: [],
    successfulHookPatterns: [],
  });
}
