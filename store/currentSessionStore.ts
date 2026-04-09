// store/currentSessionStore.ts
// 현재 대시보드 세션 상태. 카테고리 선택, 현재 trigger/job, 폴링 on/off.
// 새로고침 시 초기화되는 휘발성 상태 (persist 아님).

import { create } from 'zustand';

export type CategoryCode =
  | 'love-psychology'
  | 'unknown-facts'
  | 'money-habits'
  | 'relationships'
  | 'self-improvement';

interface CurrentSessionState {
  category: CategoryCode | null;
  currentTriggerId: string | null;
  currentJobId: string | null;
  pollingEnabled: boolean;

  setCategory: (c: CategoryCode | null) => void;
  setCurrentTriggerId: (id: string | null) => void;
  setCurrentJobId: (id: string | null) => void;
  setPollingEnabled: (enabled: boolean) => void;
  reset: () => void;
}

const initial = {
  category: null,
  currentTriggerId: null,
  currentJobId: null,
  pollingEnabled: false,
};

export const useCurrentSessionStore = create<CurrentSessionState>((set) => ({
  ...initial,
  setCategory: (category) => set({ category }),
  setCurrentTriggerId: (currentTriggerId) => set({ currentTriggerId }),
  setCurrentJobId: (currentJobId) => set({ currentJobId }),
  setPollingEnabled: (pollingEnabled) => set({ pollingEnabled }),
  reset: () => set(initial),
}));
