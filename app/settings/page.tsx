// app/settings/page.tsx
// 팀 상태 + 기능 요청 폼 + 기타 설정 안내.

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FeatureRequestForm } from '@/components/dev/feature-request-form';
import { SCENARIO_A_TEAMMATES } from '@/lib/constants';

export const metadata = {
  title: '설정',
};

const ALL_TEAMMATES = [
  ...SCENARIO_A_TEAMMATES,
  'frontend-builder',
  'backend-builder',
  'code-reviewer',
  'metrics-analyst',
  'trend-analyst',
  'preference-learner',
  'prompt-tuner',
] as const;

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6 sm:px-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold">설정</h1>
        <p className="text-sm text-muted-foreground">
          팀 Teammate 상태와 기능 요청 폼, 파일/파이프라인 설정을 관리합니다.
        </p>
      </div>

      <Card className="p-6 space-y-3">
        <h2 className="text-lg font-semibold">Teammate 풀</h2>
        <p className="text-xs text-muted-foreground">
          tiktok-ops-team 에 등록된 12명 + 기존 10 범용 에이전트 = 21 풀. 동시 활성 최대 5명.
        </p>
        <div className="flex flex-wrap gap-2">
          {ALL_TEAMMATES.map((name) => (
            <Badge key={name} variant="outline">
              {name}
            </Badge>
          ))}
        </div>
      </Card>

      <FeatureRequestForm />

      <Card className="p-6 space-y-2">
        <h2 className="text-lg font-semibold">기타 설정</h2>
        <p className="text-sm text-muted-foreground">
          파일 규칙, TTS 프리셋, 배경 카테고리 관리 UI 는 Phase 2 에서 추가됩니다.
        </p>
      </Card>
    </div>
  );
}
