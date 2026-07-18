"use client";

import { useState } from "react";
import Link from "next/link";

interface Stats {
  vessels: number; inspections: number;
  openDeficiencies: number; thisMonth: number;
}
interface RecentInspection {
  id: string; vessel_name: string; vessel_type: string;
  inspection_type: string; status: string; inspector_name: string;
  started_at: string; overall_grade: string; created_at: string;
}
interface Deficiency {
  id: string; prompt: string; section_code: string; grade_value: string;
  deficiency_status: string; deficiency_action: string; remarks: string;
  vessel_name: string; vessel_type: string; started_at: string; inspection_type: string;
}

const GRADE_STYLE: Record<string, string> = {
  POOR:           "background:#FEF3C7;color:#92400E",
  ACTION_REQUIRED:"background:#FEE2E2;color:#991B1B",
};
const STATUS_STYLE: Record<string, string> = {
  OPEN:        "background:#FEE2E2;color:#991B1B",
  IN_PROGRESS: "background:#FEF3C7;color:#92400E",
  CLOSED:      "background:#D1FAE5;color:#065F46",
};
const STATUS_LABEL: Record<string, string> = {
  OPEN:"Open", IN_PROGRESS:"In Progress", CLOSED:"Closed",
};
const TYPE_LABEL: Record<string, string> = {
  BULK_CARRIER:"Bulk Carrier", CONTAINER_SHIP:"Container",
  OIL_TANKER:"Oil Tanker", LNG_CARRIER:"LNG",
  GENERAL_CARGO:"General Cargo", LPG_TANKER:"LPG", CRUISE_SHIP:"Cruise",
};

function fmt(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" });
}

const NAV = "#0A1628";
const TEAL = "#1BA5C0";

export default function DashboardOverview({ stats, recentInspections, deficiencies }: {
  stats: Stats; recentInspections: RecentInspection[]; deficiencies: Deficiency[];
}) {
  const [defs, setDefs]           = useState<Deficiency[]>(deficiencies);
  const [activeTab, setActiveTab] = useState<"all"|"open"|"in_progress"|"closed">("open");
  const [actionId, setActionId]   = useState<string|null>(null);
  const [actionText, setActionText] = useState("");

  const visibleDefs = defs.filter(d => {
    if (activeTab === "all")         return true;
    if (activeTab === "open")        return !d.deficiency_status || d.deficiency_status === "OPEN";
    if (activeTab === "in_progress") return d.deficiency_status === "IN_PROGRESS";
    return d.deficiency_status === "CLOSED";
  });

  async function updateStatus(id: string, status: string, action?: string) {
    await fetch(`/api/deficiencies/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deficiency_status: status, deficiency_action: action ?? "" }),
    });
    setDefs(prev => prev.map(d => d.id === id
      ? { ...d, deficiency_status: status, deficiency_action: action ?? d.deficiency_action }
      : d
    ));
    setActionId(null);
    setActionText("");
  }

  const statCards = [
    { label: "Vessels in fleet",    value: stats.vessels,          icon: "🚢", accent: TEAL },
    { label: "Total inspections",   value: stats.inspections,      icon: "📋", accent: "#2563EB" },
    { label: "Open deficiencies",   value: stats.openDeficiencies, icon: "⚠️", accent: "#DC2626" },
    { label: "Inspections this month", value: stats.thisMonth,     icon: "📅", accent: "#059669" },
  ];

  return (
    <div style={{ fontFamily:"system-ui,-apple-system,sans-serif", background:"#F4F2EE", minHeight:"100vh" }}>
      <div style={{ maxWidth:1200, margin:"0 auto", padding:"1.5rem 1rem" }}>

        {/* ── Page header ─────────────────────────────────────────── */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"1.5rem" }}>
          <div>
            <h1 style={{ fontSize:20, fontWeight:600, color:"#1A2533", margin:0 }}>Dashboard</h1>
            <p style={{ fontSize:12, color:"#6B7280", marginTop:2 }}>Fleet condition overview and deficiency tracking</p>
          </div>
          <Link href="/inspections/new" style={{
            background: NAV, color:"#fff", padding:"8px 18px",
            borderRadius:7, fontSize:13, fontWeight:500,
            textDecoration:"none", display:"inline-flex", alignItems:"center", gap:6,
          }}>
            + New Inspection
          </Link>
        </div>

        {/* ── Stat cards ──────────────────────────────────────────── */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))", gap:12, marginBottom:"1.5rem" }}>
          {statCards.map(c => (
            <div key={c.label} style={{
              background:"#fff", borderRadius:10, padding:"1.1rem 1.25rem",
              border:"1px solid #E5E7EB",
            }}>
              <div style={{ fontSize:22, marginBottom:6 }}>{c.icon}</div>
              <div style={{ fontSize:28, fontWeight:700, color: c.accent, lineHeight:1 }}>{c.value}</div>
              <div style={{ fontSize:12, color:"#6B7280", marginTop:5 }}>{c.label}</div>
            </div>
          ))}
        </div>

        {/* ── Recent inspections ──────────────────────────────────── */}
        <div style={{ background:"#fff", borderRadius:10, border:"1px solid #E5E7EB", marginBottom:"1.5rem", overflow:"hidden" }}>
          <div style={{ padding:"1rem 1.25rem", borderBottom:"1px solid #F3F4F6", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <h2 style={{ fontSize:14, fontWeight:600, color:"#1A2533", margin:0 }}>Recent Inspections</h2>
            <Link href="/inspections/new" style={{ fontSize:12, color:TEAL, textDecoration:"none" }}>Start new →</Link>
          </div>
          {recentInspections.length === 0 ? (
            <div style={{ padding:"2.5rem", textAlign:"center", color:"#9CA3AF", fontSize:13 }}>
              No inspections yet — <Link href="/inspections/new" style={{ color:TEAL }}>start your first one</Link>
            </div>
          ) : (
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <thead>
                  <tr style={{ background:"#F9FAFB" }}>
                    {["Vessel","Type","Inspection","Inspector","Date","Status","Grade"].map(h => (
                      <th key={h} style={{ padding:"8px 12px", textAlign:"left", fontWeight:500, color:"#6B7280", fontSize:11, textTransform:"uppercase", letterSpacing:"0.05em", whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentInspections.map((r, i) => (
                    <tr key={r.id} style={{ borderTop:"1px solid #F3F4F6", background: i%2===0?"#fff":"#FAFAFA" }}>
                      <td style={{ padding:"9px 12px", fontWeight:500, color:"#1A2533" }}>{r.vessel_name}</td>
                      <td style={{ padding:"9px 12px", color:"#6B7280" }}>{TYPE_LABEL[r.vessel_type] ?? r.vessel_type}</td>
                      <td style={{ padding:"9px 12px", color:"#6B7280" }}>{r.inspection_type === "CONDITION" ? "Condition" : "Pre-Purchase"}</td>
                      <td style={{ padding:"9px 12px", color:"#6B7280" }}>{r.inspector_name ?? "—"}</td>
                      <td style={{ padding:"9px 12px", color:"#6B7280", whiteSpace:"nowrap" }}>{fmt(r.started_at ?? r.created_at)}</td>
                      <td style={{ padding:"9px 12px" }}>
                        <span style={{ padding:"2px 8px", borderRadius:20, fontSize:11, fontWeight:500, background:"#E0F2FE", color:"#0369A1" }}>
                          {r.status ?? "Draft"}
                        </span>
                      </td>
                      <td style={{ padding:"9px 12px", color:"#6B7280" }}>{r.overall_grade ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Deficiency tracker ──────────────────────────────────── */}
        <div style={{ background:"#fff", borderRadius:10, border:"1px solid #E5E7EB", overflow:"hidden" }}>
          <div style={{ padding:"1rem 1.25rem", borderBottom:"1px solid #F3F4F6" }}>
            <h2 style={{ fontSize:14, fontWeight:600, color:"#1A2533", margin:0, marginBottom:10 }}>Deficiency Tracker</h2>
            {/* Filter tabs */}
            <div style={{ display:"flex", gap:4 }}>
              {(["open","in_progress","closed","all"] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{
                  padding:"4px 12px", borderRadius:20, fontSize:12, border:"none", cursor:"pointer",
                  fontWeight: activeTab===tab ? 600 : 400,
                  background: activeTab===tab ? NAV : "#F3F4F6",
                  color: activeTab===tab ? "#fff" : "#6B7280",
                }}>
                  {tab === "in_progress" ? "In Progress" : tab.charAt(0).toUpperCase() + tab.slice(1)}
                  {tab !== "all" && (
                    <span style={{ marginLeft:5, opacity:0.75 }}>
                      ({defs.filter(d =>
                        tab === "open" ? (!d.deficiency_status || d.deficiency_status === "OPEN")
                        : d.deficiency_status === tab.toUpperCase()
                      ).length})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {visibleDefs.length === 0 ? (
            <div style={{ padding:"2.5rem", textAlign:"center", color:"#9CA3AF", fontSize:13 }}>
              {activeTab === "open"
                ? "No open deficiencies — all clear! ✅"
                : "No deficiencies in this category."}
            </div>
          ) : (
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <thead>
                  <tr style={{ background:"#F9FAFB" }}>
                    {["Deficiency","Vessel","Section","Grade","Status","Action / Remarks","Update"].map(h => (
                      <th key={h} style={{ padding:"8px 12px", textAlign:"left", fontWeight:500, color:"#6B7280", fontSize:11, textTransform:"uppercase", letterSpacing:"0.05em", whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleDefs.map((d, i) => (
                    <tr key={d.id} style={{ borderTop:"1px solid #F3F4F6", background: i%2===0?"#fff":"#FAFAFA", verticalAlign:"top" }}>
                      <td style={{ padding:"9px 12px", maxWidth:280 }}>
                        <div style={{ fontWeight:500, color:"#1A2533", lineHeight:1.4 }}>{d.prompt}</div>
                        <div style={{ fontSize:11, color:"#9CA3AF", marginTop:2 }}>{fmt(d.started_at)}</div>
                      </td>
                      <td style={{ padding:"9px 12px", color:"#6B7280", whiteSpace:"nowrap" }}>
                        <div style={{ fontWeight:500, color:"#374151" }}>{d.vessel_name}</div>
                        <div style={{ fontSize:11, color:"#9CA3AF" }}>{TYPE_LABEL[d.vessel_type] ?? d.vessel_type}</div>
                      </td>
                      <td style={{ padding:"9px 12px", color:"#6B7280", fontSize:11 }}>{d.section_code}</td>
                      <td style={{ padding:"9px 12px" }}>
                        <span style={{ padding:"2px 8px", borderRadius:20, fontSize:11, fontWeight:600, ...(Object.fromEntries(GRADE_STYLE[d.grade_value]?.split(";").map(s => s.split(":")) ?? [])) }}>
                          {d.grade_value === "ACTION_REQUIRED" ? "Action Req." : d.grade_value}
                        </span>
                      </td>
                      <td style={{ padding:"9px 12px" }}>
                        <span style={{ padding:"2px 8px", borderRadius:20, fontSize:11, fontWeight:500, ...(Object.fromEntries((STATUS_STYLE[d.deficiency_status ?? "OPEN"] ?? STATUS_STYLE.OPEN).split(";").map(s => s.split(":")))) }}>
                          {STATUS_LABEL[d.deficiency_status ?? "OPEN"] ?? "Open"}
                        </span>
                      </td>
                      <td style={{ padding:"9px 12px", maxWidth:220, color:"#6B7280", fontSize:12 }}>
                        {actionId === d.id ? (
                          <input value={actionText} onChange={e => setActionText(e.target.value)}
                            placeholder="Describe corrective action…"
                            style={{ width:"100%", padding:"4px 8px", border:"1px solid #D1D5DB", borderRadius:5, fontSize:12 }} />
                        ) : (
                          <span>{d.deficiency_action || d.remarks || "—"}</span>
                        )}
                      </td>
                      <td style={{ padding:"9px 12px", whiteSpace:"nowrap" }}>
                        {actionId === d.id ? (
                          <div style={{ display:"flex", gap:4, flexDirection:"column" }}>
                            <button onClick={() => updateStatus(d.id, "IN_PROGRESS", actionText)}
                              style={{ padding:"3px 8px", background:"#FEF3C7", color:"#92400E", border:"none", borderRadius:5, fontSize:11, cursor:"pointer", fontWeight:500 }}>
                              In Progress
                            </button>
                            <button onClick={() => updateStatus(d.id, "CLOSED", actionText)}
                              style={{ padding:"3px 8px", background:"#D1FAE5", color:"#065F46", border:"none", borderRadius:5, fontSize:11, cursor:"pointer", fontWeight:500 }}>
                              Close
                            </button>
                            <button onClick={() => setActionId(null)}
                              style={{ padding:"3px 8px", background:"#F3F4F6", color:"#6B7280", border:"none", borderRadius:5, fontSize:11, cursor:"pointer" }}>
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => { setActionId(d.id); setActionText(d.deficiency_action ?? ""); }}
                            style={{ padding:"4px 10px", background: NAV, color:"#fff", border:"none", borderRadius:5, fontSize:11, cursor:"pointer", whiteSpace:"nowrap" }}>
                            Update →
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
