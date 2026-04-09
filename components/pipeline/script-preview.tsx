'use client';

// components/pipeline/script-preview.tsx
// VideoCard 의 "대본 보기" 다이얼로그. 훅 + 5문장 + contentQa 표시.

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollText } from 'lucide-react';

interface ScriptPreviewProps {
  hook: string | null;
  sentences: string[];
  caption: string | null;
  itemIndex: number;
}

export function ScriptPreview({ hook, sentences, caption, itemIndex }: ScriptPreviewProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <ScrollText className="mr-1 h-3 w-3" />
          대본 보기
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>아이템 #{itemIndex + 1} 대본</DialogTitle>
          <DialogDescription>
            hook-critic 승인(PASS) 후의 최종 대본입니다.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          {hook && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">훅 (첫 3초)</p>
              <p className="rounded-md bg-primary/5 border border-primary/20 px-3 py-2">
                {hook}
              </p>
            </div>
          )}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1">
              5문장 대본 ({sentences.length}개)
            </p>
            <ol className="list-decimal list-inside space-y-1">
              {sentences.map((s, i) => (
                <li key={i} className="text-sm">
                  {s}
                </li>
              ))}
            </ol>
          </div>
          {caption && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-1">캡션</p>
              <p className="rounded-md bg-muted px-3 py-2 whitespace-pre-wrap">{caption}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
