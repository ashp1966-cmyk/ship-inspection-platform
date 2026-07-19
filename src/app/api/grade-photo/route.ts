import { NextResponse } from "next/server";

// Suggests a Good/Fair/Poor/Action-Required grade for a photo the
// inspector just attached to a GRADE-type question. This is a
// suggestion only — the inspector confirms or overrides it in the UI.
// Reduces grader subjectivity and speeds up form-filling, per the
// "AI-assisted grading" item on the platform roadmap.

const VALID_GRADES = ["GOOD", "FAIR", "POOR", "ACTION_REQUIRED"];
const ALLOWED_MEDIA_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export async function POST(req: Request) {
  try {
    const { imageUrl, prompt } = await req.json();
    if (!imageUrl) {
      return NextResponse.json({ error: "imageUrl is required" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY is not configured on the server." },
        { status: 500 }
      );
    }

    // Fetch the image server-side and inline it as base64 — more
    // reliable across API versions than passing a bare URL, and the
    // photo is already public (Vercel Blob) so this is a simple GET.
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) {
      return NextResponse.json({ error: "Could not fetch the uploaded photo." }, { status: 502 });
    }
    const rawType = (imgRes.headers.get("content-type") ?? "image/jpeg").split(";")[0].trim();
    const mediaType = ALLOWED_MEDIA_TYPES.includes(rawType) ? rawType : "image/jpeg";
    const buffer = Buffer.from(await imgRes.arrayBuffer());
    const base64 = buffer.toString("base64");

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 300,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: base64 } },
            {
              type: "text",
              text: `You are assisting a marine surveyor grading vessel condition photos.

Inspection question: "${prompt ?? "General condition"}"

Look at the attached photo and suggest a grade for this item using ONLY one of these four values: GOOD, FAIR, POOR, ACTION_REQUIRED.
- GOOD: no visible defects, well maintained
- FAIR: minor wear or corrosion, cosmetic only, not structurally significant
- POOR: visible deterioration, corrosion, or damage warranting repair
- ACTION_REQUIRED: severe damage, structural concern, or safety hazard visible

Respond with ONLY valid JSON, no markdown fences, no extra text, in this exact shape:
{"grade":"GOOD|FAIR|POOR|ACTION_REQUIRED","reasoning":"one concise sentence explaining what you observed"}

This is a suggestion only — the inspector will confirm or override it.`,
            },
          ],
        }],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("Anthropic API error:", errText);
      return NextResponse.json({ error: "AI grading failed. Check server logs." }, { status: 502 });
    }

    const data = await aiRes.json();
    const text = data.content?.find((c: any) => c.type === "text")?.text?.trim() ?? "";

    let parsed: { grade?: string; reasoning?: string } = {};
    try {
      const cleaned = text.replace(/^```json\s*|```\s*$/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: "Could not parse the AI's response." }, { status: 502 });
    }

    if (!parsed.grade || !VALID_GRADES.includes(parsed.grade)) {
      return NextResponse.json({ error: "AI returned an unrecognized grade." }, { status: 502 });
    }

    return NextResponse.json({ grade: parsed.grade, reasoning: parsed.reasoning ?? "" });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
