import { sql } from "@/lib/db";
import InspectionDashboard from "@/components/inspection-dashboard";

export const dynamic = "force-dynamic";

export default async function NewInspectionPage() {
  const vessels = await sql`
    SELECT id, name, imo_number, vessel_type FROM vessels ORDER BY name
  `;
  return (
    <div>
      <div style={{ background:"#F4F2EE", borderBottom:"1px solid #E5E7EB", padding:"12px 24px", fontSize:14, color:"#6B7280" }}>
        <a href="/" style={{ color:"#1BA5C0", textDecoration:"none" }}>Dashboard</a>
        {" / New Inspection"}
      </div>
      <InspectionDashboard vessels={vessels as any} />
    </div>
  );
}
