"use client";
import { useMemo, useState, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  VESSEL_TYPES, GRADES, getConditionSections, getPrePurchaseSections, getPrePurchaseInventory,
  type VesselType, type Grade, type Question, type EquipmentItem, type Section,
} from "@/lib/inspection-templates";
import { projectFleet, usd, HORIZON_YEARS } from "@/lib/capex";
import { cn } from "@/lib/utils";

interface Attachment { name:string; url:string; fileType:"photo"|"document"; size:number; uploading?:boolean; }
interface VesselRow { id:string; name:string; imo_number:string; vessel_type:VesselType; }

const TEAL="#1BA5C0";

// Group sections into logical clusters so the long question list can be
// browsed via sub-tabs instead of one giant scroll. "equipment" is a
// pseudo-group with no sections — it just toggles the inventory/CapEx
// tables in the Pre-Purchase view.
type GroupDef = { key:string; label:string; codes:string[] };
const QUESTION_GROUPS: GroupDef[] = [
  { key:"general",     label:"General & Documentation", codes:["CERTIFICATION","CREW_MGMT","ACCOMMODATION"] },
  { key:"nav_safety",  label:"Navigation & Safety",      codes:["NAVIGATION","SAFETY_MGMT","POLLUTION"] },
  { key:"structural",  label:"Structural & Ballast",     codes:["STRUCTURAL","BALLAST"] },
  { key:"machinery",   label:"Machinery & Deck",         codes:["DECK_MACHINERY","ENGINE_ROOM"] },
  { key:"cargo",       label:"Cargo Systems",            codes:["CARGO_HOLDS","CONTAINER_SYS","CARGO_TANKS","CARGO_CONTAINMENT","TWEEN_DECKS","GAS_SYSTEMS","HOTEL_PAX"] },
];
const DUE_DILIGENCE_GROUP: GroupDef = {
  key:"due_diligence", label:"Due Diligence",
  codes:["VESSEL_HISTORY","CLASS_SURVEY_STATUS","DOC_REVIEW_PP","VESSEL_PERFORMANCE","SPACES_INSPECTED","CARGO_MACHINERY_PARTICULARS","DEFICIENCY_REGISTER"],
};

function groupSections(sections: Section[], groups: GroupDef[]) {
  return groups
    .map(g => ({ ...g, sections: sections.filter(s => g.codes.includes(s.code)) }))
    .filter(g => g.sections.length > 0);
}

export default function InspectionDashboard({ vessels }: { vessels: VesselRow[] }) {
  const [vesselType, setVesselType] = useState<VesselType>("BULK_CARRIER");
  const [selectedVessel, setSelectedVessel] = useState<string>("");
  const [inspectorName, setInspectorName] = useState("");
  const [answers, setAnswers]     = useState<Record<string, string>>({});
  const [remarks, setRemarks]     = useState<Record<string, string>>({});
  const [attachments, setAttachments] = useState<Record<string, Attachment[]>>({});
  const [expanded, setExpanded]   = useState<Set<string>>(new Set());
  const [inventory, setInventory] = useState<EquipmentItem[]>(() => getPrePurchaseInventory("BULK_CARRIER"));
  const [customSections, setCustomSections] = useState<Record<string, Question[]>>({});
  const [addingTo, setAddingTo]   = useState<string|null>(null);
  const [newPrompt, setNewPrompt] = useState("");
  const [newKind, setNewKind]     = useState<Question["answerKind"]>("GRADE");
  const [editingId, setEditingId] = useState<string|null>(null);
  const [editPrompt, setEditPrompt] = useState("");
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [saveError, setSaveError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFor, setUploadingFor] = useState<{qId:string, type:"photo"|"document", question?:Question}|null>(null);
  const [gradeSuggestions, setGradeSuggestions] = useState<Record<string, {grade:string; reasoning:string}>>({});
  const [analyzingIds, setAnalyzingIds] = useState<Set<string>>(new Set());

  const conditionSections = useMemo(() => {
    const base = getConditionSections(vesselType);
    return base.map(s => ({ ...s, questions: [...s.questions, ...(customSections[s.code]??[])] }));
  }, [vesselType, customSections]);

  // Pre-Purchase includes the full Condition scope PLUS the additional
  // due-diligence sections (vessel history, class/survey status, document
  // review, performance, spaces available, particulars verification and
  // a deficiency-risk summary) — the pre-purchase model has substantially
  // more questions than the condition model.
  const prePurchaseSections = useMemo(() => {
    const base = getPrePurchaseSections(vesselType);
    return base.map(s => ({ ...s, questions: [...s.questions, ...(customSections[s.code]??[])] }));
  }, [vesselType, customSections]);

  const projection = useMemo(() => projectFleet(inventory), [inventory]);

  const conditionGroups = useMemo(
    () => groupSections(conditionSections, QUESTION_GROUPS),
    [conditionSections]
  );
  const prePurchaseGroups = useMemo(
    () => groupSections(prePurchaseSections, [...QUESTION_GROUPS, DUE_DILIGENCE_GROUP]),
    [prePurchaseSections]
  );

  const [conditionGroupKey, setConditionGroupKey] = useState<string>("general");
  const [prePurchaseGroupKey, setPrePurchaseGroupKey] = useState<string>("general");

  const activeConditionGroup = conditionGroups.find(g => g.key === conditionGroupKey) ?? conditionGroups[0];
  const activePrePurchaseGroup = prePurchaseGroupKey === "equipment"
    ? null
    : prePurchaseGroups.find(g => g.key === prePurchaseGroupKey) ?? prePurchaseGroups[0];

  function handleVesselType(v: VesselType) {
    setVesselType(v); setAnswers({}); setRemarks({}); setAttachments({});
    setInventory(getPrePurchaseInventory(v)); setCustomSections({});
  }

  function toggleExpanded(qId: string) {
    setExpanded(prev => { const n=new Set(prev); n.has(qId)?n.delete(qId):n.add(qId); return n; });
  }

  function addCustomQuestion(sectionCode: string) {
    if (!newPrompt.trim()) return;
    const q: Question = { id:`custom-${sectionCode}-${Date.now()}`, prompt:newPrompt.trim(), answerKind:newKind, custom:true };
    setCustomSections(prev => ({ ...prev, [sectionCode]:[...(prev[sectionCode]??[]),q] }));
    setNewPrompt(""); setNewKind("GRADE"); setAddingTo(null);
  }

  function deleteCustomQuestion(sectionCode: string, qId: string) {
    setCustomSections(prev => ({ ...prev, [sectionCode]:(prev[sectionCode]??[]).filter(q=>q.id!==qId) }));
  }

  function saveEdit(sectionCode: string, qId: string) {
    setCustomSections(prev => ({ ...prev, [sectionCode]:(prev[sectionCode]??[]).map(q=>q.id===qId?{...q,prompt:editPrompt}:q) }));
    setEditingId(null);
  }

  function updateItem(id: string, patch: Partial<EquipmentItem>) {
    setInventory(prev => prev.map(it => it.id===id?{...it,...patch}:it));
  }

  async function analyzePhoto(qId: string, question: Question, imageUrl: string) {
    if (question.answerKind !== "GRADE") return;
    setAnalyzingIds(prev => new Set(prev).add(qId));
    try {
      const res = await fetch("/api/grade-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl, prompt: question.prompt }),
      });
      const data = await res.json();
      if (res.ok && data.grade) {
        setGradeSuggestions(prev => ({ ...prev, [qId]: { grade: data.grade, reasoning: data.reasoning ?? "" } }));
      }
    } catch {
      // Silently skip — AI grading is a convenience, not a required step.
    } finally {
      setAnalyzingIds(prev => { const n = new Set(prev); n.delete(qId); return n; });
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (!uploadingFor || !e.target.files?.length) return;
    const { qId, type, question } = uploadingFor;
    const file = e.target.files[0];
    const tempAtt: Attachment = { name:file.name, url:"", fileType:type, size:file.size, uploading:true };
    setAttachments(prev => ({ ...prev, [qId]:[...(prev[qId]??[]),tempAtt] }));

    try {
      const res = await fetch(`/api/upload?filename=${encodeURIComponent(file.name)}`, {
        method:"POST", body:file, headers:{"content-type":file.type},
      });
      if (res.ok) {
        const { url } = await res.json();
        setAttachments(prev => ({
          ...prev,
          [qId]: (prev[qId]??[]).map(a => a===tempAtt ? {...a, url, uploading:false} : a),
        }));
        if (type === "photo" && question?.answerKind === "GRADE") {
          analyzePhoto(qId, question, url);
        }
      } else {
        let message = `Upload failed (${res.status})`;
        try { const body = await res.json(); if (body?.error) message += `: ${body.error}`; } catch {}
        console.error(message);
        setAttachments(prev => ({
          ...prev,
          [qId]: (prev[qId]??[]).map(a => a===tempAtt ? {...a, uploading:false, name:`⚠ ${message}`} : a),
        }));
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      setAttachments(prev => ({
        ...prev,
        [qId]: (prev[qId]??[]).map(a => a===tempAtt ? {...a, uploading:false, name:"⚠ Upload failed — network error"} : a),
      }));
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
    setUploadingFor(null);
  }

  function triggerUpload(qId: string, type: "photo"|"document", question?: Question) {
    setUploadingFor({ qId, type, question });
    setTimeout(() => fileInputRef.current?.click(), 50);
  }

  function buildQuestionMeta(type: "CONDITION"|"PRE_PURCHASE"): Record<string, string> {
    const meta: Record<string, string> = {};
    const sections = type === "PRE_PURCHASE" ? prePurchaseSections : conditionSections;
    for (const s of sections) {
      for (const q of s.questions) meta[q.id] = q.answerKind;
    }
    return meta;
  }

  async function saveInspection(type: "CONDITION"|"PRE_PURCHASE") {
    setSaving(true); setSaveError("");
    try {
      const res = await fetch("/api/inspections", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          vesselId: selectedVessel || null,
          vesselType, inspectionType: type,
          answers, questionMeta: buildQuestionMeta(type), remarks, attachments,
          inventory: type==="PRE_PURCHASE" ? inventory : undefined,
          projection: type==="PRE_PURCHASE" ? projection : undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setSaved(true); setTimeout(()=>setSaved(false), 3000);
    } catch(e:any) {
      setSaveError(e.message);
    } finally { setSaving(false); }
  }

  function renderQuestion(q: Question, sectionCode: string) {
    const isEditing    = editingId === q.id;
    const isExpanded   = expanded.has(q.id);
    const qAttachments = attachments[q.id] ?? [];
    const qRemarks     = remarks[q.id] ?? "";
    const hasContent   = qRemarks || qAttachments.length > 0;
    const isAnalyzing  = analyzingIds.has(q.id);
    const suggestion   = gradeSuggestions[q.id];

    return (
      <div key={q.id} className={q.custom ? "bg-blue-50/30" : ""} style={{ borderBottom:"1px solid #F3F4F6" }}>
        {/* Main question row */}
        <div style={{ display:"flex", alignItems:"center", gap:8, padding:"8px 0" }}>
          {/* Prompt */}
          <div style={{ flex:1, minWidth:0 }}>
            {isEditing ? (
              <input value={editPrompt} onChange={e=>setEditPrompt(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&saveEdit(sectionCode,q.id)}
                className="text-sm h-8 w-full border rounded px-2" autoFocus />
            ) : (
              <span style={{ fontSize:15, lineHeight:1.5, color:"#374151" }}>
                {q.prompt}
                {q.custom && <span style={{ marginLeft:6, fontSize:12, color:"#3B82F6", fontWeight:500 }}>CUSTOM</span>}
              </span>
            )}
          </div>

          {/* Custom controls */}
          {q.custom && (
            <div style={{ display:"flex", gap:2, flexShrink:0 }}>
              {isEditing ? (
                <>
                  <button onClick={()=>saveEdit(sectionCode,q.id)} style={{ fontSize:13, color:"#059669", padding:"2px 6px", border:"none", background:"none", cursor:"pointer", fontWeight:500 }}>Save</button>
                  <button onClick={()=>setEditingId(null)} style={{ fontSize:13, color:"#9CA3AF", padding:"2px 4px", border:"none", background:"none", cursor:"pointer" }}>Cancel</button>
                </>
              ) : (
                <>
                  <button onClick={()=>{setEditingId(q.id);setEditPrompt(q.prompt);}} style={{ fontSize:14, color:"#9CA3AF", padding:"2px 4px", border:"none", background:"none", cursor:"pointer" }}>✏️</button>
                  <button onClick={()=>deleteCustomQuestion(sectionCode,q.id)} style={{ fontSize:14, color:"#9CA3AF", padding:"2px 4px", border:"none", background:"none", cursor:"pointer" }}>✕</button>
                </>
              )}
            </div>
          )}

          {/* Answer */}
          <div style={{ width:200, flexShrink:0 }}>
            {q.answerKind==="GRADE" ? (
              <Select value={answers[q.id]??""} onValueChange={v=>setAnswers(a=>({...a,[q.id]:v}))}>
                <SelectTrigger id={q.id} className="h-8 text-sm"><SelectValue placeholder="Grade" /></SelectTrigger>
                <SelectContent>{GRADES.map(g=><SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}</SelectContent>
              </Select>
            ) : q.answerKind==="YES_NO" ? (
              <Select value={answers[q.id]??""} onValueChange={v=>setAnswers(a=>({...a,[q.id]:v}))}>
                <SelectTrigger id={q.id} className="h-8 text-sm"><SelectValue placeholder="Yes / No" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="YES">Yes</SelectItem>
                  <SelectItem value="NO">No</SelectItem>
                  <SelectItem value="NA">N/A</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Input id={q.id} type={q.answerKind==="DATE"?"date":q.answerKind==="NUMBER"?"number":"text"}
                value={answers[q.id]??""} onChange={e=>setAnswers(a=>({...a,[q.id]:e.target.value}))} className="h-8 text-sm" />
            )}
          </div>

          {/* Expand notes/attach toggle */}
          <button onClick={()=>toggleExpanded(q.id)} title="Add remarks or attach files"
            style={{ flexShrink:0, padding:"3px 6px", border:"1px solid", borderRadius:5, fontSize:13, cursor:"pointer",
              borderColor: hasContent||isExpanded ? TEAL : "#D1D5DB",
              background: hasContent||isExpanded ? "#E0F9FF" : "#fff",
              color: hasContent||isExpanded ? "#0369A1" : "#9CA3AF" }}>
            📎 {qAttachments.length>0 ? qAttachments.length : ""}
          </button>
        </div>

        {/* AI grading suggestion — only for GRADE questions with a photo just analyzed */}
        {q.answerKind==="GRADE" && (isAnalyzing || suggestion) && (
          <div style={{ padding:"0 0 8px 0", display:"flex", alignItems:"center", gap:8 }}>
            {isAnalyzing ? (
              <span style={{ fontSize:13, color:"#9CA3AF", display:"flex", alignItems:"center", gap:4 }}>
                🔍 Analyzing photo…
              </span>
            ) : suggestion && (
              <div style={{ display:"flex", alignItems:"center", gap:6, padding:"4px 10px", background:"#EEF2FF", borderRadius:6, border:"1px solid #C7D2FE" }}>
                <span style={{ fontSize:13, color:"#4338CA", fontWeight:500 }} title={suggestion.reasoning}>
                  🤖 AI suggests: {GRADES.find(g=>g.value===suggestion.grade)?.label ?? suggestion.grade}
                </span>
                {suggestion.reasoning && (
                  <span style={{ fontSize:13, color:"#6B7280", maxWidth:360, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    — {suggestion.reasoning}
                  </span>
                )}
                <button
                  onClick={()=>{
                    setAnswers(a=>({...a,[q.id]:suggestion.grade}));
                    setGradeSuggestions(prev=>{ const n={...prev}; delete n[q.id]; return n; });
                  }}
                  style={{ fontSize:13, color:"#4338CA", fontWeight:600, border:"none", background:"none", cursor:"pointer", padding:"2px 4px" }}>
                  Apply
                </button>
                <button
                  onClick={()=>setGradeSuggestions(prev=>{ const n={...prev}; delete n[q.id]; return n; })}
                  style={{ fontSize:13, color:"#9CA3AF", border:"none", background:"none", cursor:"pointer", padding:"2px 4px" }}>
                  ✕
                </button>
              </div>
            )}
          </div>
        )}

        {/* Expanded remarks + attachments panel */}
        {isExpanded && (
          <div style={{ marginLeft:0, padding:"8px 0 12px 0", borderTop:"1px dashed #E5E7EB" }}>
            {/* Remarks */}
            <textarea value={qRemarks} onChange={e=>setRemarks(r=>({...r,[q.id]:e.target.value}))}
              placeholder="Remarks / observations for this item…"
              rows={2} style={{ width:"100%", padding:"6px 10px", border:"1px solid #D1D5DB", borderRadius:6,
                fontSize:14, resize:"vertical", fontFamily:"inherit", marginBottom:8 }} />

            {/* Upload buttons */}
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
              <button onClick={()=>triggerUpload(q.id,"photo",q)} style={{ padding:"4px 12px", border:"1px solid #D1D5DB", borderRadius:5, fontSize:14, cursor:"pointer", background:"#fff", display:"flex", alignItems:"center", gap:4 }}>
                📷 Add photo
              </button>
              <button onClick={()=>triggerUpload(q.id,"document")} style={{ padding:"4px 12px", border:"1px solid #D1D5DB", borderRadius:5, fontSize:14, cursor:"pointer", background:"#fff", display:"flex", alignItems:"center", gap:4 }}>
                📄 Add document
              </button>

              {/* Attached files */}
              {qAttachments.map((att,ai) => (
                <div key={ai} style={{ display:"flex", alignItems:"center", gap:4, padding:"3px 8px", background:"#F3F4F6", borderRadius:5, fontSize:13 }}>
                  {att.uploading ? (
                    <span style={{ color:"#9CA3AF" }}>Uploading…</span>
                  ) : !att.url ? (
                    <span style={{ color:"#DC2626" }}>{att.name}</span>
                  ) : att.fileType==="photo" ? (
                    <a href={att.url} target="_blank" rel="noreferrer">
                      <img src={att.url} alt={att.name} style={{ width:28, height:28, objectFit:"cover", borderRadius:3 }} />
                    </a>
                  ) : (
                    <a href={att.url} target="_blank" rel="noreferrer" style={{ color:"#0369A1", textDecoration:"none" }}>
                      📎 {att.name}
                    </a>
                  )}
                  <button onClick={()=>setAttachments(prev=>({...prev,[q.id]:(prev[q.id]??[]).filter((_,i)=>i!==ai)}))}
                    style={{ color:"#9CA3AF", border:"none", background:"none", cursor:"pointer", fontSize:14, padding:"0 2px" }}>✕</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderGroupPills(
    groups: { key:string; label:string; sections:Section[] }[],
    activeKey: string,
    setActiveKey: (k:string) => void,
    extraTabs?: { key:string; label:string }[]
  ) {
    return (
      <div className="flex flex-wrap gap-2 border-b pb-3">
        {groups.map(g => {
          const count = g.sections.reduce((n,s)=>n+s.questions.length, 0);
          const active = g.key === activeKey;
          return (
            <button key={g.key} onClick={()=>setActiveKey(g.key)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                active ? "border-transparent text-white" : "border-gray-300 text-gray-600 bg-white hover:bg-gray-50"
              )}
              style={active ? { background: TEAL } : undefined}>
              {g.label} <span className="opacity-70">({count})</span>
            </button>
          );
        })}
        {extraTabs?.map(t => {
          const active = t.key === activeKey;
          return (
            <button key={t.key} onClick={()=>setActiveKey(t.key)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
                active ? "border-transparent text-white" : "border-gray-300 text-gray-600 bg-white hover:bg-gray-50"
              )}
              style={active ? { background: TEAL } : undefined}>
              {t.label}
            </button>
          );
        })}
      </div>
    );
  }

  function renderSectionAccordion(sections: Section[]) {
    return (
      <Accordion type="multiple" className="space-y-2">
        {sections.map(section => (
          <AccordionItem key={section.code} value={section.code} className="rounded-lg border px-4">
            <AccordionTrigger className="text-left py-3">
              <span className="flex items-center gap-2 text-sm font-medium">
                {section.title}
                {section.vesselType && (
                  <Badge variant="outline" className="text-[10px] font-normal">
                    {VESSEL_TYPES.find(t=>t.value===section.vesselType)?.label}
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground font-normal">({section.questions.length})</span>
              </span>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              {section.questions.map(q => renderQuestion(q, section.code))}

              {addingTo===section.code ? (
                <div className="mt-3 p-3 rounded-md border border-blue-200 bg-blue-50 space-y-2">
                  <p className="text-xs font-medium text-blue-700">Add question to this section</p>
                  <Input placeholder="Question prompt…" value={newPrompt} onChange={e=>setNewPrompt(e.target.value)}
                    onKeyDown={e=>e.key==="Enter"&&addCustomQuestion(section.code)} autoFocus className="text-sm" />
                  <div className="flex gap-2 items-center">
                    <Select value={newKind} onValueChange={v=>setNewKind(v as Question["answerKind"])}>
                      <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GRADE">Grade</SelectItem>
                        <SelectItem value="YES_NO">Yes / No</SelectItem>
                        <SelectItem value="TEXT">Text</SelectItem>
                        <SelectItem value="DATE">Date</SelectItem>
                        <SelectItem value="NUMBER">Number</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button size="sm" className="h-8 text-xs" onClick={()=>addCustomQuestion(section.code)}>Add</Button>
                    <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={()=>{setAddingTo(null);setNewPrompt("");}}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <button onClick={()=>{setAddingTo(section.code);setNewPrompt("");}}
                  className="mt-3 text-xs text-blue-500 hover:text-blue-700 flex items-center gap-1">
                  <span className="text-base leading-none">+</span> Add question
                </button>
              )}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 md:p-6">
      {/* Hidden file input */}
      <input ref={fileInputRef} type="file"
        accept={uploadingFor?.type==="photo" ? "image/*" : "*/*"}
        style={{ display:"none" }} onChange={handleFileSelect} />

      {/* Top bar */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">New Inspection</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {vessels.length} vessel{vessels.length!==1?"s":""} registered
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          {/* Vessel selector */}
          <select value={selectedVessel} onChange={e=>setSelectedVessel(e.target.value)}
            style={{ padding:"7px 12px", border:"1px solid #D1D5DB", borderRadius:7, fontSize:15, minWidth:180 }}>
            <option value="">Select vessel (optional)</option>
            {vessels.map(v=><option key={v.id} value={v.id}>{v.name} — {v.imo_number}</option>)}
          </select>
          {/* Vessel type */}
          <Select value={vesselType} onValueChange={v=>handleVesselType(v as VesselType)}>
            <SelectTrigger className="w-52" aria-label="Vessel type"><SelectValue /></SelectTrigger>
            <SelectContent>{VESSEL_TYPES.map(t=><SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
          </Select>
          {/* Inspector name */}
          <Input placeholder="Inspector name" value={inspectorName} onChange={e=>setInspectorName(e.target.value)} className="w-48" />
        </div>
      </div>

      <Tabs defaultValue="condition">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="condition">Condition Inspection</TabsTrigger>
          <TabsTrigger value="prepurchase">Pre-Purchase Inspection</TabsTrigger>
        </TabsList>

        {/* CONDITION TAB */}
        <TabsContent value="condition" className="space-y-3 mt-4">
          {renderGroupPills(conditionGroups, conditionGroupKey, setConditionGroupKey)}
          {activeConditionGroup && renderSectionAccordion(activeConditionGroup.sections)}
          <div className="flex items-center gap-3 pt-2">
            <Button onClick={()=>saveInspection("CONDITION")} disabled={saving}>
              {saving ? "Saving…" : "Save condition inspection"}
            </Button>
            {saved && <span className="text-sm text-emerald-600">Saved ✓</span>}
            {saveError && <span className="text-sm text-red-500">{saveError}</span>}
          </div>
        </TabsContent>

        {/* PRE-PURCHASE TAB */}
        <TabsContent value="prepurchase" className="space-y-5 mt-4">
          {renderGroupPills(
            prePurchaseGroups, prePurchaseGroupKey, setPrePurchaseGroupKey,
            [{ key:"equipment", label:"Equipment & CapEx" }]
          )}

          {activePrePurchaseGroup && renderSectionAccordion(activePrePurchaseGroup.sections)}

          {prePurchaseGroupKey === "equipment" && (
            <>
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Equipment Inventory & CapEx Inputs</CardTitle></CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[180px]">Equipment</TableHead>
                        <TableHead className="min-w-[130px]">Model no.</TableHead>
                        <TableHead className="min-w-[130px]">Serial no.</TableHead>
                        <TableHead className="min-w-[130px]">Grade</TableHead>
                        <TableHead className="text-right">Repair USD</TableHead>
                        <TableHead className="text-right">Maint USD/yr</TableHead>
                        <TableHead className="text-right">Life yrs</TableHead>
                        <TableHead className="text-right">Replace USD</TableHead>
                        <TableHead>Remarks</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inventory.map(item => (
                        <TableRow key={item.id}>
                          <TableCell><Input value={item.equipmentName} onChange={e=>updateItem(item.id,{equipmentName:e.target.value})} className="h-7 text-sm"/></TableCell>
                          <TableCell><Input placeholder="Model" value={item.equipmentModel} onChange={e=>updateItem(item.id,{equipmentModel:e.target.value})} className="h-7 text-sm"/></TableCell>
                          <TableCell><Input placeholder="Serial" value={item.equipmentSerial} onChange={e=>updateItem(item.id,{equipmentSerial:e.target.value})} className="h-7 text-sm"/></TableCell>
                          <TableCell>
                            <Select value={item.grade} onValueChange={v=>updateItem(item.id,{grade:v as Grade})}>
                              <SelectTrigger className="h-7 text-sm"><SelectValue placeholder="Grade"/></SelectTrigger>
                              <SelectContent>{GRADES.map(g=><SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>)}</SelectContent>
                            </Select>
                          </TableCell>
                          {(["estimatedRepairCost","annualMaintCost","remainingLifeYears","replacementCost"] as const).map(field=>(
                            <TableCell key={field} className="text-right">
                              <Input type="number" min={0} className="h-7 text-right text-sm w-24" value={item[field]}
                                onChange={e=>updateItem(item.id,{[field]:Number(e.target.value)})}/>
                            </TableCell>
                          ))}
                          <TableCell><Input placeholder="Notes…" value={item.remarks} onChange={e=>updateItem(item.id,{remarks:e.target.value})} className="h-7 text-sm min-w-[120px]"/></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">5-Year CapEx & Lifecycle Projection</CardTitle></CardHeader>
                <CardContent className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Equipment</TableHead>
                        {Array.from({length:HORIZON_YEARS},(_,i)=><TableHead key={i} className="text-right">Year {i+1}</TableHead>)}
                        <TableHead className="text-right">5-yr total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projection.items.map(p=>(
                        <TableRow key={p.itemId}>
                          <TableCell className="text-sm">
                            {p.equipmentName}
                            {p.replacementYear && <Badge variant="destructive" className="ml-2 text-[10px]">Replace Y{p.replacementYear}</Badge>}
                          </TableCell>
                          {p.years.map((y,i)=><TableCell key={i} className="text-right tabular-nums text-sm">{usd(y)}</TableCell>)}
                          <TableCell className="text-right font-medium tabular-nums text-sm">{usd(p.total)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="border-t-2 font-semibold">
                        <TableCell>Fleet total</TableCell>
                        {projection.yearTotals.map((y,i)=><TableCell key={i} className="text-right tabular-nums">{usd(y)}</TableCell>)}
                        <TableCell className="text-right tabular-nums">{usd(projection.grandTotal)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}

          <div className="flex items-center gap-3 pt-1">
            <Button onClick={()=>saveInspection("PRE_PURCHASE")} disabled={saving}>
              {saving ? "Saving…" : "Save pre-purchase inspection"}
            </Button>
            {saved && <span className="text-sm text-emerald-600">Saved ✓</span>}
            {saveError && <span className="text-sm text-red-500">{saveError}</span>}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
