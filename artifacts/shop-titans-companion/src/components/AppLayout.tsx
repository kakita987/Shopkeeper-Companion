import React from 'react';
import { Link, useLocation } from 'wouter';
import { Settings } from 'lucide-react';

// The two main tabs in the app.
const TABS = [
  { href: '/',            label: 'Blueprints'   },
  { href: '/saved-views', label: 'Saved Views'  },
];

interface AppLayoutProps {
  children: React.ReactNode;
}

/**
 * Shared shell rendered around every screen except Settings.
 *
 * Contains:
 *  - A sticky header with the app title and the settings gear icon.
 *  - A tab bar for switching between top-level sections.
 *  - A content area that renders the active page (children).
 */
export function AppLayout({ children }: AppLayoutProps) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">

      {/* ── Sticky header ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-xl mx-auto px-4">

          {/* App title + settings gear */}
          <div className="flex items-center justify-between pt-4 pb-2">
            <span className="font-semibold text-base tracking-tight text-foreground">
              Shopkeeper Companion
            </span>
            <Link href="/settings">
              <button
                className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                aria-label="Open settings"
                data-testid="settings-button"
              >
                <Settings className="w-4 h-4 text-muted-foreground" />
              </button>
            </Link>
          </div>

          {/* Tab bar — each tab takes an equal share of the full width */}
          <div className="flex">
            {TABS.map((tab) => {
              const isActive = location === tab.href;
              return (
                <Link key={tab.href} href={tab.href} className="flex-1">
                  <button
                    className={`w-full py-2.5 text-sm font-medium border-b-2 transition-colors focus:outline-none ${
                      isActive
                        ? 'border-foreground text-foreground'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                    data-testid={`tab-${tab.label.toLowerCase().replace(' ', '-')}`}
                  >
                    {tab.label}
                  </button>
                </Link>
              );
            })}
          </div>

        </div>
      </header>

      {/* ── Page content ──────────────────────────────────────────────── */}
      <div className="max-w-xl mx-auto px-4 py-4">
        {children}
      </div>

    </div>
  );
}
