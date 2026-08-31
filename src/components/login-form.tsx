"use client";

import { useActionState } from "react";
import { Loader2, Mail } from "lucide-react";

import { signInWithMagicLinkAction, type SignInState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: SignInState = { status: "idle" };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(
    signInWithMagicLinkAction,
    initialState
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email professionnel</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="prenom.nom@entreprise.fr"
          required
          autoComplete="email"
          autoFocus
        />
      </div>

      {state.status === "error" && (
        <p className="text-sm text-destructive">{state.message}</p>
      )}
      {state.status === "sent" && (
        <p className="text-sm text-muted-foreground">{state.message}</p>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? (
          <Loader2 className="animate-spin" />
        ) : (
          <Mail />
        )}
        Recevoir un lien de connexion
      </Button>
    </form>
  );
}
