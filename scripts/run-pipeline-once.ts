// scripts/run-pipeline-once.ts
// 일회성 파이프라인 실행기. Leader가 시나리오 A 완료 후 결정론 파이프라인을 구동할 때 사용.
// 사용법: npx tsx scripts/run-pipeline-once.ts <jobId>

import { runPipeline } from '../lib/pipeline/orchestrator';

async function main(): Promise<void> {
  const jobId = process.argv[2];
  if (!jobId) {
    console.error('ERROR: jobId 인자가 필요합니다');
    process.exit(1);
  }

  // 선택적: 두 번째 인자로 재처리할 item index 목록 전달 가능 (예: "2,3,4")
  const onlyArg = process.argv[3];
  const onlyIndices = onlyArg
    ? onlyArg.split(',').map((s) => Number.parseInt(s.trim(), 10)).filter((n) => Number.isFinite(n))
    : null;

  try {
    if (onlyIndices && onlyIndices.length > 0) {
      const accumulated: Array<{ index: number; outputPath: string; durationMs: number }> = [];
      for (const idx of onlyIndices) {
        console.log(`\n[run-once] item ${idx} 시작...`);
        const r = await runPipeline(jobId, { onlyItemIndex: idx });
        accumulated.push(...r.items);
      }
      console.log(JSON.stringify({ jobId, items: accumulated }, null, 2));
    } else {
      const result = await runPipeline(jobId);
      console.log(JSON.stringify(result, null, 2));
    }
  } catch (err) {
    const msg = err instanceof Error ? err.stack ?? err.message : String(err);
    console.error('PIPELINE_ERROR:', msg);
    process.exit(1);
  }
}

main();
