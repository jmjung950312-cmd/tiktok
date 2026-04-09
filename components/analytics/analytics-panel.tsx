'use client';

// components/analytics/analytics-panel.tsx
// 섹션 6 — Phase 1 빈 상태 UX (I-7). metrics-analyst + trend-analyst 가동 전 안내.

import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { BarChart3, ArrowRight } from 'lucide-react';

export function AnalyticsPanel() {
  return (
    <section aria-labelledby="analytics-panel-title" className="space-y-3">
      <h2 id="analytics-panel-title" className="text-xl font-semibold">
        6. 분석 요약
      </h2>
      <Card className="p-6 space-y-4">
        <div className="flex items-start gap-3">
          <BarChart3 className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div className="flex-1 space-y-1">
            <p className="font-medium">Phase 2 준비 중</p>
            <p className="text-sm text-muted-foreground">
              주간 메트릭 집계와 카테고리별 성공률 분석은 시나리오 C (metrics-analyst +
              trend-analyst) 완성 후 활성화됩니다.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/analytics">
              상세 보기 <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </Card>
    </section>
  );
}
