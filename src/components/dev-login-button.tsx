import { FlaskConical } from "lucide-react";

import { devSignInAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

/**
 * Only ever rendered by the server component that imports it when local
 * dev or DEMO_MODE=true allows it — see `showDevLogin` in
 * src/app/login/page.tsx.
 */
export function DevLoginButton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">accès démo</span>
        <Separator className="flex-1" />
      </div>
      <form action={devSignInAction}>
        <Button
          type="submit"
          variant="outline"
          className="w-full border-dashed border-amber-500/50 text-amber-600 hover:bg-amber-500/10 hover:text-amber-600 dark:text-amber-400"
        >
          <FlaskConical />
          Accès démo / Contourner l&apos;email
        </Button>
      </form>
    </div>
  );
}
