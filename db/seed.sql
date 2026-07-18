-- =====================================================================
-- Seed: question templates for both inspection models.
-- Derived from the reference condition reports; provider names omitted.
-- =====================================================================

-- ============ CONDITION INSPECTION — UNIVERSAL SECTIONS ==============
INSERT INTO template_sections (inspection_type, vessel_type, code, title, sort_order) VALUES
('CONDITION', NULL, 'CERTIFICATION',   'Certification & Documentation', 10),
('CONDITION', NULL, 'CREW_MGMT',       'Crew Management',               20),
('CONDITION', NULL, 'NAVIGATION',      'Bridge & Navigation Equipment', 30),
('CONDITION', NULL, 'SAFETY_MGMT',     'Safety Management & LSA/FFA',   40),
('CONDITION', NULL, 'POLLUTION',       'Pollution Prevention',          50),
('CONDITION', NULL, 'STRUCTURAL',      'Structural Condition',          60),
('CONDITION', NULL, 'BALLAST',         'Ballast Tanks & Systems',       70),
('CONDITION', NULL, 'DECK_MACHINERY',  'Deck Machinery & Mooring',      80),
('CONDITION', NULL, 'ENGINE_ROOM',     'Engine & Steering Compartments',90),
('CONDITION', NULL, 'ACCOMMODATION',   'Accommodation & Welfare',       100);

-- Universal condition questions (sample set per section)
INSERT INTO template_questions (section_id, prompt, answer_kind, sort_order)
SELECT id, q.prompt, q.kind::answer_kind, q.ord FROM template_sections s
JOIN (VALUES
 ('CERTIFICATION','Are all Class and Statutory certificates valid?','YES_NO',1),
 ('CERTIFICATION','Are there any outstanding Conditions of Class?','TEXT',2),
 ('CERTIFICATION','Dry dock renewal due date','DATE',3),
 ('NAVIGATION','Condition of radar, ECDIS, echo sounder and GMDSS equipment','GRADE',1),
 ('NAVIGATION','Are passage planning and chart corrections up to date?','YES_NO',2),
 ('SAFETY_MGMT','Condition of lifeboats, liferafts and launching arrangements','GRADE',1),
 ('SAFETY_MGMT','Condition of fixed and portable fire fighting equipment','GRADE',2),
 ('SAFETY_MGMT','Are records for testing of critical equipment in place per SMS?','YES_NO',3),
 ('POLLUTION','Condition of OWS, sewage treatment plant and incinerator','GRADE',1),
 ('POLLUTION','Is the BWTS operational and records maintained?','YES_NO',2),
 ('STRUCTURAL','Is the hull free from visible structural defects warranting investigation?','YES_NO',1),
 ('STRUCTURAL','General condition, appearance and cleanliness of the hull','GRADE',2),
 ('STRUCTURAL','General condition of weather decks and non-slip surfaces','GRADE',3),
 ('STRUCTURAL','Condition of deck openings, watertight doors and hatch access lids','GRADE',4),
 ('STRUCTURAL','Condition of vents, air pipes and service pipework (corrosion/pitting)','GRADE',5),
 ('STRUCTURAL','Condition of superstructure and funnel','GRADE',6),
 ('BALLAST','Condition of ballast tanks sighted (coatings, anodes, corrosion)','GRADE',1),
 ('BALLAST','Condition and operation of ballast pumps','GRADE',2),
 ('DECK_MACHINERY','Condition of windlass, winches and mooring equipment','GRADE',1),
 ('DECK_MACHINERY','Condition of mooring ropes/wires and drum spooling','GRADE',2),
 ('ENGINE_ROOM','Overall impression of engine room (cleanliness, bilges, leaks)','GRADE',1),
 ('ENGINE_ROOM','Main engine condition and performance reports satisfactory?','YES_NO',2),
 ('ENGINE_ROOM','Auxiliary engines condition and overhaul intervals within limits?','YES_NO',3),
 ('ENGINE_ROOM','Steering gear condition (leakage, emergency steering instructions)','GRADE',4),
 ('ACCOMMODATION','General condition and hygiene of accommodation and galley','GRADE',1)
) AS q(code, prompt, kind, ord)
ON s.code = q.code AND s.inspection_type = 'CONDITION' AND s.vessel_type IS NULL;

-- ============ CONDITION — VESSEL-TYPE-SPECIFIC SECTIONS ==============
INSERT INTO template_sections (inspection_type, vessel_type, code, title, sort_order) VALUES
('CONDITION','BULK_CARRIER','CARGO_HOLDS','Cargo Holds, Hatch Covers, Cranes & Grabs',65),
('CONDITION','CONTAINER_SHIP','CONTAINER_SYS','Container Securing, Lashing & Reefer Systems',65),
('CONDITION','OIL_TANKER','CARGO_TANKS','Cargo Tanks, COW, Inert Gas & Venting Systems',65),
('CONDITION','LNG_CARRIER','CARGO_CONTAINMENT','Cargo Containment, Reliquefaction & Gas Handling',65),
('CONDITION','GENERAL_CARGO','TWEEN_DECKS','Tween Decks, Hatch Covers & Cargo Gear',65),
('CONDITION','LPG_TANKER','GAS_SYSTEMS','Cargo Tanks, Compressors & Gas Detection',65),
('CONDITION','CRUISE_SHIP','HOTEL_PAX','Hotel Services, Passenger Spaces & Evacuation Systems',65);

INSERT INTO template_questions (section_id, prompt, answer_kind, sort_order)
SELECT id, q.prompt, q.kind::answer_kind, q.ord FROM template_sections s
JOIN (VALUES
 ('CARGO_HOLDS','Condition of cargo hold structure, frames and coatings','GRADE',1),
 ('CARGO_HOLDS','Condition of hatch covers, coamings, seals and cleats','GRADE',2),
 ('CARGO_HOLDS','Condition and test records of cargo cranes and grabs','GRADE',3),
 ('CARGO_HOLDS','Is the Water Ingress Alarm System operational?','YES_NO',4),
 ('CONTAINER_SYS','Condition of cell guides, lashing bridges and securing points','GRADE',1),
 ('CONTAINER_SYS','Condition and inventory of lashing gear (rods, turnbuckles, twistlocks)','GRADE',2),
 ('CONTAINER_SYS','Are reefer receptacles and monitoring systems operational?','YES_NO',3),
 ('CARGO_TANKS','Condition of cargo tank coatings and structure (as sighted)','GRADE',1),
 ('CARGO_TANKS','Is the Inert Gas System operational with valid records?','YES_NO',2),
 ('CARGO_TANKS','Condition of cargo pumps, COW machines and P/V venting system','GRADE',3),
 ('CARGO_CONTAINMENT','Condition of containment system and cofferdam/hold spaces','GRADE',1),
 ('CARGO_CONTAINMENT','Are gas detection and ESD systems tested and operational?','YES_NO',2),
 ('CARGO_CONTAINMENT','Condition of cargo compressors / reliquefaction plant','GRADE',3),
 ('TWEEN_DECKS','Condition of tween decks, pontoons and cargo battens','GRADE',1),
 ('TWEEN_DECKS','Condition and certification of cargo derricks/cranes','GRADE',2),
 ('GAS_SYSTEMS','Condition of cargo tanks, domes and insulation','GRADE',1),
 ('GAS_SYSTEMS','Condition of cargo compressors and heaters','GRADE',2),
 ('GAS_SYSTEMS','Are fixed gas detection systems calibrated and operational?','YES_NO',3),
 ('HOTEL_PAX','Condition of passenger cabins and public spaces','GRADE',1),
 ('HOTEL_PAX','Are Marine Evacuation Systems and muster arrangements in order?','YES_NO',2),
 ('HOTEL_PAX','Condition of galleys, provision plants and HVAC','GRADE',3)
) AS q(code, prompt, kind, ord)
ON s.code = q.code AND s.inspection_type = 'CONDITION';

-- ============ PRE-PURCHASE — inherits condition scope + inventory ====
-- Universal Pre-Purchase sections. The UI additionally renders the
-- equipment inventory + CapEx columns for every item in these sections.
INSERT INTO template_sections (inspection_type, vessel_type, code, title, sort_order) VALUES
('PRE_PURCHASE', NULL, 'PARTICULARS_VERIF','Particulars & Documentation Verification',10),
('PRE_PURCHASE', NULL, 'HULL_STRUCTURE',   'Hull & Structural Survey',               20),
('PRE_PURCHASE', NULL, 'MACHINERY_INV',    'Machinery Equipment Inventory',          30),
('PRE_PURCHASE', NULL, 'NAV_COMMS_INV',    'Navigation & Comms Equipment Inventory', 40),
('PRE_PURCHASE', NULL, 'SAFETY_INV',       'LSA / FFA Equipment Inventory',          50),
('PRE_PURCHASE', NULL, 'CAPEX',            '5-Year CapEx & Lifecycle Projection',    90);

INSERT INTO template_sections (inspection_type, vessel_type, code, title, sort_order) VALUES
('PRE_PURCHASE','BULK_CARRIER','CARGO_GEAR_INV','Cargo Cranes, Grabs & Hatch Cover Inventory',60),
('PRE_PURCHASE','CONTAINER_SHIP','LASHING_INV','Lashing Gear & Reefer Plant Inventory',60),
('PRE_PURCHASE','OIL_TANKER','CARGO_SYS_INV','Cargo Pumps, IGS & COW Inventory',60),
('PRE_PURCHASE','LNG_CARRIER','GAS_PLANT_INV','Gas Handling Plant Inventory',60),
('PRE_PURCHASE','GENERAL_CARGO','CARGO_GEAR_INV','Cargo Gear & Hatch Cover Inventory',60),
('PRE_PURCHASE','LPG_TANKER','GAS_PLANT_INV','Compressors & Gas Plant Inventory',60),
('PRE_PURCHASE','CRUISE_SHIP','HOTEL_PLANT_INV','Hotel Plant & Evacuation Systems Inventory',60);
