"use client";
import { useState } from "react";
const NAV="#0A1628", ROLE_COLOR:Record<string,string>={admin:"#DC2626",inspector:"#2563EB",viewer:"#6B7280"};

interface User { id:string; email:string; full_name:string; role:string; is_active:boolean; created_at:string; }

export default function UsersAdmin({ users: initial }: { users: User[] }) {
  const [users, setUsers] = useState<User[]>(initial);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<User|null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ email:"", full_name:"", role:"inspector", password:"", is_active:true });

  function openAdd() {
    setEditing(null);
    setForm({ email:"", full_name:"", role:"inspector", password:"", is_active:true });
    setShowForm(true);
  }
  function openEdit(u: User) {
    setEditing(u);
    setForm({ email:u.email, full_name:u.full_name, role:u.role, password:"", is_active:u.is_active });
    setShowForm(true);
  }

  async function saveUser() {
    setSaving(true);
    try {
      const method = editing ? "PUT" : "POST";
      const url    = editing ? `/api/users/${editing.id}` : "/api/users";
      const payload = editing
        ? { full_name:form.full_name, role:form.role, is_active:form.is_active, ...(form.password ? {password:form.password} : {}) }
        : form;
      const res = await fetch(url, { method, headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload) });
      const saved = await res.json();
      if (editing) { setUsers(prev => prev.map(u => u.id===saved.id||u.id===editing.id ? {...u,...saved} : u)); }
      else { setUsers(prev => [...prev, saved]); }
      setShowForm(false);
    } finally { setSaving(false); }
  }

  async function deleteUser(id: string) {
    if (!confirm("Delete this user?")) return;
    await fetch(`/api/users/${id}`, { method:"DELETE" });
    setUsers(prev => prev.filter(u => u.id!==id));
  }

  return (
    <div style={{ fontFamily:"system-ui,sans-serif", background:"#F4F2EE", minHeight:"100vh" }}>
      <div style={{ maxWidth:900, margin:"0 auto", padding:"1.5rem 1rem" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"1.25rem" }}>
          <div>
            <h1 style={{ fontSize:20, fontWeight:600, color:"#1A2533", margin:0 }}>User Management</h1>
            <p style={{ fontSize:12, color:"#6B7280", marginTop:2 }}>{users.length} user{users.length!==1?"s":""} · Roles: admin, inspector, viewer</p>
          </div>
          <button onClick={openAdd} style={{ background:NAV, color:"#fff", padding:"8px 18px", borderRadius:7, fontSize:13, fontWeight:500, border:"none", cursor:"pointer" }}>+ Add User</button>
        </div>

        <div style={{ background:"#fff", borderRadius:10, border:"1px solid #E5E7EB", overflow:"hidden" }}>
          {users.length === 0 ? (
            <div style={{ padding:"3rem", textAlign:"center", color:"#9CA3AF", fontSize:13 }}>
              No users yet. Add users above.
              <br/><span style={{ fontSize:11, marginTop:6, display:"block" }}>The existing admin login (env vars) still works even with no users in the database.</span>
            </div>
          ) : (
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
              <thead>
                <tr style={{ background:"#F9FAFB" }}>
                  {["Name","Email","Role","Status","Added","Actions"].map(h => (
                    <th key={h} style={{ padding:"9px 12px", textAlign:"left", fontWeight:500, color:"#6B7280", fontSize:11, textTransform:"uppercase", letterSpacing:"0.04em" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={u.id} style={{ borderTop:"1px solid #F3F4F6", background:i%2===0?"#fff":"#FAFAFA" }}>
                    <td style={{ padding:"9px 12px", fontWeight:500, color:"#1A2533" }}>{u.full_name}</td>
                    <td style={{ padding:"9px 12px", color:"#6B7280" }}>{u.email}</td>
                    <td style={{ padding:"9px 12px" }}>
                      <span style={{ padding:"2px 10px", borderRadius:20, fontSize:11, fontWeight:600,
                        background: ROLE_COLOR[u.role]+"1a", color:ROLE_COLOR[u.role] }}>
                        {u.role}
                      </span>
                    </td>
                    <td style={{ padding:"9px 12px" }}>
                      <span style={{ padding:"2px 8px", borderRadius:20, fontSize:11,
                        background: u.is_active ? "#D1FAE5" : "#F3F4F6",
                        color: u.is_active ? "#065F46" : "#9CA3AF" }}>
                        {u.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td style={{ padding:"9px 12px", color:"#6B7280", whiteSpace:"nowrap" }}>
                      {new Date(u.created_at).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}
                    </td>
                    <td style={{ padding:"9px 12px", whiteSpace:"nowrap" }}>
                      <button onClick={() => openEdit(u)} style={{ padding:"3px 10px", background:"#F3F4F6", border:"none", borderRadius:5, fontSize:12, cursor:"pointer", marginRight:6 }}>Edit</button>
                      <button onClick={() => deleteUser(u.id)} style={{ padding:"3px 8px", background:"#FEE2E2", color:"#DC2626", border:"none", borderRadius:5, fontSize:12, cursor:"pointer" }}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showForm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:50, padding:"1rem" }}>
          <div style={{ background:"#fff", borderRadius:12, width:"100%", maxWidth:440, padding:"1.5rem" }}>
            <h2 style={{ fontSize:16, fontWeight:600, marginBottom:"1.25rem" }}>{editing ? "Edit User" : "Add User"}</h2>
            {[
              { label:"Full name", key:"full_name" },
              { label:"Email", key:"email", type:"email", disabled:!!editing },
              { label:"Password" + (editing?" (leave blank to keep)":""), key:"password", type:"password" },
            ].map(f => (
              <div key={f.key} style={{ marginBottom:10 }}>
                <label style={{ fontSize:11, fontWeight:500, color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:3 }}>{f.label}</label>
                <input type={f.type??"text"} value={(form as any)[f.key]} disabled={f.disabled}
                  onChange={e => setForm(prev => ({...prev,[f.key]:e.target.value}))}
                  style={{ width:"100%", padding:"7px 10px", border:"1px solid #D1D5DB", borderRadius:6, fontSize:13, background:f.disabled?"#F9FAFB":"#fff" }} />
              </div>
            ))}
            <div style={{ marginBottom:10 }}>
              <label style={{ fontSize:11, fontWeight:500, color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.05em", display:"block", marginBottom:3 }}>Role</label>
              <select value={form.role} onChange={e => setForm(p => ({...p,role:e.target.value}))}
                style={{ width:"100%", padding:"7px 10px", border:"1px solid #D1D5DB", borderRadius:6, fontSize:13 }}>
                <option value="admin">Admin</option>
                <option value="inspector">Inspector</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            {editing && (
              <label style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, marginBottom:14, cursor:"pointer" }}>
                <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({...p,is_active:e.target.checked}))} />
                Active
              </label>
            )}
            <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
              <button onClick={() => setShowForm(false)} style={{ padding:"8px 18px", background:"#F3F4F6", border:"none", borderRadius:7, fontSize:13, cursor:"pointer" }}>Cancel</button>
              <button onClick={saveUser} disabled={saving} style={{ padding:"8px 20px", background:NAV, color:"#fff", border:"none", borderRadius:7, fontSize:13, fontWeight:500, cursor:"pointer" }}>
                {saving ? "Saving…" : editing ? "Save Changes" : "Add User"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
