import type { ContactRow } from "@/lib/queries/contacts";
import { CONTACT_ROLE_LABELS, formatDate } from "@/lib/labels";

export const CONTACT_EXPORT_COLUMNS = [
  { key: "firstName", label: "Prénom" },
  { key: "lastName", label: "Nom" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Téléphone" },
  { key: "role", label: "Rôle" },
  { key: "company", label: "Entreprise" },
  { key: "createdAt", label: "Date d'ajout" },
] as const satisfies { key: string; label: string }[];

export function toContactCsvRow(contact: ContactRow) {
  return {
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email ?? "",
    phone: contact.phone ?? "",
    role: CONTACT_ROLE_LABELS[contact.role],
    company: contact.company?.name ?? "",
    createdAt: formatDate(contact.createdAt),
  };
}
