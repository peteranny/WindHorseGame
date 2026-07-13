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

function doGet() {
  return HtmlService.createHtmlOutputFromFile("index")
    .setTitle("Wind Horse Game")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
