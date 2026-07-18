import { sql } from "@/lib/db";
import VesselsList from "@/components/vessels-list";

export const dynamic = "force-dynamic";

export default async function VesselsPage() {
  const vessels = await sql`SELECT * FROM vessels ORDER BY name`;
  return <VesselsList vessels={vessels as any[]} />;
}
