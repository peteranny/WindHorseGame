function savePosition(x, y) {
  SpreadsheetApp.getActiveSpreadsheet().getActiveSheet().getRange("A1:B1").setValues([[x, y]]);
}

function doGet() {
  return HtmlService.createHtmlOutputFromFile("index")
    .setTitle("Wind Horse Game")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
