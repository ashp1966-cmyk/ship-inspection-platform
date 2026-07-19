"use client";
import { useState } from "react";
import Link from "next/link";

const STATUS_FLOW = ["DRAFT","IN_PROGRESS","COMPLETED","ISSUED"];
const STATUS_COLOR: Record<string,string> = {
  DRAFT:"#6B7280", IN_PROGRESS:"#D97706", COMPLETED:"#2563EB", ISSUED:"#059669"
};
const STATUS_BG: Record<string,string> = {
  DRAFT:"#F3F4F6", IN_PROGRESS:"#FEF3C7", COMPLETED:"#EFF6FF", ISSUED:"#ECFDF5"
};
const GRADE_COLOR: Record<string,string> = {
  GOOD:"#065F46", FAIR:"#92400E", POOR:"#C2410C", ACTION_REQUIRED:"#DC2626"
};
const GRADE_BG: Record<string,string> = {
  GOOD:"#D1FAE5", FAIR:"#FEF3C7", POOR:"#FED7AA", ACTION_REQUIRED:"#FEE2E2"
};
const fmt=(d:string)=>d?new Date(d).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}):"—";
const TYPES:Record<string,string>={BULK_CARRIER:"Bulk Carrier",CONTAINER_SHIP:"Container Ship",OIL_TANKER:"Oil Tanker",LNG_CARRIER:"LNG Carrier",GENERAL_CARGO:"General Cargo",LPG_TANKER:"LPG Tanker",CRUISE_SHIP:"Cruise Ship"};

function ScoreDial({ score, label }: { score: number; label: string }) {
  const grade = score>=85?"GOOD":score>=65?"FAIR":score>=40?"POOR":"ACTION_REQUIRED";
  return (
    <div style={{ textAlign:"center", padding:"12px 20px" }}>
      <div style={{ fontSize:41, fontWeight:700, color: GRADE_COLOR[grade] }}>{score}</div>
      <div style={{ fontSize:12, color:"#9CA3AF", textTransform:"uppercase", letterSpacing:"0.06em" }}>/100</div>
      <div style={{ fontSize:14, color:"#6B7280", marginTop:4 }}>{label}</div>
      <span style={{ padding:"2px 8px", borderRadius:20, fontSize:13, fontWeight:600, background:GRADE_BG[grade], color:GRADE_COLOR[grade] }}>
        {grade.replace("_"," ")}
      </span>
    </div>
  );
}

export default function InspectionManager({ inspection, items, sections }: {
  inspection: any; items: any[]; sections: any[];
}) {
  const [insp, setInsp]       = useState(inspection);
  const [sects, setSects]     = useState(sections);
  const [scoring, setScoring] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [summary, setSummary] = useState(inspection.executive_summary ?? "");
  const [editSummary, setEditSummary] = useState(false);
  const [port, setPort]       = useState(inspection.port ?? "");
  const [inspector, setInspector] = useState(inspection.inspector_name ?? "");

  const deficiencies = items.filter(i => i.grade_value==="POOR"||i.grade_value==="ACTION_REQUIRED");
  const currentIdx   = STATUS_FLOW.indexOf(insp.status ?? "DRAFT");
  const isIssued     = insp.status === "ISSUED";

  async function calculateScore() {
    setScoring(true);
    try {
      const res = await fetch(`/api/inspections/${insp.id}`, {
        method:"PATCH", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ action:"calculate_score" }),
      });
      const { score, summary: s } = await res.json();
      setInsp((prev:any) => ({
        ...prev,
        overall_score: score.overallScore,
        condition_score: score.conditionScore,
        management_score: score.managementScore,
        overall_grade: score.grade,
        executive_summary: s,
      }));
      setSects(score.sections.map((s:any) => ({
        section_code: s.sectionCode, section_title: s.sectionTitle,
        score: s.score, graded_items: s.gradedItems,
        deficiency_count: s.deficiencyCount,
      })));
      setSummary(s);
    } finally { setScoring(false); }
  }

  async function advanceStatus() {
    const next = STATUS_FLOW[currentIdx + 1];
    if (!next) return;
    setUpdating(true);
    await fetch(`/api/inspections/${insp.id}`, {
      method:"PATCH", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({ action:"update_status", status:next, port, inspector_name:inspector }),
    });
    setInsp((prev:any) => ({ ...prev, status:next }));
    setUpdating(false);
  }

  async function saveSummary() {
    await fetch(`/api/inspections/${insp.id}`, {
      method:"PATCH", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({ action:"save_summary", summary }),
    });
    setEditSummary(false);
  }

  const grouped: Record<string, any[]> = {};
  for (const item of items) {
    const k = item.section_code ?? "OTHER";
    if (!grouped[k]) grouped[k] = [];
    grouped[k].push(item);
  }

  return (
    <div style={{ fontFamily:"system-ui,sans-serif", background:"#F4F2EE", minHeight:"100vh" }}>
      {/* Toolbar */}
      <div className="no-print" style={{ background:"#0A1628", padding:"10px 24px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <Link href="/reports" style={{ color:"#4ABFDA", fontSize:14, textDecoration:"none" }}>← Reports</Link>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={() => window.print()} style={{ padding:"6px 14px", background:"rgba(255,255,255,0.1)", color:"#fff", border:"1px solid rgba(255,255,255,0.2)", borderRadius:6, fontSize:14, cursor:"pointer" }}>
            🖨 Print / PDF
          </button>
        </div>
      </div>

      <div style={{ maxWidth:1000, margin:"0 auto", padding:"1.5rem 1rem" }}>

        {/* Header card */}
        <div style={{ background:"#fff", borderRadius:10, border:"1px solid #E5E7EB", padding:"1.25rem", marginBottom:"1rem" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:"1rem" }}>
            <div>
              <h1 style={{ fontSize:23, fontWeight:700, color:"#1A2533", margin:0 }}>{insp.vessel_name ?? "Unknown Vessel"}</h1>
              <p style={{ fontSize:15, color:"#6B7280", margin:"3px 0 0" }}>
                IMO {insp.imo_number ?? "—"} · {TYPES[insp.vessel_type] ?? insp.vessel_type} · {insp.flag ?? ""} · {insp.class_society ?? ""}
              </p>
              <p style={{ fontSize:14, color:"#9CA3AF", marginTop:2 }}>
                {insp.inspection_type==="PRE_PURCHASE"?"Pre-Purchase Inspection":"Condition Inspection"} · {fmt(insp.started_at ?? insp.created_at)}
              </p>
            </div>
            <span style={{ padding:"4px 14px", borderRadius:20, fontSize:14, fontWeight:600, background: STATUS_BG[insp.status??"DRAFT"], color:STATUS_COLOR[insp.status??"DRAFT"] }}>
              {insp.status ?? "DRAFT"}
            </span>
          </div>

          {/* Workflow */}
          <div style={{ marginTop:"1rem", display:"flex", alignItems:"center", gap:0 }}>
            {STATUS_FLOW.map((s, i) => (
              <div key={s} style={{ display:"flex", alignItems:"center" }}>
                <div style={{ textAlign:"center" }}>
                  <div style={{ width:28, height:28, borderRadius:"50%", border:`2px solid ${i<=currentIdx?STATUS_COLOR[s]:"#D1D5DB"}`,
                    background: i<=currentIdx?STATUS_COLOR[s]:"#fff", color: i<=currentIdx?"#fff":"#D1D5DB",
                    display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, fontWeight:700, margin:"0 auto" }}>
                    {i < currentIdx ? "✓" : i+1}
                  </div>
                  <div style={{ fontSize:12, color: i<=currentIdx?STATUS_COLOR[s]:"#9CA3AF", marginTop:3, whiteSpace:"nowrap" }}>{s.replace("_"," ")}</div>
                </div>
                {i < STATUS_FLOW.length-1 && (
                  <div style={{ width:48, height:2, background: i<currentIdx?"#059669":"#E5E7EB", margin:"0 6px 14px" }} />
                )}
              </div>
            ))}
          </div>

          {/* Workflow action */}
          {!isIssued && (
            <div style={{ marginTop:"1rem", display:"flex", gap:10, flexWrap:"wrap" }}>
              <input placeholder="Port" value={port} onChange={e=>setPort(e.target.value)}
                style={{ padding:"6px 10px", border:"1px solid #D1D5DB", borderRadius:6, fontSize:15, width:150 }} />
              <input placeholder="Inspector name" value={inspector} onChange={e=>setInspector(e.target.value)}
                style={{ padding:"6px 10px", border:"1px solid #D1D5DB", borderRadius:6, fontSize:15, width:180 }} />
              <button onClick={advanceStatus} disabled={updating}
                style={{ padding:"6px 16px", background:STATUS_COLOR[STATUS_FLOW[currentIdx+1]??"ISSUED"]??"#059669",
                  color:"#fff", border:"none", borderRadius:6, fontSize:14, cursor:"pointer", fontWeight:500 }}>
                {updating?"Updating…":`→ Mark as ${STATUS_FLOW[currentIdx+1]?.replace("_"," ")??""}`}
              </button>
              <button onClick={calculateScore} disabled={scoring}
                style={{ padding:"6px 16px", background:"#0A1628", color:"#fff", border:"none", borderRadius:6, fontSize:14, cursor:"pointer", fontWeight:500 }}>
                {scoring?"Calculating…":"⚡ Calculate Score"}
              </button>
            </div>
          )}
        </div>

        {/* Score cards */}
        {insp.overall_score != null && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:"1rem" }}>
            <div style={{ background:"#fff", borderRadius:10, border:"1px solid #E5E7EB" }}>
              <ScoreDial score={insp.overall_score} label="Overall Score" />
            </div>
            <div style={{ background:"#fff", borderRadius:10, border:"1px solid #E5E7EB" }}>
              <ScoreDial score={insp.condition_score ?? 0} label="Condition" />
            </div>
            <div style={{ background:"#fff", borderRadius:10, border:"1px solid #E5E7EB" }}>
              <ScoreDial score={insp.management_score ?? 0} label="Management" />
            </div>
          </div>
        )}

        {/* Section scores */}
        {sects.length > 0 && (
          <div style={{ background:"#fff", borderRadius:10, border:"1px solid #E5E7EB", marginBottom:"1rem", overflow:"hidden" }}>
            <div style={{ padding:"10px 16px", background:"#F9FAFB", borderBottom:"1px solid #E5E7EB" }}>
              <h2 style={{ fontSize:15, fontWeight:600, margin:0 }}>Section Scores</h2>
            </div>
            <div style={{ padding:"12px 16px", display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:10 }}>
              {sects.filter(s=>s.graded_items>0).sort((a:any,b:any)=>a.score-b.score).map((s:any) => {
                const grade = s.score>=85?"GOOD":s.score>=65?"FAIR":s.score>=40?"POOR":"ACTION_REQUIRED";
                return (
                  <div key={s.section_code} style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, color:"#374151", marginBottom:3 }}>{s.section_title || s.section_code.replace(/_/g," ")}</div>
                      <div style={{ height:6, background:"#F3F4F6", borderRadius:3, overflow:"hidden" }}>
                        <div style={{ height:"100%", width:`${s.score}%`, background:GRADE_COLOR[grade], borderRadius:3, transition:"width 0.5s" }} />
                      </div>
                    </div>
                    <span style={{ fontSize:14, fontWeight:600, color:GRADE_COLOR[grade], minWidth:28, textAlign:"right" }}>{s.score}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Executive summary */}
        <div style={{ background:"#fff", borderRadius:10, border:"1px solid #E5E7EB", padding:"1.25rem", marginBottom:"1rem" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
            <h2 style={{ fontSize:15, fontWeight:600, margin:0 }}>Executive Summary</h2>
            {!editSummary && !isIssued && (
              <button onClick={()=>setEditSummary(true)} style={{ fontSize:14, color:"#1BA5C0", border:"none", background:"none", cursor:"pointer" }}>Edit</button>
            )}
          </div>
          {editSummary ? (
            <div>
              <textarea value={summary} onChange={e=>setSummary(e.target.value)} rows={6}
                style={{ width:"100%", padding:"8px", border:"1px solid #D1D5DB", borderRadius:6, fontSize:15, resize:"vertical", fontFamily:"inherit" }} />
              <div style={{ display:"flex", gap:8, marginTop:8 }}>
                <button onClick={saveSummary} style={{ padding:"6px 14px", background:"#0A1628", color:"#fff", border:"none", borderRadius:6, fontSize:14, cursor:"pointer" }}>Save</button>
                <button onClick={()=>{setEditSummary(false);setSummary(insp.executive_summary??'');}} style={{ padding:"6px 12px", background:"#F3F4F6", border:"none", borderRadius:6, fontSize:14, cursor:"pointer" }}>Cancel</button>
              </div>
            </div>
          ) : (
            <p style={{ fontSize:15, color:"#374151", lineHeight:1.7, margin:0 }}>
              {summary || <span style={{ color:"#9CA3AF", fontStyle:"italic" }}>Click "⚡ Calculate Score" to auto-generate the executive summary, or edit manually.</span>}
            </p>
          )}
        </div>

        {/* Deficiencies */}
        {deficiencies.length > 0 && (
          <div style={{ background:"#FEF2F2", borderRadius:10, border:"1px solid #FECACA", padding:"1.25rem", marginBottom:"1rem" }}>
            <h2 style={{ fontSize:15, fontWeight:600, color:"#DC2626", marginBottom:10 }}>⚠ Deficiencies ({deficiencies.length})</h2>
            {deficiencies.map((d,i)=>(
              <div key={d.id} style={{ display:"flex", gap:10, marginBottom:6, fontSize:15 }}>
                <span style={{ fontWeight:600, color:"#9CA3AF", minWidth:22 }}>{i+1}.</span>
                <span style={{ flex:1, color:"#374151" }}>{d.prompt||d.equipment_name}</span>
                <span style={{ padding:"1px 8px", borderRadius:20, fontSize:13, fontWeight:600, background:GRADE_BG[d.grade_value]??"#FEE2E2", color:GRADE_COLOR[d.grade_value]??"#DC2626", whiteSpace:"nowrap" }}>
                  {d.grade_value?.replace("_"," ")}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* All items by section */}
        {Object.entries(grouped).map(([code,sItems])=>(
          <div key={code} style={{ background:"#fff", borderRadius:10, border:"1px solid #E5E7EB", marginBottom:"0.75rem", overflow:"hidden" }}>
            <div style={{ padding:"8px 16px", background:"#F9FAFB", borderBottom:"1px solid #E5E7EB", display:"flex", justifyContent:"space-between" }}>
              <h3 style={{ fontSize:14, fontWeight:600, color:"#374151", margin:0 }}>{code.replace(/_/g," ")}</h3>
              <span style={{ fontSize:13, color:"#9CA3AF" }}>{sItems.length} items</span>
            </div>
            {sItems.map((item,i)=>{
              const answer = item.grade_value ?? (item.bool_value===true?"YES":item.bool_value===false?"NO":null) ?? item.text_value ?? item.date_value;
              const isDeficiency = item.grade_value==="POOR"||item.grade_value==="ACTION_REQUIRED";
              return (
                <div key={item.id} style={{ padding:"7px 16px", borderBottom:"1px solid #F3F4F6", background:isDeficiency?"#FFF9F9":"transparent", display:"flex", alignItems:"center", gap:10 }}>
                  <span style={{ fontSize:13, color:"#D1D5DB", minWidth:20 }}>{i+1}.</span>
                  <span style={{ flex:1, fontSize:14, color:"#374151" }}>{item.prompt||item.equipment_name}</span>
                  {answer && (
                    <span style={{ padding:"1px 7px", borderRadius:20, fontSize:13, fontWeight:500, whiteSpace:"nowrap",
                      background: GRADE_BG[answer]??"#F3F4F6", color: GRADE_COLOR[answer]??"#374151" }}>
                      {String(answer).replace("_"," ")}
                    </span>
                  )}
                  {item.remarks && <span style={{ fontSize:13, color:"#6B7280", fontStyle:"italic", maxWidth:180, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={item.remarks}>{item.remarks}</span>}
                  {(item.photo_urls??[]).filter(Boolean).map((url:string,pi:number)=>(
                    <a key={pi} href={url} target="_blank" rel="noreferrer">
                      <img src={url} alt="" style={{ width:32, height:32, objectFit:"cover", borderRadius:3, border:"1px solid #E5E7EB" }}/>
                    </a>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <style>{`@media print { .no-print{display:none!important} body{background:#fff} }`}</style>
    </div>
  );
}
