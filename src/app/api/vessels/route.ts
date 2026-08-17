import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

// Optional DATE/NUMERIC columns reject "" ("invalid input syntax for type
// date/numeric") — the Vessels form leaves untouched fields as "", so blank
// strings must be coerced to null before they hit the query.
const blank = (v: unknown) => (v === "" || v === undefined ? null : v);

export async function GET() {
  const rows = await sql`SELECT * FROM vessels ORDER BY name`;
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  try {
    const b = await req.json();
    const [v] = await sql`
      INSERT INTO vessels
        (name, imo_number, vessel_type, flag, port_of_registry,
         class_society, date_of_delivery, owners, managers,
         dwt, gt, main_engine_make, main_engine_model,
         total_power_kw, capacity_note, dry_dock_due)
      VALUES
        (${b.name}, ${b.imo_number}, ${b.vessel_type}, ${blank(b.flag)},
         ${blank(b.port_of_registry)}, ${blank(b.class_society)},
         ${blank(b.date_of_delivery)}, ${blank(b.owners)}, ${blank(b.managers)},
         ${blank(b.dwt)}, ${blank(b.gt)}, ${blank(b.main_engine_make)},
         ${blank(b.main_engine_model)}, ${blank(b.total_power_kw)},
         ${blank(b.capacity_note)}, ${blank(b.dry_dock_due)})
      RETURNING *
    ` as any[];
    return NextResponse.json(v, { status: 201 });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
