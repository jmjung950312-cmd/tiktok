'use client';

// components/pipeline/category-picker.tsx
// 섹션 1 — 5개 카테고리 카드 그리드. 선택 시 currentSessionStore.setCategory.
// Phase 2 P2-T02: 카테고리 선택 시 settingsStore.applyCategoryPreset 자동 호출로
// 해당 카테고리의 저장된 TTS/배경 프리셋을 즉시 반영한다.

import { Card } from '@/components/ui/card';
import { CATEGORIES } from '@/lib/constants';
import { useCurrentSessionStore, type CategoryCode } from '@/store/currentSessionStore';
import { useSettingsStore } from '@/store/settingsStore';
import { cn } from '@/lib/utils';

export function CategoryPicker() {
  const category = useCurrentSessionStore((s) => s.category);
  const setCategory = useCurrentSessionStore((s) => s.setCategory);
  const applyCategoryPreset = useSettingsStore((s) => s.applyCategoryPreset);

  // 카테고리 선택 시 store 업데이트 + 저장된 프리셋 자동 적용.
  // 프리셋이 없는 카테고리는 applyCategoryPreset 내부에서 no-op 처리됨.
  const handleSelect = (code: CategoryCode): void => {
    setCategory(code);
    applyCategoryPreset(code);
  };

  return (
    <section aria-labelledby="category-picker-title" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 id="category-picker-title" className="text-xl font-semibold">
          1. 카테고리 선택
        </h2>
        <span className="text-xs text-muted-foreground">5개 중 하나를 선택하세요</span>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {CATEGORIES.map((c) => {
          const selected = category === c.code;
          return (
            <Card
              key={c.code}
              role="button"
              tabIndex={0}
              aria-pressed={selected}
              onClick={() => handleSelect(c.code)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSelect(c.code);
                }
              }}
              className={cn(
                'cursor-pointer p-4 transition-all hover:border-primary hover:shadow-sm',
                selected && 'border-primary ring-2 ring-primary/30 bg-primary/5',
              )}
            >
              <div className="text-3xl leading-none">{c.emoji}</div>
              <div className="mt-3 font-medium">{c.label}</div>
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                {c.description}
              </p>
              {selected && (
                <div className="mt-2 text-xs font-medium text-primary">✓ 선택됨</div>
              )}
            </Card>
          );
        })}
      </div>
    </section>
  );
}
