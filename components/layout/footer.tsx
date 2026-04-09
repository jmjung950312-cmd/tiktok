import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { siteConfig } from '@/lib/site-config';

export function Footer() {
  return (
    <footer className="border-border bg-muted/30 border-t">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
          <div className="col-span-2 sm:col-span-1">
            <p className="text-foreground font-semibold">{siteConfig.name}</p>
            <p className="text-muted-foreground mt-2 max-w-xs text-sm">{siteConfig.description}</p>
          </div>
          {siteConfig.footer.links.map((group) => (
            <div key={group.title}>
              <p className="text-foreground text-sm font-semibold">{group.title}</p>
              <ul className="mt-3 space-y-2">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-muted-foreground hover:text-foreground text-sm transition-colors"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <Separator className="my-8" />
        <p className="text-muted-foreground text-center text-sm">{siteConfig.footer.copyright}</p>
      </div>
    </footer>
  );
}
