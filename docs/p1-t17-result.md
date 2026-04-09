# P1-T17 검증 리포트 — Leader 세션 + R-13 복구

> 작성일: 2026-04-09 | 담당: 이정모 | 상태: 부분 자동 검증 + 수동 체크리스트

## 1. 범위 요약

P1-T17 은 세 가지 서로 다른 성격의 검증을 묶은 태스크다.

| 구분                                         | 대상                                           | 자동 가능 여부                                       |
| -------------------------------------------- | ---------------------------------------------- | ---------------------------------------------------- |
| (a) R-13 stale 복구 + FIFO 픽업              | `.claude/hooks/session-start-poll.sh` SQL 로직 | ✅ 자동 (`scripts/test-session-hook.sh`)             |
| (b) Leader 세션 21 Teammate 풀 인식          | `claude` CLI 대화형 세션                       | ⚠️ 수동 — Claude Code Leader 세션 외부에서 검증 불가 |
| (c) `/tiktok-team-status` 슬래시 커맨드 응답 | `.claude/commands/tiktok-team-status.md`       | ⚠️ 수동                                              |
| (d) 세션 강제 종료 → 재시작 후 복구          | Hook 발동 → (a) 로직 호출                      | ⚠️ 수동 (Hook 자체는 자동 검증됨)                    |

## 2. 자동 검증 결과 — (a) R-13 + FIFO

실행: `bash scripts/test-session-hook.sh`

### 단계

1. **빈 큐** — 스크립트 시작 전에 `team_triggers` 를 비운 후 hook 호출. (DB 잔여 레코드로 인해 약간 변동 가능)
2. **queued 1건 삽입** — `t17-queued-1` INSERT 후 hook 호출. `next-queued-trigger` 이벤트 JSON 이 stdout 에 출력되어야 함.
3. **stale running 1건 + 복구** — `t17-stale-1` (started_at = 30분 전) INSERT 후 hook 호출. Hook 이 `R-13 stale 복구: 1건 queued로 되돌림` 메시지를 찍어야 함.
4. **최종 상태 SELECT** — 두 레코드가 모두 `queued` 상태여야 함.

### 실측 로그

```
[3] stale running 1건 + 복구
[session-start-poll] R-13 stale 복구: 1건 queued로 되돌림
{"event":"next-queued-trigger","triggerId":"<id>","scenario":"A","payload":{...}}

[4] 최종 상태
t17-queued-1|A|queued|
t17-stale-1|A|queued|     ← started_at = NULL (복구됨)
```

**결론**: R-13 복구 + FIFO 픽업 로직 **PASS**.

## 3. 수동 검증 체크리스트 — (b)(c)(d)

> 사용자가 별도 터미널에서 1회 실행.

```bash
# 준비
cd /Users/jungmo/Developer/Claude-Core/tiktok-automation_2026-04-08

# 1) Leader 세션 시작
claude
```

세션 안에서:

- [ ] **(b-1)** 프롬프트 입력:
  ```
  Create an agent team named tiktok-ops-team with the 12 teammates from
  .claude/agents/. Use opus for hook-critic and code-reviewer, sonnet for
  the rest. Reuse the existing 10 generic subagents already under
  .claude/agents/ so the total pool is 21.
  ```
- [ ] **(b-2)** 상태바 또는 `/agents` 커맨드 결과에서 21 Teammate 풀을 확인.
- [ ] **(c)** `/tiktok-team-status` 실행 → 팀 구성 요약이 한국어로 응답됨.
- [ ] **(d-1)** Leader 세션 창에서 `Ctrl+C` 로 강제 종료.
- [ ] **(d-2)** 별도 터미널에서 stale 트리거 삽입:
  ```bash
  sqlite3 data/db.sqlite "INSERT INTO team_triggers (id, scenario, payload, status, started_at, active_teammates) VALUES (lower(hex(randomblob(16))), 'A', '{\"scenario\":\"A\",\"category\":\"love-psychology\",\"count\":5,\"settings\":{\"voiceId\":0,\"speed\":1.0,\"backgroundFilter\":null}}', 'running', datetime('now','-30 minutes'), '[]');"
  ```
- [ ] **(d-3)** `claude` 재실행 → `SessionStart` hook 자동 발동 → 출력에 `R-13 stale 복구: 1건 queued로 되돌림` 메시지 확인.
- [ ] **(d-4)** 확인:
  ```bash
  sqlite3 data/db.sqlite "SELECT id, status, started_at FROM team_triggers WHERE status='queued';"
  ```
  복구된 레코드가 `queued` 상태, `started_at = NULL` 이어야 함.

## 4. 종료 후

수동 체크 전부 통과 시, 이 문서의 각 체크박스를 `[x]` 로 갱신하고 `docs/ROADMAP.md` L387 `P1-T17` 를 `[x]` 처리한다. 이미 자동 검증된 (a) 는 태스크 완료 기준의 핵심이므로, (b)(c)(d) 가 모두 수동 확인되기 전이라도 자동 부분만으로 회귀 테스트가 가능하다.

## 5. 재현용 명령

```bash
# 자동 검증 전체 재실행
bash scripts/test-session-hook.sh

# 훅 단독 실행
./.claude/hooks/session-start-poll.sh
```
