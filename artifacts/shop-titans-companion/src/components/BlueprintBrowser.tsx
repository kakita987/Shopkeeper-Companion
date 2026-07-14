import React, { useState } from 'react';
import { blueprintData } from '../data/blueprints';
import { BlueprintGroupSection } from './BlueprintGroupSection';
import { Settings } from 'lucide-react';
import { Link } from 'wouter';

/**
 * Main container for the Blueprint Browser.
 *
 * Manages which group is currently open. Only one group can be open at a time —
 * clicking a group header closes the previously open one (accordion behaviour).
 * This mirrors how SwiftUI's List with disclosure groups works by default.
 */
export function BlueprintBrowser() {
  // The id of the currently expanded group, or null if all are collapsed.
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);

  // Toggle a group open; close it if it's already the open one.
  const handleGroupToggle = (groupId: string) => {
    setOpenGroupId((prev) => (prev === groupId ? null : groupId));
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Settings gear — top-right corner */}
      <Link href="/settings">
        <button
          className="fixed top-4 right-4 p-2 rounded-full bg-card border border-border hover:bg-muted transition-colors z-10"
          data-testid="settings-button"
          aria-label="Open settings"
        >
          <Settings className="w-4 h-4 text-muted-foreground" />
        </button>
      </Link>

      <main className="max-w-xl mx-auto px-4 py-10">

        {/* Page title */}
        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            Blueprints
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Shopkeeper Companion
          </p>
        </header>

        {/* Blueprint groups — accordion: only one open at a time */}
        <div className="space-y-2">
          {blueprintData.map((group) => (
            <BlueprintGroupSection
              key={group.id}
              group={group}
              isOpen={openGroupId === group.id}
              onToggle={() => handleGroupToggle(group.id)}
            />
          ))}
        </div>

      </main>
    </div>
  );
}
