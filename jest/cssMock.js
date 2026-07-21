// Stands in for a CSS Modules import (`import styles from "./styles.css"`)
// under Jest - webpack's css-loader hashes each class at build time, but
// tests only need a stable, inspectable value, so this returns the source
// class name itself (styles.followerWrap -> "followerWrap") rather than
// hashing anything.
// __esModule: true is required here - without it, Babel's default-import
// interop reads a `.default` property off this object directly, and since
// that's itself a property access, the Proxy's own get trap intercepts it
// and returns the string "default" instead of the Proxy - collapsing the
// whole mock down to a single wrong string.
module.exports = {
  __esModule: true,
  default: new Proxy(
    {},
    {
      get: (_target, prop) => (typeof prop === "string" ? prop : undefined),
    }
  ),
};
