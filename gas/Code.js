function savePosition(deviceId, x, y) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();
  for (let i = 0; i < data.length; i++) {
    if (data[i][0] === deviceId) {
      sheet.getRange(i + 1, 2, 1, 2).setValues([[x, y]]);
      return;
    }
  }
  sheet.appendRow([deviceId, x, y]);
}

function getPosition(deviceId) {
  const data = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet().getDataRange().getValues();
  for (const row of data) {
    if (row[0] === deviceId) {
      if (typeof row[1] !== "number" || typeof row[2] !== "number") return null;
      return { x: row[1], y: row[2] };
    }
  }
  return null;
}

function doGet() {
  return HtmlService.createHtmlOutputFromFile("index")
    .setTitle("Wind Horse Game")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
