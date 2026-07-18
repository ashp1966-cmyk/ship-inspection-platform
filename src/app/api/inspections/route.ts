import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      vesselId, vesselType, inspectionType,
      answers, questionMeta, remarks, attachments,
      inventory, projection,
    } = body;

    // 1. Create inspection record
    const [inspection] = await sql`
      INSERT INTO inspections (vessel_id, inspection_type, status, started_at)
      VALUES (${vesselId ?? null}, ${inspectionType}, 'IN_PROGRESS', CURRENT_DATE)
      RETURNING id
    ` as any[];

    const inspId = inspection.id;

    // 2. Save answered questions with proper column mapping
    if (answers && typeof answers === "object") {
      for (const [qId, rawValue] of Object.entries(answers as Record<string, string>)) {
        if (!rawValue) continue;
        const kind = (questionMeta as Record<string, string>)?.[qId] ?? "TEXT";
        const qRemarks = (remarks as Record<string, string>)?.[qId] ?? null;
        const sectionCode = qId.split("-")[0]?.toUpperCase() ?? "UNKNOWN";

        let gradeVal: string | null   = null;
        let boolVal:  boolean | null  = null;
        let textVal:  string | null   = null;
        let numVal:   number | null   = null;
        let dateVal:  string | null   = null;

        if (kind === "GRADE")       gradeVal = rawValue;
        else if (kind === "YES_NO") boolVal  = rawValue === "YES";
        else if (kind === "NUMBER") numVal   = Number(rawValue);
        else if (kind === "DATE")   dateVal  = rawValue;
        else                        textVal  = rawValue;

        const [item] = await sql`
          INSERT INTO inspection_items
            (inspection_id, section_code, prompt, question_id,
             grade_value, bool_value, text_value, number_value, date_value, remarks)
          VALUES
            (${inspId}, ${sectionCode}, ${qId}, ${qId},
             ${gradeVal}, ${boolVal}, ${textVal}, ${numVal ? numVal.toString() : null},
             ${dateVal}, ${qRemarks})
          RETURNING id
        ` as any[];

        // Save file attachments for this question
        const qAttachments = (attachments as Record<string, any[]>)?.[qId] ?? [];
        for (const att of qAttachments) {
          await sql`
            INSERT INTO attachments
              (inspection_item_id, inspection_id, question_id, file_name, file_url, file_type, file_size)
            VALUES
              (${item.id}, ${inspId}, ${qId}, ${att.name}, ${att.url}, ${att.fileType ?? "document"}, ${att.size ?? 0})
          `;
        }
      }
    }

    // 3. Pre-Purchase inventory items
    if (inspectionType === "PRE_PURCHASE" && Array.isArray(inventory)) {
      for (const it of inventory) {
        await sql`
          INSERT INTO inspection_items
            (inspection_id, section_code, prompt, grade_value,
             equipment_name, equipment_model, equipment_serial,
             estimated_repair_cost, annual_maint_cost,
             remaining_life_years, replacement_cost, remarks)
          VALUES
            (${inspId}, ${it.sectionCode}, ${it.equipmentName},
             ${it.grade || null}, ${it.equipmentName}, ${it.equipmentModel},
             ${it.equipmentSerial}, ${it.estimatedRepairCost},
             ${it.annualMaintCost}, ${it.remainingLifeYears},
             ${it.replacementCost}, ${it.remarks || null})
        `;
      }
    }

    // 4. CapEx projection snapshot
    if (projection?.yearTotals?.length === 5) {
      const [y1, y2, y3, y4, y5] = projection.yearTotals;
      await sql`
        INSERT INTO capex_projections
          (inspection_id, year_1, year_2, year_3, year_4, year_5, total)
        VALUES
          (${inspId}, ${y1}, ${y2}, ${y3}, ${y4}, ${y5}, ${projection.grandTotal})
      `;
    }

    return NextResponse.json({ id: inspId }, { status: 201 });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  const rows = await sql`
    SELECT i.id, v.name AS vessel_name, v.vessel_type,
           i.inspection_type, i.status, i.inspector_name,
           i.started_at, i.overall_grade, i.created_at
    FROM inspections i
    LEFT JOIN vessels v ON v.id = i.vessel_id
    ORDER BY i.created_at DESC
  `;
  return NextResponse.json(rows);
}
