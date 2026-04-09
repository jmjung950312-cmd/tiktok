# launchd cron 설정 가이드 (P2-T09 — 시나리오 C 자동 발동)

> 작성일: 2026-04-09 | 관련 태스크: P2-T09 | 관련 PRD: §5 M-10, Q3 / §14 cron 자동 등록 / R-13 stale 복구
>
> 매주 월요일 09:00에 시나리오 C(주간 분석) 트리거를 자동으로 큐에 넣는 macOS launchd 에이전트 설치/제거/검증 방법.

---

## 1. 구성 요소

| 파일 | 역할 |
|---|---|
| `templates/com.tiktok.analyze.plist` | launchd 에이전트 템플릿. `__PROJECT_ROOT__` / `__HOME__` 플레이스홀더 포함 |
| `scripts/cron-enqueue-weekly.sh` | sqlite3 CLI 로 `team_triggers` 에 `scenario='C', status='queued'` INSERT |
| `scripts/install-cron-analyze.sh` | 플레이스홀더 치환 + `~/Library/LaunchAgents/` 복사 + `launchctl load` |
| `scripts/uninstall-cron-analyze.sh` | `launchctl unload` + plist 제거 |

플로우:
```
[launchd 매주 월 09:00]
        │
        ▼
cron-enqueue-weekly.sh
   sqlite3 INSERT (scenario='C', status='queued', payload={"scenario":"C","period":"7d"})
        │
        ▼
data/db.sqlite (WAL 모드)
        │
        ▼ (Leader 세션이 폴링)
.claude/hooks/session-start-poll.sh  (P1-T07)
        │
        ▼
tmux Leader 세션  (P2-T11 daemon)
        │
        ▼
시나리오 C 가동 — metrics-analyst + trend-analyst 2명 spawn
```

---

## 2. 사전 조건

- macOS launchd (모든 macOS 기본 제공)
- sqlite3 / uuidgen CLI (macOS 기본 제공)
- `data/db.sqlite` 존재 — 한 번이라도 Next.js 서버를 가동했거나 `npx tsx scripts/init-db.ts` 실행했어야 함
- **tmux Leader 데몬(P2-T11)이 가동 중** — 그렇지 않으면 큐에 들어간 트리거가 영원히 대기
  ```bash
  tmux has-session -t tiktok-leader && echo OK
  ```

---

## 3. 설치

```bash
./scripts/install-cron-analyze.sh
```

성공 출력 예:
```
[install-cron] 설치 완료
  plist  : /Users/jungmo/Library/LaunchAgents/com.tiktok.analyze.plist
  log    : /Users/jungmo/Library/Logs/tiktok-analyze.log
  stage  : 매주 월요일 09:00
```

등록 확인:
```bash
launchctl list | grep com.tiktok.analyze
```

---

## 4. 수동 강제 실행 (테스트용)

월요일 09:00을 기다리지 않고 즉시 cron-enqueue를 가동:

```bash
launchctl kickstart -k gui/$(id -u)/com.tiktok.analyze
```

확인:
```bash
# 1) 로그
tail -n 20 ~/Library/Logs/tiktok-analyze.log

# 2) DB 큐
sqlite3 data/db.sqlite "SELECT id, scenario, status, created_at FROM team_triggers WHERE scenario='C' ORDER BY created_at DESC LIMIT 3;"

# 3) tmux Leader 가 감지했는지
tmux capture-pane -t tiktok-leader -p | tail -30
```

5분 안에 같은 시나리오 큐가 이미 있으면 중복 INSERT 방지로 skip 한다(`cron-enqueue-weekly.sh` 가드).

---

## 5. 제거

```bash
./scripts/uninstall-cron-analyze.sh
```

---

## 6. 트러블슈팅

### Q1. 등록은 됐는데 월요일이 지나도 동작하지 않는다
- macOS 가 sleep 상태였다면 launchd 는 다음 wake 시 catch-up 한다(즉시 한 번만).
- `pmset -g log` 또는 시스템 로그(`log show --predicate 'subsystem == "com.apple.launchd"' --info --last 1h`)에서 com.tiktok.analyze 항목 확인.

### Q2. 큐는 들어갔는데 Leader 가 못 잡는다
- `tmux has-session -t tiktok-leader` 가 OK 인지 확인.
- 아니면 `./scripts/install-leader-daemon.sh` 로 P2-T11 에이전트 재설치.
- 그래도 안 되면 `.claude/hooks/session-start-poll.sh` 에서 R-13 stale 복구가 동작 중인지 (`recoverStaleRunningTriggers`) 점검.

### Q3. WAL 모드 충돌이 걱정된다
- `data/db.sqlite` 는 `PRAGMA journal_mode = WAL` 로 초기화되어 있어 sqlite3 CLI(쓰기) ↔ better-sqlite3(읽기/쓰기) 동시성 안전.
- 동일 트랜잭션 내 `INSERT` 1건만 수행하므로 lock contention 거의 없음.

### Q4. 다른 요일/시간으로 바꾸고 싶다
- `templates/com.tiktok.analyze.plist` 의 `<key>StartCalendarInterval</key>` 안에서 `Weekday`(1=월~7=일), `Hour`, `Minute` 변경 후 `./scripts/install-cron-analyze.sh` 재실행.
- 여러 슬롯이 필요하면 `<key>StartCalendarInterval</key><array>...</array>` 형태로 dict 배열을 사용.

---

## 7. 검증 체크리스트 (P2-T09 DoD)

- [ ] `launchctl list | grep com.tiktok.analyze` exit 0
- [ ] `launchctl kickstart -k ...` 수동 실행 후 DB 에 `scenario='C', status='queued'` 1건
- [ ] tmux Leader 세션이 2초 내 감지 후 running 전환 (`status='running'` 확인)
- [ ] `~/Library/Logs/tiktok-analyze.log` 생성
- [ ] plist 의 `Weekday=1, Hour=9, Minute=0` 정확
