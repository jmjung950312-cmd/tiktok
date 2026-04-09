#!/usr/bin/env python3
"""MeloTTS warm keep daemon.

문장마다 Python 프로세스를 새로 띄우는 one-shot 방식(scripts/melo_tts.py)의
콜드 스타트 비용(~5초/문장)을 제거하기 위해, 본 프로세스를 상주시킨 뒤
stdin JSON-L 프로토콜로 합성 요청을 받아 처리한다.

프로토콜
--------
요청 (stdin, UTF-8 한 줄 JSON):
    {"id": "<req-id>", "text": "...", "speaker": 0, "speed": 1.0, "out": "/path/to/out.wav"}

응답 (stdout, UTF-8 한 줄 JSON):
    {"id": "<req-id>", "ok": true, "out": "/absolute/path.wav"}
    {"id": "<req-id>", "ok": false, "error": "..."}

특수 명령:
    {"id": "<req-id>", "cmd": "ping"}   → {"id":..., "ok": true, "pong": true}
    {"id": "<req-id>", "cmd": "shutdown"} → {"id":..., "ok": true} 후 정상 종료

lib/providers/tts/melo-tts.ts가 본 daemon을 spawn하여 재사용한다.
MELO_DAEMON=0 환경변수가 설정되면 TS 레이어가 기존 one-shot 경로(scripts/melo_tts.py)로 폴백한다.
"""

from __future__ import annotations

import json
import signal
import sys
from pathlib import Path
from typing import Any

# ========== 초기화 ==========

def _write_response(payload: dict[str, Any]) -> None:
  """응답 한 줄 JSON을 stdout에 쓰고 즉시 flush.

  응답 JSON 안에는 '\n' 금지 (라인 프로토콜 위반 방지).
  """
  line = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
  sys.stdout.write(line + "\n")
  sys.stdout.flush()


def _log(msg: str) -> None:
  """stderr로 진단 로그 출력(stdout은 프로토콜 전용)."""
  sys.stderr.write(f"[melo-daemon] {msg}\n")
  sys.stderr.flush()


def _install_signal_handlers() -> None:
  """SIGTERM/SIGINT 수신 시 stdin 루프를 조용히 종료."""
  def _handler(signum, _frame):  # type: ignore[no-untyped-def]
    _log(f"signal {signum} 수신 — 종료")
    sys.exit(0)

  signal.signal(signal.SIGTERM, _handler)
  signal.signal(signal.SIGINT, _handler)


def _load_model():  # type: ignore[no-untyped-def]
  """MeloTTS 모델을 1회 로드. 실패 시 stderr로 원인 출력 후 프로세스 종료."""
  try:
    from melo.api import TTS  # type: ignore[import-not-found]
  except ImportError as err:
    _log(f"melo 패키지 import 실패: {err}. 'npm run setup:melo' 먼저 실행하세요.")
    sys.exit(1)

  _log("모델 로드 중... (KR, cpu)")
  model = TTS(language="KR", device="cpu")
  speaker_ids = model.hps.data.spk2id
  _log(f"모델 로드 완료. speakers={list(speaker_ids.keys())}")
  return model, speaker_ids


# ========== 요청 처리 ==========

def _handle_request(model, speaker_ids, req: dict[str, Any]) -> dict[str, Any]:  # type: ignore[no-untyped-def]
  """단일 요청 dict → 응답 dict 변환."""
  req_id = req.get("id", "")

  # 특수 명령
  cmd = req.get("cmd")
  if cmd == "ping":
    return {"id": req_id, "ok": True, "pong": True}
  if cmd == "shutdown":
    # 응답을 보낸 뒤 호출자에서 종료 처리
    return {"id": req_id, "ok": True, "shutdown": True}

  # 합성 요청 필드 검증
  text = req.get("text")
  out = req.get("out")
  speaker = int(req.get("speaker", 0))
  speed = float(req.get("speed", 1.0))

  if not isinstance(text, str) or not text.strip():
    return {"id": req_id, "ok": False, "error": "text 가 비어 있음"}
  if not isinstance(out, str) or not out:
    return {"id": req_id, "ok": False, "error": "out 경로가 비어 있음"}

  out_path = Path(out)
  out_path.parent.mkdir(parents=True, exist_ok=True)

  # 화자 ID 매핑(한국어는 단일 화자 KR)
  speaker_keys = list(speaker_ids.keys())
  if not speaker_keys:
    return {"id": req_id, "ok": False, "error": "사용 가능한 화자가 없음"}
  speaker_index = max(0, min(speaker, len(speaker_keys) - 1))
  speaker_id = speaker_ids[speaker_keys[speaker_index]]

  try:
    model.tts_to_file(text, speaker_id, str(out_path), speed=speed)
  except Exception as err:  # MeloTTS 내부 에러 전달
    return {"id": req_id, "ok": False, "error": f"tts_to_file 실패: {err}"}

  if not out_path.exists():
    return {"id": req_id, "ok": False, "error": f"wav 파일 생성 실패: {out_path}"}

  return {"id": req_id, "ok": True, "out": str(out_path.resolve())}


# ========== 메인 루프 ==========

def main() -> int:
  _install_signal_handlers()
  model, speaker_ids = _load_model()

  # 초기화 완료 신호 — TS 레이어가 ensureDaemon()에서 대기할 수 있도록
  _write_response({"id": "boot", "ok": True, "ready": True})

  while True:
    line = sys.stdin.readline()
    if not line:
      _log("stdin EOF — 종료")
      return 0

    line = line.strip()
    if not line:
      continue

    try:
      req = json.loads(line)
    except json.JSONDecodeError as err:
      _write_response({"id": "", "ok": False, "error": f"JSON 파싱 실패: {err}"})
      continue

    response = _handle_request(model, speaker_ids, req)
    _write_response(response)

    if response.get("shutdown"):
      _log("shutdown 명령 처리 — 종료")
      return 0


if __name__ == "__main__":
  sys.exit(main())
