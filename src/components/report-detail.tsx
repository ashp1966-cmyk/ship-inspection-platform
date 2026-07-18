"use client";
const GRADE_COLOR:Record<string,string>={GOOD:"#065F46",FAIR:"#92400E",POOR:"#C2410C",ACTION_REQUIRED:"#DC2626",NA:"#6B7280",NOT_SEEN:"#6B7280"};
const GRADE_BG:Record<string,string>={GOOD:"#D1FAE5",FAIR:"#FEF3C7",POOR:"#FED7AA",ACTION_REQUIRED:"#FEE2E2",NA:"#F3F4F6",NOT_SEEN:"#F3F4F6"};
const fmt=(d:string)=>d?new Date(d).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}):"—";

function groupBySection(items: any[]) {
  const g: Record<string, any[]> = {};
  for (const item of items) {
    const s = item.section_code ?? "OTHER";
    if (!g[s]) g[s] = [];
    g[s].push(item);
  }
  return g;
}

export default function ReportDetail({ inspection, items }: { inspection: any, items: any[] }) {
  const sections = groupBySection(items);
  const deficiencies = items.filter(i => i.grade_value === "POOR" || i.grade_value === "ACTION_REQUIRED");

  return (
    <div style={{ fontFamily:"system-ui,sans-serif", background:"#F4F2EE", minHeight:"100vh" }}>
      {/* Print/non-print toolbar */}
      <div className="no-print" style={{ background:"#0A1628", padding:"10px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <a href="/reports" style={{ color:"#4ABFDA", fontSize:12, textDecoration:"none" }}>← Back to reports</a>
        <button onClick={() => window.print()} style={{ padding:"6px 16px", background:"#1BA5C0", color:"#fff", border:"none", borderRadius:6, fontSize:12, cursor:"pointer", fontWeight:500 }}>
          🖨 Print / Export PDF
        </button>
      </div>

      <div style={{ maxWidth:960, margin:"0 auto", padding:"1.5rem 1rem" }}>
        {/* Header */}
        <div style={{ background:"#fff", borderRadius:10, border:"1px solid #E5E7EB", padding:"1.5rem", marginBottom:"1rem" }}>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", flexWrap:"wrap", gap:"1rem" }}>
            <div>
              <h1 style={{ fontSize:22, fontWeight:700, color:"#1A2533", margin:0 }}>{inspection.vessel_name ?? "Unknown Vessel"}</h1>
              <p style={{ fontSize:13, color:"#6B7280", margin:"4px 0 0" }}>
                IMO {inspection.imo_number ?? "—"} · {inspection.vessel_type} · {inspection.flag ?? ""} · {inspection.class_society ?? ""}
              </p>
              <p style={{ fontSize:13, color:"#6B7280", marginTop:2 }}>
                DWT {inspection.dwt ? Number(inspection.dwt).toLocaleString() : "—"} · {inspection.main_engine_make ?? ""} {inspection.main_engine_model ?? ""}
              </p>
            </div>
            <div style={{ textAlign:"right" }}>
              <span style={{ padding:"3px 10px", borderRadius:20, fontSize:12, fontWeight:600, background:"#E0F2FE", color:"#0369A1" }}>
                {inspection.inspection_type === "PRE_PURCHASE" ? "Pre-Purchase Inspection" : "Condition Inspection"}
              </span>
              <p style={{ fontSize:12, color:"#6B7280", marginTop:6 }}>Date: {fmt(inspection.started_at ?? inspection.created_at)}</p>
              {inspection.inspector_name && <p style={{ fontSize:12, color:"#6B7280" }}>Inspector: {inspection.inspector_name}</p>}
            </div>
          </div>
        </div>

        {/* Deficiency summary */}
        {deficiencies.length > 0 && (
          <div style={{ background:"#FEF2F2", borderRadius:10, border:"1px solid #FECACA", padding:"1rem 1.5rem", marginBottom:"1rem" }}>
            <h2 style={{ fontSize:14, fontWeight:600, color:"#DC2626", marginBottom:10 }}>⚠ Deficiencies ({deficiencies.length})</h2>
            {deficiencies.map((d,i) => (
              <div key={d.id} style={{ display:"flex", gap:10, marginBottom:6, fontSize:13 }}>
                <span style={{ fontWeight:600, color:"#9CA3AF", minWidth:20 }}>{i+1}.</span>
                <span style={{ color:"#374151", flex:1 }}>{d.prompt || d.equipment_name}</span>
                <span style={{ padding:"1px 6px", borderRadius:12, fontSize:11, fontWeight:600, background: GRADE_BG[d.grade_value], color: GRADE_COLOR[d.grade_value] }}>
                  {d.grade_value?.replace("_"," ")}
                </span>
                {d.deficiency_status && d.deficiency_status!=="OPEN" && (
                  <span style={{ padding:"1px 6px", borderRadius:12, fontSize:11, background:"#D1FAE5", color:"#065F46" }}>{d.deficiency_status}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Sections */}
        {Object.entries(sections).map(([code, sItems]) => (
          <div key={code} style={{ background:"#fff", borderRadius:10, border:"1px solid #E5E7EB", marginBottom:"1rem", overflow:"hidden" }}>
            <div style={{ padding:"10px 16px", background:"#F9FAFB", borderBottom:"1px solid #E5E7EB" }}>
              <h3 style={{ fontSize:13, fontWeight:600, color:"#1A2533", margin:0 }}>{code.replace(/_/g," ")}</h3>
            </div>
            <div>
              {sItems.map((item, i) => {
                const answer = item.grade_value ?? (item.bool_value===true?"YES":item.bool_value===false?"NO":null) ?? item.text_value ?? item.date_value ?? item.number_value;
                const isDeficiency = item.grade_value==="POOR"||item.grade_value==="ACTION_REQUIRED";
                return (
                  <div key={item.id} style={{ padding:"8px 16px", borderBottom:"1px solid #F3F4F6", background: isDeficiency?"#FFF9F9":"transparent", display:"flex", alignItems:"flex-start", gap:12 }}>
                    <span style={{ fontSize:11, color:"#D1D5DB", minWidth:22, paddingTop:1 }}>{i+1}.</span>
                    <span style={{ flex:1, fontSize:13, color:"#374151", lineHeight:1.5 }}>{item.prompt ?? item.equipment_name}</span>
                    {answer && (
                      <span style={{ padding:"2px 8px", borderRadius:20, fontSize:11, fontWeight:500, whiteSpace:"nowrap",
                        background: GRADE_BG[answer] ?? "#F3F4F6",
                        color: GRADE_COLOR[answer] ?? "#374151" }}>
                        {String(answer).replace("_"," ")}
                      </span>
                    )}
                    {item.remarks && <span style={{ fontSize:11, color:"#6B7280", fontStyle:"italic", maxWidth:200 }}>{item.remarks}</span>}
                    {/* Photos */}
                    {item.photo_urls?.filter(Boolean).map((url:string, pi:number) => (
                      <a key={pi} href={url} target="_blank" rel="noreferrer">
                        <img src={url} alt="attachment" style={{ width:40, height:40, objectFit:"cover", borderRadius:4, border:"1px solid #E5E7EB" }} />
                      </a>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <style>{`@media print { .no-print{display:none!important} body{background:#fff} }`}</style>
    </div>
  );
}
