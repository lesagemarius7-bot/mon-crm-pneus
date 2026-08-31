"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const emailSchema = z.email();

const DEV_USER_EMAIL = "dev@crm-pneus.local";

export type SignInState = {
  status: "idle" | "error" | "sent";
  message?: string;
};

/**
 * Sends a magic-link email via Supabase Auth. No passwords to manage for
 * an internal CRM tool — click the link, land on /auth/callback, get a
 * session.
 */
export async function signInWithMagicLinkAction(
  _prevState: SignInState,
  formData: FormData
): Promise<SignInState> {
  const email = emailSchema.safeParse(formData.get("email"));
  if (!email.success) {
    return { status: "error", message: "Adresse email invalide." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.data,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback`,
    },
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  return { status: "sent", message: `Lien de connexion envoyé à ${email.data}.` };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

/** Set DEMO_MODE=true (e.g. on a Vercel preview/demo deployment) to allow
 * devSignInAction to run outside local development — see below. */
function isDevSignInAllowed() {
  return process.env.NODE_ENV === "development" || process.env.DEMO_MODE === "true";
}

/**
 * Dev/demo instant sign-in: provisions (or reuses) a dedicated demo user via
 * the Supabase Admin API and establishes a REAL session server-side,
 * without sending or waiting on an email. proxy.ts is untouched — this
 * doesn't bypass auth, it just automates getting a genuine session.
 *
 * Double-gated: only rendered from the login page when isDevSignInAllowed()
 * is true (see DevLoginButton), and refuses to run here too, so it can
 * never fire against a plain production deployment even if the button were
 * somehow reached — it takes an explicit DEMO_MODE=true opt-in to unlock
 * outside local dev.
 */
export async function devSignInAction() {
  if (!isDevSignInAllowed()) {
    throw new Error("devSignInAction is only available in development or demo mode.");
  }

  const admin = createAdminClient();

  // generateLink() creates the user on first call (magiclink is one of the
  // types that auto-provisions) and just issues a link for it on every
  // call after — no separate createUser step, so nothing to "already
  // exists" around and no repeated creation attempts.
  const { data, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: DEV_USER_EMAIL,
    options: { data: { full_name: "Dev User" } },
  });

  if (linkError || !data.properties?.hashed_token) {
    throw new Error(linkError?.message ?? "Impossible de générer la session dev.");
  }

  const supabase = await createClient();
  const { error: verifyError } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: data.properties.hashed_token,
  });

  if (verifyError) {
    throw new Error(verifyError.message);
  }

  redirect("/");
}
