import React, { useEffect, useState } from "react";
import styles from "./styles.css";
import { useFlowStore } from "../../store/flowStore";
import MONSTERS from "../../data/monsters/monsters";
import CONVERSATIONS from "../../data/conversations";
import { PLAYER_SPRITE } from "../../assets/playerSprite.generated";

const ConversationView = () => {
  const activeMonsterId = useFlowStore((state) => state.activeMonsterId);
  const enterBattle = useFlowStore((state) => state.enterBattle);
  const endEncounter = useFlowStore((state) => state.endEncounter);
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => {
    setPageIndex(0);
  }, [activeMonsterId]);

  if (activeMonsterId === null) return null;
  const monster = MONSTERS[activeMonsterId];
  const pages = CONVERSATIONS[activeMonsterId];
  const page = pages[pageIndex];
  const isLastPage = pageIndex === pages.length - 1;

  const advance = (): void => {
    if (isLastPage) {
      if (page.action === "enter_challenge") enterBattle();
      else endEncounter();
      return;
    }
    setPageIndex((i) => i + 1);
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
