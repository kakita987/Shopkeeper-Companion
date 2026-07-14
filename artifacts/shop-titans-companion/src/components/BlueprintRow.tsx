import React from 'react';
import { Blueprint } from '../types/blueprints';
import { CheckCircle2, Lock } from 'lucide-react';

interface BlueprintRowProps {
  blueprint: Blueprint;
}

/**
 * A single blueprint row.
 *
 * Shows the tier badge, blueprint name, and unlock status.
 * Indented further than categories to give a clear visual hierarchy.
 */
export function BlueprintRow({ blueprint }: BlueprintRowProps) {
  // Tier colour ranges mirror the game's rarity progression.
  const getTierColor = (tier: number): string => {
    if (tier <= 3) return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400';
    if (tier <= 6) return 'bg-blue-500/15 text-blue-700 dark:text-blue-400';
    if (tier <= 9) return 'bg-purple-500/15 text-purple-700 dark:text-purple-400';
    return 'bg-amber-500/15 text-amber-700 dark:text-amber-400';
  };

  return (
    <div
      className="flex items-center gap-3 pl-14 pr-4 py-2.5 border-b border-border/60 last:border-b-0 hover:bg-muted/30 transition-colors"
      data-testid={`blueprint-row-${blueprint.id}`}
    >
      {/* Tier badge */}
      <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${getTierColor(blueprint.tier)}`}>
        T{blueprint.tier}
      </span>

      {/* Blueprint name */}
      <span className="flex-1 text-sm text-foreground">
        {blueprint.name}
      </span>

      {/* Unlock status icon */}
      {blueprint.unlocked
        ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
        : <Lock className="w-4 h-4 text-muted-foreground/40 shrink-0" />}
    </div>
  );
}
