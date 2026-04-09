import Link from 'next/link';
import { siteConfig } from '@/lib/site-config';
import { ThemeToggle } from '@/components/theme-toggle';
import { MobileNav } from '@/components/layout/mobile-nav';
import { TeamStatusBadge } from '@/components/layout/team-status-badge';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="font-semibold text-foreground hover:opacity-80 transition-opacity"
        >
          {siteConfig.name}
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {siteConfig.nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <TeamStatusBadge />
          <ThemeToggle />
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
