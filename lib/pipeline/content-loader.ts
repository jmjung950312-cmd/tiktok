// lib/pipeline/content-loader.ts
// data/jobs/[jobId]/final-content.json 을 읽어 FinalContentSchema 로 검증하고
// FinalContent 타입으로 반환한다. Agent Teams ↔ 파이프라인 인터페이스의 입구.

import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

import { FinalContentSchema, type FinalContent } from '../team/types';

const DEFAULT_JOBS_DIR = path.resolve(process.cwd(), 'data/jobs');

export function getJobDir(jobId: string): string {
  const dir = process.env.JOBS_DIR ?? DEFAULT_JOBS_DIR;
  return path.join(dir, jobId);
}

export function getFinalContentPath(jobId: string): string {
  return path.join(getJobDir(jobId), 'final-content.json');
}

/**
 * final-content.json 을 읽고 Zod 검증 후 반환.
 * 검증 실패 시 Zod 에러 메시지를 그대로 throw 한다.
 */
export function loadFinalContent(jobId: string): FinalContent {
  const filePath = getFinalContentPath(jobId);
  if (!existsSync(filePath)) {
    throw new Error(
      `[content-loader] final-content.json 없음: ${filePath}\n→ Agent Teams(tiktok-ops-team) 시나리오 A 가 먼저 완료되어야 합니다.`,
    );
  }
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch (err) {
    throw new Error(`[content-loader] JSON 파싱 실패 (${filePath}): ${(err as Error).message}`);
  }

  const parsed = FinalContentSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  • ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`[content-loader] FinalContentSchema 검증 실패:\n${issues}`);
  }
  if (parsed.data.jobId !== jobId) {
    throw new Error(
      `[content-loader] jobId 불일치: 파일 내 "${parsed.data.jobId}" vs 인자 "${jobId}"`,
    );
  }
  return parsed.data;
}
