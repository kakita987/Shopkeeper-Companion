import React, { useState } from 'react';
import { blueprintData } from '../data/blueprints';
import { BlueprintCategory } from '../types/blueprints';
import { BlueprintCategorySection } from '../components/BlueprintCategorySection';

// ── Types ────────────────────────────────────────────────────────────────────

/**
 * A saved view is a named, user-defined filter over the blueprint list.
 * When users can create views, this will be stored and loaded dynamically.
 * For now it's built from placeholder data.
 */
interface SavedView {
  id: string;
  name: string;
  description: string;
  /** The filtered categories (empty categories are excluded). */
  categories: BlueprintCategory[];
}

// ── Placeholder data ─────────────────────────────────────────────────────────

// Flatten all categories from every group into a single list.
const allCategories = blueprintData.flatMap((group) => group.categories);

/**
 * Filter helper: returns a copy of every category that has at least one
 * blueprint matching the predicate, with non-matching blueprints removed.
 */
function filterCategories(
  predicate: (bp: { tier: number; unlocked: boolean }) => boolean
): BlueprintCategory[] {
  return allCategories
    .map((cat) => ({ ...cat, blueprints: cat.blueprints.filter(predicate) }))
    .filter((cat) => cat.blueprints.length > 0);
}

const PLACEHOLDER_VIEWS: SavedView[] = [
  {
    id: 'unlocked-only',
    name: 'Unlocked Only',
    description: 'Every blueprint you have already unlocked.',
    categories: filterCategories((bp) => bp.unlocked),
  },
  {
    id: 'starter-gear',
    name: 'Starter Gear',
    description: 'All Tier 1–3 blueprints across every category.',
    categories: filterCategories((bp) => bp.tier <= 3),
  },
];

// ── SavedViewSection ─────────────────────────────────────────────────────────

interface SavedViewSectionProps {
  view: SavedView;
}

/**
 * Renders one saved view.
 *
 * Unlike the Blueprints tab (where only one category can be open at a time),
 * saved views start with every category expanded. Each category can be
 * collapsed independently — collapsing one has no effect on the others.
 */
function SavedViewSection({ view }: SavedViewSectionProps) {
  // Track which categories the user has manually collapsed.
  // An empty set means everything is open (the default).
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  const toggleCategory = (categoryId: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId); // re-expand
      } else {
        next.add(categoryId);    // collapse
      }
      return next;
    });
  };

  return (
    <div className="rounded-xl bg-card border border-border overflow-hidden">
      {/* View name + description */}
      <div className="px-4 py-3.5 border-b border-border">
        <h2 className="text-sm font-semibold text-foreground">{view.name}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">{view.description}</p>
      </div>

      {/* Categories — auto-expanded, independently collapsible */}
      {view.categories.map((category) => (
        <BlueprintCategorySection
          key={category.id}
          category={category}
          isOpen={!collapsedIds.has(category.id)}
          onToggle={() => toggleCategory(category.id)}
        />
      ))}
    </div>
  );
}

// ── SavedViews page ──────────────────────────────────────────────────────────

/**
 * The Saved Views tab. Shows user-defined filter views of the blueprint list.
 * Each view's categories are expanded by default and can be collapsed
 * individually, unlike the Blueprints tab's single-open-category behaviour.
 */
export function SavedViews() {
  return (
    <div className="space-y-4 py-2">
      {PLACEHOLDER_VIEWS.map((view) => (
        <SavedViewSection key={view.id} view={view} />
      ))}
    </div>
  );
}
