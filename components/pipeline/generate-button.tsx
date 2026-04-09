'use client';

// components/pipeline/generate-button.tsx
// 섹션 3 — "5개 자동 생성" 대형 버튼. Zod 검증 후 POST /api/team/trigger.

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Sparkles, AlertTriangle, Loader2 } from 'lucide-react';

import { useCurrentSessionStore } from '@/store/currentSessionStore';
import { useSettingsStore } from '@/store/settingsStore';
import { CATEGORIES } from '@/lib/constants';

interface TriggerResponse {
  triggerId: string;
  status: string;
  scenario: string;
}

export function GenerateButton() {
  const category = useCurrentSessionStore((s) => s.category);
  const setCurrentTriggerId = useCurrentSessionStore((s) => s.setCurrentTriggerId);
  const setPollingEnabled = useCurrentSessionStore((s) => s.setPollingEnabled);
  const voiceId = useSettingsStore((s) => s.voiceId);
  const speed = useSettingsStore((s) => s.speed);
  const backgroundFilter = useSettingsStore((s) => s.backgroundFilter);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClick = async (): Promise<void> => {
    setError(null);
    if (!category) {
      setError('카테고리를 먼저 선택하세요.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        scenario: 'A' as const,
        category,
        count: 5 as const,
        settings: {
          voiceId,
          speed,
          backgroundFilter,
        },
      };
      const res = await fetch('/api/team/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as TriggerResponse;
      setCurrentTriggerId(data.triggerId);
      setPollingEnabled(true);
      toast.success('생성 요청 완료', {
        description: `시나리오 A / triggerId=${data.triggerId.slice(0, 8)}…`,
      });
    } catch (err) {
      const msg = (err as Error).message;
      setError(msg);
      toast.error('요청 실패', { description: msg });
    } finally {
      setLoading(false);
    }
  };

  const selectedLabel = CATEGORIES.find((c) => c.code === category)?.label ?? '카테고리 미선택';

  return (
    <section aria-labelledby="generate-button-title" className="space-y-3">
      <h2 id="generate-button-title" className="text-xl font-semibold">
        3. 자동 생성
      </h2>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="text-muted-foreground text-sm">
          현재 선택: <span className="text-foreground font-medium">{selectedLabel}</span>
        </div>
        <Button
          size="lg"
          onClick={onClick}
          disabled={loading || !category}
          className="h-12 px-8 text-base"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              요청 전송 중…
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              5개 자동 생성
            </>
          )}
        </Button>
      </div>
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>요청을 보낼 수 없습니다</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </section>
  );
}
