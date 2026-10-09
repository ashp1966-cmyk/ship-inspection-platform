import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { requireEditor } from "@/lib/authz";

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const guard = await requireEditor();
  if ("error" in guard) return guard.error;
  try {
    const { id } = await props.params;
    const { deficiency_status, deficiency_action } = await req.json();
    await sql`
      UPDATE inspection_items
      SET deficiency_status    = ${deficiency_status},
          deficiency_action    = ${deficiency_action ?? ""},
          deficiency_closed_at = ${deficiency_status === "CLOSED" ? new Date().toISOString() : null},
          updated_at           = NOW()
      WHERE id = ${id}
    `;
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
