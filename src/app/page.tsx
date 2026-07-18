import { sql } from "@/lib/db";
import DashboardOverview from "@/components/dashboard-overview";

export const dynamic = "force-dynamic";

export default async function Page() {
  const [vessels, inspections, openDef, thisMonth] = await Promise.all([
    sql`SELECT COUNT(*)::int AS count FROM vessels`,
    sql`SELECT COUNT(*)::int AS count FROM inspections`,
    sql`SELECT COUNT(*)::int AS count FROM inspection_items
        WHERE grade_value IN ('POOR','ACTION_REQUIRED')
          AND (deficiency_status IS NULL OR deficiency_status != 'CLOSED')`,
    sql`SELECT COUNT(*)::int AS count FROM inspections
        WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())`,
  ]);

  const stats = {
    vessels:          (vessels[0] as any).count,
    inspections:      (inspections[0] as any).count,
    openDeficiencies: (openDef[0] as any).count,
    thisMonth:        (thisMonth[0] as any).count,
  };

  const recentInspections = await sql`
    SELECT i.id, v.name AS vessel_name, v.vessel_type,
           i.inspection_type, i.status, i.inspector_name,
           i.started_at, i.overall_grade, i.created_at
    FROM inspections i
    JOIN vessels v ON v.id = i.vessel_id
    ORDER BY i.created_at DESC LIMIT 10
  `;

  const deficiencies = await sql`
    SELECT ii.id, ii.prompt, ii.section_code, ii.grade_value,
           ii.deficiency_status, ii.deficiency_action, ii.remarks,
           v.name AS vessel_name, v.vessel_type,
           i.started_at, i.inspection_type
    FROM inspection_items ii
    JOIN inspections i ON i.id = ii.inspection_id
    JOIN vessels v ON v.id = i.vessel_id
    WHERE ii.grade_value IN ('POOR','ACTION_REQUIRED')
    ORDER BY
      CASE ii.deficiency_status WHEN 'OPEN' THEN 0 WHEN 'IN_PROGRESS' THEN 1 ELSE 2 END,
      ii.created_at DESC
    LIMIT 100
  `;

  return (
    <DashboardOverview
      stats={stats}
      recentInspections={recentInspections as any[]}
      deficiencies={deficiencies as any[]}
    />
  );
}
