'use client';

// components/dev/feature-request-form.tsx
// /settings 페이지의 시나리오 B 기능 요청 폼.
// P2-T08: skeleton → active. POST /api/team/trigger 로 실제 전송.
// R-18 대응: 제출 직전 dev 서버 일시정지 권고 토스트.

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

const FeatureRequestSchema = z.object({
  title: z.string().min(3, '제목은 3자 이상').max(80),
  description: z.string().min(10, '설명은 10자 이상').max(1000),
  priority: z.enum(['low', 'medium', 'high']),
});

type FormValues = z.infer<typeof FeatureRequestSchema>;

/**
 * 폼 3필드를 시나리오 B payload 의 단일 request 문자열로 직렬화.
 * Leader 가 frontend/backend builder 에게 위임할 때 그대로 분석할 수 있도록
 * Markdown 포맷으로 보존한다.
 */
function buildRequestText(values: FormValues): string {
  return [
    `# ${values.title}`,
    ``,
    `우선순위: ${values.priority}`,
    ``,
    `## 상세`,
    values.description.trim(),
  ].join('\n');
}

export function FeatureRequestForm() {
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(FeatureRequestSchema),
    defaultValues: { title: '', description: '', priority: 'medium' },
  });

  const priority = watch('priority');

  const onSubmit = async (values: FormValues): Promise<void> => {
    setSubmitting(true);
    // R-18 안내 — 토큰 소비량이 큰 plan mode × Opus 가동이므로 dev 서버 멈춤 권고
    toast.warning('시나리오 B 가동 중', {
      description:
        'plan mode × Opus 3중첩으로 토큰 소비가 큽니다. 가능하면 next dev 서버를 일시 정지하세요.',
      duration: 6000,
    });

    try {
      const res = await fetch('/api/team/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario: 'B',
          request: buildRequestText(values),
        }),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}${detail ? ` — ${detail.slice(0, 160)}` : ''}`);
      }
      const json = (await res.json()) as { triggerId?: string };
      toast.success('시나리오 B 트리거 큐 등록 완료', {
        description: json.triggerId ? `triggerId: ${json.triggerId.slice(0, 8)}…` : undefined,
      });
      reset();
    } catch (err) {
      toast.error('시나리오 B 트리거 실패', {
        description: (err as Error).message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="space-y-4 p-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">기능 요청 / 버그 리포트 (시나리오 B)</h2>
        <p className="text-muted-foreground text-xs">
          frontend-builder + backend-builder + code-reviewer 3명에게 계획 승인 모드로 위임. Leader
          세션이 큐에서 집어가는 즉시 가동됩니다.
        </p>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>R-15 토큰 주의</AlertTitle>
        <AlertDescription>
          plan mode × Opus 3중첩으로 토큰 소비가 큽니다(실측 리포트
          docs/r15-scenario-b-measurement.md). 하루 1~2회 사용을 권장하며 dev 서버는 가동 중 일시
          정지해 주세요.
        </AlertDescription>
      </Alert>

      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-2">
          <Label htmlFor="fr-title">제목</Label>
          <Input id="fr-title" placeholder="예: 다크 모드 토글 추가" {...register('title')} />
          {errors.title && <p className="text-destructive text-xs">{errors.title.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="fr-description">상세 설명</Label>
          <Textarea
            id="fr-description"
            placeholder="기대하는 동작, 관련 화면, 재현 단계를 구체적으로 적어주세요."
            rows={5}
            {...register('description')}
          />
          {errors.description && (
            <p className="text-destructive text-xs">{errors.description.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="fr-priority">우선순위</Label>
          <Select
            value={priority}
            onValueChange={(v) => setValue('priority', v as FormValues['priority'])}
          >
            <SelectTrigger id="fr-priority" className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">낮음</SelectItem>
              <SelectItem value="medium">보통</SelectItem>
              <SelectItem value="high">높음</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button type="submit" disabled={submitting}>
          {submitting ? '큐 등록 중…' : '시나리오 B 트리거 등록'}
        </Button>
      </form>
    </Card>
  );
}
