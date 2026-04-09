// app/history/page.tsx
// 과거 잡 히스토리 — GET /api/jobs 실데이터 사용.

import { JobsHistoryTable } from '@/components/pipeline/jobs-history-table';

export const metadata = {
  title: '히스토리',
};

export default function HistoryPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold">잡 히스토리</h1>
        <p className="text-muted-foreground text-sm">
          지금까지 실행된 시나리오 A 잡 목록입니다. 필터(날짜·카테고리·상태)는 Phase 2 에서
          추가됩니다.
        </p>
      </div>

      <JobsHistoryTable />
    </div>
  );
}
