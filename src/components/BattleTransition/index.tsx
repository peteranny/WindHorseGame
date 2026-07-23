import React, { useEffect, useRef, useState } from "react";
import cn from "classnames";
import styles from "./styles.css";
import { useFlowStore } from "../../store/flowStore";
import {
  FREEZE_MS,
  FLASH_MS,
  DISTORT_IN_MS,
  COVERED_HOLD_MS,
  DISTORT_OUT_MS,
  EXIT_RESOLVE_MS,
} from "./timing";

// One full pass through this sequence plays every time flowStore.mode
// transitions into "battle". "freeze"/"flash" have no distortion pattern of
// their own; "cover" and "reveal" both wear whichever variant was rolled for
// this transition, growing in then shrinking back out again. Leaving battle
// plays the much simpler "resolve" instead - see the leavingBattle branch
// below.
type Phase = "idle" | "freeze" | "flash" | "cover" | "reveal" | "resolve";
type Variant =
  | "radial"
  | "stripes"
  | "particles"
  | "vertical"
  | "rings"
  | "crosshatch"
  | "emoji"
  | "heart";
const VARIANTS: Variant[] = [
  "radial",
  "stripes",
  "particles",
  "vertical",
  "rings",
  "crosshatch",
  "emoji",
  "heart",
];

// "emoji" is the one variant that isn't a pure CSS gradient pattern - it
// pops real glyphs in over a plain fading-black backdrop (styles.css's
// battle-cover/reveal-emoji-backdrop, opacity only, no gradient growth)
// rather than growing a repeating-gradient's own coverage. Fixed positions/
// glyphs (not randomized) so the burst always reads as one deliberate
// pattern rather than a different scatter every roll.
const EMOJI_GLYPHS = ["⚡", "💥", "✨", "🔥", "💫", "⭐", "☄️", "🌀", "⚔️"];
const EMOJI_POSITIONS: Array<{ top: string; left: string }> = [
  { top: "15%", left: "15%" },
  { top: "15%", left: "50%" },
  { top: "15%", left: "85%" },
  { top: "50%", left: "15%" },
  { top: "50%", left: "50%" },
  { top: "50%", left: "85%" },
  { top: "85%", left: "15%" },
  { top: "85%", left: "50%" },
  { top: "85%", left: "85%" },
];

interface BattleTransitionProps {
  mode: string;
  battleContent: React.ReactNode;
  otherContent: React.ReactNode;
}

const BattleTransition = ({
  mode,
  battleContent,
  otherContent,
}: BattleTransitionProps) => {
  const [phase, setPhase] = useState<Phase>("idle");
  const [variant, setVariant] = useState<Variant>(VARIANTS[0]);
  // Only read for the leavingBattle branch below - which color Battle's own
  // outcome fade (useBattleOutcome.ts) left the screen covered in, so this
  // component's own "resolve" overlay can pick up in the exact same color
  // rather than guessing. concludeBattle sets this in the same store update
  // that flips `mode` away from "battle", so it's already current by the
  // time this effect sees the mode change.
  const battleOutcome = useFlowStore((state) => state.battleOutcome);
  const [resolveColor, setResolveColor] = useState<"black" | "white">(
    "black"
  );
  // Which content is actually mounted right now - the whole point of this
  // component. On every edge except entering/leaving battle, this just
  // tracks `mode` directly (an instant swap, no crossfade). On the
  // entering-battle edge, it stays "other" (the map/dialog, fully opaque, no
  // fade of its own) all the way through "freeze"/"flash"/"cover" and only
  // flips to "battle" the instant the distortion is fully, opaquely
  // covering the screen - so the actual scene swap happens completely
  // hidden underneath it, with nothing ever visible mid-fade. Leaving
  // battle mirrors that in miniature (see leavingBattle below).
  const [displayed, setDisplayed] = useState<"battle" | "other">(
    mode === "battle" ? "battle" : "other"
  );
  const prevModeRef = useRef(mode);

  useEffect(() => {
    const prevMode = prevModeRef.current;
    prevModeRef.current = mode;
    const enteringBattle = prevMode !== "battle" && mode === "battle";
    const leavingBattle = prevMode === "battle" && mode !== "battle";

    if (leavingBattle) {
      // Battle's own outcome fade (OUTCOME_HOLD_MS) already leaves the
      // screen fully, solidly covered by the time concludeBattle fires, so
      // mounting otherContent right now is invisible underneath it - same
      // reasoning as "cover"'s solid frame hiding Battle's own mount above,
      // just without needing a build-up of its own first. This overlay then
      // dissolves that same flat color away, so the map/dialog scene
      // resolves into view instead of snapping in the instant Battle
      // unmounts.
      setDisplayed("other");
      setResolveColor(battleOutcome === "win" ? "white" : "black");
      setPhase("resolve");
      const timer = setTimeout(() => setPhase("idle"), EXIT_RESOLVE_MS);
      return () => clearTimeout(timer);
    }

    if (!enteringBattle) {
      setDisplayed(mode === "battle" ? "battle" : "other");
      setPhase("idle");
      return undefined;
    }

    // Rolled once per transition (not per phase), so "cover" and "reveal"
    // always wear the same pattern as each other.
    setVariant(VARIANTS[Math.floor(Math.random() * VARIANTS.length)]);
    setPhase("freeze");

    const coveredAt = FREEZE_MS + FLASH_MS + DISTORT_IN_MS;
    const timers = [
      setTimeout(() => setPhase("flash"), FREEZE_MS),
      setTimeout(() => setPhase("cover"), FREEZE_MS + FLASH_MS),
      setTimeout(() => {
        // Fully, solidly black right now (see styles.css's battle-cover-*
        // keyframes' own 100% frame) - swap the underlying content here,
        // instantly and invisibly, rather than letting it crossfade on its
        // own independent timeline the way a plain opacity transition
        // would (which used to be visible through the still-transparent
        // freeze/flash stages before this content-swap was gated on
        // "cover" actually finishing). `phase` deliberately stays "cover"
        // for COVERED_HOLD_MS more - the black screen just keeps holding
        // (its own animation already ended on that solid final frame) while
        // Battle mounts underneath it, rather than starting to clear away
        // in the very same instant.
        setDisplayed("battle");
      }, coveredAt),
      setTimeout(() => setPhase("reveal"), coveredAt + COVERED_HOLD_MS),
      setTimeout(
        () => setPhase("idle"),
        coveredAt + COVERED_HOLD_MS + DISTORT_OUT_MS
      ),
    ];
    return () => timers.forEach(clearTimeout);
  }, [mode, battleOutcome]);

  return (
    <div className={styles.stack}>
      <div className={styles.layer}>
        {displayed === "battle" ? battleContent : otherContent}
      </div>
      {phase !== "idle" && (
        <div
          className={cn(
            styles.overlay,
            (phase === "cover" || phase === "reveal") && styles[variant],
            phase === "cover" && styles.cover,
            phase === "reveal" && styles.reveal,
            phase === "resolve" && styles.resolve,
            phase === "resolve" &&
              resolveColor === "white" &&
              styles.resolveWhite
          )}
          aria-hidden="true"
        >
          {phase === "flash" && <div className={styles.flash} />}
          {variant === "emoji" && (phase === "cover" || phase === "reveal") && (
            <div className={styles.emojiField}>
              {EMOJI_POSITIONS.map((pos, index) => (
                <span
                  key={index}
                  className={cn(
                    styles.emojiShard,
                    phase === "cover" && styles.emojiPopIn,
                    phase === "reveal" && styles.emojiPopOut
                  )}
                  style={
                    {
                      top: pos.top,
                      left: pos.left,
                      "--emoji-delay": `${index * 45}ms`,
                    } as React.CSSProperties
                  }
                >
                  {EMOJI_GLYPHS[index]}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BattleTransition;
