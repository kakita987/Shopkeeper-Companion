import React, { useState } from 'react';
import { blueprintData } from '../data/blueprints';
import { BlueprintGroupSection } from './BlueprintGroupSection';

/**
 * The Blueprints tab content.
 *
 * Manages which group is currently open. Only one group can be open at a
 * time — opening another collapses the previous one (accordion behaviour).
 *
 * The app title, tab bar, and settings icon live in AppLayout, not here.
 */
export function BlueprintBrowser() {
  // The id of the currently expanded group, or null if all are collapsed.
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);

  const handleGroupToggle = (groupId: string) => {
    // If the tapped group is already open, close it; otherwise open it.
    setOpenGroupId((prev) => (prev === groupId ? null : groupId));
  };

  return (
    <div className="space-y-2 py-2">
      {blueprintData.map((group) => (
        <BlueprintGroupSection
          key={group.id}
          group={group}
          isOpen={openGroupId === group.id}
          onToggle={() => handleGroupToggle(group.id)}
        />
      ))}
    </div>
  );
}
