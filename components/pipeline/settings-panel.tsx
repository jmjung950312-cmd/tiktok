'use client';

// components/pipeline/settings-panel.tsx
// 섹션 2 — Collapsible 설정 패널. TTS 화자, 속도, 배경 필터.
// Phase 2 P2-T02: 현재 카테고리의 프리셋 저장/적용/초기화 버튼.

import { useState } from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group';
import {
  ChevronDown,
  ChevronUp,
  Settings2,
  Save,
  RotateCcw,
} from 'lucide-react';
import { useSettingsStore } from '@/store/settingsStore';
import { useCurrentSessionStore } from '@/store/currentSessionStore';
import { toast } from 'sonner';

const BACKGROUND_FILTERS = [
  { value: 'all', label: '전체' },
  { value: 'calm', label: '차분' },
  { value: 'bright', label: '밝은' },
  { value: 'dark', label: '어두운' },
];

export function SettingsPanel() {
  const [open, setOpen] = useState(false);
  const voiceId = useSettingsStore((s) => s.voiceId);
  const speed = useSettingsStore((s) => s.speed);
  const backgroundFilter = useSettingsStore((s) => s.backgroundFilter);
  const presetsByCategory = useSettingsStore((s) => s.presetsByCategory);
  const setVoiceId = useSettingsStore((s) => s.setVoiceId);
  const setSpeed = useSettingsStore((s) => s.setSpeed);
  const setBackgroundFilter = useSettingsStore((s) => s.setBackgroundFilter);
  const saveAsCategoryDefault = useSettingsStore((s) => s.saveAsCategoryDefault);
  const clearCategoryPreset = useSettingsStore((s) => s.clearCategoryPreset);

  const category = useCurrentSessionStore((s) => s.category);
  const hasPresetForCurrent = category != null && Boolean(presetsByCategory[category]);

  const handleSavePreset = (): void => {
    if (!category) {
      toast.error('먼저 카테고리를 선택하세요.');
      return;
    }
    saveAsCategoryDefault(category);
    toast.success(`"${category}" 카테고리의 기본 설정으로 저장했습니다.`);
  };

  const handleClearPreset = (): void => {
    if (!category) return;
    clearCategoryPreset(category);
    toast.success(`"${category}" 카테고리 프리셋을 초기화했습니다.`);
  };

  return (
    <section aria-labelledby="settings-panel-title">
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-center justify-between">
          <h2 id="settings-panel-title" className="text-xl font-semibold">
            2. 설정 (선택)
          </h2>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1">
              <Settings2 className="h-4 w-4" />
              {open ? '접기' : '펼치기'}
              {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent className="mt-4">
          <div className="rounded-lg border bg-card p-4 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="voice-select">TTS 화자</Label>
              <Select
                value={String(voiceId)}
                onValueChange={(v) => setVoiceId(Number(v))}
              >
                <SelectTrigger id="voice-select" className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">MeloTTS 한국어 (기본)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Phase 1 은 MeloTTS 단일 화자. Phase 2 에서 다화자 프리셋 추가 예정.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="speed-slider">
                낭독 속도 — <span className="font-mono">{speed.toFixed(2)}</span>
              </Label>
              <Slider
                id="speed-slider"
                value={[speed]}
                min={0.8}
                max={1.3}
                step={0.05}
                onValueChange={(values) => setSpeed(values[0])}
                className="w-full max-w-md"
              />
            </div>

            <div className="space-y-2">
              <Label>배경 영상 필터</Label>
              <ToggleGroup
                type="single"
                value={backgroundFilter ?? 'all'}
                onValueChange={(v) => {
                  if (!v) return;
                  setBackgroundFilter(v === 'all' ? null : v);
                }}
                className="flex-wrap justify-start"
              >
                {BACKGROUND_FILTERS.map((f) => (
                  <ToggleGroupItem key={f.value} value={f.value}>
                    {f.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>

            {/* Phase 2 P2-T02: 카테고리별 프리셋 */}
            <div className="border-t pt-4 space-y-2">
              <Label>카테고리 프리셋</Label>
              <p className="text-xs text-muted-foreground">
                {category
                  ? `현재 선택된 카테고리: "${category}". 이 값들을 기본으로 저장하면 다음에 해당 카테고리를 선택할 때 자동 적용됩니다.`
                  : '카테고리를 먼저 선택해야 프리셋을 저장할 수 있습니다.'}
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button
                  variant="secondary"
                  size="sm"
                  className="gap-1"
                  onClick={handleSavePreset}
                  disabled={!category}
                  aria-label="이 카테고리 기본값으로 저장"
                >
                  <Save className="h-4 w-4" />
                  이 카테고리 기본값으로
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1"
                  onClick={handleClearPreset}
                  disabled={!hasPresetForCurrent}
                  aria-label="카테고리 프리셋 초기화"
                >
                  <RotateCcw className="h-4 w-4" />
                  프리셋 초기화
                </Button>
              </div>
              {hasPresetForCurrent && (
                <p className="text-xs text-muted-foreground">
                  ✓ 이 카테고리에 저장된 프리셋이 있습니다.
                </p>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </section>
  );
}
