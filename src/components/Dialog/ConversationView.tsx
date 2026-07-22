import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import styles from "./styles.css";
import { useFlowStore } from "../../store/flowStore";
import { useGameStore } from "../../store/gameStore";
import MONSTERS from "../../data/monsters/monsters";
import simpleMap from "../Maze/map.txt";
import { compileMap } from "../Maze/compileMap";
import { findGoalCell } from "../Maze/goalPosition";
import CONVERSATIONS, {
  GOAL_CHALLENGE_CONVERSATION,
  GOAL_FINAL_CONVERSATION,
  GOAL_HINT_CONVERSATION,
} from "../../data/conversations";
import {
  buildCooldownConversation,
  buildGoalLossConversation,
  buildOutcomeConversation,
  isTerminalPage,
  nextPageIndex,
  terminalAction,
} from "../../data/conversations/engine";
import { computeWildMaxHp } from "../../data/monsters/battleFormulas";
import { isFullyCaptured } from "../../data/monsters/captureLogic";
import { GOAL_NAME } from "../../data/goalEncounter";
import PLAYER_SPRITE from "../../assets/playerSprite.png";
import GOAL_SPRITE from "../../assets/goalSprite.png";
import { paginateText } from "./paginateText";
import { useTypewriter } from "./useTypewriter";

const MAX_LINES_PER_PAGE = 2;

const ConversationView = () => {
  const activeMonsterId = useFlowStore((state) => state.activeMonsterId);
  const isGoalEncounter = useFlowStore((state) => state.isGoalEncounter);
  const battleOutcome = useFlowStore((state) => state.battleOutcome);
  const isFirstGoalWin = useFlowStore((state) => state.isFirstGoalWin);
  const enterBattle = useFlowStore((state) => state.enterBattle);
  const endEncounter = useFlowStore((state) => state.endEncounter);
  const setTalkingSpeaker = useFlowStore((state) => state.setTalkingSpeaker);
  const devCooldownLockDisabled = useFlowStore(
    (state) => state.devCooldownLockDisabled
  );
  const captured = useGameStore((state) => state.captured);
  const setPosition = useGameStore((state) => state.setPosition);
  const battleCooldowns = useGameStore((state) => state.battleCooldowns);
  const goalDefeatedAt = useGameStore((state) => state.goalDefeatedAt);
  const capturedCount = Object.keys(captured).length;
  // Waived entirely once the goal's been cleared once - see
  // battleFormulas.BATTLE_LOSS_COOLDOWN_MS - or, before that point, while
  // the dev-only devCooldownLockDisabled toggle is on (Game/index.tsx).
  // battleCooldownRemainingMs is a one-off snapshot (see
  // buildCooldownConversation) rather than a live countdown - it's only
  // ever read once, right as this page first renders.
  const battleCooldownRemainingMs =
    (battleCooldowns[isGoalEncounter ? "goal" : String(activeMonsterId)] ??
      0) - Date.now();
  // The goal battle is exempt from this lock entirely (it's tough enough
  // already - Battle/index.tsx no longer even sets a "goal" cooldown on a
  // loss) - checked explicitly here too, rather than only relying on that,
  // so a stale "goal" entry saved from before this change can't still lock
  // it out.
  const isOnBattleCooldown =
    !isGoalEncounter &&
    goalDefeatedAt === null &&
    !devCooldownLockDisabled &&
    battleCooldownRemainingMs > 0;
  // Static for the whole game (there's only ever one goal tile) - computed
  // here purely so the finale conversation's own end can walk the player
  // onto it (see the "enter the house" branch in advance() below), same
  // map/goalPosition helpers Maze/Battle already use to find it.
  const goalCell = useMemo(() => findGoalCell(compileMap(simpleMap)), []);
  const [pageIndex, setPageIndex] = useState(0);
  const [subPageIndex, setSubPageIndex] = useState(0);
  const [textChunks, setTextChunks] = useState<string[]>([""]);
  const speakerTextRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPageIndex(0);
  }, [activeMonsterId, isGoalEncounter, battleOutcome]);

  const pages = isGoalEncounter
    ? battleOutcome !== null
      ? battleOutcome === "win"
        ? GOAL_FINAL_CONVERSATION
        : battleOutcome === "lose"
        ? buildGoalLossConversation(GOAL_NAME)
        : buildOutcomeConversation(GOAL_NAME, battleOutcome)
      : isOnBattleCooldown
      ? buildCooldownConversation(
          GOAL_NAME,
          battleCooldownRemainingMs,
          (isFullyCaptured(captured, MONSTERS.length)
            ? GOAL_CHALLENGE_CONVERSATION
            : GOAL_HINT_CONVERSATION)[0]
        )
      : isFullyCaptured(captured, MONSTERS.length)
      ? GOAL_CHALLENGE_CONVERSATION
      : GOAL_HINT_CONVERSATION
    : activeMonsterId === null
    ? []
    : battleOutcome !== null
    ? buildOutcomeConversation(
        MONSTERS[activeMonsterId].name,
        battleOutcome,
        MONSTERS[activeMonsterId].isHealer
      )
    : isOnBattleCooldown
    ? buildCooldownConversation(
        MONSTERS[activeMonsterId].name,
        battleCooldownRemainingMs,
        CONVERSATIONS[activeMonsterId][0]
      )
    : CONVERSATIONS[activeMonsterId];
  const page = pages[pageIndex];

  // Re-paginate the current page's full text to fit the dialog box whenever the
  // page itself changes. Runs before paint so the player never sees the
  // unpaginated text flash by.
  useLayoutEffect(() => {
    setSubPageIndex(0);
    const el = speakerTextRef.current;
    if (!el || !page) return;
    const computed = getComputedStyle(el);
    setTextChunks(
      paginateText(page.text, MAX_LINES_PER_PAGE, {
        width: el.clientWidth,
        fontSize: computed.fontSize,
        lineHeight: computed.lineHeight,
        fontFamily: computed.fontFamily,
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMonsterId, isGoalEncounter, battleOutcome, pageIndex]);

  const isLastSubPage = subPageIndex === textChunks.length - 1;
  const [displayedText, isTypingDone, completeTyping] = useTypewriter(
    textChunks[subPageIndex] ?? ""
  );

  // Drives the "jump" animation on the actual map sprite (player or monster)
  // that's currently talking, rather than the dialog's own portrait image.
  // Keyed on page?.speaker (not the page object) since buildOutcomeConversation
  // returns a fresh array/object every render.
  const currentSpeaker = page?.speaker ?? null;
  useEffect(() => {
    setTalkingSpeaker(isTypingDone ? null : currentSpeaker);
  }, [currentSpeaker, isTypingDone, setTalkingSpeaker]);

  if ((!isGoalEncounter && activeMonsterId === null) || !page) return null;
  const monster = activeMonsterId !== null ? MONSTERS[activeMonsterId] : null;

  // Shared by advance()'s own terminal-page branch and the "跳過對話"
  // shortcut below - only once the finale conversation is actually done
  // (read in full, or skipped) does the player "enter" the house, their
  // cell becoming the goal's own (see Maze/houseState.ts). This is the only
  // terminal page reachable with isGoalEncounter && "win", so no extra guard
  // is needed beyond that combination.
  const enterHouseIfWinner = (): void => {
    if (isGoalEncounter && battleOutcome === "win" && goalCell !== null) {
      setPosition(goalCell[0], goalCell[1]);
    }
    endEncounter();
  };

  const advance = (): void => {
    if (!isTypingDone) {
      completeTyping();
      return;
    }
    if (!isLastSubPage) {
      setSubPageIndex((i) => i + 1);
      return;
    }
    if (isTerminalPage(pages, pageIndex)) {
      if (terminalAction(pages, pageIndex) === "enter_challenge") {
        enterBattle(computeWildMaxHp(capturedCount));
      } else {
        enterHouseIfWinner();
      }
      return;
    }
    setPageIndex((i) => nextPageIndex(pages, i));
  };

  // A replay-only shortcut through the finale conversation - never shown on
  // the player's very first win, so that one-time viewing always plays out
  // in full (see flowStore.isFirstGoalWin).
  const showSkipConversationButton =
    isGoalEncounter && battleOutcome === "win" && !isFirstGoalWin;
  const skipConversation = (event: React.MouseEvent): void => {
    // Stops this from also bubbling up to .conversation's own onClick={advance}.
    event.stopPropagation();
    enterHouseIfWinner();
  };

  const portrait =
    page.speaker === "monster"
      ? isGoalEncounter
        ? GOAL_SPRITE
        : monster!.icon
      : PLAYER_SPRITE;
  const speakerName =
    page.speaker === "monster"
      ? isGoalEncounter
        ? GOAL_NAME
        : monster!.name
      : "小風";

  const isNarration = page.speaker === "narration";

  return (
    <div className={styles.conversation} onClick={advance}>
      {!isNarration && (
        <img src={portrait} alt={speakerName} className={styles.portrait} />
      )}
      <div className={styles.textBlock}>
        {!isNarration && (
          <div className={styles.speakerName}>{speakerName}</div>
        )}
        <div ref={speakerTextRef} className={styles.speakerText}>
          {displayedText}
        </div>
      </div>
      {isTypingDone && (
        <span className={styles.advanceCaret} aria-hidden="true">
          ▼
        </span>
      )}
      {showSkipConversationButton && (
        <button
          type="button"
          className={styles.skipConversationButton}
          onClick={skipConversation}
        >
          跳過對話
        </button>
      )}
    </div>
  );
};

export default ConversationView;
