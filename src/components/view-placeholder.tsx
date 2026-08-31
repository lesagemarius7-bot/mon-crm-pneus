import type { LucideIcon } from "lucide-react";

export function ViewPlaceholder({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl border bg-muted/40">
        <Icon className="size-5 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h2 className="font-medium">{title}</h2>
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
