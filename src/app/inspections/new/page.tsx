import { sql } from "@/lib/db";
import InspectionDashboard from "@/components/inspection-dashboard";
import { canEditNow } from "@/lib/authz";

export const dynamic = "force-dynamic";

export default async function NewInspectionPage() {
  if (!(await canEditNow())) {
    return (
      <div style={{ padding: "2rem", maxWidth: 640 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>Read-only access</h1>
        <p style={{ color: "#6B7280", marginTop: 8 }}>Your role can view inspections but not create them.</p>
      </div>
    );
  }
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
