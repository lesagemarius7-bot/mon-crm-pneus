import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const rawConnectionString = process.env.POSTGRES_URL_NON_POOLING;
if (!rawConnectionString) {
  throw new Error("POSTGRES_URL_NON_POOLING is not set (needed to seed).");
}
// Strip query params (sslmode=require, etc.) — when present, pg's own
// connection-string parsing wins over the explicit `ssl` option below and
// re-triggers full chain verification against Supabase's pooler cert.
const connectionString = rawConnectionString.split("?")[0];

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString,
    ssl: { rejectUnauthorized: false },
  }),
});

const STAGES = [
  { name: "Prospection", order: 1 },
  { name: "Diagnostic / Relevé de parc", order: 2 },
  { name: "Devis envoyé", order: 3 },
  { name: "Négociation", order: 4 },
  { name: "Gagné", order: 5, isWon: true },
  { name: "Perdu", order: 6, isLost: true },
];

const COMPANIES: Array<{
  name: string;
  siret: string;
  type: "TRANSPORTEUR" | "BTP" | "AGRICOLE" | "MANUTENTION" | "GARAGE";
  status: "PROSPECT" | "CLIENT_ACTIF" | "CLIENT_INACTIF" | "PERDU";
  fleetSize: number;
  estimatedRevenue: number;
  city: string;
  postalCode: string;
  phone: string;
  contacts: Array<{
    firstName: string;
    lastName: string;
    role: "CHEF_DE_PARC" | "ACHETEUR" | "GERANT" | "DIRECTEUR";
    email: string;
    phone: string;
  }>;
  vehicles: Array<{
    label: string;
    tireType: "GENIE_CIVIL" | "POIDS_LOURDS" | "MANUTENTION" | "AGRICOLE";
    tireDimension: string;
    tireQuantity: number;
    currentBrand: string;
    preferredBrand?: string;
  }>;
}> = [
  {
    name: "Transports Lefèvre & Fils",
    siret: "41234567800012",
    type: "TRANSPORTEUR",
    status: "CLIENT_ACTIF",
    fleetSize: 34,
    estimatedRevenue: 185000,
    city: "Lille",
    postalCode: "59000",
    phone: "03 20 12 34 56",
    contacts: [
      {
        firstName: "Marc",
        lastName: "Lefèvre",
        role: "GERANT",
        email: "marc.lefevre@transports-lefevre.fr",
        phone: "06 12 34 56 78",
      },
      {
        firstName: "Sophie",
        lastName: "Dubois",
        role: "CHEF_DE_PARC",
        email: "sophie.dubois@transports-lefevre.fr",
        phone: "06 23 45 67 89",
      },
    ],
    vehicles: [
      {
        label: "Tracteur routier Volvo FH #12",
        tireType: "POIDS_LOURDS",
        tireDimension: "315/80 R22.5",
        tireQuantity: 10,
        currentBrand: "Michelin",
        preferredBrand: "Michelin",
      },
      {
        label: "Semi-remorque #04",
        tireType: "POIDS_LOURDS",
        tireDimension: "385/65 R22.5",
        tireQuantity: 6,
        currentBrand: "Continental",
      },
    ],
  },
  {
    name: "BTP Rhône Construction",
    siret: "50987654300021",
    type: "BTP",
    status: "CLIENT_ACTIF",
    fleetSize: 18,
    estimatedRevenue: 96000,
    city: "Lyon",
    postalCode: "69003",
    phone: "04 72 11 22 33",
    contacts: [
      {
        firstName: "Julien",
        lastName: "Moreau",
        role: "ACHETEUR",
        email: "j.moreau@btp-rhone.fr",
        phone: "06 34 56 78 90",
      },
    ],
    vehicles: [
      {
        label: "Chargeuse Caterpillar 930",
        tireType: "GENIE_CIVIL",
        tireDimension: "20.5R25",
        tireQuantity: 4,
        currentBrand: "Bridgestone",
      },
      {
        label: "Tombereau articulé Volvo A25",
        tireType: "GENIE_CIVIL",
        tireDimension: "29.5R25",
        tireQuantity: 6,
        currentBrand: "Michelin",
        preferredBrand: "Michelin",
      },
    ],
  },
  {
    name: "EARL des Trois Vallées",
    siret: "39876512300019",
    type: "AGRICOLE",
    status: "PROSPECT",
    fleetSize: 6,
    estimatedRevenue: 22000,
    city: "Auch",
    postalCode: "32000",
    phone: "05 62 45 67 89",
    contacts: [
      {
        firstName: "Pierre",
        lastName: "Fontaine",
        role: "GERANT",
        email: "p.fontaine@earl3vallees.fr",
        phone: "06 45 67 89 01",
      },
    ],
    vehicles: [
      {
        label: "Tracteur John Deere 6155R",
        tireType: "AGRICOLE",
        tireDimension: "600/65R38",
        tireQuantity: 4,
        currentBrand: "Firestone",
      },
    ],
  },
  {
    name: "Manutention Nord Logistique",
    siret: "44412398700027",
    type: "MANUTENTION",
    status: "CLIENT_ACTIF",
    fleetSize: 12,
    estimatedRevenue: 54000,
    city: "Roubaix",
    postalCode: "59100",
    phone: "03 20 98 76 54",
    contacts: [
      {
        firstName: "Nadia",
        lastName: "Benali",
        role: "CHEF_DE_PARC",
        email: "n.benali@mnl-logistique.fr",
        phone: "06 56 78 90 12",
      },
      {
        firstName: "Thomas",
        lastName: "Girard",
        role: "DIRECTEUR",
        email: "t.girard@mnl-logistique.fr",
        phone: "06 67 89 01 23",
      },
    ],
    vehicles: [
      {
        label: "Chariot élévateur Toyota #3",
        tireType: "MANUTENTION",
        tireDimension: "28x9-15",
        tireQuantity: 4,
        currentBrand: "Continental",
      },
    ],
  },
  {
    name: "Garage Central Poids Lourds",
    siret: "38765432100015",
    type: "GARAGE",
    status: "CLIENT_INACTIF",
    fleetSize: 3,
    estimatedRevenue: 8000,
    city: "Toulouse",
    postalCode: "31000",
    phone: "05 61 23 45 67",
    contacts: [
      {
        firstName: "Alain",
        lastName: "Petit",
        role: "GERANT",
        email: "a.petit@garage-central.fr",
        phone: "06 78 90 12 34",
      },
    ],
    vehicles: [],
  },
  {
    name: "Carrières du Sud-Ouest",
    siret: "45678912300033",
    type: "BTP",
    status: "PERDU",
    fleetSize: 9,
    estimatedRevenue: 41000,
    city: "Pau",
    postalCode: "64000",
    phone: "05 59 12 34 56",
    contacts: [
      {
        firstName: "Isabelle",
        lastName: "Roux",
        role: "ACHETEUR",
        email: "i.roux@carrieres-so.fr",
        phone: "06 89 01 23 45",
      },
    ],
    vehicles: [
      {
        label: "Dumper rigide Komatsu HD325",
        tireType: "GENIE_CIVIL",
        tireDimension: "24.00R35",
        tireQuantity: 6,
        currentBrand: "Bridgestone",
      },
    ],
  },
];

async function main() {
  for (const stage of STAGES) {
    await prisma.pipelineStage.upsert({
      where: { name: stage.name },
      update: { order: stage.order, isWon: !!stage.isWon, isLost: !!stage.isLost },
      create: {
        name: stage.name,
        order: stage.order,
        isWon: !!stage.isWon,
        isLost: !!stage.isLost,
      },
    });
  }
  console.log(`Seeded ${STAGES.length} pipeline stages.`);

  const prospectionStage = await prisma.pipelineStage.findUniqueOrThrow({
    where: { name: "Prospection" },
  });
  const devisStage = await prisma.pipelineStage.findUniqueOrThrow({
    where: { name: "Devis envoyé" },
  });

  for (const company of COMPANIES) {
    const record = await prisma.company.upsert({
      where: { siret: company.siret },
      update: {},
      create: {
        name: company.name,
        siret: company.siret,
        type: company.type,
        status: company.status,
        fleetSize: company.fleetSize,
        estimatedRevenue: company.estimatedRevenue,
        city: company.city,
        postalCode: company.postalCode,
        country: "France",
        phone: company.phone,
        contacts: { create: company.contacts },
        vehicles: { create: company.vehicles },
      },
    });

    if (company.status === "CLIENT_ACTIF" || company.status === "PROSPECT") {
      await prisma.deal.create({
        data: {
          name: `Renouvellement flotte — ${company.name}`,
          companyId: record.id,
          stageId:
            company.status === "PROSPECT" ? prospectionStage.id : devisStage.id,
          value: company.estimatedRevenue * 0.3,
          proposedBrand: "Michelin",
          expectedCloseDate: new Date("2026-10-15"),
        },
      });
    }
  }
  console.log(`Seeded ${COMPANIES.length} companies with contacts, vehicles and deals.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
