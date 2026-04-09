# P0-POC 실행 가이드 — 3명 팀 생성 후 1 시나리오 동작 확인

> 실행 시간: **약 30분** | 토큰 소비: Max 플랜의 **< 1%** | 검증 목적: Agent Teams의 F-8.3 연쇄 메커니즘, F-8.4 plan mode, R-13 세션 손실 행태 사전 체감

## 실행 전 체크리스트

- [ ] P0-E1 완료 (Agent Teams 활성화 확인) — ✅ 이미 PASS
- [ ] 새 터미널 창 열 준비 (기존 Claude Code 세션과 **별도**)
- [ ] 프로젝트 루트에서 실행 권장: `cd /Users/jungmo/Developer/Claude-Core/tiktok-automation_2026-04-08`

## 단계별 절차

### Step 1. 새 터미널에서 `claude` 실행

```bash
cd /Users/jungmo/Developer/Claude-Core/tiktok-automation_2026-04-08
claude
```

Claude Code 대화형 세션이 시작됩니다. 이 세션이 **Leader** 역할을 합니다.

### Step 2. 팀 생성 프롬프트 입력

다음을 복사 붙여넣기:

```
Create an agent team named poc-team with 3 teammates: trend-scout, script-writer, hook-critic. Each teammate should use opus model. Briefly describe what each does:
- trend-scout: finds trending topics for TikTok
- script-writer: writes 5-sentence 20-second scripts
- hook-critic: criticizes the hook (first 3 seconds) adversarially
```

**관찰 포인트**:
- 팀 생성 소요 시간 (예: ~10초)
- Claude가 어떤 응답 포맷으로 확인하는지
- 에러/경고 메시지 유무

### Step 3. Teammate 로드 확인 (상태바 사용)

> **정정 사항 (2026-04-08)**: `/agents` 슬래시 명령은 **프로젝트/로컬 에이전트 조회용**이지 teammate 조회용이 아닙니다. 현재 로드된 teammate는 **Claude Code 하단 상태바**에 `@main @trend-scout @script-writer @hook-critic` 형태로 실시간 표시되므로 별도 명령 없이 즉시 확인 가능합니다.

**기대 결과**: 상태바에 3명 teammate + `main` (Leader) 표시.

**캡처 대상**: 상태바 영역 스크린샷 1장.

### Step 4. trend-scout에게 작업 요청

```
Ask trend-scout to suggest 3 topics about love psychology for TikTok. Each topic should include: title (Korean), hook hint, target age group.
```

**관찰 포인트**:
- trend-scout가 spawn되는 시점 (Leader → teammate 전환)
- 응답까지 소요 시간 (예: ~30초~1분)
- 응답 포맷 (번호 리스트? 마크다운?)
- trend-scout가 작업 후 스스로 종료되는지, Leader가 대기 상태로 돌아오는지

**캡처 대상**: trend-scout의 응답 전체 (3개 주제)

### Step 5. (보너스, 선택) 2번째 teammate 호출 테스트

```
Ask script-writer to pick the first topic from trend-scout and write a 5-sentence script.
```

**관찰 포인트**: script-writer가 trend-scout의 이전 출력을 어떻게 참조하는지. Leader가 수동으로 전달하는지, 자동으로 shared context에서 읽는지.

### Step 6. 팀 정리

```
Clean up the team
```

또는

```
Delete the poc-team
```

**기대 결과**: 3명 모두 shutdown + 팀 자체 삭제 확인.

### Step 7. 정리 검증

**기대 결과**: 상태바에서 `@trend-scout @script-writer @hook-critic` 사라지고 `@main`만 남거나 전부 사라짐. 별도 명령 불필요.

### Step 8. Claude 세션 종료

```
/exit
```

또는 Ctrl+C.

## 관찰 기록 템플릿

실행 후 아래 빈칸을 채워서 알려주시면 제가 `docs/phase0-poc-result.md`에 정식 기록하고 `verify_task`로 P0-POC를 완료 처리하겠습니다.

```
### POC 실행 결과 (2026-04-08)

**1. 팀 생성 (Step 2)**
- 소요 시간:
- 에러/경고:
- 특이사항:

**2. /agents 목록 (Step 3)**
```
(여기에 출력 붙여넣기)
```

**3. trend-scout 응답 (Step 4)**
- 소요 시간:
- 응답 전문:
```
(주제 3개 복사)
```

**4. script-writer 응답 (Step 5, 선택)**
```
(선택 실행 시 결과)
```

**5. Clean up (Step 6~7)**
- 정리 성공 여부:
- `/agents` 비어 있음 확인:

**6. 전체 관찰 사항 (F-8.3 / F-8.4 / R-13 관점)**
- spawn/shutdown 동작 방식:
- 세션이 중간에 끊기면 어떻게 될 것 같은지:
- plan mode 전환 관련 힌트 (`Switch to plan mode` 지원 여부):
- 전체 소요 시간:
- Phase 1 구현 시 반드시 주의할 점:
```

## 실행 중 문제 발생 시

- **"Create an agent team" 명령을 못 알아들을 때**: Claude Code 버전이 2.1.32 미만일 가능성. `claude --version`으로 재확인.
- **trend-scout가 응답하지 않을 때**: 환경 변수 `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`이 해당 세션에서 상속되었는지 확인. `env | grep AGENT_TEAMS` 실행.
- **Max 플랜 사용량 경고**: 즉시 `Clean up the team`으로 종료하고 알려주세요.

## 완료 후

위 템플릿에 관찰 내용을 기록해서 메시지로 보내주시면:

1. `docs/phase0-poc-result.md` 정식 파일 생성
2. `docs/ROADMAP.md` L166 체크박스 `- [x]`로 갱신
3. Shrimp `verify_task` 호출로 P0-POC 완료 처리
4. **Phase 0 최종 완료 요약** 리포트 작성 → Phase 1 착수 준비 안내
