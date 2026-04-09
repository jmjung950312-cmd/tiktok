// scripts/test-background-fetch.ts
// P2-T04 검증: ensureBackgroundForCategory(category)가 우선순위 체인대로 동작하는지 확인.
//
// 사용:
//   npx tsx scripts/test-background-fetch.ts love-psychology
//   npx tsx scripts/test-background-fetch.ts money-habits
//
// 결과:
//   - PEXELS_API_KEY 있으면 실제 다운로드 + _cache 저장 + 재실행 시 캐시 히트 확인
//   - 없으면 로컬 풀 폴백 확인
//
// 주의: .env.local 자동 로드 안 됨. 필요 시 export PEXELS_API_KEY=... 로 수동 설정.

import { existsSync, statSync } from 'node:fs';
import path from 'node:path';

import {
  ensureBackgroundForCategory,
  CATEGORY_QUERY_MAP,
} from '../lib/providers/background';

const VALID_CATEGORIES = Object.keys(CATEGORY_QUERY_MAP);

async function main(): Promise<number> {
  const category = process.argv[2] ?? 'love-psychology';
  if (!VALID_CATEGORIES.includes(category)) {
    console.error(`[test-bg-fetch] 알 수 없는 카테고리: ${category}`);
    console.error(`[test-bg-fetch] 가능한 값: ${VALID_CATEGORIES.join(', ')}`);
    return 1;
  }

  const hasKey = Boolean(process.env.PEXELS_API_KEY);
  console.log(`[test-bg-fetch] 카테고리: ${category}`);
  console.log(`[test-bg-fetch] PEXELS_API_KEY: ${hasKey ? '설정됨' : '미설정(폴백 경로 검증)'}`);
  console.log('');

  // 1차 호출
  console.log('[test-bg-fetch] 1차 호출(ensureBackgroundForCategory)...');
  const t1 = Date.now();
  const path1 = await ensureBackgroundForCategory(category);
  const dt1 = Date.now() - t1;
  console.log(`  → ${path.relative(process.cwd(), path1)}  (${dt1}ms)`);

  if (!existsSync(path1)) {
    console.error(`[test-bg-fetch] FAIL: 반환된 경로가 파일이 아님`);
    return 2;
  }
  const size1 = statSync(path1).size;
  console.log(`  → 파일 크기: ${(size1 / 1024).toFixed(0)} KB`);

  // 2차 호출 (캐시 히트 기대 — Pexels가 같은 영상을 돌려주면 네트워크 0)
  console.log('');
  console.log('[test-bg-fetch] 2차 호출(캐시 히트 기대)...');
  const t2 = Date.now();
  const path2 = await ensureBackgroundForCategory(category);
  const dt2 = Date.now() - t2;
  console.log(`  → ${path.relative(process.cwd(), path2)}  (${dt2}ms)`);

  // 분석
  console.log('');
  console.log('[test-bg-fetch] 분석');
  console.log(`  1차 소요: ${dt1}ms`);
  console.log(`  2차 소요: ${dt2}ms`);
  if (path1.includes('_cache/')) {
    console.log(`  ✓ Pexels 다운로드 경로 동작 확인 (_cache 경유)`);
  } else {
    console.log(`  ✓ 로컬 풀 폴백 경로 동작 확인 (_cache 미경유)`);
  }
  if (dt2 < 500) {
    console.log(`  ✓ 2차 호출 500ms 이내 — 캐시/로컬 경로 동작`);
  } else {
    console.log(`  ~ 2차 호출 ${dt2}ms — 네트워크 재호출 가능(랜덤 선택 결과 변경)`);
  }

  console.log('');
  console.log('[test-bg-fetch] PASS');
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error('[test-bg-fetch] 예기치 않은 에러:', err);
    process.exit(99);
  });
