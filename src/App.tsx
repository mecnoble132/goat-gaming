/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import BillingPage from './pages/BillingPage';
import { useEffect, useState } from 'react';
import BookingsPage from './pages/BookingsPage';
import AuthPage from './pages/AuthPage';
import { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import SettingsPage from './pages/SettingsPage';
import InventoryPage from './pages/InventoryPage';
import CustomersPage from './pages/CustomersPage';
import ReportsPage from './pages/ReportsPage';

const queryClient = new QueryClient();

type Page = 'billing' | 'bookings' | 'settings' | 'inventory' | 'customers' | 'reports';

export default function App() {
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const [page, setPage] = useState<Page>('billing');
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session ?? null);
      setAuthLoading(false);
    };
    load();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const nav = (next: Page) => setPage(next);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background text-foreground font-sans antialiased">
        {authLoading ? (
          <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Checking session...</div>
        ) : !session ? (
          <AuthPage />
        ) : page === 'billing' ? (
          <BillingPage onNavigate={nav} onLogout={handleLogout} />
        ) : page === 'bookings' ? (
          <BookingsPage onNavigate={nav} onLogout={handleLogout} />
        ) : page === 'inventory' ? (
          <InventoryPage onNavigate={nav} onLogout={handleLogout} />
        ) : page === 'customers' ? (
          <CustomersPage onNavigate={nav} onLogout={handleLogout} />
        ) : page === 'reports' ? (
          <ReportsPage onNavigate={nav} onLogout={handleLogout} />
        ) : (
          <SettingsPage onNavigate={nav} onLogout={handleLogout} />
        )}
        <Toaster position="bottom-right" />
      </div>
    </QueryClientProvider>
  );
}
