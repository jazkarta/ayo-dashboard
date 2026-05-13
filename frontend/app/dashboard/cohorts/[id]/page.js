import { Header } from "@/components/layout/header";
import CohortDetail from "@/components/dashboard/cohort-detail";

export const metadata = {
  title: "Ayo Dashboard | Cohort Details",
};

export default async function CohortDetailPage({ params }) {
  const { id } = await params;
  return (
    <>
      <Header title="Cohort Details" />
      <main className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="m-5 flex flex-col gap-4">
          <CohortDetail id={id} />
        </div>
      </main>
    </>
  );
}
