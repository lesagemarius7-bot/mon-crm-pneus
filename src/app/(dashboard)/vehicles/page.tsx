import { Plus } from "lucide-react";

import { listCompanyOptions } from "@/lib/queries/companies";
import { listVehicles } from "@/lib/queries/vehicles";
import { Button } from "@/components/ui/button";
import { VehicleFormDialog } from "@/components/vehicles/vehicle-form-dialog";
import { VehiclesTable } from "@/components/vehicles/vehicles-table";

export default async function VehiclesPage() {
  const [vehicles, companies] = await Promise.all([
    listVehicles(),
    listCompanyOptions(),
  ]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
        <div>
          <h1 className="font-semibold">Flottes &amp; équipements</h1>
          <p className="text-sm text-muted-foreground">
            {vehicles.length} véhicule{vehicles.length > 1 ? "s" : ""}
          </p>
        </div>
        <VehicleFormDialog
          mode="create"
          companies={companies}
          trigger={
            <Button size="sm">
              <Plus />
              Nouveau véhicule
            </Button>
          }
        />
      </div>
      <div className="min-h-0 flex-1">
        <VehiclesTable data={vehicles} companies={companies} />
      </div>
    </div>
  );
}
