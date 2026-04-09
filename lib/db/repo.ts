// lib/db/repo.ts
// 5개 테이블에 대한 CRUD 함수. TypeScript any 금지, Zod 스키마 기반 타입.

import { randomUUID } from 'node:crypto';
import { getDb } from './client';

// ========== 공통 타입 ==========

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';
export type ItemStatus = 'pending' | 'running' | 'completed' | 'failed';
export type ItemStage = 'content' | 'voice' | 'subtitle' | 'video' | 'done';
export type ScenarioCode = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
export type TriggerStatus = 'queued' | 'running' | 'completed' | 'failed';
export type PromptChangeStatus = 'proposed' | 'approved' | 'rejected';

// ========== jobs ==========

export interface JobRow {
  id: string;
  triggerId: string;
  category: string;
  status: JobStatus;
  settings: Record<string, unknown>;
  createdAt: string;
  completedAt: string | null;
}

interface JobRowDb {
  id: string;
  trigger_id: string;
  category: string;
  status: JobStatus;
  settings: string;
  created_at: string;
  completed_at: string | null;
}

function mapJob(row: JobRowDb): JobRow {
  return {
    id: row.id,
    triggerId: row.trigger_id,
    category: row.category,
    status: row.status,
    settings: JSON.parse(row.settings) as Record<string, unknown>,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}

export function insertJob(input: {
  triggerId: string;
  category: string;
  settings?: Record<string, unknown>;
}): JobRow {
  const db = getDb();
  const id = randomUUID();
  db.prepare(
    `INSERT INTO jobs (id, trigger_id, category, status, settings)
     VALUES (?, ?, ?, 'pending', ?)`,
  ).run(id, input.triggerId, input.category, JSON.stringify(input.settings ?? {}));
  return getJobById(id)!;
}

export function getJobById(id: string): JobRow | null {
  const row = getDb()
    .prepare(`SELECT * FROM jobs WHERE id = ?`)
    .get(id) as JobRowDb | undefined;
  return row ? mapJob(row) : null;
}

export function listJobs(limit = 50): JobRow[] {
  const rows = getDb()
    .prepare(`SELECT * FROM jobs ORDER BY created_at DESC LIMIT ?`)
    .all(limit) as JobRowDb[];
  return rows.map(mapJob);
}

export function updateJobStatus(
  id: string,
  status: JobStatus,
  completedAt: string | null = null,
): void {
  getDb()
    .prepare(`UPDATE jobs SET status = ?, completed_at = ? WHERE id = ?`)
    .run(status, completedAt, id);
}

// ========== job_items ==========

export interface JobItemRow {
  id: string;
  jobId: string;
  itemIndex: number;
  stage: ItemStage;
  progress: number;
  status: ItemStatus;
  scriptJson: unknown | null;
  caption: string | null;
  hashtagsJson: string[] | null;
  outputPath: string | null;
  errorMessage: string | null;
  updatedAt: string;
}

interface JobItemRowDb {
  id: string;
  job_id: string;
  item_index: number;
  stage: ItemStage;
  progress: number;
  status: ItemStatus;
  script_json: string | null;
  caption: string | null;
  hashtags_json: string | null;
  output_path: string | null;
  error_message: string | null;
  updated_at: string;
}

function mapJobItem(row: JobItemRowDb): JobItemRow {
  return {
    id: row.id,
    jobId: row.job_id,
    itemIndex: row.item_index,
    stage: row.stage,
    progress: row.progress,
    status: row.status,
    scriptJson: row.script_json ? JSON.parse(row.script_json) : null,
    caption: row.caption,
    hashtagsJson: row.hashtags_json ? (JSON.parse(row.hashtags_json) as string[]) : null,
    outputPath: row.output_path,
    errorMessage: row.error_message,
    updatedAt: row.updated_at,
  };
}

export function insertJobItem(input: { jobId: string; itemIndex: number }): JobItemRow {
  const db = getDb();
  const id = randomUUID();
  db.prepare(
    `INSERT INTO job_items (id, job_id, item_index, stage, progress, status)
     VALUES (?, ?, ?, 'content', 0, 'pending')`,
  ).run(id, input.jobId, input.itemIndex);
  return getJobItemById(id)!;
}

export function getJobItemById(id: string): JobItemRow | null {
  const row = getDb()
    .prepare(`SELECT * FROM job_items WHERE id = ?`)
    .get(id) as JobItemRowDb | undefined;
  return row ? mapJobItem(row) : null;
}

export function listItemsByJob(jobId: string): JobItemRow[] {
  const rows = getDb()
    .prepare(`SELECT * FROM job_items WHERE job_id = ? ORDER BY item_index ASC`)
    .all(jobId) as JobItemRowDb[];
  return rows.map(mapJobItem);
}

export function updateJobItem(
  id: string,
  patch: Partial<{
    stage: ItemStage;
    progress: number;
    status: ItemStatus;
    scriptJson: unknown;
    caption: string;
    hashtagsJson: string[];
    outputPath: string;
    errorMessage: string;
  }>,
): void {
  const db = getDb();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (patch.stage !== undefined) {
    fields.push('stage = ?');
    values.push(patch.stage);
  }
  if (patch.progress !== undefined) {
    fields.push('progress = ?');
    values.push(patch.progress);
  }
  if (patch.status !== undefined) {
    fields.push('status = ?');
    values.push(patch.status);
  }
  if (patch.scriptJson !== undefined) {
    fields.push('script_json = ?');
    values.push(JSON.stringify(patch.scriptJson));
  }
  if (patch.caption !== undefined) {
    fields.push('caption = ?');
    values.push(patch.caption);
  }
  if (patch.hashtagsJson !== undefined) {
    fields.push('hashtags_json = ?');
    values.push(JSON.stringify(patch.hashtagsJson));
  }
  if (patch.outputPath !== undefined) {
    fields.push('output_path = ?');
    values.push(patch.outputPath);
  }
  if (patch.errorMessage !== undefined) {
    fields.push('error_message = ?');
    values.push(patch.errorMessage);
  }

  if (fields.length === 0) return;

  fields.push(`updated_at = datetime('now')`);
  values.push(id);

  db.prepare(`UPDATE job_items SET ${fields.join(', ')} WHERE id = ?`).run(...values);
}

// ========== team_triggers ==========

export interface TeamTriggerRow {
  id: string;
  scenario: ScenarioCode;
  payload: unknown;
  status: TriggerStatus;
  activeTeammates: string[];
  outputPath: string | null;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

interface TeamTriggerRowDb {
  id: string;
  scenario: ScenarioCode;
  payload: string;
  status: TriggerStatus;
  active_teammates: string;
  output_path: string | null;
  error_message: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

function mapTrigger(row: TeamTriggerRowDb): TeamTriggerRow {
  return {
    id: row.id,
    scenario: row.scenario,
    payload: JSON.parse(row.payload),
    status: row.status,
    activeTeammates: JSON.parse(row.active_teammates) as string[],
    outputPath: row.output_path,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
  };
}

export function insertTeamTrigger(input: {
  scenario: ScenarioCode;
  payload: unknown;
}): TeamTriggerRow {
  const db = getDb();
  const id = randomUUID();
  db.prepare(
    `INSERT INTO team_triggers (id, scenario, payload, status, active_teammates)
     VALUES (?, ?, ?, 'queued', '[]')`,
  ).run(id, input.scenario, JSON.stringify(input.payload));
  return getTriggerById(id)!;
}

export function getTriggerById(id: string): TeamTriggerRow | null {
  const row = getDb()
    .prepare(`SELECT * FROM team_triggers WHERE id = ?`)
    .get(id) as TeamTriggerRowDb | undefined;
  return row ? mapTrigger(row) : null;
}

/**
 * FIFO 큐: 가장 오래된 queued 트리거 1건 반환.
 * R-14 직렬화 정책의 핵심.
 */
export function getNextQueuedTrigger(): TeamTriggerRow | null {
  const row = getDb()
    .prepare(
      `SELECT * FROM team_triggers
       WHERE status = 'queued'
       ORDER BY created_at ASC
       LIMIT 1`,
    )
    .get() as TeamTriggerRowDb | undefined;
  return row ? mapTrigger(row) : null;
}

export function markTriggerRunning(id: string): void {
  getDb()
    .prepare(
      `UPDATE team_triggers
       SET status = 'running', started_at = datetime('now')
       WHERE id = ? AND status = 'queued'`,
    )
    .run(id);
}

export function markTriggerCompleted(id: string, outputPath: string | null = null): void {
  getDb()
    .prepare(
      `UPDATE team_triggers
       SET status = 'completed', completed_at = datetime('now'), output_path = ?
       WHERE id = ?`,
    )
    .run(outputPath, id);
}

export function markTriggerFailed(id: string, errorMessage: string): void {
  getDb()
    .prepare(
      `UPDATE team_triggers
       SET status = 'failed', completed_at = datetime('now'), error_message = ?
       WHERE id = ?`,
    )
    .run(errorMessage, id);
}

export function updateTriggerTeammates(id: string, teammates: string[]): void {
  getDb()
    .prepare(`UPDATE team_triggers SET active_teammates = ? WHERE id = ?`)
    .run(JSON.stringify(teammates), id);
}

/**
 * R-13 stale 복구: status='running' AND started_at < NOW - thresholdMin 레코드를 queued로 복귀.
 * session-start-poll.sh hook이 주기적으로 호출.
 */
export function recoverStaleRunningTriggers(thresholdMinutes = 15): number {
  const result = getDb()
    .prepare(
      `UPDATE team_triggers
       SET status = 'queued', started_at = NULL
       WHERE status = 'running'
         AND datetime(started_at) < datetime('now', ?)`,
    )
    .run(`-${thresholdMinutes} minutes`);
  return result.changes;
}

export function listRecentTriggers(limit = 10): TeamTriggerRow[] {
  const rows = getDb()
    .prepare(`SELECT * FROM team_triggers ORDER BY created_at DESC LIMIT ?`)
    .all(limit) as TeamTriggerRowDb[];
  return rows.map(mapTrigger);
}

// ========== metrics (Phase 3) ==========

export interface MetricsRow {
  id: string;
  jobItemId: string;
  uploadedAt: string;
  views7d: number | null;
  completionRate7d: number | null;
  saves7d: number | null;
  views30d: number | null;
  completionRate30d: number | null;
  saves30d: number | null;
  notes: string | null;
}

export function insertMetrics(input: {
  jobItemId: string;
  uploadedAt: string;
  notes?: string;
}): MetricsRow {
  const db = getDb();
  const id = randomUUID();
  db.prepare(
    `INSERT INTO metrics (id, job_item_id, uploaded_at, notes)
     VALUES (?, ?, ?, ?)`,
  ).run(id, input.jobItemId, input.uploadedAt, input.notes ?? null);
  return {
    id,
    jobItemId: input.jobItemId,
    uploadedAt: input.uploadedAt,
    views7d: null,
    completionRate7d: null,
    saves7d: null,
    views30d: null,
    completionRate30d: null,
    saves30d: null,
    notes: input.notes ?? null,
  };
}

// ========== prompt_changes (Phase 3) ==========

export interface PromptChangeRow {
  id: string;
  targetFile: string;
  diff: string;
  rationale: string;
  status: PromptChangeStatus;
  proposedAt: string;
  reviewedAt: string | null;
}

export function insertPromptChange(input: {
  targetFile: string;
  diff: string;
  rationale: string;
}): PromptChangeRow {
  const db = getDb();
  const id = randomUUID();
  db.prepare(
    `INSERT INTO prompt_changes (id, target_file, diff, rationale, status)
     VALUES (?, ?, ?, ?, 'proposed')`,
  ).run(id, input.targetFile, input.diff, input.rationale);
  const row = db
    .prepare(`SELECT * FROM prompt_changes WHERE id = ?`)
    .get(id) as {
    id: string;
    target_file: string;
    diff: string;
    rationale: string;
    status: PromptChangeStatus;
    proposed_at: string;
    reviewed_at: string | null;
  };
  return {
    id: row.id,
    targetFile: row.target_file,
    diff: row.diff,
    rationale: row.rationale,
    status: row.status,
    proposedAt: row.proposed_at,
    reviewedAt: row.reviewed_at,
  };
}
