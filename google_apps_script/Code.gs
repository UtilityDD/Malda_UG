/**
 * ==============================================================================
 * WBSEDCL MALDA DIVISION UG CABLE PROJECT MANAGEMENT UTILITY
 * GOOGLE APPS SCRIPT (PRISTINE LOA BASELINE SETUP & API)
 * ==============================================================================
 * Project: Replacement of Overhead 11kV Lines with UG Cables in English Bazar
 * PO Number: 5301083425 Dated 05.03.2026
 * Turnkey Contractor: M/s Tarun Enterprise
 * ==============================================================================
 */

// Complete 36 Line Items from LOA BOQ (SOW Malda UG.xlsx & PO 5301083425) - Pure LOA Baseline (0 Executed, 0 Store)
var LOA_MASTER_BOQ_DATA = [
  [1, "Part-A (Material)", "SCADA RMU", "Supply & delivery of SCADA RMU, 11 KV outdoor non-extensible 3-way (2 LBS +1 OG) for 630KVA DTR", 12, 12, "SET", 809667.85, 9716014.20, 0, 0, "=J2/F2*100"],
  [2, "Part-A (Material)", "SCADA RMU", "Supply & delivery of SCADA RMU, 11 KV outdoor non-extensible 4-way (2 LBS +2 OG) for 630KVA DTR", 18, 18, "SET", 881751.80, 15871532.40, 0, 0, "=J3/F3*100"],
  [3, "Part-A (Material)", "Cables", "Supply & delivery of 11 KV Grade 3 x 400 sq.mm XLPE Cable", 40.705, 40.705, "KM", 2151847.64, 87590958.19, 0, 0, "=J4/F4*100"],
  [4, "Part-A (Material)", "Cables", "Supply & delivery of 11 KV Grade 3 x 185 sq.mm XLPE Cable", 63.750, 63.750, "KM", 1213366.16, 77352092.70, 0, 0, "=J5/F5*100"],
  [5, "Part-A (Material)", "Jointing Kits", "Supply & delivery of Indoor type Heat shrinkable end Termination Jointing kit for 11 KV, 3C x 400 sq.mm", 71, 71, "NOS", 7403.76, 525666.96, 0, 0, "=J6/F6*100"],
  [6, "Part-A (Material)", "Jointing Kits", "Supply & delivery of Outdoor type Heat shrinkable end Termination Jointing kit for 11 KV, 3C x 400 sq.mm", 22, 22, "NOS", 8884.52, 195459.44, 0, 0, "=J7/F7*100"],
  [7, "Part-A (Material)", "Jointing Kits", "Supply & delivery of Heat shrinkable Straight Through Jointing kit for 11 KV, 3C x 400sq.mm", 159, 159, "NOS", 17551.25, 2790648.75, 0, 0, "=J8/F8*100"],
  [8, "Part-A (Material)", "Jointing Kits", "Supply & delivery of Outdoor type Heat shrinkable end Termination Jointing kit for 11 KV, 3C x 185 sq.mm", 480, 480, "NOS", 8061.74, 3869635.20, 0, 0, "=J9/F9*100"],
  [9, "Part-A (Material)", "Jointing Kits", "Supply & delivery of Indoor type Heat shrinkable end Termination Jointing kit for 11 KV, 3C x 185 sq.mm", 47, 47, "NOS", 5758.81, 270664.07, 0, 0, "=J10/F10*100"],
  [10, "Part-A (Material)", "Jointing Kits", "Supply & delivery of Heat shrinkable Straight Through Jointing kit for 11 KV, 3C x 185 sq.mm", 20, 20, "NOS", 16076.46, 321529.20, 0, 0, "=J11/F11*100"],
  [11, "Part-A (Material)", "Hardware", "Supply & delivery of 11 kV Polymer PIN Insulator", 2880, 2880, "NOS", 240.66, 693100.80, 0, 0, "=J12/F12*100"],
  [12, "Part-A (Material)", "Hardware", "Supply & delivery of MS Channel (75X40 MM)", 20.563, 20.563, "MT", 108631.05, 2233780.28, 0, 0, "=J13/F13*100"],
  [13, "Part-A (Material)", "Hardware", "Supply & delivery of MS Flat (65X6 MM)", 3.571, 3.571, "MT", 115986.09, 414186.33, 0, 0, "=J14/F14*100"],
  [14, "Part-A (Material)", "Hardware", "Supply & delivery of MS Flat (65X6 MM Clamps/Sets)", 480, 480, "NOS", 363.26, 174364.80, 0, 0, "=J15/F15*100"],
  [15, "Part-A (Material)", "Hardware", "Supply & delivery of GI Wire (5mm Wire)", 1.68, 1.68, "MT", 135109.75, 226984.38, 0, 0, "=J16/F16*100"],
  [16, "Part-B (Erection)", "Survey & HDD", "Survey of HT cable route", 102960, 102960, "M", 2.86, 294465.60, 0, 0, "=J17/F17*100"],
  [17, "Part-B (Erection)", "Cable Laying", "Laying and dressing of 11kV 3C 400SQMM XLPE cable", 40705, 40705, "M", 65.50, 2666177.50, 0, 0, "=J18/F18*100"],
  [18, "Part-B (Erection)", "Cable Laying", "Laying and dressing of 11kV 3C 185SQMM XLPE cable", 63750, 63750, "M", 54.94, 3502425.00, 0, 0, "=J19/F19*100"],
  [19, "Part-B (Erection)", "Jointing Execution", "Making of indoor and outdoor end termination joint in 11kV 3C 400SQMM XLPE cable", 93, 93, "NOS", 2137.41, 198779.13, 0, 0, "=J20/F20*100"],
  [20, "Part-B (Erection)", "Jointing Execution", "Making of straight through joint in 11kV 3C 400SQMM XLPE cable", 159, 159, "NOS", 2271.61, 361185.99, 0, 0, "=J21/F21*100"],
  [21, "Part-B (Erection)", "Jointing Execution", "Making of indoor and outdoor end termination joint in 11kV 3C 185SQMM XLPE cable", 527, 527, "NOS", 1780.30, 938218.10, 0, 0, "=J22/F22*100"],
  [22, "Part-B (Erection)", "Jointing Execution", "Making of straight through joint in 11kV 3C 185SQMM XLPE cable", 20, 20, "NOS", 2152.21, 43044.20, 0, 0, "=J23/F23*100"],
  [23, "Part-B (Erection)", "Protection", "Making protective duct for cable joint", 179, 179, "NOS", 9499.54, 1700417.66, 0, 0, "=J24/F24*100"],
  [24, "Part-B (Erection)", "Protection", "Supply and erection of cast iron cable marker to identify UG cable location", 808, 808, "NOS", 316.97, 256111.76, 0, 0, "=J25/F25*100"],
  [25, "Part-B (Erection)", "Protection", "Supply and fixing of GI Pipe (100 MM Dia) for cable protection purpose", 2059, 2059, "M", 820.95, 1690336.05, 0, 0, "=J26/F26*100"],
  [26, "Part-B (Erection)", "Survey & HDD", "Microtunneling work with laying of HDPE pipe (160 MM Dia, PE-80, PN-6) along with pipe supply", 40285, 40285, "M", 1677.81, 67590575.85, 0, 0, "=J27/F27*100"],
  [27, "Part-B (Erection)", "Survey & HDD", "Microtunneling work with laying of HDPE pipe (110 MM Dia, PE-80, PN-6) along with pipe supply", 22559, 22559, "M", 1179.12, 26599768.08, 0, 0, "=J28/F28*100"],
  [28, "Part-B (Erection)", "Civil & Trench", "Excavation of soil for formation of cable trench for laying of 11kV 3C 185SQMM XLPE cable", 35580, 35580, "CUM", 21.13, 751805.40, 0, 0, "=J29/F29*100"],
  [29, "Part-B (Erection)", "Civil & Trench", "Excavation of soil for formation of cable round and re-instatement of the same", 2545.66, 2545.66, "CUM", 21.13, 53789.80, 0, 0, "=J30/F30*100"],
  [30, "Part-B (Erection)", "Civil & Trench", "Supply and laying of 1st class kiln burnt bricks", 99246, 99246, "NOS", 8.99, 892221.54, 0, 0, "=J31/F31*100"],
  [31, "Part-B (Erection)", "Civil & RMU Foundation", "Making of RCC foundation for installation of outdoor 11 kV 3 way & 4 way RMU", 30, 30, "NOS", 25426.14, 762784.20, 0, 0, "=J32/F32*100"],
  [32, "Part-B (Erection)", "RMU Erection", "Erection of outdoor 11 kV 3 Way RMU", 12, 12, "SET", 10340.55, 124086.60, 0, 0, "=J33/F33*100"],
  [33, "Part-B (Erection)", "RMU Erection", "Erection of outdoor 11 kV 4 Way RMU", 18, 18, "SET", 13071.77, 235291.86, 0, 0, "=J34/F34*100"],
  [34, "Part-B (Erection)", "Earthing", "Earthing of outdoor 11 kV 3 Way & 4 Way RMU along with supply of earthing materials (GI pipe & flat)", 30, 30, "NOS", 5322.95, 159688.50, 0, 0, "=J35/F35*100"],
  [35, "Part-B (Erection)", "Earthing", "Fixing of 11 kV PIN Insulator", 2880, 2880, "NOS", 66.55, 191664.00, 0, 0, "=J36/F36*100"],
  [36, "Part-B (Erection)", "Earthing", "Earthing complete for distribution poles/structures", 480, 480, "NOS", 330.70, 158736.00, 0, 0, "=J37/F37*100"]
];

// ------------------------------------------------------------------------------
// 1. AUTOMATED SETUP FUNCTION: CREATES ALL TABS AND POPULATES LOA MASTER DATA
// ------------------------------------------------------------------------------
function setupSheetsSchema() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Tab 1: Overview_Dashboard
  var tabOverview = getOrCreateSheet(ss, "Overview_Dashboard");
  tabOverview.clear();
  tabOverview.getRange("A1:D1").merge().setValue("⚡ WBSEDCL MALDA DIVISION UG CABLE PROJECT OVERVIEW")
    .setFontWeight("bold").setFontSize(14).setBackground("#0f172a").setFontColor("#38bdf8").setHorizontalAlignment("center");
  
  var overviewData = [
    ["Parameter", "Details / Value", "Parameter", "Details / Value"],
    ["Project Name", "11kV UG Cable Conversion English Bazar & KPS", "Turnkey Contractor", "M/s Tarun Enterprise"],
    ["PO Number", "5301083425", "Vendor Supplier Code", "512589"],
    ["PO Date", "05-03-2026", "Tender NIT No", "09/Departmental (2025)"],
    ["Total LOA PO Cost (Excl GST)", "₹31,14,18,190.52", "Total Cost (Incl 18% GST)", "₹36,74,73,464.81"],
    ["Contract Commencement", "15-03-2026", "Target Completion Date", "14-03-2027 (12 Months)"],
    ["Overall Physical Progress", "=AVERAGE(LOA_vs_Revised_BOQ!L2:L37)", "Total Billed Amount", "=SUM(RA_Billing_Lifecycle!D2:D10)"]
  ];
  tabOverview.getRange(2, 1, overviewData.length, 4).setValues(overviewData);
  tabOverview.getRange("A2:D2").setFontWeight("bold").setBackground("#1e293b").setFontColor("#ffffff");

  // Tab 2: LOA_vs_Revised_BOQ (Pre-Populated with all 36 LOA items!)
  var tabBOQ = getOrCreateSheet(ss, "LOA_vs_Revised_BOQ");
  tabBOQ.clear();
  var boqHeaders = ["Sl No", "Part", "Category", "Item Description", "LOA Qty", "Revised Survey Qty", "Unit", "Rate (INR)", "Total LOA Cost (INR)", "Executed Qty", "Store Qty", "Execution %"];
  tabBOQ.getRange(1, 1, 1, boqHeaders.length).setValues([boqHeaders])
    .setFontWeight("bold").setBackground("#0f172a").setFontColor("#38bdf8");
  
  // Insert all 36 LOA items
  tabBOQ.getRange(2, 1, LOA_MASTER_BOQ_DATA.length, boqHeaders.length).setValues(LOA_MASTER_BOQ_DATA);
  tabBOQ.getRange("E2:F37").setNumberFormat("#,##0.00");
  tabBOQ.getRange("H2:I37").setNumberFormat("₹#,##0.00");
  tabBOQ.getRange("L2:L37").setNumberFormat("0.0\"%\"");

  // Tab 3: Material_Delivery_Pipeline
  var tabPipeline = getOrCreateSheet(ss, "Material_Delivery_Pipeline");
  tabPipeline.clear();
  var pipeHeaders = ["Sl No", "Item Description", "Unit", "GTP Status", "Vendor Name", "Inspection Status", "Offer Lot Qty", "DI Number", "DI Date", "Store SRV No", "Store Received Qty", "Supply Bill No", "Status"];
  tabPipeline.getRange(1, 1, 1, pipeHeaders.length).setValues([pipeHeaders])
    .setFontWeight("bold").setBackground("#0f172a").setFontColor("#10b981");

  var matPipelineRows = [];
  for (var i = 0; i < 15; i++) {
    var item = LOA_MASTER_BOQ_DATA[i];
    matPipelineRows.push([
      item[0], item[3], item[6], "Pending Submission", "Pending Vendor", "Not Offered", 0, "Not Issued", "-", "Not Received", 0, "Unbilled", "Not Started"
    ]);
  }
  tabPipeline.getRange(2, 1, matPipelineRows.length, pipeHeaders.length).setValues(matPipelineRows);

  // Tab 4: Daily_Work_Log
  var tabLogs = getOrCreateSheet(ss, "Daily_Work_Log");
  tabLogs.clear();
  var logHeaders = ["Date", "Log ID", "Feeder / Zone", "BOQ Item Sl", "Item Description", "Executed Qty", "Unit", "Location Stretch", "Turnkey Engineer", "WBSEDCL Inspector", "Remarks", "Approval Status"];
  tabLogs.getRange(1, 1, 1, logHeaders.length).setValues([logHeaders])
    .setFontWeight("bold").setBackground("#0f172a").setFontColor("#f59e0b");

  // Tab 5: RA_Billing_Lifecycle
  var tabBilling = getOrCreateSheet(ss, "RA_Billing_Lifecycle");
  tabBilling.clear();
  var billHeaders = ["Bill No", "Bill Type", "Period", "Gross Claim (INR)", "GST 18% (INR)", "SD Retention 3% (INR)", "Net Payable (INR)", "JMS Status", "WBSEDCL Approval", "Payment Status", "Payment Date"];
  tabBilling.getRange(1, 1, 1, billHeaders.length).setValues([billHeaders])
    .setFontWeight("bold").setBackground("#0f172a").setFontColor("#a855f7");

  SpreadsheetApp.getUi().alert("✓ Success! Google Sheet Master populated with all 36 LOA BOQ Items & Contract Rates (0% Progress Baseline)!");
}

function getOrCreateSheet(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

// ------------------------------------------------------------------------------
// 2. GET API ENDPOINT: READS LIVE DATA FROM GOOGLE SHEETS FOR PWA APP
// ------------------------------------------------------------------------------
function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var action = (e && e.parameter && e.parameter.action) || "getAllData";

  if (action === "getAllData") {
    var result = {
      boq: getSheetDataAsJSON(ss.getSheetByName("LOA_vs_Revised_BOQ")),
      pipeline: getSheetDataAsJSON(ss.getSheetByName("Material_Delivery_Pipeline")),
      dailyLogs: getSheetDataAsJSON(ss.getSheetByName("Daily_Work_Log")),
      billing: getSheetDataAsJSON(ss.getSheetByName("RA_Billing_Lifecycle")),
      lastSynced: new Date().toISOString()
    };

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Helper: Convert sheet rows to JSON array
function getSheetDataAsJSON(sheet) {
  if (!sheet) return [];
  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  var headers = data[0];
  var rows = [];
  for (var i = 1; i < data.length; i++) {
    var rowObj = {};
    for (var j = 0; j < headers.length; j++) {
      rowObj[headers[j]] = data[i][j];
    }
    rows.push(rowObj);
  }
  return rows;
}

// ------------------------------------------------------------------------------
// 3. POST API ENDPOINT: HANDLES LIVE WRITES, LOGS & UPDATES FROM PWA
// ------------------------------------------------------------------------------
function doPost(e) {
  try {
    var contents = JSON.parse(e.postData.contents);
    var action = contents.action;
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === "addDailyLog") {
      var sheetLogs = ss.getSheetByName("Daily_Work_Log");
      var logData = contents.log;

      sheetLogs.appendRow([
        logData.date,
        logData.id,
        logData.feeder,
        logData.itemSlNo,
        logData.itemDesc,
        logData.executedQty,
        logData.unit,
        logData.location,
        logData.siteEngineer,
        logData.wbseclInspector,
        logData.remarks,
        logData.approvalStatus
      ]);

      updateBOQExecutedQty(ss, logData.itemSlNo, logData.executedQty);
      return responseJSON({ status: "SUCCESS", message: "Daily log added and BOQ quantity updated", logId: logData.id });
    }

    else if (action === "updateBOQItem") {
      var slNo = contents.slNo;
      var revisedQty = contents.revisedQty;
      var executedQty = contents.executedQty;
      var storeQty = contents.storeQty;
      var rate = contents.rate;

      var sheetBOQ = ss.getSheetByName("LOA_vs_Revised_BOQ");
      var data = sheetBOQ.getDataRange().getValues();

      for (var i = 1; i < data.length; i++) {
        if (data[i][0] == slNo) {
          sheetBOQ.getRange(i + 1, 6).setValue(revisedQty);
          sheetBOQ.getRange(i + 1, 8).setValue(rate);
          sheetBOQ.getRange(i + 1, 9).setValue(revisedQty * rate);
          sheetBOQ.getRange(i + 1, 10).setValue(executedQty);
          sheetBOQ.getRange(i + 1, 11).setValue(storeQty);
          sheetBOQ.getRange(i + 1, 12).setValue(revisedQty > 0 ? (executedQty / revisedQty) * 100 : 0);
          break;
        }
      }

      return responseJSON({ status: "SUCCESS", message: "BOQ item updated successfully" });
    }

    else if (action === "updatePipelineStage") {
      var slNo = contents.slNo;
      var sheetPipe = ss.getSheetByName("Material_Delivery_Pipeline");
      var data = sheetPipe.getDataRange().getValues();

      for (var i = 1; i < data.length; i++) {
        if (data[i][0] == slNo) {
          sheetPipe.getRange(i + 1, 4).setValue(contents.gtpStatus);
          sheetPipe.getRange(i + 1, 5).setValue(contents.vendorName);
          sheetPipe.getRange(i + 1, 6).setValue(contents.inspStatus);
          sheetPipe.getRange(i + 1, 7).setValue(contents.inspQty);
          sheetPipe.getRange(i + 1, 8).setValue(contents.diNo);
          sheetPipe.getRange(i + 1, 11).setValue(contents.storeQty);
          break;
        }
      }

      return responseJSON({ status: "SUCCESS", message: "Material pipeline stage updated successfully" });
    }

    return responseJSON({ status: "ERROR", message: "Invalid action type" });

  } catch (err) {
    return responseJSON({ status: "ERROR", message: err.toString() });
  }
}

function updateBOQExecutedQty(ss, slNo, addQty) {
  var sheetBOQ = ss.getSheetByName("LOA_vs_Revised_BOQ");
  var data = sheetBOQ.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == slNo) {
      var currentExec = Number(data[i][9]) || 0;
      var revisedQty = Number(data[i][5]) || 1;
      var newExec = currentExec + Number(addQty);

      sheetBOQ.getRange(i + 1, 10).setValue(newExec);
      sheetBOQ.getRange(i + 1, 12).setValue((newExec / revisedQty) * 100);
      break;
    }
  }
}

function responseJSON(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
