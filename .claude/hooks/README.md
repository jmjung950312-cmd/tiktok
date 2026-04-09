# .claude/hooks/ — Hook 운영 문서

## 개요

이 디렉토리의 shell 스크립트는 Claude Code의 hooks 기능에 의해 자동 호출됩니다.
각 hook은 특정 이벤트(세션 시작, 도구 실행 전/후, 응답 완료)에 실행되어
"관리되는 프로젝트" 상태를 유지합니다.

등록 위치: `.claude/settings.json` → `hooks` 필드.

## Hook 파일별 역할

| 파일                    | 이벤트       | 역할                                              | timeout |
| ----------------------- | ------------ | ------------------------------------------------- | ------- |
| `session-start-poll.sh` | SessionStart | Leader 큐 폴링 (R-13 stale 복구 + FIFO 조회)      | 10s     |
| `session-context.sh`    | SessionStart | 프로젝트 상태 스냅샷을 Claude 컨텍스트로 주입     | 15s     |
| `pre-tool-guard.sh`     | PreToolUse   | 위험 명령/파일 편집 차단 (JSON 응답으로 deny/ask) | 5s      |
| `post-format.sh`        | PostToolUse  | 편집된 파일 자동 포맷 + 편집 플래그 생성          | 30s     |
| `stop-validate.sh`      | Stop         | 편집 있었으면 typecheck + lint 강제               | 180s    |
| `lib/common.sh`         | (공통)       | 공통 유틸 — jq 래퍼, 로깅, 플래그 경로            | —       |

## 입출력 규약

### 공통

- **입력**: 모든 hook은 stdin으로 JSON payload를 받음 (`session_id`, `tool_name`, `tool_input`, `stop_hook_active` 등)
- **출력**: stdout은 용도별로 다름 (컨텍스트 주입 / JSON 응답 / 빈 출력)
- **종료 코드**: 0 = 성공/허용, 2 = 차단 (PreToolUse 에서만 권장, 현재는 모두 exit 0 + JSON 응답 사용)

### session-context.sh

- **stdout**: Markdown 텍스트 → Claude 컨텍스트에 자동 추가됨 (`additionalContext`)
- **크기 제한**: 10,000자 이내 권장 (현재 출력은 약 2,000자)

### pre-tool-guard.sh

- **출력**: deny/ask 시 JSON 응답, 허용 시 빈 stdout
- **JSON 응답 예**:
  ```json
  {
    "hookSpecificOutput": {
      "hookEventName": "PreToolUse",
      "permissionDecision": "deny",
      "permissionDecisionReason": "[pre-tool-guard] ..."
    }
  }
  ```

### stop-validate.sh

- **출력**: 실패 시 `{"decision": "block", "reason": "..."}`, 성공 시 빈 stdout
- **편집 플래그**: `.claude/logs/.edit-flag-<session_id>` 존재 여부로 검사 실행 결정

## 단위 테스트 방법

```bash
# session-context.sh 출력 확인
CLAUDE_PROJECT_DIR="$(pwd)" ./.claude/hooks/session-context.sh

# pre-tool-guard.sh — deny 케이스
echo '{"session_id":"t","tool_name":"Bash","tool_input":{"command":"rm -rf data/jobs"}}' \
  | CLAUDE_PROJECT_DIR="$(pwd)" ./.claude/hooks/pre-tool-guard.sh

# pre-tool-guard.sh — allow 케이스
echo '{"session_id":"t","tool_name":"Bash","tool_input":{"command":"ls -la"}}' \
  | CLAUDE_PROJECT_DIR="$(pwd)" ./.claude/hooks/pre-tool-guard.sh

# post-format.sh — 실제 파일로
echo 'const x={a:1}' > /tmp/test.ts
echo '{"session_id":"t","tool_name":"Write","tool_input":{"file_path":"/tmp/test.ts"}}' \
  | CLAUDE_PROJECT_DIR="$(pwd)" ./.claude/hooks/post-format.sh
cat /tmp/test.ts

# stop-validate.sh — 편집 플래그 없이 (스킵)
echo '{"session_id":"t","stop_hook_active":false}' \
  | CLAUDE_PROJECT_DIR="$(pwd)" ./.claude/hooks/stop-validate.sh

# stop-validate.sh — 플래그 있을 때 (실제 typecheck+lint)
touch .claude/logs/.edit-flag-t
echo '{"session_id":"t","stop_hook_active":false}' \
  | CLAUDE_PROJECT_DIR="$(pwd)" ./.claude/hooks/stop-validate.sh
```

## 로그 확인

모든 hook은 `.claude/logs/hooks.jsonl`에 JSONL 포맷으로 이벤트를 기록합니다.

```bash
tail -f .claude/logs/hooks.jsonl
tail -n 20 .claude/logs/hooks.jsonl | jq .
```

## 차단 규칙 (pre-tool-guard.sh)

### Bash 도구

| 규칙                 | 패턴                                                    | 결정 |
| -------------------- | ------------------------------------------------------- | ---- |
| `rm-rf-critical`     | `rm -rf` 로 data/.venv/.claude/.shrimp_data/assets 삭제 | deny |
| `rm-rf-root`         | `rm -rf /`, `rm -rf ~/`, `rm -rf $HOME`                 | deny |
| `sqlite-destructive` | `sqlite3 ... DROP TABLE` 또는 WHERE 없는 `DELETE FROM`  | deny |
| `kill-claude`        | `pkill claude`, `killall claude`                        | deny |
| `old-desktop-path`   | `/Users/jungmo/Desktop/Claude-Core` 경로 참조           | deny |
| `force-push-main`    | `git push --force main/master`                          | deny |
| `curl-pipe-bash`     | `curl ... \| bash` 패턴                                 | deny |
| `launchctl-unload`   | `launchctl unload com.tiktok.*`                         | ask  |
| `git-reset-hard`     | `git reset --hard`                                      | ask  |

### Write / Edit / MultiEdit 도구

| 규칙               | file_path 패턴                      | 결정 |
| ------------------ | ----------------------------------- | ---- |
| `env-file`         | `.env` 또는 `.env.*`                | deny |
| `old-desktop-path` | `/Users/jungmo/Desktop/Claude-Core` | deny |
| `db-direct-edit`   | `data/db.sqlite`                    | deny |
| `venv-edit`        | `.venv/` 내부                       | deny |
| `mcp-config`       | `.mcp.json`                         | ask  |
| `subagent-edit`    | `.claude/agents/**/*.md`            | ask  |
| `lockfile-edit`    | `package-lock.json`                 | ask  |

## 트러블슈팅

### Hook이 실행되지 않는다

1. `.claude/settings.json` → `hooks` 필드 유효한 JSON 인지 확인 (`jq empty .claude/settings.json`)
2. 각 스크립트에 실행 권한이 있는지 (`ls -la .claude/hooks/*.sh` → `-rwxr-xr-x`)
3. Claude Code 세션을 완전히 재시작 (hook 설정은 세션 시작 시 로드됨)

### `jq: command not found`

모든 hook이 `jq`에 의존합니다. `brew install jq`로 설치.

### Stop hook이 너무 자주 block 한다

- `npm run lint` / `npm run typecheck` 를 로컬에서 먼저 실행해 에러 먼저 해결
- 임시로 Stop hook 비활성화하려면 `settings.json`의 `Stop` 블록 삭제

### 오래된 편집 플래그가 쌓인다

세션 crash 시 `.edit-flag-<session>` 파일이 남을 수 있음. `session-context.sh` 가 하루 이상 된 플래그를 자동 삭제.

수동 청소:

```bash
find .claude/logs -name '.edit-flag-*' -mtime +0 -delete
```

## 롤백

### 특정 hook만 비활성화

`.claude/settings.json` 에서 해당 이벤트 블록 삭제.

### Hook 전체 비활성화 (기존 Leader 큐 hook만 남기기)

```bash
jq '.hooks = {"SessionStart": [{"matcher": "startup|resume", "hooks": [{"type": "command", "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/session-start-poll.sh"}]}]}' \
  .claude/settings.json > /tmp/s.json && mv /tmp/s.json .claude/settings.json
```

### 완전 제거

```bash
mv .claude/hooks .claude/hooks.disabled
jq 'del(.hooks)' .claude/settings.json > /tmp/s.json && mv /tmp/s.json .claude/settings.json
```
