import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import styles from "./styles.css";
import { useFlowStore } from "../../store/flowStore";
import { useGameStore } from "../../store/gameStore";
import MONSTERS from "../../data/monsters/monsters";
import CONVERSATIONS, {
  GOAL_FINAL_CONVERSATION,
  GOAL_HINT_CONVERSATION,
} from "../../data/conversations";
import {
  buildOutcomeConversation,
  isTerminalPage,
  nextPageIndex,
  terminalAction,
} from "../../data/conversations/engine";
import { computeWildMaxHp } from "../../data/monsters/battleFormulas";
import { isFullyCaptured } from "../../data/monsters/captureLogic";
import PLAYER_SPRITE from "../../assets/playerSprite.png";
import GOAL_SPRITE from "../../assets/goalSprite.png";
import { paginateText } from "./paginateText";
import { useTypewriter } from "./useTypewriter";

const MAX_LINES_PER_PAGE = 2;
const GOAL_NAME = "大風大馬";

const ConversationView = () => {
  const activeMonsterId = useFlowStore((state) => state.activeMonsterId);
  const isGoalEncounter = useFlowStore((state) => state.isGoalEncounter);
  const battleOutcome = useFlowStore((state) => state.battleOutcome);
  const enterBattle = useFlowStore((state) => state.enterBattle);
  const endEncounter = useFlowStore((state) => state.endEncounter);
  const setTalkingSpeaker = useFlowStore((state) => state.setTalkingSpeaker);
  const captured = useGameStore((state) => state.captured);
  const capturedCount = Object.keys(captured).length;
  const [pageIndex, setPageIndex] = useState(0);
  const [subPageIndex, setSubPageIndex] = useState(0);
  const [textChunks, setTextChunks] = useState<string[]>([""]);
  const speakerTextRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPageIndex(0);
  }, [activeMonsterId, isGoalEncounter, battleOutcome]);

  const pages = isGoalEncounter
    ? isFullyCaptured(captured, MONSTERS.length)
      ? GOAL_FINAL_CONVERSATION
      : GOAL_HINT_CONVERSATION
    : activeMonsterId === null
    ? []
    : battleOutcome !== null
    ? buildOutcomeConversation(MONSTERS[activeMonsterId].name, battleOutcome)
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

  return (
    <div className={styles.conversation} onClick={advance}>
      <img src={portrait} alt={speakerName} className={styles.portrait} />
      <div className={styles.textBlock}>
        <div className={styles.speakerName}>{speakerName}</div>
        <div ref={speakerTextRef} className={styles.speakerText}>
          {displayedText}
        </div>
      </div>
    </div>
  );
};

export default ConversationView;
