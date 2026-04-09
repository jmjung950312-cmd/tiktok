#!/usr/bin/env bash
# .claude/hooks/pre-tool-guard.sh
#
# PreToolUse hook — Bash / Write / Edit / MultiEdit 도구 실행 직전 안전 검사.
# 위험 패턴 감지 시 JSON 응답으로 deny 또는 ask 반환.
#
# 중요 설계:
#   - exit 0 으로 종료 (JSON 응답으로 차단; exit 2 는 이중 차단)
#   - 의도한 규칙이 아니면 빈 stdout + exit 0 → 허용
#   - 모든 차단은 hooks.jsonl 에 로그 기록

set -uo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

# stdin JSON 읽기
INPUT="$(cat)"
if [ -z "$INPUT" ]; then
  exit 0
fi

TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null || echo "")
if [ -z "$TOOL_NAME" ]; then
  exit 0
fi

# -----------------------------------------------------------------------------
# Bash 검사
# -----------------------------------------------------------------------------
if [ "$TOOL_NAME" = "Bash" ]; then
  COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null || echo "")
  [ -z "$COMMAND" ] && exit 0

  # 1) rm -rf 로 중요 디렉토리 삭제 (data, .venv, assets/bgm, assets/backgrounds, .claude)
  #    - `rm -rf data/jobs`, `rm -rf ./data`, `rm -rf /data/jobs` 모두 탐지
  #    - `metadata/...` 는 오탐 방지 (단어 경계 고려)
  if echo "$COMMAND" | grep -qE 'rm[[:space:]]+-[rf]+[[:space:]]+[./]*(data|\.venv|\.claude|\.shrimp_data|assets/bgm|assets/backgrounds)(/|$|[[:space:]])'; then
    REASON='[pre-tool-guard] 파이프라인 중요 자산(data/.venv/.claude/.shrimp_data/assets) 삭제 차단. 개별 파일만 수동으로 지우세요.'
    hooks_pre_tool_deny "$REASON"
    hooks_log "pre-tool-guard.deny" "$(jq -n --arg c "$COMMAND" --arg rule "rm-rf-critical" '{command:$c, rule:$rule}')"
    exit 0
  fi

  # 2) rm -rf / 또는 rm -rf ~ 또는 rm -rf $HOME (시스템 통째)
  if echo "$COMMAND" | grep -qE 'rm[[:space:]]+-[rf]+[[:space:]]+(/[[:space:]]*$|/[[:space:]]|~[[:space:]]*$|~/|\$HOME)'; then
    hooks_pre_tool_deny "[pre-tool-guard] 시스템 루트(/) 또는 홈 디렉토리(~/\$HOME) 삭제 차단."
    hooks_log "pre-tool-guard.deny" "$(jq -n --arg c "$COMMAND" --arg rule "rm-rf-root" '{command:$c, rule:$rule}')"
    exit 0
  fi

  # 3) SQLite DROP TABLE / DELETE FROM (WHERE 없음)
  if echo "$COMMAND" | grep -qiE 'sqlite3.*(DROP[[:space:]]+TABLE|DELETE[[:space:]]+FROM[[:space:]]+\w+[[:space:]]*;)'; then
    hooks_pre_tool_deny "[pre-tool-guard] DB 파괴적 명령(DROP TABLE / DELETE FROM 전체) 차단. WHERE 절 없이 전체 삭제는 금지."
    hooks_log "pre-tool-guard.deny" "$(jq -n --arg c "$COMMAND" --arg rule "sqlite-destructive" '{command:$c, rule:$rule}')"
    exit 0
  fi

  # 4) pkill / killall claude (Leader 세션 강제 종료)
  if echo "$COMMAND" | grep -qE '(pkill|killall)[[:space:]]+.*claude'; then
    hooks_pre_tool_deny "[pre-tool-guard] Claude 프로세스 강제 종료 차단. Leader 세션이 있으면 tmux kill-session 사용하세요."
    hooks_log "pre-tool-guard.deny" "$(jq -n --arg c "$COMMAND" --arg rule "kill-claude" '{command:$c, rule:$rule}')"
    exit 0
  fi

  # 5) Desktop/Claude-Core 이전 경로 참조 (이사 후 잘못된 경로)
  if echo "$COMMAND" | grep -qE '/Users/jungmo/Desktop/Claude-Core'; then
    hooks_pre_tool_deny "[pre-tool-guard] 구 경로(/Users/jungmo/Desktop/Claude-Core) 참조 차단. 현재 프로젝트는 Developer 폴더로 이사했습니다."
    hooks_log "pre-tool-guard.deny" "$(jq -n --arg c "$COMMAND" --arg rule "old-desktop-path" '{command:$c, rule:$rule}')"
    exit 0
  fi

  # 6) git push --force (main/master)
  if echo "$COMMAND" | grep -qE 'git[[:space:]]+push.*(-f|--force).*\b(main|master)\b'; then
    hooks_pre_tool_deny "[pre-tool-guard] git push --force main/master 차단. 원격 이력 파괴 가능."
    hooks_log "pre-tool-guard.deny" "$(jq -n --arg c "$COMMAND" --arg rule "force-push-main" '{command:$c, rule:$rule}')"
    exit 0
  fi

  # 7) launchctl unload com.tiktok.* (ask — 의도적일 수 있음)
  if echo "$COMMAND" | grep -qE 'launchctl[[:space:]]+unload.*com\.tiktok'; then
    hooks_pre_tool_ask "[pre-tool-guard] launchctl unload com.tiktok.* 확인 필요. 의도한 경우 승인하세요."
    hooks_log "pre-tool-guard.ask" "$(jq -n --arg c "$COMMAND" --arg rule "launchctl-unload" '{command:$c, rule:$rule}')"
    exit 0
  fi

  # 8) git reset --hard (ask — 로컬 변경 파괴 가능)
  if echo "$COMMAND" | grep -qE 'git[[:space:]]+reset[[:space:]]+--hard'; then
    hooks_pre_tool_ask "[pre-tool-guard] git reset --hard 확인 필요. 로컬 워킹 트리 변경이 사라집니다."
    hooks_log "pre-tool-guard.ask" "$(jq -n --arg c "$COMMAND" --arg rule "git-reset-hard" '{command:$c, rule:$rule}')"
    exit 0
  fi

  # 9) curl | bash 패턴 (원격 스크립트 바로 실행)
  if echo "$COMMAND" | grep -qE '(curl|wget)[[:space:]]+.*\|[[:space:]]*(bash|sh)\b'; then
    hooks_pre_tool_deny "[pre-tool-guard] curl/wget | bash 패턴 차단. 다운로드 후 내용 확인 권장."
    hooks_log "pre-tool-guard.deny" "$(jq -n --arg c "$COMMAND" --arg rule "curl-pipe-bash" '{command:$c, rule:$rule}')"
    exit 0
  fi

  # 통과
  exit 0
fi

# -----------------------------------------------------------------------------
# Write / Edit / MultiEdit 검사 (file_path 기준)
# -----------------------------------------------------------------------------
if [ "$TOOL_NAME" = "Write" ] || [ "$TOOL_NAME" = "Edit" ] || [ "$TOOL_NAME" = "MultiEdit" ]; then
  FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null || echo "")
  [ -z "$FILE_PATH" ] && exit 0

  # 1) .env, .env.local, .env.* (deny)
  if echo "$FILE_PATH" | grep -qE '/\.env(\.|$)'; then
    hooks_pre_tool_deny "[pre-tool-guard] .env* 파일 편집 차단. 비밀 값은 수동으로만 관리하세요."
    hooks_log "pre-tool-guard.deny" "$(jq -n --arg f "$FILE_PATH" --arg rule "env-file" '{file:$f, rule:$rule}')"
    exit 0
  fi

  # 2) .mcp.json (ask — 신중)
  if echo "$FILE_PATH" | grep -qE '/\.mcp\.json$'; then
    hooks_pre_tool_ask "[pre-tool-guard] .mcp.json 편집 확인 필요. MCP 서버 설정 변경은 새 세션에서 적용됩니다."
    hooks_log "pre-tool-guard.ask" "$(jq -n --arg f "$FILE_PATH" --arg rule "mcp-config" '{file:$f, rule:$rule}')"
    exit 0
  fi

  # 3) Desktop/Claude-Core 경로 (deny)
  if echo "$FILE_PATH" | grep -qE '^/Users/jungmo/Desktop/Claude-Core'; then
    hooks_pre_tool_deny "[pre-tool-guard] 구 경로(Desktop/Claude-Core) 편집 차단. 현재 프로젝트는 Developer 폴더입니다."
    hooks_log "pre-tool-guard.deny" "$(jq -n --arg f "$FILE_PATH" --arg rule "old-desktop-path" '{file:$f, rule:$rule}')"
    exit 0
  fi

  # 4) data/db.sqlite 직접 편집 (deny)
  if echo "$FILE_PATH" | grep -qE 'data/db\.sqlite$'; then
    hooks_pre_tool_deny "[pre-tool-guard] data/db.sqlite 직접 편집 차단. sqlite3 CLI 또는 lib/db/ 를 통해 변경하세요."
    hooks_log "pre-tool-guard.deny" "$(jq -n --arg f "$FILE_PATH" --arg rule "db-direct-edit" '{file:$f, rule:$rule}')"
    exit 0
  fi

  # 5) .venv/ 내부 (deny)
  if echo "$FILE_PATH" | grep -qE '/\.venv/'; then
    hooks_pre_tool_deny "[pre-tool-guard] .venv/ 내부 편집 차단. 파이썬 가상환경은 setup-melo.sh 로만 관리하세요."
    hooks_log "pre-tool-guard.deny" "$(jq -n --arg f "$FILE_PATH" --arg rule "venv-edit" '{file:$f, rule:$rule}')"
    exit 0
  fi

  # 6) .claude/agents/ (ask — prompt-tuner 영역)
  if echo "$FILE_PATH" | grep -qE '\.claude/agents/.*\.md$'; then
    hooks_pre_tool_ask "[pre-tool-guard] Subagent 정의 파일(.claude/agents/) 편집 확인 필요. 이 영역은 prompt-tuner 가 관리합니다."
    hooks_log "pre-tool-guard.ask" "$(jq -n --arg f "$FILE_PATH" --arg rule "subagent-edit" '{file:$f, rule:$rule}')"
    exit 0
  fi

  # 7) package-lock.json 직접 편집 (ask)
  if echo "$FILE_PATH" | grep -qE 'package-lock\.json$'; then
    hooks_pre_tool_ask "[pre-tool-guard] package-lock.json 직접 편집 확인 필요. 보통 npm install 로 자동 생성됩니다."
    hooks_log "pre-tool-guard.ask" "$(jq -n --arg f "$FILE_PATH" --arg rule "lockfile-edit" '{file:$f, rule:$rule}')"
    exit 0
  fi

  exit 0
fi

# 다른 도구는 통과
exit 0
