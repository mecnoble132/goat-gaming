import { FormEvent, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) throw signInError;
      setMessage('Signed in.');
    } catch (err: any) {
      let errorMsg = err?.message ?? 'Authentication failed.';
      
      // Check if it's likely a missing env var issue
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        errorMsg = 'Supabase environment variables are missing. Please check your Vercel configuration.';
      } else if (errorMsg.toLowerCase().includes('api key')) {
        errorMsg = 'Invalid Supabase API key. Please verify VITE_SUPABASE_ANON_KEY in Vercel.';
      }
      
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-xl border border-border/60 bg-background/60 p-6">
        <h1 className="text-2xl font-bold">Goat Gaming Login</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sign in with email and password.</p>

        <form className="mt-6 space-y-3" onSubmit={onSubmit}>
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="current-password"
          />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Please wait...' : 'Sign in'}
          </Button>
        </form>

        {error ? <div className="mt-3 text-sm text-red-400">{error}</div> : null}
        {message ? <div className="mt-3 text-sm text-emerald-400">{message}</div> : null}
        <div className="mt-4 text-xs text-muted-foreground">
          Accounts are invite-only. Ask an admin to create your account in Supabase Auth.
        </div>
      </div>
    </div>
  );
}
