// =====================================================================
// Inspection Templates — all questions derived from the CL Christina
// condition inspection report structure. Section/question IDs are stable.
// =====================================================================

export const VESSEL_TYPES = [
  { value: "BULK_CARRIER",    label: "Bulk Carrier" },
  { value: "CONTAINER_SHIP",  label: "Container Ship" },
  { value: "OIL_TANKER",      label: "Oil Tanker" },
  { value: "LNG_CARRIER",     label: "LNG Carrier" },
  { value: "GENERAL_CARGO",   label: "General Cargo" },
  { value: "LPG_TANKER",      label: "LPG Tanker" },
  { value: "CRUISE_SHIP",     label: "Cruise Ship" },
] as const;

export type VesselType   = (typeof VESSEL_TYPES)[number]["value"];
export type InspectionType = "CONDITION" | "PRE_PURCHASE";
export type Grade = "GOOD" | "FAIR" | "POOR" | "ACTION_REQUIRED" | "NOT_SEEN" | "NA";

export const GRADES: { value: Grade; label: string; tone: string }[] = [
  { value: "GOOD",           label: "Good",            tone: "bg-emerald-100 text-emerald-800" },
  { value: "FAIR",           label: "Fair",            tone: "bg-amber-100 text-amber-800" },
  { value: "POOR",           label: "Poor",            tone: "bg-orange-100 text-orange-800" },
  { value: "ACTION_REQUIRED",label: "Action Required", tone: "bg-red-100 text-red-800" },
  { value: "NOT_SEEN",       label: "Not Seen",        tone: "bg-slate-100 text-slate-600" },
  { value: "NA",             label: "N/A",             tone: "bg-gray-100 text-gray-500" },
];

export interface Question {
  id: string;
  prompt: string;
  answerKind: "GRADE" | "YES_NO" | "TEXT" | "NUMBER" | "DATE";
  custom?: boolean; // user-added
}

export interface Section {
  code: string;
  title: string;
  vesselType: VesselType | null;
  questions: Question[];
}

export interface EquipmentItem {
  id: string;
  sectionCode: string;
  equipmentName: string;
  equipmentModel: string;
  equipmentSerial: string;
  grade: Grade | "";
  estimatedRepairCost: number;
  annualMaintCost: number;
  remainingLifeYears: number;
  replacementCost: number;
  remarks: string;
}

// ─────────────────────────────────────────────────────────────────────
// UNIVERSAL CONDITION SECTIONS (all vessel types)
// ─────────────────────────────────────────────────────────────────────
const universalCondition: Section[] = [
  {
    code: "CERTIFICATION",
    title: "1. Certification & Documentation",
    vesselType: null,
    questions: [
      { id:"c01", prompt:"Is the 'ESP' file and associated documents available (if applicable)?", answerKind:"YES_NO" },
      { id:"c02", prompt:"Computer systems — are records maintained and accessible?", answerKind:"YES_NO" },
      { id:"c03", prompt:"Are the Engine Room (Part I) and Cargo (Part II) Oil Record Books (ORBs) correctly completed and free of any pollution incidents?", answerKind:"YES_NO" },
      { id:"c04", prompt:"If oily water or sludge disposal to cargo/slop tank has taken place, has the event been recorded in both ORBs as per IOPP Form B?", answerKind:"YES_NO" },
      { id:"c05", prompt:"Are files and records maintained as per the Master's Filing System?", answerKind:"YES_NO" },
      { id:"c06", prompt:"Is the vessel in possession of an approved VOC Management Plan and are deck officers aware of its requirements?", answerKind:"YES_NO" },
      { id:"c07", prompt:"Is the vessel provided with an approved Ballast Water and Sediments Management Plan, and are officers aware of BWM requirements?", answerKind:"YES_NO" },
      { id:"c08", prompt:"Does the vessel have a SEEMP and are officers aware of the general requirements?", answerKind:"YES_NO" },
      { id:"c09", prompt:"Have all deficiencies identified by PSC, charterers, P&I club, etc. since the last audit been suitably addressed and reports available?", answerKind:"YES_NO" },
      { id:"c10", prompt:"Is a record of all defects identified during superintendent inspections maintained?", answerKind:"YES_NO" },
      { id:"c11", prompt:"Is SEEMP available onboard and has it been made ship-specific?", answerKind:"YES_NO" },
      { id:"c12", prompt:"Are Deck and Engine logbooks adequately maintained?", answerKind:"YES_NO" },
      { id:"c13", prompt:"Are the Stability booklet, Damage Stability plan and BWMP available and approved?", answerKind:"YES_NO" },
      { id:"c14", prompt:"Are toolbox meetings carried out prior to each job and are records available?", answerKind:"YES_NO" },
      { id:"c15", prompt:"Are internal audits carried out as per the Company's SMS?", answerKind:"YES_NO" },
      { id:"c16", prompt:"Are MLC certificate and associated documents available?", answerKind:"YES_NO" },
      { id:"c17", prompt:"Does the vessel have any outstanding Conditions of Class or Recommendations?", answerKind:"YES_NO" },
      { id:"c18", prompt:"Are classification and statutory certificates available onboard including Form A, Form R, Form E etc.?", answerKind:"YES_NO" },
      { id:"c19", prompt:"Dry dock renewal due date", answerKind:"DATE" },
    ],
  },
  {
    code: "CREW_MGMT",
    title: "2. Crew Management",
    vesselType: null,
    questions: [
      { id:"cr01", prompt:"Does the manning level meet or exceed the Minimum Safe Manning Document?", answerKind:"YES_NO" },
      { id:"cr02", prompt:"Are STCW and flag Administration regulations controlling hours of work to minimise fatigue being followed?", answerKind:"YES_NO" },
      { id:"cr03", prompt:"Are all personnel able to communicate effectively in a common language?", answerKind:"YES_NO" },
      { id:"cr04", prompt:"Are common bathrooms, toilets and crew change rooms clean and in good condition?", answerKind:"GRADE" },
      { id:"cr05", prompt:"Have all deck officers attended a Bridge Resource Management or Bridge Team Management course?", answerKind:"YES_NO" },
      { id:"cr06", prompt:"Are crew and officers mess rooms, recreation rooms, laundry, gymnasium and galley clean and in good condition?", answerKind:"GRADE" },
      { id:"cr07", prompt:"If the vessel is fitted with High Voltage equipment, is staff suitably trained (ETO)?", answerKind:"YES_NO" },
      { id:"cr08", prompt:"Are officers responsible for cargo transfer in possession of certificates of specialised training for the type of cargo carried?", answerKind:"YES_NO" },
      { id:"cr09", prompt:"Date of last unannounced on-board alcohol test", answerKind:"DATE" },
      { id:"cr10", prompt:"Has an unannounced drug and alcohol test by an external agency been carried out?", answerKind:"YES_NO" },
      { id:"cr11", prompt:"Have gangway checks for alcohol been carried out on returning crew members?", answerKind:"YES_NO" },
      { id:"cr12", prompt:"Does each crew member record hours of rest via a networked computer in compliance with MLC?", answerKind:"YES_NO" },
      { id:"cr13", prompt:"Is the Speaking Up policy clearly displayed and are crew aware of how and when to use it?", answerKind:"YES_NO" },
      { id:"cr14", prompt:"Are crew satisfied with the quality, quantity and variety of meals?", answerKind:"YES_NO" },
      { id:"cr15", prompt:"Is the vessel free from any sign of insect or cockroach infestations in the accommodation?", answerKind:"YES_NO" },
      { id:"cr16", prompt:"Are crew able to contact family members using phone, email and internet?", answerKind:"YES_NO" },
      { id:"cr17", prompt:"Are cadets being sufficiently supervised in accordance with their Training schedule?", answerKind:"YES_NO" },
      { id:"cr18", prompt:"Are recreation club account expenses displayed?", answerKind:"YES_NO" },
    ],
  },
  {
    code: "NAVIGATION",
    title: "3. Bridge & Navigation",
    vesselType: null,
    questions: [
      { id:"n01", prompt:"Has the Master written Standing Orders and have deck officers countersigned them as read and understood?", answerKind:"YES_NO" },
      { id:"n02", prompt:"Are deck logbooks and engine movement (bell) books correctly maintained?", answerKind:"YES_NO" },
      { id:"n03", prompt:"Are the vessel's manoeuvring characteristics displayed on the bridge?", answerKind:"YES_NO" },
      { id:"n04", prompt:"Are records maintained of fire and safety rounds being completed after each watch?", answerKind:"YES_NO" },
      { id:"n05", prompt:"Are checklists for pre-arrival, pre-departure, watch handover, Pilot-Master exchange effectively completed?", answerKind:"YES_NO" },
      { id:"n06", prompt:"Has the Bridge been adequately manned at all stages of the voyage and were lookout arrangements adequate?", answerKind:"YES_NO" },
      { id:"n07", prompt:"Is navigation equipment appropriate for the size of the vessel and in good order?", answerKind:"GRADE" },
      { id:"n08", prompt:"Is a GNSS or terrestrial navigation radio navigation system available and in good order?", answerKind:"YES_NO" },
      { id:"n09", prompt:"Is a Navtex receiver available and in good order?", answerKind:"YES_NO" },
      { id:"n10", prompt:"Are a whistle, bell and gong available and in good order?", answerKind:"YES_NO" },
      { id:"n11", prompt:"Are navigation shapes available and in good order?", answerKind:"YES_NO" },
      { id:"n12", prompt:"Is a properly adjusted standard magnetic compass available?", answerKind:"YES_NO" },
      { id:"n13", prompt:"Is a spare magnetic compass available as per size requirements?", answerKind:"YES_NO" },
      { id:"n14", prompt:"Is a telephone available and in good order?", answerKind:"YES_NO" },
      { id:"n15", prompt:"Is an AIS available and in good order?", answerKind:"YES_NO" },
      { id:"n16", prompt:"Is a VHF radio available and in good order?", answerKind:"YES_NO" },
      { id:"n17", prompt:"Is a gyro compass and repeaters available and in good order?", answerKind:"YES_NO" },
      { id:"n18", prompt:"Is a 9 GHz (3 cm X-band) radar available and in good order?", answerKind:"YES_NO" },
      { id:"n19", prompt:"Is a VDR available and in good order, and are deck officers familiar with the procedure to retain VDR data?", answerKind:"YES_NO" },
      { id:"n20", prompt:"Is an ARPA equipped with speed through water input available and in good order?", answerKind:"YES_NO" },
      { id:"n21", prompt:"Are navigation lights in good order?", answerKind:"YES_NO" },
      { id:"n22", prompt:"Is a BNWAS fitted, operational at all times at sea and at anchor?", answerKind:"YES_NO" },
      { id:"n23", prompt:"Are BNWAS reset buttons fitted only in areas of the bridge providing proper lookout?", answerKind:"YES_NO" },
      { id:"n24", prompt:"Are auto to manual steering changeover procedures clearly identified and recorded during river transits?", answerKind:"YES_NO" },
      { id:"n25", prompt:"Are regular gyro and magnetic compass errors being taken and recorded?", answerKind:"YES_NO" },
      { id:"n26", prompt:"Is a comprehensive passage plan available for the previous voyage from berth to berth?", answerKind:"YES_NO" },
      { id:"n27", prompt:"Was position fixing including parallel indexing satisfactory throughout the previous voyage?", answerKind:"YES_NO" },
      { id:"n28", prompt:"Has the GPS been adjusted to the correct datum?", answerKind:"YES_NO" },
      { id:"n29", prompt:"Are ECDIS fitted — does it meet SOLAS requirements and is an approved backup system provided? (state model)", answerKind:"TEXT" },
    ],
  },
  {
    code: "SAFETY_MGMT",
    title: "4. Safety Management",
    vesselType: null,
    questions: [
      { id:"s01", prompt:"Is PPE (boiler suits, safety footwear, eye/ear protection, harnesses, chemical protective equipment) provided and worn as required?", answerKind:"YES_NO" },
      { id:"s02", prompt:"Is there a procedure for reporting, investigating and closing out accidents, incidents, non-conformities and near misses?", answerKind:"YES_NO" },
      { id:"s03", prompt:"Are smoking regulations posted and adhered to, and smoke rooms adequately identified?", answerKind:"YES_NO" },
      { id:"s04", prompt:"Are external doors, ports and windows kept closed in port?", answerKind:"YES_NO" },
      { id:"s05", prompt:"Is all loose gear on deck, in stores and in internal spaces properly secured?", answerKind:"YES_NO" },
      { id:"s06", prompt:"Are lifeboat and fire drills regularly held?", answerKind:"YES_NO" },
      { id:"s07", prompt:"Is regular training in the use of life-saving equipment being undertaken?", answerKind:"YES_NO" },
      { id:"s08", prompt:"Condition of Provision / Trolley Cranes", answerKind:"GRADE" },
      { id:"s09", prompt:"Are all medicines available in First Aid kits as per SMS? Are first aid kits provided at bridge, hospital, engine room, galley?", answerKind:"YES_NO" },
      { id:"s10", prompt:"Are portable gas and oxygen analysers appropriate to cargoes carried, in good order, and are calibration records available?", answerKind:"YES_NO" },
      { id:"s11", prompt:"Are officers familiar with use and calibration of portable oxygen and hydrocarbon analysers?", answerKind:"YES_NO" },
      { id:"s12", prompt:"Is span calibration gas available for fixed and portable analysers on board?", answerKind:"YES_NO" },
      { id:"s13", prompt:"Are hot work procedures in accordance with ISGOTT Section 9.4 and OCIMF guidelines?", answerKind:"YES_NO" },
      { id:"s14", prompt:"Are spare oxygen and acetylene cylinders stored apart, clearly marked, well-ventilated and outside accommodation and engine room?", answerKind:"YES_NO" },
      { id:"s15", prompt:"Have periodical tests and inspections for LSA and FFA equipment been carried out as per SMS?", answerKind:"YES_NO" },
      { id:"s16", prompt:"Are muster lists and lifejacket donning instructions displayed?", answerKind:"YES_NO" },
      { id:"s17", prompt:"Are lifeboats including equipment and launching mechanisms in good order?", answerKind:"GRADE" },
      { id:"s18", prompt:"Are lifeboat and life raft operating instructions displayed and properly noticeable?", answerKind:"YES_NO" },
      { id:"s19", prompt:"Is the rescue boat including equipment and launching arrangement in good order?", answerKind:"GRADE" },
      { id:"s20", prompt:"Are life rafts in good order and are hydrostatic releases correctly attached?", answerKind:"GRADE" },
      { id:"s21", prompt:"Are lifebuoys, lights, buoyant lines, quick release mechanisms and self-activating smoke floats in good order?", answerKind:"YES_NO" },
      { id:"s22", prompt:"Are lifejackets in good order?", answerKind:"YES_NO" },
      { id:"s23", prompt:"Are immersion suits in good order?", answerKind:"YES_NO" },
      { id:"s24", prompt:"Are pyrotechnics including line throwing apparatus in date and in good order?", answerKind:"YES_NO" },
      { id:"s25", prompt:"Are fire mains, pumps, hoses and nozzles in good order and available for immediate use?", answerKind:"YES_NO" },
      { id:"s26", prompt:"Is a fire control plan exhibited within the accommodation with equipment correctly marked?", answerKind:"YES_NO" },
      { id:"s27", prompt:"Are fixed fire detection and alarm systems in good order and tested regularly?", answerKind:"YES_NO" },
      { id:"s28", prompt:"Is the emergency fire pump in full operational condition and are starting instructions clearly displayed?", answerKind:"YES_NO" },
      { id:"s29", prompt:"Are crew members familiar with donning EEBD and are sets in good order at accommodation, engine room and pump room?", answerKind:"YES_NO" },
      { id:"s30", prompt:"Are accommodation ventilation fan emergency stops clearly marked and evidence of regular testing?", answerKind:"YES_NO" },
      { id:"s31", prompt:"Are fire flaps clearly marked to indicate spaces they serve and is there evidence of regular maintenance?", answerKind:"YES_NO" },
      { id:"s32", prompt:"Are MSDS on board for all cargo, bunkers and other products handled, and are all officers familiar with their use?", answerKind:"YES_NO" },
      { id:"s33", prompt:"Are accommodation ladders, gangways and pilot ladders where fitted in good order and marked with SWL?", answerKind:"GRADE" },
      { id:"s34", prompt:"Are pilot boarding and access arrangements satisfactory?", answerKind:"YES_NO" },
    ],
  },
  {
    code: "POLLUTION",
    title: "5. Pollution Prevention",
    vesselType: null,
    questions: [
      { id:"p01", prompt:"Are the Engine Room (Part I) and Cargo (Part II) Oil Record Books (ORBs) correctly completed?", answerKind:"YES_NO" },
      { id:"p02", prompt:"Do the sludge and bilge tanks designated in Form A or Form B of the IOPP Certificate agree with the Oil Record Book Part I?", answerKind:"YES_NO" },
      { id:"p03", prompt:"Is the IMO Coastal Contact List up to date and is the Master aware of port contact procedures?", answerKind:"YES_NO" },
      { id:"p04", prompt:"Is the condition of scupper plugs satisfactory and are scuppers effectively plugged?", answerKind:"YES_NO" },
      { id:"p05", prompt:"Have various alarms been tested for OWS, Incinerator, Sewage plant etc.?", answerKind:"YES_NO" },
      { id:"p06", prompt:"Is the vessel free from any visible bulkhead, valve or pipeline leakage liable to cause pollution?", answerKind:"YES_NO" },
      { id:"p07", prompt:"Did the reading from 'memory check' of Oil Content Meter match with the last OWS operation in the Oil Record Book?", answerKind:"YES_NO" },
      { id:"p08", prompt:"Are bunker pipelines tested annually? (State date of last test)", answerKind:"TEXT" },
      { id:"p09", prompt:"Are suitable spill containers fitted around all fuel, diesel and lubricating oil tank vents?", answerKind:"YES_NO" },
      { id:"p10", prompt:"Is suitable containment fitted around hydraulic and other deck machinery?", answerKind:"YES_NO" },
      { id:"p11", prompt:"Is the Sewage treatment plant in order and in use?", answerKind:"YES_NO" },
      { id:"p12", prompt:"Are the engine room bilge oily water pumping and disposal arrangements in good order?", answerKind:"YES_NO" },
      { id:"p13", prompt:"Are emergency bilge pumping arrangements ready for immediate use and clearly identified?", answerKind:"YES_NO" },
      { id:"p14", prompt:"Is the oily water separator in good order with automatic stopping device?", answerKind:"YES_NO" },
      { id:"p15", prompt:"Are specific warning notices posted against accidental opening of OWS overboard discharge valve?", answerKind:"YES_NO" },
      { id:"p16", prompt:"Does the vessel have a garbage management plan, record book, and adequate storage/disposal facilities?", answerKind:"YES_NO" },
      { id:"p17", prompt:"Is the BWTS operational, on board, approved by USCG and IMO, with management records maintained?", answerKind:"YES_NO" },
      { id:"p18", prompt:"Are records available for management of flexible hoses and flanges?", answerKind:"YES_NO" },
      { id:"p19", prompt:"Is the sewage dosing system operating as required?", answerKind:"YES_NO" },
      { id:"p20", prompt:"Are SOPEP and SMEPP updated and maintained?", answerKind:"YES_NO" },
      { id:"p21", prompt:"OCM Calibration certificate expiry date", answerKind:"DATE" },
      { id:"p22", prompt:"Condition of Incinerator", answerKind:"GRADE" },
      { id:"p23", prompt:"Condition of OWS / Oil Water Separator", answerKind:"GRADE" },
    ],
  },
  {
    code: "STRUCTURAL",
    title: "6. Structural Condition",
    vesselType: null,
    questions: [
      { id:"st01", prompt:"Is the hull free from visible structural defects that warrant further investigation?", answerKind:"YES_NO" },
      { id:"st02", prompt:"Are weather decks free from visible structural defects that warrant further investigation?", answerKind:"YES_NO" },
      { id:"st03", prompt:"Is the superstructure free from visible structural defects that warrant further investigation?", answerKind:"YES_NO" },
      { id:"st04", prompt:"Are railings and bulwarks in good condition?", answerKind:"GRADE" },
      { id:"st05", prompt:"Are internal spaces free from visible structural defects that warrant further investigation?", answerKind:"YES_NO" },
      { id:"st06", prompt:"If any cargo and/or ballast tanks were sighted from the deck, were they in good order?", answerKind:"YES_NO" },
      { id:"st07", prompt:"Is the funnel structure in good condition?", answerKind:"GRADE" },
      { id:"st08", prompt:"If any indentation is visible on hull, is it recorded in PMS Defect list with location and internal inspection results?", answerKind:"YES_NO" },
    ],
  },
  {
    code: "BALLAST",
    title: "7. Ballast Tanks & Systems",
    vesselType: null,
    questions: [
      { id:"b01", prompt:"Ballast tanks condition — were they inspected or sighted? (state which tanks)", answerKind:"TEXT" },
      { id:"b02", prompt:"Were ballast tanks found in good order (coatings, anodes, corrosion)?", answerKind:"GRADE" },
      { id:"b03", prompt:"Condition and operation of ballast pumps", answerKind:"GRADE" },
      { id:"b04", prompt:"Is the loading computer working and are test records available?", answerKind:"YES_NO" },
      { id:"b05", prompt:"Have other tanks been inspected (fresh water tanks, fuel tanks, cofferdam)?", answerKind:"YES_NO" },
      { id:"b06", prompt:"Is a pipe tunnel/duct keel accessible and in good condition?", answerKind:"YES_NO" },
      { id:"b07", prompt:"Are records available for the regular sounding of void spaces?", answerKind:"YES_NO" },
    ],
  },
  {
    code: "DECK_MACHINERY",
    title: "8. Deck Machinery & Mooring",
    vesselType: null,
    questions: [
      { id:"d01", prompt:"Are certificates available for all mooring ropes and wires?", answerKind:"YES_NO" },
      { id:"d02", prompt:"Are there records of inspection and maintenance of mooring ropes, wires and equipment?", answerKind:"YES_NO" },
      { id:"d03", prompt:"Is there a policy in place for testing winch brakes and are results recorded?", answerKind:"YES_NO" },
      { id:"d04", prompt:"Are moorings satisfactorily deployed and tended?", answerKind:"YES_NO" },
      { id:"d05", prompt:"Are all powered mooring lines correctly reeled on drums, secured on brakes and winches out of gear?", answerKind:"YES_NO" },
      { id:"d06", prompt:"Are all mooring lines stowed neatly to minimise tripping hazards?", answerKind:"YES_NO" },
      { id:"d07", prompt:"Are mooring winches including winch foundations in good order?", answerKind:"GRADE" },
      { id:"d08", prompt:"Do brake linings, drums and pins appear to be in good order?", answerKind:"YES_NO" },
      { id:"d09", prompt:"Are mooring wires, ropes and synthetic tails in good order?", answerKind:"GRADE" },
      { id:"d10", prompt:"Are pedestal fairleads, roller fairleads and other rollers well greased and free to turn?", answerKind:"YES_NO" },
      { id:"d11", prompt:"Is mooring equipment marked with its SWL?", answerKind:"YES_NO" },
      { id:"d12", prompt:"Are windlasses, anchors, locking bars and cables in good order and operating effectively?", answerKind:"GRADE" },
      { id:"d13", prompt:"Are bitter end securing arrangements unobstructed and outside the chain locker?", answerKind:"YES_NO" },
      { id:"d14", prompt:"Are the chain locker doors securely battened down?", answerKind:"YES_NO" },
      { id:"d15", prompt:"Are emergency towing arrangements readily available for deployment at both ends of the vessel?", answerKind:"YES_NO" },
      { id:"d16", prompt:"Does the vessel have on-board Emergency Towing Procedures?", answerKind:"YES_NO" },
      { id:"d17", prompt:"Test and examination due date for Port and Starboard mooring winches and windlass", answerKind:"DATE" },
      { id:"d18", prompt:"If one or more bow stoppers are fitted, is a certificate attesting to the safe working load provided?", answerKind:"YES_NO" },
      { id:"d19", prompt:"Condition of mooring ropes and drum spooling (general)", answerKind:"GRADE" },
      { id:"d20", prompt:"Number of new spare mooring ropes in inventory", answerKind:"NUMBER" },
    ],
  },
  {
    code: "ENGINE_ROOM",
    title: "9. Engine & Steering Compartments",
    vesselType: null,
    questions: [
      { id:"e01", prompt:"Overall impression of engine room (cleanliness, bilges, lighting)", answerKind:"GRADE" },
      { id:"e02", prompt:"Have all ER alarms been tested and found in order?", answerKind:"YES_NO" },
      { id:"e03", prompt:"Has the Chief Engineer written Standing Orders and have watch engineers countersigned them?", answerKind:"YES_NO" },
      { id:"e04", prompt:"Is the PMS being followed and is it up to date? (Note any overdue items)", answerKind:"YES_NO" },
      { id:"e05", prompt:"Main engine condition and performance reports satisfactory?", answerKind:"GRADE" },
      { id:"e06", prompt:"Are auxiliary engines within stated overhaul intervals?", answerKind:"YES_NO" },
      { id:"e07", prompt:"Condition of auxiliary boiler (no internal or external leaks)", answerKind:"GRADE" },
      { id:"e08", prompt:"Are all auxiliary equipment (pumps, compressors, purifiers) fully operational?", answerKind:"GRADE" },
      { id:"e09", prompt:"Steering gear condition — free of leakage, emergency steering instructions posted?", answerKind:"GRADE" },
      { id:"e10", prompt:"Has emergency steering gear been tested within the past three months with results recorded?", answerKind:"YES_NO" },
      { id:"e11", prompt:"Are emergency steering gear changeover procedures clearly displayed in the steering compartment and wheelhouse?", answerKind:"YES_NO" },
      { id:"e12", prompt:"Lube oil analysis report — satisfactory, no areas of concern?", answerKind:"YES_NO" },
      { id:"e13", prompt:"Cooling water system working properly with no leaks?", answerKind:"YES_NO" },
      { id:"e14", prompt:"Fuel oil analysis satisfactory?", answerKind:"YES_NO" },
      { id:"e15", prompt:"ECR condition — neat, lashing arrangements for chairs, insulation mats in place?", answerKind:"GRADE" },
      { id:"e16", prompt:"Is the Freshwater Generator in good condition and producing adequate FW quantity?", answerKind:"YES_NO" },
      { id:"e17", prompt:"Are pumps and motors (FO, LO, SW, FW systems) free from leaks and in good condition?", answerKind:"GRADE" },
      { id:"e18", prompt:"Are all air compressors operational and are records available for test of trips and alarms?", answerKind:"YES_NO" },
      { id:"e19", prompt:"Is the main switchboard and electrical distribution system in good working order with adequate insulation readings?", answerKind:"GRADE" },
      { id:"e20", prompt:"Is the dead man alarm system in good order and used as required?", answerKind:"YES_NO" },
      { id:"e21", prompt:"Are concise starting instructions for the emergency generator clearly displayed?", answerKind:"YES_NO" },
      { id:"e22", prompt:"Is all electrical equipment including junction boxes and cable runs in good order?", answerKind:"YES_NO" },
      { id:"e23", prompt:"Are switchboards free of significant earth faults?", answerKind:"YES_NO" },
      { id:"e24", prompt:"Are bilges free of oil, rubbish and sediment? (Note any issues)", answerKind:"GRADE" },
      { id:"e25", prompt:"Is CCTV covering the OWS area adequately with sufficient back-up HDD and records kept for at least 18 months?", answerKind:"YES_NO" },
      { id:"e26", prompt:"Were M/E piston rings, liners and crank-case inspected during this visit?", answerKind:"YES_NO" },
      { id:"e27", prompt:"Were crank-case and alternator of any A/E inspected during this visit?", answerKind:"YES_NO" },
      { id:"e28", prompt:"Are seawater pumps, sea chests and associated pipework in good order and free of hard rust?", answerKind:"GRADE" },
      { id:"e29", prompt:"If UMS certified, are procedures for unmanned engine room operation followed?", answerKind:"YES_NO" },
      { id:"e30", prompt:"Does the vessel carry original NOx Technical Files for each engine?", answerKind:"YES_NO" },
      { id:"e31", prompt:"Main engine make and model (for record)", answerKind:"TEXT" },
      { id:"e32", prompt:"Auxiliary engine make and total power", answerKind:"TEXT" },
    ],
  },
  {
    code: "HULL_DECKS",
    title: "10. External Hull & Decks",
    vesselType: null,
    questions: [
      { id:"h01", prompt:"Is the general condition, visual appearance and cleanliness of the hull satisfactory?", answerKind:"GRADE" },
      { id:"h02", prompt:"Are hull markings clearly indicated and correctly placed?", answerKind:"GRADE" },
      { id:"h03", prompt:"Is the general condition, visual appearance and cleanliness of weather decks satisfactory?", answerKind:"GRADE" },
      { id:"h04", prompt:"Do decks in working areas have clearly identified non-slip surfaces?", answerKind:"YES_NO" },
      { id:"h05", prompt:"Condition of Deck House and Stores", answerKind:"GRADE" },
      { id:"h06", prompt:"Is the general condition of service pipework satisfactory and free from significant corrosion, pitting and soft patches?", answerKind:"GRADE" },
      { id:"h07", prompt:"Anodes (hull and propeller/rudder area) — condition and visibility", answerKind:"GRADE" },
      { id:"h08", prompt:"Are pipe stands, clamps, supports and expansion arrangements satisfactory?", answerKind:"GRADE" },
      { id:"h09", prompt:"Are all deck openings including watertight doors and portholes in good order and capable of being properly secured?", answerKind:"GRADE" },
      { id:"h10", prompt:"Are fuel, ballast and other space vents and air pipes in good order with evidence of regular maintenance?", answerKind:"GRADE" },
      { id:"h11", prompt:"Are all vents and air pipes clearly marked to indicate the spaces they serve?", answerKind:"YES_NO" },
      { id:"h12", prompt:"Has maintenance work performed been properly recorded (Deck and Engine)?", answerKind:"YES_NO" },
      { id:"h13", prompt:"Is the general condition, visual appearance and cleanliness of the superstructure satisfactory?", answerKind:"GRADE" },
      { id:"h14", prompt:"Are records for testing and trying out of all critical equipment in place and as per SMS requirements?", answerKind:"YES_NO" },
      { id:"h15", prompt:"Is deck lighting adequate?", answerKind:"YES_NO" },
      { id:"h16", prompt:"Is the general condition of electrical equipment including conduits and wiring satisfactory?", answerKind:"GRADE" },
      { id:"h17", prompt:"Are light fittings in gas-hazardous areas Ex 'd' rated and in good order?", answerKind:"YES_NO" },
      { id:"h18", prompt:"Are internal spaces and storerooms clean, free from debris and tidy (including bosun store, paint store)?", answerKind:"GRADE" },
      { id:"h19", prompt:"Is the forecastle space free of water?", answerKind:"YES_NO" },
      { id:"h20", prompt:"Condition of mast and fittings", answerKind:"GRADE" },
      { id:"h21", prompt:"Are alleyways free of obstructions and exits marked?", answerKind:"YES_NO" },
      { id:"h22", prompt:"Are accommodation public spaces, mess rooms, sanitary areas, food storerooms and galleys clean, tidy and hygienic?", answerKind:"GRADE" },
      { id:"h23", prompt:"Is the helicopter landing area clearly marked with call sign and vessel's name?", answerKind:"YES_NO" },
      { id:"h24", prompt:"Are portable ladders on deck certified and marked with safe working load?", answerKind:"YES_NO" },
      { id:"h25", prompt:"Is the ship's hospital clean, tidy and ready for use?", answerKind:"GRADE" },
      { id:"h26", prompt:"Is the condition of electrical equipment in the accommodation satisfactory?", answerKind:"GRADE" },
      { id:"h27", prompt:"Are personnel alarms in refrigerated spaces in good order and operational?", answerKind:"YES_NO" },
      { id:"h28", prompt:"Condition of Bow/Stern thruster (if fitted)", answerKind:"GRADE" },
    ],
  },
  {
    code: "EQUIP_TESTS",
    title: "12. Equipment Checks & Tests",
    vesselType: null,
    questions: [
      { id:"eq01", prompt:"Forward life raft light tested", answerKind:"YES_NO" },
      { id:"eq02", prompt:"Magnetic compass on monkey island checked for bubbles", answerKind:"YES_NO" },
      { id:"eq03", prompt:"Multi-gas (Drager) detector calibrated and tested", answerKind:"YES_NO" },
      { id:"eq04", prompt:"GMDSS VHF sets tested", answerKind:"YES_NO" },
      { id:"eq05", prompt:"Navigational light failure alarm and panels tested", answerKind:"YES_NO" },
      { id:"eq06", prompt:"Hospital alarm bell tested", answerKind:"YES_NO" },
      { id:"eq07", prompt:"Echo sounder shallow depth alarm tested", answerKind:"YES_NO" },
      { id:"eq08", prompt:"GMDSS station 24V battery on-load tested", answerKind:"YES_NO" },
      { id:"eq09", prompt:"ECDIS checks — safety parameters tested", answerKind:"YES_NO" },
      { id:"eq10", prompt:"Lifejacket light tested", answerKind:"YES_NO" },
      { id:"eq11", prompt:"Aldis lamp tested on mains and battery", answerKind:"YES_NO" },
      { id:"eq12", prompt:"SCBA sets low pressure alarm tested", answerKind:"YES_NO" },
      { id:"eq13", prompt:"Lifeboat search light and interior light tested", answerKind:"YES_NO" },
      { id:"eq14", prompt:"Lifeboat engine tried out on both batteries ahead/astern", answerKind:"YES_NO" },
      { id:"eq15", prompt:"MSB 220V and 440V low insulation alarm tested", answerKind:"YES_NO" },
      { id:"eq16", prompt:"Steering gear alarm tested and communication from steering gear to bridge checked", answerKind:"YES_NO" },
      { id:"eq17", prompt:"Steering gear movement tested port and starboard", answerKind:"YES_NO" },
      { id:"eq18", prompt:"OWS 15 PPM alarm tested", answerKind:"YES_NO" },
      { id:"eq19", prompt:"EEBD sets in engine room checked for pressure", answerKind:"YES_NO" },
      { id:"eq20", prompt:"Communication tested from ME local stand", answerKind:"YES_NO" },
      { id:"eq21", prompt:"Emergency generator tried out on battery and starter", answerKind:"YES_NO" },
      { id:"eq22", prompt:"Emergency generator radiator water level checked", answerKind:"YES_NO" },
      { id:"eq23", prompt:"PMS overdue items reviewed and checked", answerKind:"YES_NO" },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────
// VESSEL-TYPE-SPECIFIC SECTIONS
// ─────────────────────────────────────────────────────────────────────
const typeSpecificCondition: Section[] = [
  // ── BULK CARRIER ──
  {
    code: "CARGO_HOLDS", title: "7.1-7.5  Cargo, Ballast & Cranes (Bulk Carrier)", vesselType: "BULK_CARRIER",
    questions: [
      { id:"bh01", prompt:"Number and type of cargo holds — are they free of structural defects (frames, bulkheads, side plating)?", answerKind:"GRADE" },
      { id:"bh02", prompt:"Condition of paint coating in cargo holds", answerKind:"GRADE" },
      { id:"bh03", prompt:"Condition of hatch covers (folding/pontoon/piggyback), coamings, seals, cleats and securing arrangements", answerKind:"GRADE" },
      { id:"bh04", prompt:"Are hatch cover operating systems (hydraulic, electro-hydraulic) in full working order and free of leakage?", answerKind:"YES_NO" },
      { id:"bh05", prompt:"Condition of compression bar/strips and hatch coaming drain channels", answerKind:"GRADE" },
      { id:"bh06", prompt:"Condition of Bobby hatch cover packing and channels", answerKind:"GRADE" },
      { id:"bh07", prompt:"Condition and test records of cargo cranes (state number, SWL and make)", answerKind:"GRADE" },
      { id:"bh08", prompt:"Condition of crane jib — rust stains, corrosion at joints with fittings?", answerKind:"GRADE" },
      { id:"bh09", prompt:"Are grabs operational and when were they last used? (State SWL and capacity)", answerKind:"TEXT" },
      { id:"bh10", prompt:"Crane wire condition — when was it last replaced?", answerKind:"TEXT" },
      { id:"bh11", prompt:"Is the Water Ingress Alarm System tested and fully operational?", answerKind:"YES_NO" },
      { id:"bh12", prompt:"Are cargo bilge transfer pumps operational and pressure gauges working?", answerKind:"YES_NO" },
      { id:"bh13", prompt:"Ballast water capacity (heavy) cbm", answerKind:"NUMBER" },
      { id:"bh14", prompt:"Number and capacity of ballast pumps (cbm/hr)", answerKind:"TEXT" },
      { id:"bh15", prompt:"Are cable shelves in good condition (note number requiring replacement)?", answerKind:"GRADE" },
    ],
  },
  // ── CONTAINER SHIP ──
  {
    code: "CONTAINER_SYS", title: "Container Securing, Lashing & Reefer Systems", vesselType: "CONTAINER_SHIP",
    questions: [
      { id:"cs01", prompt:"Condition of cell guides, lashing bridges and securing points", answerKind:"GRADE" },
      { id:"cs02", prompt:"Condition and inventory of lashing gear (rods, turnbuckles, twistlocks, bridge fittings)", answerKind:"GRADE" },
      { id:"cs03", prompt:"Are reefer receptacles and monitoring systems operational?", answerKind:"YES_NO" },
      { id:"cs04", prompt:"Is the cargo securing manual on board and has it been approved?", answerKind:"YES_NO" },
      { id:"cs05", prompt:"Are container weight verification (VGM) procedures in place?", answerKind:"YES_NO" },
    ],
  },
  // ── OIL TANKER ──
  {
    code: "CARGO_TANKS", title: "Cargo Tanks, COW, Inert Gas & Venting", vesselType: "OIL_TANKER",
    questions: [
      { id:"ot01", prompt:"Condition of cargo tank coatings and structure (as sighted from deck)", answerKind:"GRADE" },
      { id:"ot02", prompt:"Is the Inert Gas System operational with valid records?", answerKind:"YES_NO" },
      { id:"ot03", prompt:"Condition of cargo pumps, COW machines and P/V venting system", answerKind:"GRADE" },
      { id:"ot04", prompt:"Are overfill alarms, high level alarms and automatic shutdown systems operational?", answerKind:"YES_NO" },
      { id:"ot05", prompt:"Is the ship-to-shore link (SIGTTO) operational?", answerKind:"YES_NO" },
    ],
  },
  // ── LNG CARRIER ──
  {
    code: "CARGO_CONTAINMENT", title: "Cargo Containment & Reliquefaction", vesselType: "LNG_CARRIER",
    questions: [
      { id:"lng01", prompt:"Condition of containment system and cofferdam/hold spaces", answerKind:"GRADE" },
      { id:"lng02", prompt:"Are gas detection and ESD systems tested and operational?", answerKind:"YES_NO" },
      { id:"lng03", prompt:"Condition of cargo compressors / reliquefaction plant", answerKind:"GRADE" },
      { id:"lng04", prompt:"Is the nitrogen system operational?", answerKind:"YES_NO" },
    ],
  },
  // ── GENERAL CARGO ──
  {
    code: "TWEEN_DECKS", title: "Tween Decks, Hatch Covers & Cargo Gear", vesselType: "GENERAL_CARGO",
    questions: [
      { id:"gc01", prompt:"Condition of tween decks, pontoons and cargo battens", answerKind:"GRADE" },
      { id:"gc02", prompt:"Condition and certification of cargo derricks/cranes", answerKind:"GRADE" },
      { id:"gc03", prompt:"Condition of hatch covers and coamings", answerKind:"GRADE" },
    ],
  },
  // ── LPG TANKER ──
  {
    code: "GAS_SYSTEMS", title: "Cargo Tanks, Compressors & Gas Detection", vesselType: "LPG_TANKER",
    questions: [
      { id:"lpg01", prompt:"Condition of cargo tanks, domes and insulation", answerKind:"GRADE" },
      { id:"lpg02", prompt:"Are fixed gas detection systems calibrated and operational?", answerKind:"YES_NO" },
      { id:"lpg03", prompt:"Condition of cargo compressors and heaters", answerKind:"GRADE" },
    ],
  },
  // ── CRUISE SHIP ──
  {
    code: "HOTEL_PAX", title: "Hotel Services, Passenger Spaces & Evacuation", vesselType: "CRUISE_SHIP",
    questions: [
      { id:"cr01", prompt:"Condition of passenger cabins and public spaces", answerKind:"GRADE" },
      { id:"cr02", prompt:"Are Marine Evacuation Systems and muster arrangements in order?", answerKind:"YES_NO" },
      { id:"cr03", prompt:"Condition of galleys, provision plants and HVAC", answerKind:"GRADE" },
    ],
  },
];

export function getConditionSections(vesselType: VesselType): Section[] {
  return [
    ...universalCondition,
    ...typeSpecificCondition.filter((s) => s.vesselType === vesselType),
  ];
}

// ─────────────────────────────────────────────────────────────────────
// PRE-PURCHASE — ADDITIONAL SECTIONS (beyond the Condition scope)
// A pre-purchase inspection reviews everything a condition inspection
// does, plus vessel history, class/survey status, document review,
// performance, space access and a deficiency-risk summary — reflecting
// the deeper due-diligence scope of a pre-purchase survey.
// ─────────────────────────────────────────────────────────────────────
const prePurchaseOnly: Section[] = [
  {
    code: "VESSEL_HISTORY",
    title: "Vessel History & Ownership",
    vesselType: null,
    questions: [
      { id:"vh01", prompt:"Summary of previous names, owners, class societies and flags", answerKind:"TEXT" },
      { id:"vh02", prompt:"Number of previous owners", answerKind:"NUMBER" },
      { id:"vh03", prompt:"Current trading pattern / typical trade routes", answerKind:"TEXT" },
      { id:"vh04", prompt:"Historical trading pattern (as evidenced by port call / voyage records)", answerKind:"TEXT" },
      { id:"vh05", prompt:"Has the vessel had any period of lay-up?", answerKind:"YES_NO" },
    ],
  },
  {
    code: "CLASS_SURVEY_STATUS",
    title: "Class, Certificate & Survey Status",
    vesselType: null,
    questions: [
      { id:"cs01", prompt:"Are all class and statutory certificates currently valid?", answerKind:"YES_NO" },
      { id:"cs02", prompt:"Special Survey — last completion date", answerKind:"DATE" },
      { id:"cs03", prompt:"Special Survey — next due date", answerKind:"DATE" },
      { id:"cs04", prompt:"Intermediate Survey — due date", answerKind:"DATE" },
      { id:"cs05", prompt:"Docking Survey — due date", answerKind:"DATE" },
      { id:"cs06", prompt:"Are there any outstanding Conditions of Class?", answerKind:"YES_NO" },
      { id:"cs07", prompt:"Details of any outstanding Conditions of Class", answerKind:"TEXT" },
      { id:"cs08", prompt:"Are there any outstanding Memos to Owners / Class General Memos?", answerKind:"YES_NO" },
      { id:"cs09", prompt:"Are there any overdue items under the Continuous Survey Machinery (CSM) cycle?", answerKind:"YES_NO" },
      { id:"cs10", prompt:"Details of any overdue CSM items", answerKind:"TEXT" },
    ],
  },
  {
    code: "DOC_REVIEW_PP",
    title: "Document & Survey History Review",
    vesselType: null,
    questions: [
      { id:"dr01", prompt:"Last dry dock — shipyard name and location", answerKind:"TEXT" },
      { id:"dr02", prompt:"Last dry dock — period (start date, end date, total days)", answerKind:"TEXT" },
      { id:"dr03", prompt:"Was the hull coating renewed or repaired at the last dry dock?", answerKind:"YES_NO" },
      { id:"dr04", prompt:"Was the anchor chain calibrated / end-for-ended at the last dry dock?", answerKind:"YES_NO" },
      { id:"dr05", prompt:"Are UTM (thickness gauging) reports available and within acceptable limits?", answerKind:"YES_NO" },
      { id:"dr06", prompt:"Date of last UTM gauging survey", answerKind:"DATE" },
      { id:"dr07", prompt:"Is a Hull Executive Summary available for review?", answerKind:"YES_NO" },
      { id:"dr08", prompt:"Have there been any major modifications or conversions since build?", answerKind:"YES_NO" },
      { id:"dr09", prompt:"Details of any major modifications", answerKind:"TEXT" },
      { id:"dr10", prompt:"Number of PSC deficiencies recorded in the last 12 months", answerKind:"NUMBER" },
      { id:"dr11", prompt:"Any Port State Control detentions in the vessel's history?", answerKind:"YES_NO" },
      { id:"dr12", prompt:"Is the vessel's vetting (SIRE/CDI) inspection status satisfactory?", answerKind:"YES_NO" },
    ],
  },
  {
    code: "VESSEL_PERFORMANCE",
    title: "Vessel Performance Review",
    vesselType: null,
    questions: [
      { id:"vp01", prompt:"Average main engine fuel consumption at sea, laden (MT/day)", answerKind:"NUMBER" },
      { id:"vp02", prompt:"Average main engine fuel consumption at sea, ballast (MT/day)", answerKind:"NUMBER" },
      { id:"vp03", prompt:"Average auxiliary engine fuel consumption in port (MT/day)", answerKind:"NUMBER" },
      { id:"vp04", prompt:"Average lubricating oil consumption (litres/day)", answerKind:"NUMBER" },
      { id:"vp05", prompt:"Average fresh water consumption (MT/day)", answerKind:"NUMBER" },
      { id:"vp06", prompt:"Is abstract / log-book performance consistent with class speed & consumption warranties?", answerKind:"YES_NO" },
    ],
  },
  {
    code: "SPACES_INSPECTED",
    title: "Spaces Available for Inspection",
    vesselType: null,
    questions: [
      { id:"sp01", prompt:"Cargo holds/tanks available for inspection?", answerKind:"YES_NO" },
      { id:"sp02", prompt:"Water ballast tanks available for inspection?", answerKind:"YES_NO" },
      { id:"sp03", prompt:"Pipe ducts / cofferdams available for inspection?", answerKind:"YES_NO" },
      { id:"sp04", prompt:"Freshwater tanks available for inspection?", answerKind:"YES_NO" },
      { id:"sp05", prompt:"Void spaces available for inspection?", answerKind:"YES_NO" },
      { id:"sp06", prompt:"Fuel oil / lube oil tanks available for inspection?", answerKind:"YES_NO" },
      { id:"sp07", prompt:"Reason(s) any spaces were not made available", answerKind:"TEXT" },
      { id:"sp08", prompt:"Overall quality of documents provided for review", answerKind:"GRADE" },
    ],
  },
  {
    code: "CARGO_MACHINERY_PARTICULARS",
    title: "Cargo & Machinery Particulars Verification",
    vesselType: null,
    questions: [
      { id:"cm01", prompt:"Does total cargo/tank capacity match the vessel's documents?", answerKind:"YES_NO" },
      { id:"cm02", prompt:"Does the number of cargo segregations/tanks match the particulars?", answerKind:"YES_NO" },
      { id:"cm03", prompt:"Is cargo handling equipment (pumps/cranes) type and capacity confirmed on board?", answerKind:"YES_NO" },
      { id:"cm04", prompt:"Are main engine particulars (maker/model/power) confirmed against certificates?", answerKind:"YES_NO" },
      { id:"cm05", prompt:"Are auxiliary engine particulars confirmed against certificates?", answerKind:"YES_NO" },
      { id:"cm06", prompt:"Are emergency generator particulars confirmed against certificates?", answerKind:"YES_NO" },
    ],
  },
  {
    code: "DEFICIENCY_REGISTER",
    title: "Deficiencies & Observations Summary",
    vesselType: null,
    questions: [
      { id:"df01", prompt:"Total number of deficiencies recorded", answerKind:"NUMBER" },
      { id:"df02", prompt:"Number of High-risk deficiencies", answerKind:"NUMBER" },
      { id:"df03", prompt:"Number of Medium-risk deficiencies", answerKind:"NUMBER" },
      { id:"df04", prompt:"Number of Low-risk deficiencies", answerKind:"NUMBER" },
      { id:"df05", prompt:"Summary of key deficiencies / observations", answerKind:"TEXT" },
    ],
  },
];

/**
 * Full Pre-Purchase question set = Condition scope (same structural/
 * safety/machinery grading) + the additional pre-purchase-only sections
 * above. The equipment inventory & CapEx table is layered on top of this
 * in the UI, not part of the question sections.
 */
export function getPrePurchaseSections(vesselType: VesselType): Section[] {
  return [...getConditionSections(vesselType), ...prePurchaseOnly];
}

// ─────────────────────────────────────────────────────────────────────
// PRE-PURCHASE EQUIPMENT INVENTORY
// ─────────────────────────────────────────────────────────────────────
const baseInventory = (sectionCode: string, names: string[]): EquipmentItem[] =>
  names.map((name, i) => ({
    id: `${sectionCode}-${i}`,
    sectionCode,
    equipmentName: name,
    equipmentModel: "",
    equipmentSerial: "",
    grade: "" as const,
    estimatedRepairCost: 0,
    annualMaintCost: 0,
    remainingLifeYears: 10,
    replacementCost: 0,
    remarks: "",
  }));

const universalInventory: EquipmentItem[] = [
  ...baseInventory("MACHINERY_INV", [
    "Main Engine", "Auxiliary Engine No.1", "Auxiliary Engine No.2",
    "Auxiliary Engine No.3", "Boiler (Composite/Steam)", "Steering Gear",
    "Fresh Water Generator", "Air Compressor No.1", "Air Compressor No.2",
    "Oily Water Separator", "Sewage Treatment Plant", "Ballast Water Treatment System",
    "Incinerator", "ME Flow Meter", "MGPS (Marine Growth Prevention System)",
  ]),
  ...baseInventory("NAV_COMMS_INV", [
    "Radar (X-Band)", "Radar (S-Band)", "ECDIS No.1", "ECDIS No.2",
    "Echo Sounder", "GPS / DGPS", "AIS Transponder", "GMDSS Console",
    "VDR (Voyage Data Recorder)", "BNWAS", "EPIRB", "SART",
    "Aldis Lamp", "Navtex Receiver", "Gyro Compass",
  ]),
  ...baseInventory("SAFETY_INV", [
    "Lifeboat(s) (state number)", "Rescue Boat", "Liferafts (state number)",
    "SCBA Sets (state number)", "EEBD Sets (state number)",
    "Fixed CO2 System", "Fixed Foam System",
    "Main Fire Pump", "Emergency Fire Pump",
    "Portable Gas Detectors (Multi-gas)", "Portable Gas Detectors (Drager)",
  ]),
];

const typeInventory: Record<VesselType, EquipmentItem[]> = {
  BULK_CARRIER: baseInventory("CARGO_GEAR_INV", [
    "Cargo Crane No.1", "Cargo Crane No.2", "Cargo Crane No.3", "Cargo Crane No.4",
    "Grabs (state number and capacity)",
    "Hatch Cover Hydraulic System", "Water Ingress Alarm System",
    "Ballast Pump No.1", "Ballast Pump No.2",
  ]),
  CONTAINER_SHIP: baseInventory("LASHING_INV", [
    "Lashing Gear Set", "Twistlock Inventory",
    "Reefer Monitoring System", "Cell Guide System",
  ]),
  OIL_TANKER: baseInventory("CARGO_SYS_INV", [
    "Cargo Pump No.1", "Cargo Pump No.2", "Cargo Pump No.3",
    "Inert Gas System", "COW Machines", "P/V Valves & Venting",
  ]),
  LNG_CARRIER: baseInventory("GAS_PLANT_INV", [
    "Cargo Compressors", "Reliquefaction Plant",
    "Gas Detection System (Fixed)", "ESD System", "Cargo Heaters/Vaporisers",
  ]),
  GENERAL_CARGO: baseInventory("CARGO_GEAR_INV", [
    "Cargo Crane No.1", "Cargo Crane No.2",
    "Hatch Covers & Pontoons", "Tween Deck Pontoons",
  ]),
  LPG_TANKER: baseInventory("GAS_PLANT_INV", [
    "Cargo Compressor No.1", "Cargo Compressor No.2",
    "Cargo Heater", "Gas Detection System (Fixed)",
  ]),
  CRUISE_SHIP: baseInventory("HOTEL_PLANT_INV", [
    "Marine Evacuation Systems", "HVAC Plant",
    "Galley Equipment", "Provision Refrigeration Plant", "Stabilisers",
  ]),
};

export function getPrePurchaseInventory(vesselType: VesselType): EquipmentItem[] {
  return [...universalInventory, ...typeInventory[vesselType]].map((it) => ({ ...it }));
}
