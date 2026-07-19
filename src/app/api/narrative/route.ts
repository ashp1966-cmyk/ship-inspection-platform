import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

// Generates a professional executive-summary narrative from an
// inspection's graded answers using the Anthropic API. This is additive
// to the rule-based generateExecutiveSummary() in lib/grading.ts — that
// one runs automatically on "calculate_score" with no API cost; this one
// is invoked on demand from the AI Narrative tab for a more natural,
// surveyor-style write-up, and reuses the same "save_summary" PATCH
// action to persist the result once the inspector is happy with it.
export async function POST(req: Request) {
  try {
    const { inspectionId } = await req.json();
    if (!inspectionId) {
      return NextResponse.json({ error: "inspectionId is required" }, { status: 400 });
    }

    const [insp] = await sql`
      SELECT i.*, v.name AS vessel_name, v.vessel_type, v.imo_number,
             v.flag, v.class_society, v.dwt
      FROM inspections i LEFT JOIN vessels v ON v.id = i.vessel_id
      WHERE i.id = ${inspectionId}
    ` as any[];
    if (!insp) {
      return NextResponse.json({ error: "Inspection not found" }, { status: 404 });
    }

    const items = await sql`
      SELECT section_code, prompt, grade_value, bool_value, text_value,
             number_value, date_value, remarks
      FROM inspection_items
      WHERE inspection_id = ${inspectionId}
      ORDER BY section_code, sort_order
    ` as any[];

    if (!items.length) {
      return NextResponse.json(
        { error: "This inspection has no answered items yet — nothing to summarize." },
        { status: 400 }
      );
    }

    // Group findings by section into compact bullet lines for the prompt.
    const bySection: Record<string, string[]> = {};
    for (const it of items) {
      const answer =
        it.grade_value ??
        (it.bool_value === true ? "Yes" : it.bool_value === false ? "No" : null) ??
        it.text_value ??
        (it.number_value != null ? String(it.number_value) : null) ??
        it.date_value ?? "—";
      const line = `- ${it.prompt}: ${answer}${it.remarks ? ` (Remarks: ${it.remarks})` : ""}`;
      (bySection[it.section_code] ??= []).push(line);
    }
    const findingsText = Object.entries(bySection)
      .map(([code, lines]) => `${code.replace(/_/g, " ")}:\n${lines.join("\n")}`)
      .join("\n\n");

    const deficiencies = items.filter(
      i => i.grade_value === "POOR" || i.grade_value === "ACTION_REQUIRED" || i.bool_value === false
    );

    const inspectionLabel = insp.inspection_type === "PRE_PURCHASE" ? "pre-purchase" : "condition";

    const prompt = `You are a professional marine surveyor writing the executive summary section of a ${inspectionLabel} inspection report.

Vessel: ${insp.vessel_name ?? "Unknown"} (${insp.vessel_type ?? "unknown type"}), IMO ${insp.imo_number ?? "N/A"}, Flag: ${insp.flag ?? "N/A"}, Class: ${insp.class_society ?? "N/A"}.

Recorded inspection findings, grouped by section:

${findingsText}

Write a concise, professional executive summary (150–250 words) in the style of a marine surveyor's report. Lead with an overall impression of the vessel's condition, reference the ${deficiencies.length} deficienc${deficiencies.length === 1 ? "y" : "ies"} found (naming them if any), and close with an overall recommendation. Do not invent facts that are not present above. Write in formal, third-person register. Return only the summary text — no headers, labels, or preamble.`;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not configured on the server." },
        { status: 500 }
      );
    }

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 500,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("Anthropic API error:", errText);
      return NextResponse.json({ error: "AI generation failed. Check server logs." }, { status: 502 });
    }

    const data = await aiRes.json();
    const narrative = data.content?.find((c: any) => c.type === "text")?.text?.trim() ?? "";

    return NextResponse.json({ narrative, deficiencyCount: deficiencies.length });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
