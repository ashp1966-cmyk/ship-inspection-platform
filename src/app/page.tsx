// Server Component: fetches vessels on the server, streams to the client
// dashboard. No client JS is shipped for the data fetch itself.
import InspectionDashboard from "@/components/inspection-dashboard";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Page() {
  const vessels = await sql`
    SELECT id, name, imo_number, vessel_type
    FROM vessels
    ORDER BY name
  `;
  return <InspectionDashboard vessels={vessels as any} />;
}
