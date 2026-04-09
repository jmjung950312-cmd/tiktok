// app/api/prompt-changes/[id]/approve/route.ts
// Phase 3 스켈레톤. 사용자가 prompt-tuner 제안을 승인하면 .claude/agents/*.md 에 실제 적용하는 엔드포인트.
// 승인 시 git 브랜치 자동 생성(P0-C1 / R-19 정책)도 여기서 수행 예정.

import { NextResponse } from 'next/server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, context: RouteContext): Promise<Response> {
  const { id } = await context.params;
  return NextResponse.json({
    status: 'stub',
    phase: 3,
    message:
      'Phase 3 prompt-tuner 승인 플로우 완성 후 활성화됩니다. P0-C1 / R-19 자동 브랜치 정책 준수.',
    id,
  });
}
