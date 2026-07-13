import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import styles from "./styles.css";
import { useFlowStore } from "../../store/flowStore";
import { useGameStore } from "../../store/gameStore";
import MONSTERS from "../../data/monsters/monsters";
import CONVERSATIONS from "../../data/conversations";
import LOCKED_CONVERSATIONS from "../../data/conversations/locked";
import { isTerminalPage, nextPageIndex, terminalAction } from "../../data/conversations/engine";
import { computeWildMaxHp } from "../../data/monsters/battleFormulas";
import { isUnlockConditionMet } from "../../data/monsters/unlockCondition";
import { PLAYER_SPRITE } from "../../assets/playerSprite.generated";
import { paginateText } from "./paginateText";

const MAX_LINES_PER_PAGE = 2;

const ConversationView = () => {
  const activeMonsterId = useFlowStore((state) => state.activeMonsterId);
  const enterBattle = useFlowStore((state) => state.enterBattle);
  const endEncounter = useFlowStore((state) => state.endEncounter);
  const capturedCount = useGameStore(
    (state) => Object.keys(state.captured).length
  );
  const [pageIndex, setPageIndex] = useState(0);
  const [subPageIndex, setSubPageIndex] = useState(0);
  const [textChunks, setTextChunks] = useState<string[]>([""]);
  const speakerTextRef = useRef<HTMLDivElement>(null);

  // Computed synchronously (not via effect) so it's already correct on the very
  // first render for a new encounter - an effect would leave a stale value for
  // that first render, picking the wrong pages array before it corrects itself.
  const isUnlocked = useMemo(
    () =>
      activeMonsterId === null
        ? true
        : isUnlockConditionMet(
            MONSTERS[activeMonsterId].unlockCondition,
            new Date()
          ),
    [activeMonsterId]
  );

  useEffect(() => {
    setPageIndex(0);
  }, [activeMonsterId]);

  const pages =
    activeMonsterId === null
      ? []
      : isUnlocked
      ? CONVERSATIONS[activeMonsterId]
      : LOCKED_CONVERSATIONS[activeMonsterId];
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
  }, [activeMonsterId, pageIndex]);

  const isLastSubPage = subPageIndex === textChunks.length - 1;
  const displayedText = textChunks[subPageIndex] ?? "";

  if (activeMonsterId === null || !page) return null;
  const monster = MONSTERS[activeMonsterId];

  const advance = (): void => {
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

  const portrait = page.speaker === "monster" ? monster.icon : PLAYER_SPRITE;
  const speakerName = page.speaker === "monster" ? monster.name : "小風";

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
