# Leader 세션 tmux daemon 셋업 가이드 (P2-T11)

> **기술 설명**: macOS `launchd` 에이전트(`com.tiktok.leader`)가 로그인 시 `scripts/start-leader-tmux.sh`를 실행하여 `tmux` 세션(`tiktok-leader`) 안에서 `claude` CLI를 기동한다. R-13 stale 복구는 기존 `.claude/hooks/session-start-poll.sh`가 담당.
>
> **쉽게 말하면**: 맥북을 켤 때마다 AI 팀장(Leader)이 자동으로 대기 상태로 들어갑니다. 터미널 열고 `claude` 입력하는 매일의 수고가 사라집니다.

---

## 사전 요구사항

- macOS(본 프로젝트는 macOS 전용)
- `tmux` 설치 — `brew install tmux`
- Claude Code CLI (`claude`) 설치 + `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` 활성화
- Phase 1 완료 (Leader 세션이 이미 동작하는 상태)

---

## 1. 설치

```bash
./scripts/install-leader-daemon.sh
```

**실행되는 일**:

1. `templates/com.tiktok.leader.plist`의 `__PROJECT_ROOT__` / `__HOME__` 플레이스홀더를 실제 절대경로로 치환
2. `~/Library/LaunchAgents/com.tiktok.leader.plist`에 복사
3. `launchctl load`로 에이전트 등록 → 즉시 1회 실행(`RunAtLoad: true`)
4. `tmux new-session -d -s tiktok-leader -c <repo> claude` 로 detached 세션 생성
5. `~/Library/Logs/tiktok-leader.log` 에 stdout/stderr 기록

**쉽게 말하면**: 설치 스크립트 한 번 돌리면 맥북이 알아서 Leader를 켭니다. 로그는 `tail -f ~/Library/Logs/tiktok-leader.log`로 확인.

---

## 2. 확인

```bash
# ① launchd 에이전트 등록 확인
launchctl list | grep com.tiktok.leader
# → 0 <pid> com.tiktok.leader  형태로 나와야 정상

# ② tmux 세션 존재 확인
tmux has-session -t tiktok-leader && echo OK
# → OK

# ③ Leader 로그 tail
tail -n 30 ~/Library/Logs/tiktok-leader.log
```

---

## 3. 대화형 접속 (attach)

```bash
tmux attach -t tiktok-leader
```

**쉽게 말하면**: 백그라운드에서 돌고 있는 Leader 세션 화면을 직접 봅니다. 여기서 `/agents`, `/tiktok-generate` 같은 커맨드를 입력할 수 있습니다.

**detach(보이는 세션 숨기기, Leader는 계속 돌아감)**: `Ctrl-b` → `d`

> ⚠️ `Ctrl-c`나 `exit`는 누르지 마세요. Leader 세션 자체를 종료시킵니다. detach는 반드시 `Ctrl-b d`.

---

## 4. 강제 재기동

Leader가 응답 없거나 토큰 컨텍스트가 가득 찬 경우:

```bash
launchctl kickstart -k gui/$(id -u)/com.tiktok.leader
```

`-k` 플래그가 기존 프로세스를 kill한 뒤 재기동합니다. `start-leader-tmux.sh`의 이중 기동 방지 로직이 기존 tmux 세션을 감지하면 재사용하므로, 필요 시 먼저 `tmux kill-session -t tiktok-leader`로 세션도 정리하세요.

**쉽게 말하면**: Leader가 먹통이 되면 이 명령 한 줄로 재시작합니다.

---

## 5. 제거

```bash
./scripts/uninstall-leader-daemon.sh
```

**옵션**:

- `--keep-session`: launchd 에이전트만 제거하고 tmux 세션은 계속 유지

**실행되는 일**:

1. `launchctl unload ~/Library/LaunchAgents/com.tiktok.leader.plist`
2. plist 파일 삭제
3. (기본) `tmux kill-session -t tiktok-leader`

---

## 6. 문제 해결

| 증상                                                 | 원인                         | 해결                                                                                 |
| ---------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------ |
| `launchctl list \| grep com.tiktok.leader` 출력 없음 | plist 파싱 실패              | `plutil -lint ~/Library/LaunchAgents/com.tiktok.leader.plist` 로 문법 확인           |
| `tmux: command not found`                            | tmux 미설치                  | `brew install tmux`                                                                  |
| `claude: command not found` (로그에 기록)            | launchd가 PATH를 못 찾음     | plist의 `EnvironmentVariables.PATH`에 claude 설치 경로 추가 (`which claude` 로 확인) |
| 세션은 있는데 Leader 응답 없음                       | claude 세션 자체 문제        | `tmux attach -t tiktok-leader`로 들어가 상태 확인 → 필요시 kickstart                 |
| R-13 stale trigger 적체                              | session-start-poll.sh 미실행 | `.claude/hooks/session-start-poll.sh` 직접 실행 후 로그 확인 (P1-T07 참조)           |

---

## 7. 설계 결정 기록

- **`KeepAlive: false`** — Claude 세션 crash 시 launchd가 무한 재기동하면 Opus 토큰이 폭증할 수 있음. crash는 사용자가 인지 후 수동 kickstart.
- **`RunAtLoad: true`** — 설치 직후 + 로그인 시 자동 1회 실행.
- **`ProcessType: Interactive`** — 대화형 세션. macOS 전력 관리가 일반 백그라운드 데몬처럼 suspend하지 않도록.
- **tmux 세션 이름 고정(`tiktok-leader`)** — 이중 기동 방지를 위해 `has-session` 체크를 고정 이름으로 수행.
- **R-13 복구 로직은 건드리지 않음** — 기존 `session-start-poll.sh`가 매 세션 시작 시 자동 실행되므로 tmux daemon 하에서도 동일하게 동작.

---

## 8. 관련 파일

- `scripts/start-leader-tmux.sh` — tmux 이중 기동 방지 래퍼
- `scripts/install-leader-daemon.sh` — launchd 설치
- `scripts/uninstall-leader-daemon.sh` — launchd 제거
- `templates/com.tiktok.leader.plist` — launchd plist 템플릿
- `.claude/hooks/session-start-poll.sh` — R-13 stale 복구 + FIFO 큐 pickup (변경 없음)
- `~/Library/LaunchAgents/com.tiktok.leader.plist` — 설치 후 생성
- `~/Library/Logs/tiktok-leader.log` — stdout/stderr 로그
