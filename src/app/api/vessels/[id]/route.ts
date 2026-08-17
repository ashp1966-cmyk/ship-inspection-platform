import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

// See src/app/api/vessels/route.ts — "" must be coerced to null for
// optional DATE/NUMERIC columns or the update throws.
const blank = (v: unknown) => (v === "" || v === undefined ? null : v);

export async function GET(_: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const [v] = await sql`SELECT * FROM vessels WHERE id = ${id}` as any[];
  if (!v) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(v);
}

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await props.params;
    const b = await req.json();
    const [v] = await sql`
      UPDATE vessels SET
        name = ${b.name}, imo_number = ${b.imo_number},
        vessel_type = ${b.vessel_type}, flag = ${blank(b.flag)},
        port_of_registry = ${blank(b.port_of_registry)},
        class_society = ${blank(b.class_society)},
        date_of_delivery = ${blank(b.date_of_delivery)},
        owners = ${blank(b.owners)}, managers = ${blank(b.managers)},
        dwt = ${blank(b.dwt)}, gt = ${blank(b.gt)},
        main_engine_make = ${blank(b.main_engine_make)},
        main_engine_model = ${blank(b.main_engine_model)},
        total_power_kw = ${blank(b.total_power_kw)},
        capacity_note = ${blank(b.capacity_note)},
        dry_dock_due = ${blank(b.dry_dock_due)},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    ` as any[];
    return NextResponse.json(v);
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(_: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  await sql`DELETE FROM vessels WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
