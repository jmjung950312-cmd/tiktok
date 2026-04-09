'use client';

// components/layout/team-status-badge.tsx
// 헤더 우측 팀 상태 배지. GET /api/team/status 10초 간격 폴링.

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';

interface RecentTriggerRow {
  triggerId: string;
  scenario: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  activeTeammates: string[];
  createdAt: string;
}

export function TeamStatusBadge() {
  const [active, setActive] = useState(0);
  const [state, setState] = useState<'idle' | 'busy' | 'error' | 'offline'>('offline');

  useEffect(() => {
    let cancelled = false;

    const tick = async (): Promise<void> => {
      try {
        const res = await fetch('/api/team/status', { cache: 'no-store' });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { recent: RecentTriggerRow[] };
        if (cancelled) return;
        const running = data.recent.filter((r) => r.status === 'running');
        const totalActive = running.reduce((sum, r) => sum + r.activeTeammates.length, 0);
        setActive(totalActive);
        setState(running.length > 0 ? 'busy' : 'idle');
      } catch {
        if (!cancelled) setState('error');
      }
    };

    void tick();
    const id = setInterval(() => void tick(), 10_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const variant =
    state === 'busy'
      ? 'default'
      : state === 'idle'
        ? 'secondary'
        : state === 'error'
          ? 'destructive'
          : 'outline';

  const label =
    state === 'busy'
      ? `🟢 ${active}명 활성`
      : state === 'idle'
        ? '⚪ 대기'
        : state === 'error'
          ? '❗ API 오류'
          : '🔘 점검 중';

  return <Badge variant={variant}>{label}</Badge>;
}
