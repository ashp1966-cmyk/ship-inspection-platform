import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { sql, getClaims } from "@/lib/db";
import { imoError } from "@/lib/imo";
import { requireEditor } from "@/lib/authz";
import { buildRows, insertQueries, prepareVessel, vesselIdSql, BadRequest, type SaveBody } from "@/lib/inspection-writes";

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

    // Link the chosen vessel, else the caller's vessel with this IMO, else register one from what was
    // typed (never overwriting an existing vessel). See prepareVessel.
    const queries = await prepareVessel(vesselId || null, enteredName, enteredImo, vesselType);

    // Inspector: the form's name if given, otherwise the signed-in user's full name.
    let inspector = typeof inspectorName === "string" ? inspectorName.trim() : "";
    if (!inspector) inspector = (await getClaims())?.name?.trim() ?? "";

    const rows = buildRows(body as SaveBody, randomUUID);
    const inspId = randomUUID();

    // Everything below is ONE transaction: a failure part-way leaves nothing behind.
    queries.push(sql.query(
      `INSERT INTO inspections (id, vessel_id, entered_vessel_name, entered_imo_number, inspection_type, status, started_at, inspector_name)
       VALUES ($1, ${vesselIdSql("$2", "$4")}, $3, $4::text, $5, 'IN_PROGRESS', CURRENT_DATE, $6)`,
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
