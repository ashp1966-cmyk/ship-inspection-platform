"use client";
import Link from "next/link";
const TEAL="#1BA5C0", NAV="#0A1628";
const TYPES:Record<string,string>={BULK_CARRIER:"Bulk Carrier",CONTAINER_SHIP:"Container Ship",OIL_TANKER:"Oil Tanker",LNG_CARRIER:"LNG Carrier",GENERAL_CARGO:"General Cargo",LPG_TANKER:"LPG Tanker",CRUISE_SHIP:"Cruise Ship"};
const GRADE_COLOR:Record<string,string>={GOOD:"#065F46",FAIR:"#92400E",POOR:"#C2410C",ACTION_REQUIRED:"#DC2626"};
const GRADE_BG:Record<string,string>={GOOD:"#D1FAE5",FAIR:"#FEF3C7",POOR:"#FED7AA",ACTION_REQUIRED:"#FEE2E2"};
const STATUS_COLOR:Record<string,string>={DRAFT:"#6B7280",IN_PROGRESS:"#D97706",COMPLETED:"#2563EB",ISSUED:"#059669"};
const STATUS_BG:Record<string,string>={DRAFT:"#F3F4F6",IN_PROGRESS:"#FEF3C7",COMPLETED:"#EFF6FF",ISSUED:"#ECFDF5"};
const fmt=(d:string)=>d?new Date(d).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}):"—";

export default function VesselHistory({ vessel, inspections }: { vessel: any; inspections: any[] }) {
  const latestScore = inspections.find(i=>i.overall_score!=null)?.overall_score;

  return (
    <div style={{ fontFamily:"system-ui,sans-serif", background:"#F4F2EE", minHeight:"100vh" }}>
      <div style={{ maxWidth:1000, margin:"0 auto", padding:"1.5rem 1rem" }}>
        {/* Vessel card */}
        <div style={{ background:"#fff", borderRadius:10, border:"1px solid #E5E7EB", padding:"1.25rem", marginBottom:"1rem" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexWrap:"wrap", gap:"1rem" }}>
            <div>
              <div style={{ fontSize:13, color:"#9CA3AF", textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:4 }}>Fleet Registry</div>
              <h1 style={{ fontSize:25, fontWeight:700, color:"#1A2533", margin:0 }}>{vessel.name}</h1>
              <div style={{ fontSize:15, color:"#6B7280", marginTop:4, display:"flex", gap:"1.5rem", flexWrap:"wrap" }}>
                <span>IMO <strong style={{color:"#374151"}}>{vessel.imo_number}</strong></span>
                <span>Type <strong style={{color:"#374151"}}>{TYPES[vessel.vessel_type]??vessel.vessel_type}</strong></span>
                <span>Flag <strong style={{color:"#374151"}}>{vessel.flag||"—"}</strong></span>
                <span>Class <strong style={{color:"#374151"}}>{vessel.class_society||"—"}</strong></span>
                <span>DWT <strong style={{color:"#374151"}}>{vessel.dwt?Number(vessel.dwt).toLocaleString():"—"}</strong></span>
              </div>
              {vessel.owners && <div style={{ fontSize:14, color:"#9CA3AF", marginTop:4 }}>Owners: {vessel.owners}</div>}
              {vessel.dry_dock_due && (
                <div style={{ fontSize:14, marginTop:4, color: new Date(vessel.dry_dock_due)<new Date()?"#DC2626":"#6B7280" }}>
                  Dry dock due: {fmt(vessel.dry_dock_due)}
                  {new Date(vessel.dry_dock_due)<new Date() && <span style={{ marginLeft:6, fontWeight:600 }}>⚠ OVERDUE</span>}
                </div>
              )}
            </div>
            <div style={{ display:"flex", gap:10 }}>
              {latestScore != null && (
                <div style={{ textAlign:"center", background:"#F9FAFB", borderRadius:8, padding:"10px 16px" }}>
                  <div style={{ fontSize:32, fontWeight:700, color: latestScore>=85?"#065F46":latestScore>=65?"#92400E":"#DC2626" }}>{latestScore}</div>
                  <div style={{ fontSize:12, color:"#9CA3AF" }}>Latest score</div>
                </div>
              )}
              <Link href={`/inspections/new?vessel=${vessel.id}`} style={{ padding:"8px 16px", background:NAV, color:"#fff", borderRadius:7, fontSize:15, textDecoration:"none", display:"flex", alignItems:"center" }}>
                + New Inspection
              </Link>
            </div>
          </div>
        </div>

        {/* Score trend */}
        {inspections.filter(i=>i.overall_score!=null).length > 1 && (
          <div style={{ background:"#fff", borderRadius:10, border:"1px solid #E5E7EB", padding:"1.25rem", marginBottom:"1rem" }}>
            <h2 style={{ fontSize:15, fontWeight:600, color:"#1A2533", marginBottom:12 }}>Score History</h2>
            <div style={{ display:"flex", alignItems:"flex-end", gap:8, height:80 }}>
              {inspections.filter(i=>i.overall_score!=null).reverse().map((insp,i)=>{
                const grade=insp.overall_score>=85?"GOOD":insp.overall_score>=65?"FAIR":insp.overall_score>=40?"POOR":"ACTION_REQUIRED";
                return (
                  <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:GRADE_COLOR[grade] }}>{insp.overall_score}</div>
                    <div style={{ width:"100%", background:GRADE_COLOR[grade], borderRadius:"3px 3px 0 0", height:`${insp.overall_score*0.7}px`, maxHeight:70 }} />
                    <div style={{ fontSize:11, color:"#9CA3AF", whiteSpace:"nowrap" }}>{fmt(insp.started_at??insp.created_at)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Inspection history table */}
        <div style={{ background:"#fff", borderRadius:10, border:"1px solid #E5E7EB", overflow:"hidden" }}>
          <div style={{ padding:"10px 16px", background:"#F9FAFB", borderBottom:"1px solid #E5E7EB", display:"flex", justifyContent:"space-between" }}>
            <h2 style={{ fontSize:15, fontWeight:600, margin:0 }}>Inspection History ({inspections.length})</h2>
          </div>
          {inspections.length === 0 ? (
            <div style={{ padding:"3rem", textAlign:"center", color:"#9CA3AF", fontSize:15 }}>
              No inspections yet. <Link href={`/inspections/new?vessel=${vessel.id}`} style={{ color:TEAL }}>Start the first inspection →</Link>
            </div>
          ) : (
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:15 }}>
              <thead>
                <tr style={{ background:"#F9FAFB" }}>
                  {["Type","Date","Port","Inspector","Score","Deficiencies","Status",""].map(h=>(
                    <th key={h} style={{ padding:"8px 12px", textAlign:"left", fontWeight:500, color:"#6B7280", fontSize:13, textTransform:"uppercase", letterSpacing:"0.04em", whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {inspections.map((insp,i)=>(
                  <tr key={insp.id} style={{ borderTop:"1px solid #F3F4F6", background:i%2===0?"#fff":"#FAFAFA" }}>
                    <td style={{ padding:"9px 12px" }}>
                      <span style={{ padding:"2px 8px", borderRadius:20, fontSize:13, fontWeight:500, background:insp.inspection_type==="PRE_PURCHASE"?"#FEF3C7":"#E0F2FE", color:insp.inspection_type==="PRE_PURCHASE"?"#92400E":"#0369A1" }}>
                        {insp.inspection_type==="PRE_PURCHASE"?"Pre-Purchase":"Condition"}
                      </span>
                    </td>
                    <td style={{ padding:"9px 12px", color:"#6B7280", whiteSpace:"nowrap" }}>{fmt(insp.started_at??insp.created_at)}</td>
                    <td style={{ padding:"9px 12px", color:"#6B7280" }}>{insp.port||"—"}</td>
                    <td style={{ padding:"9px 12px", color:"#6B7280" }}>{insp.inspector_name||"—"}</td>
                    <td style={{ padding:"9px 12px" }}>
                      {insp.overall_score != null ? (
                        <span style={{ fontWeight:700, color:insp.overall_score>=85?GRADE_COLOR.GOOD:insp.overall_score>=65?GRADE_COLOR.FAIR:GRADE_COLOR.ACTION_REQUIRED }}>
                          {insp.overall_score}/100
                        </span>
                      ) : <span style={{ color:"#D1D5DB" }}>—</span>}
                    </td>
                    <td style={{ padding:"9px 12px", textAlign:"center" }}>
                      {insp.deficiencies > 0 ? <span style={{ padding:"2px 8px", borderRadius:20, fontSize:13, fontWeight:600, background:"#FEE2E2", color:"#DC2626" }}>{insp.deficiencies}</span> : "0"}
                    </td>
                    <td style={{ padding:"9px 12px" }}>
                      <span style={{ padding:"2px 8px", borderRadius:20, fontSize:13, fontWeight:500, background:STATUS_BG[insp.status??"DRAFT"], color:STATUS_COLOR[insp.status??"DRAFT"] }}>
                        {(insp.status??"DRAFT").replace("_"," ")}
                      </span>
                    </td>
                    <td style={{ padding:"9px 12px", whiteSpace:"nowrap" }}>
                      <Link href={`/inspections/${insp.id}`} style={{ padding:"3px 10px", background:TEAL, color:"#fff", borderRadius:5, fontSize:14, textDecoration:"none" }}>View →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
