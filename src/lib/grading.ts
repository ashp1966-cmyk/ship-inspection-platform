// =====================================================================
// Grade scoring engine — mirrors the Idwal Grade methodology
// Converts inspection item grades into 0-100 section and overall scores
// =====================================================================

export const GRADE_SCORE: Record<string, number> = {
  GOOD:           100,
  FAIR:            70,
  POOR:            40,
  ACTION_REQUIRED:  0,
  NOT_SEEN:        -1,  // excluded from calculation
  NA:              -1,  // excluded
  YES:            100,
  NO:               0,
};

export interface SectionScore {
  sectionCode:      string;
  sectionTitle:     string;
  score:            number;
  totalItems:       number;
  gradedItems:      number;
  deficiencyCount:  number;
  grade:            string; // GOOD/FAIR/POOR/ACTION_REQUIRED
}

export interface InspectionScore {
  overallScore:    number;
  conditionScore:  number;
  managementScore: number;
  grade:           string;
  sections:        SectionScore[];
}

// Condition sections (structural/equipment)
const CONDITION_SECTIONS = [
  "STRUCTURAL","HULL_DECKS","BALLAST","DECK_MACHINERY",
  "ENGINE_ROOM","EQUIP_TESTS","CARGO_HOLDS","CONTAINER_SYS",
  "CARGO_TANKS","CARGO_CONTAINMENT","GAS_SYSTEMS","HOTEL_PAX",
  "TWEEN_DECKS",
];

// Management sections
const MANAGEMENT_SECTIONS = [
  "CERTIFICATION","CREW_MGMT","NAVIGATION","SAFETY_MGMT","POLLUTION",
];

export function scoreFromNumber(n: number): string {
  if (n >= 85) return "GOOD";
  if (n >= 65) return "FAIR";
  if (n >= 40) return "POOR";
  return "ACTION_REQUIRED";
}

export function calculateSectionScore(
  items: { grade_value: string | null; bool_value: boolean | null }[],
  sectionCode: string,
  sectionTitle: string
): SectionScore {
  let total = 0, count = 0, deficiencies = 0;

  for (const item of items) {
    let score = -1;
    if (item.grade_value) {
      score = GRADE_SCORE[item.grade_value] ?? -1;
      if (item.grade_value === "POOR" || item.grade_value === "ACTION_REQUIRED") {
        deficiencies++;
      }
    } else if (item.bool_value !== null && item.bool_value !== undefined) {
      score = item.bool_value ? 100 : 0;
      if (!item.bool_value) deficiencies++;
    }

    if (score >= 0) { total += score; count++; }
  }

  const score = count > 0 ? Math.round(total / count) : 0;
  return {
    sectionCode, sectionTitle,
    score, totalItems: items.length,
    gradedItems: count, deficiencyCount: deficiencies,
    grade: scoreFromNumber(score),
  };
}

export function calculateOverallScore(sections: SectionScore[]): InspectionScore {
  const condSections = sections.filter(s => CONDITION_SECTIONS.includes(s.sectionCode));
  const mgmtSections = sections.filter(s => MANAGEMENT_SECTIONS.includes(s.sectionCode));
  const scored = sections.filter(s => s.gradedItems > 0);

  const avg = (arr: SectionScore[]) => {
    const valid = arr.filter(s => s.gradedItems > 0);
    if (!valid.length) return 0;
    return Math.round(valid.reduce((a, b) => a + b.score, 0) / valid.length);
  };

  const conditionScore  = avg(condSections);
  const managementScore = avg(mgmtSections);
  const overallScore    = scored.length > 0
    ? Math.round(scored.reduce((a, b) => a + b.score, 0) / scored.length)
    : 0;

  return {
    overallScore, conditionScore, managementScore,
    grade: scoreFromNumber(overallScore),
    sections,
  };
}

export function generateExecutiveSummary(
  vesselName: string,
  vesselType: string,
  score: InspectionScore,
  deficiencies: { prompt: string; grade_value: string; section_code: string }[]
): string {
  const typeLabel: Record<string, string> = {
    BULK_CARRIER:"Bulk Carrier", CONTAINER_SHIP:"Container Ship",
    OIL_TANKER:"Oil Tanker", LNG_CARRIER:"LNG Carrier",
    GENERAL_CARGO:"General Cargo", LPG_TANKER:"LPG Tanker", CRUISE_SHIP:"Cruise Ship",
  };

  const gradeWord: Record<string, string> = {
    GOOD:"good", FAIR:"fair to satisfactory", POOR:"poor",
    ACTION_REQUIRED:"unsatisfactory — immediate action required",
  };

  const actionItems = deficiencies.filter(d => d.grade_value === "ACTION_REQUIRED");
  const poorItems   = deficiencies.filter(d => d.grade_value === "POOR");

  let summary = `The vessel ${vesselName} is a ${typeLabel[vesselType] ?? vesselType}. `;
  summary += `This inspection recorded an overall score of ${score.overallScore}/100 (${gradeWord[score.grade] ?? score.grade}). `;

  if (score.conditionScore > 0) {
    summary += `The structural and equipment condition scored ${score.conditionScore}/100. `;
  }
  if (score.managementScore > 0) {
    summary += `Onboard management and documentation scored ${score.managementScore}/100. `;
  }

  if (actionItems.length === 0 && poorItems.length === 0) {
    summary += "No significant deficiencies were identified during the inspection. ";
  } else {
    if (actionItems.length > 0) {
      summary += `${actionItems.length} item${actionItems.length > 1 ? "s" : ""} requiring immediate action ${actionItems.length > 1 ? "were" : "was"} identified. `;
    }
    if (poorItems.length > 0) {
      summary += `${poorItems.length} item${poorItems.length > 1 ? "s were" : " was"} graded Poor and require attention. `;
    }

    const worst = [...actionItems, ...poorItems].slice(0, 3);
    if (worst.length > 0) {
      summary += "Key findings include: ";
      summary += worst.map(d => d.prompt.replace(/\?$/, "")).join("; ") + ". ";
    }
  }

  // Weakest section
  const weakest = [...score.sections].filter(s => s.gradedItems > 0).sort((a, b) => a.score - b.score)[0];
  if (weakest && weakest.score < 70) {
    summary += `The section requiring most attention is ${weakest.sectionTitle} (score: ${weakest.score}/100). `;
  }

  return summary.trim();
}
