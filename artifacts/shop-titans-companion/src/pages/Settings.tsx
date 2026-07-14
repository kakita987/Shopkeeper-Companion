import React from 'react';
import { useTheme } from 'next-themes';
import { Link } from 'wouter';
import { ChevronLeft, Monitor, Moon, Sun } from 'lucide-react';

// The three options we expose. "system" means "follow the device preference".
type ThemeOption = 'light' | 'dark' | 'system';

const THEME_OPTIONS: { value: ThemeOption; label: string; icon: React.ElementType }[] = [
  { value: 'system', label: 'System',  icon: Monitor },
  { value: 'light',  label: 'Light',   icon: Sun },
  { value: 'dark',   label: 'Dark',    icon: Moon },
];

/**
 * Settings screen.
 *
 * Currently only exposes the appearance (theme) setting.
 * The selected theme is persisted by next-themes in localStorage so it
 * survives page refreshes, while "System" removes any override and defers
 * to the device's prefers-color-scheme media query.
 */
export function Settings() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <main className="max-w-xl mx-auto px-4 py-10">

        {/* Header with back navigation */}
        <header className="flex items-center gap-3 mb-8">
          <Link href="/">
            <button
              className="p-1.5 -ml-1.5 rounded-lg hover:bg-muted transition-colors"
              aria-label="Back to blueprints"
              data-testid="settings-back-button"
            >
              <ChevronLeft className="w-5 h-5 text-muted-foreground" />
            </button>
          </Link>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            Settings
          </h1>
        </header>

        {/* Appearance section */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
            Appearance
          </p>

          <div className="rounded-xl bg-card border border-border overflow-hidden">
            {THEME_OPTIONS.map((option, index) => {
              const Icon = option.icon;
              const isSelected = theme === option.value;
              const isLast = index === THEME_OPTIONS.length - 1;

              return (
                <button
                  key={option.value}
                  onClick={() => setTheme(option.value)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/60 transition-colors focus:outline-none ${!isLast ? 'border-b border-border' : ''}`}
                  data-testid={`theme-option-${option.value}`}
                  aria-pressed={isSelected}
                >
                  <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className={`flex-1 text-left text-sm ${isSelected ? 'font-semibold text-foreground' : 'text-foreground'}`}>
                    {option.label}
                  </span>
                  {/* Checkmark for the active selection */}
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </section>

      </main>
    </div>
  );
}
