// Rebuilds the inspection form's state from the rows POST/PUT /api/inspections wrote, so a saved
// inspection can be reopened into the same form. Inverse of buildRows() in inspection-writes.ts.
// Pure (no DB access) so it can be tested on its own; the edit page feeds it query results.
//
// Answers come back as the strings the form uses: the typed column tells us the kind, so no
// template lookup is needed (and renamed/removed template questions can't break a reload).
//   grade_value -> "GOOD"…   bool_value -> "YES"/"NO"   text_value -> text (YES_NO "NA" is text 'NA')
//   number_value -> the numeric text as stored   date_value -> "YYYY-MM-DD"
import type { EquipmentItem } from "./inspection-templates";

export type InspType = "CONDITION" | "PRE_PURCHASE" | "TECHNICAL" | "RIGHTSHIP";
export interface FormAttachment { name: string; url: string; fileType: "photo" | "document"; size: number }
export type FormQuestion = { id: string; prompt: string; answerKind: "GRADE" | "YES_NO" | "TEXT" | "NUMBER" | "DATE" | "CHOICE"; custom: true };
export type FormSparesRow = { rowKey: string } & Record<string, string>;
export type FormDefectRow = { rowKey: string; description: string; defectType: string; remarks: string };

export interface InitialState {
  inspectionId: string;
  inspectionType: InspType;
  vesselId: string;
  vesselName: string;
  imoNumber: string;
  vesselType: string;
  inspectorName: string;
  answers: Record<string, string>;
  remarks: Record<string, string>;
  attachments: Record<string, FormAttachment[]>;
  customSections: Record<string, FormQuestion[]>;
  inventory: EquipmentItem[] | null; // null = nothing stored, keep the form's defaults
  sparesRows: FormSparesRow[] | null;
  defectRows: FormDefectRow[];
}

type Row = Record<string, any>;
const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));
const n = (v: unknown) => (v === null || v === undefined ? 0 : Number(v));
const dateOnly = (v: unknown): string => {
  if (!v) return "";
  if (v instanceof Date) {
    // Same rule as dateStr() in db.ts: the driver builds DATEs from local calendar parts.
    const p = (x: number) => String(x).padStart(2, "0");
    return `${v.getFullYear()}-${p(v.getMonth() + 1)}-${p(v.getDate())}`;
  }
  return String(v).slice(0, 10);
};

export function buildInitialState(input: {
  inspection: Row; // inspections row + vessel_type
  items: Row[];    // inspection_items, ordered by sort_order
  attachments: Row[];
  spares: Row[];   // random_spares_check_items, ordered by sr_no
  sparesColumns: string[]; // editable spec column keys
  blankSparesRows?: number;
}): InitialState {
  const { inspection: insp, items, attachments, spares, sparesColumns } = input;
  const attByItem = new Map<string, FormAttachment[]>();
  for (const a of attachments) {
    const list = attByItem.get(a.inspection_item_id) ?? [];
    list.push({ name: s(a.file_name), url: a.file_url, fileType: a.file_type === "photo" ? "photo" : "document", size: n(a.file_size) });
    attByItem.set(a.inspection_item_id, list);
  }

  const answers: Record<string, string> = {};
  const remarks: Record<string, string> = {};
  const atts: Record<string, FormAttachment[]> = {};
  const customSections: Record<string, FormQuestion[]> = {};
  const defectRows: FormDefectRow[] = [];
  const inventory: EquipmentItem[] = [];

  for (const it of items) {
    if (it.section_code === "DEFECT_LIST") {
      const rowKey = `def-${it.id}`;
      defectRows.push({ rowKey, description: s(it.prompt), defectType: s(it.text_value), remarks: s(it.remarks) });
      if (attByItem.has(it.id)) atts[rowKey] = attByItem.get(it.id)!;
      continue;
    }
    if (it.equipment_name !== null && it.equipment_name !== undefined) {
      inventory.push({
        id: `inv-${inventory.length}`, sectionCode: it.section_code, equipmentName: s(it.equipment_name),
        equipmentModel: s(it.equipment_model), equipmentSerial: s(it.equipment_serial),
        manufacturer: s(it.equipment_manufacturer), yearOfMake: s(it.equipment_year_of_make),
        specifications: s(it.equipment_specifications), grade: (it.grade_value ?? "") as any, condition: s(it.equipment_condition),
        estimatedRepairCost: n(it.estimated_repair_cost), annualMaintCost: n(it.annual_maint_cost),
        remainingLifeYears: n(it.remaining_life_years), replacementCost: n(it.replacement_cost), remarks: s(it.remarks),
      });
      continue;
    }
    const qId: string = it.prompt;
    if (it.custom_kind) {
      (customSections[it.section_code] ??= []).push({ id: qId, prompt: s(it.custom_prompt), answerKind: it.custom_kind, custom: true });
    }
    if (it.grade_value) answers[qId] = it.grade_value;
    else if (it.bool_value !== null && it.bool_value !== undefined) answers[qId] = it.bool_value ? "YES" : "NO";
    else if (it.number_value !== null && it.number_value !== undefined) answers[qId] = String(it.number_value);
    else if (it.date_value) answers[qId] = dateOnly(it.date_value);
    else if (it.text_value !== null && it.text_value !== undefined) answers[qId] = it.text_value;
    if (it.remarks) remarks[qId] = it.remarks;
    if (attByItem.has(it.id)) atts[qId] = attByItem.get(it.id)!;
  }

  let sparesRows: FormSparesRow[] | null = null;
  if (insp.inspection_type === "TECHNICAL") {
    sparesRows = spares.map((r, i) => {
      const row: FormSparesRow = { rowKey: `spr-${r.id ?? i}` };
      for (const k of sparesColumns) row[k] = s(r[k]);
      return row;
    });
    for (let i = sparesRows.length; i < (input.blankSparesRows ?? 0); i++) {
      const row: FormSparesRow = { rowKey: `spr-blank-${i}` };
      for (const k of sparesColumns) row[k] = "";
      sparesRows.push(row);
    }
  }

  return {
    inspectionId: insp.id,
    inspectionType: insp.inspection_type,
    vesselId: s(insp.vessel_id),
    vesselName: s(insp.vessel_name ?? insp.entered_vessel_name),
    imoNumber: s(insp.imo_number ?? insp.entered_imo_number),
    vesselType: s(insp.vessel_type) || "BULK_CARRIER",
    inspectorName: s(insp.inspector_name),
    answers, remarks, attachments: atts, customSections,
    inventory: insp.inspection_type === "PRE_PURCHASE" && inventory.length ? inventory : null,
    sparesRows, defectRows,
  };
}
