// app/analytics/page.tsx
// Phase 2 분석 상세 페이지 placeholder. I-7 빈 상태 UX.

import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3 } from 'lucide-react';

export const metadata = {
  title: '상세 분석',
};

export default function AnalyticsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6 sm:px-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold">상세 분석</h1>
        <p className="text-sm text-muted-foreground">
          기간 필터, 카테고리별 성과 차트, 주간 리포트 뷰어, 수동 메트릭 입력 폼 — 전부
          Phase 2 에서 활성화됩니다.
        </p>
      </div>

      <Card className="p-6 flex items-start gap-3">
        <BarChart3 className="h-5 w-5 mt-0.5 text-muted-foreground" />
        <div className="space-y-1 flex-1">
          <p className="font-medium">Phase 2 대기 중</p>
          <p className="text-sm text-muted-foreground">
            시나리오 C (metrics-analyst + trend-analyst) 완성 후 주간 리포트가 자동
            생성됩니다. 매주 월요일 09:00 자동 실행은 Phase 2 연기 확정(C-4).
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="p-4 space-y-2">
          <p className="text-xs text-muted-foreground">카테고리별 성과</p>
          <Skeleton className="h-48" />
        </Card>
        <Card className="p-4 space-y-2">
          <p className="text-xs text-muted-foreground">완주율 추이</p>
          <Skeleton className="h-48" />
        </Card>
      </div>
    </div>
  );
}
