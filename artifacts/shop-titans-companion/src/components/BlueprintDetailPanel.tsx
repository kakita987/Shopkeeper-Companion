import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Blueprint, BlueprintDetail } from '../types/blueprints';
import { blueprintDetailMap } from '../data/blueprintDetails';
import { X, CheckCircle2, Lock, ChevronDown, GripVertical } from 'lucide-react';

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

// ── Section content renderers (no wrapper — parent handles the shell) ─────────

/** Returns the rows for the Unlock section, or null if there's nothing to show. */
function unlockContent(detail: BlueprintDetail): React.ReactNode | null {
  const rows: React.ReactNode[] = [];
  if (detail.unlockPrerequisite)
    rows.push(<DetailRow key="prereq"   label="Prerequisite"    value={detail.unlockPrerequisite} />);
  if (detail.researchScrolls)
    rows.push(<DetailRow key="scrolls"  label="Research Scrolls" value={detail.researchScrolls} />);
  if (detail.antiqueTokens)
    rows.push(<DetailRow key="tokens"   label="Antique Tokens"  value={detail.antiqueTokens.toLocaleString()} />);
  return rows.length > 0 ? <>{rows}</> : null;
}

/** Returns the rows for the Crafting section (always has content when detail exists). */
function craftingContent(detail: BlueprintDetail): React.ReactNode {
  return (
    <>
      <DetailRow label="Value"         value={`${formatGold(detail.value)} 🪙`} />
      <DetailRow label="Crafting Time" value={formatTime(detail.craftingTimeSeconds)} />
      {detail.components.map((c) => (
        <DetailRow key={c.name} label={c.name} value={`× ${c.quantity}`} />
      ))}
    </>
  );
}

/** Returns the rows for the Stats section, or null if there are no stats or affinity. */
function statsContent(detail: BlueprintDetail): React.ReactNode | null {
  const entries = Object.entries(detail.stats);
  if (entries.length === 0 && !detail.elementalAffinity) return null;
  return (
    <>
      {entries.map(([stat, val]) => (
        <DetailRow key={stat} label={stat} value={val} />
      ))}
      {detail.elementalAffinity && (
        <DetailRow label="Elemental Affinity" value={detail.elementalAffinity} />
      )}
    </>
  );
}

/** Returns the rows for Crafting Upgrades, or null if the list is absent or empty. */
function craftingUpgradesContent(detail: BlueprintDetail): React.ReactNode | null {
  if (!detail.craftingUpgrades?.length) return null;
  return (
    <>
      {detail.craftingUpgrades.map((u) => (
        <ListRow key={u.crafts} label={`${u.crafts} crafts`} value={u.description} />
      ))}
    </>
  );
}

/** Returns the rows for Ascension, or null if the list is absent or empty. */
function ascensionContent(detail: BlueprintDetail): React.ReactNode | null {
  if (!detail.ascension?.length) return null;
  return (
    <>
      {detail.ascension.map((perk, i) => (
        <FullRow key={i}>{perk}</FullRow>
      ))}
    </>
  );
}

// ── Section definition table ──────────────────────────────────────────────────

interface SectionDef {
  key: string;
  title: string;
  /** Returns content nodes or null when this section has nothing to show. */
  renderContent: (detail: BlueprintDetail) => React.ReactNode | null;
}

const SECTION_DEFS: SectionDef[] = [
  { key: 'unlock',   title: 'Unlock',           renderContent: unlockContent           },
  { key: 'crafting', title: 'Crafting',          renderContent: craftingContent         },
  { key: 'stats',    title: 'Stats',             renderContent: statsContent            },
  { key: 'upgrades', title: 'Crafting Upgrades', renderContent: craftingUpgradesContent },
  { key: 'ascension',title: 'Ascension',         renderContent: ascensionContent        },
];

const DEFAULT_ORDER = SECTION_DEFS.map((s) => s.key);
const STORAGE_KEY   = 'bp-section-order';

function loadOrder(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as string[];
      // Guard against stale storage after sections are added/removed.
      if (parsed.length === DEFAULT_ORDER.length && parsed.every((k) => DEFAULT_ORDER.includes(k))) {
        return parsed;
      }
    }
  } catch { /* ignore */ }
  return DEFAULT_ORDER;
}

// ── Collapsible + draggable Section shell ─────────────────────────────────────

interface SectionShellProps {
  title: string;
  isCollapsed: boolean;
  onToggle: () => void;
  /** When true a drag handle is rendered and the shell becomes draggable. */
  reorderMode: boolean;
  /** Pointer-down handler on the drag handle (initiates drag). */
  onHandlePointerDown?: (e: React.PointerEvent<HTMLButtonElement>) => void;
  /** Visual hint that this section is the current drop target. */
  isDropTarget: boolean;
  children: React.ReactNode;
}

function SectionShell({
  title, isCollapsed, onToggle, reorderMode, onHandlePointerDown, isDropTarget, children,
}: SectionShellProps) {
  return (
    <div
      className={[
        'mb-3 transition-opacity duration-150',
        isDropTarget ? 'opacity-50' : 'opacity-100',
      ].join(' ')}
    >
      {/* ── Section heading (tap to collapse / expand) ── */}
      <div className="flex items-center gap-1 mb-2">

        {/* Drag handle — only visible in reorder mode */}
        <button
          aria-label={`Drag to reorder ${title}`}
          onPointerDown={onHandlePointerDown}
          className={[
            'flex items-center justify-center w-6 h-6 rounded-md',
            'text-muted-foreground/60 hover:text-muted-foreground',
            'transition-all duration-200 touch-none select-none',
            reorderMode
              ? 'opacity-100 cursor-grab active:cursor-grabbing'
              : 'opacity-0 pointer-events-none w-0 overflow-hidden',
          ].join(' ')}
          tabIndex={reorderMode ? 0 : -1}
        >
          <GripVertical className="w-4 h-4" />
        </button>

        {/* Heading button */}
        <button
          onClick={onToggle}
          className="flex-1 flex items-center justify-between group"
          aria-expanded={!isCollapsed}
        >
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {title}
          </h3>
          <ChevronDown
            className={[
              'w-3.5 h-3.5 text-muted-foreground/60 transition-transform duration-200',
              isCollapsed ? 'rotate-0' : '-rotate-180',
            ].join(' ')}
          />
        </button>
      </div>

      {/* ── Collapsible content ── */}
      <div
        className={[
          'overflow-hidden transition-all duration-200',
          isCollapsed ? 'max-h-0' : 'max-h-[2000px]',
        ].join(' ')}
        aria-hidden={isCollapsed}
      >
        <div className="rounded-2xl bg-white/40 dark:bg-white/5 border border-white/50 dark:border-white/10 divide-y divide-white/30 dark:divide-white/10 overflow-hidden mb-2">
          {children}
        </div>
      </div>
    </div>
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
 * Features:
 * - Section headings are tappable toggles (collapse/expand).
 * - When ALL visible sections are collapsed, drag handles appear and the
 *   user can drag sections into their preferred order.
 * - Section order is persisted to localStorage.
 * - Collapsed state resets (all expanded) each time a new blueprint opens.
 */
export function BlueprintDetailPanel({ selection, onClose }: BlueprintDetailPanelProps) {
  // Retain the last non-null selection so content stays visible during slide-out.
  const lastRef = useRef<BlueprintSelection | null>(null);
  if (selection) lastRef.current = selection;
  const content = selection ?? lastRef.current;

  const isOpen = Boolean(selection);

  // Look up the structured detail record, if one exists for this blueprint.
  const detail = content ? (blueprintDetailMap[content.blueprint.id] ?? null) : null;

  // ── Section order (persisted) ─────────────────────────────────────────────
  const [sectionOrder, setSectionOrder] = useState<string[]>(loadOrder);

  const saveOrder = useCallback((order: string[]) => {
    setSectionOrder(order);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(order)); } catch { /* ignore */ }
  }, []);

  // ── Collapsed state (resets when a new blueprint is opened) ───────────────
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const prevBlueprintId = useRef<string | null>(null);
  useEffect(() => {
    if (selection && selection.blueprint.id !== prevBlueprintId.current) {
      prevBlueprintId.current = selection.blueprint.id;
      setCollapsed(new Set()); // expand everything for the new blueprint
    }
  }, [selection]);

  function toggleSection(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  // ── Drag-to-reorder (pointer events, works on touch + mouse) ─────────────
  const [draggingKey, setDraggingKey]   = useState<string | null>(null);
  const [dropTargetKey, setDropTargetKey] = useState<string | null>(null);
  const sectionNodeMap = useRef<Map<string, HTMLElement>>(new Map());

  /** Called by each SectionShell to register its root DOM node. */
  function registerRef(key: string, node: HTMLElement | null) {
    if (node) sectionNodeMap.current.set(key, node);
    else       sectionNodeMap.current.delete(key);
  }

  function handleHandlePointerDown(key: string, e: React.PointerEvent<HTMLButtonElement>) {
    // Only activate in reorder mode (checked by caller, but guard here too).
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDraggingKey(key);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!draggingKey) return;
    // Walk registered section nodes to find which one the pointer is over.
    for (const [key, node] of sectionNodeMap.current) {
      if (key === draggingKey) continue;
      const rect = node.getBoundingClientRect();
      if (
        e.clientY >= rect.top  && e.clientY <= rect.bottom &&
        e.clientX >= rect.left && e.clientX <= rect.right
      ) {
        setDropTargetKey(key);
        return;
      }
    }
    setDropTargetKey(null);
  }

  function handlePointerUp() {
    if (draggingKey && dropTargetKey) {
      const next      = [...sectionOrder];
      const fromIndex = next.indexOf(draggingKey);
      const toIndex   = next.indexOf(dropTargetKey);
      if (fromIndex !== -1 && toIndex !== -1) {
        next.splice(fromIndex, 1);
        next.splice(toIndex, 0, draggingKey);
        saveOrder(next);
      }
    }
    setDraggingKey(null);
    setDropTargetKey(null);
  }

  // ── Derive the visible section list for this blueprint ────────────────────
  // A section is "visible" only if its content renderer returns something.
  const defMap = Object.fromEntries(SECTION_DEFS.map((d) => [d.key, d]));

  const visibleSections: Array<{ key: string; title: string; content: React.ReactNode }> =
    detail
      ? sectionOrder.flatMap((key) => {
          const def = defMap[key];
          if (!def) return [];
          const content = def.renderContent(detail);
          if (content === null) return [];
          return [{ key, title: def.title, content }];
        })
      : [];

  // Reorder mode activates only when every visible section is collapsed.
  const reorderMode =
    visibleSections.length > 1 &&
    visibleSections.every((s) => collapsed.has(s.key));

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
        <div
          className="relative z-20 flex-1 overflow-y-auto"
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
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

              {/* ── Data sections ────────────────────────────────────── */}
              {detail && visibleSections.length > 0 && (
                <div>
                  {/* Reorder hint — fades in when all sections are collapsed */}
                  <p
                    className={[
                      'text-xs text-center text-muted-foreground/60 mb-3',
                      'transition-all duration-200',
                      reorderMode ? 'opacity-100 max-h-8' : 'opacity-0 max-h-0 overflow-hidden',
                    ].join(' ')}
                    aria-live="polite"
                  >
                    Drag to reorder sections
                  </p>

                  {visibleSections.map(({ key, title, content: rows }) => (
                    // Wrapper div carries the ref so pointer-move hit-testing works.
                    <div key={key} ref={(node) => registerRef(key, node)}>
                      <SectionShell
                        title={title}
                        isCollapsed={collapsed.has(key)}
                        onToggle={() => toggleSection(key)}
                        reorderMode={reorderMode}
                        onHandlePointerDown={(e) => handleHandlePointerDown(key, e)}
                        isDropTarget={dropTargetKey === key}
                      >
                        {rows}
                      </SectionShell>
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </>
  );
}
