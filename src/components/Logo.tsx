import { cn } from "@/lib/utils";

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="grid size-9 place-items-center rounded-2xl gradient-warm text-base shadow-soft">
        🎂
      </span>
      {!compact && (
        <span className="font-display text-lg font-semibold tracking-tight">Birthday Twin</span>
      )}
    </div>
  );
}
