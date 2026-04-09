// store/settingsStore.ts
// TTS 설정 persist 스토어. zustand/middleware persist(localStorage) 사용.
// Phase 2 P2-T02: version 1 → 2. presetsByCategory 맵 추가로 카테고리별 voiceId/speed/backgroundFilter 기억.
// Phase 2 P2-T07: karaokeEnabled 토글 추가(version 유지). 기본값 false → 백워드 호환.
// 기존 v1 사용자의 voiceId/speed/backgroundFilter는 migrate 시 보존된다.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import type { CategoryPreset } from '@/lib/team/types';

interface SettingsState {
  voiceId: number;
  speed: number;
  backgroundFilter: string | null;
  /** 카테고리 코드 → 프리셋. 기본값은 빈 맵. */
  presetsByCategory: Record<string, CategoryPreset>;
  /** P2-T07: 카라오케 자막(\k 태그) 모드. true면 어절 단위 강조. */
  karaokeEnabled: boolean;

  setVoiceId: (id: number) => void;
  setSpeed: (v: number) => void;
  setBackgroundFilter: (f: string | null) => void;
  /** 현재 voiceId/speed/backgroundFilter를 지정 카테고리의 기본값으로 저장. */
  saveAsCategoryDefault: (category: string) => void;
  /** 해당 카테고리 프리셋이 존재하면 현재 값으로 로드. 없으면 no-op. */
  applyCategoryPreset: (category: string) => void;
  /** 해당 카테고리 프리셋만 삭제. */
  clearCategoryPreset: (category: string) => void;
  /** P2-T07: 카라오케 모드 토글. */
  setKaraokeEnabled: (v: boolean) => void;
  reset: () => void;
}

const DEFAULTS = {
  voiceId: 0,
  speed: 1.0,
  backgroundFilter: null as string | null,
  presetsByCategory: {} as Record<string, CategoryPreset>,
  karaokeEnabled: false,
};

/**
 * v1 → v2 마이그레이션.
 * v1에는 presetsByCategory가 없으므로 빈 객체로 초기화.
 * 기존 voiceId/speed/backgroundFilter는 보존.
 */
interface PersistedV1 {
  voiceId?: number;
  speed?: number;
  backgroundFilter?: string | null;
}

interface PersistedV2 extends PersistedV1 {
  presetsByCategory?: Record<string, CategoryPreset>;
  /** P2-T07: 카라오케 자막 토글. v2 에 신규 필드(optional, 기본 false). */
  karaokeEnabled?: boolean;
}

function migrate(persistedState: unknown, version: number): PersistedV2 {
  if (version < 2) {
    // v1(또는 그 이전) → v2
    const v1 = (persistedState ?? {}) as PersistedV1;
    return {
      voiceId: v1.voiceId ?? DEFAULTS.voiceId,
      speed: v1.speed ?? DEFAULTS.speed,
      backgroundFilter: v1.backgroundFilter ?? DEFAULTS.backgroundFilter,
      presetsByCategory: {},
      karaokeEnabled: false,
    };
  }
  // v2 이미 저장된 경우 — karaokeEnabled 누락 방어
  const v2 = (persistedState ?? {}) as PersistedV2;
  return {
    ...v2,
    karaokeEnabled: v2.karaokeEnabled ?? false,
  };
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...DEFAULTS,
      setVoiceId: (voiceId) => set({ voiceId }),
      setSpeed: (speed) => {
        const clamped = Math.min(1.3, Math.max(0.8, speed));
        set({ speed: clamped });
      },
      setBackgroundFilter: (backgroundFilter) => set({ backgroundFilter }),
      saveAsCategoryDefault: (category) => {
        if (!category) return;
        const { voiceId, speed, backgroundFilter, presetsByCategory } = get();
        set({
          presetsByCategory: {
            ...presetsByCategory,
            [category]: { voiceId, speed, backgroundFilter },
          },
        });
      },
      applyCategoryPreset: (category) => {
        if (!category) return;
        const preset = get().presetsByCategory[category];
        if (!preset) return;
        set({
          voiceId: preset.voiceId,
          speed: preset.speed,
          backgroundFilter: preset.backgroundFilter,
        });
      },
      clearCategoryPreset: (category) => {
        if (!category) return;
        const next = { ...get().presetsByCategory };
        delete next[category];
        set({ presetsByCategory: next });
      },
      setKaraokeEnabled: (karaokeEnabled) => set({ karaokeEnabled }),
      reset: () => set(DEFAULTS),
    }),
    {
      name: 'tiktok-automation-settings',
      storage: createJSONStorage(() => localStorage),
      version: 2,
      migrate: (persistedState, version) => migrate(persistedState, version) as SettingsState,
    },
  ),
);
