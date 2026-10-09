// Shared write path for POST /api/inspections (and PUT /api/inspections/[id]): turns the form's
// save body into rows and into ONE list of queries for a single sql.transaction().
//
// Row shapes (inspection_items), distinguished on reload by:
//   * DEFECT_LIST       section_code = 'DEFECT_LIST'   (prompt = description, text_value = defect type)
//   * equipment         equipment_name IS NOT NULL     (Pre-Purchase inventory)
//   * custom question   custom_kind IS NOT NULL        (prompt = client id, custom_prompt = its text)
//   * everything else   a template question            (prompt = question id)
import { sql } from "./db";
import { GRADES } from "./inspection-templates";

export class BadRequest extends Error {}

const GRADE_SET = new Set<string>(GRADES.map((g) => g.value));
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export interface ItemRow {
  id: string;
  section_code: string;
  prompt: string;
  grade_value: string | null;
  bool_value: boolean | null;
  text_value: string | null;
  number_value: number | null;
  date_value: string | null;
  remarks: string | null;
  equipment_name: string | null;
  equipment_model: string | null;
  equipment_serial: string | null;
  equipment_manufacturer: string | null;
  equipment_year_of_make: string | null;
  equipment_specifications: string | null;
  equipment_condition: string | null;
  estimated_repair_cost: number | null;
  annual_maint_cost: number | null;
  remaining_life_years: number | null;
  replacement_cost: number | null;
  custom_prompt: string | null;
  custom_kind: string | null;
  sort_order: number;
  deficiency_status: string | null;
  deficiency_action: string | null;
  deficiency_closed_at: string | null;
}
export interface AttachmentRow {
  inspection_item_id: string;
  question_id: string;
  file_name: string | null;
  file_url: string;
  file_type: string;
  file_size: number;
}
export interface SparesRow { sr_no: number; [k: string]: string | number | null }

const blankItem = (id: string, section_code: string, prompt: string, sort_order: number): ItemRow => ({
  id, section_code, prompt, sort_order,
  grade_value: null, bool_value: null, text_value: null, number_value: null, date_value: null, remarks: null,
  equipment_name: null, equipment_model: null, equipment_serial: null, equipment_manufacturer: null,
  equipment_year_of_make: null, equipment_specifications: null, equipment_condition: null,
  estimated_repair_cost: null, annual_maint_cost: null, remaining_life_years: null, replacement_cost: null,
  custom_prompt: null, custom_kind: null,
  deficiency_status: null, deficiency_action: null, deficiency_closed_at: null,
});

const str = (v: unknown) => (typeof v === "string" && v.trim() !== "" ? v : null);
const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) throw new BadRequest(`Not a number: ${String(v)}`);
  return n;
};

export function sectionOf(qId: string): string {
  const parts = qId.split("-");
  // Custom questions are `custom-<SECTION>-<timestamp>`; template ids are `<SECTION>-...` / `c01`.
  return (parts[0] === "custom" ? parts[1] ?? "CUSTOM" : parts[0]).toUpperCase();
}

// Maps one answer onto the typed columns. YES_NO: YES/NO go to bool_value; N/A goes to text_value
// 'NA' with bool_value NULL. (It used to be stored as bool false, i.e. "No", and then counted as a
// failed check.)
function applyAnswer(it: ItemRow, kind: string, raw: string) {
  if (kind === "GRADE") {
    if (!GRADE_SET.has(raw)) throw new BadRequest(`Invalid grade: ${raw}`);
    it.grade_value = raw;
  } else if (kind === "YES_NO") {
    if (raw === "YES") it.bool_value = true;
    else if (raw === "NO") it.bool_value = false;
    else if (raw === "NA") it.text_value = "NA";
    else throw new BadRequest(`Invalid Yes/No answer: ${raw}`);
  } else if (kind === "NUMBER") {
    it.number_value = num(raw);
  } else if (kind === "DATE") {
    if (!ISO_DATE.test(raw)) throw new BadRequest(`Invalid date: ${raw}`);
    it.date_value = raw;
  } else {
    it.text_value = raw;
  }
}

export interface SaveBody {
  inspectionType: string;
  answers?: Record<string, string>;
  questionMeta?: Record<string, string>;
  remarks?: Record<string, string>;
  attachments?: Record<string, any[]>;
  customQuestions?: { id: string; sectionCode: string; prompt: string; answerKind: string }[];
  inventory?: any[];
  projection?: { yearTotals?: number[]; grandTotal?: number };
  sparesCheck?: any[];
  defects?: any[];
}

export interface Rows { items: ItemRow[]; attachments: AttachmentRow[]; spares: SparesRow[]; capex: number[] | null; capexTotal: number }

// carry: previously stored deficiency tracking, keyed by `${section_code}\u0000${prompt}`, so an
// update doesn't wipe it.
export function buildRows(body: SaveBody, newId: () => string, carry?: Map<string, Pick<ItemRow, "deficiency_status" | "deficiency_action" | "deficiency_closed_at">>): Rows {
  const answers = body.answers ?? {};
  const meta = body.questionMeta ?? {};
  const remarks = body.remarks ?? {};
  const atts = body.attachments ?? {};
  const items: ItemRow[] = [];
  const attachments: AttachmentRow[] = [];
  const defects = Array.isArray(body.defects) ? body.defects : [];
  const defectKeys = new Set(defects.map((d) => d?.rowKey).filter(Boolean));
  const customs = new Map((body.customQuestions ?? []).map((c) => [c.id, c]));

  const push = (it: ItemRow) => {
    const c = carry?.get(`${it.section_code}\u0000${it.prompt}`);
    if (c) Object.assign(it, c);
    items.push(it);
    return it;
  };
  const addAtts = (it: ItemRow, key: string, fallbackType: string) => {
    for (const a of atts[key] ?? []) {
      if (!a?.url) continue;
      attachments.push({
        inspection_item_id: it.id, question_id: key, file_name: a.name ?? null,
        file_url: a.url, file_type: a.fileType ?? fallbackType, file_size: Number(a.size) || 0,
      });
    }
  };

  // 1. Questions: any with an answer, a remark, an attachment, or that the inspector added.
  const qIds = new Set<string>([
    ...Object.keys(answers), ...Object.keys(remarks),
    ...Object.keys(atts).filter((k) => !defectKeys.has(k)), ...customs.keys(),
  ]);
  for (const qId of qIds) {
    const raw = answers[qId] ?? "";
    const rem = str(remarks[qId]);
    const files = (atts[qId] ?? []).filter((a) => a?.url);
    const custom = customs.get(qId);
    if (!raw && !rem && files.length === 0 && !custom) continue;
    const kind = custom?.answerKind ?? meta[qId] ?? "TEXT";
    const it = blankItem(newId(), custom ? String(custom.sectionCode).toUpperCase() : sectionOf(qId), qId, items.length);
    if (raw) applyAnswer(it, kind, raw);
    it.remarks = rem;
    if (custom) { it.custom_prompt = custom.prompt; it.custom_kind = custom.answerKind; }
    push(it);
    addAtts(it, qId, "document");
  }

  // 2. Pre-Purchase equipment inventory
  if (body.inspectionType === "PRE_PURCHASE" && Array.isArray(body.inventory)) {
    for (const e of body.inventory) {
      const it = blankItem(newId(), String(e.sectionCode ?? "EQUIPMENT"), String(e.equipmentName ?? ""), items.length);
      if (e.grade) {
        if (!GRADE_SET.has(e.grade)) throw new BadRequest(`Invalid grade: ${e.grade}`);
        it.grade_value = e.grade;
      }
      it.equipment_name = String(e.equipmentName ?? "");
      it.equipment_model = str(e.equipmentModel);
      it.equipment_serial = str(e.equipmentSerial);
      it.equipment_manufacturer = str(e.manufacturer);
      it.equipment_year_of_make = str(e.yearOfMake);
      it.equipment_specifications = str(e.specifications);
      it.equipment_condition = str(e.condition);
      it.estimated_repair_cost = num(e.estimatedRepairCost);
      it.annual_maint_cost = num(e.annualMaintCost);
      it.remaining_life_years = num(e.remainingLifeYears);
      it.replacement_cost = num(e.replacementCost);
      it.remarks = str(e.remarks);
      push(it);
    }
  }

  // 3. Defect List: description in prompt, defect type in text_value; photos keyed by rowKey.
  for (const d of defects) {
    if (!d?.description?.trim()) continue;
    const it = blankItem(newId(), "DEFECT_LIST", d.description, items.length);
    it.text_value = str(d.defectType);
    it.remarks = str(d.remarks);
    push(it);
    addAtts(it, d.rowKey, "photo");
  }

  // 4. Random Spares Check: rows with nothing typed are dropped.
  const spares: SparesRow[] = [];
  if (Array.isArray(body.sparesCheck)) {
    for (const row of body.sparesCheck) {
      if (!Object.values(row).some((v) => (typeof v === "string" ? v.trim() : v))) continue;
      spares.push({
        sr_no: spares.length + 1,
        equipment_name: str(row.equipment_name), part_name: str(row.part_name), part_number: str(row.part_number),
        fms_spare_location: str(row.fms_spare_location), qty_per_fms: num(row.qty_per_fms), actual_rob: num(row.actual_rob),
        actual_location: str(row.actual_location), reconciliation_notes: str(row.reconciliation_notes),
      });
    }
  }

  // 5. CapEx projection snapshot (derived from the inventory; recomputed in the form on reload).
  const yt = body.projection?.yearTotals;
  const capex = Array.isArray(yt) && yt.length === 5 ? yt.map(Number) : null;
  return { items, attachments, spares, capex, capexTotal: Number(body.projection?.grandTotal) || 0 };
}

const ITEM_COLS = [
  "id", "section_code", "prompt", "grade_value", "bool_value", "text_value", "number_value", "date_value", "remarks",
  "equipment_name", "equipment_model", "equipment_serial", "equipment_manufacturer", "equipment_year_of_make",
  "equipment_specifications", "equipment_condition", "estimated_repair_cost", "annual_maint_cost",
  "remaining_life_years", "replacement_cost", "custom_prompt", "custom_kind", "sort_order",
  "deficiency_status", "deficiency_action", "deficiency_closed_at",
] as const;

// The INSERT queries for a set of rows, in dependency order (items before attachments).
// One statement per table (jsonb_to_recordset), so a 550-question form is still ~4 statements.
export function insertQueries(inspId: string, r: Rows) {
  const qs: ReturnType<typeof sql.query>[] = [];
  if (r.items.length) {
    qs.push(sql.query(
      `INSERT INTO inspection_items (inspection_id, ${ITEM_COLS.join(", ")})
       SELECT $1::uuid, id, section_code, prompt, grade_value::grade, bool_value, text_value, number_value, date_value, remarks,
              equipment_name, equipment_model, equipment_serial, equipment_manufacturer, equipment_year_of_make,
              equipment_specifications, equipment_condition, estimated_repair_cost, annual_maint_cost,
              remaining_life_years, replacement_cost, custom_prompt, custom_kind, sort_order,
              deficiency_status, deficiency_action, deficiency_closed_at
       FROM jsonb_to_recordset($2::jsonb) AS x(
         id uuid, section_code text, prompt text, grade_value text, bool_value boolean, text_value text,
         number_value numeric, date_value date, remarks text, equipment_name text, equipment_model text,
         equipment_serial text, equipment_manufacturer text, equipment_year_of_make text,
         equipment_specifications text, equipment_condition text, estimated_repair_cost numeric,
         annual_maint_cost numeric, remaining_life_years numeric, replacement_cost numeric,
         custom_prompt text, custom_kind text, sort_order int, deficiency_status text, deficiency_action text,
         deficiency_closed_at timestamptz)`,
      [inspId, JSON.stringify(r.items)]));
  }
  if (r.attachments.length) {
    qs.push(sql.query(
      `INSERT INTO attachments (inspection_id, inspection_item_id, question_id, file_name, file_url, file_type, file_size)
       SELECT $1::uuid, inspection_item_id, question_id, file_name, file_url, file_type, file_size
       FROM jsonb_to_recordset($2::jsonb) AS x(
         inspection_item_id uuid, question_id text, file_name text, file_url text, file_type text, file_size int)`,
      [inspId, JSON.stringify(r.attachments)]));
  }
  if (r.spares.length) {
    qs.push(sql.query(
      `INSERT INTO random_spares_check_items
         (inspection_id, sr_no, equipment_name, part_name, part_number, fms_spare_location, qty_per_fms,
          actual_rob, actual_location, reconciliation_notes)
       SELECT $1::uuid, sr_no, equipment_name, part_name, part_number, fms_spare_location, qty_per_fms,
              actual_rob, actual_location, reconciliation_notes
       FROM jsonb_to_recordset($2::jsonb) AS x(
         sr_no int, equipment_name text, part_name text, part_number text, fms_spare_location text,
         qty_per_fms numeric, actual_rob numeric, actual_location text, reconciliation_notes text)`,
      [inspId, JSON.stringify(r.spares)]));
  }
  if (r.capex) {
    const [y1, y2, y3, y4, y5] = r.capex;
    qs.push(sql.query(
      `INSERT INTO capex_projections (inspection_id, year_1, year_2, year_3, year_4, year_5, total)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [inspId, y1, y2, y3, y4, y5, r.capexTotal]));
  }
  return qs;
}
