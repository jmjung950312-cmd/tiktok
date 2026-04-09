'use client';

// components/pipeline/teammate-status.tsx
// 섹션 4 일부 — 시나리오 A 5명 Teammate Badge 목록.

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SCENARIO_A_TEAMMATES } from '@/lib/constants';

interface TeammateStatusProps {
  activeTeammates: readonly string[];
  completedTeammates: readonly string[];
  failed?: boolean;
}

export function TeammateStatus({
  activeTeammates,
  completedTeammates,
  failed = false,
}: TeammateStatusProps) {
  const resolveState = (name: string): 'pending' | 'running' | 'completed' | 'failed' => {
    if (failed && activeTeammates.includes(name)) return 'failed';
    if (activeTeammates.includes(name)) return 'running';
    if (completedTeammates.includes(name)) return 'completed';
    return 'pending';
  };

  return (
    <div className="flex flex-wrap gap-2">
      {SCENARIO_A_TEAMMATES.map((name) => {
        const state = resolveState(name);
        const { icon, variant, cls } = getBadgeStyle(state);
        return (
          <Badge key={name} variant={variant} className={cn('gap-1 px-2 py-0.5 text-xs', cls)}>
            <span aria-hidden>{icon}</span>
            {name}
          </Badge>
        );
      })}
    </div>
  );
}

function getBadgeStyle(state: 'pending' | 'running' | 'completed' | 'failed'): {
  icon: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  cls: string;
} {
  switch (state) {
    case 'running':
      return { icon: '🔵', variant: 'default', cls: 'animate-pulse' };
    case 'completed':
      return { icon: '🟢', variant: 'secondary', cls: '' };
    case 'failed':
      return { icon: '🔴', variant: 'destructive', cls: '' };
    case 'pending':
    default:
      return { icon: '⚪', variant: 'outline', cls: 'opacity-60' };
  }
}
