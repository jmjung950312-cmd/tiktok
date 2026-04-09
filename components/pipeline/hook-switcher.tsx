'use client';

// components/pipeline/hook-switcher.tsx
// P2-T06: VideoCard 의 "훅 변경" Dialog.
// 원본 + 대안 2개(총 3개) radio 옵션 → 선택 시 sentences[0] 만 교체하여
// POST /api/jobs/[jobId]/rerender (P2-T10) 를 호출한다.
// LLM 토큰 0 — 결정론 파이프라인만 재실행된다.

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { Sparkles } from 'lucide-react';

interface HookSwitcherProps {
  jobId: string;
  itemIndex: number;
  /** 원본 sentences[0] (현재 사용 중인 훅) */
  originalHook: string;
  /** 그대로 보존할 sentences[1..4] (재렌더 시 함께 전송) */
  remainingSentences: string[];
  /** hook-critic 이 생성한 대안 2개. 없으면 버튼이 비활성화되어야 함 */
  alternatives: string[] | null | undefined;
  onRequested?: () => void;
}

export function HookSwitcher({
  jobId,
  itemIndex,
  originalHook,
  remainingSentences,
  alternatives,
  onRequested,
}: HookSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState<string>('original');

  const hasAlternatives = Array.isArray(alternatives) && alternatives.length === 2;

  // 3개 옵션 구성: original, alt-0, alt-1
  const options: Array<{ id: string; label: string; text: string }> = [
    { id: 'original', label: '원본', text: originalHook },
    ...(hasAlternatives
      ? [
          { id: 'alt-0', label: '대안 1', text: alternatives![0] },
          { id: 'alt-1', label: '대안 2', text: alternatives![1] },
        ]
      : []),
  ];

  const handleConfirm = async (): Promise<void> => {
    const picked = options.find((o) => o.id === selected);
    if (!picked) return;
    if (picked.id === 'original') {
      // 원본 그대로면 재렌더 불필요
      setOpen(false);
      toast.info('원본 훅 유지', { description: '재렌더가 필요하지 않습니다.' });
      return;
    }

    setSubmitting(true);
    try {
      // sentences[0] 만 선택된 훅으로 교체한 5문장 배열 전송
      const newSentences = [picked.text, ...remainingSentences];
      const res = await fetch(`/api/jobs/${jobId}/rerender`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemIndex,
          newSentences,
        }),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}${detail ? ` — ${detail.slice(0, 120)}` : ''}`);
      }
      toast.success('훅 변경 + 재렌더 요청 완료', {
        description: `아이템 #${itemIndex + 1} · ${picked.label}`,
      });
      onRequested?.();
      setOpen(false);
    } catch (err) {
      toast.error('재렌더 실패', { description: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={!hasAlternatives}
          title={hasAlternatives ? '훅 3종 중 선택' : 'hookAlternatives 없음 — 새 잡에서 활성화'}
        >
          <Sparkles className="mr-1 h-3 w-3" />훅 변경
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>아이템 #{itemIndex + 1} · 훅 변경</DialogTitle>
          <DialogDescription>
            원본 + hook-critic 대안 2개 중 1개를 선택하면 해당 아이템만 결정론 파이프라인이
            재실행됩니다(LLM 토큰 0).
          </DialogDescription>
        </DialogHeader>

        <RadioGroup value={selected} onValueChange={setSelected} className="gap-3">
          {options.map((opt) => (
            <label
              key={opt.id}
              htmlFor={`hook-opt-${itemIndex}-${opt.id}`}
              className="border-input hover:bg-accent/40 flex cursor-pointer items-start gap-3 rounded-md border p-3"
            >
              <RadioGroupItem
                id={`hook-opt-${itemIndex}-${opt.id}`}
                value={opt.id}
                className="mt-1"
              />
              <div className="flex-1 space-y-1">
                <p className="text-muted-foreground text-xs font-semibold">{opt.label}</p>
                <p className="text-sm leading-relaxed">{opt.text}</p>
              </div>
            </label>
          ))}
        </RadioGroup>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>
            취소
          </Button>
          <Button onClick={handleConfirm} disabled={submitting}>
            {submitting ? '재렌더 요청 중…' : '선택 확정'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
