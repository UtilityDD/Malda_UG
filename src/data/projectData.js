// Pure LOA Contract Baseline Data Store for WBSEDCL Malda UG Cable Project (Zero Progress Baseline)

export const PROJECT_INFO = {
  title: "Malda Division UG Cable Project Management Utility",
  subTitle: "Replacement of existing 11kV Overhead Lines with Underground Cables in English Bazar Municipality area along with area attached to KPS 33/11 KV Substation",
  client: "West Bengal State Electricity Distribution Company Limited (WBSEDCL)",
  division: "Malda Division / Malda (D) Region",
  turnkeyAgency: "M/s Tarun Enterprise (Vendor Code: 512589)",
  poNumber: "5301083425",
  poDate: "05-03-2026",
  nitNumber: "09/Departmental (2025)",
  totalPoValue: 311418190.52, // Excl GST
  gstRate: 0.18,
  totalValueWithGst: 367473464.81,
  commencementDate: "15-03-2026",
  targetCompletionDate: "14-03-2027",
  durationMonths: 12
};

// Material Workflow Pipeline Stages Definition
export const LIFECYCLE_STAGES = [
  { id: 1, key: 'gtp', label: '1. GTP & Vendor Approval', icon: '📜', role: 'Agency Submit -> WBSEDCL Approve' },
  { id: 2, key: 'inspection', label: '2. Inspection Offer & Clearance', icon: '🔍', role: 'Agency Offer -> WBSEDCL Inspection' },
  { id: 3, key: 'di', label: '3. Dispatch Instruction (DI)', icon: '🚚', role: 'WBSEDCL Issue DI' },
  { id: 4, key: 'store', label: '4. Store Receipt (SRV)', icon: '📦', role: 'Store Verification' },
  { id: 5, key: 'supplyBill', label: '5. Material Supply Billing', icon: '💳', role: 'Supply RA Bill Payment' },
  { id: 6, key: 'execution', label: '6. Site Execution & Laying', icon: '🚜', role: 'Field Execution' },
  { id: 7, key: 'erectionBill', label: '7. Erection Bill (JMS)', icon: '📝', role: 'JMS Verification & Release' }
];

// Complete 36 Line Items from LOA BOQ (SOW Malda UG.xlsx) - Pure Baseline (0 Executed, 0 Store)
export const BOQ_ITEMS = [
  // PART-A: MATERIAL PART
  {
    slNo: 1,
    part: "Part-A (Material)",
    category: "SCADA RMU",
    description: "Supply & delivery of SCADA RMU, 11 KV outdoor non-extensible 3-way (2 LBS +1 OG) for 630KVA DTR",
    unit: "SET",
    rate: 809667.85,
    loaQty: 12,
    revisedQty: 12,
    totalAmount: 9716014.20,
    pipeline: {
      gtp: { status: "Pending Submission", subDate: "-", apprDate: "-", vendor: "Pending Vendor", docRef: "-" },
      inspection: { status: "Not Offered", offerDate: "-", offerQty: 0, inspDate: "-", callReport: "-" },
      di: { status: "Not Issued", diNo: "-", diDate: "-", diQty: 0 },
      store: { status: "Not Received", srvNo: "-", srvDate: "-", storeQty: 0 },
      supplyBill: { status: "Unbilled", billNo: "-", claimQty: 0, amount: 0, payStatus: "Unbilled" },
      execution: { executedQty: 0, unit: "SET" },
      erectionBill: { status: "Unbilled", jmsQty: 0, billNo: "-", payStatus: "Unbilled" }
    }
  },
  {
    slNo: 2,
    part: "Part-A (Material)",
    category: "SCADA RMU",
    description: "Supply & delivery of SCADA RMU, 11 KV outdoor non-extensible 4-way (2 LBS +2 OG) for 630KVA DTR",
    unit: "SET",
    rate: 881751.80,
    loaQty: 18,
    revisedQty: 18,
    totalAmount: 15871532.40,
    pipeline: {
      gtp: { status: "Pending Submission", subDate: "-", apprDate: "-", vendor: "Pending Vendor", docRef: "-" },
      inspection: { status: "Not Offered", offerDate: "-", offerQty: 0, inspDate: "-", callReport: "-" },
      di: { status: "Not Issued", diNo: "-", diDate: "-", diQty: 0 },
      store: { status: "Not Received", srvNo: "-", srvDate: "-", storeQty: 0 },
      supplyBill: { status: "Unbilled", billNo: "-", claimQty: 0, amount: 0, payStatus: "Unbilled" },
      execution: { executedQty: 0, unit: "SET" },
      erectionBill: { status: "Unbilled", jmsQty: 0, billNo: "-", payStatus: "Unbilled" }
    }
  },
  {
    slNo: 3,
    part: "Part-A (Material)",
    category: "Cables",
    description: "Supply & delivery of 11 KV Grade 3 x 400 sq.mm XLPE Cable",
    unit: "KM",
    rate: 2151847.64,
    loaQty: 40.705,
    revisedQty: 40.705,
    totalAmount: 87590958.19,
    pipeline: {
      gtp: { status: "Pending Submission", subDate: "-", apprDate: "-", vendor: "Pending Vendor", docRef: "-" },
      inspection: { status: "Not Offered", offerDate: "-", offerQty: 0, inspDate: "-", callReport: "-" },
      di: { status: "Not Issued", diNo: "-", diDate: "-", diQty: 0 },
      store: { status: "Not Received", srvNo: "-", srvDate: "-", storeQty: 0 },
      supplyBill: { status: "Unbilled", billNo: "-", claimQty: 0, amount: 0, payStatus: "Unbilled" },
      execution: { executedQty: 0, unit: "KM" },
      erectionBill: { status: "Unbilled", jmsQty: 0, billNo: "-", payStatus: "Unbilled" }
    }
  },
  {
    slNo: 4,
    part: "Part-A (Material)",
    category: "Cables",
    description: "Supply & delivery of 11 KV Grade 3 x 185 sq.mm XLPE Cable",
    unit: "KM",
    rate: 1213366.16,
    loaQty: 63.750,
    revisedQty: 63.750,
    totalAmount: 77352092.70,
    pipeline: {
      gtp: { status: "Pending Submission", subDate: "-", apprDate: "-", vendor: "Pending Vendor", docRef: "-" },
      inspection: { status: "Not Offered", offerDate: "-", offerQty: 0, inspDate: "-", callReport: "-" },
      di: { status: "Not Issued", diNo: "-", diDate: "-", diQty: 0 },
      store: { status: "Not Received", srvNo: "-", srvDate: "-", storeQty: 0 },
      supplyBill: { status: "Unbilled", billNo: "-", claimQty: 0, amount: 0, payStatus: "Unbilled" },
      execution: { executedQty: 0, unit: "KM" },
      erectionBill: { status: "Unbilled", jmsQty: 0, billNo: "-", payStatus: "Unbilled" }
    }
  },
  {
    slNo: 5,
    part: "Part-A (Material)",
    category: "Jointing Kits",
    description: "Supply & delivery of Indoor type Heat shrinkable end Termination Jointing kit for 11 KV, 3C x 400 sq.mm",
    unit: "NOS",
    rate: 7403.76,
    loaQty: 71,
    revisedQty: 71,
    totalAmount: 525666.96,
    pipeline: {
      gtp: { status: "Pending Submission", vendor: "-" },
      inspection: { status: "Not Offered", offerQty: 0 },
      di: { status: "Not Issued", diNo: "-" },
      store: { status: "Not Received", storeQty: 0, srvNo: "-" },
      supplyBill: { status: "Unbilled", billNo: "-" },
      execution: { executedQty: 0, unit: "NOS" },
      erectionBill: { status: "Unbilled", payStatus: "Unbilled" }
    }
  },
  {
    slNo: 6,
    part: "Part-A (Material)",
    category: "Jointing Kits",
    description: "Supply & delivery of Outdoor type Heat shrinkable end Termination Jointing kit for 11 KV, 3C x 400 sq.mm",
    unit: "NOS",
    rate: 8884.52,
    loaQty: 22,
    revisedQty: 22,
    totalAmount: 195459.44,
    pipeline: {
      gtp: { status: "Pending Submission", vendor: "-" },
      inspection: { status: "Not Offered", offerQty: 0 },
      di: { status: "Not Issued", diNo: "-" },
      store: { status: "Not Received", storeQty: 0, srvNo: "-" },
      supplyBill: { status: "Unbilled", billNo: "-" },
      execution: { executedQty: 0, unit: "NOS" },
      erectionBill: { status: "Unbilled", payStatus: "Unbilled" }
    }
  },
  {
    slNo: 7,
    part: "Part-A (Material)",
    category: "Jointing Kits",
    description: "Supply & delivery of Heat shrinkable Straight Through Jointing kit for 11 KV, 3C x 400sq.mm",
    unit: "NOS",
    rate: 17551.25,
    loaQty: 159,
    revisedQty: 159,
    totalAmount: 2790648.75,
    pipeline: {
      gtp: { status: "Pending Submission", vendor: "-" },
      inspection: { status: "Not Offered", offerQty: 0 },
      di: { status: "Not Issued", diNo: "-" },
      store: { status: "Not Received", storeQty: 0, srvNo: "-" },
      supplyBill: { status: "Unbilled", billNo: "-" },
      execution: { executedQty: 0, unit: "NOS" },
      erectionBill: { status: "Unbilled", payStatus: "Unbilled" }
    }
  },
  {
    slNo: 8,
    part: "Part-A (Material)",
    category: "Jointing Kits",
    description: "Supply & delivery of Outdoor type Heat shrinkable end Termination Jointing kit for 11 KV, 3C x 185 sq.mm",
    unit: "NOS",
    rate: 8061.74,
    loaQty: 480,
    revisedQty: 480,
    totalAmount: 3869635.20,
    pipeline: {
      gtp: { status: "Pending Submission", vendor: "-" },
      inspection: { status: "Not Offered", offerQty: 0 },
      di: { status: "Not Issued", diNo: "-" },
      store: { status: "Not Received", storeQty: 0, srvNo: "-" },
      supplyBill: { status: "Unbilled", billNo: "-" },
      execution: { executedQty: 0, unit: "NOS" },
      erectionBill: { status: "Unbilled", payStatus: "Unbilled" }
    }
  },
  {
    slNo: 9,
    part: "Part-A (Material)",
    category: "Jointing Kits",
    description: "Supply & delivery of Indoor type Heat shrinkable end Termination Jointing kit for 11 KV, 3C x 185 sq.mm",
    unit: "NOS",
    rate: 5758.81,
    loaQty: 47,
    revisedQty: 47,
    totalAmount: 270664.07,
    pipeline: {
      gtp: { status: "Pending Submission", vendor: "-" },
      inspection: { status: "Not Offered", offerQty: 0 },
      di: { status: "Not Issued", diNo: "-" },
      store: { status: "Not Received", storeQty: 0, srvNo: "-" },
      supplyBill: { status: "Unbilled", billNo: "-" },
      execution: { executedQty: 0, unit: "NOS" },
      erectionBill: { status: "Unbilled", payStatus: "Unbilled" }
    }
  },
  {
    slNo: 10,
    part: "Part-A (Material)",
    category: "Jointing Kits",
    description: "Supply & delivery of Heat shrinkable Straight Through Jointing kit for 11 KV, 3C x 185 sq.mm",
    unit: "NOS",
    rate: 16076.46,
    loaQty: 20,
    revisedQty: 20,
    totalAmount: 321529.20,
    pipeline: {
      gtp: { status: "Pending Submission", vendor: "-" },
      inspection: { status: "Not Offered", offerQty: 0 },
      di: { status: "Not Issued", diNo: "-" },
      store: { status: "Not Received", storeQty: 0, srvNo: "-" },
      supplyBill: { status: "Unbilled", billNo: "-" },
      execution: { executedQty: 0, unit: "NOS" },
      erectionBill: { status: "Unbilled", payStatus: "Unbilled" }
    }
  },
  {
    slNo: 11,
    part: "Part-A (Material)",
    category: "Hardware",
    description: "Supply & delivery of 11 kV Polymer PIN Insulator",
    unit: "NOS",
    rate: 240.66,
    loaQty: 2880,
    revisedQty: 2880,
    totalAmount: 693100.80,
    pipeline: {
      gtp: { status: "Pending Submission", vendor: "-" },
      inspection: { status: "Not Offered", offerQty: 0 },
      di: { status: "Not Issued", diNo: "-" },
      store: { status: "Not Received", storeQty: 0, srvNo: "-" },
      supplyBill: { status: "Unbilled", billNo: "-" },
      execution: { executedQty: 0, unit: "NOS" },
      erectionBill: { status: "Unbilled", payStatus: "Unbilled" }
    }
  },
  {
    slNo: 12,
    part: "Part-A (Material)",
    category: "Hardware",
    description: "Supply & delivery of MS Channel (75X40 MM)",
    unit: "MT",
    rate: 108631.05,
    loaQty: 20.563,
    revisedQty: 20.563,
    totalAmount: 2233780.28,
    pipeline: {
      gtp: { status: "Pending Submission", vendor: "-" },
      inspection: { status: "Not Offered", offerQty: 0 },
      di: { status: "Not Issued", diNo: "-" },
      store: { status: "Not Received", storeQty: 0, srvNo: "-" },
      supplyBill: { status: "Unbilled", billNo: "-" },
      execution: { executedQty: 0, unit: "MT" },
      erectionBill: { status: "Unbilled", payStatus: "Unbilled" }
    }
  },
  {
    slNo: 13,
    part: "Part-A (Material)",
    category: "Hardware",
    description: "Supply & delivery of MS Flat (65X6 MM)",
    unit: "MT",
    rate: 115986.09,
    loaQty: 3.571,
    revisedQty: 3.571,
    totalAmount: 414186.33,
    pipeline: {
      gtp: { status: "Pending Submission", vendor: "-" },
      inspection: { status: "Not Offered", offerQty: 0 },
      di: { status: "Not Issued", diNo: "-" },
      store: { status: "Not Received", storeQty: 0, srvNo: "-" },
      supplyBill: { status: "Unbilled", billNo: "-" },
      execution: { executedQty: 0, unit: "MT" },
      erectionBill: { status: "Unbilled", payStatus: "Unbilled" }
    }
  },
  {
    slNo: 14,
    part: "Part-A (Material)",
    category: "Hardware",
    description: "Supply & delivery of MS Flat (65X6 MM Clamps/Sets)",
    unit: "NOS",
    rate: 363.26,
    loaQty: 480,
    revisedQty: 480,
    totalAmount: 174364.80,
    pipeline: {
      gtp: { status: "Pending Submission", vendor: "-" },
      inspection: { status: "Not Offered", offerQty: 0 },
      di: { status: "Not Issued", diNo: "-" },
      store: { status: "Not Received", storeQty: 0, srvNo: "-" },
      supplyBill: { status: "Unbilled", billNo: "-" },
      execution: { executedQty: 0, unit: "NOS" },
      erectionBill: { status: "Unbilled", payStatus: "Unbilled" }
    }
  },
  {
    slNo: 15,
    part: "Part-A (Material)",
    category: "Hardware",
    description: "Supply & delivery of GI Wire (5mm Wire)",
    unit: "MT",
    rate: 135109.75,
    loaQty: 1.680,
    revisedQty: 1.680,
    totalAmount: 226984.38,
    pipeline: {
      gtp: { status: "Pending Submission", vendor: "-" },
      inspection: { status: "Not Offered", offerQty: 0 },
      di: { status: "Not Issued", diNo: "-" },
      store: { status: "Not Received", storeQty: 0, srvNo: "-" },
      supplyBill: { status: "Unbilled", billNo: "-" },
      execution: { executedQty: 0, unit: "MT" },
      erectionBill: { status: "Unbilled", payStatus: "Unbilled" }
    }
  },

  // PART-B: ERECTION PART
  {
    slNo: 16,
    part: "Part-B (Erection)",
    category: "Survey & HDD",
    description: "Survey of HT cable route",
    unit: "M",
    rate: 2.86,
    loaQty: 102960,
    revisedQty: 102960,
    totalAmount: 294465.60,
    pipeline: {
      execution: { executedQty: 0, unit: "M" },
      erectionBill: { status: "Unbilled", jmsQty: 0, billNo: "-", payStatus: "Unbilled" }
    }
  },
  {
    slNo: 17,
    part: "Part-B (Erection)",
    category: "Cable Laying",
    description: "Laying and dressing of 11kV 3C 400SQMM XLPE cable",
    unit: "M",
    rate: 65.50,
    loaQty: 40705,
    revisedQty: 40705,
    totalAmount: 2666177.50,
    pipeline: {
      execution: { executedQty: 0, unit: "M" },
      erectionBill: { status: "Unbilled", jmsQty: 0, billNo: "-", payStatus: "Unbilled" }
    }
  },
  {
    slNo: 18,
    part: "Part-B (Erection)",
    category: "Cable Laying",
    description: "Laying and dressing of 11kV 3C 185SQMM XLPE cable",
    unit: "M",
    rate: 54.94,
    loaQty: 63750,
    revisedQty: 63750,
    totalAmount: 3502425.00,
    pipeline: {
      execution: { executedQty: 0, unit: "M" },
      erectionBill: { status: "Unbilled", jmsQty: 0, billNo: "-", payStatus: "Unbilled" }
    }
  },
  {
    slNo: 19,
    part: "Part-B (Erection)",
    category: "Jointing Execution",
    description: "Making of indoor and outdoor end termination joint in 11kV 3C 400SQMM XLPE cable",
    unit: "NOS",
    rate: 2137.41,
    loaQty: 93,
    revisedQty: 93,
    totalAmount: 198779.13,
    pipeline: {
      execution: { executedQty: 0, unit: "NOS" },
      erectionBill: { status: "Unbilled", jmsQty: 0, billNo: "-", payStatus: "Unbilled" }
    }
  },
  {
    slNo: 20,
    part: "Part-B (Erection)",
    category: "Jointing Execution",
    description: "Making of straight through joint in 11kV 3C 400SQMM XLPE cable",
    unit: "NOS",
    rate: 2271.61,
    loaQty: 159,
    revisedQty: 159,
    totalAmount: 361185.99,
    pipeline: {
      execution: { executedQty: 0, unit: "NOS" },
      erectionBill: { status: "Unbilled", jmsQty: 0, billNo: "-", payStatus: "Unbilled" }
    }
  },
  {
    slNo: 21,
    part: "Part-B (Erection)",
    category: "Jointing Execution",
    description: "Making of indoor and outdoor end termination joint in 11kV 3C 185SQMM XLPE cable",
    unit: "NOS",
    rate: 1780.30,
    loaQty: 527,
    revisedQty: 527,
    totalAmount: 938218.10,
    pipeline: {
      execution: { executedQty: 0, unit: "NOS" },
      erectionBill: { status: "Unbilled", jmsQty: 0, billNo: "-", payStatus: "Unbilled" }
    }
  },
  {
    slNo: 22,
    part: "Part-B (Erection)",
    category: "Jointing Execution",
    description: "Making of straight through joint in 11kV 3C 185SQMM XLPE cable",
    unit: "NOS",
    rate: 2152.21,
    loaQty: 20,
    revisedQty: 20,
    totalAmount: 43044.20,
    pipeline: {
      execution: { executedQty: 0, unit: "NOS" },
      erectionBill: { status: "Unbilled", jmsQty: 0, billNo: "-", payStatus: "Unbilled" }
    }
  },
  {
    slNo: 23,
    part: "Part-B (Erection)",
    category: "Protection",
    description: "Making protective duct for cable joint",
    unit: "NOS",
    rate: 9499.54,
    loaQty: 179,
    revisedQty: 179,
    totalAmount: 1700417.66,
    pipeline: {
      execution: { executedQty: 0, unit: "NOS" },
      erectionBill: { status: "Unbilled", jmsQty: 0, billNo: "-", payStatus: "Unbilled" }
    }
  },
  {
    slNo: 24,
    part: "Part-B (Erection)",
    category: "Protection",
    description: "Supply and erection of cast iron cable marker to identify UG cable location",
    unit: "NOS",
    rate: 316.97,
    loaQty: 808,
    revisedQty: 808,
    totalAmount: 256111.76,
    pipeline: {
      execution: { executedQty: 0, unit: "NOS" },
      erectionBill: { status: "Unbilled", jmsQty: 0, billNo: "-", payStatus: "Unbilled" }
    }
  },
  {
    slNo: 25,
    part: "Part-B (Erection)",
    category: "Protection",
    description: "Supply and fixing of GI Pipe (100 MM Dia) for cable protection purpose",
    unit: "M",
    rate: 820.95,
    loaQty: 2059,
    revisedQty: 2059,
    totalAmount: 1690336.05,
    pipeline: {
      execution: { executedQty: 0, unit: "M" },
      erectionBill: { status: "Unbilled", jmsQty: 0, billNo: "-", payStatus: "Unbilled" }
    }
  },
  {
    slNo: 26,
    part: "Part-B (Erection)",
    category: "Survey & HDD",
    description: "Microtunneling work with laying of HDPE pipe (160 MM Dia, PE-80, PN-6) along with pipe supply",
    unit: "M",
    rate: 1677.81,
    loaQty: 40285,
    revisedQty: 40285,
    totalAmount: 67590575.85,
    pipeline: {
      gtp: { status: "Pending Submission", vendor: "-" },
      inspection: { status: "Not Offered", offerQty: 0 },
      di: { status: "Not Issued", diNo: "-" },
      store: { status: "Not Received", storeQty: 0 },
      execution: { executedQty: 0, unit: "M" },
      erectionBill: { status: "Unbilled", jmsQty: 0, billNo: "-", payStatus: "Unbilled" }
    }
  },
  {
    slNo: 27,
    part: "Part-B (Erection)",
    category: "Survey & HDD",
    description: "Microtunneling work with laying of HDPE pipe (110 MM Dia, PE-80, PN-6) along with pipe supply",
    unit: "M",
    rate: 1179.12,
    loaQty: 22559,
    revisedQty: 22559,
    totalAmount: 26599768.08,
    pipeline: {
      gtp: { status: "Pending Submission", vendor: "-" },
      inspection: { status: "Not Offered", offerQty: 0 },
      di: { status: "Not Issued", diNo: "-" },
      store: { status: "Not Received", storeQty: 0 },
      execution: { executedQty: 0, unit: "M" },
      erectionBill: { status: "Unbilled", jmsQty: 0, billNo: "-", payStatus: "Unbilled" }
    }
  },
  {
    slNo: 28,
    part: "Part-B (Erection)",
    category: "Civil & Trench",
    description: "Excavation of soil for formation of cable trench for laying of 11kV 3C 185SQMM XLPE cable",
    unit: "CUM",
    rate: 21.13,
    loaQty: 35580,
    revisedQty: 35580,
    totalAmount: 751805.40,
    pipeline: {
      execution: { executedQty: 0, unit: "CUM" },
      erectionBill: { status: "Unbilled", jmsQty: 0, billNo: "-", payStatus: "Unbilled" }
    }
  },
  {
    slNo: 29,
    part: "Part-B (Erection)",
    category: "Civil & Trench",
    description: "Excavation of soil for formation of cable round and re-instatement of the same",
    unit: "CUM",
    rate: 21.13,
    loaQty: 2545.66,
    revisedQty: 2545.66,
    totalAmount: 53789.80,
    pipeline: {
      execution: { executedQty: 0, unit: "CUM" },
      erectionBill: { status: "Unbilled", jmsQty: 0, billNo: "-", payStatus: "Unbilled" }
    }
  },
  {
    slNo: 30,
    part: "Part-B (Erection)",
    category: "Civil & Trench",
    description: "Supply and laying of 1st class kiln burnt bricks",
    unit: "NOS",
    rate: 8.99,
    loaQty: 99246,
    revisedQty: 99246,
    totalAmount: 892221.54,
    pipeline: {
      gtp: { status: "Pending Submission", vendor: "-" },
      inspection: { status: "Not Offered", offerQty: 0 },
      di: { status: "Not Issued", diNo: "-" },
      store: { status: "Not Received", storeQty: 0 },
      execution: { executedQty: 0, unit: "NOS" },
      erectionBill: { status: "Unbilled", jmsQty: 0, billNo: "-", payStatus: "Unbilled" }
    }
  },
  {
    slNo: 31,
    part: "Part-B (Erection)",
    category: "Civil & RMU Foundation",
    description: "Making of RCC foundation for installation of outdoor 11 kV 3 way & 4 way RMU",
    unit: "NOS",
    rate: 25426.14,
    loaQty: 30,
    revisedQty: 30,
    totalAmount: 762784.20,
    pipeline: {
      gtp: { status: "Pending Submission", vendor: "-" },
      execution: { executedQty: 0, unit: "NOS" },
      erectionBill: { status: "Unbilled", jmsQty: 0, billNo: "-", payStatus: "Unbilled" }
    }
  },
  {
    slNo: 32,
    part: "Part-B (Erection)",
    category: "RMU Erection",
    description: "Erection of outdoor 11 kV 3 Way RMU",
    unit: "SET",
    rate: 10340.55,
    loaQty: 12,
    revisedQty: 12,
    totalAmount: 124086.60,
    pipeline: {
      execution: { executedQty: 0, unit: "SET" },
      erectionBill: { status: "Unbilled", jmsQty: 0, billNo: "-", payStatus: "Unbilled" }
    }
  },
  {
    slNo: 33,
    part: "Part-B (Erection)",
    category: "RMU Erection",
    description: "Erection of outdoor 11 kV 4 Way RMU",
    unit: "SET",
    rate: 13071.77,
    loaQty: 18,
    revisedQty: 18,
    totalAmount: 235291.86,
    pipeline: {
      execution: { executedQty: 0, unit: "SET" },
      erectionBill: { status: "Unbilled", jmsQty: 0, billNo: "-", payStatus: "Unbilled" }
    }
  },
  {
    slNo: 34,
    part: "Part-B (Erection)",
    category: "Earthing",
    description: "Earthing of outdoor 11 kV 3 Way & 4 Way RMU along with supply of earthing materials (GI pipe & flat)",
    unit: "NOS",
    rate: 5322.95,
    loaQty: 30,
    revisedQty: 30,
    totalAmount: 159688.50,
    pipeline: {
      gtp: { status: "Pending Submission", vendor: "-" },
      execution: { executedQty: 0, unit: "NOS" },
      erectionBill: { status: "Unbilled", jmsQty: 0, billNo: "-", payStatus: "Unbilled" }
    }
  },
  {
    slNo: 35,
    part: "Part-B (Erection)",
    category: "Earthing",
    description: "Fixing of 11 kV PIN Insulator",
    unit: "NOS",
    rate: 66.55,
    loaQty: 2880,
    revisedQty: 2880,
    totalAmount: 191664.00,
    pipeline: {
      execution: { executedQty: 0, unit: "NOS" },
      erectionBill: { status: "Unbilled", jmsQty: 0, billNo: "-", payStatus: "Unbilled" }
    }
  },
  {
    slNo: 36,
    part: "Part-B (Erection)",
    category: "Earthing",
    description: "Earthing complete for distribution poles/structures",
    unit: "NOS",
    rate: 480,
    loaQty: 480,
    revisedQty: 480,
    totalAmount: 158736.00,
    pipeline: {
      execution: { executedQty: 0, unit: "NOS" },
      erectionBill: { status: "Unbilled", jmsQty: 0, billNo: "-", payStatus: "Unbilled" }
    }
  }
];

// Initial Empty Work Logs, Inspection Offers, DIs, and RA Bills (Pristine 0% Baseline)
export const INITIAL_DAILY_LOGS = [];
export const INSPECTION_OFFERS = [];
export const DISPATCH_INSTRUCTIONS = [];
export const INITIAL_HINDRANCES = [];
export const RA_BILLS = [];

export const INITIAL_GANTT_TASKS = [
  // SECTION 1: MATERIAL DELIVERY LIFECYCLE
  {
    id: "GANTT-01",
    section: "Material Delivery",
    name: "1.1 GTP & Vendor Approval (Cables & RMUs)",
    predecessor: "None (Project Kickoff)",
    plannedStart: "2026-03-15",
    plannedEnd: "2026-04-15",
    actualStart: "2026-03-15",
    actualEnd: "-",
    progressPct: 0,
    status: "On Schedule"
  },
  {
    id: "GANTT-02",
    section: "Material Delivery",
    name: "1.2 Inspection Offer & Clearance",
    predecessor: "GANTT-01 (GTP Approval)",
    plannedStart: "2026-04-10",
    plannedEnd: "2026-05-15",
    actualStart: "-",
    actualEnd: "-",
    progressPct: 0,
    status: "Pending GTP"
  },
  {
    id: "GANTT-03",
    section: "Material Delivery",
    name: "1.3 Dispatch Instruction (DI) Issuance",
    predecessor: "GANTT-02 (Inspection Clearance)",
    plannedStart: "2026-05-10",
    plannedEnd: "2026-06-01",
    actualStart: "-",
    actualEnd: "-",
    progressPct: 0,
    status: "Pending Inspection"
  },
  {
    id: "GANTT-04",
    section: "Material Delivery",
    name: "1.4 Store Receipt (SRV) at Malda Division Store",
    predecessor: "GANTT-03 (DI Issuance)",
    plannedStart: "2026-05-20",
    plannedEnd: "2026-06-15",
    actualStart: "-",
    actualEnd: "-",
    progressPct: 0,
    status: "Pending Dispatch"
  },
  
  // SECTION 2: PHYSICAL SITE EXECUTION
  {
    id: "GANTT-05",
    section: "Site Execution",
    name: "2.1 Pre-Execution Route Survey & Trench Marking",
    predecessor: "None (Kickoff)",
    plannedStart: "2026-03-20",
    plannedEnd: "2026-04-20",
    actualStart: "2026-03-20",
    actualEnd: "-",
    progressPct: 0,
    status: "In Progress"
  },
  {
    id: "GANTT-06",
    section: "Site Execution",
    name: "2.2 Microtunneling HDD (160mm & 110mm HDPE)",
    predecessor: "GANTT-05 (Route Survey)",
    plannedStart: "2026-04-25",
    plannedEnd: "2026-08-30",
    actualStart: "-",
    actualEnd: "-",
    progressPct: 0,
    status: "Scheduled"
  },
  {
    id: "GANTT-07",
    section: "Site Execution",
    name: "2.3 11kV XLPE Cable Laying (400 & 185 sqmm)",
    predecessor: "GANTT-04 (Store Receipt) & GANTT-06 (HDD)",
    plannedStart: "2026-06-01",
    plannedEnd: "2026-11-15",
    actualStart: "-",
    actualEnd: "-",
    progressPct: 0,
    status: "Pending Material & HDD"
  },
  {
    id: "GANTT-08",
    section: "Site Execution",
    name: "2.4 SCADA RMU RCC Foundations & Erection",
    predecessor: "GANTT-04 (Store Receipt) & GANTT-05 (Survey)",
    plannedStart: "2026-07-15",
    plannedEnd: "2026-12-20",
    actualStart: "-",
    actualEnd: "-",
    progressPct: 0,
    status: "Pending Store Arrival"
  },
  {
    id: "GANTT-09",
    section: "Site Execution",
    name: "2.5 Heat-Shrink Cable Jointing & Terminations",
    predecessor: "GANTT-07 (Cable Laying) & GANTT-08 (RMU Erection)",
    plannedStart: "2026-08-01",
    plannedEnd: "2027-01-15",
    actualStart: "-",
    actualEnd: "-",
    progressPct: 0,
    status: "Pending Cable Laying"
  },
  {
    id: "GANTT-10",
    section: "Site Execution",
    name: "2.6 Pre-Commissioning Megger, HV & Earthing Test",
    predecessor: "GANTT-09 (Jointing & Terminations)",
    plannedStart: "2026-12-01",
    plannedEnd: "2027-02-28",
    actualStart: "-",
    actualEnd: "-",
    progressPct: 0,
    status: "Scheduled"
  },
  {
    id: "GANTT-11",
    section: "Site Execution",
    name: "2.7 Final Handover, Charging & JMS Clearance",
    predecessor: "GANTT-10 (Testing & Trial)",
    plannedStart: "2027-02-15",
    plannedEnd: "2027-03-14",
    actualStart: "-",
    actualEnd: "-",
    progressPct: 0,
    status: "Scheduled"
  }
];
