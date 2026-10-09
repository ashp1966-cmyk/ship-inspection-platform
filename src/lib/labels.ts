// Display labels for enum values. Always label by the actual value; never "X or else Y".
export const INSPECTION_TYPE_LABELS: Record<string, string> = {
  CONDITION: "Condition",
  PRE_PURCHASE: "Pre-Purchase",
  TECHNICAL: "Technical",
  RIGHTSHIP: "RightShip",
};
export const inspectionTypeLabel = (t?: string | null) => (t && INSPECTION_TYPE_LABELS[t]) || t || "—";

export const INSPECTION_TYPE_COLORS: Record<string, { bg: string; fg: string }> = {
  CONDITION:    { bg: "#E0F2FE", fg: "#0369A1" },
  PRE_PURCHASE: { bg: "#FEF3C7", fg: "#92400E" },
  TECHNICAL:    { bg: "#EDE9FE", fg: "#5B21B6" },
  RIGHTSHIP:    { bg: "#DCFCE7", fg: "#166534" },
};
export const inspectionTypeColor = (t?: string | null) =>
  (t && INSPECTION_TYPE_COLORS[t]) || { bg: "#F3F4F6", fg: "#374151" };

export const VESSEL_TYPES = [
  "BULK_CARRIER", "CONTAINER_SHIP", "OIL_TANKER", "LNG_CARRIER", "GENERAL_CARGO", "LPG_TANKER", "CRUISE_SHIP",
] as const;
