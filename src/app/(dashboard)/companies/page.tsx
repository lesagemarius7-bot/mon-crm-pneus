import { getCurrentUserId } from "@/lib/auth";
import { listCompanies } from "@/lib/queries/companies";
import { listProfileOptions } from "@/lib/queries/profiles";
import { CompaniesTable } from "@/components/companies/companies-table";
import { CompanyFormDialog } from "@/components/companies/company-form-dialog";

export default async function CompaniesPage({
  searchParams,
}: PageProps<"/companies">) {
  const [companies, profiles, currentUserId] = await Promise.all([
    listCompanies(),
    listProfileOptions(),
    getCurrentUserId(),
  ]);
  const { id } = await searchParams;
  const initialSelectedId = typeof id === "string" ? id : null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
        <div>
          <h1 className="font-semibold">Entreprises</h1>
          <p className="text-sm text-muted-foreground">
            {companies.length} compte{companies.length > 1 ? "s" : ""}
          </p>
        </div>
        <CompanyFormDialog mode="create" />
      </div>
      <div className="min-h-0 flex-1">
        <CompaniesTable
          data={companies}
          initialSelectedId={initialSelectedId}
          profiles={profiles}
          currentUserId={currentUserId}
        />
      </div>
    </div>
  );
}
