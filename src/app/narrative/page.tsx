import { sql } from "@/lib/db";
import AiNarrative from "@/components/ai-narrative";

export const dynamic = "force-dynamic";

export default async function NarrativePage() {
  const inspections = await sql`
    SELECT i.id, v.name AS vessel_name, v.vessel_type, i.inspection_type,
           i.status, i.started_at, i.created_at, i.executive_summary,
           COUNT(ii.id)::int AS total_items
    FROM inspections i
    LEFT JOIN vessels v ON v.id = i.vessel_id
    LEFT JOIN inspection_items ii ON ii.inspection_id = i.id
    GROUP BY i.id, v.name, v.vessel_type, i.inspection_type, i.status,
             i.started_at, i.created_at, i.executive_summary
    ORDER BY i.created_at DESC
  `;
  return <AiNarrative inspections={inspections as any[]} />;
}
