import React, { useState, useRef, useCallback } from 'react';
import { blueprintData } from '../data/blueprints';
import { Blueprint } from '../types/blueprints';
import { BlueprintGroupSection } from './BlueprintGroupSection';
import { BlueprintDetailPanel, BlueprintSelection } from './BlueprintDetailPanel';

/**
 * The Blueprints tab content.
 *
 * Manages:
 *  - Which group is open (accordion — only one at a time).
 *  - Which blueprint is selected, and the detail panel that shows it.
 *  - Scrolling the active group's header into view when the panel opens,
 *    so the user always sees their context above the glass sheet.
 */
export function BlueprintBrowser() {
  // The id of the currently expanded group, or null if all are collapsed.
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);

  // The currently selected blueprint (drives the detail panel).
  const [selection, setSelection] = useState<BlueprintSelection | null>(null);

  // One DOM ref per group — keyed by GroupId — used to scroll into view.
  const groupRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const handleGroupToggle = (groupId: string) => {
    setOpenGroupId((prev) => (prev === groupId ? null : groupId));
  };

  const handleSelectBlueprint = useCallback(
    (blueprint: Blueprint, categoryName: string, groupId: string, groupName: string) => {
      setSelection({ blueprint, groupId, groupName, categoryName });

      // Give React one frame to start rendering the panel, then scroll the
      // group header to the top so the user sees their breadcrumb context
      // above the glass sheet.
      requestAnimationFrame(() => {
        groupRefs.current[groupId]?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      });
    },
    []
  );

  const handleClosePanel = useCallback(() => setSelection(null), []);

  return (
    <>
      {/* Blueprint group list */}
      <div className="space-y-2 py-2">
        {blueprintData.map((group) => (
          <BlueprintGroupSection
            key={group.id}
            ref={(el) => { groupRefs.current[group.id] = el; }}
            group={group}
            isOpen={openGroupId === group.id}
            onToggle={() => handleGroupToggle(group.id)}
            onSelectBlueprint={(bp, categoryName) =>
              handleSelectBlueprint(bp, categoryName, group.id, group.name)
            }
          />
        ))}
      </div>

      {/* Detail panel — always mounted so the exit animation plays smoothly */}
      <BlueprintDetailPanel selection={selection} onClose={handleClosePanel} />
    </>
  );
}
