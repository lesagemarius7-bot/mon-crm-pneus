"use server";

import { searchCompanyDirectory } from "@/lib/company-lookup";

export async function searchCompanyDirectoryAction(query: string) {
  return searchCompanyDirectory(query);
}
