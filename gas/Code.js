function savePosition(x, y) {
  SpreadsheetApp.getActiveSpreadsheet().getActiveSheet().getRange("A1:B1").setValues([[x, y]]);
}

function getPosition() {
  const values = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet().getRange("A1:B1").getValues()[0];
  if (typeof values[0] !== "number" || typeof values[1] !== "number") return null;
  return { x: values[0], y: values[1] };
}

function doGet() {
  return HtmlService.createHtmlOutputFromFile("index")
    .setTitle("Wind Horse Game")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
