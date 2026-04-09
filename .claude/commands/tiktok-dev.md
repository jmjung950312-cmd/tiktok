---
description: 시나리오 B 수동 트리거 — 기능 요청 / 버그 리포트를 받아 frontend-builder + backend-builder + code-reviewer 3명을 spawn (계획 승인 모드 강제)
argument-hint: <기능 요청 또는 버그 리포트 텍스트>
---

# 시나리오 B 수동 트리거 (개발 팀)

프로젝트의 프론트엔드/백엔드를 실제로 수정하는 시나리오 B를 발동한다. **계획 승인 모드** 강제.

> **Phase 1 범위 주의 (C-4 결정)**: Phase 1에서는 **Subagent 정의와 `/api/team/trigger` 스켈레톤만** 준비되며, **실제 개발 팀 가동은 Phase 2 P2-T08**에서 시작된다. 본 슬래시 커맨드는 Phase 2 이후에만 완전 동작한다.

## 사전 조건

- `tiktok-ops-team` Agent Team 생성됨
- `frontend-builder.md`, `backend-builder.md`, `code-reviewer.md` 3개 Subagent 존재

## 수행 단계

1. **요청 본문 캡처**: `$ARGUMENTS`에 담긴 사용자 요청 텍스트 저장.
2. **team_triggers INSERT**:
   ```bash
   sqlite3 data/db.sqlite "INSERT INTO team_triggers(id, scenario, payload, status, created_at) VALUES(lower(hex(randomblob(16))), 'B', json_object('request', '$ARGUMENTS'), 'queued', datetime('now'));"
   ```
3. **3명 Teammate spawn**: frontend-builder, backend-builder, code-reviewer.
4. **Plan mode 강제 (P0-B2)**: Leader는 spawn 직후 **3명 각각에게 개별 메시지로 `Switch to plan mode` 전송**. 이 단계를 건너뛰면 Q2 확정 "계획 승인 모드 필수"를 위반한다.
5. **계획서 수집**: frontend-builder와 backend-builder가 각자 변경 계획서를 제출하면 Leader가 파일 영역 겹침이 없는지 확인.
6. **승인**: 사용자(Leader)가 계획 승인 시에만 구현 시작.
7. **code-reviewer 검토**: 구현 완료 후 code-reviewer가 diff 리뷰.
8. **상태 보고**: 변경 파일 목록 + diff 요약 + R-15 토큰 소비 기록.

## 관련 파일

- `.claude/agents/dev/frontend-builder.md`, `backend-builder.md`, `code-reviewer.md`
- `lib/team/scenarios.ts` — ScenarioB 정의
- PRD §5 M-12, §15 R-15/R-18

## 주의

- **R-15 토큰 폭증**: plan mode × Opus 조합은 토큰 소비 크게 증가. Phase 1 중에는 수동 주의, Phase 2 실측 후 일일 제한 여부 재결정 (C-5).
- **R-18 HMR 충돌**: dev 서버 실행 중이면 토스트로 "재시작 권장" 안내.
