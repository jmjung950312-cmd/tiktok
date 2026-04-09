// scripts/test-rerender-schema.ts
// P2-T10 단위 검증 — POST /api/jobs/[jobId]/rerender body 의 RerenderBodySchema 가
// 모든 분기 케이스에서 정확히 동작하는지 확인.
import { z } from 'zod';

const RerenderBodySchema = z
  .object({
    itemIndex: z.number().int().min(0).max(4),
    newSentences: z.array(z.string().min(1)).length(5).optional(),
    newHook: z.string().min(1).optional(),
  })
  .refine((v) => v.newSentences !== undefined || v.newHook !== undefined, {
    message: 'newSentences 또는 newHook 중 최소 하나는 필요합니다.',
  })
  .refine((v) => !(v.newSentences !== undefined && v.newHook !== undefined), {
    message: 'newSentences 와 newHook 은 동시에 보낼 수 없습니다.',
  });

interface Case {
  name: string;
  input: unknown;
  expectOk: boolean;
}

const cases: Case[] = [
  {
    name: 'sentences 5개',
    input: { itemIndex: 0, newSentences: ['a', 'b', 'c', 'd', 'e'] },
    expectOk: true,
  },
  { name: 'newHook 만', input: { itemIndex: 2, newHook: '훅' }, expectOk: true },
  { name: '둘 다 없음', input: { itemIndex: 1 }, expectOk: false },
  {
    name: '둘 다 있음',
    input: { itemIndex: 0, newSentences: ['a', 'b', 'c', 'd', 'e'], newHook: 'x' },
    expectOk: false,
  },
  {
    name: 'sentences 4개',
    input: { itemIndex: 0, newSentences: ['a', 'b', 'c', 'd'] },
    expectOk: false,
  },
  { name: 'itemIndex 5', input: { itemIndex: 5, newHook: 'x' }, expectOk: false },
  { name: 'itemIndex -1', input: { itemIndex: -1, newHook: 'x' }, expectOk: false },
  { name: 'newHook 빈 문자열', input: { itemIndex: 0, newHook: '' }, expectOk: false },
];

let pass = 0;
let fail = 0;
for (const c of cases) {
  const result = RerenderBodySchema.safeParse(c.input);
  const ok = result.success === c.expectOk;
  console.log(
    `${ok ? 'PASS' : 'FAIL'} - ${c.name} (success=${result.success}, expected=${c.expectOk})`,
  );
  if (!result.success) {
    console.log('       issues:', result.error.issues.map((i) => i.message).join('; '));
  }
  if (ok) pass += 1;
  else fail += 1;
}
console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail > 0 ? 1 : 0);
