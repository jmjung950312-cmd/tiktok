// lib/site-config.ts
// TikTok 자동화 파이프라인 사이트 설정. 한국어 UI 고정.

export const siteConfig = {
  name: 'TikTok 자동화',
  description: 'Claude Code Agent Teams + Next.js 로 5개 숏폼을 한 번에 생성·검수·업로드',
  url: 'http://localhost:3000',
  nav: [
    { label: '대시보드', href: '/' },
    { label: '분석', href: '/analytics' },
    { label: '히스토리', href: '/history' },
    { label: '설정', href: '/settings' },
  ],
  footer: {
    links: [
      {
        title: '파이프라인',
        items: [
          { label: '대시보드', href: '/' },
          { label: '히스토리', href: '/history' },
          { label: '분석', href: '/analytics' },
        ],
      },
      {
        title: '개발',
        items: [
          { label: '설정', href: '/settings' },
          { label: 'PRD', href: '#' },
          { label: '로드맵', href: '#' },
        ],
      },
    ],
    copyright: `© ${new Date().getFullYear()} TikTok 자동화 — 솔로 개발자 전용.`,
  },
} as const;

export type SiteConfig = typeof siteConfig;
