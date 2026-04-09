'use client';

// components/pipeline/jobs-history-table.tsx
// /history 페이지의 잡 목록 테이블. GET /api/jobs 1회 로드 + useJobsStore 캐시.

import { useEffect } from 'react';
import Link from 'next/link';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useJobsStore, type JobSummary } from '@/store/jobsStore';

function formatDate(iso: string): string {
  try {
    return new Date(iso.replace(' ', 'T') + 'Z').toLocaleString('ko-KR');
  } catch {
    return iso;
  }
}

function statusVariant(
  status: JobSummary['status'],
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'completed':
      return 'secondary';
    case 'running':
      return 'default';
    case 'failed':
      return 'destructive';
    default:
      return 'outline';
  }
}

export function JobsHistoryTable() {
  const jobs = useJobsStore((s) => s.jobs);
  const setJobs = useJobsStore((s) => s.setJobs);

  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      try {
        const res = await fetch('/api/jobs?limit=50', { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as { jobs: JobSummary[] };
        if (!cancelled) setJobs(data.jobs);
      } catch {
        // 조용히 무시
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [setJobs]);

  if (jobs.length === 0) {
    return (
      <Card className="p-6 text-center text-sm text-muted-foreground">
        아직 생성된 잡이 없습니다. 대시보드에서 &quot;5개 자동 생성&quot; 을 실행해 보세요.
      </Card>
    );
  }

  return (
    <Card className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>생성 시각</TableHead>
            <TableHead>카테고리</TableHead>
            <TableHead>상태</TableHead>
            <TableHead className="text-right">진행</TableHead>
            <TableHead>트리거</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => (
            <TableRow key={job.jobId}>
              <TableCell className="font-mono text-xs">{formatDate(job.createdAt)}</TableCell>
              <TableCell>{job.category}</TableCell>
              <TableCell>
                <Badge variant={statusVariant(job.status)}>{job.status}</Badge>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {job.completedItemCount}/{job.itemCount}
              </TableCell>
              <TableCell>
                <Link
                  href={`/?triggerId=${job.triggerId}`}
                  className="text-xs text-primary underline"
                >
                  {job.triggerId.slice(0, 8)}…
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
