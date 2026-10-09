import { sql } from "@/lib/db";
import InspectionDashboard from "@/components/inspection-dashboard";
import { canEditNow } from "@/lib/authz";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ?vessel=<id> (the Vessels page's "Inspect" button) prefills name, IMO and type. The vessel must be
// in the caller's own organization (a platform admin can *see* other orgs' vessels, so RLS alone is
// not enough); anything else is silently ignored and the form opens blank.
export default async function NewInspectionPage(props: { searchParams: Promise<{ vessel?: string | string[] }> }) {
  if (!(await canEditNow())) {
    return (
      <div style={{ padding: "2rem", maxWidth: 640 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>Read-only access</h1>
        <p style={{ color: "#6B7280", marginTop: 8 }}>Your role can view inspections but not create them.</p>
      </div>
    );
  }
  const { vessel } = await props.searchParams;
  const vesselParam = typeof vessel === "string" && UUID_RE.test(vessel) ? vessel : null;
  const [prefill] = vesselParam
    ? ((await sql`SELECT id, name, imo_number, vessel_type FROM vessels WHERE id = ${vesselParam} AND organization_id = app_org_id()`) as any[])
    : [];
  const vessels = await sql`
    SELECT id, name, imo_number, vessel_type FROM vessels ORDER BY name
  `;
  return (
    <div>
      <div style={{ background:"#F4F2EE", borderBottom:"1px solid #E5E7EB", padding:"12px 24px", fontSize:14, color:"#6B7280" }}>
        <a href="/" style={{ color:"#1BA5C0", textDecoration:"none" }}>Dashboard</a>
        {" / New Inspection"}
      </div>
      <InspectionDashboard vessels={vessels as any} prefillVessel={prefill} />
    </div>
  );
}
