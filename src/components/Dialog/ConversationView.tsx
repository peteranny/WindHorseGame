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
  const enterBattle = useFlowStore((state) => state.enterBattle);
  const endEncounter = useFlowStore((state) => state.endEncounter);
  const setTalkingSpeaker = useFlowStore((state) => state.setTalkingSpeaker);
  const captured = useGameStore((state) => state.captured);
  const setPosition = useGameStore((state) => state.setPosition);
  const battleCooldowns = useGameStore((state) => state.battleCooldowns);
  const goalDefeatedAt = useGameStore((state) => state.goalDefeatedAt);
  const capturedCount = Object.keys(captured).length;
  // Waived entirely once the goal's been cleared once - see
  // battleFormulas.BATTLE_LOSS_COOLDOWN_MS.
  const isOnBattleCooldown =
    goalDefeatedAt === null &&
    (battleCooldowns[isGoalEncounter ? "goal" : String(activeMonsterId)] ??
      0) > Date.now();
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
        : buildOutcomeConversation(GOAL_NAME, battleOutcome)
      : isOnBattleCooldown
      ? buildCooldownConversation(GOAL_NAME)
      : isFullyCaptured(captured, MONSTERS.length)
      ? GOAL_CHALLENGE_CONVERSATION
      : GOAL_HINT_CONVERSATION
    : activeMonsterId === null
    ? []
    : battleOutcome !== null
    ? buildOutcomeConversation(MONSTERS[activeMonsterId].name, battleOutcome)
    : isOnBattleCooldown
    ? buildCooldownConversation(MONSTERS[activeMonsterId].name)
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
        // Only once the finale conversation itself has been read all the
        // way through does the player actually "enter" the house - their
        // cell becomes the goal's own (see Maze/houseState.ts). This is the
        // only terminal page reachable with isGoalEncounter && "win", so no
        // extra guard is needed beyond that combination.
        if (isGoalEncounter && battleOutcome === "win" && goalCell !== null) {
          setPosition(goalCell[0], goalCell[1]);
        }
        endEncounter();
      }
      return;
    }
    setPageIndex((i) => nextPageIndex(pages, i));
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
    </div>
  );
};

export default ConversationView;
