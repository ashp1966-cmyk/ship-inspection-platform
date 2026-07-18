"use client";

// =====================================================================
// InspectionDashboard — the core interactive surface.
//   • Tabs: Condition Inspection | Pre-Purchase Inspection
//   • Select: Vessel Type → conditionally renders type-specific sections
//   • Accordion of graded question sections (Condition model)
//   • Equipment Inventory table + live 5-Year CapEx projection (Pre-Purchase)
// Rendered from a Server Component parent (app/page.tsx) which passes
// server-fetched vessels; all form state lives client-side here.
// =====================================================================

import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  VESSEL_TYPES, GRADES, getConditionSections, getPrePurchaseInventory,
  type VesselType, type Grade, type EquipmentItem,
} from "@/lib/inspection-templates";
import { projectFleet, usd, HORIZON_YEARS } from "@/lib/capex";

interface VesselRow {
  id: string;
  name: string;
  imo_number: string;
  vessel_type: VesselType;
}

export default function InspectionDashboard({ vessels }: { vessels: VesselRow[] }) {
  const [vesselType, setVesselType] = useState<VesselType>("BULK_CARRIER");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [inventory, setInventory] = useState<EquipmentItem[]>(() =>
    getPrePurchaseInventory("BULK_CARRIER")
  );

  const conditionSections = useMemo(
    () => getConditionSections(vesselType),
    [vesselType]
  );
  const projection = useMemo(() => projectFleet(inventory), [inventory]);

  function handleVesselType(v: VesselType) {
    setVesselType(v);
    setAnswers({});
    setInventory(getPrePurchaseInventory(v)); // re-seed type-specific inventory
  }

  function updateItem(id: string, patch: Partial<EquipmentItem>) {
    setInventory((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  async function saveInspection(type: "CONDITION" | "PRE_PURCHASE") {
    await fetch("/api/inspections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        vesselType,
        inspectionType: type,
        answers,
        inventory: type === "PRE_PURCHASE" ? inventory : undefined,
        projection: type === "PRE_PURCHASE" ? projection : undefined,
      }),
    });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
      {/* ---------- Vessel type selector (drives conditional render) ---- */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Digital Ship Inspection Platform
          </h1>
          <p className="text-sm text-muted-foreground">
            {vessels.length} vessels registered · templates adapt to vessel type
          </p>
        </div>
        <div className="w-full md:w-64">
          <Select value={vesselType} onValueChange={(v) => handleVesselType(v as VesselType)}>
            <SelectTrigger aria-label="Vessel type">
              <SelectValue placeholder="Select vessel type" />
            </SelectTrigger>
            <SelectContent>
              {VESSEL_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ---------- Tabbed models --------------------------------------- */}
      <Tabs defaultValue="condition">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="condition">Condition Inspection</TabsTrigger>
          <TabsTrigger value="prepurchase">Pre-Purchase Inspection</TabsTrigger>
        </TabsList>

        {/* ===== TAB 1: CONDITION ======================================= */}
        <TabsContent value="condition" className="space-y-4">
          <Accordion type="multiple" className="space-y-2">
            {conditionSections.map((section) => (
              <AccordionItem
                key={section.code}
                value={section.code}
                className="rounded-lg border px-4"
              >
                <AccordionTrigger className="text-left">
                  <span className="flex items-center gap-2">
                    {section.title}
                    {section.vesselType && (
                      <Badge variant="outline" className="text-xs">
                        {VESSEL_TYPES.find((t) => t.value === section.vesselType)?.label}
                      </Badge>
                    )}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pb-4">
                  {section.questions.map((q) => (
                    <div key={q.id} className="grid gap-2 md:grid-cols-[1fr_240px] md:items-center">
                      <label className="text-sm" htmlFor={q.id}>{q.prompt}</label>
                      {q.answerKind === "GRADE" ? (
                        <Select
                          value={answers[q.id] ?? ""}
                          onValueChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
                        >
                          <SelectTrigger id={q.id}><SelectValue placeholder="Grade" /></SelectTrigger>
                          <SelectContent>
                            {GRADES.map((g) => (
                              <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : q.answerKind === "YES_NO" ? (
                        <Select
                          value={answers[q.id] ?? ""}
                          onValueChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
                        >
                          <SelectTrigger id={q.id}><SelectValue placeholder="Yes / No" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="YES">Yes</SelectItem>
                            <SelectItem value="NO">No</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          id={q.id}
                          type={q.answerKind === "DATE" ? "date" : q.answerKind === "NUMBER" ? "number" : "text"}
                          value={answers[q.id] ?? ""}
                          onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                        />
                      )}
                    </div>
                  ))}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <Button onClick={() => saveInspection("CONDITION")}>Save condition inspection</Button>
        </TabsContent>

        {/* ===== TAB 2: PRE-PURCHASE ==================================== */}
        <TabsContent value="prepurchase" className="space-y-6">
          {/* --- Equipment inventory with strict name/model/serial ------- */}
          <Card>
            <CardHeader>
              <CardTitle>Equipment Inventory & CapEx Inputs</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[180px]">Equipment name</TableHead>
                    <TableHead className="min-w-[140px]">Model no.</TableHead>
                    <TableHead className="min-w-[140px]">Serial no.</TableHead>
                    <TableHead className="min-w-[150px]">Grade</TableHead>
                    <TableHead className="text-right">Repair cost (USD)</TableHead>
                    <TableHead className="text-right">Annual maint. (USD)</TableHead>
                    <TableHead className="text-right">Remaining life (yrs)</TableHead>
                    <TableHead className="text-right">Replacement (USD)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventory.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Input
                          value={item.equipmentName}
                          onChange={(e) => updateItem(item.id, { equipmentName: e.target.value })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder="e.g. 6S50MC-C"
                          value={item.equipmentModel}
                          onChange={(e) => updateItem(item.id, { equipmentModel: e.target.value })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          placeholder="Serial"
                          value={item.equipmentSerial}
                          onChange={(e) => updateItem(item.id, { equipmentSerial: e.target.value })}
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={item.grade}
                          onValueChange={(v) => updateItem(item.id, { grade: v as Grade })}
                        >
                          <SelectTrigger><SelectValue placeholder="Grade" /></SelectTrigger>
                          <SelectContent>
                            {GRADES.map((g) => (
                              <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      {(["estimatedRepairCost", "annualMaintCost", "remainingLifeYears", "replacementCost"] as const).map((field) => (
                        <TableCell key={field} className="text-right">
                          <Input
                            type="number"
                            min={0}
                            className="text-right"
                            value={item[field]}
                            onChange={(e) => updateItem(item.id, { [field]: Number(e.target.value) })}
                          />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* --- Live 5-year projection ---------------------------------- */}
          <Card>
            <CardHeader>
              <CardTitle>5-Year Lifespan & Maintenance Cost Projection</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Equipment</TableHead>
                    {Array.from({ length: HORIZON_YEARS }, (_, i) => (
                      <TableHead key={i} className="text-right">Year {i + 1}</TableHead>
                    ))}
                    <TableHead className="text-right">5-yr total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projection.items.map((p) => (
                    <TableRow key={p.itemId}>
                      <TableCell>
                        {p.equipmentName}
                        {p.replacementYear && (
                          <Badge variant="destructive" className="ml-2 text-xs">
                            Replace Y{p.replacementYear}
                          </Badge>
                        )}
                      </TableCell>
                      {p.years.map((y, i) => (
                        <TableCell key={i} className="text-right tabular-nums">{usd(y)}</TableCell>
                      ))}
                      <TableCell className="text-right font-medium tabular-nums">{usd(p.total)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2 font-semibold">
                    <TableCell>Fleet total</TableCell>
                    {projection.yearTotals.map((y, i) => (
                      <TableCell key={i} className="text-right tabular-nums">{usd(y)}</TableCell>
                    ))}
                    <TableCell className="text-right tabular-nums">{usd(projection.grandTotal)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <p className="mt-3 text-xs text-muted-foreground">
                Projection: Year 1 = repair cost + annual maintenance; later years escalate at 3%
                inflation with condition-based multipliers (Fair ×1.25, Poor ×1.6, Action Required ×2.0).
                Replacement cost is added in the year remaining life expires within the 5-year horizon.
              </p>
            </CardContent>
          </Card>

          <Button onClick={() => saveInspection("PRE_PURCHASE")}>
            Save pre-purchase inspection
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
