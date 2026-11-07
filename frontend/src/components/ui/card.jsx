// frontend/src/components/ui/card.jsx
// Dark-themed Card, CardHeader, CardTitle, CardContent — used as container for every chart.
import { cn } from '../../lib/utils';

export function Card({ className, children, ...props }) {
  return (
    <div
      className={cn(
        'rounded-xl bg-[#132240] border border-slate-700/30 flex flex-col overflow-hidden',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }) {
  return (
    <div className={cn('px-4 pt-4 pb-2', className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }) {
  return (
    <h3
      className={cn('text-xs font-semibold text-slate-400 uppercase tracking-widest', className)}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardContent({ className, children, ...props }) {
  return (
    <div className={cn('px-4 pb-4 flex-1 min-h-0', className)} {...props}>
      {children}
    </div>
  );
}
