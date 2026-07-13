import React, { useEffect, useState } from "react";
import styles from "./styles.css";
import { useFlowStore } from "../../store/flowStore";
import { useGameStore } from "../../store/gameStore";
import MONSTERS from "../../data/monsters/monsters";
import CONVERSATIONS from "../../data/conversations";
import { isTerminalPage, nextPageIndex, terminalAction } from "../../data/conversations/engine";
import { computeWildMaxHp } from "../../data/monsters/battleFormulas";
import { PLAYER_SPRITE } from "../../assets/playerSprite.generated";

const ConversationView = () => {
  const activeMonsterId = useFlowStore((state) => state.activeMonsterId);
  const enterBattle = useFlowStore((state) => state.enterBattle);
  const endEncounter = useFlowStore((state) => state.endEncounter);
  const capturedCount = useGameStore(
    (state) => Object.keys(state.captured).length
  );
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => {
    setPageIndex(0);
  }, [activeMonsterId]);

  if (activeMonsterId === null) return null;
  const monster = MONSTERS[activeMonsterId];
  const pages = CONVERSATIONS[activeMonsterId];
  const page = pages[pageIndex];

  const advance = (): void => {
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
        <div className={styles.speakerText}>{page.text}</div>
      </div>
    </div>
  );
};

export default ConversationView;
