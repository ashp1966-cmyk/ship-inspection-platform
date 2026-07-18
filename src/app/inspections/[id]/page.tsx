import { sql } from "@/lib/db";
import InspectionManager from "@/components/inspection-manager";
export const dynamic = "force-dynamic";

export default async function InspectionPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const [insp] = await sql`
    SELECT i.*, v.name AS vessel_name, v.vessel_type, v.imo_number,
           v.flag, v.class_society, v.dwt
    FROM inspections i LEFT JOIN vessels v ON v.id=i.vessel_id
    WHERE i.id=${id}
  ` as any[];

  const items = await sql`
    SELECT ii.*,
           array_agg(a.file_url) FILTER(WHERE a.id IS NOT NULL) AS photo_urls
    FROM inspection_items ii
    LEFT JOIN attachments a ON a.inspection_item_id=ii.id
    WHERE ii.inspection_id=${id}
    GROUP BY ii.id ORDER BY ii.section_code, ii.created_at
  ` as any[];

  const sections = await sql`SELECT * FROM section_scores WHERE inspection_id=${id} ORDER BY score ASC` as any[];

  if (!insp) return <div style={{padding:"2rem"}}>Inspection not found.</div>;
  return <InspectionManager inspection={insp as any} items={items as any[]} sections={sections as any[]} />;
}
