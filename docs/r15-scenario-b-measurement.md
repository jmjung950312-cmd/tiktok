# R-15 시나리오 B (plan mode × Opus 3중첩) 토큰 실측 리포트

> 작성일: 2026-04-09 | 담당: 이정모 | 관련 태스크: P2-T08 / 관련 리스크: R-15 (PRD §15) / 관련 결정: C-5 일일 사용 제한
>
> 본 리포트는 **시나리오 B**(`frontend-builder` + `backend-builder` + `code-reviewer` 3명을 plan mode × Opus로 spawn) 가동 시 토큰 소비량을 실측해 PRD §15 R-15 가정값(7배)을 검증하고, P0-C5에서 보류했던 **일일 사용 제한 정책**의 권고안을 제시한다.

---

## 1. 가설과 비교 기준

| 항목 | 값 |
|---|---|
| **가설(PRD §15 R-15)** | plan mode × Opus 중첩으로 토큰 소비가 **단일 Sonnet 시나리오 A의 약 7배** |
| **비교 기준 1** | 시나리오 A 1회 (`/tiktok-generate love-psychology`) — Sonnet 5명 + Opus 1명(hook-critic) |
| **비교 기준 2** | Max 플랜 일일 토큰 한도(공개 미공개 — 경험적으로 ~수백만 input + 수십만 output 토큰 수준으로 추정) |
| **측정 도구** | (1) tmux Leader 세션의 `/context` 슬래시 커맨드 (delta 확인), (2) `~/.claude/projects/*/transcripts/*.jsonl` 파싱(필요 시) |

---

## 2. 측정 절차 (재현 가능)

### 2.1 사전 준비

1. **tmux 데몬 가동 확인** (P2-T11 산출물)
   ```bash
   tmux has-session -t tiktok-leader && echo OK
   tmux attach -t tiktok-leader   # 또는 새 창에서 확인
   ```
2. **Next.js dev 서버는 일시 정지** (R-18) — `pkill -f "next dev"` 또는 별도 터미널에서 Ctrl-C
3. **DB 정합성** — `data/jobs/*` 와 `team_triggers` 가 idle 상태인지 확인
4. **베이스라인 컨텍스트 캡처**
   - tmux Leader 세션에 attach 후 `/context` 입력 → 결과를 `docs/r15-baseline-context.txt` 로 저장(비공개 첨부)

### 2.2 시나리오 A 1회 (Sonnet 비교 기준)

1. 별도 셸에서 `npm run dev` 잠깐 기동 → 대시보드에서 카테고리 선택 + "5개 자동 생성" 클릭
2. 시나리오 A 종료(VideoCard 5개 완료)까지 대기 — 보통 10~15분
3. tmux Leader 세션 `/context` 재실행 → delta 기록 → 표 §3.1 채우기
4. dev 서버 다시 정지

### 2.3 시나리오 B 1회 (plan mode × Opus 3중첩 측정)

1. 측정 대상 작업 1개 선정. 권장 후보:
   - **Phase 2 잔여 태스크 1개** (예: 본 리포트 작성 시점 기준 P2-T07 또는 P2-T09 잔여분)
   - 측정의 공정성을 위해 실제 코드 변경이 필요한 작업이어야 함(no-op 금지)
2. dev 서버 잠깐 기동 → /settings 페이지의 "기능 요청 / 버그 리포트" 폼 작성
   - 제목: 예) "P2-T07 카라오케 모드 작은 단어 1개 케이스 단위 테스트 추가"
   - 상세: 예) "scripts/test-karaoke.ts 의 검증 케이스를 vitest로 이전하고 CI 후크 등록"
   - 우선순위: medium
3. "시나리오 B 트리거 등록" 클릭 → R-18 토스트 확인 → dev 서버 다시 정지
4. tmux Leader 세션이 트리거를 집어가는 것을 관찰
5. Leader 가 `frontend-builder` / `backend-builder` / `code-reviewer` 3명 spawn 직후 각각 `Switch to plan mode` 메시지 전송 (P0-B2 절차)
6. 3명 plan 승인 → 코드 변경 → 리뷰 → 종료까지 대기 (보통 30~90분)
7. tmux Leader 세션 `/context` 재실행 → delta 기록 → 표 §3.2 채우기

### 2.4 계산

```
ratio        = scenarioB_total / scenarioA_total
plan_overhead = (scenarioB_total - scenarioB_estimated_no_plan_mode) / scenarioB_total
opus_share    = opus_tokens / scenarioB_total
```

`scenarioB_estimated_no_plan_mode` 는 Anthropic 공식 plan mode 가이드의 "no-plan baseline" 추정치를 사용하거나 동일 작업을 plan mode 없이 한번 더 가동해 측정한다(시간 허용 시).

---

## 3. 실측 결과 (TBD — 별도 세션에서 측정 후 갱신)

### 3.1 시나리오 A 베이스라인

| 항목 | 값 |
|---|---|
| 측정 일시 | _YYYY-MM-DD HH:MM_ |
| 작업 내용 | `/tiktok-generate <category>` |
| 소요 시간 | _NN분_ |
| Sonnet input 토큰 | _NNN,NNN_ |
| Sonnet output 토큰 | _NN,NNN_ |
| Opus input 토큰 (hook-critic) | _NN,NNN_ |
| Opus output 토큰 (hook-critic) | _N,NNN_ |
| **합계 (input + output)** | **_NNN,NNN_** |

### 3.2 시나리오 B 실측

| 항목 | 값 |
|---|---|
| 측정 일시 | _YYYY-MM-DD HH:MM_ |
| 작업 내용 | _요청 제목_ |
| Teammate 3인 plan mode 활성 여부 | ☐ frontend ☐ backend ☐ code-reviewer |
| 소요 시간 | _NN분_ |
| frontend-builder Opus tokens | _NNN,NNN_ |
| backend-builder Opus tokens | _NNN,NNN_ |
| code-reviewer Opus tokens | _NNN,NNN_ |
| Leader Opus tokens | _NN,NNN_ |
| **합계 (input + output)** | **_NNN,NNN_** |

### 3.3 비교 지표

| 지표 | 값 | 가설(7배)과 차이 |
|---|---|---|
| ratio (B / A) | _N.N_ | _+/- N.N_ |
| plan mode overhead | _NN%_ | _N/A_ |
| Opus 비중 | _NN%_ | _N/A_ |
| Max 플랜 일일 한도 대비 단일 가동 점유율(추정) | _NN%_ | _N/A_ |

---

## 4. P0-C5 일일 제한 정책 권고 (실측 후 업데이트)

> 측정 전 임시 권고 — `ratio` 가 다음 범위에 들어갈 때 채택할 정책:

| ratio 구간 | 권고 정책 | UI 반영 |
|---|---|---|
| **< 3배** | 별도 제한 불필요 | 현행 R-18 토스트 유지 |
| **3 ~ 6배** | 일일 2회 권고(소프트 캡) | 시나리오 B 트리거 시 "오늘 N회째" 카운터 표시 |
| **6 ~ 10배** | 일일 1회 하드 캡 | 2회째 시도 시 토스트 "오늘 한도 도달, 내일 재시도" 후 큐 거절 (`/api/team/trigger` 400) |
| **> 10배** | 1회/3일 + 사전 확인 모달 | "정말 가동하시겠습니까? 토큰 소모 ratio: NN배" 확인 |

> 실측 완료 후 위 표에서 해당 행을 굵게 표시하고, 필요 시 `lib/team/scenarios.ts` `ScenarioB.expectedDurationMin`·DB 스키마(`team_triggers.daily_count`)·`/api/team/trigger` 가드를 추가한다.

---

## 5. 부수 권고

- **R-18(작업 공존 충돌)** — 시나리오 B 가동 중 dev 서버는 반드시 정지. 폼 제출 시 토스트로 안내(P2-T08 구현 완료).
- **R-13(세션 손실)** — tmux Leader 세션이 죽으면 plan mode 승인 흐름이 끊기므로 P2-T11 launchd 자동 기동 + R-13 stale 복구 hook 동작 확인 필수.
- **Phase 3 자동화 단계 진입 전** — 본 리포트의 ratio 가 7배 이상이면 시나리오 D(prompt-tuner 연쇄)도 동일하게 측정하여 합산 정책 수립.

---

## 6. 변경 이력

| 일자 | 변경 |
|---|---|
| 2026-04-09 | 초기 작성(P2-T08). 측정 절차 + 결과 템플릿 + 정책 표 placeholder |
| _TBD_ | 첫 실측 결과 반영 |
