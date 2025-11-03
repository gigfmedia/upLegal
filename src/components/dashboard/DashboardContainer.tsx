import { ReactNode } from 'react';

interface DashboardContainerProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function DashboardContainer({
  title,
  description,
  children,
  className = ''
}: DashboardContainerProps) {
  return (
    <div className="container mx-auto px-8 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      <div className={className}>
        {children}
      </div>
    </div>
  );
}
