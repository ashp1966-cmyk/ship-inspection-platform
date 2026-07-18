import { sql } from "@/lib/db";
import ReportDetail from "@/components/report-detail";
export const dynamic = "force-dynamic";

export default async function ReportPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const [inspection] = await sql`
    SELECT i.*, v.name AS vessel_name, v.vessel_type, v.imo_number,
           v.flag, v.class_society, v.dwt, v.gt,
           v.main_engine_make, v.main_engine_model
    FROM inspections i LEFT JOIN vessels v ON v.id=i.vessel_id
    WHERE i.id=${id}
  ` as any[];
  if (!inspection) return <div style={{padding:"2rem"}}>Report not found.</div>;

  const items = await sql`
    SELECT ii.*,
           array_agg(a.file_url) FILTER (WHERE a.id IS NOT NULL) AS photo_urls,
           array_agg(a.file_name) FILTER (WHERE a.id IS NOT NULL) AS photo_names
    FROM inspection_items ii
    LEFT JOIN attachments a ON a.inspection_item_id=ii.id
    WHERE ii.inspection_id=${id}
    GROUP BY ii.id ORDER BY ii.sort_order, ii.created_at
  ` as any[];

  return <ReportDetail inspection={inspection} items={items} />;
}
