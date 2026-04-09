#!/usr/bin/env bash
# MeloTTS 1회성 셋업 스크립트
# 용도: Python venv 생성 + MeloTTS 설치 + 한국어 모델 최초 다운로드(~500MB)
# 실행: npm run setup:melo
# 관련 PRD: §9.2, DoD 1

set -euo pipefail

# 색상 출력
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}[MeloTTS 셋업 시작]${NC}"

# 1) 환경 변수로 Python 바이너리 오버라이드 허용 (먼저 결정해야 버전 감지가 일관됨)
PYTHON_BIN="${PYTHON:-python3}"

if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
  echo -e "${RED}[에러] '$PYTHON_BIN' 을(를) 찾을 수 없습니다.${NC}"
  echo "macOS: brew install python@3.11"
  echo "또는 PYTHON=python3.11 ./scripts/setup-melo.sh 로 재실행"
  exit 1
fi

# 2) Python 버전 확인 (MeloTTS는 3.9~3.11 권장) — PYTHON_BIN 기준으로 감지
PY_VERSION=$("$PYTHON_BIN" --version 2>&1 | awk '{print $2}')
PY_MAJOR=$(echo "$PY_VERSION" | cut -d. -f1)
PY_MINOR=$(echo "$PY_VERSION" | cut -d. -f2)

echo "감지된 Python 바이너리: $PYTHON_BIN"
echo "감지된 Python 버전: $PY_VERSION"

if [ "$PY_MAJOR" -ne 3 ] || [ "$PY_MINOR" -gt 12 ]; then
  echo -e "${YELLOW}[경고] MeloTTS는 Python 3.9~3.11을 권장합니다. 현재: $PY_VERSION${NC}"
  echo -e "${YELLOW}호환성 문제 발생 시 pyenv 또는 brew로 Python 3.11 설치 권장:${NC}"
  echo "  brew install python@3.11"
  echo "  그리고 PYTHON=python3.11 ./scripts/setup-melo.sh 로 재실행"
  echo ""
  read -p "현재 Python으로 계속 진행할까요? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# 3) venv 생성 (이미 있으면 스킵)
VENV_DIR=".venv"
if [ ! -d "$VENV_DIR" ]; then
  echo -e "${GREEN}[1/4] 가상환경 생성: $VENV_DIR${NC}"
  "$PYTHON_BIN" -m venv "$VENV_DIR"
else
  echo -e "${GREEN}[1/4] 기존 .venv 재사용${NC}"
fi

# 4) pip 업그레이드
echo -e "${GREEN}[2/4] pip 업그레이드${NC}"
"$VENV_DIR/bin/pip" install -U pip --quiet

# 5) MeloTTS 설치
echo -e "${GREEN}[3/4] MeloTTS 설치 (시간 소요)${NC}"
"$VENV_DIR/bin/pip" install git+https://github.com/myshell-ai/MeloTTS.git
"$VENV_DIR/bin/python" -m unidic download

# 6) 한국어 모델 최초 다운로드 (~500MB)
echo -e "${GREEN}[4/4] 한국어 모델 최초 다운로드 (~500MB, 수 분 소요)${NC}"
"$VENV_DIR/bin/python" -c "from melo.api import TTS; TTS(language='KR', device='cpu')"

# 7) 동작 검증
TEST_WAV="/tmp/melo-test-$(date +%s).wav"
echo -e "${GREEN}[검증] '안녕하세요' 합성 테스트 → $TEST_WAV${NC}"
"$VENV_DIR/bin/python" scripts/melo_tts.py --text "안녕하세요" --out "$TEST_WAV"

if [ -f "$TEST_WAV" ] && [ "$(wc -c < "$TEST_WAV")" -gt 1024 ]; then
  echo -e "${GREEN}[성공] MeloTTS 셋업 완료. 테스트 wav: $TEST_WAV${NC}"
  rm -f "$TEST_WAV"
else
  echo -e "${RED}[실패] 테스트 wav 생성 실패${NC}"
  exit 1
fi
