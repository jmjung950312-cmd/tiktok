'use client';

// components/pipeline/job-progress.tsx
// 섹션 4 — 진행 상태 패널. Teammate Badge + 아이템 5개 단계별 Badge.
// 2초 간격으로 /api/team/status + /api/jobs/[jobId] 폴링.

import { useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { TeammateStatus } from './teammate-status';

import { useCurrentSessionStore } from '@/store/currentSessionStore';
import { useJobsStore, type JobDetail } from '@/store/jobsStore';
import { useTeamStore, type TriggerStatus } from '@/store/teamStore';
import { JOB_POLLING_INTERVAL_MS } from '@/lib/constants';

interface StatusResponse {
  triggerId: string;
  scenario: string;
  status: TriggerStatus;
  activeTeammates: string[];
  completedTeammates: string[];
  errorMessage: string | null;
}

const STAGE_LABEL: Record<string, string> = {
  content: '콘텐츠',
  voice: 'TTS',
  subtitle: '자막',
  video: '영상',
  done: '완료',
};

export function JobProgress() {
  const triggerId = useCurrentSessionStore((s) => s.currentTriggerId);
  const jobId = useCurrentSessionStore((s) => s.currentJobId);
  const setCurrentJobId = useCurrentSessionStore((s) => s.setCurrentJobId);
  const pollingEnabled = useCurrentSessionStore((s) => s.pollingEnabled);
  const setPollingEnabled = useCurrentSessionStore((s) => s.setPollingEnabled);

  const upsertDetail = useJobsStore((s) => s.upsertDetail);
  const detail: JobDetail | undefined = useJobsStore((s) =>
    jobId ? s.detailCache[jobId] : undefined,
  );

  const team = useTeamStore();

  useEffect(() => {
    if (!pollingEnabled || !triggerId) return;

    let cancelled = false;

    const tick = async (): Promise<void> => {
      try {
        // 1) trigger status
        const statusRes = await fetch(`/api/team/status?triggerId=${triggerId}`, {
          cache: 'no-store',
        });
        if (statusRes.ok) {
          const sdata = (await statusRes.json()) as StatusResponse;
          if (cancelled) return;
          team.setScenario(sdata.scenario);
          team.setTriggerStatus(sdata.status);
          team.setActiveTeammates(sdata.activeTeammates);
          team.setCompletedTeammates(sdata.completedTeammates);
          team.setErrorMessage(sdata.errorMessage);
        }

        // 2) jobId 가 없으면 jobs 목록에서 triggerId 매칭
        if (!jobId) {
          const jobsRes = await fetch('/api/jobs?limit=10', { cache: 'no-store' });
          if (jobsRes.ok) {
            const jdata = (await jobsRes.json()) as {
              jobs: Array<{ jobId: string; triggerId: string }>;
            };
            const match = jdata.jobs.find((j) => j.triggerId === triggerId);
            if (match) setCurrentJobId(match.jobId);
          }
        } else {
          const dRes = await fetch(`/api/jobs/${jobId}`, { cache: 'no-store' });
          if (dRes.ok) {
            const detailBody = (await dRes.json()) as JobDetail;
            if (!cancelled) upsertDetail(detailBody);
            if (detailBody.status === 'completed' || detailBody.status === 'failed') {
              setPollingEnabled(false);
            }
          }
        }
      } catch {
        // 네트워크 에러는 조용히 무시 (다음 tick 재시도)
      }
    };

    void tick();
    const id = setInterval(() => void tick(), JOB_POLLING_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [pollingEnabled, triggerId, jobId, setCurrentJobId, setPollingEnabled, upsertDetail, team]);

  if (!triggerId) {
    return (
      <section aria-labelledby="job-progress-title" className="space-y-3">
        <h2 id="job-progress-title" className="text-xl font-semibold">
          4. 진행 상태
        </h2>
        <Card className="text-muted-foreground p-6 text-center text-sm">
          아직 트리거가 없습니다. 위에서 &quot;5개 자동 생성&quot; 버튼을 눌러 시작하세요.
        </Card>
      </section>
    );
  }

  const totalProgress = detail
    ? Math.round(
        detail.items.reduce((sum, item) => sum + item.progress, 0) /
          Math.max(detail.items.length, 1),
      )
    : team.triggerStatus === 'queued'
      ? 5
      : team.triggerStatus === 'running'
        ? 25
        : 0;

  return (
    <section aria-labelledby="job-progress-title" className="space-y-4">
      <h2 id="job-progress-title" className="text-xl font-semibold">
        4. 진행 상태
      </h2>

      <Card className="space-y-4 p-5">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span>전체 진행률</span>
            <span className="font-mono">{totalProgress}%</span>
          </div>
          <Progress value={totalProgress} />
        </div>

        <div>
          <p className="text-muted-foreground mb-2 text-xs">Teammate 상태 (시나리오 A 5명)</p>
          <TeammateStatus
            activeTeammates={team.activeTeammates}
            completedTeammates={team.completedTeammates}
            failed={team.triggerStatus === 'failed'}
          />
        </div>

        {detail && (
          <div>
            <p className="text-muted-foreground mb-2 text-xs">아이템 단계</p>
            <div className="flex flex-wrap gap-2">
              {detail.items.map((item) => (
                <Badge
                  key={item.index}
                  variant={
                    item.status === 'completed'
                      ? 'secondary'
                      : item.status === 'failed'
                        ? 'destructive'
                        : item.status === 'running'
                          ? 'default'
                          : 'outline'
                  }
                >
                  #{item.index + 1} · {STAGE_LABEL[item.stage] ?? item.stage} · {item.progress}%
                </Badge>
              ))}
            </div>
          </div>
        )}

        {team.errorMessage && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>실패</AlertTitle>
            <AlertDescription>{team.errorMessage}</AlertDescription>
          </Alert>
        )}
      </Card>
    </section>
  );
}
