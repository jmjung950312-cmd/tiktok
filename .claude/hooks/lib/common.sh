#!/usr/bin/env bash
# .claude/hooks/lib/common.sh
# 모든 hook 스크립트에서 `source` 하여 사용하는 공통 유틸.
# 절대 직접 실행 금지 (set -e 는 호출자에서 관리).
#
# 의존성: jq (brew install jq)

# -----------------------------------------------------------------------------
# 프로젝트 루트 경로 해결
# 우선순위: $CLAUDE_PROJECT_DIR → 스크립트 위치 기준
# -----------------------------------------------------------------------------
hooks_project_root() {
  if [ -n "${CLAUDE_PROJECT_DIR:-}" ]; then
    printf '%s' "$CLAUDE_PROJECT_DIR"
  else
    # BASH_SOURCE[1] = 이 함수를 호출한 스크립트
    cd "$(dirname "${BASH_SOURCE[1]}")/../.." && pwd
  fi
}

# -----------------------------------------------------------------------------
# 로그 파일 경로 (.claude/logs/hooks.jsonl)
# -----------------------------------------------------------------------------
hooks_log_file() {
  printf '%s/.claude/logs/hooks.jsonl' "$(hooks_project_root)"
}

# -----------------------------------------------------------------------------
# JSONL 로그 append. 실패해도 조용히 종료.
# 사용:
#   hooks_log "post-format" "$(jq -n --arg f foo.ts '{file: $f}')"
# -----------------------------------------------------------------------------
hooks_log() {
  local event="$1"
  local data="${2:-{\}}"
  local log_file
  log_file="$(hooks_log_file)"
  mkdir -p "$(dirname "$log_file")" 2>/dev/null || return 0
  jq -n \
    --arg ts "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --arg event "$event" \
    --argjson data "$data" \
    '{ts: $ts, event: $event, data: $data}' >> "$log_file" 2>/dev/null || true
}

# -----------------------------------------------------------------------------
# stdin JSON 을 변수로 읽어두기 (한 번만 소비 가능)
# 사용:
#   INPUT="$(hooks_read_stdin)"
#   SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty')
# -----------------------------------------------------------------------------
hooks_read_stdin() {
  cat
}

# -----------------------------------------------------------------------------
# 편집 플래그 경로 (세션별)
# PostToolUse 에서 touch, Stop 에서 확인·삭제.
# -----------------------------------------------------------------------------
hooks_edit_flag_path() {
  local session_id="${1:-unknown}"
  printf '%s/.claude/logs/.edit-flag-%s' "$(hooks_project_root)" "$session_id"
}

# -----------------------------------------------------------------------------
# 오래된 편집 플래그 청소 (하루 이상 된 것)
# -----------------------------------------------------------------------------
hooks_cleanup_stale_flags() {
  local log_dir
  log_dir="$(hooks_project_root)/.claude/logs"
  [ -d "$log_dir" ] || return 0
  find "$log_dir" -maxdepth 1 -name '.edit-flag-*' -mtime +0 -delete 2>/dev/null || true
}

# -----------------------------------------------------------------------------
# JSON 응답을 stdout으로 출력 (PreToolUse deny 전용 헬퍼)
# -----------------------------------------------------------------------------
hooks_pre_tool_deny() {
  local reason="$1"
  jq -n --arg r "$reason" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: $r
    }
  }'
}

# -----------------------------------------------------------------------------
# JSON 응답을 stdout으로 출력 (PreToolUse ask 전용 헬퍼)
# -----------------------------------------------------------------------------
hooks_pre_tool_ask() {
  local reason="$1"
  jq -n --arg r "$reason" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "ask",
      permissionDecisionReason: $r
    }
  }'
}

# -----------------------------------------------------------------------------
# Stop 응답 (block)
# -----------------------------------------------------------------------------
hooks_stop_block() {
  local reason="$1"
  jq -n --arg r "$reason" '{decision: "block", reason: $r}'
}
