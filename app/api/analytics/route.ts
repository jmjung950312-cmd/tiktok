// app/api/analytics/route.ts
// Phase 2 스켈레톤. 실제 집계는 metrics-analyst + trend-analyst (시나리오 C) 산출물 기반.
// Phase 1 에서는 "준비 중" 플래그만 반환.

import { NextResponse } from 'next/server';

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const period = url.searchParams.get('period') ?? '7d';

  return NextResponse.json({
    status: 'stub',
    phase: 2,
    period,
    message: 'Phase 2 에서 시나리오 C(주간 분석) 완성 후 활성화됩니다.',
    totalJobs: 0,
    totalItems: 0,
    categoryBreakdown: {},
    successRate: null,
    latestReport: null,
  });
}
