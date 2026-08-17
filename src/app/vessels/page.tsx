import { sql, dateStr } from "@/lib/db";
import VesselsList from "@/components/vessels-list";

export const dynamic = "force-dynamic";

export default async function VesselsPage() {
  const vessels = await sql`SELECT * FROM vessels ORDER BY name`;
  const fixed = (vessels as any[]).map(v => ({ ...v, date_of_delivery: dateStr(v.date_of_delivery), dry_dock_due: dateStr(v.dry_dock_due) }));
  return <VesselsList vessels={fixed} />;
}
