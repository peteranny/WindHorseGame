import {
  MutableRefObject,
  RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useFlowStore } from "../../store/flowStore";
import { useGameStore } from "../../store/gameStore";
import {
  ATTACK_COOLDOWN_MS,
  ATTACK_DAMAGE,
} from "../../data/monsters/battleFormulas";
import {
  findGroupContaining,
  groupByAdjacentFamily,
  groupMultiplierAt,
  moveGroupToBack,
  moveGroupToFront,
} from "./attackGroups";
import { Point } from "./geometry";
import { EFFECT_DURATION_MS, attackBumpKeyframes, hitBumpKeyframes, playBump } from "./spriteEffects";
import { HEAL_ANIMATION_MS } from "./useHealEffect";
import { THROW_DURATION_MS } from "./useThrowEffect";
import { SPIT_DURATION_MS } from "./useSpitEffect";
import { AttackOption, INNATE_KEY, useAttackLine } from "./useAttackLine";
import { PendingOutcome } from "./useBattleOutcome";

const LEAVE_DURATION_MS = 250;
const ENTER_DURATION_MS = 250;
// Backstop for the scroll-compensation rAF loops further down (leaveStep/
// step) - they stop once the measured width itself actually converges, not
// on a fixed duration (see their own comments for why), but this guards
// against looping forever if a width somehow never settles.
const SCROLL_COMPENSATION_SAFETY_MS = 1000;
// Gap between each thrown member's own launch when a whole family group is
// thrown together, so the group's throws read as a distinguishable volley
// rather than one indistinct simultaneous blob.
const GROUP_THROW_STAGGER_MS = 300;

interface UseAttackGridParams {
  pendingOutcome: PendingOutcome;
  isEntering: boolean;
  playerSpriteRef: RefObject<HTMLElement>;
  enemySpriteRef: RefObject<HTMLElement>;
  getTrajectory: (
    target?: "toEnemy" | "toPlayer" | "selfPlayer"
  ) => { from: Point; to: Point; angleDeg: number } | null;
  triggerPlayerHeal: (effect: "heal" | null, durationMs?: number) => void;
  triggerThrow: (
    icon: string,
    from: Point,
    to: Point,
    selfToss?: boolean
  ) => void;
  triggerSpit: (from: Point, to: Point, angleDeg: number) => void;
  triggerToast: (text: string) => void;
}

// What buildGroupableLine below actually produces - the family field
// neutralized for a still-cooling-down member, with trueFamily preserved
// alongside it regardless (see buildGroupableLine's own comment).
export interface GroupableAttackOption extends AttackOption {
  trueFamily: string | null;
}

interface UseAttackGridResult {
  line: AttackOption[];
  // Returned rather than also required as a param - Battle/index.tsx's own
  // render needs this too (the per-button cooldown-overlay percentage), so
  // this saves it a second, redundant useGameStore subscription for the
  // exact same slice this hook already needs internally anyway.
  cooldowns: Record<string, number>;
  attackGroups: GroupableAttackOption[][];
  attackGridRef: RefObject<HTMLDivElement>;
  buttonRefs: MutableRefObject<Record<string, HTMLButtonElement | null>>;
  canScrollLeft: boolean;
  canScrollRight: boolean;
  updateScrollHints: () => void;
  leavingKeys: Set<string>;
  enteringKeys: Set<string>;
  handleAttack: (option: AttackOption) => void;
}

// Everything about the attack grid as currently orderable/tappable: the
// line itself (useAttackLine), its cooldown-aware family grouping
// (attackGroups - what tapping any member of a run actually throws
// together), the horizontally-scrolling row's own scroll hints, the
// leave/enter reorder animation, and handleAttack itself, which ties all
// of the above together with the throw/heal/toast effects a tap actually
// triggers. Reads/writes gameStore's cooldowns/monsterOrder and
// flowStore's healProtagonist/damageWild directly rather than taking them
// as params - a Zustand store hook can be called from anywhere and always
// reads/writes the one shared store, so there's nothing to gain by having
// Battle/index.tsx fetch these itself just to hand them back down; only
// genuinely local values (refs, sibling hooks' own state/trigger
// functions) actually need to be threaded through as params.
export const useAttackGrid = ({
  pendingOutcome,
  isEntering,
  playerSpriteRef,
  enemySpriteRef,
  getTrajectory,
  triggerPlayerHeal,
  triggerThrow,
  triggerSpit,
  triggerToast,
}: UseAttackGridParams): UseAttackGridResult => {
  const monsterOrder = useGameStore((state) => state.monsterOrder);
  const cooldowns = useGameStore((state) => state.cooldowns);
  const setCooldown = useGameStore((state) => state.setCooldown);
  const reorderMonsters = useGameStore((state) => state.reorderMonsters);
  const healProtagonist = useFlowStore((state) => state.healProtagonist);
  const damageWild = useFlowStore((state) => state.damageWild);

  const [line, setLine] = useAttackLine(monsterOrder);

  // Attack buttons currently mid-reorder animation - leaving their old spot
  // (narrowing to nothing) before `line` actually reorders them, then
  // entering their new spot once it has.
  const [leavingKeys, setLeavingKeys] = useState<Set<string>>(new Set());
  const [enteringKeys, setEnteringKeys] = useState<Set<string>>(new Set());

  // Alternates every throw between sending the tapped group to the back of
  // the (captured-monster) line and bringing it to the front - the 1st tap
  // this battle goes to the back, the 2nd to the front, the 3rd to the
  // back, and so on. The innate attack never joins this cycle (see
  // isInnateOnly below) - it always stays in its fixed first slot.
  const [nextPlacement, setNextPlacement] = useState<"back" | "front">("back");

  // A cooling-down monster can't actually be thrown right now, so it can't
  // contribute to (or extend) a family run's bonus - treating it as
  // family-less for grouping purposes (same as the innate attack always is)
  // breaks the chain there exactly like a different family would, without
  // attackGroups.ts needing to know anything about cooldowns itself.
  const buildGroupableLine = useCallback(
    (now: number) =>
      line.map((option) => ({
        ...option,
        // trueFamily survives regardless of cooldown - the family dot (see
        // render in Battle/index.tsx) always shows it so a player can plan
        // adjacency even while an attack is still cooling down; only
        // `family` itself (what actually drives grouping/glow) gets
        // neutralized.
        trueFamily: option.family,
        family: (cooldowns[option.key] ?? 0) <= now ? option.family : null,
      })),
    [line, cooldowns]
  );

  // The line split into maximal adjacent-same-family runs - each run is one
  // visual grouping box, and what tapping any of its members throws together.
  // Recomputed fresh every render (not memoized on a snapshot of `now`) so a
  // neighbor's cooldown ending is reflected as soon as the periodic tick in
  // useWildAttackClock causes the next re-render, same as the cooldown
  // overlays' own live countdown.
  const attackGroups = groupByAdjacentFamily(buildGroupableLine(Date.now()));

  // Hints for the horizontally-scrolling attack grid, so players know there
  // are more (cooling-down or not) attacks off to a side rather than
  // assuming the visible row is the whole roster.
  const attackGridRef = useRef<HTMLDivElement | null>(null);
  // One entry per currently-rendered attack button, keyed by option.key - lets
  // handleAttack read a member's actual live width every frame while it
  // shrinks/grows, rather than precomputing a single guessed width.
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  // The in-flight requestAnimationFrame loop (if any) that's currently
  // riding scrollLeft along with a leaving/entering member's own live width -
  // tracked so a second tap before the first one settles cancels the stale
  // loop instead of fighting it for control of scrollLeft.
  const scrollCompensationFrameRef = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (scrollCompensationFrameRef.current !== null) {
        cancelAnimationFrame(scrollCompensationFrameRef.current);
      }
    },
    []
  );
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const updateScrollHints = useCallback(() => {
    const el = attackGridRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);
  useEffect(() => {
    updateScrollHints();
    window.addEventListener("resize", updateScrollHints);
    return () => window.removeEventListener("resize", updateScrollHints);
  }, [line, updateScrollHints]);

  const handleAttack = useCallback(
    (option: AttackOption) => {
      if (pendingOutcome !== null || isEntering) return;
      const now = Date.now();
      if ((cooldowns[option.key] ?? 0) > now) return;

      // Tapping any member of an adjacent-same-family run throws the whole
      // run together - a lone innate attack (or a captured monster with no
      // same-family (ready) neighbor) is just a run of one, same as before.
      const group = findGroupContaining(buildGroupableLine(now), option.key);
      const isInnateOnly = group.length === 1 && group[0].key === INNATE_KEY;

      let totalHeal = 0;
      const throwers: Array<{ member: AttackOption; multiplier: number }> = [];
      const healers: Array<{ member: AttackOption; multiplier: number }> = [];

      group.forEach((member, index) => {
        const multiplier = groupMultiplierAt(member.step, index);
        if (member.isHealer) {
          totalHeal += member.healAmount * multiplier;
          healers.push({ member, multiplier });
        } else {
          throwers.push({ member, multiplier });
        }
      });

      if (healers.length > 0) {
        // Same staggered volley as throwers below - each healer flies in
        // GROUP_THROW_STAGGER_MS after the last, just thrown at the player
        // rather than the wild monster ("selfPlayer" - the player's own
        // center for both ends of the throw, a self-toss rather than a
        // cross-battlefield shot). The heal glow itself (which builds/
        // holds/releases over HEAL_ANIMATION_MS - HP only actually recovers
        // once that whole animation finishes, not instantly) only starts
        // once every one of them has actually landed, so a multi-healer
        // group reads as a real volley arriving before the glow, rather
        // than one simultaneous flash.
        playBump(playerSpriteRef.current, attackBumpKeyframes(20), EFFECT_DURATION_MS);
        healers.forEach(({ member }, throwIndex) => {
          setTimeout(() => {
            const trajectory = getTrajectory("selfPlayer");
            if (!trajectory) return;
            triggerThrow(member.icon, trajectory.from, trajectory.to, true);
          }, throwIndex * GROUP_THROW_STAGGER_MS);
        });
        const healLandMs =
          (healers.length - 1) * GROUP_THROW_STAGGER_MS + THROW_DURATION_MS;
        const healToastText =
          group.length > 1 && group[0].family
            ? `${group[0].family} 系列治療，效果卓越！`
            : `${option.label} 進行治療！`;
        triggerToast(healToastText);
        setTimeout(() => {
          triggerPlayerHeal("heal", HEAL_ANIMATION_MS);
          setTimeout(() => {
            healProtagonist(totalHeal);
          }, HEAL_ANIMATION_MS);
        }, healLandMs);
      }
      if (throwers.length > 0) {
        // Plays even alongside a same-tap heal glow above - the two no
        // longer compete for the same animated property (see playBump).
        playBump(playerSpriteRef.current, attackBumpKeyframes(20), EFFECT_DURATION_MS);
        // A mixed innate + captured-monster group can't happen (the innate
        // attack has no family, so it never joins a group) - launch each
        // thrower GROUP_THROW_STAGGER_MS after the last so a multi-member
        // volley reads as distinguishable throws rather than one blob.
        const landMs = isInnateOnly ? SPIT_DURATION_MS : THROW_DURATION_MS;
        throwers.forEach(({ member, multiplier }, throwIndex) => {
          const throwDelay = throwIndex * GROUP_THROW_STAGGER_MS;
          setTimeout(() => {
            const trajectory = getTrajectory();
            if (!trajectory) return;
            if (member.key === INNATE_KEY) {
              triggerSpit(trajectory.from, trajectory.to, trajectory.angleDeg);
            } else {
              triggerThrow(member.icon, trajectory.from, trajectory.to);
            }
          }, throwDelay);
          // Each member's own damage (ATTACK_DAMAGE * its own step
          // multiplier) lands the instant ITS throw actually arrives,
          // rather than bundling the whole group's damage into one hit
          // once the last member lands - a run of N members should read
          // as N separate hits, not one delayed combined blow.
          setTimeout(() => {
            damageWild(ATTACK_DAMAGE * multiplier);
            playBump(enemySpriteRef.current, hitBumpKeyframes(20), EFFECT_DURATION_MS);
          }, throwDelay + landMs);
        });
        // Only a real multi-member family throw earns the callout - a lone
        // attack (innate or otherwise) never shows one.
        if (group.length > 1 && group[0].family) {
          triggerToast(`${group[0].family} 系列加成，效果卓越`);
        }
      }

      group.forEach((member) =>
        setCooldown(member.key, now + ATTACK_COOLDOWN_MS)
      );

      // The innate attack is just as much a part of the queue as any
      // captured monster - tapping it sends it to the back/front the same
      // way. Only its OWN position is never persisted (a fresh battle
      // always starts it at the front); the captured-monster portion syncs
      // out to gameStore.reorderMonsters on every reorder, innate included.
      //
      // A multi-member family throw scatters across both ends rather than
      // moving as one block - each member takes the next spot in the same
      // back/front/back/... cycle, so a repeated group throw doesn't just
      // glue the group back together at one end every time.
      const placements: Array<"back" | "front"> = [];
      let placement = nextPlacement;
      group.forEach(() => {
        placements.push(placement);
        placement = placement === "back" ? "front" : "back";
      });
      setNextPlacement(placement);
      const groupKeys = new Set(group.map((member) => member.key));
      setLeavingKeys((current) => new Set([...current, ...groupKeys]));

      // Every front-placed member ends up ahead of the whole rest of the
      // line, every back-placed member behind all of it - usually all of
      // `group` shares one destination, but a linked group's members can
      // scatter individually between the two (see nextPlacement above).
      const frontMemberKeys = group
        .filter((_, index) => placements[index] === "front")
        .map((member) => member.key);

      // Leave phase: the tapped group collapses at its OLD spot, wherever
      // that happens to be in the line - compensating scrollLeft by only
      // HALF of its own live shrink keeps the group's own shared center
      // visually fixed as it collapses, so its before/after neighbors slide
      // symmetrically toward that point (a purely cosmetic choice - nothing
      // *needs* to stay put here, since the tapped group's old spot isn't
      // "content" anyone still cares about once it's gone).
      //
      // Enter phase is not symmetric between front/back, because the two
      // don't do the same thing to the rest of the line: a back-placed
      // member grows into the empty tail past whatever's already visible -
      // nothing on screen shifts, so it gets no compensation at all. A
      // front-placed member grows at content-position 0, which pushes every
      // *other* button in the line - including the spot the leave phase just
      // finished settling on - rightward by its own full growing width,
      // every frame. That has to be cancelled in FULL (not the leave
      // phase's half), reading the live width every animation frame so it
      // exactly tracks the CSS grow animation - otherwise the row keeps
      // drifting out from under whatever the player was just looking at.
      const gapWidth = attackGridRef.current
        ? parseFloat(getComputedStyle(attackGridRef.current).columnGap) || 0
        : 0;
      const widthSumOf = (keys: string[]): number =>
        keys.reduce((total, key) => {
          const el = buttonRefs.current[key];
          return total + (el ? el.getBoundingClientRect().width : 0);
        }, 0);
      if (attackGridRef.current) {
        const grid = attackGridRef.current;
        const groupKeysArray = group.map((member) => member.key);
        const leaveBaseScrollLeft = grid.scrollLeft;
        const originalGroupWidth = widthSumOf(groupKeysArray);
        const leaveStartTime = performance.now();
        if (scrollCompensationFrameRef.current !== null) {
          cancelAnimationFrame(scrollCompensationFrameRef.current);
        }
        // Stops once the *measured* width has actually reached ~0, rather
        // than after a fixed LEAVE_DURATION_MS elapsed - leaveStartTime is
        // captured synchronously here, before React has even applied
        // .attackButtonLeaving (the class - and the CSS animation it starts
        // - only take effect once this handler returns and React commits/
        // paints), so a wall-clock cutoff measured from this earlier moment
        // stopped compensating slightly before the button actually finished
        // shrinking, leaving a small permanent leftward drift once it fully
        // vanished. SCROLL_COMPENSATION_SAFETY_MS is just a backstop.
        const leaveStep = () => {
          const liveGroupWidth = widthSumOf(groupKeysArray);
          grid.scrollLeft =
            leaveBaseScrollLeft - (originalGroupWidth - liveGroupWidth) / 2;
          scrollCompensationFrameRef.current =
            liveGroupWidth > 0.5 &&
            performance.now() - leaveStartTime < SCROLL_COMPENSATION_SAFETY_MS
              ? requestAnimationFrame(leaveStep)
              : null;
        };
        leaveStep();
      }

      setTimeout(() => {
        let workingLine = line;
        group.forEach((member, index) => {
          workingLine =
            placements[index] === "back"
              ? moveGroupToBack(workingLine, [member])
              : moveGroupToFront(workingLine, [member]);
        });
        setLine(workingLine);
        if (frontMemberKeys.length > 0 && attackGridRef.current) {
          const grid = attackGridRef.current;
          const baseScrollLeft = grid.scrollLeft;
          const startTime = performance.now();
          if (scrollCompensationFrameRef.current !== null) {
            cancelAnimationFrame(scrollCompensationFrameRef.current);
          }
          // Same reasoning as leaveStep above - stops once frontWidthSum
          // has actually stopped growing between two consecutive frames,
          // rather than after a fixed ENTER_DURATION_MS measured from
          // before .attackButtonEntering's own CSS animation really starts.
          // There's no simple constant target to compare against here (each
          // member grows toward its own rendered width, not 0), so this
          // tracks convergence directly instead. -1 as the initial
          // "previous" value guarantees at least one real comparison before
          // ever considering it settled, since a width can never be -1.
          let previousFrontWidthSum = -1;
          const step = () => {
            const frontWidthSum = widthSumOf(frontMemberKeys);
            grid.scrollLeft =
              baseScrollLeft +
              frontWidthSum +
              gapWidth * frontMemberKeys.length;
            const hasSettled = frontWidthSum === previousFrontWidthSum;
            previousFrontWidthSum = frontWidthSum;
            scrollCompensationFrameRef.current =
              !hasSettled &&
              performance.now() - startTime < SCROLL_COMPENSATION_SAFETY_MS
                ? requestAnimationFrame(step)
                : null;
          };
          step();
        }
        reorderMonsters(
          workingLine
            .filter((member) => member.key !== INNATE_KEY)
            .map((member) => Number(member.key))
        );
        setLeavingKeys((current) => {
          const next = new Set(current);
          groupKeys.forEach((key) => next.delete(key));
          return next;
        });
        setEnteringKeys((current) => new Set([...current, ...groupKeys]));
        setTimeout(() => {
          setEnteringKeys((current) => {
            const next = new Set(current);
            groupKeys.forEach((key) => next.delete(key));
            return next;
          });
        }, ENTER_DURATION_MS);
      }, LEAVE_DURATION_MS);
    },
    [
      pendingOutcome,
      isEntering,
      cooldowns,
      line,
      nextPlacement,
      buildGroupableLine,
      reorderMonsters,
      getTrajectory,
      healProtagonist,
      damageWild,
      setCooldown,
      triggerPlayerHeal,
      triggerThrow,
      triggerSpit,
      triggerToast,
      playerSpriteRef,
      enemySpriteRef,
      setLine,
    ]
  );

  return {
    line,
    cooldowns,
    attackGroups,
    attackGridRef,
    buttonRefs,
    canScrollLeft,
    canScrollRight,
    updateScrollHints,
    leavingKeys,
    enteringKeys,
    handleAttack,
  };
};
