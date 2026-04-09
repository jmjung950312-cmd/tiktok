'use client';

// components/analytics/recommendation-panel.tsx
// 섹션 7 — Phase 2/3 빈 상태 UX. trend-analyst + prompt-tuner 가동 전 안내.

import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles } from 'lucide-react';

export function RecommendationPanel() {
  return (
    <section aria-labelledby="recommendation-panel-title" className="space-y-3">
      <h2 id="recommendation-panel-title" className="text-xl font-semibold">
        7. 다음 주 추천
      </h2>
      <Card className="space-y-4 p-6">
        <div className="flex items-start gap-3">
          <Sparkles className="text-muted-foreground mt-0.5 h-5 w-5" />
          <div className="flex-1 space-y-1">
            <p className="font-medium">Phase 2/3 준비 중</p>
            <p className="text-muted-foreground text-sm">
              trend-analyst 의 다음 주 주제 Top-5 와 prompt-tuner 의 프롬프트 개선 제안은 Phase 2/3
              에서 활성화됩니다.
            </p>
          </div>
        </div>
        <ul className="space-y-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <li key={i} className="flex items-center gap-3">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-4 flex-1" />
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}
