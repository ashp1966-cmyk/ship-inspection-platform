import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { calculateSectionScore, calculateOverallScore, generateExecutiveSummary } from "@/lib/grading";

export async function GET(_: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const [insp] = await sql`
    SELECT i.*, v.name AS vessel_name, v.vessel_type, v.imo_number,
           v.flag, v.class_society, v.dwt
    FROM inspections i LEFT JOIN vessels v ON v.id=i.vessel_id
    WHERE i.id=${id}
  ` as any[];
  if (!insp) return NextResponse.json({ error:"Not found" }, { status:404 });

  const items = await sql`
    SELECT ii.*,
           array_agg(a.file_url) FILTER (WHERE a.id IS NOT NULL) AS photo_urls,
           array_agg(a.file_name) FILTER (WHERE a.id IS NOT NULL) AS photo_names
    FROM inspection_items ii
    LEFT JOIN attachments a ON a.inspection_item_id=ii.id
    WHERE ii.inspection_id=${id}
    GROUP BY ii.id ORDER BY ii.sort_order, ii.created_at
  ` as any[];

  const sections = await sql`SELECT * FROM section_scores WHERE inspection_id=${id}` as any[];
  return NextResponse.json({ inspection: insp, items, sections });
}

export async function PATCH(req: Request, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  const body = await req.json();
  const { action } = body;

  if (action === "calculate_score") {
    // Fetch all items
    const items = await sql`
      SELECT section_code, grade_value, bool_value, prompt
      FROM inspection_items WHERE inspection_id=${id}
    ` as any[];

    // Group by section
    const grouped: Record<string, any[]> = {};
    for (const item of items) {
      const code = item.section_code ?? "OTHER";
      if (!grouped[code]) grouped[code] = [];
      grouped[code].push(item);
    }

    // Calculate section scores
    const sectionScores = Object.entries(grouped).map(([code, sItems]) =>
      calculateSectionScore(sItems, code, code.replace(/_/g," "))
    );

    const overall = calculateOverallScore(sectionScores);

    // Fetch vessel info for summary
    const [insp] = await sql`
      SELECT i.*, v.name AS vessel_name, v.vessel_type
      FROM inspections i LEFT JOIN vessels v ON v.id=i.vessel_id
      WHERE i.id=${id}
    ` as any[];

    const deficiencies = items.filter(i =>
      i.grade_value === "POOR" || i.grade_value === "ACTION_REQUIRED"
    );

    const summary = generateExecutiveSummary(
      insp?.vessel_name ?? "Unknown Vessel",
      insp?.vessel_type ?? "BULK_CARRIER",
      overall, deficiencies
    );

    // Persist scores
    for (const s of overall.sections) {
      await sql`
        INSERT INTO section_scores
          (inspection_id, section_code, section_title, score, total_items, graded_items, deficiency_count)
        VALUES (${id}, ${s.sectionCode}, ${s.sectionTitle}, ${s.score}, ${s.totalItems}, ${s.gradedItems}, ${s.deficiencyCount})
        ON CONFLICT (inspection_id, section_code) DO UPDATE SET
          score=EXCLUDED.score, graded_items=EXCLUDED.graded_items,
          deficiency_count=EXCLUDED.deficiency_count
      `;
    }

    await sql`
      UPDATE inspections SET
        overall_score=${overall.overallScore},
        condition_score=${overall.conditionScore},
        management_score=${overall.managementScore},
        overall_grade=${overall.grade},
        executive_summary=${summary}
      WHERE id=${id}
    `;

    return NextResponse.json({ score: overall, summary });
  }

  if (action === "update_status") {
    const { status, port, inspector_name } = body;
    const now = new Date().toISOString();
    await sql`
      UPDATE inspections SET
        status=${status},
        port=${port ?? null},
        inspector_name=${inspector_name ?? null},
        completed_at=${status==="COMPLETED"||status==="ISSUED" ? now : null},
        issued_at=${status==="ISSUED" ? now : null},
        updated_at=NOW()
      WHERE id=${id}
    `;
    return NextResponse.json({ ok:true });
  }

  if (action === "save_summary") {
    await sql`UPDATE inspections SET executive_summary=${body.summary} WHERE id=${id}`;
    return NextResponse.json({ ok:true });
  }

  return NextResponse.json({ error:"Unknown action" }, { status:400 });
}
