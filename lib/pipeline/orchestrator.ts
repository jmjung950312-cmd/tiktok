// lib/pipeline/orchestrator.ts
// final-content.json → 5개 mp4 순차 실행 오케스트레이터.
// 각 아이템 단계마다 job_items 진행률을 DB 에 갱신하고, 완료 시 jobs.status 를 업데이트.

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { loadFinalContent } from './content-loader';
import { synthesizeScript } from './voice';
import { buildAssSubtitle, type SubtitleMode } from './subtitle';
import { composeVideo } from './video';

import {
  listItemsByJob,
  updateJobItem,
  updateJobStatus,
  getJobById,
  insertJobItem,
} from '../db/repo';

import type { BaseSettings, FinalContent, FinalContentItem } from '../team/types';

export interface RunPipelineOptions {
  /** 특정 아이템만 재생성 (시나리오 F). 없으면 5개 전부 */
  onlyItemIndex?: number;
  /** 결정론 테스트용 settings 주입 */
  settingsOverride?: Partial<BaseSettings>;
  /**
   * P2-T07: 자막 모드. 미지정 시 KARAOKE_MODE env 폴백 → default.
   * UI(settingsStore.karaokeEnabled)는 /api/team/trigger 시 이 값을 채워 전달.
   */
  subtitleMode?: SubtitleMode;
}

export interface RunPipelineResult {
  jobId: string;
  items: Array<{
    index: number;
    outputPath: string;
    durationMs: number;
    /** P2-T05: 썸네일 jpg 경로(없으면 null). UI는 명명 규칙으로 유추하므로 metadata 보조용. */
    thumbnailPath: string | null;
  }>;
  metadataPath: string;
}

function getJobDir(jobId: string): string {
  return path.resolve(process.cwd(), 'data/jobs', jobId);
}

function ensureJobItemRow(jobId: string, itemIndex: number): string {
  const existing = listItemsByJob(jobId).find((i) => i.itemIndex === itemIndex);
  if (existing) return existing.id;
  const created = insertJobItem({ jobId, itemIndex });
  return created.id;
}

/**
 * 메인 진입점. final-content.json 을 읽고 아이템별로 voice → subtitle → video 실행.
 * - DB 레코드가 없는 경우에도 동작 가능하도록 no-op fallback 을 둔다
 *   (시나리오 F 재생성·스크립트 테스트용).
 */
export async function runPipeline(
  jobId: string,
  options: RunPipelineOptions = {},
): Promise<RunPipelineResult> {
  const content = loadFinalContent(jobId);

  const jobDir = getJobDir(jobId);
  const tempDir = path.join(jobDir, 'temp');
  const outputDir = path.join(jobDir, 'output');
  if (!existsSync(tempDir)) mkdirSync(tempDir, { recursive: true });
  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

  // DB 가 존재할 때만 잡 상태 갱신 (스크립트 테스트 허용)
  const jobRow = (() => {
    try {
      return getJobById(jobId);
    } catch {
      return null;
    }
  })();
  const dbEnabled = jobRow !== null;

  if (dbEnabled) {
    updateJobStatus(jobId, 'running');
  }

  const settings: BaseSettings = {
    voiceId: options.settingsOverride?.voiceId ?? 0,
    speed: options.settingsOverride?.speed ?? 1.0,
    backgroundFilter: options.settingsOverride?.backgroundFilter ?? null,
  };

  const results: RunPipelineResult['items'] = [];

  const targetItems =
    typeof options.onlyItemIndex === 'number'
      ? [content.items[options.onlyItemIndex]].filter((v): v is FinalContentItem => Boolean(v))
      : content.items;

  for (let i = 0; i < targetItems.length; i += 1) {
    const itemIndex =
      typeof options.onlyItemIndex === 'number' ? options.onlyItemIndex : i;
    const item = targetItems[i];

    const itemDbId = dbEnabled ? ensureJobItemRow(jobId, itemIndex) : null;
    const updateProgress = (
      stage: 'content' | 'voice' | 'subtitle' | 'video' | 'done',
      progress: number,
      status: 'pending' | 'running' | 'completed' | 'failed' = 'running',
    ): void => {
      if (!itemDbId) return;
      updateJobItem(itemDbId, { stage, progress, status });
    };

    try {
      updateProgress('content', 10);
      if (itemDbId) {
        // P2-T06: VideoCard '훅 변경' Dialog가 hookAlternatives를 읽을 수 있도록
        // script JSON 안에 동봉한다(DB 스키마 변경 회피). 기존 { hook, sentences } 호환.
        const scriptWithAlternatives = {
          ...item.script,
          hookAlternatives: item.hookAlternatives ?? null,
        };
        updateJobItem(itemDbId, {
          scriptJson: scriptWithAlternatives,
          caption: item.caption,
          hashtagsJson: item.hashtags,
        });
      }

      // 1) voice
      updateProgress('voice', 20);
      const voice = await synthesizeScript({
        jobId,
        itemIndex,
        sentences: item.script.sentences,
        voiceId: settings.voiceId,
        speed: settings.speed,
        tempDir,
      });
      updateProgress('voice', 50);

      // 2) subtitle (P2-T07: 카라오케 모드 옵션)
      updateProgress('subtitle', 60);
      const subtitle = buildAssSubtitle({
        jobId,
        itemIndex,
        segmentTimings: voice.segmentTimings,
        tempDir,
        mode: options.subtitleMode, // 미지정 시 buildAssSubtitle 내부에서 KARAOKE_MODE env 폴백
      });
      updateProgress('subtitle', 70);

      // 3) video
      updateProgress('video', 80);
      const video = await composeVideo({
        jobId,
        category: content.category,
        itemIndex,
        audioPath: voice.audioPath,
        subtitlePath: subtitle.subtitlePath,
        totalMs: voice.totalMs,
        outputDir,
      });

      if (itemDbId) {
        updateJobItem(itemDbId, {
          stage: 'done',
          progress: 100,
          status: 'completed',
          outputPath: video.outputPath,
        });
      }

      results.push({
        index: itemIndex,
        outputPath: video.outputPath,
        durationMs: video.durationMs,
        thumbnailPath: video.thumbnailPath,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (itemDbId) {
        updateJobItem(itemDbId, {
          status: 'failed',
          errorMessage: msg,
        });
      }
      throw new Error(`[orchestrator] 아이템 ${itemIndex} 실패: ${msg}`);
    }
  }

  const metadata = buildMetadata(content, results);
  const metadataPath = path.join(jobDir, 'metadata.json');
  writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');

  if (dbEnabled) {
    updateJobStatus(jobId, 'completed', new Date().toISOString());
  }

  return {
    jobId,
    items: results,
    metadataPath,
  };
}

function buildMetadata(
  content: FinalContent,
  results: RunPipelineResult['items'],
): unknown {
  return {
    jobId: content.jobId,
    category: content.category,
    generatedAt: new Date().toISOString(),
    ai_generated: true,
    contentQaReport: 'content-qa-report.json',
    items: content.items.map((item, idx) => {
      const r = results.find((x) => x.index === idx);
      return {
        index: idx,
        filename: r ? path.basename(r.outputPath) : null,
        // P2-T05: 썸네일 파일명(없으면 null). UI는 명명 규칙으로도 유추 가능.
        thumbnail: r?.thumbnailPath ? path.basename(r.thumbnailPath) : null,
        topic: item.topic,
        script: item.script,
        caption: item.caption,
        hashtags: item.hashtags,
        hookVerdict: item.hookVerdict,
        // P2-T06: 메타데이터에도 대안 훅 보존(다운스트림 분석/감사용).
        hookAlternatives: item.hookAlternatives ?? null,
        contentQa: item.contentQaReport.status,
      };
    }),
  };
}
