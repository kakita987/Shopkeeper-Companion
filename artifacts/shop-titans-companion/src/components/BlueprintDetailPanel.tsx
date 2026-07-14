import React, { useRef } from 'react';
import { Blueprint } from '../types/blueprints';
import { X, CheckCircle2, Lock } from 'lucide-react';

// ── Shared type ───────────────────────────────────────────────────────────────

/** Everything the panel needs to know about a selected blueprint. */
export interface BlueprintSelection {
  blueprint: Blueprint;
  groupName: string;
  categoryName: string;
  /** The GroupId of the selected blueprint — used by the parent to scroll. */
  groupId: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Tier colour palette — mirrors the in-game rarity progression. */
function tierColor(tier: number): string {
  if (tier <= 3) return 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300';
  if (tier <= 6) return 'bg-blue-500/20 text-blue-700 dark:text-blue-300';
  if (tier <= 9) return 'bg-purple-500/20 text-purple-700 dark:text-purple-300';
  return 'bg-amber-500/20 text-amber-700 dark:text-amber-300';
}

// ── Sub-components ────────────────────────────────────────────────────────────

/** A labelled section inside the panel (Stats, Recipe, …). */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
        {title}
      </h3>
      {/* Inner card inherits the glass context from the panel */}
      <div className="rounded-2xl bg-white/40 dark:bg-white/5 border border-white/50 dark:border-white/10 divide-y divide-white/30 dark:divide-white/10 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

/** Animated placeholder rows for data not yet implemented. */
function PlaceholderRows({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center justify-between px-4 py-3">
          <div className="h-3 w-28 rounded-full bg-foreground/8 animate-pulse" />
          <div className="h-3 w-14 rounded-full bg-foreground/8 animate-pulse" />
        </div>
      ))}
    </>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

interface BlueprintDetailPanelProps {
  selection: BlueprintSelection | null;
  onClose: () => void;
}

/**
 * Liquid Glass bottom-sheet detail panel for a selected blueprint.
 *
 * Design:
 * - Always stays in the DOM so the exit animation plays without content
 *   disappearing. A ref caches the last selection for the slide-out.
 * - Specular rim (1-px gradient) + a glass sheen (soft top-fade) recreate
 *   the light-catch of thick frosted glass.
 * - The backdrop dims the background without adding blur — the panel's own
 *   backdrop-filter blurs the content directly behind it.
 */
export function BlueprintDetailPanel({ selection, onClose }: BlueprintDetailPanelProps) {
  // Retain the last non-null selection so content stays visible while
  // the panel slides back down after the user dismisses it.
  const lastRef = useRef<BlueprintSelection | null>(null);
  if (selection) lastRef.current = selection;
  const content = selection ?? lastRef.current;

  const isOpen = Boolean(selection);

  return (
    <>
      {/* ── Backdrop ──────────────────────────────────────────────────── */}
      {/* Dims the background. No blur here — the glass panel itself blurs. */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 z-30 bg-black/20 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* ── Glass panel ───────────────────────────────────────────────── */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={content?.blueprint.name ?? 'Blueprint detail'}
        className={[
          // Position & size
          'fixed bottom-0 inset-x-0 z-40 max-h-[70vh]',
          // Shape
          'rounded-t-3xl overflow-hidden',
          // Liquid Glass — layered translucency + strong backdrop blur
          'bg-white/60 dark:bg-zinc-950/65',
          'backdrop-blur-2xl',
          // Depth shadow
          'shadow-[0_-10px_40px_rgba(0,0,0,0.15)]',
          // Layout
          'flex flex-col',
          // Slide animation
          'transition-transform duration-300',
          isOpen ? 'translate-y-0 ease-out' : 'translate-y-full ease-in',
        ].join(' ')}
      >
        {/* Specular rim — 1-px highlight at the top edge, mimics glass catching light */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 dark:via-white/30 to-transparent pointer-events-none z-10" />

        {/* Glass sheen — soft wash that fades quickly downward */}
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/30 dark:from-white/6 to-transparent pointer-events-none z-10" />

        {/* ── Handle pill ─────────────────────────────────────────────── */}
        <div className="relative z-20 flex justify-center pt-3 pb-0 shrink-0">
          <div className="w-10 h-1 rounded-full bg-foreground/20" />
        </div>

        {/* ── Scrollable content ──────────────────────────────────────── */}
        <div className="relative z-20 flex-1 overflow-y-auto">
          {content && (
            <div className="px-5 pt-3 pb-12">

              {/* Breadcrumb + close button */}
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs text-muted-foreground tracking-wide">
                  {content.groupName} › {content.categoryName}
                </p>
                <button
                  onClick={onClose}
                  className="p-1 -mt-0.5 -mr-1 rounded-full hover:bg-black/8 dark:hover:bg-white/10 transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Blueprint name */}
              <h2 className="text-2xl font-bold text-foreground tracking-tight leading-tight mb-1.5">
                {content.blueprint.name}
              </h2>

              {/* Tier badge */}
              <span className={`inline-flex items-center text-sm font-semibold px-2.5 py-0.5 rounded-lg mb-4 ${tierColor(content.blueprint.tier)}`}>
                Tier {content.blueprint.tier}
              </span>

              {/* Unlock status */}
              <div className="flex items-center gap-2 mb-6">
                {content.blueprint.unlocked ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                      Unlocked
                    </span>
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5 text-muted-foreground/50 shrink-0" />
                    <span className="text-sm font-medium text-muted-foreground">
                      Locked
                    </span>
                  </>
                )}
              </div>

              {/* Stats — placeholder */}
              <Section title="Stats">
                <PlaceholderRows count={3} />
              </Section>

              {/* Recipe — placeholder */}
              <Section title="Recipe">
                <PlaceholderRows count={4} />
              </Section>

            </div>
          )}
        </div>
      </div>
    </>
  );
}
