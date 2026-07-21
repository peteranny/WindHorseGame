// Stands in for webpack's raw-loader (`import simpleMap from "./map.txt"`) -
// passes the file's real text through as-is, so a component test exercises
// the actual map layout rather than a synthetic stand-in.
module.exports = {
  process(sourceText) {
    return { code: `module.exports = ${JSON.stringify(sourceText)};` };
  },
};
