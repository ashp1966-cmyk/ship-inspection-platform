import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(_: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const [v] = await sql`SELECT * FROM vessels WHERE id = ${id}` as any[];
  if (!v) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(v);
}

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const b = await req.json();
  const [v] = await sql`
    UPDATE vessels SET
      name = ${b.name}, imo_number = ${b.imo_number},
      vessel_type = ${b.vessel_type}, flag = ${b.flag ?? null},
      port_of_registry = ${b.port_of_registry ?? null},
      class_society = ${b.class_society ?? null},
      date_of_delivery = ${b.date_of_delivery ?? null},
      owners = ${b.owners ?? null}, managers = ${b.managers ?? null},
      dwt = ${b.dwt ?? null}, gt = ${b.gt ?? null},
      main_engine_make = ${b.main_engine_make ?? null},
      main_engine_model = ${b.main_engine_model ?? null},
      total_power_kw = ${b.total_power_kw ?? null},
      capacity_note = ${b.capacity_note ?? null},
      dry_dock_due = ${b.dry_dock_due ?? null},
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  ` as any[];
  return NextResponse.json(v);
}

export async function DELETE(_: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  await sql`DELETE FROM vessels WHERE id = ${id}`;
  return NextResponse.json({ ok: true });
}
