---
description: 시나리오 A 수동 트리거 — 카테고리 하나에 대해 5개 숏폼을 자동 생성한다 (trend-scout → script-writer → hook-critic → caption-crafter → content-qa → 결정론 파이프라인)
argument-hint: <카테고리 이름 (예: love-psychology, money-habits)>
---

# 시나리오 A 수동 트리거

입력받은 카테고리 `$ARGUMENTS`에 대해 TikTok 숏폼 5개를 자동 생성하는 시나리오 A를 수동으로 발동한다.

## 사전 조건

- `tiktok-ops-team` Agent Team이 이미 생성되어 있어야 한다. 미생성이면 먼저 `Create an agent team named tiktok-ops-team using the 12 subagents in .claude/agents/` 실행.
- `data/db.sqlite`가 초기화되어 있어야 한다 (`npm run db:init`).
- 환경 검증 통과: `npm run seed:assets`.

## 수행 단계

1. **카테고리 검증**: `$ARGUMENTS`가 `lib/team/scenarios.ts`의 `SCENARIOS.A.payloadSchema`가 허용하는 카테고리인지 확인.
2. **team_triggers INSERT**:
   ```bash
   sqlite3 data/db.sqlite "INSERT INTO team_triggers(id, scenario, payload, status, created_at) VALUES(lower(hex(randomblob(16))), 'A', json_object('category', '$ARGUMENTS', 'count', 5, 'settings', json_object()), 'queued', datetime('now'));"
   ```
3. **시나리오 A Teammate 5명 spawn**:
   - content/trend-scout
   - content/script-writer
   - content/hook-critic (Opus)
   - content/caption-crafter
   - content/content-qa
4. **파이프라인 위임**: content-qa가 `data/jobs/[jobId]/final-content.json` 생성 완료하면 Leader는 `lib/pipeline/orchestrator.ts`의 `runPipeline(jobId)`를 spawn하여 결정론 파이프라인 실행.
5. **상태 보고**: 완료되면 생성된 `data/jobs/[jobId]/output/*.mp4` 5개 경로를 출력.

## 관련 파일

- `lib/team/scenarios.ts` — ScenarioA 정의 참조
- `lib/team/trigger-repo.ts` — team_triggers CRUD
- `lib/pipeline/orchestrator.ts` — 결정론 파이프라인 실행기
- PRD §5 M-01~M-04, §8.3, §10 `/api/team/trigger`

## 주의

- **FIFO 직렬화** (R-14): 이미 `status='running'` 레코드 있으면 자동 큐잉. 에러 아님.
- **Max 플랜 소비**: 시나리오 A는 약 5명 × 짧은 프롬프트. Phase 1 실측 예정.
