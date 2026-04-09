// store/jobsStore.ts
// API GET /api/jobs 로 받은 잡 히스토리 + 현재 jobDetail 캐시.
// /history 페이지 및 VideoCard 목록 데이터 소스.

import { create } from 'zustand';

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';
export type ItemStage = 'content' | 'voice' | 'subtitle' | 'video' | 'done';
export type ItemStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface JobSummary {
  jobId: string;
  triggerId: string;
  category: string;
  status: JobStatus;
  createdAt: string;
  completedAt: string | null;
  itemCount: number;
  completedItemCount: number;
}

export interface JobItemDetail {
  index: number;
  stage: ItemStage;
  progress: number;
  status: ItemStatus;
  script: unknown | null;
  caption: string | null;
  hashtags: string[];
  outputPath: string | null;
  error: string | null;
  updatedAt: string;
}

export interface JobDetail {
  jobId: string;
  triggerId: string;
  status: JobStatus;
  category: string;
  createdAt: string;
  completedAt: string | null;
  items: JobItemDetail[];
}

interface JobsState {
  jobs: JobSummary[];
  detailCache: Record<string, JobDetail>;

  setJobs: (jobs: JobSummary[]) => void;
  upsertDetail: (detail: JobDetail) => void;
  clear: () => void;
}

export const useJobsStore = create<JobsState>((set) => ({
  jobs: [],
  detailCache: {},
  setJobs: (jobs) => set({ jobs }),
  upsertDetail: (detail) =>
    set((state) => ({
      detailCache: { ...state.detailCache, [detail.jobId]: detail },
    })),
  clear: () => set({ jobs: [], detailCache: {} }),
}));
