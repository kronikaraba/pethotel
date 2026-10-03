import type { ReactNode } from "react";

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-3xl leading-tight font-bold sm:text-4xl">{title}</h1>
        {description && <div className="mt-1.5 text-stone">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-panel border border-dashed border-line-strong bg-surface px-6 py-8">
      <p className="text-lg font-semibold">{title}</p>
      {children && <div className="mt-1 max-w-[60ch] text-stone">{children}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
