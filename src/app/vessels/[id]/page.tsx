import { sql } from "@/lib/db";
import VesselHistory from "@/components/vessel-history";
export const dynamic = "force-dynamic";

export default async function VesselHistoryPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const [vessel] = await sql`SELECT * FROM vessels WHERE id=${id}` as any[];
  if (!vessel) return <div style={{padding:"2rem"}}>Vessel not found.</div>;

  const inspections = await sql`
    SELECT i.id, i.inspection_type, i.status, i.started_at, i.overall_score,
           i.overall_grade, i.inspector_name, i.port, i.created_at,
           COUNT(DISTINCT ii.id)::int AS total_items,
           COUNT(DISTINCT CASE WHEN ii.grade_value IN ('POOR','ACTION_REQUIRED') THEN ii.id END)::int AS deficiencies
    FROM inspections i
    LEFT JOIN inspection_items ii ON ii.inspection_id=i.id
    WHERE i.vessel_id=${id}
    GROUP BY i.id ORDER BY i.created_at DESC
  ` as any[];

  return <VesselHistory vessel={vessel as any} inspections={inspections as any[]} />;
}
