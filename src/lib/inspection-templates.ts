import technicalChecklist from "../../db/technical_inspection_checklist.json";

export const VESSEL_TYPES = [
  { value:"BULK_CARRIER",   label:"Bulk Carrier" },
  { value:"CONTAINER_SHIP", label:"Container Ship" },
  { value:"OIL_TANKER",    label:"Oil Tanker" },
  { value:"LNG_CARRIER",   label:"LNG Carrier" },
  { value:"GENERAL_CARGO", label:"General Cargo" },
  { value:"LPG_TANKER",    label:"LPG Tanker" },
  { value:"CRUISE_SHIP",   label:"Cruise Ship" },
] as const;
export type VesselType = (typeof VESSEL_TYPES)[number]["value"];
export type Grade = "GOOD"|"FAIR"|"POOR"|"ACTION_REQUIRED"|"NOT_SEEN"|"NA";
export const GRADES: { value:Grade; label:string; tone:string }[] = [
  { value:"GOOD",           label:"Good",            tone:"bg-emerald-100 text-emerald-800" },
  { value:"FAIR",           label:"Fair",            tone:"bg-amber-100 text-amber-800" },
  { value:"POOR",           label:"Poor",            tone:"bg-orange-100 text-orange-800" },
  { value:"ACTION_REQUIRED",label:"Action Required", tone:"bg-red-100 text-red-800" },
  { value:"NOT_SEEN",       label:"Not Seen",        tone:"bg-slate-100 text-slate-600" },
  { value:"NA",             label:"N/A",             tone:"bg-gray-100 text-gray-500" },
];
export interface Question { id:string; prompt:string; answerKind:"GRADE"|"YES_NO"|"TEXT"|"NUMBER"|"DATE"; custom?:boolean; }
export interface Section { code:string; title:string; vesselType:VesselType|null; questions:Question[]; }
export interface EquipmentItem {
  id:string; sectionCode:string; equipmentName:string; equipmentModel:string; equipmentSerial:string;
  manufacturer:string; yearOfMake:string; specifications:string;
  grade:Grade|""; condition:string;
  estimatedRepairCost:number; annualMaintCost:number; remainingLifeYears:number; replacementCost:number; remarks:string;
}
const q = (id:string,prompt:string,answerKind:"GRADE"|"YES_NO"|"TEXT"|"NUMBER"|"DATE"):Question => ({id,prompt,answerKind});

const universalCondition: Section[] = [
  { code:"CERTIFICATION", title:"1. Certification & Documentation", vesselType:null, questions:[
    q("c01","Is the 'ESP' file and associated documents available (if applicable)?","YES_NO"),
    q("c02","Computer systems — are records maintained and accessible?","YES_NO"),
    q("c03","Are ORBs (Part I and II) correctly completed, free of pollution incidents?","YES_NO"),
    q("c04","If oily water/sludge disposal to cargo/slop tank has taken place, recorded in both ORBs per IOPP Form B?","YES_NO"),
    q("c05","Are files and records maintained as per the Master's Filing System?","YES_NO"),
    q("c06","Is the vessel in possession of an approved VOC Management Plan?","YES_NO"),
    q("c07","Is there an approved Ballast Water and Sediments Management Plan with records maintained?","YES_NO"),
    q("c08","Does the vessel have a SEEMP and are officers aware of its requirements?","YES_NO"),
    q("c09","Have all deficiencies identified by PSC, charterers, P&I club been suitably addressed?","YES_NO"),
    q("c10","Is a record of all defects identified during superintendent inspections maintained?","YES_NO"),
    q("c11","Is SEEMP available onboard and has it been made ship-specific?","YES_NO"),
    q("c12","Are Deck and Engine logbooks adequately maintained?","YES_NO"),
    q("c13","Are Stability booklet, Damage Stability plan and BWMP available and approved?","YES_NO"),
    q("c14","Are toolbox meetings carried out prior to each job with records available?","YES_NO"),
    q("c15","Are internal audits carried out as per the Company's SMS?","YES_NO"),
    q("c16","Are MLC certificate and associated documents available?","YES_NO"),
    q("c17","Does the vessel have any outstanding Conditions of Class or Recommendations?","YES_NO"),
    q("c18","Are all classification and statutory certificates available including Form A, Form R, Form E?","YES_NO"),
    q("c19","Dry dock renewal due date","DATE"),
  ]},
  { code:"CREW_MGMT", title:"2. Crew Management", vesselType:null, questions:[
    q("cr01","Does manning level meet or exceed the Minimum Safe Manning Document?","YES_NO"),
    q("cr02","Are STCW and flag Administration regulations controlling hours of work being followed?","YES_NO"),
    q("cr03","Are all personnel able to communicate effectively in a common language?","YES_NO"),
    q("cr04","Condition of common bathrooms, toilets and crew change rooms","GRADE"),
    q("cr05","Have all deck officers attended a Bridge Resource Management course?","YES_NO"),
    q("cr06","Condition of crew/officer mess rooms, recreation rooms, laundry, gymnasium and galley","GRADE"),
    q("cr07","If vessel is fitted with High Voltage equipment, is staff suitably trained (ETO)?","YES_NO"),
    q("cr08","Are officers responsible for cargo transfer in possession of specialised training certificates?","YES_NO"),
    q("cr09","Date of last unannounced on-board alcohol test","DATE"),
    q("cr10","Has an unannounced drug and alcohol test by an external agency been carried out?","YES_NO"),
    q("cr11","Have gangway checks for alcohol been carried out on returning crew members?","YES_NO"),
    q("cr12","Does each crew member record hours of rest via a networked computer in compliance with MLC?","YES_NO"),
    q("cr13","Is the Speaking Up policy clearly displayed and are crew aware of how to use it?","YES_NO"),
    q("cr14","Are crew satisfied with the quality, quantity and variety of meals?","YES_NO"),
    q("cr15","Is the vessel free from any sign of insect or cockroach infestations in accommodation?","YES_NO"),
    q("cr16","Are crew able to contact family members using phone, email and internet?","YES_NO"),
    q("cr17","Are cadets being sufficiently supervised in accordance with their Training schedule?","YES_NO"),
    q("cr18","Are recreation club account expenses displayed?","YES_NO"),
  ]},
  { code:"NAVIGATION", title:"3. Bridge & Navigation", vesselType:null, questions:[
    q("n01","Has the Master written Standing Orders countersigned by deck officers?","YES_NO"),
    q("n02","Are deck logbooks and engine movement books correctly maintained?","YES_NO"),
    q("n03","Are the vessel's manoeuvring characteristics displayed on the bridge?","YES_NO"),
    q("n04","Are records maintained of fire and safety rounds completed after each watch?","YES_NO"),
    q("n05","Are checklists for pre-arrival, pre-departure, watch handover and Pilot-Master exchange completed?","YES_NO"),
    q("n06","Has the Bridge been adequately manned at all voyage stages with adequate lookout?","YES_NO"),
    q("n07","Condition of navigation equipment","GRADE"),
    q("n08","GNSS or terrestrial navigation system available and in good order?","YES_NO"),
    q("n09","Navtex receiver available and in good order?","YES_NO"),
    q("n10","AIS transponder available and in good order?","YES_NO"),
    q("n11","VHF radio available and in good order?","YES_NO"),
    q("n12","Gyro compass and repeaters available and in good order?","YES_NO"),
    q("n13","9 GHz (X-band) radar available and in good order?","YES_NO"),
    q("n14","VDR available and in good order? Officers familiar with data retention procedure?","YES_NO"),
    q("n15","Navigation lights in good order?","YES_NO"),
    q("n16","BNWAS fitted and operational at all times at sea and at anchor?","YES_NO"),
    q("n17","Regular gyro and magnetic compass errors being taken and recorded?","YES_NO"),
    q("n18","Comprehensive passage plan available from berth to berth?","YES_NO"),
    q("n19","ECDIS fitted — state model and whether approved backup provided","TEXT"),
  ]},
  { code:"SAFETY_MGMT", title:"4. Safety Management", vesselType:null, questions:[
    q("s01","Is PPE provided and worn as required?","YES_NO"),
    q("s02","Is there a procedure for reporting, investigating and closing accidents and near misses?","YES_NO"),
    q("s03","Are smoking regulations posted and adhered to?","YES_NO"),
    q("s04","Is all loose gear on deck, in stores and internal spaces properly secured?","YES_NO"),
    q("s05","Are lifeboat and fire drills regularly held?","YES_NO"),
    q("s06","Are portable gas and oxygen analysers in good order with calibration records?","YES_NO"),
    q("s07","Are hot work procedures in accordance with ISGOTT Section 9.4 and OCIMF guidelines?","YES_NO"),
    q("s08","Are spare O2/acetylene cylinders stored apart, clearly marked, well-ventilated?","YES_NO"),
    q("s09","Have periodical tests and inspections for LSA and FFA been carried out per SMS?","YES_NO"),
    q("s10","Are muster lists and lifejacket donning instructions displayed?","YES_NO"),
    q("s11","Condition of lifeboats including equipment and launching mechanisms","GRADE"),
    q("s12","Condition of rescue boat including equipment and launching arrangement","GRADE"),
    q("s13","Condition of life rafts and hydrostatic releases","GRADE"),
    q("s14","Are lifebuoys, lights, buoyant lines and self-activating smoke floats in good order?","YES_NO"),
    q("s15","Are lifejackets in good order?","YES_NO"),
    q("s16","Are immersion suits in good order?","YES_NO"),
    q("s17","Are fire mains, pumps, hoses and nozzles in good order?","YES_NO"),
    q("s18","Is a fire control plan exhibited with equipment correctly marked?","YES_NO"),
    q("s19","Are fixed fire detection and alarm systems in good order and tested regularly?","YES_NO"),
    q("s20","Is the emergency fire pump in full operational condition?","YES_NO"),
    q("s21","Are crew members familiar with donning EEBDs?","YES_NO"),
    q("s22","Are MSDS on board for all cargo, bunkers and products handled?","YES_NO"),
    q("s23","Condition of gangways, accommodation ladders and pilot ladders (SWL marked?)","GRADE"),
  ]},
  { code:"POLLUTION", title:"5. Pollution Prevention", vesselType:null, questions:[
    q("p01","Are ORBs (Part I and II) correctly completed?","YES_NO"),
    q("p02","Is the condition of scupper plugs satisfactory and scuppers effectively plugged?","YES_NO"),
    q("p03","Have alarms for OWS, Incinerator, Sewage plant been tested?","YES_NO"),
    q("p04","Is vessel free from visible bulkhead, valve or pipeline leakage liable to cause pollution?","YES_NO"),
    q("p05","Are bunker pipelines tested annually? (State date of last test)","TEXT"),
    q("p06","Are spill containers fitted around all fuel, diesel and lubricating oil tank vents?","YES_NO"),
    q("p07","Is the Sewage treatment plant in order and in use?","YES_NO"),
    q("p08","Are engine room bilge oily water pumping and disposal arrangements in good order?","YES_NO"),
    q("p09","Is the oily water separator in good order with automatic stopping device?","YES_NO"),
    q("p10","Does the vessel have a garbage management plan and adequate disposal facilities?","YES_NO"),
    q("p11","Is the BWTS operational, approved by USCG and IMO, with records maintained?","YES_NO"),
    q("p12","Are SOPEP and SMEPP updated and maintained?","YES_NO"),
    q("p13","OCM Calibration certificate expiry date","DATE"),
    q("p14","Condition of Incinerator","GRADE"),
    q("p15","Condition of OWS / Oil Water Separator","GRADE"),
  ]},
  { code:"STRUCTURAL", title:"6. Structural Condition", vesselType:null, questions:[
    q("st01","Is the hull free from visible structural defects warranting investigation?","YES_NO"),
    q("st02","Are weather decks free from visible structural defects?","YES_NO"),
    q("st03","Is the superstructure free from visible structural defects?","YES_NO"),
    q("st04","Condition of railings and bulwarks","GRADE"),
    q("st05","Are internal spaces free from visible structural defects?","YES_NO"),
    q("st06","Condition of cargo and/or ballast tanks as sighted","GRADE"),
    q("st07","Condition of funnel structure","GRADE"),
    q("st08","If any hull indentation visible, is it recorded in PMS Defect list?","YES_NO"),
  ]},
  { code:"BALLAST", title:"7. Ballast Tanks & Systems", vesselType:null, questions:[
    q("b01","Ballast tanks condition — state which tanks were inspected","TEXT"),
    q("b02","Condition of ballast tanks (coatings, anodes, corrosion)","GRADE"),
    q("b03","Condition and operation of ballast pumps","GRADE"),
    q("b04","Is the loading computer working with test records available?","YES_NO"),
    q("b05","Have other tanks been inspected (fresh water, fuel, cofferdams)?","YES_NO"),
    q("b06","Are records available for regular sounding of void spaces?","YES_NO"),
  ]},
  { code:"DECK_MACHINERY", title:"8. Deck Machinery & Mooring", vesselType:null, questions:[
    q("d01","Are certificates available for all mooring ropes and wires?","YES_NO"),
    q("d02","Are inspection and maintenance records available for mooring equipment?","YES_NO"),
    q("d03","Is there a policy for testing winch brakes with results recorded?","YES_NO"),
    q("d04","Condition of mooring winches including foundations","GRADE"),
    q("d05","Condition of mooring wires, ropes and synthetic tails","GRADE"),
    q("d06","Are pedestal fairleads, roller fairleads well greased and free to turn?","YES_NO"),
    q("d07","Is mooring equipment marked with its SWL?","YES_NO"),
    q("d08","Condition of windlasses, anchors, locking bars and cables","GRADE"),
    q("d09","Are emergency towing arrangements readily available at both ends?","YES_NO"),
    q("d10","Test and examination due date for mooring winches and windlass","DATE"),
    q("d11","Number of new spare mooring ropes in inventory","NUMBER"),
  ]},
  { code:"ENGINE_ROOM", title:"9. Engine & Steering Compartments", vesselType:null, questions:[
    q("e01","Overall impression of engine room (cleanliness, bilges, lighting)","GRADE"),
    q("e02","Have all ER alarms been tested and found in order?","YES_NO"),
    q("e03","Has Chief Engineer written Standing Orders countersigned by watch engineers?","YES_NO"),
    q("e04","Is the PMS being followed and up to date? (Note any overdue items)","YES_NO"),
    q("e05","Condition of main engine and performance reports","GRADE"),
    q("e06","Are auxiliary engines within stated overhaul intervals?","YES_NO"),
    q("e07","Condition of auxiliary boiler (no internal or external leaks)","GRADE"),
    q("e08","Condition of auxiliary equipment (pumps, compressors, purifiers)","GRADE"),
    q("e09","Steering gear condition — free of leakage, emergency steering instructions posted","GRADE"),
    q("e10","Has emergency steering gear been tested within past three months?","YES_NO"),
    q("e11","Lube oil analysis report satisfactory?","YES_NO"),
    q("e12","Cooling water system working properly with no leaks?","YES_NO"),
    q("e13","Fuel oil analysis satisfactory?","YES_NO"),
    q("e14","Condition of ECR — neat with lashing arrangements for chairs","GRADE"),
    q("e15","Is the Freshwater Generator in good condition producing adequate quantity?","YES_NO"),
    q("e16","Condition of pumps and motors (FO, LO, SW, FW systems)","GRADE"),
    q("e17","Are all air compressors operational with test records?","YES_NO"),
    q("e18","Condition of main switchboard and electrical distribution system","GRADE"),
    q("e19","Is the dead man alarm system in good order?","YES_NO"),
    q("e20","Condition of bilges — free of oil, rubbish and sediment","GRADE"),
    q("e21","Were M/E piston rings, liners and crank-case inspected during this visit?","YES_NO"),
    q("e22","Condition of seawater pumps, sea chests and associated pipework","GRADE"),
    q("e23","Does the vessel carry original NOx Technical Files for each engine?","YES_NO"),
    q("e24","Main engine make and model","TEXT"),
    q("e25","Auxiliary engine make, model and total power","TEXT"),
  ]},
  { code:"HULL_DECKS", title:"10. External Hull & Decks", vesselType:null, questions:[
    q("h01","Condition, visual appearance and cleanliness of the hull","GRADE"),
    q("h02","Hull markings clearly indicated and correctly placed","GRADE"),
    q("h03","Condition, visual appearance and cleanliness of weather decks","GRADE"),
    q("h04","Do decks in working areas have clearly identified non-slip surfaces?","YES_NO"),
    q("h05","Condition of Deck House and Stores","GRADE"),
    q("h06","Condition of service pipework — free from significant corrosion?","GRADE"),
    q("h07","Condition of anodes (hull and propeller/rudder area)","GRADE"),
    q("h08","Condition of all deck openings, watertight doors and portholes","GRADE"),
    q("h09","Condition of fuel, ballast and space vents and air pipes","GRADE"),
    q("h10","Are all vents and air pipes clearly marked?","YES_NO"),
    q("h11","Condition of superstructure","GRADE"),
    q("h12","Is deck lighting adequate?","YES_NO"),
    q("h13","Condition of electrical equipment including conduits and wiring","GRADE"),
    q("h14","Condition of internal spaces and storerooms","GRADE"),
    q("h15","Condition of accommodation — mess rooms, sanitary areas, galleys, pantries","GRADE"),
    q("h16","Is the helicopter landing area clearly marked?","YES_NO"),
    q("h17","Are portable ladders on deck certified and marked with SWL?","YES_NO"),
    q("h18","Condition of ship's hospital — clean, tidy and ready for use","GRADE"),
  ]},
  { code:"EQUIP_TESTS", title:"12. Equipment Checks & Tests", vesselType:null, questions:[
    q("eq01","Forward life raft light tested","YES_NO"),
    q("eq02","Magnetic compass on monkey island checked for bubbles","YES_NO"),
    q("eq03","Multi-gas (Drager) detector calibrated and tested","YES_NO"),
    q("eq04","GMDSS VHF sets tested","YES_NO"),
    q("eq05","Navigational light failure alarm and panels tested","YES_NO"),
    q("eq06","Hospital alarm bell tested","YES_NO"),
    q("eq07","Echo sounder shallow depth alarm tested","YES_NO"),
    q("eq08","GMDSS station 24V battery on-load tested","YES_NO"),
    q("eq09","ECDIS checks — safety parameters tested","YES_NO"),
    q("eq10","Lifejacket light tested","YES_NO"),
    q("eq11","Aldis lamp tested on mains and battery","YES_NO"),
    q("eq12","SCBA sets low pressure alarm tested","YES_NO"),
    q("eq13","Lifeboat engine tried out on both batteries ahead/astern","YES_NO"),
    q("eq14","MSB 220V and 440V low insulation alarm tested","YES_NO"),
    q("eq15","Steering gear alarm tested, communication to bridge checked","YES_NO"),
    q("eq16","Steering gear movement tested port and starboard","YES_NO"),
    q("eq17","OWS 15 PPM alarm tested","YES_NO"),
    q("eq18","EEBD sets in engine room checked for pressure","YES_NO"),
    q("eq19","Emergency generator tried out on battery and starter","YES_NO"),
    q("eq20","PMS overdue items reviewed and noted","YES_NO"),
  ]},
];

const typeSpecificCondition: Section[] = [
  { code:"CARGO_HOLDS", title:"7.1-7.5 Cargo, Ballast & Cranes", vesselType:"BULK_CARRIER", questions:[
    q("bh01","Condition of cargo hold structure, frames and coatings","GRADE"),
    q("bh02","Condition of hatch covers, coamings, seals and cleats","GRADE"),
    q("bh03","Are hatch cover operating systems in full working order and free of leakage?","YES_NO"),
    q("bh04","Condition of compression bar/strips and hatch coaming drain channels","GRADE"),
    q("bh05","Condition of Bobby hatch cover packing and channels","GRADE"),
    q("bh06","Condition and test records of cargo cranes (state number and SWL)","GRADE"),
    q("bh07","Condition of crane jib — rust stains or corrosion at joints","GRADE"),
    q("bh08","Are grabs operational? When were they last used? (State SWL and capacity)","TEXT"),
    q("bh09","Crane wire condition — when was it last replaced?","TEXT"),
    q("bh10","Is the Water Ingress Alarm System tested and fully operational?","YES_NO"),
    q("bh11","Are cargo bilge transfer pumps operational and pressure gauges working?","YES_NO"),
    q("bh12","Condition of cable shelves","GRADE"),
  ]},
  { code:"CONTAINER_SYS", title:"Container Securing, Lashing & Reefer", vesselType:"CONTAINER_SHIP", questions:[
    q("cs01","Condition of cell guides, lashing bridges and securing points","GRADE"),
    q("cs02","Condition and inventory of lashing gear (rods, turnbuckles, twistlocks)","GRADE"),
    q("cs03","Are reefer receptacles and monitoring systems operational?","YES_NO"),
    q("cs04","Is the cargo securing manual on board and approved?","YES_NO"),
    q("cs05","Are VGM (container weight verification) procedures in place?","YES_NO"),
  ]},
  { code:"CARGO_TANKS", title:"Cargo Tanks, COW, Inert Gas & Venting", vesselType:"OIL_TANKER", questions:[
    q("ot01","Condition of cargo tank coatings and structure (as sighted)","GRADE"),
    q("ot02","Is the Inert Gas System operational with valid records?","YES_NO"),
    q("ot03","Condition of cargo pumps, COW machines and P/V venting system","GRADE"),
    q("ot04","Are overfill alarms, high level alarms and automatic shutdown systems operational?","YES_NO"),
  ]},
  { code:"CARGO_CONTAINMENT", title:"Cargo Containment & Reliquefaction", vesselType:"LNG_CARRIER", questions:[
    q("lng01","Condition of containment system and cofferdam/hold spaces","GRADE"),
    q("lng02","Are gas detection and ESD systems tested and operational?","YES_NO"),
    q("lng03","Condition of cargo compressors / reliquefaction plant","GRADE"),
    q("lng04","Is the nitrogen system operational?","YES_NO"),
  ]},
  { code:"TWEEN_DECKS", title:"Tween Decks, Hatch Covers & Cargo Gear", vesselType:"GENERAL_CARGO", questions:[
    q("gc01","Condition of tween decks, pontoons and cargo battens","GRADE"),
    q("gc02","Condition and certification of cargo derricks/cranes","GRADE"),
    q("gc03","Condition of hatch covers and coamings","GRADE"),
  ]},
  { code:"GAS_SYSTEMS", title:"Cargo Tanks, Compressors & Gas Detection", vesselType:"LPG_TANKER", questions:[
    q("lpg01","Condition of cargo tanks, domes and insulation","GRADE"),
    q("lpg02","Are fixed gas detection systems calibrated and operational?","YES_NO"),
    q("lpg03","Condition of cargo compressors and heaters","GRADE"),
  ]},
  { code:"HOTEL_PAX", title:"Hotel Services, Passenger Spaces & Evacuation", vesselType:"CRUISE_SHIP", questions:[
    q("crp01","Condition of passenger cabins and public spaces","GRADE"),
    q("crp02","Are Marine Evacuation Systems and muster arrangements in order?","YES_NO"),
    q("crp03","Condition of galleys, provision plants and HVAC","GRADE"),
  ]},
];

export function getConditionSections(vesselType: VesselType): Section[] {
  return [...universalCondition, ...typeSpecificCondition.filter(s => s.vesselType === vesselType)];
}

const universalPrePurchase: Section[] = [
  { code:"VESSEL_HISTORY", title:"A. Vessel History & Previous Names", vesselType:null, questions:[
    q("vh01","Full history of vessel names and flag changes","TEXT"),
    q("vh02","Previous owners and operators","TEXT"),
    q("vh03","Has the vessel ever been involved in a serious casualty or grounding?","YES_NO"),
    q("vh04","Has the vessel ever been detained by PSC? (State details)","TEXT"),
    q("vh05","Are all previous ISM/ISPS/MLC audit records available?","YES_NO"),
    q("vh06","Are trading history and voyage records available for last 3 years?","YES_NO"),
    q("vh07","Has vessel carried any special or hazardous cargoes? (State details)","TEXT"),
  ]},
  { code:"CLASS_STATUS", title:"B. Class & Survey Status", vesselType:null, questions:[
    q("cl01","Current classification society and class notation","TEXT"),
    q("cl02","Are all class certificates valid with no outstanding conditions?","YES_NO"),
    q("cl03","Date and port of last annual survey","TEXT"),
    q("cl04","Date and port of last special/renewal survey","DATE"),
    q("cl05","Date and port of last dry dock","DATE"),
    q("cl06","Next dry dock due date","DATE"),
    q("cl07","Are all tailshaft survey records available and in order?","YES_NO"),
    q("cl08","Are thickness measurement records available from last special survey?","YES_NO"),
    q("cl09","Any outstanding recommendations or memoranda from class?","TEXT"),
    q("cl10","Is vessel enrolled in any condition monitoring or enhanced survey programme?","YES_NO"),
  ]},
  { code:"DOC_REVIEW", title:"C. Document Review & Commercial Due Diligence", vesselType:null, questions:[
    q("dr01","Are original classification certificates and survey reports available?","YES_NO"),
    q("dr02","Is the full maintenance and repair history available?","YES_NO"),
    q("dr03","Are all statutory certificates valid and available?","YES_NO"),
    q("dr04","Are engine log books available for last 3 years?","YES_NO"),
    q("dr05","Are lube oil analysis reports available for last 2 years?","YES_NO"),
    q("dr06","Are fuel oil analysis records available?","YES_NO"),
    q("dr07","Is the PMS history and overdue item list available?","YES_NO"),
    q("dr08","Are purchase invoices for major repairs and overhauls available?","YES_NO"),
    q("dr09","Any active or pending legal claims, arrests or liens on the vessel?","YES_NO"),
  ]},
  { code:"PERFORMANCE", title:"D. Vessel Performance Verification", vesselType:null, questions:[
    q("pv01","State contracted speed and fuel consumption (as per charter party)","TEXT"),
    q("pv02","Actual speed and fuel consumption over last 3 voyages","TEXT"),
    q("pv03","Is the vessel meeting charter party speed and consumption requirements?","YES_NO"),
    q("pv04","Any significant speed/performance loss vs design specifications?","YES_NO"),
    q("pv05","Date of last propeller polishing or hull cleaning","DATE"),
    q("pv06","Main engine MCR and service power","TEXT"),
    q("pv07","Are fuel efficiency and EEOI records maintained as per SEEMP?","YES_NO"),
  ]},
  { code:"SPACES_INSPECTION", title:"E. Spaces Available for Inspection", vesselType:null, questions:[
    q("sp01","Were all cargo spaces / holds available for inspection?","YES_NO"),
    q("sp02","Were all ballast tanks available for internal inspection?","YES_NO"),
    q("sp03","Was the engine room fully accessible?","YES_NO"),
    q("sp04","Were all fuel and lube oil tanks accessible?","YES_NO"),
    q("sp05","Any spaces or equipment not available for inspection? (State reasons)","TEXT"),
  ]},
  { code:"DEFICIENCY_REG", title:"F. Deficiency Register", vesselType:null, questions:[
    q("def01","Is a deficiency register maintained on board?","YES_NO"),
    q("def02","Number of open deficiency items at time of inspection","NUMBER"),
    q("def03","Are all deficiencies from last superintendent inspection closed out?","YES_NO"),
    q("def04","Describe any critical open deficiencies","TEXT"),
    q("def05","Is there a budget allocated for outstanding repairs?","YES_NO"),
    q("def06","Estimated cost of all outstanding repairs and deficiencies (USD)","NUMBER"),
  ]},
];

const typeSpecificPrePurchase: Section[] = [
  { code:"CARGO_GEAR_VERIFY", title:"G. Cargo Gear Particulars Verification", vesselType:"BULK_CARRIER", questions:[
    q("cgv01","Number of cargo holds and hatch covers — verified against certificates","TEXT"),
    q("cgv02","Number of cranes, SWL and make — verified against certificates","TEXT"),
    q("cgv03","Grab capacity (cbm) — verified and operational","TEXT"),
    q("cgv04","Crane wire — last replacement date and condition","TEXT"),
    q("cgv05","Hatch cover type and last hose/ultrasound test result","TEXT"),
    q("cgv06","Grain/bale capacity verified against trim and stability booklet","YES_NO"),
  ]},
  { code:"CARGO_SYS_VERIFY", title:"G. Cargo System Verification", vesselType:"OIL_TANKER", questions:[
    q("csv01","Number of cargo pumps, type and rated capacity verified","TEXT"),
    q("csv02","Cargo tank coating type, last inspection date and condition","TEXT"),
    q("csv03","IGS maker, model and last overhaul date","TEXT"),
    q("csv04","COW system operational and last calibration date","TEXT"),
  ]},
  { code:"GAS_SYS_VERIFY", title:"G. Gas Plant Particulars Verification", vesselType:"LNG_CARRIER", questions:[
    q("gsv01","Containment system type (Moss/Membrane) — maker and last inspection","TEXT"),
    q("gsv02","Cargo compressors — maker, model, number and condition","TEXT"),
    q("gsv03","Reliquefaction plant — maker, model and condition","TEXT"),
    q("gsv04","ESD system — last test date and condition","TEXT"),
  ]},
  { code:"CONTAINER_VERIFY", title:"G. Container System Verification", vesselType:"CONTAINER_SHIP", questions:[
    q("conV01","Total TEU capacity and reefer plug points — verified","TEXT"),
    q("conV02","Lashing gear inventory — quantity and condition verified","TEXT"),
    q("conV03","Reefer monitoring system maker and condition","TEXT"),
  ]},
  { code:"LPG_VERIFY", title:"G. LPG Plant Verification", vesselType:"LPG_TANKER", questions:[
    q("lpgV01","Cargo tank type, capacity and coating/insulation condition","TEXT"),
    q("lpgV02","Compressors maker, model and number verified","TEXT"),
    q("lpgV03","Gas detection system maker and last calibration date","TEXT"),
  ]},
  { code:"GC_VERIFY", title:"G. Cargo Gear Verification", vesselType:"GENERAL_CARGO", questions:[
    q("gcV01","Derrick/crane number, SWL and certification status","TEXT"),
    q("gcV02","Hatch cover type and last test result","TEXT"),
  ]},
  { code:"CRUISE_VERIFY", title:"G. Hotel Plant Verification", vesselType:"CRUISE_SHIP", questions:[
    q("crV01","Passenger capacity and accommodation standard verified","TEXT"),
    q("crV02","Marine Evacuation System make and last service date","TEXT"),
    q("crV03","HVAC plant condition and last overhaul","TEXT"),
  ]},
];

export function getPrePurchaseSections(vesselType: VesselType): Section[] {
  return [...universalPrePurchase, ...typeSpecificPrePurchase.filter(s => s.vesselType === vesselType)];
}

const baseInventory = (sectionCode: string, names: string[]): EquipmentItem[] =>
  names.map((name, i) => ({
    id:`${sectionCode}-${i}`, sectionCode, equipmentName:name,
    equipmentModel:"", equipmentSerial:"", manufacturer:"", yearOfMake:"",
    specifications:"", grade:"" as const, condition:"",
    estimatedRepairCost:0, annualMaintCost:0, remainingLifeYears:10, replacementCost:0, remarks:"",
  }));

const universalInventory: EquipmentItem[] = [
  ...baseInventory("MACHINERY_INV",["Main Engine","Auxiliary Engine No.1","Auxiliary Engine No.2","Auxiliary Engine No.3","Boiler (Composite/Steam)","Steering Gear","Fresh Water Generator","Air Compressor No.1","Air Compressor No.2","Oily Water Separator","Sewage Treatment Plant","Ballast Water Treatment System","Incinerator"]),
  ...baseInventory("NAV_COMMS_INV",["Radar (X-Band)","Radar (S-Band)","ECDIS No.1","ECDIS No.2","Echo Sounder","GPS / DGPS","AIS Transponder","GMDSS Console","VDR","BNWAS","EPIRB","SART"]),
  ...baseInventory("SAFETY_INV",["Lifeboat(s)","Rescue Boat","Liferafts","SCBA Sets","EEBD Sets","Fixed CO2 System","Main Fire Pump","Emergency Fire Pump","Portable Gas Detectors"]),
];

const typeInventory: Record<VesselType, EquipmentItem[]> = {
  BULK_CARRIER: baseInventory("CARGO_GEAR_INV",["Cargo Crane No.1","Cargo Crane No.2","Cargo Crane No.3","Cargo Crane No.4","Grabs","Hatch Cover Hydraulic System","Water Ingress Alarm System","Ballast Pump No.1","Ballast Pump No.2"]),
  CONTAINER_SHIP: baseInventory("LASHING_INV",["Lashing Gear Set","Twistlock Inventory","Reefer Monitoring System","Cell Guide System"]),
  OIL_TANKER: baseInventory("CARGO_SYS_INV",["Cargo Pump No.1","Cargo Pump No.2","Cargo Pump No.3","Inert Gas System","COW Machines","P/V Valves & Venting"]),
  LNG_CARRIER: baseInventory("GAS_PLANT_INV",["Cargo Compressors","Reliquefaction Plant","Gas Detection System (Fixed)","ESD System"]),
  GENERAL_CARGO: baseInventory("CARGO_GEAR_INV",["Cargo Crane No.1","Cargo Crane No.2","Hatch Covers & Pontoons","Tween Deck Pontoons"]),
  LPG_TANKER: baseInventory("GAS_PLANT_INV",["Cargo Compressor No.1","Cargo Compressor No.2","Cargo Heater","Gas Detection System (Fixed)"]),
  CRUISE_SHIP: baseInventory("HOTEL_PLANT_INV",["Marine Evacuation Systems","HVAC Plant","Galley Equipment","Provision Refrigeration Plant","Stabilisers"]),
};

export function getPrePurchaseInventory(vesselType: VesselType): EquipmentItem[] {
  return [...universalInventory, ...typeInventory[vesselType]].map(it => ({ ...it }));
}

// ─────────────────────────────────────────────────────────────────────
// TECHNICAL INSPECTION — imported from the 321-item survey checklist
// (Checklist_-_INI-O-5.xlsx), grouped by its 16 survey categories.
// ─────────────────────────────────────────────────────────────────────
interface TechnicalChecklistItem {
  code: string;
  question: string;
  group: string;
  priority: string;
  location: string;
  rank: string;
}

// The source spreadsheet dropped the "/" from this group's name.
const GROUP_LABEL_FIXUPS: Record<string, string> = {
  "GangwayAccommodation Ladder": "Gangway/Accommodation Ladder",
};

function slugifyGroup(group: string): string {
  return "TECH_" + group.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

export function getTechnicalSections(): Section[] {
  const items = (technicalChecklist as { items: TechnicalChecklistItem[] }).items;
  const order: string[] = [];
  const byGroup = new Map<string, TechnicalChecklistItem[]>();
  for (const it of items) {
    if (!byGroup.has(it.group)) { byGroup.set(it.group, []); order.push(it.group); }
    byGroup.get(it.group)!.push(it);
  }
  return order.map((group, i) => ({
    code: slugifyGroup(group),
    title: `${i + 1}. ${GROUP_LABEL_FIXUPS[group] ?? group}`,
    vesselType: null,
    questions: byGroup.get(group)!.map((it) => ({
      id: it.code,
      prompt: it.location ? `${it.question} (${it.location})` : it.question,
      answerKind: "GRADE" as const,
    })),
  }));
}
