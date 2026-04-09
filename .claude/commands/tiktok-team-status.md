---
description: 현재 team_triggers 상태, active_teammates, 최근 잡 요약을 Markdown 테이블로 출력
---

# 팀 상태 확인

`data/db.sqlite`의 `team_triggers`, `jobs`, `job_items` 테이블을 조회하여 현재 Agent Teams 상태를 한 화면에 요약한다. Leader 세션에서 수시로 호출 가능.

## 사전 조건

- `data/db.sqlite` 존재 (`npm run db:init` 완료)
- `tiktok-ops-team` 존재 여부는 무관 (DB만 조회)

## 수행 단계

1. **활성 트리거 조회**:
   ```bash
   sqlite3 -header -markdown data/db.sqlite "SELECT substr(id,1,8) AS trigger_id, scenario, status, active_teammates, datetime(created_at,'localtime') AS created, datetime(started_at,'localtime') AS started FROM team_triggers ORDER BY created_at DESC LIMIT 10;"
   ```
2. **진행 중 잡 조회**:
   ```bash
   sqlite3 -header -markdown data/db.sqlite "SELECT substr(id,1,8) AS job_id, category, status, datetime(created_at,'localtime') AS created FROM jobs WHERE status IN ('pending','running') ORDER BY created_at DESC LIMIT 5;"
   ```
3. **현재 처리 중 아이템 단계별 진행**:
   ```bash
   sqlite3 -header -markdown data/db.sqlite "SELECT substr(job_id,1,8) AS job, item_index, stage, progress, status FROM job_items WHERE status='running' ORDER BY updated_at DESC;"
   ```
4. **Stale running 경고** (R-13): `team_triggers` 중 `status='running'`이면서 `started_at < NOW - 15min` 레코드가 있으면 경고.
5. **Leader 세션 기동 상태**: 이 커맨드 자체가 Leader에서 실행 중이므로 "Leader: ACTIVE" 표시.

## 출력 형식

```markdown
## 🎬 tiktok-ops-team 상태 (2026-04-09 01:30)

### 최근 트리거 10건
| trigger_id | scenario | status | active_teammates | created | started |
| ... | ... | ... | ... | ... | ... |

### 진행 중 잡
| job_id | category | status | created |
| ... | ... | ... | ... |

### 처리 중 아이템
| job | item_index | stage | progress | status |
| ... | ... | ... | ... | ... |

### 경고
- (있으면 여기)
```

## 관련 파일

- `data/db.sqlite` (`team_triggers`, `jobs`, `job_items`)
- `.claude/hooks/session-start-poll.sh` (stale 복구 동작 연관)
- PRD §8.5, §11, ROADMAP §7 R-13

## 주의

- 이 커맨드는 **읽기 전용**. DB 수정 금지.
- `active_teammates`는 JSON 문자열이므로 표에 그대로 표시되어 다소 길 수 있음.
