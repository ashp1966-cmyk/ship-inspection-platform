"use client";
import { useState } from "react";
import Link from "next/link";

const VESSEL_TYPES: Record<string, string> = {
  BULK_CARRIER:"Bulk Carrier", CONTAINER_SHIP:"Container Ship",
  OIL_TANKER:"Oil Tanker", LNG_CARRIER:"LNG Carrier",
  GENERAL_CARGO:"General Cargo", LPG_TANKER:"LPG Tanker", CRUISE_SHIP:"Cruise Ship",
};
const NAV = "#0A1628", TEAL = "#1BA5C0";

interface Vessel {
  id:string; name:string; imo_number:string; vessel_type:string;
  flag:string; class_society:string; dwt:number; dry_dock_due:string;
  owners:string; managers:string; main_engine_make:string; main_engine_model:string;
}

export default function VesselsList({ vessels: initial }: { vessels: Vessel[] }) {
  const [vessels, setVessels] = useState<Vessel[]>(initial);
  const [search, setSearch]   = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing]  = useState<Vessel | null>(null);
  const [saving, setSaving]    = useState(false);
  const [form, setForm] = useState({
    name:"", imo_number:"", vessel_type:"BULK_CARRIER", flag:"",
    port_of_registry:"", class_society:"", date_of_delivery:"",
    owners:"", managers:"", dwt:"", gt:"",
    main_engine_make:"", main_engine_model:"", total_power_kw:"",
    capacity_note:"", dry_dock_due:"",
  });

  function openAdd() {
    setEditing(null);
    setForm({ name:"", imo_number:"", vessel_type:"BULK_CARRIER", flag:"",
      port_of_registry:"", class_society:"", date_of_delivery:"",
      owners:"", managers:"", dwt:"", gt:"",
      main_engine_make:"", main_engine_model:"", total_power_kw:"",
      capacity_note:"", dry_dock_due:"" });
    setShowForm(true);
  }
  function openEdit(v: Vessel) {
    setEditing(v);
    setForm({ ...v, dwt: String(v.dwt??''), gt: String((v as any).gt??''),
      total_power_kw: String((v as any).total_power_kw??''),
      date_of_delivery: (v as any).date_of_delivery ?? '',
      port_of_registry: (v as any).port_of_registry ?? '',
      capacity_note: (v as any).capacity_note ?? '',
    } as any);
    setShowForm(true);
  }

  async function saveVessel() {
    setSaving(true);
    try {
      const method = editing ? "PUT" : "POST";
      const url    = editing ? `/api/vessels/${editing.id}` : "/api/vessels";
      const res = await fetch(url, { method, headers:{"Content-Type":"application/json"}, body: JSON.stringify(form) });
      const saved = await res.json();
      if (editing) {
        setVessels(prev => prev.map(v => v.id === saved.id ? saved : v));
      } else {
        setVessels(prev => [...prev, saved]);
      }
      setShowForm(false);
    } finally { setSaving(false); }
  }

  async function deleteVessel(id: string) {
    if (!confirm("Delete this vessel? This will also delete all its inspections.")) return;
    await fetch(`/api/vessels/${id}`, { method:"DELETE" });
    setVessels(prev => prev.filter(v => v.id !== id));
  }

  const filtered = vessels.filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.imo_number?.includes(search) ||
    VESSEL_TYPES[v.vessel_type]?.toLowerCase().includes(search.toLowerCase())
  );

  const F = (label: string, key: string, type = "text", opts?: string[]) => (
    <div style={{ marginBottom:10 }}>
      <label style={{ fontSize:11, fontWeight:500, color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:3 }}>{label}</label>
      {opts ? (
        <select value={(form as any)[key]} onChange={e => setForm(f => ({...f,[key]:e.target.value}))}
          style={{ width:"100%", padding:"7px 10px", border:"1px solid #D1D5DB", borderRadius:6, fontSize:13 }}>
          {opts.map(o => <option key={o} value={o}>{VESSEL_TYPES[o]??o}</option>)}
        </select>
      ) : (
        <input type={type} value={(form as any)[key]} onChange={e => setForm(f => ({...f,[key]:e.target.value}))}
          style={{ width:"100%", padding:"7px 10px", border:"1px solid #D1D5DB", borderRadius:6, fontSize:13 }} />
      )}
    </div>
  );

  return (
    <div style={{ fontFamily:"system-ui,sans-serif", background:"#F4F2EE", minHeight:"100vh" }}>
      <div style={{ maxWidth:1100, margin:"0 auto", padding:"1.5rem 1rem" }}>
        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"1.25rem" }}>
          <div>
            <h1 style={{ fontSize:20, fontWeight:600, color:"#1A2533", margin:0 }}>Fleet Registry</h1>
            <p style={{ fontSize:12, color:"#6B7280", marginTop:2 }}>{vessels.length} vessel{vessels.length!==1?"s":""} registered</p>
          </div>
          <button onClick={openAdd} style={{ background:NAV, color:"#fff", padding:"8px 18px", borderRadius:7, fontSize:13, fontWeight:500, border:"none", cursor:"pointer" }}>
            + Add Vessel
          </button>
        </div>

        {/* Search */}
        <input placeholder="Search by name, IMO or type…" value={search} onChange={e => setSearch(e.target.value)}
          style={{ width:"100%", padding:"9px 14px", border:"1px solid #D1D5DB", borderRadius:8, fontSize:13, marginBottom:"1rem", background:"#fff" }} />

        {/* Table */}
        <div style={{ background:"#fff", borderRadius:10, border:"1px solid #E5E7EB", overflow:"hidden" }}>
          {filtered.length === 0 ? (
            <div style={{ padding:"3rem", textAlign:"center", color:"#9CA3AF", fontSize:13 }}>
              {search ? "No vessels match your search." : "No vessels yet — add your first vessel above."}
            </div>
          ) : (
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
              <thead>
                <tr style={{ background:"#F9FAFB" }}>
                  {["Vessel Name","IMO","Type","Flag","Class","DWT","Dry Dock Due","Owners","Actions"].map(h => (
                    <th key={h} style={{ padding:"9px 12px", textAlign:"left", fontWeight:500, color:"#6B7280", fontSize:11, textTransform:"uppercase", letterSpacing:"0.04em", whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((v, i) => (
                  <tr key={v.id} style={{ borderTop:"1px solid #F3F4F6", background:i%2===0?"#fff":"#FAFAFA" }}>
                    <td style={{ padding:"9px 12px", fontWeight:600, color:"#1A2533" }}>{v.name}</td>
                    <td style={{ padding:"9px 12px", color:"#6B7280", fontFamily:"monospace" }}>{v.imo_number}</td>
                    <td style={{ padding:"9px 12px" }}>
                      <span style={{ padding:"2px 8px", borderRadius:20, fontSize:11, background:"#E0F2FE", color:"#0369A1", fontWeight:500 }}>
                        {VESSEL_TYPES[v.vessel_type] ?? v.vessel_type}
                      </span>
                    </td>
                    <td style={{ padding:"9px 12px", color:"#6B7280" }}>{v.flag ?? "—"}</td>
                    <td style={{ padding:"9px 12px", color:"#6B7280" }}>{v.class_society ?? "—"}</td>
                    <td style={{ padding:"9px 12px", color:"#6B7280" }}>{v.dwt ? Number(v.dwt).toLocaleString() : "—"}</td>
                    <td style={{ padding:"9px 12px", color: v.dry_dock_due && new Date(v.dry_dock_due) < new Date() ? "#DC2626" : "#6B7280", whiteSpace:"nowrap" }}>
                      {v.dry_dock_due ? new Date(v.dry_dock_due).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}) : "—"}
                    </td>
                    <td style={{ padding:"9px 12px", color:"#6B7280", maxWidth:160, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{v.owners ?? "—"}</td>
                    <td style={{ padding:"9px 12px", whiteSpace:"nowrap" }}>
                      <button onClick={() => openEdit(v)} style={{ padding:"3px 10px", background:"#F3F4F6", border:"none", borderRadius:5, fontSize:12, cursor:"pointer", marginRight:6 }}>Edit</button>
                      <Link href={`/inspections/new?vessel=${v.id}`} style={{ padding:"3px 10px", background:TEAL, color:"#fff", borderRadius:5, fontSize:12, textDecoration:"none" }}>Inspect</Link>
                      <button onClick={() => deleteVessel(v.id)} style={{ padding:"3px 8px", background:"#FEE2E2", color:"#DC2626", border:"none", borderRadius:5, fontSize:12, cursor:"pointer", marginLeft:6 }}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add/Edit modal */}
      {showForm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:50, padding:"1rem" }}>
          <div style={{ background:"#fff", borderRadius:12, width:"100%", maxWidth:640, maxHeight:"90vh", overflow:"auto", padding:"1.5rem" }}>
            <h2 style={{ fontSize:16, fontWeight:600, color:"#1A2533", marginBottom:"1.25rem" }}>
              {editing ? "Edit Vessel" : "Add New Vessel"}
            </h2>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 1rem" }}>
              {F("Vessel Name *", "name")}
              {F("IMO Number *", "imo_number")}
              {F("Vessel Type *", "vessel_type", "text", Object.keys(VESSEL_TYPES))}
              {F("Flag", "flag")}
              {F("Port of Registry", "port_of_registry")}
              {F("Classification Society", "class_society")}
              {F("Date of Delivery", "date_of_delivery", "date")}
              {F("DWT", "dwt", "number")}
              {F("Gross Tonnage (GT)", "gt", "number")}
              {F("Owners", "owners")}
              {F("Managers", "managers")}
              {F("Main Engine Make", "main_engine_make")}
              {F("Main Engine Model", "main_engine_model")}
              {F("Total Power (kW)", "total_power_kw", "number")}
              {F("Capacity Note", "capacity_note")}
              {F("Dry Dock Due", "dry_dock_due", "date")}
            </div>
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginTop:"1rem" }}>
              <button onClick={() => setShowForm(false)} style={{ padding:"8px 18px", background:"#F3F4F6", border:"none", borderRadius:7, fontSize:13, cursor:"pointer" }}>Cancel</button>
              <button onClick={saveVessel} disabled={saving} style={{ padding:"8px 20px", background:NAV, color:"#fff", border:"none", borderRadius:7, fontSize:13, fontWeight:500, cursor:"pointer" }}>
                {saving ? "Saving…" : editing ? "Save Changes" : "Add Vessel"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
