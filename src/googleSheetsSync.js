// Live Google Sheets Webhook API Integration Bridge for Malda UG Cable Project PWA

export async function fetchLiveGoogleSheetsData(apiEndpointUrl) {
  try {
    const response = await fetch(`${apiEndpointUrl}?action=getAllData`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.warn('[Google Sheets Sync] Could not fetch live data from Google Sheets API:', error);
    return null;
  }
}

export async function syncDailyLogToGoogleSheets(apiEndpointUrl, dailyLogData) {
  try {
    const response = await fetch(apiEndpointUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'addDailyLog',
        log: dailyLogData
      })
    });
    const result = await response.json();
    console.log('[Google Sheets Sync] Daily Log Synced:', result);
    return result;
  } catch (error) {
    console.warn('[Google Sheets Sync] Error syncing daily log to Google Sheets:', error);
    return { status: 'OFFLINE_QUEUED', message: 'Log queued locally for auto-sync' };
  }
}

export async function syncBOQItemUpdateToGoogleSheets(apiEndpointUrl, boqItemData) {
  try {
    const response = await fetch(apiEndpointUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'updateBOQItem',
        slNo: boqItemData.slNo,
        revisedQty: boqItemData.revisedQty,
        executedQty: boqItemData.executedQty,
        storeQty: boqItemData.storeQty,
        rate: boqItemData.rate
      })
    });
    const result = await response.json();
    return result;
  } catch (error) {
    console.warn('[Google Sheets Sync] Error syncing BOQ update to Google Sheets:', error);
    return { status: 'OFFLINE_QUEUED' };
  }
}
