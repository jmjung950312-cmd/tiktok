// app/api/prompt-changes/route.ts
// Phase 3 스켈레톤. prompt-tuner 산출물(prompt_changes 테이블) 조회 API.

import { NextResponse } from 'next/server';

export async function GET(): Promise<Response> {
  return NextResponse.json({
    status: 'stub',
    phase: 3,
    message: 'Phase 3 시나리오 D(프롬프트 개선) 완성 후 활성화됩니다.',
    changes: [],
  });
}
