import type {
  ActivityType,
  AutomationActionType,
  AutomationTrigger,
  CompanyStatus,
  CompanyType,
  ContactListType,
  ContactRole,
  CustomFieldEntity,
  CustomFieldType,
  SequenceEnrollmentStatus,
  SequenceStepAction,
  TaskPriority,
  TaskStatus,
  TaskType,
  TireType,
} from "@/generated/prisma/enums";

export const COMPANY_TYPE_LABELS: Record<CompanyType, string> = {
  TRANSPORTEUR: "Transporteur",
  BTP: "BTP",
  AGRICOLE: "Agricole",
  MANUTENTION: "Manutention",
  GARAGE: "Garage",
  AUTRE: "Autre",
};

export const COMPANY_STATUS_LABELS: Record<CompanyStatus, string> = {
  PROSPECT: "Prospect",
  CLIENT_ACTIF: "Client actif",
  CLIENT_INACTIF: "Client inactif",
  PERDU: "Perdu",
};

export const COMPANY_STATUS_BADGE: Record<
  CompanyStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  PROSPECT: "outline",
  CLIENT_ACTIF: "default",
  CLIENT_INACTIF: "secondary",
  PERDU: "destructive",
};

export const CONTACT_ROLE_LABELS: Record<ContactRole, string> = {
  CHEF_DE_PARC: "Chef de parc",
  ACHETEUR: "Acheteur",
  GERANT: "Gérant",
  DIRECTEUR: "Directeur",
  MECANICIEN: "Mécanicien",
  AUTRE: "Autre",
};

export const TIRE_TYPE_LABELS: Record<TireType, string> = {
  GENIE_CIVIL: "Génie Civil",
  POIDS_LOURDS: "Poids Lourds",
  MANUTENTION: "Manutention",
  AGRICOLE: "Agricole",
};

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  APPEL: "Appel",
  EMAIL: "Email",
  RENDEZ_VOUS: "Rendez-vous",
  RELEVE_DE_PARC: "Relevé de parc",
  TACHE: "Tâche",
  AUTRE: "Autre",
};

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  APPEL: "Appel",
  RELANCE_EMAIL: "Relance Email",
  RENDEZ_VOUS: "RDV",
  DEMONSTRATION: "Démonstration/Diagnostic",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  A_FAIRE: "À faire",
  TERMINEE: "Terminée",
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  BASSE: "Basse",
  NORMALE: "Normale",
  HAUTE: "Haute",
};

export const CUSTOM_FIELD_ENTITY_LABELS: Record<CustomFieldEntity, string> = {
  COMPANY: "Entreprises",
  CONTACT: "Contacts",
  VEHICLE: "Flotte / Véhicules",
  DEAL: "Deals",
};

export const CUSTOM_FIELD_TYPE_LABELS: Record<CustomFieldType, string> = {
  TEXT: "Texte",
  NUMBER: "Nombre",
  SELECT: "Sélection",
  MULTI_SELECT: "Sélection multiple",
  DATE: "Date",
  BOOLEAN: "Oui/Non",
  URL: "URL",
  EMAIL: "Email",
  PHONE: "Téléphone",
  CURRENCY: "Devise",
};

export const SEQUENCE_STEP_ACTION_LABELS: Record<SequenceStepAction, string> = {
  SEND_EMAIL: "Envoyer un template",
  CREATE_TASK: "Créer une tâche",
};

export const SEQUENCE_ENROLLMENT_STATUS_LABELS: Record<SequenceEnrollmentStatus, string> = {
  ACTIVE: "Active",
  COMPLETED: "Terminée",
  CANCELLED: "Annulée",
};

export const SEQUENCE_ENROLLMENT_STATUS_BADGE: Record<
  SequenceEnrollmentStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  ACTIVE: "default",
  COMPLETED: "secondary",
  CANCELLED: "outline",
};

export const CONTACT_LIST_TYPE_LABELS: Record<ContactListType, string> = {
  STATIC: "Liste statique",
  DYNAMIC: "Liste dynamique (filtres)",
};

export const AUTOMATION_TRIGGER_LABELS: Record<AutomationTrigger, string> = {
  DEAL_WON: "Quand un deal passe en Gagné",
  DEAL_LOST: "Quand un deal passe en Perdu",
};

export const AUTOMATION_ACTION_TYPE_LABELS: Record<AutomationActionType, string> = {
  CREATE_TASK: "Créer une tâche",
  SEND_EMAIL_TEMPLATE: "Envoyer un template",
};

const currencyFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return currencyFormatter.format(value);
}

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  return dateFormatter.format(new Date(value));
}

const dateTimeFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return "—";
  return dateTimeFormatter.format(new Date(value));
}
