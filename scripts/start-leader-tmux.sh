#!/usr/bin/env bash
# start-leader-tmux.sh
# Leader(백그라운드 Claude Code 세션)를 tmux 세션 'tiktok-leader' 안에서 기동한다.
# - 이미 세션이 살아 있으면 아무 것도 하지 않음(이중 기동 방지)
# - 세션이 없으면 detached 모드로 새로 생성하고 cwd = PROJECT_ROOT
# - launchd(RunAtLoad)에서 호출되어도 재진입 안전
#
# 직접 실행: ./scripts/start-leader-tmux.sh
# attach:   tmux attach -t tiktok-leader
# 종료:     tmux kill-session -t tiktok-leader

set -euo pipefail

SESSION_NAME="tiktok-leader"

# 프로젝트 루트 자동 계산(스크립트 위치 기준)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# tmux 존재 확인
if ! command -v tmux >/dev/null 2>&1; then
  echo "[start-leader-tmux] tmux가 설치되어 있지 않습니다. 'brew install tmux' 실행 후 다시 시도하세요." >&2
  exit 127
fi

# claude CLI 존재 확인
if ! command -v claude >/dev/null 2>&1; then
  echo "[start-leader-tmux] claude CLI가 PATH에 없습니다. Claude Code 설치 후 다시 시도하세요." >&2
  exit 127
fi

# 이미 세션이 살아 있으면 조용히 종료(재진입 안전)
if tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
  echo "[start-leader-tmux] 기존 tmux 세션 '$SESSION_NAME' 감지 — 재사용"
  exit 0
fi

# detached 모드로 tmux 세션 생성 후 claude 기동
# -d: detach, -s: 세션 이름, -c: 작업 디렉토리
tmux new-session -d -s "$SESSION_NAME" -c "$PROJECT_ROOT" "claude"

echo "[start-leader-tmux] tmux 세션 '$SESSION_NAME' 생성 완료 (cwd=$PROJECT_ROOT)"
echo "[start-leader-tmux] attach: tmux attach -t $SESSION_NAME"
