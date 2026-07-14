import React, { useRef } from 'react';
import { Blueprint, BlueprintDetail } from '../types/blueprints';
import { blueprintDetailMap } from '../data/blueprintDetails';
import { X, CheckCircle2, Lock } from 'lucide-react';

// ── Shared selection type ─────────────────────────────────────────────────────

/** Everything the panel needs to know about a selected blueprint. */
export interface BlueprintSelection {
  blueprint: Blueprint;
  groupName: string;
  categoryName: string;
  /** The GroupId of the selected blueprint — used by the parent to scroll. */
  groupId: string;
}

// ── Formatting helpers ────────────────────────────────────────────────────────

/** Converts a raw second count into a readable duration string. */
function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds} sec`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s === 0 ? `${m} min` : `${m} min ${s} sec`;
}

/** Formats a gold value with thousands separators. */
function formatGold(value: number): string {
  return value.toLocaleString();
}

/** Tier colour palette — mirrors the in-game rarity progression. */
function tierColor(tier: number): string {
  if (tier <= 3) return 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300';
  if (tier <= 6) return 'bg-blue-500/20 text-blue-700 dark:text-blue-300';
  if (tier <= 9) return 'bg-purple-500/20 text-purple-700 dark:text-purple-300';
  return 'bg-amber-500/20 text-amber-700 dark:text-amber-300';
}

// ── Row primitives ────────────────────────────────────────────────────────────

/** A standard label → value row used across most sections. */
function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">{value}</span>
    </div>
  );
}

/** A full-width row for list items (crafting upgrades, ascension perks). */
function ListRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-3 px-4 py-2.5">
      <span className="shrink-0 w-16 text-xs font-semibold text-muted-foreground tabular-nums">
        {label}
      </span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}

/** A single-line full-width row (ascension perks). */
function FullRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-4 py-2.5">
      <span className="text-sm text-foreground">{children}</span>
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────

/**
 * A titled card section inside the panel.
 * Only render this if you have content to show — it will never render empty.
 */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
        {title}
      </h3>
      <div className="rounded-2xl bg-white/40 dark:bg-white/5 border border-white/50 dark:border-white/10 divide-y divide-white/30 dark:divide-white/10 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

// ── Detail sections ───────────────────────────────────────────────────────────

/** Unlock requirements — shown only when at least one field is present. */
function UnlockSection({ detail }: { detail: BlueprintDetail }) {
  const rows: React.ReactNode[] = [];
  if (detail.unlockPrerequisite)
    rows.push(<DetailRow key="prereq" label="Prerequisite" value={detail.unlockPrerequisite} />);
  if (detail.researchScrolls)
    rows.push(<DetailRow key="scrolls" label="Research Scrolls" value={detail.researchScrolls} />);
  if (detail.antiqueTokens)
    rows.push(<DetailRow key="tokens" label="Antique Tokens" value={detail.antiqueTokens.toLocaleString()} />);
  if (rows.length === 0) return null;
  return <Section title="Unlock">{rows}</Section>;
}

/** Value, crafting time, and components — always shown when detail data exists. */
function CraftingSection({ detail }: { detail: BlueprintDetail }) {
  return (
    <Section title="Crafting">
      <DetailRow label="Value"         value={`${formatGold(detail.value)} 🪙`} />
      <DetailRow label="Crafting Time" value={formatTime(detail.craftingTimeSeconds)} />
      {detail.components.map((c) => (
        <DetailRow key={c.name} label={c.name} value={`× ${c.quantity}`} />
      ))}
    </Section>
  );
}

/** Numeric combat stats + elemental affinity — hidden if both are absent. */
function StatsSection({ detail }: { detail: BlueprintDetail }) {
  const entries = Object.entries(detail.stats);
  if (entries.length === 0 && !detail.elementalAffinity) return null;
  return (
    <Section title="Stats">
      {entries.map(([stat, val]) => (
        <DetailRow key={stat} label={stat} value={val} />
      ))}
      {detail.elementalAffinity && (
        <DetailRow label="Elemental Affinity" value={detail.elementalAffinity} />
      )}
    </Section>
  );
}

/** Craft-count milestones — hidden if the array is absent or empty. */
function CraftingUpgradesSection({ detail }: { detail: BlueprintDetail }) {
  if (!detail.craftingUpgrades?.length) return null;
  return (
    <Section title="Crafting Upgrades">
      {detail.craftingUpgrades.map((u) => (
        <ListRow key={u.crafts} label={`${u.crafts} crafts`} value={u.description} />
      ))}
    </Section>
  );
}

/** Ascension perks — hidden if the array is absent or empty. */
function AscensionSection({ detail }: { detail: BlueprintDetail }) {
  if (!detail.ascension?.length) return null;
  return (
    <Section title="Ascension">
      {detail.ascension.map((perk, i) => (
        <FullRow key={i}>{perk}</FullRow>
      ))}
    </Section>
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
 * Looks up structured detail data by blueprint id from blueprintDetailMap.
 * Sections are rendered only when their data is present — empty sections
 * are never shown. When no detail record exists yet, only the header
 * (name, tier, breadcrumb, unlock status) is displayed.
 *
 * The panel stays in the DOM at all times so the exit animation plays
 * cleanly. A ref retains the last selection during the slide-out.
 */
export function BlueprintDetailPanel({ selection, onClose }: BlueprintDetailPanelProps) {
  // Retain the last non-null selection so content stays visible while
  // the panel slides back down after the user dismisses it.
  const lastRef = useRef<BlueprintSelection | null>(null);
  if (selection) lastRef.current = selection;
  const content = selection ?? lastRef.current;

  const isOpen = Boolean(selection);

  // Look up the structured detail record, if one exists for this blueprint.
  const detail = content ? (blueprintDetailMap[content.blueprint.id] ?? null) : null;

  return (
    <>
      {/* ── Backdrop ──────────────────────────────────────────────────── */}
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
          'fixed bottom-0 inset-x-0 z-40 max-h-[calc(100vh-52px)]',
          'rounded-t-3xl overflow-hidden flex flex-col',
          'bg-white/60 dark:bg-zinc-950/65',
          'backdrop-blur-2xl',
          'shadow-[0_-10px_40px_rgba(0,0,0,0.15)]',
          'transition-transform duration-300',
          isOpen ? 'translate-y-0 ease-out' : 'translate-y-full ease-in',
        ].join(' ')}
      >
        {/* Specular rim */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/90 dark:via-white/30 to-transparent pointer-events-none z-10" />
        {/* Glass sheen */}
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/30 dark:from-white/6 to-transparent pointer-events-none z-10" />

        {/* Handle pill */}
        <div className="relative z-20 flex justify-center pt-3 shrink-0">
          <div className="w-10 h-1 rounded-full bg-foreground/20" />
        </div>

        {/* ── Scrollable content ──────────────────────────────────────── */}
        <div className="relative z-20 flex-1 overflow-y-auto">
          {content && (
            <div className="px-5 pt-3 pb-12">

              {/* Breadcrumb + close */}
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

              {/* Blueprint name + tier badge */}
              <div className="flex items-center gap-3 mb-4">
                <h2 className="flex-1 text-3xl font-bold text-foreground tracking-tight leading-tight">
                  {content.blueprint.name}
                </h2>
                <span className={`shrink-0 inline-flex items-center text-base font-semibold px-3 py-1 rounded-xl ${tierColor(content.blueprint.tier)}`}>
                  Tier {content.blueprint.tier}
                </span>
              </div>

              {/* Unlock status */}
              <div className="flex items-center gap-2 mb-6">
                {content.blueprint.unlocked ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Unlocked</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-5 h-5 text-muted-foreground/50 shrink-0" />
                    <span className="text-sm font-medium text-muted-foreground">Locked</span>
                  </>
                )}
              </div>

              {/* ── Data sections (only shown when detail record exists) ─ */}
              {detail && (
                <>
                  <UnlockSection          detail={detail} />
                  <CraftingSection        detail={detail} />
                  <StatsSection           detail={detail} />
                  <CraftingUpgradesSection detail={detail} />
                  <AscensionSection       detail={detail} />
                </>
              )}

            </div>
          )}
        </div>
      </div>
    </>
  );
}
