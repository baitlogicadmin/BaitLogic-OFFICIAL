export type WaterWatchStatus = "public-act" | "awaiting-final-status";

export type WaterWatchItem = {
  id: string;
  bill: string;
  title: string;
  status: WaterWatchStatus;
  statusLabel: string;
  checkedAt: string;
  effectiveAt?: string;
  sourceAuthority: string;
  sourceUrl: string;
  fieldMeaning: string;
  guardrail: string;
  action: string;
};

export const waterWatchCheckedAt = "2026-08-22";

export const waterWatchItems: WaterWatchItem[] = [
  {
    id: "plastic-pellets",
    bill: "HB4418 · PA 104-0772",
    title: "Plastic pellets in stormwater",
    status: "public-act",
    statusLabel: "Public Act · effective Jan 1, 2027",
    checkedAt: waterWatchCheckedAt,
    effectiveAt: "2027-01-01",
    sourceAuthority: "Illinois General Assembly",
    sourceUrl: "https://www.ilga.gov/ftp/legislation/104/BillStatus/HTML/10400HB4418.html",
    fieldMeaning: "Illinois is requiring stormwater pollution-prevention requirements addressing plastic pellets or other preproduction plastic materials for covered facilities.",
    guardrail: "A pellet sighting does not identify the source or prove a violation. Document safely and use the official pollution-reporting route when appropriate.",
    action: "Watch shorelines, drains, outfalls, and high-water debris for unusual concentrations of small plastic pellets. Never enter unsafe water or industrial property to investigate.",
  },
  {
    id: "pfas-permits",
    bill: "SB3917 · PA 104-0747",
    title: "PFAS wastewater monitoring",
    status: "public-act",
    statusLabel: "Public Act · effective Jan 1, 2027",
    checkedAt: waterWatchCheckedAt,
    effectiveAt: "2027-01-01",
    sourceAuthority: "Illinois General Assembly",
    sourceUrl: "https://ilga.gov/Legislation/BillStatus?DocNum=3917&DocTypeID=SB&GAID=18&LegId=167376&SessionID=114",
    fieldMeaning: "The law adds PFAS-related wastewater sampling and characterization requirements to parts of Illinois' NPDES permitting framework.",
    guardrail: "This law does not prove PFAS is present in any particular lake, river, or stream. Waterbody claims require actual monitoring or agency data.",
    action: "Use BaitLogic to follow official implementation and waterbody-specific data as agencies publish it; avoid treating statewide policy as a local contamination result.",
  },
  {
    id: "pfas-action-plan",
    bill: "HB2955",
    title: "PFAS Wastewater Citizen Protection Act",
    status: "awaiting-final-status",
    statusLabel: "Sent to Governor · final status needs recheck",
    checkedAt: waterWatchCheckedAt,
    sourceAuthority: "Illinois General Assembly",
    sourceUrl: "https://www.ilga.gov/ftp/legislation/104/BillStatus/HTML/10400HB2955.html",
    fieldMeaning: "The enrolled legislation creates a PFAS Wastewater Citizen Protection Committee and PFAS Action Plan process if it becomes law.",
    guardrail: "Do not describe HB2955 as enacted until the official ILGA record shows final action or a Public Act number.",
    action: "Keep this item in a needs-recheck state and update the status only from the official Illinois legislative record.",
  },
  {
    id: "mute-swans",
    bill: "HB5309 · PA 104-0794",
    title: "Mute swan management",
    status: "public-act",
    statusLabel: "Public Act · effective Jan 1, 2028",
    checkedAt: waterWatchCheckedAt,
    effectiveAt: "2028-01-01",
    sourceAuthority: "Illinois General Assembly",
    sourceUrl: "https://ilga.gov/ftp/legislation/104/BillStatus/HTML/10400HB5309.html",
    fieldMeaning: "Illinois changed how mute swans are treated under the Wildlife Code, with the statutory change taking effect in 2028.",
    guardrail: "Species identification and management belong with qualified wildlife authorities. Do not handle, harass, capture, or remove wildlife based on a BaitLogic card.",
    action: "Photograph wildlife only from a safe and legal distance and use IDNR guidance for identification or reporting questions.",
  },
];
