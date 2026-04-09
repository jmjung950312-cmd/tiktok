#!/usr/bin/env bash
# uninstall-leader-daemon.sh
# com.tiktok.leader launchd 에이전트를 언로드하고 plist 파일을 제거.
# tmux 세션도 함께 종료한다(사용자가 원하면 --keep-session 옵션으로 보존).

set -euo pipefail

PLIST_DEST="$HOME/Library/LaunchAgents/com.tiktok.leader.plist"
SESSION_NAME="tiktok-leader"
KEEP_SESSION=0

# 옵션 파싱
for arg in "$@"; do
  case "$arg" in
    --keep-session) KEEP_SESSION=1 ;;
    -h|--help)
      echo "usage: $0 [--keep-session]"
      echo "  --keep-session : tmux 세션은 종료하지 않음"
      exit 0
      ;;
  esac
done

# launchctl unload
if [ -f "$PLIST_DEST" ]; then
  if launchctl list 2>/dev/null | grep -q "com.tiktok.leader"; then
    launchctl unload "$PLIST_DEST" || true
    echo "[uninstall] launchctl unload 완료"
  fi
  rm -f "$PLIST_DEST"
  echo "[uninstall] plist 제거: $PLIST_DEST"
else
  echo "[uninstall] plist가 존재하지 않습니다(이미 제거됨)"
fi

# tmux 세션 종료(옵션)
if [ "$KEEP_SESSION" -eq 0 ]; then
  if command -v tmux >/dev/null 2>&1 && tmux has-session -t "$SESSION_NAME" 2>/dev/null; then
    tmux kill-session -t "$SESSION_NAME"
    echo "[uninstall] tmux 세션 '$SESSION_NAME' 종료"
  fi
else
  echo "[uninstall] --keep-session: tmux 세션 유지"
fi

echo "[uninstall] 완료"
