import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { sql, getClaims } from "@/lib/db";
import { VESSEL_TYPES } from "@/lib/labels";
import { imoError } from "@/lib/imo";
import { requireEditor } from "@/lib/authz";
import { buildRows, insertQueries, BadRequest, type SaveBody } from "@/lib/inspection-writes";

const INSPECTION_TYPES = ["CONDITION", "PRE_PURCHASE", "TECHNICAL", "RIGHTSHIP"];

export async function POST(req: Request) {
  const guard = await requireEditor();
  if ("error" in guard) return guard.error;
  try {
    const body = await req.json();
    const { vesselId, vesselName, imoNumber, vesselType, inspectionType, inspectorName } = body;

    // Vessel Name and IMO Number are the only required vessel fields; vesselId
    // (a link to an existing vessels row) is optional and may be null.
    const enteredName = typeof vesselName === "string" ? vesselName.trim() : "";
    const enteredImo  = typeof imoNumber === "string" ? imoNumber.trim() : "";
    if (!enteredName || !enteredImo) {
      return NextResponse.json({ error: "Vessel Name and IMO Number are required." }, { status: 400 });
    }
    const imoProblem = imoError(enteredImo);
    if (imoProblem) {
      return NextResponse.json({ error: imoProblem }, { status: 400 });
    }
    if (!INSPECTION_TYPES.includes(inspectionType)) {
      return NextResponse.json({ error: "Invalid inspection type." }, { status: 400 });
    }

    // A linked vessel must belong to the caller's own organization. RLS alone is not enough
    // here: FK checks bypass it, and a platform admin can *see* other orgs' vessels.
    if (vesselId) {
      const own = await sql`SELECT id FROM vessels WHERE id = ${vesselId} AND organization_id = app_org_id()` as any[];
      if (own.length === 0) {
        return NextResponse.json({ error: "Selected vessel not found." }, { status: 400 });
      }
    }

    // No vesselId: link the caller's vessel with this IMO, or register one from what was typed.
    // An existing vessel is linked as-is and never overwritten. The registry has no owner/class
    // data to invent: only name, IMO and type are NOT NULL, the rest stays empty.
    const queries: ReturnType<typeof sql.query>[] = [];
    if (!vesselId) {
      const found = await sql`SELECT id FROM vessels WHERE imo_number = ${enteredImo} AND organization_id = app_org_id()` as any[];
      if (found.length === 0) {
        if (!(VESSEL_TYPES as readonly string[]).includes(vesselType)) {
          return NextResponse.json({ error: "Vessel Type is required to register a new vessel." }, { status: 400 });
        }
        // ON CONFLICT covers two saves racing on the same new IMO (unique per org).
        queries.push(sql.query(
          `INSERT INTO vessels (name, imo_number, vessel_type) VALUES ($1, $2, $3)
           ON CONFLICT (organization_id, imo_number) DO NOTHING`,
          [enteredName, enteredImo, vesselType]));
      }
    }

    // Inspector: the form's name if given, otherwise the signed-in user's full name.
    let inspector = typeof inspectorName === "string" ? inspectorName.trim() : "";
    if (!inspector) inspector = (await getClaims())?.name?.trim() ?? "";

    const rows = buildRows(body as SaveBody, randomUUID);
    const inspId = randomUUID();

    // Everything below is ONE transaction: a failure part-way leaves nothing behind.
    queries.push(sql.query(
      `INSERT INTO inspections (id, vessel_id, entered_vessel_name, entered_imo_number, inspection_type, status, started_at, inspector_name)
       VALUES ($1, COALESCE($2::uuid, (SELECT id FROM vessels WHERE imo_number = $4::text AND organization_id = app_org_id())),
               $3, $4::text, $5, 'IN_PROGRESS', CURRENT_DATE, $6)`,
      [inspId, vesselId || null, enteredName, enteredImo, inspectionType, inspector || null]));
    queries.push(...insertQueries(inspId, rows));
    await sql.transaction(queries);

    return NextResponse.json({ id: inspId }, { status: 201 });
  } catch (err: any) {
    if (err instanceof BadRequest) return NextResponse.json({ error: err.message }, { status: 400 });
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  const rows = await sql`
    SELECT i.id, COALESCE(v.name, i.entered_vessel_name) AS vessel_name, v.vessel_type,
           i.inspection_type, i.status, i.inspector_name,
           i.started_at, i.overall_grade, i.created_at
    FROM inspections i
    LEFT JOIN vessels v ON v.id = i.vessel_id
    ORDER BY i.created_at DESC
  `;
  return NextResponse.json(rows);
}
