"use server";

import { getCurrentUserId } from "@/lib/auth";
import { listProfileOptions } from "@/lib/queries/profiles";

export async function listProfileOptionsAction() {
  return listProfileOptions();
}

export async function getCurrentUserIdAction() {
  return getCurrentUserId();
}
