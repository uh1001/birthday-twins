import type { ReactNode } from "react";

export function EmptyState({
  emoji = "🎂",
  title,
  description,
  action,
}: {
  emoji?: string | undefined;
  title: string;
  description: string;
  action?: ReactNode | undefined;
}) {
  return (
    <div className="panel flex flex-col items-center px-6 py-12 text-center">
      <div className="grid size-14 place-items-center rounded-2xl bg-accent text-2xl">{emoji}</div>
      <h3 className="mt-4 font-display text-base font-semibold">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
