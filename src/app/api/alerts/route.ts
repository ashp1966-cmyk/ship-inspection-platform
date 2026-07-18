import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function POST(req: Request) {
  const { inspectionId, itemId, vesselName, deficiency, grade } = await req.json();
  const alertEmail = process.env.ALERT_EMAIL;
  const resendKey  = process.env.RESEND_API_KEY;
  if (!alertEmail || !resendKey) return NextResponse.json({ skipped:true });

  const existing = await sql`SELECT id FROM alert_log WHERE item_id=${itemId} LIMIT 1` as any[];
  if (existing.length > 0) return NextResponse.json({ skipped:true, reason:"Already alerted" });

  const res = await fetch("https://api.resend.com/emails", {
    method:"POST",
    headers:{ "Authorization":`Bearer ${resendKey}`, "Content-Type":"application/json" },
    body:JSON.stringify({
      from:"Ship Inspection Platform <noreply@aukmarime.com>",
      to:[alertEmail],
      subject:`⚠ ${grade==="ACTION_REQUIRED"?"Action Required":"Poor"} — ${vesselName}`,
      html:`<h2 style="color:#DC2626">Inspection Deficiency Alert</h2>
        <p><strong>Vessel:</strong> ${vesselName}</p>
        <p><strong>Grade:</strong> <span style="color:#DC2626;font-weight:bold">${grade.replace("_"," ")}</span></p>
        <p><strong>Item:</strong> ${deficiency}</p>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/inspections/${inspectionId}" style="background:#0A1628;color:#fff;padding:8px 16px;border-radius:6px;text-decoration:none">View Inspection →</a></p>`,
    }),
  });
  if (res.ok) {
    await sql`INSERT INTO alert_log (inspection_id,item_id,sent_to) VALUES (${inspectionId},${itemId},${alertEmail})`;
    return NextResponse.json({ sent:true });
  }
  return NextResponse.json({ error:"Send failed" }, { status:500 });
}
