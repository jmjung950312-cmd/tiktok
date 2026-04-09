# Pexels 무료 배경 자동 다운로드 셋업 (P2-T04)

> **기술 설명**: `lib/providers/background.ts`의 `ensureBackgroundForCategory(category)` 함수가 Pexels Video API를 호출해서 `orientation=portrait&size=medium` 파라미터로 세로형 mp4를 검색·다운로드하여 `assets/backgrounds/_cache/[category]/` 에 저장한다. 동일 id는 캐시 재사용.
>
> **쉽게 말하면**: Pexels(무료 스톡 영상 사이트)에서 카테고리에 맞는 세로형 영상을 자동으로 받아옵니다. 한 번 받은 영상은 컴퓨터에 저장돼서 다음부터는 네트워크 없이 바로 사용.

---

## 무료 원칙 준수

- Pexels는 **완전 무료**입니다 ($0). 유료 티어 없음.
- 무료 키 한도: **200 req/시간, 20,000 req/월** (카테고리 5개 × 월 10회 = 50req → 여유)
- 출처 표기 의무 없음(권장은 됨)
- 라이선스: [Pexels License](https://www.pexels.com/license/) — 상업·개인 사용 허가

---

## 1. 무료 API 키 발급

1. https://www.pexels.com/api/ 접속
2. 우측 상단 **"Get Started"** 클릭
3. 이메일/구글 계정으로 회원가입(무료)
4. 대시보드에서 **API Key** 복사 (56자 16진수 형태)

**쉽게 말하면**: Pexels 사이트에서 이메일로 가입하고 대시보드에서 키를 복사하면 끝.

---

## 2. `.env.local` 설정

프로젝트 루트에 `.env.local` 파일을 만들고 다음 줄을 추가합니다.

```bash
# .env.local (git에 커밋되지 않음 — .gitignore로 보호)
PEXELS_API_KEY=여기에_복사한_키_붙여넣기
```

⚠️ **보안 주의**:
- `NEXT_PUBLIC_` 접두사를 **절대 붙이지 마세요** (클라이언트에 노출됨)
- 본 키는 서버 사이드(Node.js 프로세스)에서만 사용됨

---

## 3. 검증

```bash
# 환경 검증
npm run seed:assets
# → "Pexels API 키: [✓] PEXELS_API_KEY 설정됨 (56자)"

# 실제 다운로드 테스트 (1개 카테고리에 대해)
npx tsx scripts/test-background-fetch.ts love-psychology
# → assets/backgrounds/_cache/love-psychology/pexels-<id>.mp4 생성
```

---

## 4. 카테고리 검색어 매핑

`lib/providers/background.ts`의 `CATEGORY_QUERY_MAP` 참조:

| 카테고리 코드 | 검색 키워드 |
|---|---|
| `love-psychology` | couple walking / city night / holding hands |
| `unknown-facts` | nature macro / space stars / abstract pattern |
| `money-habits` | keyboard typing / desk workspace / coffee laptop |
| `relationships` | friends talking / group cafe / city park |
| `self-improvement` | sunrise running / book reading / mountain hike |

검색어를 수정하거나 추가하려면 위 상수를 직접 편집하면 됩니다.

---

## 5. 우선순위 체인

`ensureBackgroundForCategory(category)`가 결정하는 순서:

1. **로컬 파일명 매칭** — `assets/backgrounds/`에서 파일명에 카테고리 substring이 포함된 파일 (예: `love-psychology_night.mp4`)
2. **캐시 히트** — `assets/backgrounds/_cache/[category]/*.mp4` 이미 존재
3. **Pexels API** — `PEXELS_API_KEY` 설정 시 검색·다운로드
4. **최종 폴백** — 로컬 풀 전체에서 랜덤 (`pickRandomBackground()`)

**쉽게 말하면**: 같은 카테고리 이름이 붙은 내 영상이 있으면 그거 먼저, 없으면 예전에 받아둔 캐시, 그것도 없으면 Pexels에서 새로 받고, API 키가 없으면 그냥 아무 배경.

---

## 6. 캐시 관리

- 캐시 디렉토리: `assets/backgrounds/_cache/[카테고리]/pexels-<id>.mp4`
- TTL 없음 — 한 번 받으면 영구 보관 (무료 원칙, 불필요한 재다운로드 방지)
- 수동 삭제: `rm -rf assets/backgrounds/_cache/love-psychology/` 같은 식으로 카테고리별 정리
- git 추적 제외: `.gitignore`에 `/assets/backgrounds/_cache/` 등록 완료

---

## 7. 트러블슈팅

| 증상 | 원인 | 해결 |
|---|---|---|
| `Pexels 응답 403` | API 키 오류 또는 한도 초과 | Pexels 대시보드에서 키 재확인, 1시간 대기 |
| `Pexels 응답 429` | Rate limit (200 req/시간) | 1시간 대기 또는 캐시 사용 |
| 다운로드는 성공하는데 mp4 재생 안 됨 | 부분 다운로드 | 해당 캐시 파일 삭제 후 재시도 |
| 세로형 mp4가 반환되지 않음 | 검색어가 너무 구체적 | CATEGORY_QUERY_MAP 에 더 일반적인 키워드 추가 |
| 키 설정했는데 여전히 폴백 | `.env.local` 로드 실패 | `next dev` 재시작 또는 tsx 스크립트는 `dotenv/config` 수동 로드 필요 |

---

## 8. 관련 파일

- `lib/providers/background.ts` — `ensureBackgroundForCategory` + Pexels 호출
- `scripts/test-background-fetch.ts` — 수동 검증
- `scripts/seed-assets.ts` — `checkPexelsKey()` 경고
- `.gitignore` — `.env.local` + `/assets/backgrounds/_cache/` 제외
