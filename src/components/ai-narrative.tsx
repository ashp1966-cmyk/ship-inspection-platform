"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface InspectionRow {
  id: string;
  vessel_name: string | null;
  vessel_type: string | null;
  inspection_type: string;
  status: string;
  started_at: string | null;
  created_at: string;
  executive_summary: string | null;
  total_items: number;
}

export default function AiNarrative({ inspections }: { inspections: InspectionRow[] }) {
  const [selectedId, setSelectedId] = useState<string>("");
  const [narrative, setNarrative]   = useState("");
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [saving, setSaving]         = useState(false);
  const [saved, setSaved]           = useState(false);

  const selected = inspections.find(i => i.id === selectedId);

  function handleSelect(id: string) {
    setSelectedId(id);
    setError(""); setSaved(false);
    const insp = inspections.find(i => i.id === id);
    setNarrative(insp?.executive_summary ?? "");
  }

  async function generate() {
    if (!selectedId) return;
    setLoading(true); setError(""); setSaved(false);
    try {
      const res = await fetch("/api/narrative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inspectionId: selectedId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      setNarrative(data.narrative);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveToInspection() {
    if (!selectedId || !narrative) return;
    setSaving(true); setError("");
    try {
      const res = await fetch(`/api/inspections/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_summary", summary: narrative }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">AI Narrative</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Generate a professional executive summary from a saved inspection's graded answers using Claude.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Select an inspection</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {inspections.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No saved inspections yet — complete one from the New Inspection page first.
            </p>
          ) : (
            <Select value={selectedId} onValueChange={handleSelect}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Choose a saved inspection…" /></SelectTrigger>
              <SelectContent>
                {inspections.map(i => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.vessel_name ?? "Unnamed vessel"} — {i.inspection_type === "PRE_PURCHASE" ? "Pre-Purchase" : "Condition"} — {i.total_items} item{i.total_items !== 1 ? "s" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {selected && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline">{selected.status}</Badge>
              <span>{selected.total_items} answered item{selected.total_items !== 1 ? "s" : ""}</span>
              {selected.executive_summary && <span>· has a previously saved summary</span>}
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button onClick={generate} disabled={!selectedId || loading}>
              {loading ? "Generating…" : narrative ? "Regenerate narrative" : "Generate narrative"}
            </Button>
            {error && <span className="text-sm text-red-500">{error}</span>}
          </div>
        </CardContent>
      </Card>

      {(narrative || loading) && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Executive summary</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <textarea
              value={loading ? "Generating…" : narrative}
              onChange={e => setNarrative(e.target.value)}
              disabled={loading}
              rows={9}
              className="w-full rounded-md border border-gray-300 p-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#1BA5C0]"
              placeholder="Generated narrative will appear here — edit freely before saving."
            />
            <div className="flex items-center gap-3">
              <Button onClick={saveToInspection} disabled={!narrative || loading || saving}>
                {saving ? "Saving…" : "Save to inspection"}
              </Button>
              {saved && <span className="text-sm text-emerald-600">Saved ✓</span>}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
