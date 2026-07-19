"use client";
import { useState } from "react";
import Link from "next/link";
const TEAL="#1BA5C0", NAV="#0A1628";
const TYPES:Record<string,string>={BULK_CARRIER:"Bulk Carrier",CONTAINER_SHIP:"Container Ship",OIL_TANKER:"Oil Tanker",LNG_CARRIER:"LNG Carrier",GENERAL_CARGO:"General Cargo",LPG_TANKER:"LPG Tanker",CRUISE_SHIP:"Cruise Ship"};
const GRADE_COLOR:Record<string,string>={GOOD:"#065F46",FAIR:"#92400E",POOR:"#C2410C",ACTION_REQUIRED:"#DC2626"};
const STATUS_COLOR:Record<string,string>={DRAFT:"#6B7280",IN_PROGRESS:"#D97706",COMPLETED:"#2563EB",ISSUED:"#059669"};
const STATUS_BG:Record<string,string>={DRAFT:"#F3F4F6",IN_PROGRESS:"#FEF3C7",COMPLETED:"#EFF6FF",ISSUED:"#ECFDF5"};
const fmt=(d:string)=>d?new Date(d).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}):"—";

export default function ReportsList({ inspections }: { inspections: any[] }) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const filtered = inspections
    .filter(i=>(i.vessel_name??'').toLowerCase().includes(search.toLowerCase())||(i.imo_number??'').includes(search))
    .filter(i=>typeFilter==="ALL"||i.inspection_type===typeFilter)
    .filter(i=>statusFilter==="ALL"||i.status===statusFilter);

  return (
    <div style={{ fontFamily:"system-ui,sans-serif", background:"#F4F2EE", minHeight:"100vh" }}>
      <div style={{ maxWidth:1100, margin:"0 auto", padding:"1.5rem 1rem" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"1.25rem" }}>
          <div>
            <h1 style={{ fontSize:23, fontWeight:600, color:"#1A2533", margin:0 }}>Inspection Reports</h1>
            <p style={{ fontSize:14, color:"#6B7280", marginTop:2 }}>{inspections.length} total inspections</p>
          </div>
          <Link href="/inspections/new" style={{ background:NAV, color:"#fff", padding:"8px 18px", borderRadius:7, fontSize:15, fontWeight:500, textDecoration:"none" }}>
            + New Inspection
          </Link>
        </div>

        <div style={{ display:"flex", gap:10, marginBottom:"1rem", flexWrap:"wrap" }}>
          <input placeholder="Search by vessel or IMO…" value={search} onChange={e=>setSearch(e.target.value)}
            style={{ flex:1, minWidth:200, padding:"9px 14px", border:"1px solid #D1D5DB", borderRadius:8, fontSize:15, background:"#fff" }} />
          <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}
            style={{ padding:"9px 14px", border:"1px solid #D1D5DB", borderRadius:8, fontSize:15, background:"#fff" }}>
            <option value="ALL">All types</option>
            <option value="CONDITION">Condition</option>
            <option value="PRE_PURCHASE">Pre-Purchase</option>
          </select>
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}
            style={{ padding:"9px 14px", border:"1px solid #D1D5DB", borderRadius:8, fontSize:15, background:"#fff" }}>
            <option value="ALL">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="ISSUED">Issued</option>
          </select>
        </div>

        <div style={{ background:"#fff", borderRadius:10, border:"1px solid #E5E7EB", overflow:"hidden" }}>
          {filtered.length===0 ? (
            <div style={{ padding:"3rem", textAlign:"center", color:"#9CA3AF", fontSize:15 }}>No reports found.</div>
          ) : (
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:15 }}>
              <thead>
                <tr style={{ background:"#F9FAFB" }}>
                  {["Vessel","Type","Inspection","Date","Inspector","Score","Deficiencies","Status","Actions"].map(h=>(
                    <th key={h} style={{ padding:"9px 12px", textAlign:"left", fontWeight:500, color:"#6B7280", fontSize:13, textTransform:"uppercase", letterSpacing:"0.04em", whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r,i)=>(
                  <tr key={r.id} style={{ borderTop:"1px solid #F3F4F6", background:i%2===0?"#fff":"#FAFAFA" }}>
                    <td style={{ padding:"9px 12px" }}>
                      <div style={{ fontWeight:600, color:"#1A2533" }}>{r.vessel_name??'Unknown'}</div>
                      <div style={{ fontSize:13, color:"#9CA3AF" }}>{r.imo_number??''}</div>
                    </td>
                    <td style={{ padding:"9px 12px", color:"#6B7280" }}>{TYPES[r.vessel_type]??r.vessel_type??'—'}</td>
                    <td style={{ padding:"9px 12px" }}>
                      <span style={{ padding:"2px 8px", borderRadius:20, fontSize:13, fontWeight:500, background:r.inspection_type==="PRE_PURCHASE"?"#FEF3C7":"#E0F2FE", color:r.inspection_type==="PRE_PURCHASE"?"#92400E":"#0369A1" }}>
                        {r.inspection_type==="PRE_PURCHASE"?"Pre-Purchase":"Condition"}
                      </span>
                    </td>
                    <td style={{ padding:"9px 12px", color:"#6B7280", whiteSpace:"nowrap" }}>{fmt(r.started_at??r.created_at)}</td>
                    <td style={{ padding:"9px 12px", color:"#6B7280" }}>{r.inspector_name??'—'}</td>
                    <td style={{ padding:"9px 12px" }}>
                      {r.overall_score!=null ? (
                        <span style={{ fontWeight:700, color:r.overall_score>=85?GRADE_COLOR.GOOD:r.overall_score>=65?GRADE_COLOR.FAIR:GRADE_COLOR.ACTION_REQUIRED }}>
                          {r.overall_score}/100
                        </span>
                      ) : <span style={{ color:"#D1D5DB" }}>—</span>}
                    </td>
                    <td style={{ padding:"9px 12px", textAlign:"center" }}>
                      {r.deficiencies>0 ? <span style={{ padding:"2px 8px", borderRadius:20, fontSize:13, fontWeight:600, background:"#FEE2E2", color:"#DC2626" }}>{r.deficiencies}</span> : "0"}
                    </td>
                    <td style={{ padding:"9px 12px" }}>
                      <span style={{ padding:"2px 8px", borderRadius:20, fontSize:13, fontWeight:500, background:STATUS_BG[r.status??"DRAFT"], color:STATUS_COLOR[r.status??"DRAFT"] }}>
                        {(r.status??"DRAFT").replace("_"," ")}
                      </span>
                    </td>
                    <td style={{ padding:"9px 12px", whiteSpace:"nowrap", display:"flex", gap:4 }}>
                      <Link href={`/inspections/${r.id}`} style={{ padding:"3px 10px", background:TEAL, color:"#fff", borderRadius:5, fontSize:14, textDecoration:"none" }}>View</Link>
                      {r.vessel_id && <Link href={`/vessels/${r.vessel_id}`} style={{ padding:"3px 8px", background:"#F3F4F6", color:"#374151", borderRadius:5, fontSize:14, textDecoration:"none" }}>History</Link>}
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
