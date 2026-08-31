"use server";

import { listProfileOptions } from "@/lib/queries/profiles";

export async function listProfileOptionsAction() {
  return listProfileOptions();
}
