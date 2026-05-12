import { Gamepad2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function Logo({ className, iconOnly = false, size = 'md' }: LogoProps) {
  const iconSizes = {
    sm: 16,
    md: 20,
    lg: 28,
  };

  const containerSizes = {
    sm: 'h-8 w-8 rounded-lg',
    md: 'h-10 w-10 rounded-xl',
    lg: 'h-12 w-12 rounded-2xl',
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-xl',
    lg: 'text-3xl',
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className={cn(
        "flex items-center justify-center bg-primary text-primary-foreground shadow-lg shadow-primary/20",
        containerSizes[size]
      )}>
        <Gamepad2 size={iconSizes[size]} strokeWidth={2.5} />
      </div>
      {!iconOnly && (
        <div className="flex flex-col leading-none">
          <h1 className={cn("font-black uppercase tracking-tighter text-foreground italic", textSizes[size])}>
            Goat <span className="text-primary not-italic">Gaming</span>
          </h1>
          {size !== 'sm' && (
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground mt-0.5">
              Premium Station
            </p>
          )}
        </div>
      )}
    </div>
  );
}
