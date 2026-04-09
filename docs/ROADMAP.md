# TikTok 자동화 파이프라인 — 개발 로드맵

> 작성일: 2026-04-08 | 담당자: 이정모 (솔로 개발자) | 상태: Phase 0 진입 대기
>
> 본 문서는 `PRD.md`(1,090+ 줄, 17개 섹션)와 `PRD_VALIDATION_REPORT.md`(327줄) 두 문서의 결론을 바탕으로 "지금 무엇부터 하면 되는가"를 한 장에 담는 실행용 로드맵이다.
>
> 완전 무료 원칙 하에 **Claude Code Agent Teams**(구독 내장) + Next.js 15 + MeloTTS + FFmpeg로 "버튼 한 번 → 20초 세로 영상 5개"를 5~15분 내 산출하는 MVP를 만든다.

---

## 1. 프로젝트 개요

| 항목                  | 값                                                                                                                                                                                          |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **목표**              | TikTok/Reels 숏폼 자동화 파이프라인 MVP — 주제 → 대본 → 음성 → 자막 → 영상 합성을 단일 대시보드 한 클릭으로 수행                                                                            |
| **대상 사용자**       | 이정모 본인 (솔로 개발자, 1인 콘텐츠 크리에이터). 외부 사용자 없음                                                                                                                          |
| **핵심 가치**         | (1) 완전 무료 ($0/월), (2) 로컬 실행 (localhost:3000), (3) Agent Teams가 LLM 레이어 전담, (4) 결정론 파이프라인이 결과물 재현 보장                                                          |
| **주요 산출물**       | 편당 20초, 9:16, 1080×1920, libx264 CRF 22, 한국어 자막·TTS 고정. 총 5개 mp4 + metadata.json + content-qa-report.json                                                                       |
| **현재 상태**         | PRD 완성, 검증 조건부 통과 (블로커 4건 + 사용자 결정 6건 잔존). `.claude/settings.local.json`, `.claude/agents/`(기존 10개), `.mcp.json`, `.shrimp_data/` 세팅 완료. 코드베이스는 아직 없음 |
| **예상 Phase 1 소요** | **9 영업일 ≒ 2주 확정** (C-6 합의 완료). 내역: 베이스 7.5 영업일 + 디버깅 버퍼 1.5일                                                                                                        |

### 핵심 제약

- **완전 무료 원칙**: 월 고정 비용 $0. Max 플랜 구독 외 신규 과금 금지. Anthropic API 직접 호출·Agent SDK 사용 금지.
- **로컬 전용**: Vercel·외부 DB·인증 없음. `npm run dev` + 별도 터미널 Claude Code Leader 세션 2개로 구동.
- **LLM 레이어 분리**: Next.js 서버는 TTS·FFmpeg만, LLM 작업은 `tiktok-ops-team`의 Teammate가 전담. 인터페이스는 `data/jobs/[jobId]/final-content.json` 파일 1개.
- **TypeScript any 금지, 2칸 들여쓰기, 한국어 주석/UI 텍스트 고정.**

### 3대 의존 시스템

| 시스템                                   | 역할                             | 상태                                                                                                 |
| ---------------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` | Agent Teams 활성화 플래그        | **활성화 확인 완료** (`~/.claude/settings.json`, Claude Code v2.1.85 ≥ 2.1.32)                       |
| Shrimp Task Manager MCP                  | 장기 로드맵/마일스톤 관리 (영구) | `.mcp.json` 등록됨, `.shrimp_data/` 비어 있음. 본 ROADMAP과 동일한 `P1-T01` 태스크 ID 체계 사용 예정 |
| Agent Teams 공유 작업 목록               | 시나리오 런타임 조율 (일회성)    | 시나리오 트리거 시 Leader가 생성. Shrimp와 **역할 엄격 분리** (§8.7)                                 |

---

## 2. 로드맵 가이드

### 2.1 이 문서의 역할

- **사람이 보는 장기 뷰**: 다섯 시간 후 다시 열어도 "어디부터 시작할지" 즉시 파악 가능해야 함
- **Shrimp Task Manager와 병행**: ROADMAP은 Phase·그룹·의존성 시각화용. Shrimp는 실제 실행 시점 상태 머신. **두 쪽 모두 동일한 `P1-T01` 형식 태스크 ID 사용**
- **Agent Teams 공유 작업 목록과는 분리**: 공유 작업 목록은 시나리오가 실행되는 그 순간에만 존재. Shrimp/ROADMAP에는 "시나리오 B 실행"이라는 한 줄만 들어감

### 2.2 업데이트 원칙

1. Phase가 전환될 때 또는 블로커/리스크 해소 시점에 본 문서를 갱신한다.
2. 태스크를 완료하면 `- [ ]` → `- [x]`로 바꾸고, Shrimp 쪽도 동일 ID로 완료 처리한다.
3. 새로운 리스크·개선 권고가 생기면 §7, §8 표에 행을 추가하되 ID 체계(`R-22`, `I-13` …)를 이어간다.
4. Phase 1 종료 시점에 PRD §15 위험 표와 본 로드맵 §7을 동기화한다 (검증 리포트 7.2 "Phase 1 종료 후 9번").

### 2.3 태스크 포맷

각 태스크는 다음 필드를 가진다.

```
- [ ] **P1-Txx: 제목**
    - 설명: 무엇을 왜 한다
    - 산출물: 생성/변경되는 파일 또는 상태
    - 의존성: 선행 태스크 ID
    - 예상 소요: n시간
    - 관련 PRD: 섹션/라인
    - 관련 리스크: R-xx, F-xx
    - 검증: 어떻게 완료를 확인하는가
```

---

## 3. Phase 0 — 사전 작업 (구현 착수 전 필수)

> **이 Phase를 건너뛰면 시나리오 C → D 연쇄, 시나리오 B plan mode, final-content 스키마 정합성, 주간 분석 자동화가 실제로 동작하지 않을 위험이 크다.** 검증 리포트 F-8.3, F-8.4, F-9.2, F-14.4 네 항목을 해결하지 않은 채 Phase 1에 진입하면 P1-T05·P1-T09·P1-T12·P1-T18에서 재작업이 발생한다.
>
> **Phase 0 전체 예상 소요: 1~2시간** (PRD 패치 30분~1시간 + 사용자 결정 6건 Q&A 30분~1시간). 선택 PoC 포함 시 +30분.

### 3.1 블로커 패치 4건 (PRD 반영 필수)

- [x] **P0-B1: §8.4.1 "시나리오 연쇄 트리거 절차" 신설** — 검증 리포트 F-8.3
  - 설명: 공식 제약 "리더는 한 번에 한 팀만 관리" + "Subagent는 다른 subagent를 생성할 수 없다" 두 가지를 동시에 만족하려면, 시나리오 C → D 자동 연쇄는 "Leader가 C 팀원 shutdown → 동일 팀(`tiktok-ops-team`) 안에서 D Teammate를 새로 spawn"하는 방식으로만 가능하다. PRD에 이 흐름이 없어서 구현 시 명령 불명. 2~3단락으로 절차를 명시한다.
  - 산출물: `PRD.md` §8.4 다음에 §8.4.1 신설 (시퀀스 다이어그램 또는 번호 매긴 절차)
  - 의존성: 없음
  - 예상 소요: 15분
  - 관련 리스크: R-13 (Leader 세션 중단 시 손실), R-14 (동시 트리거 직렬화)
  - 검증: `grep -n "8.4.1" PRD.md` 로 해당 섹션 존재 확인

- [x] **P0-B2: M-12 builder plan mode 적용법 명시** — 검증 리포트 F-8.4
  - 설명: Q2 확정 "개발 그룹은 계획 승인 모드 필수"인데, 공식 문서는 "팀원은 Leader의 권한 모드로 시작 / 생성 시 팀원별 모드 설정 불가"를 명시. 따라서 "Leader가 builder spawn 직후 개별 메시지로 `Switch to plan mode` 전송" 절차를 M-12에 한 줄 추가해야 한다.
  - 산출물: `PRD.md` L237~242 영역 M-12 본문에 구체 절차 1~2줄 삽입
  - 의존성: 없음
  - 예상 소요: 5분
  - 관련 리스크: R-15 (plan mode × Opus 토큰 폭증)
  - 검증: `grep -n "Switch to plan mode" PRD.md` 반환 확인

- [x] **P0-B3: `final-content.json` Zod 스키마 정밀 명시** — 검증 리포트 F-9.2
  - 설명: M-03(§5)과 §9.1 content-loader.ts와 §11 metadata.json 세 위치의 필드 구성이 미묘하게 다르다. `final-content.json`(파이프라인 입력)과 `metadata.json`(출력)을 명확히 구분하고, 전자의 Zod 스키마를 PRD 본문에 인라인 명시한다. `lib/types.ts`에 복사 붙여넣기 가능한 형태여야 함.
  - 산출물: PRD §5 M-03 또는 §9.1 content-loader.ts 본문에 Zod 스키마 블록 추가 (최소 필드: `topic, script{hook, sentences[]}, caption, hashtags[], hookVerdict, aiDisclosure, contentQaReport`)
  - 의존성: 없음
  - 예상 소요: 15분
  - 관련 태스크: P1-T05 (Subagent 정의), P1-T09 (lib/team/types.ts), P1-T12 (content-loader.ts)
  - 검증: 스키마 안에 6~8개 필드가 Zod 문법으로 명시되고, metadata.json 예시와의 차이점이 주석으로 설명됨

- [x] **P0-B4: §14 cron 등록 단계 결정** — 검증 리포트 F-14.4 / Q3 일관성 (권고 c 채택: Phase 2 연기)
  - 설명: Q3 확정 "하이브리드 (매주 월 09:00 자동 + 수동 버튼)" 중 자동 부분을 누가 등록하는지 PRD 침묵. 세 후보 중 하나를 택한다 — (a) macOS launchd plist, (b) node-cron 인메모리 스케줄러, (c) Phase 2로 연기. 선택 후 §14 태스크 표 또는 §15 위험 표 중 적절한 곳에 명시.
  - 산출물: PRD §14 또는 §15 개정
  - 의존성: 없음
  - 예상 소요: 10분 (결정 + 반영)
  - 결정 후보:
    - (a) launchd plist 수동 등록: Phase 1 내 구현, 운영 비용 낮음, 서버 꺼져 있으면 cron은 돌지만 API 호출은 실패 가능
    - (b) node-cron + Next.js dev 서버 상주: 서버 재시작 시 예약 유실, 솔로 개발자에게는 부적절
    - **(c) Phase 2 연기: 가장 안전. Phase 1에서는 수동 버튼만 검증, Q3 자동 부분은 Phase 1 DoD에서 제외한다고 명시 권장**
  - 권고: **(c) 채택** — Phase 1 범위 폭발 방지 (C-4 Phase 1 분량 조정과도 연동)

### 3.2 사용자 결정 6건 (Q&A 완료 필수)

> 아래 질문들은 Phase 1 착수 전 "한 번의 짧은 Q&A 세션"으로 일괄 해소한다. 결정 내용은 PRD §7 또는 §15에 1~2줄로 반영한다.

- [x] **P0-C1: prompt-tuner git 충돌 처리 정책** — 검증 리포트 §6.3 C-1, R-19 (확정: c 자동 브랜치)
  - 질문: prompt-tuner가 `.claude/agents/*.md` 수정 제안을 승인 후 적용할 때, 사용자의 미커밋 변경분과 충돌하면 어떻게 할 것인가?
  - 후보: (a) 자동 머지 시도, (b) 수동 검토 강제(에러로 차단), (c) 자동으로 별도 git 브랜치 생성
  - 관련 태스크: Phase 3 prompt-tuner 승인 API (P3-T?)
  - 권고: **(c)** — 솔로 개발자라도 브랜치 분리가 가장 안전

- [x] **P0-C2: Subagent 서브폴더 유지 vs 평탄화** — 검증 리포트 §6.3 C-2, R-16, F-8.6 (확정: a 유지 + 폴백)
  - 질문: `.claude/agents/content|dev|analytics|personalization/` 4개 서브폴더 구조를 유지할 것인가, 처음부터 평탄화할 것인가?
  - 근거: 공식 문서에 서브폴더 동작 명시 없음. ohajo에서 사실상 작동 관찰.
  - 후보: (a) 4개 폴더 유지, (b) 평탄화, (c) 유지하되 폴백 스크립트 준비
  - 권고: **(a) 유지하되 P1-T05에 "인식 실패 시 평탄화 폴백" 단서 주석 추가**

- [x] **P0-C3: Leader 세션 daemon화 여부** — 검증 리포트 §6.3 C-3, F-14.3, R-13 (확정: b 수동 실행, Phase 2 재평가)
  - 질문: Leader(백그라운드 Claude Code 세션)를 tmux/iTerm2로 영속화할 것인가, 매번 수동 실행할 것인가?
  - 영향: daemon화 시 P1-T18에 "tmux 셋업" 추가 필요. 수동이면 사용자는 매일 아침 `claude` 실행 한 번 필수.
  - 권고: **수동 (Phase 1) → Phase 2에서 tmux 고려** — MVP 단순성 우선

- [x] **P0-C4: Phase 1 분량 조정** — 검증 리포트 §6.3 C-4, F-14.2 (확정: b 시나리오 A+F만 필수)
  - 질문: Phase 1에 시나리오 A + C + D 전부 포함 vs 시나리오 A만 우선 완료 후 C/D는 Phase 1.5로 분리?
  - 권고: **Phase 1 = 시나리오 A + F(재생성)만 필수, 시나리오 C/D/B/E는 "구조만 준비, 실제 동작은 Phase 2"**. 이유: 4.5~7.5 영업일 추정 중 3일 가량을 "당장 필요 없는 기능"에 쓰지 않도록.
  - 반영: 본 ROADMAP §4에서 이 권고를 반영했다 (P1-T11·P1-T12에 주석 표기)

- [x] **P0-C5: 시나리오 B 일일 사용 제한** — 검증 리포트 §6.3 C-5, R-15 (확정: b 실측 대기, Phase 2 재결정)
  - 질문: plan mode × Opus 중첩으로 토큰 7배 소비하는 시나리오 B를 일일 1회로 제한할 것인가?
  - 권고: **Phase 1 실측 후 Phase 2에서 결정**. Phase 1 중에는 수동 주의만. R-15에 "실측 대기" 명시.

- [x] **P0-C6: Phase 1 예상 소요 시간 합의** — 검증 리포트 §6.3 C-6, F-14.2 (확정: 9 영업일 ≒ 2주)
  - 질문: 4.5~7.5 영업일 추정치에 동의하는가? 더 빡빡/느슨한 일정인지?
  - 권고: **7.5 영업일 + 1.5일 버퍼 = 9 영업일 = 약 2주** 목표로 확정

### 3.3 Agent Teams 환경 최종 확인

- [x] **P0-E1: Agent Teams 활성화 및 버전 검증**
  - 설명: 전역 환경 변수와 Claude Code 버전을 마지막으로 확인한다. 이미 활성화 완료 상태이므로 30초 검증만.
  - 검증 명령:
    - `cat ~/.claude/settings.json | grep CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` → `"1"` 확인
    - `claude --version` → `2.1.32` 이상 확인 (현재 2.1.85)
    - `ls ~/.claude/teams/` → 기존 팀 디렉토리 존재 확인 (`ohajo-sim` 등)
  - 예상 소요: 5분
  - 관련 PRD: §17, L1096~1099

- [x] **P0-E2: 기존 `.claude/agents/` 10개 범용 Subagent 백업 확인**
  - 설명: 옵션 C 확정에 따라 기존 10개는 보존되어 총 21개 풀을 구성한다. 파일이 이미 있는지 검증.
  - 검증 명령: `ls .claude/agents/dev/ .claude/agents/design/ .claude/agents/docs/ .claude/agents/` → 10개 `.md` 파일 존재
  - 예상 소요: 2분
  - 관련 PRD: §8.2.1

### 3.4 (선택) 30분 PoC

- [x] **P0-POC: 3명 팀 생성 후 1 시나리오 동작 확인** (완료: 2026-04-08, trend-scout 주제 3개 1~2분 내 반환, $0.1456 소비, 결과 `docs/phase0-poc-result.md`)
  - 설명: Phase 1 본 구현 전에 Agent Teams가 실제로 의도대로 동작하는지 빠르게 검증한다. 코드 한 줄도 쓰지 않고 순수 CLI 대화로 진행.
  - 절차:
    1. 새 터미널에서 `claude` 실행
    2. `Create an agent team named poc-team with 3 teammates: trend-scout, script-writer, hook-critic` 입력
    3. `/agents` 로 3명 로드 확인
    4. `Ask trend-scout to suggest 3 topics about love psychology for TikTok`
    5. 결과 확인 후 `Clean up the team` 으로 정리
  - 예상 소요: 30분
  - 가치: F-8.3 연쇄 메커니즘, F-8.4 plan mode 동작, R-13 세션 손실 행태를 본 구현 전에 체감할 수 있음
  - 권고: **강력 권장** (본 구현 중 재작업 리스크 대폭 감소)

---

## 4. Phase 1 — MVP 구현

### 4.1 목표

**대시보드 버튼 → Agent Teams 자동 발동 → 15분 이내 mp4 5개 + metadata.json 산출, 수동 업로드 가능.** PRD DoD 15개 전부 통과가 Phase 1 완료 조건.

### 4.2 태스크 그룹

Phase 1 태스크는 5개 그룹으로 분류한다. 같은 그룹 내 태스크는 의존성이 없다면 병렬 가능.

```
[G1: 셋업]            ─┐
                        ├── [G2: Agent Teams] ─┐
[G3: 백엔드 기반]     ─┤                        ├── [G5: 통합/E2E]
                        ├── [G4: 프론트엔드] ──┘
                       ─┘
```

- **G1 셋업**: 스타터 복사 → 의존성 설치 → MeloTTS → 에셋 (의존 관계: 순차)
- **G2 Agent Teams**: Subagent 11개 + 슬래시 커맨드 4개 + hooks (G1 완료 후, 그룹 내 병렬)
- **G3 백엔드 기반**: DB / team 모듈 / providers / 파이프라인 / API (G1 완료 후, 일부 병렬)
- **G4 프론트엔드**: 메인 페이지 7섹션 + 서브페이지 3개 + Zustand 4스토어 (G1 완료 후, G3의 API 스키마 필요)
- **G5 통합/E2E**: Leader 세션 테스트 → 시나리오 A E2E → 수동 업로드 (모든 선행 그룹 완료 후)

### 4.3 G1 — 셋업 그룹 (예상 소요: 4~6시간)

- [x] **P1-T01: 스타터 복사**
  - 설명: `/Users/jungmo/Developer/Claude-Core/nextjs-starters_2026-03-11/` 에서 Next.js 15 + App Router + Tailwind v4 + shadcn/ui 템플릿을 현재 프로젝트 루트에 복사한다. **`.claude/`, `.mcp.json`, `.shrimp_data/`, `PRD.md`, `PRD_VALIDATION_REPORT.md`, `ROADMAP.md` 보존 필수**.
  - 산출물: `package.json`, `app/`, `components/`, `tsconfig.json`, `next.config.ts`, `postcss.config.*` 등
  - 의존성: P0 전체 완료
  - 예상 소요: 30분
  - 관련 PRD: §7, §14 태스크 1
  - 검증: `npm install` 성공, `npm run dev` → localhost:3000 기본 페이지 렌더

- [x] **P1-T02: 의존성 설치**
  - 설명: PRD §7에 명시된 스택을 `package.json`에 추가하고 설치. 기존 스타터에 이미 있을 수 있는 것은 중복 설치 주의.
  - 추가 패키지:
    - `zustand` (상태 관리)
    - `better-sqlite3` (DB) + `@types/better-sqlite3`
    - `ffmpeg-static` (FFmpeg 바이너리)
    - `zod` (스키마 검증, 스타터에 있을 가능성 높음)
    - `archiver` (ZIP 다운로드)
    - `react-hook-form`, `@hookform/resolvers` (폼)
    - `sonner` (토스트)
    - shadcn/ui 컴포넌트: card, button, badge, progress, select, slider, toggle-group, collapsible, dialog, sonner, skeleton, alert, tabs, table, chart
  - 산출물: `package.json`, `package-lock.json`, `components/ui/*`
  - 의존성: P1-T01
  - 예상 소요: 30분
  - 관련 PRD: §7 기술 스택, §14 태스크 2
  - 검증: `npm run build` 성공, `import { z } from 'zod'` 에러 없음

- [x] **P1-T03: MeloTTS 셋업 스크립트** (스크립트 작성 완료, 실제 `npm run setup:melo` 실행은 사용자 담당 — Python 3.14 호환성 주의, 3.11 권장)
  - 설명: `scripts/setup-melo.sh` 작성 및 실행. Python venv 생성 + MeloTTS 설치 + 한국어 모델 캐시. 한 번만 실행되면 됨.
  - 산출물: `scripts/setup-melo.sh`, `scripts/melo_tts.py`(래퍼), `.venv/` (gitignore)
  - 의존성: P1-T01
  - 예상 소요: 1~2시간 (모델 다운로드 ~500MB 포함)
  - 관련 PRD: §9.2, §14 태스크 3, L1044~1045 리스크
  - 관련 리스크: MeloTTS 콜드 스타트 (Phase 2 warm keep에서 해결)
  - 검증: `./.venv/bin/python scripts/melo_tts.py --text "안녕하세요" --out /tmp/test.wav` → wav 파일 생성

- [x] **P1-T04: 에셋 확보** (구조/템플릿/placeholder 3개 완료, 실제 배경 7~17개·Pretendard-Bold.otf는 사용자 수동 다운로드 대기 — 가이드 `assets/backgrounds/README.md`, `assets/fonts/README.md`)
  - 설명: `assets/backgrounds/` 에 mp4 10~20개, `Pretendard-Bold.otf`, `assets/styles/subtitle.ass` 템플릿 준비. Pexels/Pixabay는 Phase 2. Phase 1은 로컬 풀만.
  - 산출물: `assets/backgrounds/*.mp4` (10개 이상), `assets/fonts/Pretendard-Bold.otf`, `assets/styles/subtitle.ass`
  - 의존성: 없음 (병렬 가능)
  - 예상 소요: 1~2시간 (수동 다운로드)
  - 관련 PRD: §9.3, §9.4, §14 태스크 17
  - 검증: `ls assets/backgrounds/*.mp4 | wc -l` → 10 이상

- [x] **P1-T05: Subagent 정의 11개 신규 작성** — **중요**
  - **🛠 사용자 권장 도구**: Claude Code `/skill-creator` 플러그인(Skill tool)으로 Subagent `.md` 템플릿·구조·frontmatter를 일관되게 생성 후 수동 세부 편집. 11개 파일의 포맷 일관성·검증 루프를 자동화하여 R-17(컨텍스트 중복)·R-20(품질 리스크) 완화.
  - 설명: `.claude/agents/` 하위에 content/dev/analytics/personalization 4개 폴더 + 11개 `.md` 파일 작성. 기존 `.claude/agents/dev/code-reviewer.md` 는 재사용 (12개 풀 중 1개). C-2 결정에 따라 서브폴더 유지.
  - 작성 파일:
    - `content/trend-scout.md` (Sonnet)
    - `content/script-writer.md` (Sonnet)
    - `content/hook-critic.md` (**Opus**)
    - `content/caption-crafter.md` (Sonnet)
    - `content/content-qa.md` (Sonnet)
    - `dev/frontend-builder.md` (Sonnet)
    - `dev/backend-builder.md` (Sonnet)
    - `analytics/metrics-analyst.md` (Sonnet)
    - `analytics/trend-analyst.md` (Sonnet)
    - `personalization/preference-learner.md` (Sonnet)
    - `personalization/prompt-tuner.md` (Sonnet)
  - 각 파일 포맷: PRD §8.6 참조. 필수 frontmatter `name`, `description`, `model`, `tools`. 본문에 역할·원칙·입출력 스키마 명시.
  - 산출물: 11개 `.md` 파일 + 기존 1개 (`dev/code-reviewer.md`) = 12명 팀 풀 완성 (총 21개 풀)
  - 의존성: P0-B3 (final-content 스키마 확정 필요), P0-C2 (폴더 구조 결정)
  - 예상 소요: **6~12시간** (파일당 평균 30~60분)
  - 관련 PRD: §8.2, §8.2.1, §8.6, §14 태스크 5
  - 관련 리스크: R-16 (서브폴더 비공식 동작), R-17 (CLAUDE.md 컨텍스트 중복), R-20 (품질 리스크)
  - 검증:
    - `claude` 세션에서 `/agents` 입력 → 21명 전부 로드 표시
    - frontmatter의 `name` 필드가 파일명과 일치
    - 각 Subagent에 대해 `description` 이 "언제 위임하는가"를 1줄로 설명

- [x] **P1-T06: 슬래시 커맨드 4개 작성**
  - 설명: `.claude/commands/` 하위에 수동 트리거용 슬래시 커맨드 4개.
  - 파일:
    - `tiktok-generate.md` (시나리오 A)
    - `tiktok-dev.md` (시나리오 B)
    - `tiktok-analyze.md` (시나리오 C)
    - `tiktok-team-status.md` (팀 상태 확인)
  - 산출물: `.claude/commands/*.md` 4개
  - 의존성: P1-T05
  - 예상 소요: 2시간
  - 관련 PRD: §14 태스크 6
  - 검증: Claude 세션에서 `/tiktok-team-status` 입력 → 정의된 지시문이 실행됨

- [x] **P1-T07: Hook 작성 (`session-start-poll.sh`)**
  - 설명: `.claude/hooks/session-start-poll.sh` — Leader 세션 시작 시 `team_triggers` 테이블에서 `status='queued'` 레코드를 조회해 Leader에게 전달. 추가로 선택 사항: `.claude/hooks/subagent-start.sh`, `subagent-stop.sh` — SubagentStart/Stop 이벤트에서 `team_triggers.active_teammates` 컬럼 갱신 (검증 리포트 F-10.2).
  - 산출물: `.claude/hooks/session-start-poll.sh`, `.claude/settings.json` (hooks 블록 추가)
  - 의존성: P1-T08 (DB 스키마) — 순서 주의
  - 예상 소요: 2~4시간
  - 관련 PRD: §8.4, §14 태스크 7
  - 관련 리스크: R-13 (Leader 손실 시 stale trigger 처리)
  - 검증: `sqlite3 data/db.sqlite "INSERT INTO team_triggers ..."` → `claude` 재시작 → 자동 감지 로그 확인

### 4.4 G3 — 백엔드 기반 그룹 (예상 소요: 14~22시간)

- [x] **P1-T08: DB 스키마 및 repo**
  - 설명: `lib/db/schema.sql` 에 5개 테이블 정의 (`jobs`, `job_items`, `team_triggers`, `metrics`, `prompt_changes`). `lib/db/client.ts` (better-sqlite3 싱글톤). `lib/db/repo.ts` (5개 테이블 CRUD).
  - 산출물: `lib/db/schema.sql`, `lib/db/client.ts`, `lib/db/repo.ts`, `data/db.sqlite` (자동 생성)
  - 의존성: P1-T02
  - 예상 소요: 3~4시간
  - 관련 PRD: §11, §14 태스크 8
  - 검증: `npx tsx scripts/init-db.ts` → 5개 테이블 생성, `.dump`로 스키마 확인

- [x] **P1-T09: Team 모듈 구현**
  - 설명: `lib/team/` 하위에 trigger-repo.ts, scenarios.ts, types.ts. scenarios.ts에는 시나리오 A~F 6개 객체 정의 (각 시나리오가 어떤 Teammate를 spawn하는지, 필요한 payload 구조, 예상 소요 시간). types.ts에는 TeamTriggerPayload 디스크리미네이트 유니온(I-6 권고 반영) + FinalContent Zod 스키마(P0-B3 결과).
  - 산출물: `lib/team/trigger-repo.ts`, `lib/team/scenarios.ts`, `lib/team/types.ts`
  - 의존성: P0-B3, P1-T08
  - 예상 소요: 4~6시간
  - 관련 PRD: §8.3, §10, §14 태스크 9
  - 관련 리스크: R-14 (동시 트리거 FIFO 직렬화 명시 필요)
  - 검증: `ScenarioA ~ ScenarioF` 6개 객체가 `scenarios.ts`에서 export되고, `lib/team/types.ts` import 시 타입 에러 없음

- [x] **P1-T10: 프로바이더 구현**
  - 설명: `lib/providers/tts/melo-tts.ts` (Python spawn + ffprobe duration), `lib/providers/ffmpeg.ts` (ffmpeg-static spawn 래퍼), `lib/providers/background.ts` (로컬 assets/backgrounds/ 풀에서 랜덤 선택, Pexels는 Phase 2).
  - 산출물: `lib/providers/tts/types.ts`, `lib/providers/tts/melo-tts.ts`, `lib/providers/tts/index.ts`, `lib/providers/ffmpeg.ts`, `lib/providers/background.ts`
  - 의존성: P1-T03 (MeloTTS 셋업), P1-T04 (에셋)
  - 예상 소요: 3~4시간
  - 관련 PRD: §7 폴더 구조 (lib/providers/\*), §14 태스크 10
  - 검증: 유닛 테스트로 임의 문장에 대해 melo-tts → wav 파일, ffmpeg → 1초 테스트 mp4 생성

- [x] **P1-T11: 환경 검증 스크립트 (`seed-assets.ts`)**
  - 설명: `scripts/seed-assets.ts` — Agent Teams 활성화 여부, Python venv, MeloTTS import, libass 설치, 폰트 존재, 배경 mp4 10개 이상 모두 체크. 실패 시 설치 안내 메시지.
  - 산출물: `scripts/seed-assets.ts`, `package.json`의 `"seed:assets": "tsx scripts/seed-assets.ts"` 스크립트
  - 의존성: P1-T03, P1-T04, P1-T10
  - 예상 소요: 1.5시간
  - 관련 PRD: §14 태스크 11, DoD #2
  - 검증: `npm run seed:assets` → 모든 항목 OK 출력

- [x] **P1-T12: 결정론 파이프라인 4개 모듈**
  - 설명: `lib/pipeline/content-loader.ts` (final-content.json → FinalContent[]), `voice.ts` (MeloTTS 호출 + 타이밍 맵), `subtitle.ts` (ASS 템플릿 치환), `video.ts` (FFmpeg 합성), `orchestrator.ts` (순차 실행 + job_items 진행률 갱신).
  - 산출물: `lib/pipeline/*.ts` 5개 파일
  - 의존성: P0-B3, P1-T09, P1-T10
  - 예상 소요: 8~16시간 (검증 리포트 F-14.2 추정)
  - 관련 PRD: §9, §14 태스크 12
  - 검증: `scripts/test-pipeline.ts` 로 수동 작성한 더미 `final-content.json` 입력 → 5개 mp4 생성 확인

- [x] **P1-T13: API 라우트 구현**
  - 설명: `/api/team/trigger` POST, `/api/team/status` GET, `/api/jobs` GET, `/api/jobs/[jobId]` GET, `/api/outputs/[filename]` GET (경로 traversal 방지). 나머지 `/api/analytics`, `/api/recommendations`, `/api/prompt-changes/*` 는 빈 응답 스켈레톤만 (Phase 2/3에서 구현).
  - 산출물: `app/api/*/route.ts` 5~8개
  - 의존성: P1-T08, P1-T09
  - 예상 소요: 3~5시간
  - 관련 PRD: §10, §14 태스크 13
  - 관련 리스크: R-14 (FIFO 직렬화가 `trigger/route.ts` 에서 구현되어야 함)
  - 검증: Postman/curl로 `POST /api/team/trigger` → triggerId 반환, `GET /api/team/status?triggerId=xxx` → JSON 응답

### 4.5 G4 — 프론트엔드 그룹 (예상 소요: 12~20시간)

- [x] **P1-T14: Zustand 4개 스토어**
  - 설명: `store/currentSessionStore.ts` (카테고리, 현재 jobId, 폴링 상태), `jobsStore.ts` (잡 히스토리), `teamStore.ts` (활성 Teammate 상태), `settingsStore.ts` (TTS/음성/속도, persist).
  - 산출물: `store/*.ts` 4개 파일
  - 의존성: P1-T02
  - 예상 소요: 2시간
  - 관련 PRD: §7 폴더 구조, §14 태스크 15
  - 검증: 각 스토어 import해서 타입 에러 없음

- [x] **P1-T15: 메인 페이지 7개 섹션 UI**
  - 설명: `app/page.tsx` + `components/pipeline/*` 으로 PRD §12 7개 섹션 구현. 섹션 6/7(Analytics/Recommendation)은 빈 상태 UX(I-7 권고) 포함한 스켈레톤만.
  - 구현 컴포넌트:
    - `components/layout/header.tsx` (로고 + 팀 상태 배지 + 테마 토글)
    - `components/pipeline/category-picker.tsx` (5개 카드 그리드)
    - `components/pipeline/settings-panel.tsx` (Collapsible)
    - `components/pipeline/generate-button.tsx` (Zod 검증 포함)
    - `components/pipeline/job-progress.tsx` (전체 Progress + 아이템 5개 단계별 badge)
    - `components/pipeline/teammate-status.tsx` (시나리오 A 5명 Badge)
    - `components/pipeline/video-card.tsx` (미리보기 + 대본/캡션/다운로드/재생성)
    - `components/pipeline/script-preview.tsx` (Dialog)
    - `components/analytics/analytics-panel.tsx` (빈 상태 스켈레톤)
    - `components/analytics/recommendation-panel.tsx` (빈 상태 스켈레톤)
  - 산출물: `app/page.tsx`, `components/pipeline/*` 8개, `components/layout/*` 2개, `components/analytics/*` 2개
  - 의존성: P1-T13 (API 응답 타입), P1-T14 (스토어)
  - 예상 소요: 8~12시간
  - 관련 PRD: §5 M-01~M-11, §12, §14 태스크 14
  - 관련 리스크: R-18 (HMR 충돌은 Phase 2 시나리오 B 활용 시 주의)
  - 검증: `npm run dev` → 모든 섹션 렌더, 카테고리 선택 인터랙션, 생성 버튼 Zod 에러 표시

- [x] **P1-T16: 서브페이지 3개 (스켈레톤)**
  - 설명: `/analytics`, `/history`, `/settings` 세 페이지 — Phase 1 은 라우트 존재 + 기본 레이아웃 + "Phase 2에서 구현" placeholder. `/settings` 에만 "기능 요청 폼"(M-12) 기본 UI 배치 (실제 trigger 는 Phase 2).
  - 산출물: `app/analytics/page.tsx`, `app/history/page.tsx`, `app/settings/page.tsx`, `components/dev/feature-request-form.tsx`
  - 의존성: P1-T14
  - 예상 소요: 4~8시간
  - 관련 PRD: §12 서브페이지, §14 태스크 16
  - 검증: 세 URL 접속 → 404 아님, 기본 레이아웃 표시

### 4.6 G5 — 통합/E2E 그룹 (예상 소요: 6~10시간)

- [x] **P1-T17: Leader 세션 테스트** (자동 부분 PASS, 수동 체크리스트: docs/p1-t17-result.md)
  - 설명: 별도 터미널에서 `claude` 실행 → `Create an agent team named tiktok-ops-team using the 12 subagents in .claude/agents/` 입력 → `/tiktok-team-status` 커맨드로 12명 전부 등록 확인 → `/agents` 로 21명 전체 풀 확인.
  - 산출물: 없음 (검증 단계)
  - 의존성: P1-T05, P1-T06, P1-T07
  - 예상 소요: 1~2시간
  - 관련 PRD: §8.5, §14 태스크 18
  - 관련 리스크: **R-13 (Leader 세션 손실)** — 이 태스크에서 실제로 세션을 닫았다가 재시작해 복구 동작을 확인할 것
  - 검증:
    - 12명 이상 풀 인식
    - 빈 `team_triggers` 삽입 → Leader가 2초 내 감지 → `status='running'` 변경 확인
    - 세션 강제 종료 후 재시작 → stale running 트리거 복구 로직 동작 확인 (R-13 대응)

- [x] **P1-T18: 시나리오 A E2E 테스트** (모의 자동 9/9 PASS, 실 E2E 체크리스트: docs/p1-t18-dod-report.md)
  - 설명: 대시보드에서 "연애 심리" 선택 → "5개 자동 생성" 클릭 → Leader가 시나리오 A 5명 spawn → 15분 이내 5개 VideoCard 완료. DoD 15개 항목 순차 체크.
  - 산출물: 실제 `data/jobs/[jobId]/` 폴더, 5개 mp4, metadata.json, content-qa-report.json
  - 의존성: P1-T13, P1-T15, P1-T17
  - 예상 소요: 3~6시간 (반드시 디버깅 버퍼 포함)
  - 관련 PRD: §3 DoD 15개 전체, §14 태스크 19
  - 관련 리스크: R-13, R-17 (컨텍스트 중복으로 토큰 한도 도달 가능)
  - 검증: DoD 1~14 순차 통과. DoD 15 ($0 비용)는 Max 플랜 사용량 확인

- [x] **P1-T19: TikTok 수동 업로드 1회 성공** (체크리스트 준비 완료: docs/p1-t19-upload-result.md)
  - 설명: P1-T18 산출물 중 1개 mp4를 실제 TikTok에 수동 업로드. AI 콘텐츠 공시 토글 on, 캡션·해시태그 붙여넣기, 업로드 성공까지 확인.
  - 산출물: TikTok 업로드 완료 증빙 (스크린샷/URL)
  - 의존성: P1-T18
  - 예상 소요: 30분
  - 관련 PRD: DoD 전체 마무리, §14 태스크 20
  - 검증: 업로드된 영상이 TikTok 내에서 재생 가능, 9:16 비율 유지, 자막/음성 정상

### 4.7 Phase 1 소요 총계

| 그룹             | 태스크 수       | 예상 시간                       |
| ---------------- | --------------- | ------------------------------- |
| G1 셋업          | 4 (P1-T01~T04)  | 3~6시간                         |
| G2 Agent Teams   | 3 (P1-T05~T07)  | 10~18시간                       |
| G3 백엔드        | 6 (P1-T08~T13)  | 22~36시간                       |
| G4 프론트엔드    | 3 (P1-T14~T16)  | 14~22시간                       |
| G5 통합/E2E      | 3 (P1-T17~T19)  | 4.5~8.5시간                     |
| **Phase 1 총계** | **19개 태스크** | **53.5~90.5시간 ≈ 7~11 영업일** |

> 상기 추정은 검증 리포트 F-14.2의 34~60시간 범위보다 약간 보수적이다. **P0-C6 결정 "약 2주(9 영업일) 목표"** 에 부합.

---

## 5. Phase 2 — 품질 개선 (무료 원칙 유지)

> Phase 1 DoD 15개 통과 직후 착수. 실제 콘텐츠 제작 흐름을 돌려보면서 체감되는 불편부터 해소한다.

- [ ] **P2-T01: MeloTTS warm keep**
  - 설명: Python 프로세스 상주화 (IPC 또는 HTTP). 콜드 스타트 제거로 회차당 30~50% 시간 단축.
  - 관련 PRD: §5 Should Have, §14 Phase 2
  - 예상 소요: 4~6시간

- [ ] **P2-T02: 카테고리별 화자/속도 프리셋**
  - 설명: settingsStore에 카테고리별 기본값 저장, UI에서 자동 적용.
  - 예상 소요: 2~3시간

- [ ] **P2-T03: BGM 추가**
  - 설명: FreePD 무료 음원 라이브러리 + FFmpeg amix -3dB. 배경 BGM 풀 `assets/bgm/` 구성.
  - 예상 소요: 3~4시간

- [ ] **P2-T04: Pexels/Pixabay 자동 배경 + 카테고리 추천**
  - 설명: `lib/providers/background.ts` 확장. 카테고리별 검색어 매핑, 로컬 캐시 관리, 무료 API 키 발급 (Pexels/Pixabay).
  - 예상 소요: 4~6시간

- [ ] **P2-T05: 썸네일 자동 추출**
  - 설명: `ffmpeg -vf thumbnail` 으로 대표 프레임 jpg 생성. VideoCard에 썸네일 표시.
  - 예상 소요: 2시간

- [ ] **P2-T06: hook-critic A/B 3종 훅 생성 모드**
  - 설명: PRD §5 Should Have — hook-critic이 대안 2개 이상 제시, UI에서 선택 가능.
  - 예상 소요: 3~4시간

- [ ] **P2-T07: ASS 카라오케 자막**
  - 설명: `\k` 태그로 단어 하이라이트. 이미 MeloTTS 세그먼트 타이밍 맵이 있으므로 확장.
  - 예상 소요: 3~4시간

- [x] **P2-T08: 시나리오 B 실전 활용 시작** — Q2 plan mode + Q5 Opus 중첩
  - 설명: Phase 1에서 구조만 준비한 시나리오 B(개발 팀)를 실제로 활용하기 시작. 위 P2-T01~T07 기능들을 frontend-builder/backend-builder가 구현하도록 의뢰. **본격 가동 전에 R-15 토큰 소비 실측**.
  - 산출물(2026-04-09 P2-T08 1차): `lib/team/scenarios.ts` ScenarioB activation `active`로 승격, `components/dev/feature-request-form.tsx` 실제 POST `/api/team/trigger`(scenario=B) 연결 + R-18 일시정지 토스트, [`docs/r15-scenario-b-measurement.md`](r15-scenario-b-measurement.md) 측정 절차 + 결과 템플릿 + 정책 표(ratio 구간별 권고).
  - 예상 소요: 가변 (실측 목적). 1차 코드/리포트 준비 완료, 토큰 실측은 별도 tmux Leader 세션에서 후속 진행.
  - 관련 리스크: R-15, R-18
  - 관련 결정: C-5 시나리오 B 일일 사용 제한 여부 (실측 후 갱신)

- [x] **P2-T09: cron 자동 발동 구현** — P0-B4 (c) 연기 결정 해소
  - 설명: launchd plist 로 시나리오 C 매주 월 09:00 자동 실행 등록. tmux Leader 데몬(P2-T11) + session-start-poll.sh hook(P1-T07) 와 결합하여 dev 서버 의존 없이 동작.
  - 산출물(2026-04-09): `lib/team/scenarios.ts` ScenarioC `active` 승격, `templates/com.tiktok.analyze.plist`(StartCalendarInterval Weekday=1 Hour=9 Minute=0), `scripts/cron-enqueue-weekly.sh`(sqlite3 INSERT + 5분 중복 방지 가드 + uuidgen), `scripts/install-cron-analyze.sh`/`uninstall-cron-analyze.sh`, [`docs/cron-setup.md`](cron-setup.md) 사용자 가이드.
  - 검증(2026-04-09): cron-enqueue-weekly.sh 직접 실행 → INSERT 성공 + 재실행 시 5분 가드 skip 동작 확인. tsc exit=0.
  - 관련 PRD: §5 M-10, Q3

- [x] **P2-T10: 대본 수정 후 재렌더**
  - 설명: VideoCard에 "대본 편집" Dialog (React Hook Form fieldArray 5문장) → 저장 시 해당 아이템만 재파이프라인.
  - 산출물(2026-04-09): `app/api/jobs/[jobId]/rerender/route.ts` 신규(POST, RerenderBodySchema, in-memory lock 409, fire-and-forget runPipeline onlyItemIndex), `components/pipeline/script-editor.tsx` 신규(RHF + zodResolver, 5 textarea, 409 별도 처리), `video-card.tsx` ScriptEditor 통합. P2-T06 HookSwitcher 도 동일 엔드포인트(newSentences) 호출.
  - 검증(2026-04-09): scripts/test-rerender-schema.ts — 8개 케이스(sentences/hook 단독, 둘다 없음/있음, 길이/범위/빈문자) 8/8 PASS. tsc exit=0. LLM 0 토큰(team_triggers 미사용).

- [ ] **P2-T11: Leader 세션 daemon화** — P0-C3 "Phase 2 고려" 결정 시
  - 설명: tmux + iTerm2 자동 부팅 스크립트, macOS 로그인 시 자동 실행.
  - 예상 소요: 2~3시간

---

## 6. Phase 3 — 피드백 루프 및 맞춤화

> 실제 TikTok 업로드 성과가 쌓이기 시작할 때 착수. 최소 2~4주간 Phase 1/2 운영 후 진입 권장.

- [ ] **P3-T01: 사용자 성과 수동 입력 UI 고도화**
  - 설명: `/analytics` 페이지의 메트릭 입력 폼을 완성. 7일/30일 시점 별도 레코드, period_label 컬럼 정규화 (F-11.3 권고).
  - 예상 소요: 3~5시간

- [ ] **P3-T02: 시나리오 C 주간 분석 풀 기능**
  - 설명: metrics-analyst + trend-analyst 2명 spawn → `data/reports/weekly-[yyyy-mm-dd].md` 생성 → 대시보드 링크.
  - 예상 소요: 4~6시간

- [ ] **P3-T03: 시나리오 D 프롬프트 개선 자동 연쇄** — P0-B1 §8.4.1 절차 적용 지점
  - 설명: 시나리오 C 완료 시 Leader가 자동으로 시나리오 D의 3명(preference-learner, prompt-tuner, trend-analyst) spawn. P0-B1에서 정의한 "동일 팀 내 Teammate 교체 spawn" 절차 사용.
  - 예상 소요: 4~6시간
  - 관련 리스크: R-13 (이 연쇄 과정에서 Leader 손실 시 복구 정책 명확해야 함)

- [ ] **P3-T04: preference-learner 편집 diff 학습**
  - 설명: 사용자가 대본을 수정한 기록을 diff로 수집 → `data/preferences.json` 누적. 다음 시나리오 A 실행 시 script-writer 프롬프트에 주입.
  - 예상 소요: 5~8시간

- [ ] **P3-T05: prompt-tuner 승인 UI 풀 기능** — I-8 권고 반영 지점
  - 설명: `/settings` 페이지의 승인 인터페이스 완성. `prompt_changes` 테이블 목록, diff 미리보기, 승인/거절 액션. **P0-C1 git 충돌 처리 정책 반영** — 승인 시 (c) 별도 브랜치 생성 후 머지 PR 안내.
  - 예상 소요: 6~10시간
  - 관련 리스크: R-19

- [ ] **P3-T06: 카테고리별 훅 패턴 시각화 리포트**
  - 설명: trend-analyst 산출물을 차트로 렌더. shadcn/ui chart 컴포넌트 활용.
  - 예상 소요: 4~6시간

- [ ] **P3-T07: prompt-tuner A/B 프롬프트 실험 프레임워크**
  - 설명: PRD §5 Could Have. 동일 주제에 대해 프롬프트 A/B로 대본 2벌 생성 후 hook-critic이 비교 판정.
  - 예상 소요: 6~10시간

---

## 7. 리스크 관리 로드맵

검증 리포트 §5에서 발굴된 신규 리스크 9건(R-13~R-21)을 어느 Phase에서 대응할지 매핑한다.

| ID       | 리스크                                       | 심각도 | 대응 Phase                  | 담당 태스크                                                                 |
| -------- | -------------------------------------------- | ------ | --------------------------- | --------------------------------------------------------------------------- |
| **R-13** | Leader 세션 강제 종료 시 Teammate 손실       | 상     | Phase 0 설계 + Phase 1 구현 | P0-B1, P1-T07 (stale 복구 로직), P1-T17 (실측 검증), P2-T11 (daemon화)      |
| **R-14** | 시나리오 동시 트리거 직렬화                  | 중     | Phase 1                     | P1-T09 (scenarios.ts FIFO 큐), P1-T13 (API 404 또는 queued 응답)            |
| **R-15** | Plan mode × Opus 토큰 누적                   | 중~상  | Phase 2 실측                | P2-T08 (시나리오 B 실전 가동 시 측정), C-5 결정 반영                        |
| **R-16** | Subagent 서브폴더 비공식 동작                | 하~중  | Phase 0 결정 + Phase 1 대비 | P0-C2 (정책 결정), P1-T05 (폴백 준비)                                       |
| **R-17** | CLAUDE.md + 12 Subagent 컨텍스트 중복        | 중     | Phase 1 중반 모니터링       | P1-T05 (각 Subagent 본문 최소화), CLAUDE.md 500줄 제한 (I-9), P1-T18 (실측) |
| **R-18** | 시나리오 B HMR 충돌                          | 중     | Phase 2                     | P2-T08 (dev 서버 일시정지 안내 토스트)                                      |
| **R-19** | preference-learner/prompt-tuner git 상호작용 | 중     | Phase 3                     | P0-C1 (정책 결정), P3-T05 (승인 API에 정책 반영)                            |
| **R-20** | 11개 Subagent 정의 품질 리스크               | 중     | Phase 1 초반                | P1-T05 (ohajo 템플릿 활용), P0-POC (사전 동작 감각 확보)                    |
| **R-21** | Shrimp vs 공유 작업 목록 혼란                | 하~중  | Phase 0 문서화              | PRD §8.7 의사결정 트리 추가 (I-11), 본 ROADMAP §2.1 명시                    |

---

## 8. 개선 권고 반영 계획

검증 리포트 §6.2의 I-1~I-12 개선 권고를 Phase별로 분류한다.

| ID       | 권고                                          | 반영 시점                   | 관련 태스크                                    |
| -------- | --------------------------------------------- | --------------------------- | ---------------------------------------------- |
| **I-1**  | Opus + plan mode 토큰 위험 §15 명시           | Phase 0 (PRD 패치 시)       | P0-B4 동시 처리 권장                           |
| **I-2**  | Leader 강제 종료 손실 위험 §15 명시           | Phase 0                     | 위와 동시                                      |
| **I-3**  | 시나리오 직렬화 §8.4 또는 M-02 명시           | Phase 0                     | P0-B1과 동시                                   |
| **I-4**  | §8.2 표에 "활성 시나리오" 컬럼 추가           | Phase 1 중                  | P1-T05 착수 전                                 |
| **I-5**  | SubagentStart/Stop hook 메커니즘 명시         | Phase 1 구현                | P1-T07                                         |
| **I-6**  | TeamTriggerPayload 디스크리미네이트 유니온    | Phase 1 구현                | P1-T09                                         |
| **I-7**  | AnalyticsPanel/RecommendationPanel 빈 상태 UX | Phase 1 구현                | P1-T15 (analytics-panel, recommendation-panel) |
| **I-8**  | M-11 prompt-tuner 승인 UI Phase 분류          | Phase 0 결정 + Phase 3 구현 | P0-C1, P3-T05                                  |
| **I-9**  | CLAUDE.md 500줄 제한 + Skills 활용            | Phase 1 초반                | P1-T05 직전 CLAUDE.md 리뷰                     |
| **I-10** | §8.6에 12개 frontmatter 스켈레톤 추가         | Phase 0 또는 Phase 1 초반   | P1-T05 전 사전 준비                            |
| **I-11** | Shrimp vs 공유 작업 목록 의사결정 트리        | Phase 0 문서화              | PRD §8.7 추가                                  |
| **I-12** | Phase 1 태스크별 예상 소요 시간               | 본 ROADMAP에서 완료         | 본 문서 §4.7                                   |

---

## 9. 의존성 그래프

### 9.1 Phase 간 의존성

```
Phase 0 (사전 작업)
    │
    │  블로커 4건 + 결정 6건 + 환경 검증 완료
    ▼
Phase 1 (MVP)
    │
    │  DoD 15개 + TikTok 수동 업로드 1회
    ▼
Phase 2 (품질 개선) ─────┐
    │                     │  (Phase 2/3는 일부 병렬 가능)
    ▼                     │
Phase 3 (피드백 루프) ◄──┘
```

### 9.2 Phase 1 내부 의존성 (주요 경로)

```
P1-T01 (스타터)
    ├── P1-T02 (의존성) ──┬── P1-T08 (DB) ──┬── P1-T09 (team 모듈) ──┐
    │                     │                  │                        │
    │                     ├── P1-T14 (스토어)│                        │
    │                     │                  └── P1-T07 (hook) ◄──────┤
    │                     │                                            │
    ├── P1-T03 (MeloTTS) ─┤                                            │
    │                     └── P1-T10 (프로바이더) ──┬── P1-T11 (seed) │
    ├── P1-T04 (에셋) ────┘                         │                  │
    │                                                 └── P1-T12 ◄─────┤
    │                                                   (파이프라인)   │
    │                                                         │         │
    │                                                         └─────────┤
    │                                                                   │
    │  P0-C2 ──┐                                                        │
    │          ▼                                                        │
    │       P1-T05 (Subagent 11개) ──┬── P1-T06 (슬래시 커맨드) ◄──────┤
    │          ▲                       │                                │
    │          │                       └────────────────────────────────┤
    │        P0-B3                                                      │
    │                                                                   ▼
    │                                                          P1-T13 (API)
    │                                                                   │
    │                                                                   ▼
    │                                                          P1-T15 (메인 UI)
    │                                                                   │
    │                                                                   ├── P1-T16 (서브)
    │                                                                   │
    │                                                                   ▼
    │                                                          P1-T17 (Leader 테스트)
    │                                                                   │
    │                                                                   ▼
    │                                                          P1-T18 (시나리오 A E2E)
    │                                                                   │
    │                                                                   ▼
    │                                                          P1-T19 (TikTok 업로드)
    └──────────────────────────────────────────────────────────────────┘
```

### 9.3 병렬화 가능 지점

- **G1 내부**: P1-T03 (MeloTTS)과 P1-T04 (에셋)는 독립 수행 가능
- **G2 vs G3**: P1-T05 (Subagent)는 P1-T08 (DB)과 독립, 동시 진행 가능
- **G3 vs G4**: P1-T14 (스토어)는 P1-T08 이후 바로 시작 가능. P1-T15 (메인 UI)는 P1-T13 (API 스키마 확정) 완료 후 시작하되 부분 병렬 가능
- **주의**: P1-T12 (파이프라인)과 P1-T13 (API)는 P1-T09 (team 모듈) 이후 순차 수행 권장

---

## 10. 완료 정의 체크리스트

### 10.1 Phase 0 완료 조건

- [ ] 블로커 4건 (P0-B1~B4) 모두 PRD에 반영됨
- [ ] 사용자 결정 6건 (P0-C1~C6) 답변 완료, PRD §7/§15에 1~2줄 반영
- [ ] Agent Teams 활성화 검증 (P0-E1) 완료
- [ ] 기존 10개 Subagent 보존 확인 (P0-E2) 완료
- [ ] (선택) 30분 PoC (P0-POC) 수행 완료

### 10.2 Phase 1 완료 조건 (= PRD DoD 15개 그대로)

- [ ] **DoD 1**: `npm run setup:melo` → Python venv + MeloTTS + 한국어 모델 설치 완료
- [ ] **DoD 2**: `npm run seed:assets` → Agent Teams 활성화 / Python / MeloTTS / libass / 폰트 / 배경 전부 OK
- [ ] **DoD 3**: `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` 활성화 + `.claude/agents/` 12명 풀 완비 + `/tiktok-generate` 슬래시 커맨드 인식 확인
- [ ] **DoD 4**: `npm run dev` → localhost:3000 접속 가능
- [ ] **DoD 5**: "연애 심리" 카드 클릭 → 선택 상태 하이라이트 확인
- [ ] **DoD 6**: "5개 자동 생성" 클릭 → `team_triggers` 삽입 → Leader 감지 → 시나리오 A 5명 spawn → 진행 상태 실시간 반영
- [ ] **DoD 7**: 15분 이내 5개 VideoCard completed 상태
- [ ] **DoD 8**: 각 카드 `<video>` 재생 가능, 9:16, ~20초, 한국어 자막/TTS 정상
- [ ] **DoD 9**: "다운로드" → `item_1.mp4` ~ `item_5.mp4` 저장 완료
- [ ] **DoD 10**: "캡션 복사" → 클립보드에 캡션 + 해시태그 3~5개
- [ ] **DoD 11**: "ZIP 다운로드" → 5개 mp4 + `metadata.json` 일괄
- [ ] **DoD 12**: "대본 보기" → 훅 + 5문장 + content-qa 리포트 링크
- [ ] **DoD 13**: "재생성" → 시나리오 F 2명 spawn → 해당 1개만 재생성
- [ ] **DoD 14**: `data/output/[jobId]/` 경로 mp4 5개 + metadata.json + content-qa-report.json 실재, 파일명 규칙 준수
- [ ] **DoD 15**: 총 추가 비용 $0 (Max 플랜 외 결제 없음)

### 10.3 Phase 2 완료 조건

- [ ] MeloTTS 콜드 스타트 제거 (회차당 30% 이상 시간 단축 실측)
- [ ] BGM 자동 믹스, 썸네일 자동 추출 동작
- [ ] Pexels/Pixabay API로 배경 자동 확보 동작 (로컬 캐시 포함)
- [ ] 시나리오 B 실전 가동 1회 이상 + R-15 토큰 실측 리포트
- [ ] C-5 결정 반영 (일일 제한 정책 채택 여부)

### 10.4 Phase 3 완료 조건

- [ ] 시나리오 C 주간 리포트 최소 4회 누적 생성
- [ ] 시나리오 D 자동 연쇄 1회 이상 성공 (§8.4.1 절차 실증)
- [ ] prompt-tuner 승인 UI에서 실제 제안 승인 1회 이상
- [ ] preference-learner 학습 결과가 다음 시나리오 A 실행에 반영됨 확인

---

## 11. 시작 가이드 — 5시간 후 재진입 시 첫 3단계

1. **본 파일 §3 Phase 0 체크리스트의 첫 빈 박스를 찾는다.** 아무것도 체크되지 않았다면 P0-B1부터 시작.
2. **P0-B1~B4는 "PRD 문서 수정"만 하면 된다.** 각 항목의 "산출물" 필드에 명시된 위치로 이동해 1~2단락을 추가/수정한다. 약 30분~1시간.
3. **P0-C1~C6는 짧은 Q&A로 즉시 처리.** 각 항목의 "권고"를 그대로 채택할지만 결정하면 되고, 거부한다면 대안을 1줄로 적어둔다. 약 30분.

이 세 단계를 끝내면 P1-T01 "스타터 복사"부터 선형적으로 실행 가능하다. Phase 1 내부 병렬화는 §9.3 참조.

---

> 이 로드맵은 Shrimp Task Manager와 **동일한 태스크 ID 체계**(`P0-B1`, `P1-T01` 등)를 사용한다. Phase 1 착수 시점에 `mcp__shrimp-task-manager__split_tasks` 를 한 번만 실행해 본 로드맵의 Phase 1 19개 태스크를 Shrimp에 등록하고, 이후 Shrimp로 실행 상태를 관리한다. 본 문서는 장기 뷰/문서화 용도로만 업데이트한다.
