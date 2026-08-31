import type { CompanyRow } from "@/lib/queries/companies";
import { COMPANY_STATUS_LABELS, COMPANY_TYPE_LABELS, formatDate } from "@/lib/labels";

export const COMPANY_EXPORT_COLUMNS = [
  { key: "name", label: "Nom" },
  { key: "siret", label: "SIRET" },
  { key: "type", label: "Type" },
  { key: "status", label: "Statut" },
  { key: "fleetSize", label: "Taille de flotte" },
  { key: "estimatedRevenue", label: "CA estimé" },
  { key: "city", label: "Ville" },
  { key: "phone", label: "Téléphone" },
  { key: "updatedAt", label: "Mis à jour" },
] as const satisfies { key: string; label: string }[];

export function toCompanyCsvRow(company: CompanyRow) {
  return {
    name: company.name,
    siret: company.siret ?? "",
    type: COMPANY_TYPE_LABELS[company.type],
    status: COMPANY_STATUS_LABELS[company.status],
    fleetSize: company.fleetSize ?? "",
    estimatedRevenue: company.estimatedRevenue ?? "",
    city: company.city ?? "",
    phone: company.phone ?? "",
    updatedAt: formatDate(company.updatedAt),
  };
}
