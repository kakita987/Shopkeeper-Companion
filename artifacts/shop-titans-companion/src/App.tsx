import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { ThemeProvider } from 'next-themes';
import { BlueprintBrowser } from './components/BlueprintBrowser';
import { AppLayout } from './components/AppLayout';
import { Settings } from './pages/Settings';
import { SavedViews } from './pages/SavedViews';

const queryClient = new QueryClient();

/**
 * Wraps the main tabbed screens in AppLayout (shared header + tab bar).
 * Settings is excluded because it has its own back-button header.
 */
function AppWithLayout() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/"            component={BlueprintBrowser} />
        <Route path="/saved-views" component={SavedViews}       />
        <Route                     component={NotFound}         />
      </Switch>
    </AppLayout>
  );
}

function Router() {
  return (
    // Settings is matched first so it renders without the tab layout.
    // The catch-all route below handles / and /saved-views via AppLayout.
    <Switch>
      <Route path="/settings" component={Settings}       />
      <Route                  component={AppWithLayout}  />
    </Switch>
  );
}

function App() {
  return (
    // defaultTheme="system" follows the device's light/dark preference.
    // enableSystem lets next-themes read prefers-color-scheme.
    // The user can override this in Settings.
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
