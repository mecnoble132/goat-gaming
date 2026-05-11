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

const queryClient = new QueryClient();

export default function App() {
  // Simple dark mode force for now as per cafe requirement
  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const [page, setPage] = useState<'billing' | 'bookings' | 'settings'>('billing');
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

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background text-foreground font-sans antialiased">
        {authLoading ? (
          <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Checking session...</div>
        ) : !session ? (
          <AuthPage />
        ) : page === 'billing' ? (
          <BillingPage onNavigate={(next) => setPage(next)} onLogout={handleLogout} />
        ) : page === 'bookings' ? (
          <BookingsPage onNavigateToBilling={() => setPage('billing')} onNavigateToSettings={() => setPage('settings')} onLogout={handleLogout} />
        ) : (
          <SettingsPage onNavigate={(next) => setPage(next)} onLogout={handleLogout} />
        )}
        <Toaster position="bottom-right" />
      </div>
    </QueryClientProvider>
  );
}
