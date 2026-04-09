export function InfoSection() {
  return (
    <section id="about" className="py-16 sm:py-20">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">소개</h2>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          이 스타터킷은 어떤 웹 프로젝트에서든 빠르게 개발을 시작할 수 있도록 설계되었습니다.
          &ldquo;바퀴를 재발명하지 말 것&rdquo; 원칙에 따라 검증된 라이브러리를 적극 활용하여
          최소한의 코드로 최대한의 생산성을 제공합니다.
        </p>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          Server Components를 기본으로 사용하여 성능을 최적화하고, 필요한 경우에만
          Client Components를 활용합니다. 전체 프로젝트에서 Client Component는 4개에 불과합니다.
        </p>

        <div className="mt-8 rounded-lg border border-border bg-muted/50 p-4">
          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
            기술 스택
          </p>
          <pre className="text-sm text-foreground overflow-auto">
            <code>{`Next.js 16      → 앱 라우터, Server Components
TypeScript      → 타입 안전성
TailwindCSS v4  → 유틸리티 우선 스타일링
ShadcnUI v4     → 접근성 준수 UI 컴포넌트
next-themes     → 다크모드 (FOUC 방지)
react-hook-form → 폼 관리 (최소 리렌더링)
zod             → 스키마 기반 유효성 검증
sonner          → 토스트 알림`}</code>
          </pre>
        </div>
      </div>
    </section>
  );
}
