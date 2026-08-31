"use client";

import { useState } from "react";
import { Building2 } from "lucide-react";

import { getCompanyLogoUrl } from "@/lib/company-logo";
import { cn } from "@/lib/utils";

/** Company avatar — the real logo (via Clearbit's public logo API, derived
 * from the website domain) when available, falling back to a generic
 * building icon otherwise or if the image 404s. */
export function CompanyLogo({
  website,
  className,
  iconClassName,
}: {
  website?: string | null;
  className?: string;
  iconClassName?: string;
}) {
  const logoUrl = getCompanyLogoUrl(website);
  const [errored, setErrored] = useState(false);

  if (!logoUrl || errored) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-md bg-muted",
          className
        )}
      >
        <Building2 className={cn("text-muted-foreground", iconClassName)} />
      </div>
    );
  }

  // Clearbit's logo domain isn't configured in next/image's remotePatterns,
  // and this is a best-effort decorative logo with a graceful <img> fallback.
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={logoUrl}
      alt=""
      className={cn("shrink-0 rounded-md border bg-white object-contain p-0.5", className)}
      onError={() => setErrored(true)}
    />
  );
}
