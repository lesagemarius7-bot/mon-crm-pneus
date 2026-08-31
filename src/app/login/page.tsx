import { Gauge } from "lucide-react";

import { DevLoginButton } from "@/components/dev-login-button";
import { LoginForm } from "@/components/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Shown in local dev automatically, and on any deployment that opts in
// with DEMO_MODE=true (e.g. a Vercel demo/preview environment) — lets
// devSignInAction's own gate stay the actual security backstop.
const showDevLogin =
  process.env.NODE_ENV === "development" || process.env.DEMO_MODE === "true";

export default function LoginPage() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Gauge className="size-5" />
          </div>
          <CardTitle className="text-xl">CRM Pneus Industriels</CardTitle>
          <CardDescription>
            Connectez-vous pour accéder à vos comptes, contacts et deals.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <LoginForm />
          {showDevLogin && <DevLoginButton />}
        </CardContent>
      </Card>
    </div>
  );
}
