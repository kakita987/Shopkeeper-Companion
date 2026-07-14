import React, { useState, useEffect } from 'react';
import { BlueprintGroup } from '../types/blueprints';
import { BlueprintCategorySection } from './BlueprintCategorySection';
import { ChevronRight, Sword, Shield, Gem, Sparkles } from 'lucide-react';

interface BlueprintGroupSectionProps {
  group: BlueprintGroup;
  /** Whether this group is currently expanded (controlled by parent). */
  isOpen: boolean;
  /** Called when the user taps the group header. */
  onToggle: () => void;
}

// Maps the icon name stored in data to the actual lucide-react component.
// Add new entries here whenever a new group icon is introduced in blueprints.ts.
const IconMap: Record<string, React.ElementType> = {
  Sword,
  Shield,
  Gem,
  Sparkles,
};

/**
 * A top-level blueprint group (e.g. Weapons, Armor).
 *
 * - Open/closed state is controlled by the parent (BlueprintBrowser) so that
 *   only one group is ever expanded at a time.
 * - Internally tracks which category is open so that opening a new category
 *   collapses the previous one.
 * - Closing the group also resets the open category so it doesn't persist
 *   stale state when the group is re-opened.
 */
export function BlueprintGroupSection({ group, isOpen, onToggle }: BlueprintGroupSectionProps) {
  const IconComponent = IconMap[group.icon] || Sword;

  // Which category inside this group is currently expanded.
  const [openCategoryId, setOpenCategoryId] = useState<string | null>(null);

  // Reset the open category whenever this group is closed — whether the user
  // clicked this group's header or a different group was opened by the parent.
  useEffect(() => {
    if (!isOpen) setOpenCategoryId(null);
  }, [isOpen]);

  const handleCategoryToggle = (categoryId: string) => {
    setOpenCategoryId((prev) => (prev === categoryId ? null : categoryId));
  };

  const handleGroupToggle = () => {
    onToggle();
  };

  return (
    <div className="rounded-xl bg-card border border-border overflow-hidden">
      {/* Group header row */}
      <button
        onClick={handleGroupToggle}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/60 transition-colors focus:outline-none"
        data-testid={`group-header-${group.id}`}
      >
        {/* Group icon */}
        <IconComponent className="w-4 h-4 text-muted-foreground shrink-0" />

        {/* Group name */}
        <span className="flex-1 text-left text-sm font-semibold text-foreground">
          {group.name}
        </span>

        {/* Disclosure chevron — rotates 90° when open */}
        <ChevronRight
          className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
        />
      </button>

      {/* Expandable category list */}
      <div
        className={`grid transition-all duration-200 ease-in-out ${
          isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden border-t border-border">
          {group.categories.map((category) => (
            <BlueprintCategorySection
              key={category.id}
              category={category}
              isOpen={openCategoryId === category.id}
              onToggle={() => handleCategoryToggle(category.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
