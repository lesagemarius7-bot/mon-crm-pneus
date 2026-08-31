/** Derives a company logo image URL from its website domain via Clearbit's
 * public (keyless) logo endpoint — always computed on the fly from
 * `website` rather than stored, so it stays in sync automatically whenever
 * the website field changes. Returns null when there's no usable domain
 * (the caller should fall back to a generic icon). */
export function getCompanyLogoUrl(website: string | null | undefined): string | null {
  const trimmed = website?.trim();
  if (!trimmed) return null;

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const domain = new URL(withProtocol).hostname.replace(/^www\./, "");
    if (!domain || !domain.includes(".")) return null;
    return `https://logo.clearbit.com/${domain}`;
  } catch {
    return null;
  }
}
