// app/api/jobs/[jobId]/rerender/route.ts
// P2-T10: 수동 대본 편집 후 결정론 파이프라인만 재실행하는 엔드포인트.
// LLM 레이어 미접촉(team_triggers 미사용) → 비용 $0.
//
// 호출 시점:
//   1) VideoCard "대본 편집" Dialog (newSentences 5개 전달)
//   2) VideoCard "훅 변경" Dialog (P2-T06: newSentences 의 [0] 만 교체된 5개 전달)
//
// 동시성:
//   - 같은 jobId+itemIndex 동시 요청은 in-memory lock 으로 거절(409)
//   - Next.js 단일 인스턴스 가정(로컬 전용 R-14 직렬화 정책과 일관)

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { NextResponse } from 'next/server';
import { z } from 'zod';

import { FinalContentSchema } from '@/lib/team/types';
import { runPipeline } from '@/lib/pipeline/orchestrator';
import { getFinalContentPath } from '@/lib/pipeline/content-loader';

// ---------------------------------------------------------------------------
// 요청 스키마
// ---------------------------------------------------------------------------

/**
 * 둘 다 optional 이지만 최소 1개는 있어야 한다(refine).
 *  - newSentences : 5문장 전체 교체(대본 편집 Dialog)
 *  - newHook      : 첫 문장만 교체(훅 변경 Dialog 의 단축 경로 — newSentences 와 동시 사용 금지)
 */
const RerenderBodySchema = z
  .object({
    itemIndex: z.number().int().min(0).max(4),
    newSentences: z.array(z.string().min(1)).length(5).optional(),
    newHook: z.string().min(1).optional(),
  })
  .refine((v) => v.newSentences !== undefined || v.newHook !== undefined, {
    message: 'newSentences 또는 newHook 중 최소 하나는 필요합니다.',
  })
  .refine((v) => !(v.newSentences !== undefined && v.newHook !== undefined), {
    message: 'newSentences 와 newHook 은 동시에 보낼 수 없습니다.',
  });

// ---------------------------------------------------------------------------
// 동시성 lock — Next.js 단일 인스턴스 가정
// ---------------------------------------------------------------------------

const inFlight = new Set<string>();

function lockKey(jobId: string, itemIndex: number): string {
  return `${jobId}#${itemIndex}`;
}

// ---------------------------------------------------------------------------
// 라우트 핸들러
// ---------------------------------------------------------------------------

interface RouteContext {
  params: Promise<{ jobId: string }>;
}

export async function POST(request: Request, context: RouteContext): Promise<Response> {
  const { jobId } = await context.params;
  if (!/^[0-9a-fA-F-]{8,}$/.test(jobId)) {
    return NextResponse.json({ error: 'invalid-jobId' }, { status: 400 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid-json' }, { status: 400 });
  }

  const parsed = RerenderBodySchema.safeParse(raw);
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
  const { itemIndex, newSentences, newHook } = parsed.data;

  // ── final-content.json 로드 + 검증 ──────────────────────────────────────
  const filePath = getFinalContentPath(jobId);
  if (!existsSync(filePath)) {
    return NextResponse.json({ error: 'final-content-missing', filePath }, { status: 404 });
  }

  let fileJson: unknown;
  try {
    fileJson = JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch (err) {
    return NextResponse.json(
      { error: 'final-content-parse-failed', message: (err as Error).message },
      { status: 500 },
    );
  }

  const validated = FinalContentSchema.safeParse(fileJson);
  if (!validated.success) {
    return NextResponse.json(
      {
        error: 'final-content-schema-invalid',
        issues: validated.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      },
      { status: 422 },
    );
  }

  const content = validated.data;
  const target = content.items[itemIndex];
  if (!target) {
    return NextResponse.json({ error: 'item-index-out-of-range', itemIndex }, { status: 400 });
  }

  // ── 동시성 lock ────────────────────────────────────────────────────────
  const key = lockKey(jobId, itemIndex);
  if (inFlight.has(key)) {
    return NextResponse.json({ error: 'rerender-in-progress', jobId, itemIndex }, { status: 409 });
  }
  inFlight.add(key);

  // ── sentences 갱신 ─────────────────────────────────────────────────────
  let updatedSentences: string[];
  if (newSentences) {
    updatedSentences = newSentences;
  } else {
    // newHook 만 지정된 경우 — 기존 sentences[0] 만 교체
    const original = target.script.sentences;
    updatedSentences = [newHook!, original[1], original[2], original[3], original[4]];
  }

  // 새 hook 필드도 일관성 있게 갱신(첫 문장과 동기화)
  target.script.sentences = updatedSentences;
  target.script.hook = updatedSentences[0];

  // ── final-content.json 저장 ────────────────────────────────────────────
  try {
    writeFileSync(filePath, JSON.stringify(content, null, 2), 'utf-8');
  } catch (err) {
    inFlight.delete(key);
    return NextResponse.json(
      { error: 'final-content-write-failed', message: (err as Error).message },
      { status: 500 },
    );
  }

  // ── 결정론 파이프라인 fire-and-forget ──────────────────────────────────
  // 즉시 202 반환 후 백그라운드에서 runPipeline 진행. lock 은 finally 에서 해제.
  void runPipeline(jobId, { onlyItemIndex: itemIndex })
    .then(() => {
      // 성공 로그는 orchestrator 가 jobs/job_items 테이블 업데이트로 남김.
    })
    .catch((err: unknown) => {
      // 백그라운드 실패는 console 에만 — UI 는 jobs 폴링으로 status='failed' 감지.
      console.error(`[rerender] runPipeline 실패 jobId=${jobId} itemIndex=${itemIndex}:`, err);
    })
    .finally(() => {
      inFlight.delete(key);
    });

  return NextResponse.json(
    {
      jobId,
      itemIndex,
      mode: newSentences ? 'sentences' : 'hook',
      filePath: path.basename(filePath),
      enqueued: true,
    },
    { status: 202 },
  );
}
