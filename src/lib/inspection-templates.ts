// ---------------------------------------------------------------------
// Shared domain types + client-side fallback templates.
// In production the templates are fetched from Postgres
// (template_sections / template_questions); this module mirrors the
// same shape so the UI works before the DB is wired, and provides the
// vessel-type map that drives conditional rendering.
// ---------------------------------------------------------------------

export const VESSEL_TYPES = [
  { value: "BULK_CARRIER", label: "Bulk Carrier" },
  { value: "CONTAINER_SHIP", label: "Container Ship" },
  { value: "OIL_TANKER", label: "Oil Tanker" },
  { value: "LNG_CARRIER", label: "LNG Carrier" },
  { value: "GENERAL_CARGO", label: "General Cargo" },
  { value: "LPG_TANKER", label: "LPG Tanker" },
  { value: "CRUISE_SHIP", label: "Cruise Ship" },
] as const;

export type VesselType = (typeof VESSEL_TYPES)[number]["value"];
export type InspectionType = "CONDITION" | "PRE_PURCHASE";
export type Grade = "GOOD" | "FAIR" | "POOR" | "ACTION_REQUIRED" | "NOT_SEEN";

export const GRADES: { value: Grade; label: string; tone: string }[] = [
  { value: "GOOD", label: "Good", tone: "bg-emerald-100 text-emerald-800" },
  { value: "FAIR", label: "Fair", tone: "bg-amber-100 text-amber-800" },
  { value: "POOR", label: "Poor", tone: "bg-orange-100 text-orange-800" },
  { value: "ACTION_REQUIRED", label: "Action Required", tone: "bg-red-100 text-red-800" },
  { value: "NOT_SEEN", label: "Not Seen", tone: "bg-slate-100 text-slate-600" },
];

export interface Question {
  id: string;
  prompt: string;
  answerKind: "GRADE" | "YES_NO" | "TEXT" | "NUMBER" | "DATE";
  custom?: boolean;
}

export interface Section {
  code: string;
  title: string;
  vesselType: VesselType | null; // null = universal
  questions: Question[];
}

export interface EquipmentItem {
  id: string;
  sectionCode: string;
  equipmentName: string;      // prefilled from template, editable
  equipmentModel: string;     // editable
  equipmentSerial: string;    // editable
  grade: Grade | "";
  estimatedRepairCost: number;   // immediate CapEx (USD)
  annualMaintCost: number;       // baseline maintenance (USD/yr)
  remainingLifeYears: number;    // inspector estimate
  replacementCost: number;       // triggered if life < horizon
  remarks: string;
}

// ---------- Condition Inspection templates (mirrors seed.sql) ---------
const universalCondition: Section[] = [
  {
    code: "CERTIFICATION", title: "Certification & Documentation", vesselType: null,
    questions: [
      { id: "c1", prompt: "Are all Class and Statutory certificates valid?", answerKind: "YES_NO" },
      { id: "c2", prompt: "Outstanding Conditions of Class (detail)", answerKind: "TEXT" },
      { id: "c3", prompt: "Dry dock renewal due date", answerKind: "DATE" },
    ],
  },
  {
    code: "NAVIGATION", title: "Bridge & Navigation Equipment", vesselType: null,
    questions: [
      { id: "n1", prompt: "Condition of radar, ECDIS, echo sounder and GMDSS equipment", answerKind: "GRADE" },
      { id: "n2", prompt: "Are passage planning and chart corrections up to date?", answerKind: "YES_NO" },
    ],
  },
  {
    code: "SAFETY_MGMT", title: "Safety Management & LSA/FFA", vesselType: null,
    questions: [
      { id: "s1", prompt: "Condition of lifeboats, liferafts and launching arrangements", answerKind: "GRADE" },
      { id: "s2", prompt: "Condition of fixed and portable fire fighting equipment", answerKind: "GRADE" },
      { id: "s3", prompt: "Are records for testing of critical equipment in place per SMS?", answerKind: "YES_NO" },
    ],
  },
  {
    code: "POLLUTION", title: "Pollution Prevention", vesselType: null,
    questions: [
      { id: "p1", prompt: "Condition of OWS, sewage treatment plant and incinerator", answerKind: "GRADE" },
      { id: "p2", prompt: "Is the BWTS operational and records maintained?", answerKind: "YES_NO" },
    ],
  },
  {
    code: "STRUCTURAL", title: "Structural Condition", vesselType: null,
    questions: [
      { id: "st1", prompt: "Is the hull free from visible structural defects warranting investigation?", answerKind: "YES_NO" },
      { id: "st2", prompt: "General condition, appearance and cleanliness of the hull", answerKind: "GRADE" },
      { id: "st3", prompt: "General condition of weather decks and non-slip surfaces", answerKind: "GRADE" },
      { id: "st4", prompt: "Condition of deck openings, watertight doors and hatch access lids", answerKind: "GRADE" },
      { id: "st5", prompt: "Condition of vents, air pipes and service pipework (corrosion/pitting)", answerKind: "GRADE" },
    ],
  },
  {
    code: "ENGINE_ROOM", title: "Engine & Steering Compartments", vesselType: null,
    questions: [
      { id: "e1", prompt: "Overall impression of engine room (cleanliness, bilges, leaks)", answerKind: "GRADE" },
      { id: "e2", prompt: "Main engine condition and performance reports satisfactory?", answerKind: "YES_NO" },
      { id: "e3", prompt: "Auxiliary engines within stated overhaul intervals?", answerKind: "YES_NO" },
      { id: "e4", prompt: "Steering gear condition (leakage, emergency steering instructions)", answerKind: "GRADE" },
    ],
  },
];

const typeSpecificCondition: Section[] = [
  {
    code: "CARGO_HOLDS", title: "Cargo Holds, Hatch Covers, Cranes & Grabs", vesselType: "BULK_CARRIER",
    questions: [
      { id: "bh1", prompt: "Condition of cargo hold structure, frames and coatings", answerKind: "GRADE" },
      { id: "bh2", prompt: "Condition of hatch covers, coamings, seals and cleats", answerKind: "GRADE" },
      { id: "bh3", prompt: "Condition and test records of cargo cranes and grabs", answerKind: "GRADE" },
      { id: "bh4", prompt: "Is the Water Ingress Alarm System operational?", answerKind: "YES_NO" },
    ],
  },
  {
    code: "CONTAINER_SYS", title: "Container Securing, Lashing & Reefer Systems", vesselType: "CONTAINER_SHIP",
    questions: [
      { id: "cs1", prompt: "Condition of cell guides, lashing bridges and securing points", answerKind: "GRADE" },
      { id: "cs2", prompt: "Condition and inventory of lashing gear (rods, turnbuckles, twistlocks)", answerKind: "GRADE" },
      { id: "cs3", prompt: "Are reefer receptacles and monitoring systems operational?", answerKind: "YES_NO" },
    ],
  },
  {
    code: "CARGO_TANKS", title: "Cargo Tanks, COW, Inert Gas & Venting Systems", vesselType: "OIL_TANKER",
    questions: [
      { id: "ot1", prompt: "Condition of cargo tank coatings and structure (as sighted)", answerKind: "GRADE" },
      { id: "ot2", prompt: "Is the Inert Gas System operational with valid records?", answerKind: "YES_NO" },
      { id: "ot3", prompt: "Condition of cargo pumps, COW machines and P/V venting system", answerKind: "GRADE" },
    ],
  },
  {
    code: "CARGO_CONTAINMENT", title: "Cargo Containment, Reliquefaction & Gas Handling", vesselType: "LNG_CARRIER",
    questions: [
      { id: "lng1", prompt: "Condition of containment system and cofferdam/hold spaces", answerKind: "GRADE" },
      { id: "lng2", prompt: "Are gas detection and ESD systems tested and operational?", answerKind: "YES_NO" },
      { id: "lng3", prompt: "Condition of cargo compressors / reliquefaction plant", answerKind: "GRADE" },
    ],
  },
  {
    code: "TWEEN_DECKS", title: "Tween Decks, Hatch Covers & Cargo Gear", vesselType: "GENERAL_CARGO",
    questions: [
      { id: "gc1", prompt: "Condition of tween decks, pontoons and cargo battens", answerKind: "GRADE" },
      { id: "gc2", prompt: "Condition and certification of cargo derricks/cranes", answerKind: "GRADE" },
    ],
  },
  {
    code: "GAS_SYSTEMS", title: "Cargo Tanks, Compressors & Gas Detection", vesselType: "LPG_TANKER",
    questions: [
      { id: "lpg1", prompt: "Condition of cargo tanks, domes and insulation", answerKind: "GRADE" },
      { id: "lpg2", prompt: "Are fixed gas detection systems calibrated and operational?", answerKind: "YES_NO" },
    ],
  },
  {
    code: "HOTEL_PAX", title: "Hotel Services, Passenger Spaces & Evacuation", vesselType: "CRUISE_SHIP",
    questions: [
      { id: "cr1", prompt: "Condition of passenger cabins and public spaces", answerKind: "GRADE" },
      { id: "cr2", prompt: "Are Marine Evacuation Systems and muster arrangements in order?", answerKind: "YES_NO" },
    ],
  },
];

export function getConditionSections(vesselType: VesselType): Section[] {
  return [
    ...universalCondition,
    ...typeSpecificCondition.filter((s) => s.vesselType === vesselType),
  ];
}

// ---------- Pre-Purchase default equipment inventory per vessel type ---
// Equipment names are prefilled; model/serial are always editable.
const baseInventory = (sectionCode: string, names: string[]): EquipmentItem[] =>
  names.map((name, i) => ({
    id: `${sectionCode}-${i}`,
    sectionCode,
    equipmentName: name,
    equipmentModel: "",
    equipmentSerial: "",
    grade: "",
    estimatedRepairCost: 0,
    annualMaintCost: 0,
    remainingLifeYears: 10,
    replacementCost: 0,
    remarks: "",
  }));

const universalInventory: EquipmentItem[] = [
  ...baseInventory("MACHINERY_INV", [
    "Main Engine", "Auxiliary Engine No.1", "Auxiliary Engine No.2",
    "Auxiliary Engine No.3", "Boiler", "Steering Gear",
    "Fresh Water Generator", "Air Compressors", "Oily Water Separator",
    "Sewage Treatment Plant", "Ballast Water Treatment System", "Incinerator",
  ]),
  ...baseInventory("NAV_COMMS_INV", [
    "Radar (X-Band)", "Radar (S-Band)", "ECDIS", "Echo Sounder",
    "GPS/DGPS", "AIS", "GMDSS Console", "EPIRB", "SART", "Aldis Lamp",
  ]),
  ...baseInventory("SAFETY_INV", [
    "Lifeboat(s)", "Rescue Boat", "Liferafts", "SCBA Sets",
    "Fixed CO2 System", "Main Fire Pump", "Emergency Fire Pump",
  ]),
];

const typeInventory: Record<VesselType, EquipmentItem[]> = {
  BULK_CARRIER: baseInventory("CARGO_GEAR_INV", ["Cargo Crane No.1", "Cargo Crane No.2", "Cargo Crane No.3", "Cargo Crane No.4", "Grabs", "Hatch Cover Hydraulics", "Water Ingress Alarm System"]),
  CONTAINER_SHIP: baseInventory("LASHING_INV", ["Lashing Gear Set", "Twistlock Inventory", "Reefer Monitoring System", "Cell Guide System"]),
  OIL_TANKER: baseInventory("CARGO_SYS_INV", ["Cargo Pump No.1", "Cargo Pump No.2", "Cargo Pump No.3", "Inert Gas System", "COW Machines", "P/V Valves & Venting"]),
  LNG_CARRIER: baseInventory("GAS_PLANT_INV", ["Cargo Compressors", "Reliquefaction Plant", "Gas Detection System", "ESD System", "Cargo Heaters/Vaporisers"]),
  GENERAL_CARGO: baseInventory("CARGO_GEAR_INV", ["Cargo Crane No.1", "Cargo Crane No.2", "Hatch Covers & Pontoons", "Tween Deck Pontoons"]),
  LPG_TANKER: baseInventory("GAS_PLANT_INV", ["Cargo Compressor No.1", "Cargo Compressor No.2", "Cargo Heater", "Gas Detection System"]),
  CRUISE_SHIP: baseInventory("HOTEL_PLANT_INV", ["Marine Evacuation Systems", "HVAC Plant", "Galley Equipment", "Provision Refrigeration Plant", "Stabilisers"]),
};

export function getPrePurchaseInventory(vesselType: VesselType): EquipmentItem[] {
  return [...universalInventory, ...typeInventory[vesselType]].map((it) => ({ ...it }));
}
