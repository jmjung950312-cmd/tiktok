import {
  Layers,
  Moon,
  Smartphone,
  Zap,
  Shield,
  FormInput,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const features = [
  {
    icon: Layers,
    title: "모던 스택",
    description:
      "Next.js 16, TypeScript, TailwindCSS v4, ShadcnUI v4의 최신 조합으로 구성되어 있습니다.",
  },
  {
    icon: Moon,
    title: "다크모드",
    description:
      "next-themes 기반의 라이트/다크 테마 전환을 지원합니다. 시스템 설정도 자동으로 감지합니다.",
  },
  {
    icon: Smartphone,
    title: "반응형 디자인",
    description:
      "모바일부터 데스크톱까지 모든 화면 크기에 최적화된 반응형 레이아웃을 제공합니다.",
  },
  {
    icon: Zap,
    title: "빠른 성능",
    description:
      "Server Components 우선 전략으로 최소한의 클라이언트 번들로 빠른 초기 로딩을 실현합니다.",
  },
  {
    icon: FormInput,
    title: "폼 처리",
    description:
      "react-hook-form + zod 조합으로 타입 안전한 폼 유효성 검증 패턴을 제공합니다.",
  },
  {
    icon: Shield,
    title: "타입 안전성",
    description:
      "TypeScript와 zod 스키마를 통해 런타임과 빌드 타임 모두 타입 안전성을 보장합니다.",
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-16 sm:py-20">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">주요 기능</h2>
        <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
          검증된 라이브러리와 모던 웹 개발 패턴을 기반으로 구성된 스타터킷입니다.
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <Card key={feature.title} className="border-border/60">
              <CardHeader>
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-base">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{feature.description}</CardDescription>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
