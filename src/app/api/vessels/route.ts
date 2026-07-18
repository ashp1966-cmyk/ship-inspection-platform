import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  const rows = await sql`SELECT * FROM vessels ORDER BY name`;
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const b = await req.json();
  const [v] = await sql`
    INSERT INTO vessels
      (name, imo_number, vessel_type, flag, port_of_registry,
       class_society, date_of_delivery, owners, managers,
       dwt, gt, main_engine_make, main_engine_model,
       total_power_kw, capacity_note, dry_dock_due)
    VALUES
      (${b.name}, ${b.imo_number}, ${b.vessel_type}, ${b.flag ?? null},
       ${b.port_of_registry ?? null}, ${b.class_society ?? null},
       ${b.date_of_delivery ?? null}, ${b.owners ?? null}, ${b.managers ?? null},
       ${b.dwt ?? null}, ${b.gt ?? null}, ${b.main_engine_make ?? null},
       ${b.main_engine_model ?? null}, ${b.total_power_kw ?? null},
       ${b.capacity_note ?? null}, ${b.dry_dock_due ?? null})
    RETURNING *
  ` as any[];
  return NextResponse.json(v, { status: 201 });
}
