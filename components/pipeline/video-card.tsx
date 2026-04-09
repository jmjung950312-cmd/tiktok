'use client';

// components/pipeline/video-card.tsx
// 섹션 5 — VideoCard 1개. <video> 미리보기 + 대본/캡션/다운로드/재생성 버튼.

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Download, ClipboardCopy, RotateCcw } from 'lucide-react';
import { ScriptPreview } from './script-preview';
import { HookSwitcher } from './hook-switcher';
import { ScriptEditor } from './script-editor';
import type { JobItemDetail } from '@/store/jobsStore';

interface VideoCardProps {
  jobId: string;
  item: JobItemDetail;
  onRegenerate?: (itemIndex: number) => void;
}

interface ScriptJson {
  hook?: string;
  sentences?: string[];
  /** P2-T06: hook-critic가 생성한 대안 훅 2개. 없으면 null. */
  hookAlternatives?: string[] | null;
}

export function VideoCard({ jobId, item, onRegenerate }: VideoCardProps) {
  const [regenerating, setRegenerating] = useState(false);

  const script = (item.script ?? null) as ScriptJson | null;
  const sentences = script?.sentences ?? [];
  const hook = script?.hook ?? null;
  const hookAlternatives = script?.hookAlternatives ?? null;

  const filename = item.outputPath ? (item.outputPath.split('/').pop() ?? null) : null;
  const src = filename ? `/api/outputs/${encodeURIComponent(filename)}` : null;
  // P2-T05: 파일 명명 규칙 <stem>.mp4 → <stem>_thumb.jpg 로 썸네일 URL 유추.
  // 백엔드에서 추출 실패한 경우 404가 되며 <video poster>는 자연스럽게 빈 화면이 된다.
  const thumbnailFilename = filename ? filename.replace(/\.mp4$/i, '_thumb.jpg') : null;
  const posterSrc = thumbnailFilename
    ? `/api/outputs/${encodeURIComponent(thumbnailFilename)}`
    : undefined;

  const handleCopyCaption = async (): Promise<void> => {
    if (!item.caption) return;
    const text = [item.caption, item.hashtags.join(' ')].filter(Boolean).join('\n\n');
    try {
      await navigator.clipboard.writeText(text);
      toast.success('캡션 + 해시태그 복사됨');
    } catch {
      toast.error('클립보드 접근 실패');
    }
  };

  const handleRegenerate = async (): Promise<void> => {
    setRegenerating(true);
    try {
      const res = await fetch('/api/team/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario: 'F',
          jobId,
          itemIndex: item.index,
          reason: '사용자 재생성 요청',
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success('재생성 요청 완료', {
        description: `아이템 #${item.index + 1} · 시나리오 F`,
      });
      onRegenerate?.(item.index);
    } catch (err) {
      toast.error('재생성 실패', { description: (err as Error).message });
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="bg-muted flex aspect-[9/16] items-center justify-center">
        {src ? (
          <video
            src={src}
            poster={posterSrc}
            controls
            preload="metadata"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="text-muted-foreground px-3 text-center text-xs">
            <div>아이템 #{item.index + 1}</div>
            <div className="mt-1">
              {item.status === 'failed' ? '실패' : `${item.progress}% (${item.stage})`}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2 p-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold">#{item.index + 1}</span>
          <Badge
            variant={
              item.status === 'completed'
                ? 'secondary'
                : item.status === 'failed'
                  ? 'destructive'
                  : 'outline'
            }
          >
            {item.status}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <ScriptPreview
            hook={hook}
            sentences={sentences}
            caption={item.caption}
            itemIndex={item.index}
          />
          <HookSwitcher
            jobId={jobId}
            itemIndex={item.index}
            originalHook={sentences[0] ?? hook ?? ''}
            remainingSentences={sentences.slice(1)}
            alternatives={hookAlternatives}
            onRequested={() => onRegenerate?.(item.index)}
          />
          <ScriptEditor
            jobId={jobId}
            itemIndex={item.index}
            sentences={sentences}
            onRequested={() => onRegenerate?.(item.index)}
          />
          <Button variant="outline" size="sm" onClick={handleCopyCaption} disabled={!item.caption}>
            <ClipboardCopy className="mr-1 h-3 w-3" />
            캡션
          </Button>
          <Button variant="outline" size="sm" asChild disabled={!src}>
            {src ? (
              <a href={src} download={filename ?? undefined}>
                <Download className="mr-1 h-3 w-3" />
                다운로드
              </a>
            ) : (
              <span>
                <Download className="mr-1 h-3 w-3" />
                다운로드
              </span>
            )}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleRegenerate} disabled={regenerating}>
            <RotateCcw className="mr-1 h-3 w-3" />
            재생성
          </Button>
        </div>
      </div>
    </Card>
  );
}
