// app/api/jobs/[jobId]/route.ts
// 특정 잡의 상세 상태 + 5개 아이템 폴링 응답. PRD §10 포맷.

import { NextResponse } from 'next/server';

import { getJobById, listItemsByJob } from '@/lib/db/repo';

interface RouteContext {
  params: Promise<{ jobId: string }>;
}

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  const { jobId } = await context.params;
  if (!/^[0-9a-fA-F-]{8,}$/.test(jobId)) {
    return NextResponse.json({ error: 'invalid-jobId' }, { status: 400 });
  }

  const job = getJobById(jobId);
  if (!job) {
    return NextResponse.json({ error: 'not-found' }, { status: 404 });
  }

  const items = listItemsByJob(jobId).map((i) => ({
    index: i.itemIndex,
    stage: i.stage,
    progress: i.progress,
    status: i.status,
    script: i.scriptJson,
    caption: i.caption,
    hashtags: i.hashtagsJson ?? [],
    outputPath: i.outputPath,
    error: i.errorMessage,
    updatedAt: i.updatedAt,
  }));

  return NextResponse.json({
    jobId: job.id,
    triggerId: job.triggerId,
    status: job.status,
    category: job.category,
    createdAt: job.createdAt,
    completedAt: job.completedAt,
    items,
  });
}
