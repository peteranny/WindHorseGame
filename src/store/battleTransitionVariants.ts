// The set of hard-coded BattleTransition entrance patterns - owned here
// (rather than under components/BattleTransition) since flowStore's own
// devForcedTransitionVariant needs the type/list too, and Game's map-screen
// dev toggle needs the emoji/label lookups, without either importing back
// into a component module.
export type Variant =
  | "radial"
  | "stripes"
  | "particles"
  | "rings"
  | "clockwise"
  | "heart"
  | "squeeze";

export const VARIANTS: Variant[] = [
  "radial",
  "stripes",
  "particles",
  "rings",
  "clockwise",
  "heart",
  "squeeze",
];

// One glyph per variant, shown on the map screen's dev-only cycle button
// (Game/index.tsx) so the currently forced pick is legible without a text
// label - "default" (flowStore.devForcedTransitionVariant === null, the
// normal random-per-transition pick) gets its own glyph alongside these.
export const VARIANT_EMOJIS: Record<Variant, string> = {
  radial: "🔆",
  stripes: "➖",
  particles: "🔵",
  rings: "🌀",
  clockwise: "🕛",
  heart: "❤️",
  squeeze: "📺",
};

export const DEFAULT_VARIANT_EMOJI = "🎲";

export const VARIANT_LABELS: Record<Variant, string> = {
  radial: "放射狀",
  stripes: "橫條紋",
  particles: "粒子",
  rings: "同心圓",
  clockwise: "順時針",
  heart: "愛心",
  squeeze: "壓縮",
};

export const DEFAULT_VARIANT_LABEL = "預設（隨機）";
