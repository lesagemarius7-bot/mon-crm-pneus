/** Builds the "fiche" URL a note/activity/mention notification should link
 * back to — used both when creating notifications and could be reused
 * anywhere else that needs to resolve a company/deal record to its page. */
export function timelineEntityLink(params: {
  companyId?: string | null;
  dealId?: string | null;
}): string {
  if (params.dealId) return `/deals?deal=${params.dealId}`;
  if (params.companyId) return `/companies?id=${params.companyId}`;
  return "/dashboard";
}
