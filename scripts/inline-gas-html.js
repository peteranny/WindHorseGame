const fs = require("fs");
const path = require("path");

const gasDir = path.join(__dirname, "..", "gas");
const htmlPath = path.join(gasDir, "index.html");
const bundlePath = path.join(gasDir, "bundle.js");

if (!fs.existsSync(htmlPath) || !fs.existsSync(bundlePath)) {
  console.error("Expected gas/index.html and gas/bundle.js after build");
  process.exit(1);
}

let html = fs.readFileSync(htmlPath, "utf8");
const bundle = fs.readFileSync(bundlePath, "utf8");
const escaped = bundle.replace(/<\/script/gi, "<\\/script");

html = html.replace(
  /<script src="bundle\.js"><\/script>/,
  () => `<script>${escaped}</script>`
);

if (/<script src="bundle\.js"><\/script>/.test(html)) {
  console.error("Failed to inline bundle.js into index.html");
  process.exit(1);
}

fs.writeFileSync(htmlPath, html);
fs.unlinkSync(bundlePath);
console.log("Inlined bundle.js into gas/index.html");
