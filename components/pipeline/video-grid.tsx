'use client';

// components/pipeline/video-grid.tsx
// 섹션 5 — VideoCard 5개 그리드 + 전체 ZIP 다운로드 버튼.

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { VideoCard } from './video-card';
import { useCurrentSessionStore } from '@/store/currentSessionStore';
import { useJobsStore } from '@/store/jobsStore';

export function VideoGrid() {
  const jobId = useCurrentSessionStore((s) => s.currentJobId);
  const detail = useJobsStore((s) => (jobId ? s.detailCache[jobId] : undefined));

  if (!jobId || !detail) {
    return (
      <section aria-labelledby="video-grid-title" className="space-y-3">
        <h2 id="video-grid-title" className="text-xl font-semibold">
          5. 생성 결과
        </h2>
        <Card className="text-muted-foreground p-6 text-center text-sm">
          완료된 영상이 아직 없습니다. 생성 버튼을 눌러 시나리오 A 를 실행하세요.
        </Card>
      </section>
    );
  }

  const allCompleted =
    detail.items.length > 0 && detail.items.every((i) => i.status === 'completed' && i.outputPath);

  return (
    <section aria-labelledby="video-grid-title" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 id="video-grid-title" className="text-xl font-semibold">
          5. 생성 결과 ({detail.items.filter((i) => i.status === 'completed').length}/
          {detail.items.length})
        </h2>
        <Button
          variant="default"
          size="sm"
          disabled={!allCompleted}
          onClick={() => {
            // ZIP 엔드포인트는 Phase 2. Phase 1 은 안내 Toast.
            window.alert(
              'ZIP 다운로드는 Phase 2 에서 구현 예정입니다. Phase 1 은 개별 다운로드만 지원.',
            );
          }}
        >
          <Download className="mr-1 h-4 w-4" />
          ZIP 다운로드
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {detail.items.map((item) => (
          <VideoCard key={item.index} jobId={jobId} item={item} />
        ))}
      </div>
    </section>
  );
}
