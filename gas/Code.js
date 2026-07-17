function saveState(key, json) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();
  for (let i = 0; i < data.length; i++) {
    if (data[i][0] === key) {
      sheet.getRange(i + 1, 2).setValue(json);
      return;
    }
  }
  sheet.appendRow([key, json]);
}

function loadState(key) {
  const data = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet().getDataRange().getValues();
  for (const row of data) {
    if (row[0] === key) {
      return typeof row[1] === "string" ? row[1] : null;
    }
  }
  return null;
}

// The public /exec URL is served wrapped in an iframe on a separate
// googleusercontent.com origin (standard Apps Script behavior, unrelated to
// this app) - client-side JS running in that iframe has no access to the
// outer page's URL, so the ?key=... query param has to be read here,
// server-side, off the original request, and handed down into the page
// rather than left for the client to re-derive from its own (unrelated)
// window.location. webAppUrl (this deployment's own canonical /exec URL) is
// handed down the same way, since the iframe can't read its cross-origin
// parent's URL to reconstruct it either - both are needed by
// src/store/persistence.ts's getStateKeyFromUrl/setStateKeyInUrl.
function doGet(e) {
  const template = HtmlService.createTemplateFromFile("index");
  template.stateKey = e.parameter.key || "";
  template.webAppUrl = ScriptApp.getService().getUrl();
  return template
    .evaluate()
    .setTitle("Wind Horse Game")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
