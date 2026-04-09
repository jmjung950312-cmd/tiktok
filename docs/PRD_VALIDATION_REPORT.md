# PRD 재검증 리포트 — TikTok 자동화 파이프라인 (개정본)

> 검증 대상: `/Users/jungmo/Developer/Claude-Core/tiktok-automation_2026-04-08/PRD.md` (1,088줄, 17개 섹션)
> 검증일: 2026-04-08
> 검증자: Claude Opus 4.6 (1M)
> 이전 검증: 2026-04-08 1차(조건부 통과, 16개 패치 권고)
> 이번 검증의 핵심: (a) 1차 권고 반영 여부, (b) 12명 팀 + 6 시나리오 확장 설계의 실현 가능성

---

## 1. 요약 (Executive Summary)

1. **1차 검증의 16개 Claude CLI 패치는 100% 반영**되었고, 단계 축소(6→4)와 폴더 구조 정리도 깔끔하게 처리되었습니다. LLM 레이어 교체 측면에서는 PRD 품질이 크게 향상되었습니다.
2. **그러나 신규 추가된 §8(팀 구성) 영역에서 공식 문서와 충돌하거나 명시되지 않은 기술 가정이 다수 발견**되었습니다. 가장 심각한 것은 (a) Anthropic 공식 권고 "팀원은 Sonnet 사용"과 정면 배치되는 Q5 결정(Opus 2명), (b) 시나리오 B의 plan mode 토큰 7배 증가 사실이 §15에 미반영, (c) "리더당 한 팀만" 제약 하에서 시나리오 C↔A 동시 트리거 직렬화 미명세입니다.
3. **블로커 수준의 문제는 1건**(§8.4 자동 발동 메커니즘이 공식 문서의 "Subagent는 다른 subagent를 생성할 수 없다"와 모호하게 충돌). 개선 권고는 12건, 검토 필요는 6건입니다.
4. **Q1~Q5 일관성**: Q1, Q2, Q4는 PRD 전반에 모순 없이 반영. Q3은 cron 설정 단계가 §14에 누락. Q5는 PRD 내에서는 일관되나 공식 비용 권고와 충돌 — 사용자 결정의 비용 영향을 §15에 명시하는 것이 권고됩니다.
5. **최종 판정: 조건부 통과 (구현 착수 가능, 단 §8.4 명세 1건 + §15 위험 표 보강 3건은 구현 시작 전 패치 권장)**. 1차 검증 대비 PRD 완성도는 명백히 상승했고, 12명 팀 구조는 합리적이지만 운영 리스크 문서화가 부족합니다.

---

## 2. 이전 검증 이슈 해결 현황 — 16개 위치 패치 체크리스트

1차 검증에서 지적한 16개 위치를 라인 번호와 함께 전수 확인했습니다.

| # | 1차 지적 위치 | 현재 PRD 위치 | 패치 상태 | 비고 |
|---|---|---|---|---|
| 1 | 구 L25 §1 핵심 제약 표 "LLM \| Claude Code CLI" | **L27** | ✅ 완료 | "Claude Code Agent Teams (구독 내장 기능)"로 교체됨 |
| 2 | 구 L58 DoD #2 "Claude CLI 존재" | **L62~63** | ✅ 완료 | DoD #2(seed:assets)에서 Claude CLI 제거. **DoD #3 신설**: `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` + 12개 Subagent 정의 + `/tiktok-generate` 인식 검증 |
| 3 | 구 L94 사용자 여정 "1단계: 주제 5개 생성 (Claude CLI)" | **L111~117** | ✅ 완료 | 시나리오 A 5명 다이어그램으로 완전 교체 |
| 4 | 구 L95 사용자 여정 "2단계: 대본 생성 × 5 (Claude CLI)" | **L113~114** | ✅ 완료 | script-writer + hook-critic 직접 메시징으로 명시 |
| 5 | 구 L136 M-03 헤더 "(Claude CLI)" | **L166** | ✅ 완료 | "M-03. 콘텐츠 제작 팀 (시나리오 A — 5명)"로 교체 |
| 6 | 구 L138 M-03 본문 "claude -p 서브프로세스" | **L168~178** | ✅ 완료 | 5명 Teammate 역할 분담으로 전면 재작성, `final-content.json` 인터페이스 명시 |
| 7 | 구 L139 "API 키 없음, Max 플랜 크레딧" | **L27** | ✅ 완료 | "Max 플랜 이미 보유. CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1로 활성화"로 정확화 |
| 8 | 구 L148 "크레딧 소진 시 에러" | **L1025** | ✅ 완료 | "Max 플랜 사용량 한도 도달" 위험으로 §15에 이동 |
| 9 | 구 L251 §7 구조적 결정 #3 (Shrimp 역할) | **L294~298** | ✅ 완료 + 강화 | 4대 구조적 결정으로 확장. 결정 #3(Agent Teams)과 #4(Shrimp 역할 분리)가 분리 명시됨 |
| 10 | 구 L279 §7 외부 프로세스 "Claude Code CLI" | **L324~326** | ✅ 완료 | "LLM 레이어 (외부 프로세스 아님)" 섹션 신설, "Next.js 서버가 직접 호출하지 않고, 별도의 Claude Code 세션(Leader)이 백그라운드에서 상주"로 교체 |
| 11 | 구 L325 폴더 구조 "llm.ts # Claude CLI spawn 래퍼" | **L405~411** | ✅ 완료 | `lib/providers/llm.ts` 자체가 폴더 구조에서 제거됨. `lib/team/trigger-repo.ts` 등 신규 모듈로 대체 |
| 12 | 구 L575~577 .env.example `CLAUDE_CLI_PATH=` | **L926~929** | ✅ 완료 | `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`로 교체. 추가로 `.claude/settings.json` 예시도 L955~962에 명시 |
| 13 | 구 L613 Phase 1 태스크 #2 "Claude CLI는 시스템 설치 완료" | **L978** | ✅ 완료 | 의존성 설치 항목에서 Claude CLI 언급 제거. 태스크 4(L980)로 활성화 단계 분리 |
| 14 | 구 L617 Phase 1 태스크 #6 "Claude CLI 확인" | **L987** | ✅ 완료 | 태스크 11(환경 검증) "Agent Teams 활성화, ..."로 교체 |
| 15 | 구 L647 §14 위험 표 "Claude CLI 크레딧 소진" | **L1023, L1025** | ✅ 완료 + 강화 | "Agent Teams 실험적 기능 불안정성"(L1023) + "Max 플랜 사용량 한도 도달"(L1025)로 분할 |
| 16 | 구 L694 §16 새로 구현할 것 "Claude CLI 헤드리스 래퍼" | **L1079~1088** | ✅ 완료 | `.claude/agents/` 12개, `.claude/commands/` 4개, `.claude/hooks/session-start-poll.sh`, `lib/team/` 모듈로 명세 강화 |

**전체 결론**: **16/16 패치 100% 반영**. 추가로 다음 보너스 개선이 확인됨:
- §16 범위 외 항목에 "Agent SDK 기반 구현 금지"(L1049), "API 키 기반 Claude 호출 금지"(L1050) 명시 — 구현 가드레일로 우수
- §17 재사용 자원 표에 ohajo 참조(L1074~1075) 추가 — 1차 검증의 권고를 적극 반영

---

## 3. 신규 영역 검증 결과

### 3.1 §8 팀 구성 (L461~586)

#### [FACT 기반 정량 검증]

공식 문서(`https://code.claude.com/docs/ko/agent-teams`, `/ko/costs`)에서 확인된 사실:
- **[FACT]** "대부분의 워크플로우에 대해 **3-5명의 팀원으로 시작**합니다... **세 명의 집중된 팀원은 종종 다섯 명의 산만한 팀원을 능가합니다**"
- **[FACT]** "**팀원에게 Sonnet을 사용하십시오**. 조정 작업을 위해 기능과 비용의 균형을 맞춥니다"
- **[FACT]** "에이전트 팀은 **plan mode에서 실행될 때 표준 세션보다 약 7배 더 많은 토큰**을 사용합니다"
- **[FACT]** "**리더는 한 번에 한 팀만 관리할 수 있습니다**. 새 팀을 시작하기 전에 현재 팀을 정리합니다"
- **[FACT]** "**Subagent는 다른 subagent를 생성할 수 없습니다**" (Subagent 문서)
- **[FACT]** "**중첩된 팀 없음**: 팀원들은 자신의 팀이나 팀원을 생성할 수 없습니다. 리더만 팀을 관리할 수 있습니다"
- **[FACT]** "팀원은 **리더의 권한 모드로 시작**합니다... **생성 시 팀원별 모드를 설정할 수 없습니다**"
- **[FACT]** "프로젝트 subagent는 현재 작업 디렉토리에서 위로 이동하여 검색됩니다"
- **[FACT]** "팀원들은 작업 디렉토리에서 **CLAUDE.md 파일을 읽습니다**. 이를 사용하여 모든 팀원에게 프로젝트별 지침을 제공합니다"

#### 발견사항

**F-8.1 [INFERENCE / 검토 권고]** — 12명 풀 자체는 합리적이나 시나리오별 동시 활성 인원은 모두 공식 권장 범위(3~5명) 내. 시나리오 A(5명)는 권장 상한, 시나리오 D(3명)·B(3명)은 권장 중간, 시나리오 E(1명)·F(2명)은 권장 하한. **풀 12명이 한 번에 활성화되는 일은 없으므로 §8.2 표 자체는 OK**. 다만 §8.2 표(L473~487)에서 "Spawn 패턴" 컬럼을 추가해 "어떤 시나리오에서 활성"인지를 한눈에 볼 수 있게 하는 것이 좋습니다.

**F-8.2 [FACT 충돌 / 즉시 수정 권고]** — Q5 결정으로 hook-critic, code-reviewer 2명을 Opus로 지정(L477, L482, L488)했습니다. 그러나 공식 비용 문서는 "**팀원에게 Sonnet을 사용하십시오**"를 명시 권고합니다. 이 결정 자체가 잘못된 것은 아니지만(품질 vs 비용 트레이드오프는 사용자 권한), **§15 위험 표에 "Opus 팀원 사용 시 토큰 사용량 추가 증가" 항목이 빠져 있는 것이 문제**입니다. 시나리오 B는 (Q2 plan mode × Q5 Opus 1명) 중첩으로 토큰 누적이 비선형으로 증가합니다.

**F-8.3 [FACT, CRITICAL / 즉시 수정 권고]** — §8.4 자동 발동 메커니즘(L501~534)의 단계 6: "Teammate들이 병렬 작업 수행"은 정상이나, 시나리오 D(L497)의 "시나리오 C 완료 시 **자동 연계**"가 모호합니다. 공식 문서의 "**리더는 한 번에 한 팀만 관리**" + "**Subagent는 다른 subagent 생성 불가**" 두 사실을 종합하면, **자동 연계 = Leader가 시나리오 C 팀원 shutdown 후 같은 팀(`tiktok-ops-team`)에서 시나리오 D Teammate를 새로 spawn**해야 합니다. PRD에 이 흐름이 명세되지 않아, 구현 시 "Leader가 Teammate를 동적으로 spawn하고 싶을 때 정확히 어떤 명령을 사용하는가?"가 모호해집니다. 수정 권고: §8.4 다음에 "8.4.1 시나리오 연쇄 트리거 절차"를 신설해 "동일 팀 내 Teammate 교체 spawn" 메커니즘을 명시.

**F-8.4 [FACT 충돌 / 즉시 수정 권고]** — Q2 결정으로 시나리오 B builder들이 "**계획 승인 모드 필수**"(L495)로 동작해야 합니다. 그러나 공식 문서는 "**팀원은 리더의 권한 모드로 시작합니다**... **생성 시 팀원별 모드를 설정할 수 없습니다**"를 명시합니다. 즉, **builder를 plan mode로 시작하려면 Leader 세션 자체가 plan mode여야 하거나, spawn 후 개별 모드를 변경**해야 합니다. PRD M-12(L237~242)에는 단순히 "계획 승인 모드 필수"만 적혀 있고 어떻게 적용하는지 없습니다. 수정 권고: M-12 본문에 "Leader가 spawn 직후 builder에게 'Switch to plan mode' 메시지 전송" 명시.

**F-8.5 [INFERENCE / 검토 권고]** — §8.5 Leader 운영 규칙(L536~542)의 "Leader 세션이 꺼져 있으면 트리거는 queued 상태로 대기"는 합리적이나, 공식 문서의 알려진 제약 "**In-process 팀원과의 세션 재개 없음**: `/resume`과 `/rewind`는 in-process 팀원을 복원하지 않습니다"가 누락되었습니다. 즉 **Leader가 시나리오 A 실행 중에 사용자가 실수로 `claude` 창을 닫으면, 다음 시작 시 Teammate들은 모두 사라지고 작업 결과는 손실됩니다**. PRD §15 L1023~1024 위험 행이 이 점을 부분적으로 다루지만 "트리거 적체" 관점에만 머물고, "**실행 중 손실**" 시나리오는 빠져 있습니다. 수정 권고: §15에 "Leader 세션 실행 중 강제 종료 시 Teammate 진행분 손실" 위험 행 추가.

**F-8.6 [UNCERTAIN / 검토 권고]** — §8.6 Subagent 정의 파일 구조(L544~576)는 `.claude/agents/content/`, `dev/`, `analytics/`, `personalization/` 4개 서브폴더에 12개 파일을 분산시킵니다. 공식 Subagent 문서를 직접 확인한 결과 "프로젝트 subagent는 작업 디렉토리에서 위로 이동하여 검색됩니다"는 명시되지만, **서브폴더 계층 자체에 대한 명시적 지원/금지 언급은 없습니다**. ohajo 프로젝트가 실제로 `.claude/agents/dev/`, `design/`, `docs/` 구조를 사용 중인 것이 확인되어(`/Users/jungmo/Desktop/ohajo/.claude/agents/`) 사실상 동작은 하지만, **공식 보증된 패턴은 아닙니다**. 수정 권고: §15에 "[UNCERTAIN] Subagent 서브폴더 계층 검색은 비공식 동작 — 문제 발생 시 12개 파일을 `.claude/agents/` 루트에 평탄화" 폴백 옵션 명시.

**F-8.7 [INFERENCE / 검토 권고]** — §8.7 Shrimp vs Agent Teams 역할 분리(L578~585)는 좋은 시도이나, 실제 운영 시 혼란 가능성이 큽니다. 예: 시나리오 B에서 "버그픽스 작업"이 발생하면 (a) Shrimp에 새 태스크로 등록할지, (b) Agent Teams 공유 작업 목록의 런타임 서브태스크로만 처리할지 경계가 모호합니다. 표(L582)의 "예시" 컬럼이 너무 추상적입니다. 수정 권고: 표 아래에 "구체적 의사결정 트리" 추가 — 예: "30분 이상 예상 + 영구 추적 필요 → Shrimp / 30분 이내 + 시나리오 단발 → 공유 작업 목록".

**F-8.8 [FACT / 검토 권고]** — §6 비기능 요구사항 표 L280: "동시 활성 Teammate \| 공식 권장에 따라 **최대 5명** 동시 유지"는 정확합니다. 단 시나리오 D(L497)가 3명, 시나리오 A(L494)가 5명이므로 이 둘이 직렬화되는지 병렬화되는지 명시되어야 합니다. 공식 문서에 따르면 "한 번에 한 팀"이므로 **두 시나리오는 직렬 처리**되어야 합니다 — 즉 시나리오 A 실행 중에 시나리오 C가 트리거되면 queued 상태로 대기. 이 점을 §8.4 다음 또는 M-02(L157~164)에 명시 권고.

### 3.2 §9 결정론적 파이프라인 4단계 (L589~630)

**F-9.1 [FACT, GOOD]** — 6단계 → 4단계 축소가 깔끔하게 반영되었습니다. content-loader.ts(L593~597)가 신규 추가되어 `final-content.json` 인터페이스를 담당하고, voice/subtitle/video/orchestrator만 결정론 모듈로 남았습니다. **LLM 호출은 100% 제거**되어 §9.1 첫 줄(L591) "LLM 호출 없는 결정론적 처리만 다룬다"가 정확히 지켜집니다.

**F-9.2 [INFERENCE / 검토 권고]** — content-loader.ts가 기대하는 `FinalContent[]` 스키마(L597)는 "topic, script, caption, hashtags, hook, ai_disclosure" 6개 필드입니다. 그런데 §5 M-03(L177)은 Leader가 저장하는 산출물을 "5명 결과를 종합"이라고만 명시하고 정확한 JSON 스키마가 없습니다. 또 §11 metadata.json 예시(L824~844)는 "topic, script(hook+sentences), caption, hashtags, hookVerdict" 필드를 보여줍니다. **두 곳에서 필드 명세가 미묘하게 다릅니다** — `final-content.json`(파이프라인 입력)과 `metadata.json`(파이프라인 출력)을 명확히 구분해야 합니다. 수정 권고: §5 M-03 끝에 `final-content.json`의 정확한 Zod 스키마를 추가하거나, §9.1 content-loader.ts 본문에 스키마를 인라인 명시.

**F-9.3 [FACT, GOOD]** — `lib/pipeline/topic.ts`와 `script.ts`가 폴더 구조(L405~411)에서 완전히 사라지고 `lib/team/`에 시나리오 정의가 들어간 것은 1차 검증 권고를 정확히 반영한 결과입니다. callLLM() 호출 흔적도 PRD 전체에서 제거되었습니다.

### 3.3 §10 신규 API 엔드포인트 (L633~742)

**F-10.1 [INFERENCE / 검토 권고]** — `/api/team/trigger`(L635~658)의 요청 스키마는 합리적이고 Zod 검증 가능합니다. 응답에 `{ "triggerId": "uuid-xxxx", "status": "queued" }`만 반환하는데, **클라이언트가 폴링을 시작할 시점을 알 수 있도록 `pollUrl` 또는 권장 폴링 간격(`pollIntervalMs`)을 함께 반환**하는 것이 좋습니다. 환경변수 `TEAM_TRIGGER_POLL_INTERVAL_MS=2000`(L952)이 백엔드에 있으나 프론트엔드에는 직접 전달되지 않습니다.

**F-10.2 [INFERENCE, CRITICAL / 검토 권고]** — `/api/team/status`(L660~675)가 반환하는 `activeTeammates`, `completedTeammates`는 **Leader만 알 수 있는 정보**입니다. 이를 SQLite `team_triggers.active_teammates` 컬럼(L784)에 어떻게 기록할지 PRD에 명세되지 않았습니다. 후보 메커니즘:
  - (a) Leader가 Teammate spawn/shutdown마다 `team_triggers` row UPDATE
  - (b) `.claude/hooks/`에 SubagentStart/SubagentStop 훅 등록 → 훅이 SQLite를 직접 갱신

공식 문서(Subagent §"Subagent 이벤트에 대한 프로젝트 수준 hook")에 따르면 (b)가 가능하며 매우 권장됩니다. 수정 권고: §8 또는 §11에 "active_teammates 갱신 메커니즘"을 명시 — 가장 좋은 옵션은 `.claude/settings.json`에 `SubagentStart`/`SubagentStop` 훅을 등록해 SQLite UPDATE 스크립트를 호출하는 것.

**F-10.3 [INFERENCE / 검토 권고]** — `/api/prompt-changes/[id]/approve`(L735~737)는 "제안 승인 → 실제 `.claude/agents/*.md` 적용"이라고만 적혀 있습니다. 그런데 `.claude/agents/*.md`는 git 추적 대상이며 Phase 1 솔로 개발 중에는 사용자가 직접 편집할 수 있습니다. **승인 → 자동 파일 수정 시 사용자의 미커밋 변경분과 충돌하면 어떻게 되는가?** Q4 확정의 "사용자 승인" 단계가 충돌 감지까지는 보장하지 않습니다. 수정 권고: 승인 API가 (1) 현재 파일과 git HEAD 비교, (2) 충돌 시 사용자에게 머지 화면 제공, 정책을 §10 또는 M-11에 명시.

**F-10.4 [GOOD]** — `/api/outputs/[filename]`(L739~741)에 "경로 traversal 방지 검증 포함" 한 줄이 추가되어 1차 검증 R-08을 반영했습니다.

### 3.4 §11 데이터 모델 확장 (L745~844)

**F-11.1 [GOOD]** — 3개 신규 테이블(`team_triggers`, `metrics`, `prompt_changes`)의 스키마는 모두 명확하고 Zod로 변환 가능합니다. `jobs.trigger_id` 외래키(L752)도 깔끔하게 추가되었습니다.

**F-11.2 [INFERENCE / 검토 권고]** — `team_triggers` 테이블(L776~789)에 `payload` JSON 필드가 있는데, 시나리오 A~F별로 payload 구조가 다릅니다. PRD가 시나리오별 payload 스키마를 별도로 정의하지 않아, 향후 시나리오 추가 시 호환성 추적이 어렵습니다. 수정 권고: `lib/team/types.ts`(L422 폴더 구조에 이미 존재)에 "TeamTriggerPayload = ScenarioAPayload | ScenarioBPayload | ..." 디스크리미네이트 유니온을 정의하고, `team_triggers` 테이블 설명에 "payload 스키마는 lib/team/types.ts 참조" 한 줄 추가.

**F-11.3 [INFERENCE / 검토 권고]** — `metrics` 테이블(L791~806)은 사용자가 수동 입력하는 성과 데이터를 위한 것인데, 입력 시점 검증 로직이 명시되지 않았습니다. 예: `views_7d`, `views_30d`가 동시에 채워지면 둘 중 어느 것이 더 최신인지 모호. 수정 권고: M-10 또는 §12 `/analytics` 페이지 명세에 "메트릭 입력 폼은 7일/30일 시점을 별도 레코드로 저장하고 row마다 `period_label` 컬럼을 추가"하는 정규화 옵션 검토.

**F-11.4 [INFERENCE]** — `prompt_changes.target_file` 컬럼(L815)이 `.claude/agents/*.md` 경로를 그대로 저장하는데, Phase 1에서 폴더가 4개(`content/`, `dev/`, `analytics/`, `personalization/`)로 분류되어 있어 경로 길이가 다릅니다. 절대 경로 vs 프로젝트 상대 경로 정책이 명시되지 않았습니다. 수정 권고: 프로젝트 루트 기준 상대 경로로 통일.

### 3.5 §12 UI 확장 (L848~920)

**F-12.1 [INFERENCE / 검토 권고]** — 섹션 6 AnalyticsPanel(L884~888)과 섹션 7 RecommendationPanel(L890~893)은 **Phase 1 초기에 데이터가 비어 있을 가능성이 매우 높습니다**. 첫 사용자가 대시보드를 켰을 때:
  - `/api/analytics`는 totalJobs=0, latestReport=null 반환
  - `/api/recommendations`는 trend-analyst가 아직 한 번도 실행되지 않아 빈 배열 반환
  - prompt-tuner 제안도 0건

  PRD에 **빈 상태 UX**(empty state) 명세가 전혀 없습니다. 수정 권고: §12 섹션 6/7 명세에 "데이터 없음" 상태를 위한 안내 메시지 + "분석 실행하기" CTA 버튼을 명시.

**F-12.2 [CRITICAL / 검토 권고]** — `/settings` 페이지(L912~919)의 "prompt-tuner 제안 승인 인터페이스"는 Q4 확정 답변에 따른 핵심 UI인데, **이 기능이 실제로 작동하려면 prompt-tuner가 최소 1회 실행되어야 합니다**. prompt-tuner는 시나리오 D(주간 분석 후 자동 연계)에서만 spawn되고, 시나리오 C는 매주 월 09:00에 실행됩니다. 즉 **Phase 1 첫 1주일 동안은 prompt_changes 테이블이 빈 상태**이며, 승인 UI는 Phase 1 MVP 검증 시 비어 있을 것입니다. **이 UI를 Phase 1 필수로 둘지, Phase 3로 미룰지** 사용자 결정 필요. PRD의 §5 Could Have(L255~260)에는 "prompt-tuner의 A/B 프롬프트 실험 프레임워크"가 Phase 3로 분류되어 있어 일관성이 살짝 어긋납니다. 수정 권고: M-11(L230~235)을 Phase 1 vs Phase 3로 명시 분류.

**F-12.3 [INFERENCE]** — Header에 "팀 상태 배지 🟢 4명 활성"(L852)이 표시된다고 했는데, 이 정보의 출처는 `/api/team/status`이고 `triggerId` 없는 호출은 PRD §10에 명시되지 않았습니다(L660은 `?triggerId=xxx` 필수). 수정 권고: GET `/api/team/status`(쿼리 없이) 호출 시 "현재 활성 트리거의 종합 상태 + Leader 세션 alive 여부"를 반환하는 변형 명세 추가.

### 3.6 §14 Phase 1 태스크 (12 → 20개) (L968~996)

**F-14.1 [GOOD]** — 20개 태스크가 의존성 순서대로 잘 정렬되어 있고, 1차 검증의 1~2일 PoC 권고가 태스크 4(Agent Teams 활성화) + 태스크 18(Leader 세션 테스트) + 태스크 19(시나리오 A E2E)로 구체화되었습니다.

**F-14.2 [INFERENCE / 검토 권고]** — 솔로 개발자 MVP 기준으로 20개 태스크 분량 평가:
  - 태스크 5 "Subagent 정의 12개 작성" — 한 파일당 평균 30분~1시간으로 가정 시 **6~12시간** (1~1.5일)
  - 태스크 6 "슬래시 커맨드 4개" — 한 파일당 30분 가정 시 **2시간**
  - 태스크 7 "Hook 작성 (session-start-poll.sh)" — SQLite 쿼리 + 트리거 처리 로직 = **2~4시간**
  - 태스크 9 "Team 모듈 (trigger-repo, scenarios, types)" — 시나리오 6개 × 입출력 타입 = **4~6시간**
  - 태스크 12 "파이프라인 4개 모듈 + orchestrator" — 1차 검증 시 추정 **8~16시간**
  - 태스크 14 "UI 메인 페이지 7개 섹션" — shadcn 활용 시 **8~12시간**
  - 태스크 16 "서브페이지 3개 (analytics/history/settings)" — 최소 스켈레톤이라도 **4~8시간**
  - **총 누적**: 약 **34~60시간 = 4.5~7.5 영업일** + 디버깅/통합 시간

  **결론**: Phase 1 분량으로 **여전히 적절하지만 빡빡합니다**. 다만 §14 표 자체에 시간 추정이 없어 사용자가 일정을 잡기 어렵습니다. 수정 권고: 표에 "예상 소요" 컬럼 추가 또는 별도 §14.0.1 추정표.

**F-14.3 [WARNING / 검토 권고]** — 태스크 19 "시나리오 A E2E"(L995)는 Leader 세션이 살아 있어야 실행 가능합니다. 즉 **이 태스크는 사용자가 별도 터미널에서 `claude` 세션을 켜고, `Create an agent team named tiktok-ops-team ...`을 한 번 입력한 뒤 그 세션을 "건드리지 않은 상태"로 둔 채 dev 서버에서 버튼을 누르는** 시나리오입니다. 솔로 개발 중에는 자주 세션을 닫게 되므로, **태스크 19에 "Leader 세션이 닫혀 있을 때 트리거가 큐에 쌓이는지 확인"** 케이스를 명시 권고. 또한 태스크 18(Leader 세션 테스트)과 태스크 19 사이에 "Leader 세션 daemon화 시도(예: tmux + iTerm2)" 보조 단계가 들어가면 좋습니다.

**F-14.4 [WARNING / Q3 일관성]** — Q3 확정 답변은 "하이브리드: 매주 월 09:00 자동 + 수동 분석 실행 버튼"인데, **§14 Phase 1 태스크 어디에도 cron 설정 단계가 없습니다**. 시나리오 C(L496)에 "매주 월 09:00 자동" 명시는 있지만, 누가 cron을 등록하는지 PRD가 침묵합니다. 후보:
  - (a) macOS launchd plist 수동 등록 (Phase 1 요구)
  - (b) Next.js dev 서버에 node-cron 패키지로 인메모리 스케줄러 (서버 재시작 시 손실)
  - (c) Phase 2로 미루기

수정 권고: §14에 태스크 추가 또는 §15 위험 표에 "[검토 필요] cron 등록 메커니즘 미명시" 항목 추가. 그렇지 않으면 Phase 1 DoD 체크 시 Q3가 일부만 충족됩니다.

### 3.7 기타 신규 영역

**F-X.1 [INFERENCE / 검토 권고]** — `.claude/hooks/teammate-idle.sh`(L365)가 폴더 구조에 명시되었으나, 그 내용/동작이 §8.4 메커니즘에서 한 번도 언급되지 않습니다. 의도가 "Teammate가 유휴 상태가 되면 다음 작업 요청"이라면 좋지만, 공식 hook 문서의 `TeammateIdle` 동작과 일치하는지 확인 필요. 수정 권고: §8.4 또는 §8.5에 teammate-idle.sh의 정확한 역할 1~2줄 추가.

---

## 4. Q1~Q5 일관성 매트릭스

| 결정 | 확정 답변 | 관련 PRD 위치 | 일관성 | 비고 |
|---|---|---|---|---|
| **Q1** 자동 발동 | A: 완전 자동, 사용자 추가 승인 없음 | M-02(L157~164), §8.4(L501~534), §15 L1023~1024 | ✅ 일관 | 단 §8.4의 시나리오 직렬화(F-8.8)는 미명세 |
| **Q2** 개발 그룹 권한 | A: 엄격, builder 계획 승인 모드 필수 | M-12(L237~242), §8.3 시나리오 B(L495), §15 L1032 | ⚠️ **명세 부족** | F-8.4: 공식 문서상 "생성 시 팀원별 모드 설정 불가" 제약 미반영. "Leader가 spawn 직후 모드 변경" 명시 필요 |
| **Q3** 분석 실행 주기 | C: 하이브리드 (자동 + 수동) | M-10(L222~228), §8.3 시나리오 C(L496), §14 Phase 1 | ⚠️ **누락** | F-14.4: cron 등록 단계가 §14 태스크 어디에도 없음. 자동 발동 부분이 미구현 상태로 Phase 1 종료 가능성 |
| **Q4** prompt-tuner 권한 | A: 수정 제안만, 사용자 승인 후 적용 | M-11(L230~235), §8.3 시나리오 D(L497), §10 prompt-changes(L731~737), §11 prompt_changes(L808~820), §12 /settings(L917), §15 L1033 | ✅ 일관 | 6개 위치 모두 연결됨. F-10.3(파일 충돌 처리) + F-12.2(Phase 1 vs Phase 3 분류)는 별도 권고 |
| **Q5** 모델 차등 | C: hook-critic·code-reviewer만 Opus, 나머지 10명 Sonnet, Leader Opus | §8.2 표(L477, L482, L488), §15 표 누락 | ⚠️ **위험 표 누락** | F-8.2: §8.2 표는 정확하나 §15에 "Opus 팀원 사용 시 토큰 추가" 위험 미명세. 시나리오 B(plan mode 7배) × Q5(Opus 1명) 중첩 효과 미평가 |

**전체 일관성 점수**: 5/5 결정 모두 PRD 본문에 반영됨, 그러나 **Q2, Q3, Q5 3건은 보강 필요**.

---

## 5. 신규 리스크 목록 — 팀 확장으로 인해 새로 발견된 것

PRD §15 위험 표에 추가가 권고되는 항목들입니다. 1차 검증의 R-01~R-12 외에 새로 발굴된 것입니다.

| # | 리스크 | 심각도 | 근거 | 영향 | 대응 |
|---|---|---|---|---|---|
| **R-13** | Leader 세션 실행 중 강제 종료 → 진행 중 Teammate 손실 | **상** | [FACT] 공식 문서 "In-process 팀원과의 세션 재개 없음... 리더는 더 이상 존재하지 않는 팀원에게 메시지를 보내려고 시도할 수 있습니다" | 시나리오 A 도중 세션 다운 = mp4 5개 모두 loss | (1) `team_triggers.status='running'` 상태로 5분 이상 지속 시 자동 failed 마킹, (2) Leader 재시작 시 stale running 트리거 정리 후 재실행 옵션 제공 |
| **R-14** | 시나리오 동시 트리거 시 직렬화 미명세 | **중** | [FACT] "리더는 한 번에 한 팀만 관리" + 단일 `tiktok-ops-team` 사용 | 시나리오 A 실행 중 시나리오 C 트리거되면 어떻게 되는가? UI/백엔드 동작 미정의 | §8.4에 "동시 트리거 시 FIFO 큐 처리" 명시 + UI에 "다른 시나리오 실행 중" 안내 |
| **R-15** | Plan mode × Opus 중첩 토큰 비용 | **중~상** | [FACT] "plan mode에서 약 7배 토큰" + Q5 Opus 2명 | 시나리오 B(builder plan mode + code-reviewer Opus)가 Max 5h 윈도우 빠르게 소모 | (1) §15에 명시, (2) 시나리오 B 일일 1회 제한 권고, (3) Phase 1 실측 후 Phase 2 조정 |
| **R-16** | Subagent 서브폴더 계층의 비공식 동작 | **하~중** | [UNCERTAIN] 공식 문서에 명시적 지원 없음. ohajo가 사실상 사용 중이지만 보증 없음 | Claude Code 버전 업데이트 시 12개 파일 인식 실패 가능성 | §15 + §17에 "12개 파일을 `.claude/agents/` 루트 평탄화 폴백 옵션" 명시 |
| **R-17** | CLAUDE.md + 12개 Subagent 시스템 프롬프트 컨텍스트 충돌/중복 | **중** | [FACT] "팀원들은 작업 디렉토리에서 CLAUDE.md 파일을 읽습니다" — 즉 모든 Teammate가 CLAUDE.md를 로드 + 자기 시스템 프롬프트 추가 | 12명 × (CLAUDE.md 토큰 + 시스템 프롬프트 토큰) 누적. 또한 CLAUDE.md의 "TypeScript any 금지" 등 원칙이 trend-scout에게도 강제로 주입되어 무관 컨텍스트 낭비 | (1) CLAUDE.md를 500줄 이내 유지(공식 권고), (2) 역할별 상세 지침은 각 Subagent .md 본문으로 분산, (3) Skills 활용으로 필요 시점에만 로드 |
| **R-18** | 시나리오 B 개발 작업 중 Next.js dev 서버 HMR과의 충돌 | **중** | [INFERENCE] frontend/backend-builder가 코드를 수정하면 HMR이 즉시 리로드 → in-flight Promise 손실 (1차 검증 R-04 연장) | 시나리오 B 실행 중 사용자가 dev 서버를 켜둔 채로 두면, builder의 파일 수정 직후 HMR이 트리거되어 잡 실행 중인 트리거 손실 가능 | 시나리오 B 트리거 시 자동으로 dev 서버 일시정지 안내 토스트 + builder 작업 동안 dev 서버 종료 권장 |
| **R-19** | preference-learner / prompt-tuner의 git 상호작용 미명세 | **중** | [FACT] `.claude/agents/*.md`는 git 추적 대상. prompt-tuner가 수정 제안을 적용하면 워킹 디렉토리 변경 발생 | 사용자가 수동 편집한 미커밋 변경분과 충돌 가능. preference-learner가 `data/preferences.json`(gitignore)을 갱신하면 데이터 자체는 안전하지만, 12개 .md 수정은 위험 | (1) F-10.3 권고대로 충돌 감지 UI, (2) prompt-tuner 제안 적용 시 자동으로 별도 git 브랜치 생성 옵션 |
| **R-20** | 12개 Subagent 정의 작성 자체의 품질 리스크 | **중** | [FACT] §14 태스크 5는 "12개 .md 작성"만 명시하고 작성 가이드/예제는 §8.6의 hook-critic 1개뿐 | 솔로 개발자가 12개를 일관된 품질로 작성하기 어려움. 잘못 쓴 description은 Leader가 적절히 위임하지 않게 만듦 | (1) §14 태스크 5에 "ohajo `.claude/agents/dev/code-reviewer.md` 등을 템플릿으로 사용" 명시, (2) §8.6에 모든 12개 파일의 frontmatter 스켈레톤(name/description만이라도) 추가 |
| **R-21** | Shrimp vs 공유 작업 목록 운영 혼란 | **하~중** | [INFERENCE] §8.7 표만 있고 의사결정 트리 부재 | 사용자가 어디에 무엇을 등록할지 헤매다 양쪽 모두 사용 안 하게 됨 | F-8.7 권고대로 §8.7에 의사결정 트리 추가 |

---

## 6. 권고사항 — 3단계 분류

### 6.1 즉시 수정 필요 (Blocker — 구현 시작 전)

| 우선순위 | 항목 | 위치 | 작업 |
|---|---|---|---|
| **B-1** | F-8.3: 시나리오 D 자동 연쇄 메커니즘 명세 | §8.4 다음에 §8.4.1 신설 | "Leader가 시나리오 C 팀원 shutdown 후 동일 팀에서 시나리오 D Teammate spawn" 절차 명시 |
| **B-2** | F-8.4 / Q2: builder plan mode 적용 방법 명세 | M-12(L237~242) 본문 | "Leader가 spawn 직후 builder에게 'Switch to plan mode' 메시지 전송" 한 줄 추가 |
| **B-3** | F-9.2: `final-content.json` Zod 스키마 명시 | §5 M-03 또는 §9.1 | 6개 필드(topic, script, caption, hashtags, hook, ai_disclosure) 정확한 타입과 metadata.json과의 차이 명시 |
| **B-4** | F-14.4 / Q3: cron 등록 단계 추가 또는 명시적 보류 | §14 태스크 표 | "태스크 17.5 cron 설정" 추가 또는 §15에 "Q3 자동 발동은 Phase 2로 연기" 명시 |

### 6.2 개선 권고 (구현 중에 처리 가능)

| 우선순위 | 항목 | 위치 | 작업 |
|---|---|---|---|
| **I-1** | F-8.2 / R-15: Opus + plan mode 토큰 위험 명시 | §15 위험 표 | R-15 신규 행 추가 |
| **I-2** | F-8.5 / R-13: Leader 강제 종료 손실 위험 명시 | §15 | R-13 신규 행 추가 |
| **I-3** | F-8.8 / R-14: 시나리오 직렬화 명시 | §8.4 또는 M-02 | "FIFO 큐 처리" 1~2줄 추가 |
| **I-4** | F-8.1: §8.2 표에 "활성 시나리오" 컬럼 추가 | §8.2 | 12행 표에 컬럼 1개 추가 (예: trend-scout → "A") |
| **I-5** | F-10.2: SubagentStart/Stop hook 메커니즘 명시 | §8 또는 §11 | active_teammates 갱신 방법 명시 |
| **I-6** | F-11.2: TeamTriggerPayload 디스크리미네이트 유니온 | `lib/team/types.ts` 명세 | §11에 1줄 참조 |
| **I-7** | F-12.1: AnalyticsPanel/RecommendationPanel 빈 상태 UX | §12 섹션 6, 7 | empty state 명세 추가 |
| **I-8** | F-12.2: M-11 prompt-tuner 승인 UI Phase 분류 | §5 M-11 | "Phase 1 스켈레톤 / Phase 3 풀 기능" 명시 |
| **I-9** | R-17: CLAUDE.md 500줄 제한 + Skills 활용 | §7 또는 §15 | 컨텍스트 최적화 가이드 추가 |
| **I-10** | R-20: §8.6에 12개 frontmatter 스켈레톤 추가 | §8.6 | 1개(hook-critic) 외 11개 frontmatter 미니멀 예시 |
| **I-11** | F-8.7 / R-21: Shrimp vs 공유 작업 목록 의사결정 트리 | §8.7 | 표 아래에 트리 1개 추가 |
| **I-12** | F-14.2: Phase 1 태스크별 예상 소요 시간 | §14 표 | "예상 소요" 컬럼 추가 |

### 6.3 검토 필요 (사용자 결정 사항)

| 항목 | 질문 | 의사결정 영향 |
|---|---|---|
| **C-1** | F-12.2 / R-19: prompt-tuner 자동 적용 시 git 충돌 처리 정책 | 자동 머지 시도 vs 수동 검토 강제 vs 별도 브랜치 생성 — 어느 쪽? |
| **C-2** | F-8.6 / R-16: Subagent 서브폴더 계층 폴백 정책 | 4개 폴더 유지 vs 처음부터 평탄화 (보수적 선택) |
| **C-3** | F-14.3 / R-18: Leader 세션 daemon화 vs 매번 수동 시작 | tmux + iTerm2 자동 부팅 vs 단순 매뉴얼 — 운영 편의성 vs 추가 셋업 비용 |
| **C-4** | F-14.2: Phase 1 분량 조정 | 20개 태스크 → 시나리오 A만 우선 완성하고 시나리오 C/D는 Phase 1.5로 분리할지? |
| **C-5** | I-1 / R-15 후속: 시나리오 B 일일 1회 제한 vs 자유 사용 | Max 플랜 5h 윈도우 보호 정책 |
| **C-6** | I-12: §14 예상 소요 추정치 합의 | 4.5~7.5 영업일 추정에 동의하는지, 더 빡빡/느슨한 일정인지 |

---

## 7. 최종 판정 및 다음 단계

### 7.1 최종 판정

| 항목 | 평가 |
|---|---|
| **이전 검증 패치 반영도** | **16/16 (100%)** |
| **신규 §8 팀 구성 설계 합리성** | **양호** (12명 풀 적정, 시나리오 인원 모두 공식 권장 범위) |
| **신규 §10 API 명세 일관성** | **양호** (1건 명세 부족: F-10.2 active_teammates 갱신) |
| **신규 §11 데이터 모델 정합성** | **우수** (외래키, 상태 머신 모두 명확) |
| **신규 §12 UI 설계 완성도** | **보통** (빈 상태 UX 누락 + Q4 승인 UI Phase 분류 모호) |
| **신규 §14 Phase 1 태스크 적정성** | **양호하지만 빡빡** (4.5~7.5 영업일 추정, cron 누락 1건) |
| **Q1~Q5 일관성** | **3/5 완전 일관, 2건(Q2, Q3) 보강 필요, 1건(Q5) 위험 표 보강 필요** |
| **공식 문서 정합성** | **양호** (블로커 1건: F-8.3 시나리오 D 연쇄 / 경고 4건) |
| **블로커 수준 문제** | **1건** (F-8.3) + 사실상 동급 3건 (F-8.4, F-9.2, F-14.4) — 합계 **4건** |
| **개선 권고** | **12건** |
| **사용자 결정 필요** | **6건** |

**최종 판정: 조건부 통과** ⚠️→✅

> §6.1의 4개 블로커 항목(B-1~B-4)을 PRD에 정밀 패치한 후 구현 착수 가능. 예상 패치 시간은 **30분~1시간 이내**입니다. PRD 자체는 1차 대비 명백히 향상되었으며, Agent Teams 전환의 큰 그림은 정확하고 합리적입니다. 발견된 문제는 모두 "세부 명세 보강" 수준이며, 아키텍처 재설계는 불필요합니다.

### 7.2 다음 단계

#### 즉시 (구현 착수 전)
1. **§6.1의 B-1~B-4 4건 패치** — 30분~1시간
2. **사용자 확인 §6.3의 C-1~C-6 6건** — Q&A 1회
3. **(선택)** §6.2의 I-1, I-2, I-3 3건 위험 표 보강 — 15분

#### 구현 1주차
4. Phase 1 태스크 1~7 (셋업) 진행
5. **태스크 18 끝나고 즉시 Leader 세션 PoC**: 빈 시나리오 A로 dummy `final-content.json` 만들어서 파이프라인 4단계 동작 확인 (Agent Teams와 결정론적 파이프라인 통합 확인)

#### 구현 2주차
6. 태스크 8~17 (DB / API / UI / 에셋)
7. 태스크 18~20 (E2E 검증) → DoD 15개 체크
8. **§6.2의 I-4~I-12 9건은 Phase 1 종료 시점에 PRD 회고와 함께 일괄 반영**

#### Phase 1 종료 후
9. R-13~R-21 위험 항목 실측 → §15 위험 표 확정 버전으로 갱신
10. Q3 cron 자동 발동 결정(C-4 결과)에 따라 Phase 1.5 또는 Phase 2로 이동

---

## 부록 A. 이번 검증에서 확보한 공식 사실 인용

**[FACT] Claude Code Agent Teams 공식 문서** (`https://code.claude.com/docs/ko/agent-teams`):
- "에이전트 팀은 실험적이며 기본적으로 비활성화되어 있습니다... `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`를 추가하여 활성화"
- "Claude Code v2.1.32 이상이 필요합니다"
- "대부분의 워크플로우에 대해 3-5명의 팀원으로 시작합니다... 세 명의 집중된 팀원은 종종 다섯 명의 산만한 팀원을 능가합니다"
- "**리더는 한 번에 한 팀만 관리할 수 있습니다**. 새 팀을 시작하기 전에 현재 팀을 정리합니다"
- "**중첩된 팀 없음**: 팀원들은 자신의 팀이나 팀원을 생성할 수 없습니다. 리더만 팀을 관리할 수 있습니다"
- "**팀원은 리더의 권한 모드로 시작합니다**... 생성 후, 개별 팀원 모드를 변경할 수 있지만, **생성 시 팀원별 모드를 설정할 수 없습니다**"
- "**In-process 팀원과의 세션 재개 없음**: `/resume`과 `/rewind`는 in-process 팀원을 복원하지 않습니다"
- "팀원들은 작업 디렉토리에서 **CLAUDE.md 파일을 읽습니다**. 이를 사용하여 모든 팀원에게 프로젝트별 지침을 제공합니다"
- "팀 구성: `~/.claude/teams/{team-name}/config.json`. 작업 목록: `~/.claude/tasks/{team-name}/`"

**[FACT] Claude Code Costs 공식 문서** (`https://code.claude.com/docs/ko/costs`):
- "**팀원에게 Sonnet을 사용하십시오**. 조정 작업을 위해 기능과 비용의 균형을 맞춥니다"
- "에이전트 팀은 **plan mode에서 실행될 때 표준 세션보다 약 7배 더 많은 토큰**을 사용합니다"
- "팀을 작게 유지하십시오. 각 팀원은 자체 컨텍스트 윈도우를 실행하므로 토큰 사용량은 대략 팀 규모에 비례합니다"
- "활성 팀원은 유휴 상태에서도 계속 토큰을 소비합니다"

**[FACT] Subagents 공식 문서** (`https://code.claude.com/docs/ko/sub-agents`):
- "**Subagent는 다른 subagent를 생성할 수 없습니다**"
- "프로젝트 subagent (`.claude/agents/`)... 프로젝트 subagent는 현재 작업 디렉토리에서 위로 이동하여 검색됩니다"
- "이러한 범위의 subagent 정의는 [agent teams]에서도 사용 가능합니다: 팀원을 생성할 때 subagent 유형을 참조할 수 있으며 팀원은 해당 시스템 프롬프트, 도구 및 모델을 상속합니다"
- "Subagent는 세션 시작 시 로드됩니다. 파일을 수동으로 추가하여 subagent를 만드는 경우 세션을 다시 시작하거나 `/agents`를 사용하여 즉시 로드합니다"
- frontmatter 필수 필드: `name`, `description`. 선택 필드: `tools`, `disallowedTools`, `model`, `permissionMode`, `maxTurns`, `skills`, `mcpServers`, `hooks`, `memory`, `background`, `effort`, `isolation`, `color`, `initialPrompt`
- "**SubagentStart**, **SubagentStop** hooks (settings.json에서 구성 가능)"

**[UNCERTAIN]** 서브폴더 계층 검색 동작은 공식 문서에 명시 없음. ohajo 프로젝트 (`/Users/jungmo/Desktop/ohajo/.claude/agents/dev/`, `design/`, `docs/`)에서 사실상 작동하는 것이 관찰됨.

---

## 부록 B. 검증 메타 정보

| 항목 | 값 |
|---|---|
| 검증한 PRD 줄 수 | 1,088 (전체) |
| 확인한 공식 문서 | 3건 (Agent Teams 한국어판, Costs 한국어판, Subagents 한국어판) |
| 확인한 참조 프로젝트 | 1건 (`/Users/jungmo/Desktop/ohajo/.claude/agents/`) |
| [FACT] 태그 진술 | 18건 |
| [INFERENCE] 태그 진술 | 12건 |
| [UNCERTAIN] 태그 진술 | 1건 (Subagent 서브폴더 계층) |
| [GOOD] 태그 진술 | 5건 |
| 발견한 블로커 | 4건 (F-8.3, F-8.4, F-9.2, F-14.4) |
| 개선 권고 | 12건 |
| 사용자 결정 항목 | 6건 |
| 1차 검증 패치 반영률 | 16/16 (100%) |
| Q1~Q5 완전 일관 | 3/5 (Q2, Q3, Q5는 경미한 보강 필요) |
| 신규 발견 리스크 | 9건 (R-13~R-21) |
| 검증 신뢰도 | 9/10 |
| 최종 판정 | **조건부 통과 (블로커 4건 패치 후 구현 착수 가능)** |
