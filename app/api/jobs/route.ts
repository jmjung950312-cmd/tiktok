// app/api/jobs/route.ts
// 잡 히스토리 목록 반환. /history 페이지 데이터 소스.

import { NextResponse } from 'next/server';

import { listJobs, listItemsByJob } from '@/lib/db/repo';

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const limitParam = url.searchParams.get('limit');
  const limit = Math.min(Math.max(Number(limitParam ?? 50) || 50, 1), 200);

  const jobs = listJobs(limit);
  const withItemCount = jobs.map((job) => {
    const items = listItemsByJob(job.id);
    return {
      jobId: job.id,
      triggerId: job.triggerId,
      category: job.category,
      status: job.status,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
      itemCount: items.length,
      completedItemCount: items.filter((i) => i.status === 'completed').length,
    };
  });

  return NextResponse.json({ jobs: withItemCount });
}
