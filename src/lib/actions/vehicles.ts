"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { TireType } from "@/generated/prisma/enums";
import { getPrisma } from "@/lib/prisma";

const vehicleSchema = z.object({
  label: z.string().trim().min(1, "Le nom est requis."),
  registrationPlate: z.string().trim().nullable().optional(),
  tireType: z.enum(TireType),
  tireDimension: z.string().trim().min(1, "La dimension de pneu est requise."),
  tireQuantity: z.number().int().min(0).nullable().optional(),
  currentBrand: z.string().trim().nullable().optional(),
  preferredBrand: z.string().trim().nullable().optional(),
  renewalFrequencyMonths: z.number().int().min(0).nullable().optional(),
  companyId: z.string().min(1, "Entreprise requise."),
});

export type VehicleFormInput = z.infer<typeof vehicleSchema>;

export async function createVehicleAction(input: VehicleFormInput) {
  const parsed = vehicleSchema.parse(input);
  const prisma = getPrisma();

  const vehicle = await prisma.vehicle.create({
    data: {
      label: parsed.label,
      registrationPlate: parsed.registrationPlate || null,
      tireType: parsed.tireType,
      tireDimension: parsed.tireDimension,
      tireQuantity: parsed.tireQuantity ?? null,
      currentBrand: parsed.currentBrand || null,
      preferredBrand: parsed.preferredBrand || null,
      renewalFrequencyMonths: parsed.renewalFrequencyMonths ?? null,
      companyId: parsed.companyId,
    },
  });

  revalidatePath("/companies");
  revalidatePath("/vehicles");
  return vehicle.id;
}

export async function updateVehicleAction(id: string, input: VehicleFormInput) {
  const parsed = vehicleSchema.parse(input);
  const prisma = getPrisma();

  await prisma.vehicle.update({
    where: { id },
    data: {
      label: parsed.label,
      registrationPlate: parsed.registrationPlate || null,
      tireType: parsed.tireType,
      tireDimension: parsed.tireDimension,
      tireQuantity: parsed.tireQuantity ?? null,
      currentBrand: parsed.currentBrand || null,
      preferredBrand: parsed.preferredBrand || null,
      renewalFrequencyMonths: parsed.renewalFrequencyMonths ?? null,
      companyId: parsed.companyId,
    },
  });

  revalidatePath("/companies");
  revalidatePath("/vehicles");
  return id;
}

export async function deleteVehiclesAction(ids: string[]) {
  const prisma = getPrisma();
  const result = await prisma.vehicle.deleteMany({ where: { id: { in: ids } } });

  revalidatePath("/vehicles");
  revalidatePath("/companies");
  return result.count;
}
