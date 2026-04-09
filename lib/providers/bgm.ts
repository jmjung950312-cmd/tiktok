// lib/providers/bgm.ts
// Phase 2 P2-T03 — BGM(배경 음악) 파일 풀에서 랜덤으로 1개 선택.
// assets/bgm/*.mp3|m4a|wav|ogg 스캔. BGM 디렉토리가 비었거나 DISABLE_BGM=1 이면 null 반환.
// lib/pipeline/video.ts 가 본 프로바이더를 호출하여 ffmpeg amix 3번째 입력으로 사용.

import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const BGM_EXTENSIONS = new Set(['.mp3', '.m4a', '.wav', '.ogg']);

function getBgmDir(): string {
  const fromEnv = process.env.BGM_DIR;
  if (fromEnv && existsSync(fromEnv)) return fromEnv;
  return path.resolve(process.cwd(), 'assets/bgm');
}

function isBgmDisabled(): boolean {
  return process.env.DISABLE_BGM === '1';
}

/**
 * assets/bgm/ (또는 BGM_DIR) 내의 사용 가능한 BGM 파일 절대 경로 목록.
 * 디렉토리가 존재하지 않으면 빈 배열.
 */
export function listBgmFiles(): string[] {
  const dir = getBgmDir();
  if (!existsSync(dir)) return [];

  return readdirSync(dir)
    .filter((name) => BGM_EXTENSIONS.has(path.extname(name).toLowerCase()))
    .map((name) => path.join(dir, name))
    .filter((full) => {
      try {
        return statSync(full).isFile();
      } catch {
        return false;
      }
    });
}

export interface PickBgmOptions {
  /** 테스트용 Math.random 대체 */
  random?: () => number;
  /** 파일명에 해당 문자열을 포함한 파일만 후보(소문자 비교) */
  filter?: string | null;
}

/**
 * BGM 파일 1개를 랜덤 선택하여 절대 경로 반환.
 * - DISABLE_BGM=1 이면 null 반환(호출측은 기존 2-input 경로로 폴백)
 * - 파일이 0개면 null 반환(에러 아님 — 안내 로그만)
 * - filter가 있으면 파일명에 해당 문자열을 포함한 파일만 후보
 */
export function pickRandomBgm(options: PickBgmOptions = {}): string | null {
  if (isBgmDisabled()) {
    return null;
  }

  const { random = Math.random, filter = null } = options;
  const all = listBgmFiles();

  const pool = filter
    ? all.filter((full) => path.basename(full).toLowerCase().includes(filter.toLowerCase()))
    : all;

  if (pool.length === 0) {
    return null;
  }

  const idx = Math.floor(random() * pool.length);
  return pool[idx];
}

/**
 * BGM 볼륨 비율을 환경변수 또는 기본값에서 반환. 0.0 ~ 1.0 범위로 clamp.
 * 기본 0.3 (voice 대비 -10dB 근사).
 */
export function getBgmVolume(): number {
  const raw = process.env.BGM_VOLUME;
  if (!raw) return 0.3;
  const parsed = Number.parseFloat(raw);
  if (!Number.isFinite(parsed)) return 0.3;
  return Math.min(1.0, Math.max(0.0, parsed));
}
