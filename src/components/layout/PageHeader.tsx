import { ReactNode } from 'react';
import { Logo } from './Logo';

interface PageHeaderProps {
  title: string;
  actions?: ReactNode;
}

export function PageHeader({ title, actions }: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border/50 bg-background/80 backdrop-blur-xl px-4 md:px-6">
      <div className="flex items-center gap-4">
        <Logo size="sm" iconOnly className="md:hidden" />
        <h2 className="text-lg md:text-xl font-bold tracking-tight text-foreground">{title}</h2>
      </div>
      <div className="flex items-center gap-3">
        {actions}
      </div>
    </header>
  );
}
