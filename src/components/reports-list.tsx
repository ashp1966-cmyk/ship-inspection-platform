"use client";
import { useState } from "react";
import Link from "next/link";
const TEAL="#1BA5C0";
const TYPES:Record<string,string>={BULK_CARRIER:"Bulk Carrier",CONTAINER_SHIP:"Container Ship",OIL_TANKER:"Oil Tanker",LNG_CARRIER:"LNG Carrier",GENERAL_CARGO:"General Cargo",LPG_TANKER:"LPG Tanker",CRUISE_SHIP:"Cruise Ship"};
const fmt=(d:string)=>d?new Date(d).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}):"—";

export default function ReportsList({ inspections }: { inspections: any[] }) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const filtered = inspections.filter(i =>
    (i.vessel_name??'').toLowerCase().includes(search.toLowerCase()) ||
    (i.imo_number??'').includes(search)
  ).filter(i => typeFilter==="ALL" || i.inspection_type===typeFilter);

  return (
    <div style={{ fontFamily:"system-ui,sans-serif", background:"#F4F2EE", minHeight:"100vh" }}>
      <div style={{ maxWidth:1100, margin:"0 auto", padding:"1.5rem 1rem" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"1.25rem" }}>
          <div>
            <h1 style={{ fontSize:20, fontWeight:600, color:"#1A2533", margin:0 }}>Inspection Reports</h1>
            <p style={{ fontSize:12, color:"#6B7280", marginTop:2 }}>{inspections.length} total inspections</p>
          </div>
          <Link href="/inspections/new" style={{ background:"#0A1628", color:"#fff", padding:"8px 18px", borderRadius:7, fontSize:13, fontWeight:500, textDecoration:"none" }}>
            + New Inspection
          </Link>
        </div>

        <div style={{ display:"flex", gap:10, marginBottom:"1rem" }}>
          <input placeholder="Search by vessel name or IMO…" value={search} onChange={e=>setSearch(e.target.value)}
            style={{ flex:1, padding:"9px 14px", border:"1px solid #D1D5DB", borderRadius:8, fontSize:13, background:"#fff" }} />
          <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}
            style={{ padding:"9px 14px", border:"1px solid #D1D5DB", borderRadius:8, fontSize:13, background:"#fff" }}>
            <option value="ALL">All types</option>
            <option value="CONDITION">Condition</option>
            <option value="PRE_PURCHASE">Pre-Purchase</option>
          </select>
        </div>

        <div style={{ background:"#fff", borderRadius:10, border:"1px solid #E5E7EB", overflow:"hidden" }}>
          {filtered.length===0 ? (
            <div style={{ padding:"3rem", textAlign:"center", color:"#9CA3AF", fontSize:13 }}>No reports found.</div>
          ) : (
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
              <thead>
                <tr style={{ background:"#F9FAFB" }}>
                  {["Vessel","IMO","Type","Inspection","Date","Inspector","Items","Deficiencies","Actions"].map(h=>(
                    <th key={h} style={{ padding:"9px 12px", textAlign:"left", fontWeight:500, color:"#6B7280", fontSize:11, textTransform:"uppercase", letterSpacing:"0.04em", whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r,i)=>(
                  <tr key={r.id} style={{ borderTop:"1px solid #F3F4F6", background:i%2===0?"#fff":"#FAFAFA" }}>
                    <td style={{ padding:"9px 12px", fontWeight:600, color:"#1A2533" }}>{r.vessel_name??'Unknown'}</td>
                    <td style={{ padding:"9px 12px", color:"#6B7280", fontFamily:"monospace" }}>{r.imo_number??'—'}</td>
                    <td style={{ padding:"9px 12px", color:"#6B7280" }}>{TYPES[r.vessel_type]??r.vessel_type??'—'}</td>
                    <td style={{ padding:"9px 12px" }}>
                      <span style={{ padding:"2px 8px", borderRadius:20, fontSize:11, fontWeight:500, background: r.inspection_type==="PRE_PURCHASE"?"#FEF3C7":"#E0F2FE", color: r.inspection_type==="PRE_PURCHASE"?"#92400E":"#0369A1" }}>
                        {r.inspection_type==="PRE_PURCHASE"?"Pre-Purchase":"Condition"}
                      </span>
                    </td>
                    <td style={{ padding:"9px 12px", color:"#6B7280", whiteSpace:"nowrap" }}>{fmt(r.started_at??r.created_at)}</td>
                    <td style={{ padding:"9px 12px", color:"#6B7280" }}>{r.inspector_name??'—'}</td>
                    <td style={{ padding:"9px 12px", color:"#6B7280", textAlign:"center" }}>{r.total_items}</td>
                    <td style={{ padding:"9px 12px", textAlign:"center" }}>
                      {r.deficiencies > 0 ? (
                        <span style={{ padding:"2px 8px", borderRadius:20, fontSize:11, fontWeight:600, background:"#FEE2E2", color:"#DC2626" }}>{r.deficiencies}</span>
                      ) : <span style={{ color:"#6B7280" }}>0</span>}
                    </td>
                    <td style={{ padding:"9px 12px", whiteSpace:"nowrap" }}>
                      <Link href={`/reports/${r.id}`} style={{ padding:"3px 10px", background:TEAL, color:"#fff", borderRadius:5, fontSize:12, textDecoration:"none", marginRight:4 }}>View</Link>
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
