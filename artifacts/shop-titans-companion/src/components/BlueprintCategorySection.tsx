import React from 'react';
import { BlueprintCategory } from '../types/blueprints';
import { BlueprintRow } from './BlueprintRow';
import { ChevronRight } from 'lucide-react';

interface BlueprintCategorySectionProps {
  category: BlueprintCategory;
  /** Whether this category is currently expanded (controlled by parent group). */
  isOpen: boolean;
  /** Called when the user taps the category header. */
  onToggle: () => void;
}

/**
 * A single category row within a group (e.g. Swords inside Weapons).
 *
 * Open/closed state is fully controlled by the parent (BlueprintGroupSection),
 * which ensures only one category is open at a time within the group.
 */
export function BlueprintCategorySection({ category, isOpen, onToggle }: BlueprintCategorySectionProps) {
  return (
    <div className="border-b border-border last:border-b-0">
      {/* Category header row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 pl-10 pr-4 py-3 hover:bg-muted/40 transition-colors focus:outline-none"
        data-testid={`category-header-${category.id}`}
      >
        {/* Category name */}
        <span className="flex-1 text-left text-sm text-foreground">
          {category.name}
        </span>

        {/* Blueprint count badge */}
        <span className="text-xs text-muted-foreground tabular-nums">
          {category.blueprints.length}
        </span>

        {/* Disclosure chevron — rotates 90° when open */}
        <ChevronRight
          className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
        />
      </button>

      {/* Expandable blueprint list */}
      <div
        className={`grid transition-all duration-200 ease-in-out ${
          isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          {category.blueprints.map((blueprint) => (
            <BlueprintRow key={blueprint.id} blueprint={blueprint} />
          ))}
        </div>
      </div>
    </div>
  );
}
