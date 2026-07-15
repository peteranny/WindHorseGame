import React, {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import cn from "classnames";
import styles from "./styles.css";
import { useFlowStore } from "../../store/flowStore";
import { useGameStore } from "../../store/gameStore";
import MONSTERS from "../../data/monsters/monsters";
import {
  ATTACK_COOLDOWN_MS,
  ATTACK_DAMAGE,
  WILD_ATTACK_DAMAGE,
  WILD_ATTACK_INTERVAL_MS,
} from "../../data/monsters/battleFormulas";
import {
  findGroupContaining,
  groupByAdjacentFamily,
  groupMultiplierAt,
  hueForFamily,
  moveGroupToBack,
  moveGroupToFront,
} from "./attackGroups";
import { GOAL_NAME } from "../../data/goalEncounter";
import PLAYER_SPRITE from "../../assets/playerSprite.png";
import GOAL_SPRITE from "../../assets/goalSprite.png";

const INNATE_KEY = "innate";
const LEAVE_DURATION_MS = 250;
const ENTER_DURATION_MS = 250;
// Gap between each thrown member's own launch when a whole family group is
// thrown together, so the group's throws read as a distinguishable volley
// rather than one indistinct simultaneous blob.
const GROUP_THROW_STAGGER_MS = 300;
const TICK_MS = 500;
const EFFECT_DURATION_MS = 300;
const WILD_ATTACK_TELEGRAPH_MS = 2000;
const THROW_DURATION_MS = 2000;
const SPIT_DURATION_MS = 500;
// A beat before the loser starts sinking (once every in-flight throw/spit
// has actually landed), then the sink itself, then a further beat holding
// the sunk pose before the white/black fade begins covering it - all three
// must match .playerSink/.enemySink's own animation-delay/-duration in
// styles.css, since that's what actually plays the sink visually.
const SINK_LEAD_MS = 300;
const SINK_DURATION_MS = 500;
const SINK_HOLD_MS = 400;
// Must match outcome-fade-out's opacity-0 percentage in styles.css - the
// fade only starts becoming visible once the whole sink sequence is done.
const OUTCOME_PAUSE_MS = SINK_LEAD_MS + SINK_DURATION_MS + SINK_HOLD_MS;
const OUTCOME_FADE_MS = 700;
const OUTCOME_TOTAL_MS = OUTCOME_PAUSE_MS + OUTCOME_FADE_MS;

type SpriteEffect = "attack" | "hit" | "heal" | null;
type PendingOutcome = "win" | "lose" | null;

interface AttackOption {
  key: string;
  label: string;
  icon: string;
  isHealer: boolean;
  healAmount: number;
  // The battle-adjacency family/step (see data/monsters/attackFamily.ts) -
  // null family for the innate attack, which never groups with a neighbor.
  family: string | null;
  step: number;
}

// A point expressed as a percentage of .battlefield's own box, so throw/spit
// trajectories stay correct no matter the viewport size or how the sprites
// themselves are positioned/anchored within it.
interface Point {
  xPercent: number;
  yPercent: number;
}

interface ThrowEffect {
  id: number;
  icon: string;
  from: Point;
  to: Point;
}

interface SpitEffect {
  id: number;
  from: Point;
  to: Point;
  angleDeg: number;
}

const rectCenter = (rect: DOMRect): { x: number; y: number } => ({
  x: rect.left + rect.width / 2,
  y: rect.top + rect.height / 2,
});

// `point`'s position as a percentage of `containerRect`'s box - measured
// live rather than hardcoded, so it's always right regardless of how
// either element is currently positioned/sized.
const percentIn = (
  point: { x: number; y: number },
  containerRect: DOMRect
): Point => ({
  xPercent: ((point.x - containerRect.left) / containerRect.width) * 100,
  yPercent: ((point.y - containerRect.top) / containerRect.height) * 100,
});

// The clockwise rotation (in degrees) that makes the spit glyph's rounded,
// naturally-downward-facing end (see .spitDrop's base rotate(-90deg), its
// own facing at --angle: 0deg) point from `from` toward `to`. Computed from
// real pixel centers rather than the from/to percentages, since those are
// relative to .battlefield's box and would skew the angle whenever it isn't
// perfectly square.
const angleBetween = (
  from: { x: number; y: number },
  to: { x: number; y: number }
): number => (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI - 90;

const pointStyle = (from: Point, to: Point): React.CSSProperties =>
  ({
    "--start-x": `${from.xPercent}%`,
    "--start-y": `${from.yPercent}%`,
    "--end-x": `${to.xPercent}%`,
    "--end-y": `${to.yPercent}%`,
  } as React.CSSProperties);

const spitStyle = (effect: SpitEffect): React.CSSProperties =>
  ({
    ...pointStyle(effect.from, effect.to),
    "--angle": `${effect.angleDeg}deg`,
  } as React.CSSProperties);

const HpBar = ({ hp, maxHp }: { hp: number; maxHp: number }) => (
  <div className={styles.hpBarOuter}>
    <div
      className={styles.hpBarInner}
      style={{ width: `${maxHp > 0 ? (hp / maxHp) * 100 : 0}%` }}
    />
  </div>
);

const useSpriteEffect = (): [SpriteEffect, (effect: SpriteEffect) => void] => {
  const [effect, setEffect] = useState<SpriteEffect>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trigger = useCallback((next: SpriteEffect) => {
    setEffect(next);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setEffect(null), EFFECT_DURATION_MS);
  }, []);
  return [effect, trigger];
};

// Every captured monster currently mid-throw at the wild monster (the
// innate fist attack has nothing to throw, so it never uses this). Each
// throw gets its own id and its own timeout that removes only itself, so
// throwing a second monster before the first one lands doesn't cut the
// first one's animation short - they each run to completion independently.
const useThrowEffect = (): [
  ThrowEffect[],
  (icon: string, from: Point, to: Point) => void
] => {
  const [effects, setEffects] = useState<ThrowEffect[]>([]);
  const nextIdRef = useRef(0);
  const trigger = useCallback((icon: string, from: Point, to: Point) => {
    nextIdRef.current += 1;
    const id = nextIdRef.current;
    setEffects((current) => [...current, { id, icon, from, to }]);
    setTimeout(() => {
      setEffects((current) => current.filter((effect) => effect.id !== id));
    }, THROW_DURATION_MS);
  }, []);
  return [effects, trigger];
};

// The innate attack's water-drop spit, shot straight from the player to the
// wild monster. Keyed by an incrementing id, same reasoning as useThrowEffect.
const useSpitEffect = (): [
  SpitEffect | null,
  (from: Point, to: Point, angleDeg: number) => void
] => {
  const [effect, setEffect] = useState<SpitEffect | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextIdRef = useRef(0);
  const trigger = useCallback((from: Point, to: Point, angleDeg: number) => {
    nextIdRef.current += 1;
    setEffect({ id: nextIdRef.current, from, to, angleDeg });
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setEffect(null), SPIT_DURATION_MS);
  }, []);
  return [effect, trigger];
};

// The "X 系列攻擊，效果卓越" banner shown whenever a family group actually
// throws together - stays up for exactly as long as that throw's own
// animation takes (durationMs, the same span handleAttack uses to time the
// combined damage landing), keyed by an incrementing id (same reasoning as
// useThrowEffect) so a second group throw before the first banner fades
// restarts its timer rather than being silently swallowed.
const useFamilyToast = (): [
  { id: number; family: string; durationMs: number } | null,
  (family: string, durationMs: number) => void
] => {
  const [toast, setToast] = useState<{
    id: number;
    family: string;
    durationMs: number;
  } | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextIdRef = useRef(0);
  const trigger = useCallback((family: string, durationMs: number) => {
    nextIdRef.current += 1;
    setToast({ id: nextIdRef.current, family, durationMs });
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setToast(null), durationMs);
  }, []);
  return [toast, trigger];
};

const Battle = () => {
  const activeMonsterId = useFlowStore((state) => state.activeMonsterId);
  const isGoalEncounter = useFlowStore((state) => state.isGoalEncounter);
  const wildHp = useFlowStore((state) => state.wildHp);
  const wildMaxHp = useFlowStore((state) => state.wildMaxHp);
  const protagonistHp = useFlowStore((state) => state.protagonistHp);
  const damageWild = useFlowStore((state) => state.damageWild);
  const damageProtagonist = useFlowStore((state) => state.damageProtagonist);
  const healProtagonist = useFlowStore((state) => state.healProtagonist);
  const concludeBattle = useFlowStore((state) => state.concludeBattle);
  const devBattleShortcutsEnabled = useFlowStore(
    (state) => state.devBattleShortcutsEnabled
  );

  const monsterOrder = useGameStore((state) => state.monsterOrder);
  const reorderMonsters = useGameStore((state) => state.reorderMonsters);
  const cooldowns = useGameStore((state) => state.cooldowns);
  const setCooldown = useGameStore((state) => state.setCooldown);
  const captureMonster = useGameStore((state) => state.captureMonster);
  const goalDefeatedAt = useGameStore((state) => state.goalDefeatedAt);
  const recordGoalWin = useGameStore((state) => state.recordGoalWin);

  const [playerEffect, triggerPlayerEffect] = useSpriteEffect();
  const [enemyEffect, triggerEnemyEffect] = useSpriteEffect();
  const [throwEffects, triggerThrow] = useThrowEffect();
  const [spitEffect, triggerSpit] = useSpitEffect();
  const [enemySpitEffect, triggerEnemySpit] = useSpitEffect();
  const [familyToast, triggerFamilyToast] = useFamilyToast();
  const [pendingOutcome, setPendingOutcome] = useState<PendingOutcome>(null);
  // Becomes true once the battle is decided AND every in-flight throw/spit
  // has actually landed - only then does the loser's sprite sink and the
  // white/black fade begin, so a still-flying attack never gets cut short.
  const [isSinking, setIsSinking] = useState(false);

  const battlefieldRef = useRef<HTMLDivElement>(null);
  const playerSpriteRef = useRef<HTMLImageElement>(null);
  const enemySpriteRef = useRef<HTMLImageElement>(null);
  // Measured live off the actual rendered sprites rather than hardcoded, so
  // the throw/spit trajectories stay pinned to their true centers - and the
  // spit's rotation to their true angle - no matter how either sprite ends
  // up positioned/sized.
  const getTrajectory = useCallback((reverse = false): {
    from: Point;
    to: Point;
    angleDeg: number;
  } | null => {
    const battlefield = battlefieldRef.current;
    const playerSprite = playerSpriteRef.current;
    const enemySprite = enemySpriteRef.current;
    if (!battlefield || !playerSprite || !enemySprite) return null;
    const battlefieldRect = battlefield.getBoundingClientRect();
    const playerCenter = rectCenter(playerSprite.getBoundingClientRect());
    const enemyCenter = rectCenter(enemySprite.getBoundingClientRect());
    const [fromCenter, toCenter] = reverse
      ? [enemyCenter, playerCenter]
      : [playerCenter, enemyCenter];
    return {
      from: percentIn(fromCenter, battlefieldRect),
      to: percentIn(toCenter, battlefieldRect),
      angleDeg: angleBetween(fromCenter, toCenter),
    };
  }, []);

  const [, forceTick] = useReducer((n: number) => n + 1, 0);
  const nextWildAttackAtRef = useRef(Date.now() + WILD_ATTACK_INTERVAL_MS);

  useEffect(() => {
    const id = setInterval(() => {
      if (
        pendingOutcome === null &&
        Date.now() >= nextWildAttackAtRef.current
      ) {
        // Mirrors the innate attack: the enemy spits at the player, and the
        // hit only lands once that spit actually arrives.
        triggerEnemyEffect("attack");
        const trajectory = getTrajectory(true);
        if (trajectory) {
          triggerEnemySpit(trajectory.from, trajectory.to, trajectory.angleDeg);
        }
        setTimeout(() => {
          damageProtagonist(WILD_ATTACK_DAMAGE);
          triggerPlayerEffect("hit");
        }, SPIT_DURATION_MS);
        nextWildAttackAtRef.current += WILD_ATTACK_INTERVAL_MS;
      }
      forceTick();
    }, TICK_MS);
    return () => clearInterval(id);
  }, [
    pendingOutcome,
    getTrajectory,
    damageProtagonist,
    triggerEnemyEffect,
    triggerPlayerEffect,
    triggerEnemySpit,
  ]);

  // Defeat pauses on the battlefield with a fade overlay before actually
  // leaving - concludeBattle (which swaps this whole screen out) only
  // fires once that fade has had time to play.
  useEffect(() => {
    if (
      (activeMonsterId === null && !isGoalEncounter) ||
      pendingOutcome !== null
    )
      return;
    if (wildHp <= 0) {
      setPendingOutcome("win");
    } else if (protagonistHp <= 0) {
      setPendingOutcome("lose");
    }
  }, [activeMonsterId, isGoalEncounter, wildHp, protagonistHp, pendingOutcome]);

  // Holds off the sink/fade sequence until every already-thrown attack has
  // actually landed, so a slow throw never gets visually cut off mid-flight
  // by the losing sprite sinking or the screen fading out under it.
  useEffect(() => {
    if (pendingOutcome === null || isSinking) return;
    if (
      throwEffects.length > 0 ||
      spitEffect !== null ||
      enemySpitEffect !== null
    )
      return;
    setIsSinking(true);
  }, [pendingOutcome, isSinking, throwEffects, spitEffect, enemySpitEffect]);

  useEffect(() => {
    if (!isSinking || pendingOutcome === null) return;
    const id = setTimeout(() => {
      // Only actually captured/recorded once the fade finishes and we're
      // leaving this screen - otherwise the defeated monster would show up
      // in the attack grid below while its own defeat is still playing out.
      if (pendingOutcome === "win") {
        if (activeMonsterId !== null) captureMonster(activeMonsterId);
        // The player only actually "enters" the house (their cell becoming
        // the goal's own, see Maze/houseState.ts) once the finale
        // conversation this outcome leads into has been read all the way
        // through - see ConversationView's own endEncounter call.
        else if (isGoalEncounter) recordGoalWin();
      }
      concludeBattle(pendingOutcome);
    }, OUTCOME_TOTAL_MS);
    return () => clearTimeout(id);
  }, [
    isSinking,
    pendingOutcome,
    activeMonsterId,
    isGoalEncounter,
    captureMonster,
    recordGoalWin,
    concludeBattle,
  ]);

  // The attack line's order - the innate attack always fixed first, then
  // gameStore.monsterOrder (shared with, and reorderable from, the map's own
  // duckling trail - see store/types.ts). Tapping a monster (or a whole
  // adjacent-family group, see handleAttack) persists a new order via
  // reorderMonsters, so it carries over to the next battle too.
  const line: AttackOption[] = useMemo(() => {
    const options: AttackOption[] = [
      {
        key: INNATE_KEY,
        label: "小風溥儀",
        icon: PLAYER_SPRITE,
        isHealer: false,
        healAmount: 0,
        family: null,
        step: 0,
      },
    ];
    monsterOrder.forEach((id) => {
      const monster = MONSTERS[id];
      options.push({
        key: String(id),
        label: monster.name,
        icon: monster.icon,
        isHealer: monster.isHealer,
        healAmount: monster.healAmount ?? 0,
        family: monster.attackFamily,
        step: monster.attackStep,
      });
    });
    return options;
  }, [monsterOrder]);

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
        family: (cooldowns[option.key] ?? 0) <= now ? option.family : null,
      })),
    [line, cooldowns]
  );

  // The line split into maximal adjacent-same-family runs - each run is one
  // visual grouping box, and what tapping any of its members throws together.
  // Recomputed fresh every render (not memoized on a snapshot of `now`) so a
  // neighbor's cooldown ending is reflected as soon as the periodic tick
  // below causes the next re-render, same as the cooldown overlays' own
  // live countdown.
  const attackGroups = groupByAdjacentFamily(buildGroupableLine(Date.now()));

  // Hints for the horizontally-scrolling attack grid, so players know there
  // are more (cooling-down or not) attacks off to a side rather than
  // assuming the visible row is the whole roster.
  const attackGridRef = useRef<HTMLDivElement | null>(null);
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
      if (pendingOutcome !== null) return;
      const now = Date.now();
      if ((cooldowns[option.key] ?? 0) > now) return;

      // Tapping any member of an adjacent-same-family run throws the whole
      // run together - a lone innate attack (or a captured monster with no
      // same-family (ready) neighbor) is just a run of one, same as before.
      const group = findGroupContaining(buildGroupableLine(now), option.key);
      const isInnateOnly = group.length === 1 && group[0].key === INNATE_KEY;

      let totalHeal = 0;
      let totalDamage = 0;
      const throwers: Array<{ member: AttackOption; multiplier: number }> = [];

      group.forEach((member, index) => {
        const multiplier = groupMultiplierAt(member.step, index);
        if (member.isHealer) {
          totalHeal += member.healAmount * multiplier;
        } else {
          totalDamage += ATTACK_DAMAGE * multiplier;
          throwers.push({ member, multiplier });
        }
      });

      if (totalHeal > 0) {
        healProtagonist(totalHeal);
        triggerPlayerEffect("heal");
      }
      if (throwers.length > 0) {
        if (!totalHeal) triggerPlayerEffect("attack");
        // A mixed innate + captured-monster group can't happen (the innate
        // attack has no family, so it never joins a group) - launch each
        // thrower GROUP_THROW_STAGGER_MS after the last so a multi-member
        // volley reads as distinguishable throws rather than one blob, then
        // land the combined damage once the final one actually arrives.
        throwers.forEach(({ member }, throwIndex) => {
          setTimeout(() => {
            const trajectory = getTrajectory();
            if (!trajectory) return;
            if (member.key === INNATE_KEY) {
              triggerSpit(trajectory.from, trajectory.to, trajectory.angleDeg);
            } else {
              triggerThrow(member.icon, trajectory.from, trajectory.to);
            }
          }, throwIndex * GROUP_THROW_STAGGER_MS);
        });
        const landMs = isInnateOnly ? SPIT_DURATION_MS : THROW_DURATION_MS;
        const totalLandMs =
          (throwers.length - 1) * GROUP_THROW_STAGGER_MS + landMs;
        // Only a real multi-member family throw earns the callout - a lone
        // attack (innate or otherwise) never shows one - and it stays up
        // for exactly as long as this whole throw takes to land.
        if (group.length > 1 && group[0].family) {
          triggerFamilyToast(group[0].family, totalLandMs);
        }
        setTimeout(() => {
          damageWild(totalDamage);
          triggerEnemyEffect("hit");
        }, totalLandMs);
      }

      group.forEach((member) =>
        setCooldown(member.key, now + ATTACK_COOLDOWN_MS)
      );

      // The innate attack never joins the reorder cycle - it has no family
      // (so it's always its own group) and always stays in its fixed first
      // slot; only the captured-monster portion of the line (line[0] is
      // always the innate entry) actually reorders and persists.
      if (!isInnateOnly) {
        // A multi-member family throw scatters across both ends rather
        // than moving as one block - each member takes the next spot in
        // the same back/front/back/... cycle, so a repeated group throw
        // doesn't just glue the group back together at one end every time.
        const placements: Array<"back" | "front"> = [];
        let placement = nextPlacement;
        group.forEach(() => {
          placements.push(placement);
          placement = placement === "back" ? "front" : "back";
        });
        setNextPlacement(placement);
        const groupKeys = new Set(group.map((member) => member.key));
        setLeavingKeys((current) => new Set([...current, ...groupKeys]));
        setTimeout(() => {
          let workingLine = line.slice(1);
          group.forEach((member, index) => {
            workingLine =
              placements[index] === "back"
                ? moveGroupToBack(workingLine, [member])
                : moveGroupToFront(workingLine, [member]);
          });
          reorderMonsters(workingLine.map((member) => Number(member.key)));
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
      }
    },
    [
      pendingOutcome,
      cooldowns,
      line,
      nextPlacement,
      buildGroupableLine,
      reorderMonsters,
      getTrajectory,
      healProtagonist,
      damageWild,
      setCooldown,
      triggerPlayerEffect,
      triggerEnemyEffect,
      triggerThrow,
      triggerSpit,
      triggerFamilyToast,
    ]
  );

  if (activeMonsterId === null && !isGoalEncounter) return null;
  const enemyName = isGoalEncounter
    ? GOAL_NAME
    : MONSTERS[activeMonsterId!].name;
  const enemyIcon = isGoalEncounter
    ? GOAL_SPRITE
    : MONSTERS[activeMonsterId!].icon;

  const msUntilWildAttack = nextWildAttackAtRef.current - Date.now();
  const isWildTelegraphing =
    msUntilWildAttack > 0 && msUntilWildAttack <= WILD_ATTACK_TELEGRAPH_MS;
  // The marks appear one at a time as the countdown runs out, so seeing all
  // 3 doubles as a "the attack is imminent" cue.
  const telegraphMarkCount = isWildTelegraphing
    ? Math.min(
        3,
        Math.floor(
          ((WILD_ATTACK_TELEGRAPH_MS - msUntilWildAttack) /
            WILD_ATTACK_TELEGRAPH_MS) *
            3
        ) + 1
      )
    : 0;

  const isPlayerSinking = isSinking && pendingOutcome === "lose";
  const isEnemySinking = isSinking && pendingOutcome === "win";

  return (
    <div className={styles.battle}>
      <div className={styles.battlefield} ref={battlefieldRef}>
        <div className={styles.playerSide}>
          <img
            ref={playerSpriteRef}
            src={PLAYER_SPRITE}
            alt="小風"
            className={cn(
              styles.playerSprite,
              isPlayerSinking
                ? styles.playerSink
                : playerEffect && styles[`player${capitalize(playerEffect)}`]
            )}
          />
        </div>
        <div className={styles.enemySide}>
          <div className={styles.enemySpriteWrap}>
            <img
              ref={enemySpriteRef}
              src={enemyIcon}
              alt={enemyName}
              className={cn(
                styles.enemySprite,
                isEnemySinking
                  ? styles.enemySink
                  : enemyEffect && styles[`enemy${capitalize(enemyEffect)}`]
              )}
            />
            {telegraphMarkCount > 0 && (
              <div className={styles.telegraph} aria-hidden="true">
                {Array.from({ length: telegraphMarkCount }, (_, i) => (
                  <span key={i} className={styles.telegraphMark}>
                    ？
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className={styles.enemyInfo}>
          <div>{enemyName}</div>
          <HpBar hp={wildHp} maxHp={wildMaxHp} />
        </div>
        <div className={styles.playerInfo}>
          <div>小風</div>
          <HpBar hp={protagonistHp} maxHp={10} />
        </div>
        {throwEffects.map((effect) => (
          <img
            key={effect.id}
            src={effect.icon}
            alt=""
            aria-hidden="true"
            className={styles.thrownIcon}
            style={pointStyle(effect.from, effect.to)}
          />
        ))}
        {spitEffect !== null && (
          <span
            key={spitEffect.id}
            className={cn(styles.spitDrop, styles.spitDropForward)}
            aria-hidden="true"
            style={spitStyle(spitEffect)}
          >
            💧
          </span>
        )}
        {enemySpitEffect !== null && (
          <span
            key={enemySpitEffect.id}
            className={cn(styles.spitDrop, styles.spitDropReverse)}
            aria-hidden="true"
            style={spitStyle(enemySpitEffect)}
          >
            💧
          </span>
        )}
        {familyToast !== null && (
          <div
            key={familyToast.id}
            className={styles.familyToast}
            style={
              {
                "--toast-duration": `${familyToast.durationMs}ms`,
              } as React.CSSProperties
            }
          >
            {familyToast.family} 系列攻擊，效果卓越
          </div>
        )}
      </div>
      <div className={styles.actionBar}>
        <div className={styles.buttonRow}>
          <button
            type="button"
            className={styles.escapeButton}
            disabled={pendingOutcome !== null}
            onClick={() => concludeBattle("escape")}
          >
            逃跑
          </button>
          {isGoalEncounter && goalDefeatedAt !== null && (
            <button
              type="button"
              className={styles.skipButton}
              disabled={pendingOutcome !== null}
              onClick={() => damageWild(wildHp)}
            >
              跳過戰鬥
            </button>
          )}
          {devBattleShortcutsEnabled && (
            <>
              <button
                type="button"
                className={styles.devButton}
                disabled={pendingOutcome !== null}
                onClick={() => damageWild(wildHp)}
              >
                Capture
              </button>
              <button
                type="button"
                className={styles.devButton}
                disabled={pendingOutcome !== null}
                onClick={() => damageProtagonist(protagonistHp)}
              >
                Lose
              </button>
            </>
          )}
        </div>
        {isGoalEncounter && goalDefeatedAt !== null && (
          <div className={styles.goalWinDate}>
            首次通關：{new Date(goalDefeatedAt).toLocaleDateString()}
          </div>
        )}
        <div className={styles.attackGridWrap}>
          <div
            ref={attackGridRef}
            className={styles.attackGrid}
            onScroll={updateScrollHints}
          >
            {attackGroups.map((group) => {
              const isLinked = group.length > 1;
              const groupStyle = isLinked
                ? ({
                    "--family-hue": hueForFamily(group[0].family!),
                  } as React.CSSProperties)
                : undefined;
              return (
                <div
                  key={group[0].key}
                  className={styles.attackGroup}
                  style={groupStyle}
                >
                  {group.map((option, index) => {
                    const remainingMs =
                      (cooldowns[option.key] ?? 0) - Date.now();
                    const ready = remainingMs <= 0;
                    const remainingPercent = Math.max(
                      0,
                      Math.min(100, (remainingMs / ATTACK_COOLDOWN_MS) * 100)
                    );
                    return (
                      <React.Fragment key={option.key}>
                        {index > 0 && (
                          <span
                            className={styles.attackWire}
                            aria-hidden="true"
                          />
                        )}
                        <button
                          type="button"
                          className={cn(
                            styles.attackButton,
                            isLinked && styles.attackButtonLinked,
                            leavingKeys.has(option.key) &&
                              styles.attackButtonLeaving,
                            enteringKeys.has(option.key) &&
                              styles.attackButtonEntering
                          )}
                          disabled={!ready || pendingOutcome !== null}
                          onClick={() => handleAttack(option)}
                        >
                          <img
                            src={option.icon}
                            alt={option.label}
                            className={styles.attackIcon}
                          />
                          <span className={styles.attackLabel}>
                            {option.isHealer
                              ? `${option.label}（治療）`
                              : option.label}
                          </span>
                          {!ready && (
                            <div
                              className={styles.cooldownOverlay}
                              style={{ height: `${remainingPercent}%` }}
                            />
                          )}
                        </button>
                      </React.Fragment>
                    );
                  })}
                </div>
              );
            })}
          </div>
          {canScrollLeft && (
            <div
              className={cn(styles.scrollHint, styles.scrollHintLeft)}
              aria-hidden="true"
            >
              <span className={styles.scrollHintArrow}>‹</span>
            </div>
          )}
          {canScrollRight && (
            <div
              className={cn(styles.scrollHint, styles.scrollHintRight)}
              aria-hidden="true"
            >
              <span className={styles.scrollHintArrow}>›</span>
            </div>
          )}
        </div>
      </div>
      {isSinking && pendingOutcome !== null && (
        <div
          className={cn(
            styles.outcomeFade,
            styles[`outcomeFade${capitalize(pendingOutcome)}`]
          )}
        />
      )}
    </div>
  );
};

const capitalize = (text: string): string =>
  text.charAt(0).toUpperCase() + text.slice(1);

export default Battle;
