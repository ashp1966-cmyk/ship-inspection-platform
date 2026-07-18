import type { EquipmentItem } from "./inspection-templates";

// ---------------------------------------------------------------------
// 5-Year Lifespan & Maintenance Cost Projection
//
// Per line item, per projection year t (1..5):
//   Year 1:            estimatedRepairCost (immediate CapEx)
//                    + annualMaintCost
//   Years 2..5:        annualMaintCost * (1 + inflation)^(t-1)
//                    * gradeMaintenanceMultiplier   (worn kit costs more)
//   Replacement year:  + replacementCost * (1 + inflation)^(t-1)
//                      when remainingLifeYears falls inside the horizon
//
// This gives a buyer a defensible, line-item CapEx/OpEx forecast for
// negotiation and asset-valuation purposes. All figures USD, nominal.
// ---------------------------------------------------------------------

export const DEFAULT_INFLATION = 0.03;
export const HORIZON_YEARS = 5;

const GRADE_MAINT_MULTIPLIER: Record<string, number> = {
  GOOD: 1.0,
  FAIR: 1.25,
  POOR: 1.6,
  ACTION_REQUIRED: 2.0,
  NOT_SEEN: 1.1,
  "": 1.0,
};

export interface ItemProjection {
  itemId: string;
  equipmentName: string;
  years: number[];          // length 5, USD per projection year
  total: number;
  replacementYear: number | null; // 1..5 if replacement falls in horizon
}

export interface FleetProjection {
  items: ItemProjection[];
  yearTotals: number[];     // length 5
  grandTotal: number;
}

export function projectItem(
  item: EquipmentItem,
  inflation: number = DEFAULT_INFLATION
): ItemProjection {
  const mult = GRADE_MAINT_MULTIPLIER[item.grade] ?? 1.0;
  const years: number[] = [];
  const replacementYear =
    item.remainingLifeYears > 0 && item.remainingLifeYears <= HORIZON_YEARS
      ? Math.ceil(item.remainingLifeYears)
      : null;

  for (let t = 1; t <= HORIZON_YEARS; t++) {
    const infl = Math.pow(1 + inflation, t - 1);
    let cost = item.annualMaintCost * mult * infl;
    if (t === 1) cost += item.estimatedRepairCost;
    if (replacementYear === t) cost += item.replacementCost * infl;
    years.push(Math.round(cost));
  }

  return {
    itemId: item.id,
    equipmentName: item.equipmentName,
    years,
    total: years.reduce((a, b) => a + b, 0),
    replacementYear,
  };
}

export function projectFleet(
  items: EquipmentItem[],
  inflation: number = DEFAULT_INFLATION
): FleetProjection {
  const projections = items.map((i) => projectItem(i, inflation));
  const yearTotals = Array.from({ length: HORIZON_YEARS }, (_, t) =>
    projections.reduce((sum, p) => sum + p.years[t], 0)
  );
  return {
    items: projections,
    yearTotals,
    grandTotal: yearTotals.reduce((a, b) => a + b, 0),
  };
}

export const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
