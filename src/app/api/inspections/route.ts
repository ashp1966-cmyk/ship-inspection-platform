import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

// POST /api/inspections
// Persists an inspection, its answered items, and (for Pre-Purchase)
// the equipment inventory + materialised 5-year CapEx projection.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { vesselId, vesselType, inspectionType, answers, inventory, projection } = body;

    const [inspection] = await sql`
      INSERT INTO inspections (vessel_id, inspection_type, status, started_at)
      VALUES (${vesselId}, ${inspectionType}, 'IN_PROGRESS', CURRENT_DATE)
      RETURNING id
    `;

    // Condition-model answers
    if (answers) {
      for (const [questionKey, value] of Object.entries(answers as Record<string, string>)) {
        await sql`
          INSERT INTO inspection_items (inspection_id, section_code, prompt, text_value)
          VALUES (${inspection.id}, ${"UNMAPPED"}, ${questionKey}, ${value})
        `;
        // In production: join questionKey → template_questions.id and write
        // to the typed column (grade_value / bool_value / date_value).
      }
    }

    // Pre-Purchase inventory rows
    if (inspectionType === "PRE_PURCHASE" && Array.isArray(inventory)) {
      for (const it of inventory) {
        await sql`
          INSERT INTO inspection_items
            (inspection_id, section_code, prompt, grade_value,
             equipment_name, equipment_model, equipment_serial,
             estimated_repair_cost, annual_maint_cost,
             remaining_life_years, replacement_cost, remarks)
          VALUES
            (${inspection.id}, ${it.sectionCode}, ${it.equipmentName},
             ${it.grade || null},
             ${it.equipmentName}, ${it.equipmentModel}, ${it.equipmentSerial},
             ${it.estimatedRepairCost}, ${it.annualMaintCost},
             ${it.remainingLifeYears}, ${it.replacementCost}, ${it.remarks})
        `;
      }
    }

    // Materialise the CapEx snapshot so issued reports are immutable
    if (projection?.yearTotals?.length === 5) {
      const [y1, y2, y3, y4, y5] = projection.yearTotals;
      await sql`
        INSERT INTO capex_projections
          (inspection_id, year_1, year_2, year_3, year_4, year_5, total)
        VALUES
          (${inspection.id}, ${y1}, ${y2}, ${y3}, ${y4}, ${y5}, ${projection.grandTotal})
      `;
    }

    return NextResponse.json({ id: inspection.id }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to save inspection" }, { status: 500 });
  }
}
