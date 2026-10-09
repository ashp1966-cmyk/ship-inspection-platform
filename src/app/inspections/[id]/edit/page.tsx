import Link from "next/link";
import { sql } from "@/lib/db";
import { canEditNow } from "@/lib/authz";
import { buildInitialState } from "@/lib/inspection-state";
import InspectionDashboard from "@/components/inspection-dashboard";
import sparesSpec from "../../../../../db/random_spares_check_spec.json";

export const dynamic = "force-dynamic";

const notice = (title: string, body: string, id?: string) => (
  <div style={{ padding: "2rem", maxWidth: 640 }}>
    <h1 style={{ fontSize: 20, fontWeight: 600 }}>{title}</h1>
    <p style={{ color: "#6B7280", margin: "8px 0 16px" }}>{body}</p>
    {id && <Link href={`/inspections/${id}`} style={{ color: "#1BA5C0" }}>View the report →</Link>}
  </div>
);

// Reopen a saved IN_PROGRESS inspection into the same form it was created in. Saving goes back
// through PUT /api/inspections/[id].
export default async function EditInspectionPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return notice("Inspection not found", "That link is not valid.");
  if (!(await canEditNow())) return notice("Read-only access", "Your role can view inspections but not edit them.", id);

  const [insp] = (await sql`
    SELECT i.*, COALESCE(v.name, i.entered_vessel_name) AS vessel_name, v.vessel_type,
           COALESCE(v.imo_number, i.entered_imo_number) AS imo_number
    FROM inspections i LEFT JOIN vessels v ON v.id = i.vessel_id
    WHERE i.id = ${id} AND i.organization_id = app_org_id()
  `) as any[];
  if (!insp) return notice("Inspection not found", "It does not exist, or it belongs to another organization.");
  if (insp.status !== "IN_PROGRESS") return notice("This inspection is closed", `Its status is ${String(insp.status).replace("_", " ")}; only in-progress inspections can be continued.`, id);

  const items = (await sql`SELECT * FROM inspection_items WHERE inspection_id = ${id} ORDER BY sort_order, created_at`) as any[];
  const attachments = (await sql`SELECT * FROM attachments WHERE inspection_id = ${id} ORDER BY created_at`) as any[];
  const spares = (await sql`SELECT * FROM random_spares_check_items WHERE inspection_id = ${id} ORDER BY sr_no`) as any[];
  const vessels = await sql`SELECT id, name, imo_number, vessel_type FROM vessels ORDER BY name`;

  const spec = sparesSpec as { columns: { key: string; editable: boolean }[]; initialBlankRows: number };
  const initial = buildInitialState({
    inspection: insp, items, attachments, spares,
    sparesColumns: spec.columns.filter((c) => c.editable).map((c) => c.key),
    blankSparesRows: spec.initialBlankRows,
  });

  return (
    <div>
      <div style={{ background: "#F4F2EE", borderBottom: "1px solid #E5E7EB", padding: "12px 24px", fontSize: 14, color: "#6B7280" }}>
        <a href="/" style={{ color: "#1BA5C0", textDecoration: "none" }}>Dashboard</a>
        {" / Continue Inspection"}
      </div>
      <InspectionDashboard vessels={vessels as any} initial={initial} />
    </div>
  );
}
