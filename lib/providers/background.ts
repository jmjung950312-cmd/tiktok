// lib/providers/background.ts
// assets/backgrounds/*.mp4 풀에서 랜덤으로 1개 선택.
// Phase 2 P2-T04: 카테고리별 Pexels Video API 자동 다운로드 + 로컬 캐시.
//
// 우선순위:
//   1) 로컬 assets/backgrounds/ 에서 filename이 category substring을 포함한 파일
//   2) assets/backgrounds/_cache/[category]/*.mp4 (Pexels에서 다운로드한 것)
//   3) PEXELS_API_KEY 설정 시 Pexels Video API 호출 → mp4 다운로드 → _cache 저장
//   4) 위 모두 실패 시 pickRandomBackground() 로컬 풀 전체에서 랜덤

import { existsSync, readdirSync, statSync, mkdirSync, createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import path from 'node:path';

const BACKGROUND_EXTENSIONS = new Set(['.mp4', '.mov', '.webm']);

function getBackgroundsDir(): string {
  const fromEnv = process.env.BACKGROUNDS_DIR;
  if (fromEnv && existsSync(fromEnv)) return fromEnv;
  return path.resolve(process.cwd(), 'assets/backgrounds');
}

function getCacheDir(category: string): string {
  return path.join(getBackgroundsDir(), '_cache', category);
}

/** 사용 가능한 배경 영상 파일 목록(절대 경로) 반환. `_cache` 디렉토리 제외. */
export function listBackgrounds(): string[] {
  const dir = getBackgroundsDir();
  if (!existsSync(dir)) return [];

  const entries = readdirSync(dir)
    .filter((name) => BACKGROUND_EXTENSIONS.has(path.extname(name).toLowerCase()))
    .map((name) => path.join(dir, name))
    .filter((full) => {
      try {
        return statSync(full).isFile();
      } catch {
        return false;
      }
    });

  return entries;
}

/** 특정 카테고리의 캐시 디렉토리에서 파일 목록 반환. 없으면 빈 배열. */
function listCachedForCategory(category: string): string[] {
  const dir = getCacheDir(category);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => BACKGROUND_EXTENSIONS.has(path.extname(name).toLowerCase()))
    .map((name) => path.join(dir, name))
    .filter((full) => {
      try {
        return statSync(full).isFile();
      } catch {
        return false;
      }
    });
}

export interface PickBackgroundOptions {
  /** Math.random 대체용 (테스트/결정론 시드 주입) */
  random?: () => number;
  /** 특정 필터 접두사. 예: 'calm_' */
  filter?: string | null;
}

/**
 * 배경 영상 1개를 랜덤 선택하여 절대 경로 반환.
 * - 파일이 0개면 throw
 * - filter 가 지정되면 이름에 해당 문자열을 포함한 파일만 후보로 사용
 */
export function pickRandomBackground(options: PickBackgroundOptions = {}): string {
  const { random = Math.random, filter = null } = options;
  const all = listBackgrounds();

  const pool = filter
    ? all.filter((full) => path.basename(full).toLowerCase().includes(filter.toLowerCase()))
    : all;

  if (pool.length === 0) {
    throw new Error(
      `[background] assets/backgrounds/ 에 사용 가능한 영상이 없습니다 (filter=${filter ?? 'none'}). assets/backgrounds/README.md 가이드를 따라 최소 1개 이상 추가하세요.`,
    );
  }

  const idx = Math.floor(random() * pool.length);
  return pool[idx];
}

// ========== Phase 2 P2-T04: 카테고리 매핑 + Pexels API ==========

/**
 * 카테고리별 Pexels 검색어 매핑. 5개 카테고리 × 2~3개 키워드.
 * 키워드는 영어(Pexels API는 영어 검색 우선). 세로형 영상이 많은 주제로 선정.
 */
export const CATEGORY_QUERY_MAP: Record<string, string[]> = {
  'love-psychology': ['couple walking', 'city night', 'holding hands'],
  'unknown-facts': ['nature macro', 'space stars', 'abstract pattern'],
  'money-habits': ['keyboard typing', 'desk workspace', 'coffee laptop'],
  'relationships': ['friends talking', 'group cafe', 'city park'],
  'self-improvement': ['sunrise running', 'book reading', 'mountain hike'],
};

/** 로컬 풀에서 파일명에 카테고리 substring을 포함한 파일을 검색. */
function findLocalByCategoryName(category: string): string[] {
  return listBackgrounds().filter((full) =>
    path.basename(full).toLowerCase().includes(category.toLowerCase()),
  );
}

interface PexelsVideoFile {
  link: string;
  file_type: string;
  width: number;
  height: number;
  quality: string;
}

interface PexelsVideo {
  id: number;
  width: number;
  height: number;
  video_files: PexelsVideoFile[];
}

interface PexelsSearchResponse {
  videos: PexelsVideo[];
  page: number;
  per_page: number;
  total_results: number;
}

/** Pexels Video Search API 호출. 무료 티어(200 req/시간, 20K req/월). */
async function searchPexelsVideos(
  query: string,
  apiKey: string,
): Promise<PexelsVideo[]> {
  const url = `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&orientation=portrait&size=medium&per_page=5`;
  const res = await fetch(url, {
    headers: { Authorization: apiKey },
  });
  if (!res.ok) {
    throw new Error(`[background] Pexels 응답 ${res.status}: ${res.statusText}`);
  }
  const data = (await res.json()) as PexelsSearchResponse;
  return data.videos ?? [];
}

/** Pexels video_files 중 9:16 세로형 mp4 + medium 품질을 우선. */
function pickBestPortraitFile(video: PexelsVideo): PexelsVideoFile | null {
  const portraitMp4s = video.video_files.filter(
    (f) =>
      f.file_type === 'video/mp4' &&
      f.width > 0 &&
      f.height > 0 &&
      f.height > f.width, // 세로형
  );
  if (portraitMp4s.length === 0) return null;

  // medium > hd > sd > uhd 우선 (파일 크기 vs 품질 균형)
  const byQuality: Record<string, number> = { medium: 4, hd: 3, sd: 2, uhd: 1 };
  portraitMp4s.sort(
    (a, b) => (byQuality[b.quality] ?? 0) - (byQuality[a.quality] ?? 0),
  );
  return portraitMp4s[0];
}

/** 단일 URL에서 파일을 다운로드하여 목적지에 저장. */
async function downloadToFile(url: string, destPath: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok || !res.body) {
    throw new Error(`[background] 다운로드 실패 ${res.status}: ${url}`);
  }
  mkdirSync(path.dirname(destPath), { recursive: true });
  const stream = Readable.fromWeb(res.body as unknown as import('node:stream/web').ReadableStream<Uint8Array>);
  await pipeline(stream, createWriteStream(destPath));
}

/**
 * 카테고리 하나에 대해 Pexels API 호출 → 첫 결과 mp4를 _cache 에 저장 → 경로 반환.
 * apiKey 부재 시 null 반환(호출측에서 폴백 처리).
 */
async function fetchFromPexels(
  category: string,
): Promise<string | null> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) return null;

  const queries = CATEGORY_QUERY_MAP[category];
  if (!queries || queries.length === 0) {
    return null;
  }
  const query = queries[Math.floor(Math.random() * queries.length)];

  let videos: PexelsVideo[];
  try {
    videos = await searchPexelsVideos(query, apiKey);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[background] Pexels 검색 실패 (${category}/${query}): ${msg}`);
    return null;
  }
  if (videos.length === 0) return null;

  const video = videos[Math.floor(Math.random() * videos.length)];
  const file = pickBestPortraitFile(video);
  if (!file) return null;

  const cacheDir = getCacheDir(category);
  const destPath = path.join(cacheDir, `pexels-${video.id}.mp4`);

  if (existsSync(destPath)) return destPath; // 캐시 히트 (동일 id)

  try {
    await downloadToFile(file.link, destPath);
    return destPath;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[background] Pexels 다운로드 실패 ${category}: ${msg}`);
    return null;
  }
}

/**
 * 카테고리에 어울리는 배경 영상 경로를 반환한다.
 * 우선순위 체인(위 파일 상단 docstring 참조).
 */
export async function ensureBackgroundForCategory(category: string): Promise<string> {
  // 1) 로컬 풀에서 파일명에 카테고리 포함된 것
  const localMatches = findLocalByCategoryName(category);
  if (localMatches.length > 0) {
    return localMatches[Math.floor(Math.random() * localMatches.length)];
  }

  // 2) 캐시 디렉토리
  const cached = listCachedForCategory(category);
  if (cached.length > 0) {
    return cached[Math.floor(Math.random() * cached.length)];
  }

  // 3) Pexels API (키 있을 때만)
  const downloaded = await fetchFromPexels(category);
  if (downloaded) {
    return downloaded;
  }

  // 4) 최종 폴백: 로컬 풀 전체에서 랜덤
  return pickRandomBackground();
}
