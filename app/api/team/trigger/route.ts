// app/api/team/trigger/route.ts
// 시나리오 트리거 생성 엔드포인트. R-14 FIFO: insert는 항상 'queued'.
// Leader 세션이 별도로 폴링하여 'running'으로 집어간다.

import { NextResponse } from 'next/server';

import { createTrigger } from '@/lib/team/trigger-repo';
import { insertJob } from '@/lib/db/repo';
import { TeamTriggerPayloadSchema } from '@/lib/team/types';

export async function POST(request: Request): Promise<Response> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid-json' }, { status: 400 });
  }

  const parsed = TeamTriggerPayloadSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'invalid-payload',
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      },
      { status: 400 },
    );
  }

  try {
    const trigger = createTrigger(parsed.data);

    // 시나리오 A는 대시보드 카드와 1:1 매칭되는 job 레코드가 필요하다.
    // R-14 FIFO 정책에 따라 실제 파이프라인 실행은 Leader 가 집어가는 시점에 시작.
    if (parsed.data.scenario === 'A') {
      insertJob({
        triggerId: trigger.id,
        category: parsed.data.category,
        settings: parsed.data.settings as unknown as Record<string, unknown>,
      });
    }

    return NextResponse.json(
      { triggerId: trigger.id, status: trigger.status, scenario: trigger.scenario },
      { status: 202 },
    );
  } catch (err) {
    return NextResponse.json(
      { error: 'trigger-insert-failed', message: (err as Error).message },
      { status: 500 },
    );
  }
}
