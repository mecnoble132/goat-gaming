import {
  CalendarCheck2,
  Users,
  Home,
  LogOut,
  Settings,
  Package,
  BarChart2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Logo } from './Logo';

const navItems = [
  { icon: Home, label: 'Billing' },
  { icon: CalendarCheck2, label: 'Bookings' },
  { icon: Users, label: 'Customers' },
  { icon: Package, label: 'Inventory' },
  { icon: BarChart2, label: 'Reports' },
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
      <nav className="fixed left-0 top-0 hidden h-screen w-64 flex-col border-r border-border/50 bg-background/60 p-4 backdrop-blur-xl md:flex z-50">
        <div className="mb-8 px-2">
          <Logo size="md" />
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
        <div className="grid grid-cols-6 gap-1">
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
