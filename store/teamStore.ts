// store/teamStore.ts
// Leader 세션이 spawn 한 Teammate 상태 캐시. GET /api/team/status 의 폴링 결과 반영.

import { create } from 'zustand';

export type TriggerStatus = 'queued' | 'running' | 'completed' | 'failed';

export interface TeammateState {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

interface TeamState {
  currentScenario: string | null;
  triggerStatus: TriggerStatus | null;
  activeTeammates: string[];
  completedTeammates: string[];
  errorMessage: string | null;

  setScenario: (code: string | null) => void;
  setTriggerStatus: (status: TriggerStatus | null) => void;
  setActiveTeammates: (list: string[]) => void;
  setCompletedTeammates: (list: string[]) => void;
  setErrorMessage: (msg: string | null) => void;
  clear: () => void;
}

const initial = {
  currentScenario: null,
  triggerStatus: null,
  activeTeammates: [],
  completedTeammates: [],
  errorMessage: null,
};

export const useTeamStore = create<TeamState>((set) => ({
  ...initial,
  setScenario: (currentScenario) => set({ currentScenario }),
  setTriggerStatus: (triggerStatus) => set({ triggerStatus }),
  setActiveTeammates: (activeTeammates) => set({ activeTeammates }),
  setCompletedTeammates: (completedTeammates) => set({ completedTeammates }),
  setErrorMessage: (errorMessage) => set({ errorMessage }),
  clear: () => set(initial),
}));
