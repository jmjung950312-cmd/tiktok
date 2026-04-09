'use client';

// components/pipeline/script-editor.tsx
// P2-T10: VideoCard 의 "대본 편집" Dialog.
// React Hook Form fieldArray 5문장 + zodResolver. 저장 시
// POST /api/jobs/[jobId]/rerender { itemIndex, newSentences } 를 호출하여
// 결정론 파이프라인만 재실행한다(LLM 토큰 0).

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Pencil } from 'lucide-react';

const ScriptEditSchema = z.object({
  sentences: z
    .array(
      z.object({
        value: z.string().min(1, '문장은 1자 이상').max(200, '문장은 200자 이하'),
      }),
    )
    .length(5, '5문장이 필요합니다'),
});

type FormValues = z.infer<typeof ScriptEditSchema>;

interface ScriptEditorProps {
  jobId: string;
  itemIndex: number;
  /** 현재 sentences 5개 */
  sentences: string[];
  onRequested?: () => void;
}

export function ScriptEditor({ jobId, itemIndex, sentences, onRequested }: ScriptEditorProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // sentences 길이가 5가 아닐 때 안전 패딩(예외 방어 — UI는 보통 5 보장)
  const padded: string[] = [0, 1, 2, 3, 4].map((i) => sentences[i] ?? '');

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(ScriptEditSchema),
    defaultValues: { sentences: padded.map((value) => ({ value })) },
  });

  const { fields } = useFieldArray({ control, name: 'sentences' });

  const handleOpenChange = (next: boolean): void => {
    setOpen(next);
    if (next) {
      // 다이얼로그를 다시 열 때 항상 최신 sentences 로 reset
      reset({ sentences: padded.map((value) => ({ value })) });
    }
  };

  const onSubmit = async (values: FormValues): Promise<void> => {
    setSubmitting(true);
    try {
      const newSentences = values.sentences.map((s) => s.value);
      const res = await fetch(`/api/jobs/${jobId}/rerender`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIndex, newSentences }),
      });
      if (res.status === 409) {
        toast.warning('이미 재렌더 중', {
          description: `아이템 #${itemIndex + 1} 은 진행 중인 작업이 끝난 후 다시 시도하세요.`,
        });
        return;
      }
      if (!res.ok) {
        const detail = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}${detail ? ` — ${detail.slice(0, 160)}` : ''}`);
      }
      toast.success('대본 저장 + 재렌더 시작', {
        description: `아이템 #${itemIndex + 1} · LLM 토큰 0`,
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="mr-1 h-3 w-3" />
          대본 편집
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>아이템 #{itemIndex + 1} · 대본 편집</DialogTitle>
          <DialogDescription>
            5문장을 직접 수정한 뒤 저장하면 결정론 파이프라인만 재실행됩니다(LLM 토큰 0). 첫 문장이
            훅으로 사용됩니다.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-3" onSubmit={handleSubmit(onSubmit)}>
          {fields.map((field, idx) => {
            const fieldError = errors.sentences?.[idx]?.value?.message;
            return (
              <div key={field.id} className="space-y-1">
                <Label htmlFor={`sent-${itemIndex}-${idx}`}>
                  {idx === 0 ? '훅 (1문장)' : `${idx + 1}문장`}
                </Label>
                <Textarea
                  id={`sent-${itemIndex}-${idx}`}
                  rows={2}
                  {...register(`sentences.${idx}.value` as const)}
                />
                {fieldError && <p className="text-destructive text-xs">{fieldError}</p>}
              </div>
            );
          })}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              취소
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? '재렌더 요청 중…' : '저장 + 재렌더'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
