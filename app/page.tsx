// app/page.tsx
// 대시보드 메인 — PRD §12 7개 섹션을 위에서 아래로 조립.
// Phase 1 범위 축소(C-4): 섹션 6/7 은 빈 상태 UX 만 표시.

import { CategoryPicker } from '@/components/pipeline/category-picker';
import { SettingsPanel } from '@/components/pipeline/settings-panel';
import { GenerateButton } from '@/components/pipeline/generate-button';
import { JobProgress } from '@/components/pipeline/job-progress';
import { VideoGrid } from '@/components/pipeline/video-grid';
import { AnalyticsPanel } from '@/components/analytics/analytics-panel';
import { RecommendationPanel } from '@/components/analytics/recommendation-panel';

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-10 sm:px-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">TikTok 자동화 대시보드</h1>
        <p className="text-sm text-muted-foreground">
          카테고리를 고르고 &quot;5개 자동 생성&quot; 버튼을 누르면 Claude Code Agent Teams 가
          시나리오 A 를 실행합니다. 15분 이내 mp4 5개가 준비됩니다.
        </p>
      </header>

      <CategoryPicker />
      <SettingsPanel />
      <GenerateButton />
      <JobProgress />
      <VideoGrid />
      <AnalyticsPanel />
      <RecommendationPanel />
    </div>
  );
}
