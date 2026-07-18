import { sql } from "@/lib/db";
import ReportsList from "@/components/reports-list";
export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const inspections = await sql`
    SELECT i.id, v.name AS vessel_name, v.vessel_type, v.imo_number,
           i.inspection_type, i.status, i.inspector_name,
           i.started_at, i.overall_grade, i.created_at,
           COUNT(DISTINCT ii.id)::int AS total_items,
           COUNT(DISTINCT CASE WHEN ii.grade_value IN ('POOR','ACTION_REQUIRED') THEN ii.id END)::int AS deficiencies
    FROM inspections i
    LEFT JOIN vessels v ON v.id = i.vessel_id
    LEFT JOIN inspection_items ii ON ii.inspection_id = i.id
    GROUP BY i.id, v.name, v.vessel_type, v.imo_number
    ORDER BY i.created_at DESC
  `;
  return <ReportsList inspections={inspections as any[]} />;
}
