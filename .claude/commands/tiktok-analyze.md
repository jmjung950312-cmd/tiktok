---
description: 시나리오 C 수동 트리거 — metrics-analyst + trend-analyst 2명을 spawn하여 주간 리포트 생성 (Phase 2 실동작)
argument-hint: [period (기본 7d, 또는 30d)]
---

# 시나리오 C 수동 트리거 (주간 분석)

최근 `metrics` 테이블 데이터를 바탕으로 주간 리포트를 생성한다.

> **Phase 1 범위 주의 (C-4 / P0-B4 결정)**: Phase 1에서는 **Subagent 정의만** 준비되며, **cron 자동 등록은 Phase 2로 연기** (매주 월 09:00 자동 발동은 Phase 2 P2-T09에서 launchd 또는 유사 방식으로 구현). 본 슬래시 커맨드는 Phase 2 P2-T08/T09 이후 완전 동작하며, Phase 1에서는 수동 실행만 테스트 가능.

## 사전 조건

- `tiktok-ops-team` Agent Team 생성됨
- `metrics-analyst.md`, `trend-analyst.md` 2개 Subagent 존재
- `metrics` 테이블에 최소 3개 이상 레코드 (표본 부족 경고 방지)

## 수행 단계

1. **기간 파라미터 처리**: `$ARGUMENTS`가 비어 있으면 `"7d"`, 아니면 `$ARGUMENTS` 사용 (허용: `7d`, `30d`).
2. **team_triggers INSERT**:
   ```bash
   sqlite3 data/db.sqlite "INSERT INTO team_triggers(id, scenario, payload, status, created_at) VALUES(lower(hex(randomblob(16))), 'C', json_object('period', '${ARGUMENTS:-7d}'), 'queued', datetime('now'));"
   ```
3. **2명 Teammate spawn 병렬**: metrics-analyst, trend-analyst.
4. **산출물 수집**:
   - `data/reports/weekly-[yyyy-mm-dd]-metrics.json` (metrics-analyst)
   - `data/reports/weekly-[yyyy-mm-dd]-analysis.md` (trend-analyst)
   - `data/reports/weekly-[yyyy-mm-dd]-recommendations.json` (trend-analyst)
5. **시나리오 D 연쇄 여부**: trend-analyst가 권고하면 Leader가 **P0-B1 §8.4.1 절차**에 따라 "C 팀원 shutdown → 동일 팀 내 preference-learner, prompt-tuner spawn" 순서로 D 연쇄 실행 (Phase 3 P3-T03).
6. **상태 보고**: 생성된 리포트 파일 경로 3개 + 시나리오 D 연쇄 발동 여부.

## 관련 파일

- `.claude/agents/analytics/metrics-analyst.md`, `trend-analyst.md`
- `lib/team/scenarios.ts` — ScenarioC, ScenarioD
- PRD §5 M-10, §8.4.1, §14 Phase 2

## 주의

- **R-15**: 시나리오 C/D는 토큰 대량 소비 가능성. 시나리오 D 연쇄 시 특히 주의.
- **P0-B1 §8.4.1 준수**: C→D 연쇄는 반드시 동일 `tiktok-ops-team` 내에서 인원 교체 spawn으로만 실행. 새 팀 생성 금지.
