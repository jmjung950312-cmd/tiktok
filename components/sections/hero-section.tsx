import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export function HeroSection() {
  return (
    <section className="py-20 text-center sm:py-28">
      <Badge variant="outline" className="mb-6">
        Next.js 16 + ShadcnUI v4로 제작
      </Badge>
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
        빠르게 시작하는
        <br />
        <span className="text-muted-foreground">모던 웹 스타터킷</span>
      </h1>
      <p className="text-muted-foreground mx-auto mt-6 max-w-2xl text-lg">
        Next.js 16, TypeScript, TailwindCSS v4, ShadcnUI v4로 구성된 범용 스타터킷입니다. 다크모드,
        반응형 레이아웃, 폼 처리 등 웹 개발에 필요한 모든 기반이 갖춰져 있습니다.
      </p>
      <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
        <Button asChild size="lg">
          <Link href="/#features">기능 살펴보기</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/contact">문의하기</Link>
        </Button>
      </div>
    </section>
  );
}
