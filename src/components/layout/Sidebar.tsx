import {
  CalendarCheck2,
  Gamepad2,
  Home,
  LogOut,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const navItems = [
  { icon: Home, label: 'Billing', active: true },
  { icon: CalendarCheck2, label: 'Bookings' },
  { icon: Settings, label: 'Settings' },
];

export function Sidebar({
  active = 'Billing',
  onNavigate,
  onLogout,
}: {
  active?: string;
  onNavigate?: (label: string) => void;
  onLogout?: () => void;
}) {
  return (
    <>
      <div className="sticky top-0 z-40 border-b border-border/50 bg-background/90 px-4 py-3 backdrop-blur-xl md:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[0_0_12px_rgba(var(--primary),0.25)]">
            <Gamepad2 size={18} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-tight leading-none">
              Goat <span className="text-primary">Gaming</span>
            </h1>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{active}</p>
          </div>
        </div>
      </div>

      <nav className="fixed left-0 top-0 hidden h-screen w-64 flex-col border-r border-border/50 bg-background/60 p-4 backdrop-blur-xl md:flex z-50">
        <div className="mb-8 flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-[0_0_15px_rgba(var(--primary),0.3)]">
            <Gamepad2 size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="flex items-center gap-1 text-2xl font-black tracking-tight uppercase text-foreground drop-shadow-sm">
              Goat <span className="text-primary drop-shadow-[0_0_8px_rgba(var(--primary),0.5)]">Gaming</span>
            </h1>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Station Manager</p>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-2">
          {navItems.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => onNavigate?.(item.label)}
              className={cn(
                'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold tracking-wide transition-all',
                item.label === active
                  ? 'bg-primary text-primary-foreground shadow-[0_0_15px_rgba(var(--primary),0.2)]'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              )}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </div>

        <div className="mt-auto">
          <Button
            className="w-full justify-start gap-3 rounded-xl border-border/50"
            variant="outline"
            onClick={onLogout}
            type="button"
          >
            <LogOut size={18} />
            Logout
          </Button>
        </div>
      </nav>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border/60 bg-background/95 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-xl md:hidden">
        <div className="grid grid-cols-3 gap-1">
          {navItems.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => onNavigate?.(item.label)}
              className={cn(
                'flex flex-col items-center justify-center gap-1 rounded-lg px-1 py-2 text-[11px] font-semibold',
                item.label === active ? 'bg-primary/15 text-primary' : 'text-muted-foreground'
              )}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}
