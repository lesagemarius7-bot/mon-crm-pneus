import "server-only";

import { getPrisma } from "@/lib/prisma";

/**
 * Global Flotte/Véhicules table data — every vehicle with just enough
 * company info for the "Entreprise liée" column and filter.
 */
export async function listVehicles() {
  const prisma = getPrisma();
  return prisma.vehicle.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      company: { select: { id: true, name: true } },
    },
  });
}

export type VehicleRow = Awaited<ReturnType<typeof listVehicles>>[number];
