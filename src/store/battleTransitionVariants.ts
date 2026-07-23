// The set of hard-coded BattleTransition entrance patterns - owned here
// (rather than under components/BattleTransition) since flowStore's own
// devForcedTransitionVariant needs the type/list too, and Game's map-screen
// dev toggle needs the emoji/label lookups, without either importing back
// into a component module.
export type Variant =
  | "radial"
  | "stripes"
  | "particles"
  | "vertical"
  | "rings"
  | "crosshatch"
  | "emoji"
  | "heart";

export const VARIANTS: Variant[] = [
  "radial",
  "stripes",
  "particles",
  "vertical",
  "rings",
  "crosshatch",
  "emoji",
  "heart",
];

// One glyph per variant, shown on the map screen's dev-only cycle button
// (Game/index.tsx) so the currently forced pick is legible without a text
// label - "default" (flowStore.devForcedTransitionVariant === null, the
// normal random-per-transition pick) gets its own glyph alongside these.
export const VARIANT_EMOJIS: Record<Variant, string> = {
  radial: "🌀",
  stripes: "🎞️",
  particles: "🔵",
  vertical: "🎚️",
  rings: "🎯",
  crosshatch: "🕸️",
  emoji: "🎉",
  heart: "❤️",
};

export const DEFAULT_VARIANT_EMOJI = "🎲";

export const VARIANT_LABELS: Record<Variant, string> = {
  radial: "放射狀",
  stripes: "橫條紋",
  particles: "粒子",
  vertical: "直條紋",
  rings: "同心圓",
  crosshatch: "交叉網格",
  emoji: "表情符號",
  heart: "愛心",
};

export const DEFAULT_VARIANT_LABEL = "預設（隨機）";
